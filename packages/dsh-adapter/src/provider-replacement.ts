import { isAlias, isMap, isScalar, isSeq, parseDocument } from 'yaml'
import { createEditPlan } from '@dsh-graph-control/edit-transaction'
import {
  FS_LOCAL_TO_SANDBOX_SWITCH,
  FS_PROVIDER_RESET_TO_OFFICIAL_DEFAULT,
  FS_SANDBOX_TO_LOCAL_REPLACEMENT,
  type FsProviderEntryId,
} from './current-official-contracts.ts'
import type { DshProfileSources, ExistingDshSourceDocument } from './profile-sources.ts'
import type {
  DshScalarEditPlan,
  SetDeclaredScalarIntent,
  YamlScalarEditPreview,
} from './yaml-edit.ts'

export interface PlanFsProviderReplacementOptions {
  sources: DshProfileSources
  targetUri: string
}

export interface DshProviderReplacementPlan extends DshScalarEditPlan {
  providerReplacement: typeof FS_SANDBOX_TO_LOCAL_REPLACEMENT
  providerChangeMode: 'initial'
}

export interface PlanFsProviderSwitchOptions extends PlanFsProviderReplacementOptions {
  targetEntryId: FsProviderEntryId
}

export interface DshProviderSwitchPlan extends DshScalarEditPlan {
  providerReplacement:
    | typeof FS_SANDBOX_TO_LOCAL_REPLACEMENT
    | typeof FS_LOCAL_TO_SANDBOX_SWITCH
  providerChangeMode: 'switch'
}

export interface DshProviderResetPlan extends DshScalarEditPlan {
  providerReplacement: typeof FS_PROVIDER_RESET_TO_OFFICIAL_DEFAULT
  providerChangeMode: 'reset'
}

export type DshFsProviderChangePlan =
  | DshProviderReplacementPlan
  | DshProviderSwitchPlan
  | DshProviderResetPlan

function mapPair(node: unknown, name: string) {
  if (!isMap(node)) return undefined
  return node.items.find(pair => isScalar(pair.key) && pair.key.value === name)
}

function mapField(node: unknown, name: string): unknown {
  return mapPair(node, name)?.value
}

function scalarString(node: unknown): string | undefined {
  return isScalar(node) && typeof node.value === 'string' ? node.value : undefined
}

function parseForEdit(source: string): ReturnType<typeof parseDocument> {
  const document = parseDocument(source, { keepSourceTokens: true, prettyErrors: false })
  if (document.errors.length > 0) {
    throw new Error(`cannot edit invalid YAML: ${document.errors.map(error => error.message).join('; ')}`)
  }
  return document
}

function collectInsertedIds(node: unknown, ids: string[]): void {
  if (isAlias(node)) throw new Error('alias-backed inserted provider rows are read-only')
  if (!isMap(node)) return
  const id = scalarString(mapField(node, 'id'))
  if (id !== undefined) ids.push(id)
  const group = mapField(node, 'group')
  const config = mapField(node, 'config')
  if (isScalar(group) && group.value === true && isSeq(config)) {
    for (const child of config.items) collectInsertedIds(child, ids)
  }
}

function loaderEntryIds(document: ReturnType<typeof parseDocument>): string[] {
  if (!isSeq(document.contents)) return []
  const ids: string[] = []
  for (const patch of document.contents.items) {
    if (isAlias(patch)) throw new Error('top-level alias patches make provider insertion ambiguous')
    if (!isMap(patch)) continue
    const directId = scalarString(mapField(patch, 'id'))
    if (directId !== undefined) ids.push(directId)
    const insert = mapField(patch, 'insert')
    if (isSeq(insert)) {
      for (const entry of insert.items) collectInsertedIds(entry, ids)
    }
  }
  return ids
}

function insertionNewline(source: string): string {
  const finalLf = source.lastIndexOf('\n')
  if (finalLf >= 0) return finalLf > 0 && source[finalLf - 1] === '\r' ? '\r\n' : '\n'
  return source.includes('\r') ? '\r' : '\n'
}

function quoteYamlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function selectedProfilePatch(
  sources: DshProfileSources,
  targetUri: string,
): ExistingDshSourceDocument {
  const matches = sources.layers.filter(layer => layer.patch.uri === targetUri)
  if (matches.length === 0) throw new Error('selected DSH patch is not part of this profile source stack')
  if (matches.length > 1) throw new Error('selected DSH patch appears more than once in the source stack')
  const layer = matches[0]
  if (layer?.owner !== 'profile') throw new Error('provider replacement currently targets only the profile patch')
  if (!layer.patch.exists) throw new Error('selected DSH profile patch does not exist')
  if (!layer.patch.writable) throw new Error('selected DSH profile patch is not writable')
  return layer.patch
}

function replacementText(newline: string): string {
  const contract = FS_SANDBOX_TO_LOCAL_REPLACEMENT
  return [
    `- id: ${contract.currentEntryId}`,
    `  name: ${quoteYamlString(contract.currentPluginName)}`,
    '  disabled: true',
    '- insert:',
    `    - id: ${contract.replacementEntryId}`,
    `      name: ${quoteYamlString(contract.replacementPluginName)}`,
  ].join(newline)
}

function verifyCandidate(candidateText: string): void {
  const contract = FS_SANDBOX_TO_LOCAL_REPLACEMENT
  const document = parseForEdit(candidateText)
  if (!isSeq(document.contents)) throw new Error('provider replacement did not produce a top-level YAML sequence')
  const currentRows = document.contents.items.filter(row =>
    scalarString(mapField(row, 'id')) === contract.currentEntryId)
  if (currentRows.length !== 1) throw new Error('provider replacement did not produce one guarded current-provider patch')
  const current = currentRows[0]
  const disabled = mapField(current, 'disabled')
  if (scalarString(mapField(current, 'name')) !== contract.currentPluginName
    || !isScalar(disabled)
    || disabled.value !== true) {
    throw new Error('provider replacement did not preserve the guarded disabled current provider')
  }
  const replacements = document.contents.items.flatMap(row => {
    const insert = mapField(row, 'insert')
    if (!isSeq(insert)) return []
    return insert.items.filter(entry =>
      scalarString(mapField(entry, 'id')) === contract.replacementEntryId
      && scalarString(mapField(entry, 'name')) === contract.replacementPluginName)
  })
  if (replacements.length !== 1) throw new Error('provider replacement did not insert one exact replacement provider')
}

function exactMapKeys(node: unknown, expected: readonly string[], label: string): void {
  if (!isMap(node) || node.flow === true || node.anchor !== undefined || node.tag !== undefined) {
    throw new Error(`${label} must remain one unanchored block mapping`)
  }
  const keys = node.items.map(pair => {
    if (!isScalar(pair.key)
      || typeof pair.key.value !== 'string'
      || pair.key.tag !== undefined
      || pair.key.anchor !== undefined) {
      throw new Error(`${label} contains a non-literal mapping key`)
    }
    return pair.key.value
  })
  if (new Set(keys).size !== keys.length
    || keys.length !== expected.length
    || expected.some(key => !keys.includes(key))) {
    throw new Error(`${label} must contain exactly ${expected.join(', ')}`)
  }
}

function literalStringField(node: unknown, field: string, expected: string, label: string): void {
  const value = mapField(node, field)
  if (!isScalar(value)
    || value.value !== expected
    || value.tag !== undefined
    || value.anchor !== undefined) {
    throw new Error(`${label}.${field} must remain the literal ${JSON.stringify(expected)}`)
  }
}

function literalBooleanField(
  node: unknown,
  field: string,
  label: string,
  required: boolean,
): boolean | undefined {
  const value = mapField(node, field)
  if (value === undefined && !required) return undefined
  if (!isScalar(value)
    || typeof value.value !== 'boolean'
    || value.tag !== undefined
    || value.anchor !== undefined) {
    throw new Error(`${label}.${field} must remain one literal boolean`)
  }
  return value.value
}

function lineStartAt(source: string, offset: number): number {
  const previousLf = source.lastIndexOf('\n', Math.max(0, offset - 1))
  const previousCr = source.lastIndexOf('\r', Math.max(0, offset - 1))
  return Math.max(previousLf, previousCr) + 1
}

function nextLineBreak(
  source: string,
  offset: number,
): { endOffset: number; text: string } | undefined {
  for (let index = offset; index < source.length; index += 1) {
    const character = source[index]
    if (character === '\n') {
      return { endOffset: index + 1, text: index > 0 && source[index - 1] === '\r' ? '\r\n' : '\n' }
    }
    if (character === '\r' && source[index + 1] !== '\n') {
      return { endOffset: index + 1, text: '\r' }
    }
  }
  return undefined
}

function replaceBooleanPreview(
  source: string,
  row: unknown,
  entryId: string,
  nextValue: boolean,
): YamlScalarEditPreview {
  const target = mapField(row, 'disabled')
  if (!isScalar(target) || typeof target.value !== 'boolean') {
    throw new Error(`${entryId}.disabled must remain one literal boolean`)
  }
  const startOffset = target.range?.[0]
  const endOffset = target.range?.[1]
  if (startOffset === undefined || endOffset === undefined) {
    throw new Error(`${entryId}.disabled has no editable source range`)
  }
  const beforeText = source.slice(startOffset, endOffset)
  const afterText = nextValue ? 'true' : 'false'
  return {
    operation: 'replace-scalar',
    entryId,
    path: ['disabled'],
    startOffset,
    endOffset,
    beforeText,
    afterText,
    previousValue: target.value,
    nextValue,
    candidateText: `${source.slice(0, startOffset)}${afterText}${source.slice(endOffset)}`,
    changed: beforeText !== afterText,
  }
}

function insertNestedDisabledPreview(
  source: string,
  row: unknown,
  entryId: string,
  nextValue: boolean,
): YamlScalarEditPreview {
  if (!isMap(row) || row.flow === true) throw new Error(`${entryId} must remain one block mapping`)
  const namePair = mapPair(row, 'name')
  if (namePair === undefined || !isScalar(namePair.key) || !isScalar(namePair.value)) {
    throw new Error(`${entryId}.name has no editable source line`)
  }
  const keyStart = namePair.key.range?.[0]
  const valueStart = namePair.value.range?.[0]
  const valueEnd = namePair.value.range?.[1]
  if (keyStart === undefined || valueStart === undefined || valueEnd === undefined) {
    throw new Error(`${entryId}.name has no editable source range`)
  }
  const keyLineStart = lineStartAt(source, keyStart)
  if (keyLineStart !== lineStartAt(source, valueStart)) {
    throw new Error(`${entryId}.name must remain on one line`)
  }
  const indentationText = source.slice(keyLineStart, keyStart)
  if (indentationText.includes('\t') || !/^ +$/u.test(indentationText)) {
    throw new Error(`${entryId}.name indentation is not safely editable`)
  }
  const lineBreak = nextLineBreak(source, valueEnd)
  const newline = lineBreak?.text ?? insertionNewline(source)
  const startOffset = lineBreak?.endOffset ?? source.length
  const afterText = lineBreak === undefined
    ? `${newline}${indentationText}disabled: ${nextValue ? 'true' : 'false'}`
    : `${indentationText}disabled: ${nextValue ? 'true' : 'false'}${newline}`
  return {
    operation: 'insert-field',
    entryId,
    path: ['disabled'],
    startOffset,
    endOffset: startOffset,
    beforeText: '',
    afterText,
    previousValue: undefined,
    nextValue,
    candidateText: `${source.slice(0, startOffset)}${afterText}${source.slice(startOffset)}`,
    changed: true,
  }
}

function switchRows(document: ReturnType<typeof parseDocument>): {
  sandbox: unknown
  local: unknown
} {
  if (!isSeq(document.contents)) throw new Error('DSH patch must contain a top-level YAML sequence')
  if (document.contents.flow === true) throw new Error('flow-style DSH patch sequences are read-only')
  const ids = loaderEntryIds(document)
  for (const entryId of ['fs-sandbox', 'fs-local']) {
    if (ids.filter(id => id === entryId).length !== 1) {
      throw new Error(`provider switch requires exactly one profile-patch declaration for ${JSON.stringify(entryId)}`)
    }
  }
  const sandboxRows = document.contents.items.filter(row =>
    scalarString(mapField(row, 'id')) === 'fs-sandbox')
  const localRows: unknown[] = []
  for (const patch of document.contents.items) {
    if (isAlias(patch)) throw new Error('top-level alias patches make provider switching ambiguous')
    const insert = mapField(patch, 'insert')
    if (insert === undefined) continue
    exactMapKeys(patch, ['insert'], 'fs-local insert patch')
    if (!isSeq(insert) || insert.flow === true || insert.anchor !== undefined || insert.tag !== undefined) {
      throw new Error('fs-local insert must remain one unanchored block sequence')
    }
    for (const entry of insert.items) {
      if (isAlias(entry)) throw new Error('alias-backed inserted provider rows are read-only')
      if (scalarString(mapField(entry, 'id')) === 'fs-local') localRows.push(entry)
    }
  }
  if (sandboxRows.length !== 1 || localRows.length !== 1) {
    throw new Error('provider switch requires the exact generated fs-sandbox and fs-local rows')
  }
  return { sandbox: sandboxRows[0], local: localRows[0] }
}

function verifySwitchCandidate(candidateText: string, targetEntryId: FsProviderEntryId): void {
  const document = parseForEdit(candidateText)
  const rows = switchRows(document)
  const sandboxDisabled = literalBooleanField(rows.sandbox, 'disabled', 'fs-sandbox', true)
  const localDisabled = literalBooleanField(rows.local, 'disabled', 'fs-local', true)
  if (sandboxDisabled !== (targetEntryId === 'fs-local')
    || localDisabled !== (targetEntryId === 'fs-sandbox')) {
    throw new Error('provider switch candidate did not leave exactly the selected provider enabled')
  }
}

function rangeEnd(node: unknown, label: string): number {
  if (node === null || typeof node !== 'object' || !('range' in node)) {
    throw new Error(`${label} has no editable source range`)
  }
  const range = (node as { range?: readonly number[] }).range
  const end = range?.[2] ?? range?.[1]
  if (end === undefined) throw new Error(`${label} has no editable source range`)
  return end
}

function rangeStart(node: unknown, label: string): number {
  if (node === null || typeof node !== 'object' || !('range' in node)) {
    throw new Error(`${label} has no editable source range`)
  }
  const start = (node as { range?: readonly number[] }).range?.[0]
  if (start === undefined) throw new Error(`${label} has no editable source range`)
  return start
}

function planGeneratedResetRange(
  source: string,
  document: ReturnType<typeof parseDocument>,
): { startOffset: number; endOffset: number; beforeText: string; afterText: string } {
  const rows = switchRows(document)
  exactMapKeys(rows.sandbox, ['id', 'name', 'disabled'], 'fs-sandbox provider patch')
  literalStringField(rows.sandbox, 'id', 'fs-sandbox', 'fs-sandbox provider patch')
  literalStringField(
    rows.sandbox,
    'name',
    FS_PROVIDER_RESET_TO_OFFICIAL_DEFAULT.currentPluginName,
    'fs-sandbox provider patch',
  )
  const sandboxDisabled = literalBooleanField(rows.sandbox, 'disabled', 'fs-sandbox', true)
  exactMapKeys(rows.local, ['id', 'name', 'disabled'], 'fs-local provider insert')
  literalStringField(rows.local, 'id', 'fs-local', 'fs-local provider insert')
  literalStringField(
    rows.local,
    'name',
    FS_PROVIDER_RESET_TO_OFFICIAL_DEFAULT.replacementPluginName,
    'fs-local provider insert',
  )
  const localDisabled = literalBooleanField(rows.local, 'disabled', 'fs-local', true)
  if (sandboxDisabled !== false || localDisabled !== true) {
    throw new Error('provider reset requires fs-sandbox active and fs-local disabled')
  }

  if (!isSeq(document.contents) || document.contents.items.length < 2) {
    throw new Error('provider reset requires the exact generated pair at the end of one block sequence')
  }
  const sandboxIndex = document.contents.items.indexOf(rows.sandbox as never)
  const insertPatch = document.contents.items.at(-1)
  const insert = mapField(insertPatch, 'insert')
  if (sandboxIndex !== document.contents.items.length - 2
    || document.contents.items.at(-2) !== rows.sandbox
    || !isSeq(insert)
    || insert.items.length !== 1
    || insert.items[0] !== rows.local) {
    throw new Error('provider reset requires the adjacent generated pair at the end of the profile patch')
  }

  const sandboxStart = lineStartAt(source, rangeStart(rows.sandbox, 'fs-sandbox provider patch'))
  const insertStart = lineStartAt(source, rangeStart(insertPatch, 'fs-local insert patch'))
  const insertEnd = rangeEnd(insertPatch, 'fs-local insert patch')
  if (rangeEnd(rows.sandbox, 'fs-sandbox provider patch') !== insertStart || insertEnd !== source.length) {
    throw new Error('provider reset requires the generated pair to occupy the final exact source block')
  }

  const newline = insertionNewline(source)
  const expectedSandbox = [
    '- id: fs-sandbox',
    `  name: ${quoteYamlString(FS_PROVIDER_RESET_TO_OFFICIAL_DEFAULT.currentPluginName)}`,
    '  disabled: false',
    '',
  ].join(newline)
  const expectedLocal = [
    '- insert:',
    '    - id: fs-local',
    `      name: ${quoteYamlString(FS_PROVIDER_RESET_TO_OFFICIAL_DEFAULT.replacementPluginName)}`,
    '      disabled: true',
  ].join(newline) + ((source.endsWith('\n') || source.endsWith('\r')) ? newline : '')
  if (source.slice(sandboxStart, insertStart) !== expectedSandbox
    || source.slice(insertStart, insertEnd) !== expectedLocal) {
    throw new Error('provider reset accepts only the untouched GraphControl-generated provider blocks')
  }

  const onlyGeneratedPair = document.contents.items.length === 2
  return {
    startOffset: sandboxStart,
    endOffset: insertEnd,
    beforeText: source.slice(sandboxStart, insertEnd),
    afterText: onlyGeneratedPair
      ? `[]${source.endsWith('\n') || source.endsWith('\r') ? newline : ''}`
      : '',
  }
}

function verifyResetCandidate(candidateText: string): void {
  const document = parseForEdit(candidateText)
  if (!isSeq(document.contents)
    || (document.contents.flow === true && document.contents.items.length > 0)) {
    throw new Error('provider reset did not preserve one block-style top-level sequence')
  }
  const participantIds = loaderEntryIds(document).filter(id => id === 'fs-sandbox' || id === 'fs-local')
  if (participantIds.length !== 0) {
    throw new Error('provider reset candidate still declares a generated filesystem provider override')
  }
}

/**
 * Plan the single proven fs-sandbox -> fs-local replacement. The current
 * provider name is a Loader guard, while the replacement is a real insert;
 * official Loader patches never overwrite an existing entry's `name`.
 */
export function planFsSandboxToLocalReplacement(
  options: PlanFsProviderReplacementOptions,
): DshProviderReplacementPlan {
  const patch = selectedProfilePatch(options.sources, options.targetUri)
  const document = parseForEdit(patch.text)
  if (!isSeq(document.contents)) throw new Error('DSH patch must contain a top-level YAML sequence')
  const ids = loaderEntryIds(document)
  const contract = FS_SANDBOX_TO_LOCAL_REPLACEMENT
  for (const entryId of [contract.currentEntryId, contract.replacementEntryId]) {
    const count = ids.filter(id => id === entryId).length
    if (count > 0) {
      throw new Error(`provider replacement requires no existing profile-patch row for ${JSON.stringify(entryId)}`)
    }
  }

  const newline = insertionNewline(patch.text)
  const rowText = replacementText(newline)
  let startOffset: number
  let endOffset: number
  let beforeText: string
  let afterText: string
  if (document.contents.items.length === 0) {
    startOffset = document.contents.range?.[0] ?? -1
    endOffset = document.contents.range?.[1] ?? -1
    if (startOffset < 0 || endOffset < startOffset) {
      throw new Error('empty DSH patch sequence has no editable source range')
    }
    beforeText = patch.text.slice(startOffset, endOffset)
    afterText = rowText
  } else {
    if (document.contents.flow === true) throw new Error('non-empty flow-style DSH patch sequences are read-only')
    const hasFinalNewline = patch.text.endsWith('\n') || patch.text.endsWith('\r')
    startOffset = patch.text.length
    endOffset = startOffset
    beforeText = ''
    afterText = `${hasFinalNewline ? '' : newline}${rowText}${hasFinalNewline ? newline : ''}`
  }
  const candidateText = `${patch.text.slice(0, startOffset)}${afterText}${patch.text.slice(endOffset)}`
  verifyCandidate(candidateText)

  const preview: YamlScalarEditPreview = {
    operation: 'append-entry',
    entryId: contract.replacementEntryId,
    path: ['name'],
    startOffset,
    endOffset,
    beforeText,
    afterText,
    previousValue: undefined,
    nextValue: contract.replacementPluginName,
    candidateText,
    changed: true,
  }
  const intents: SetDeclaredScalarIntent[] = [
    {
      kind: 'set-declared-scalar',
      entryId: contract.currentEntryId,
      path: ['disabled'],
      value: true,
    },
    {
      kind: 'set-declared-scalar',
      entryId: contract.replacementEntryId,
      path: ['name'],
      value: contract.replacementPluginName,
    },
  ]
  const summary = `Replace ${contract.service} provider: disable ${contract.currentEntryId} and insert ${contract.replacementEntryId}`
  const textChange = { startOffset, endOffset, beforeText, afterText }
  const base = createEditPlan({
    id: `replace-provider:${contract.id}:${encodeURIComponent(options.sources.profile)}`,
    targetUri: patch.uri,
    expectedBytes: patch.rawBytes,
    candidateBytes: new TextEncoder().encode(candidateText),
    summary,
    textChange,
    semanticChange: {
      kind: 'replace-provider',
      service: contract.service,
      currentEntryId: contract.currentEntryId,
      replacementEntryId: contract.replacementEntryId,
      replacementPluginName: contract.replacementPluginName,
      risk: contract.risk,
      executionWorldDelta: contract.executionWorldDelta,
      securityDelta: contract.securityDelta,
    },
  })
  const firstIntent = intents[0]
  if (firstIntent === undefined) throw new Error('unreachable: provider replacement has no expectation')
  return {
    ...base,
    targetOwner: 'profile',
    intent: firstIntent,
    intents,
    preview,
    previews: [preview],
    providerReplacement: contract,
    providerChangeMode: 'initial',
  }
}


/**
 * Switch the exact provider pair created by the initial replacement. Both
 * declarations remain in place; only their literal disabled states change.
 */
export function planFsProviderSwitch(
  options: PlanFsProviderSwitchOptions,
): DshProviderSwitchPlan {
  const patch = selectedProfilePatch(options.sources, options.targetUri)
  const document = parseForEdit(patch.text)
  const rows = switchRows(document)
  exactMapKeys(rows.sandbox, ['id', 'name', 'disabled'], 'fs-sandbox provider patch')
  literalStringField(rows.sandbox, 'id', 'fs-sandbox', 'fs-sandbox provider patch')
  literalStringField(
    rows.sandbox,
    'name',
    FS_SANDBOX_TO_LOCAL_REPLACEMENT.currentPluginName,
    'fs-sandbox provider patch',
  )
  const sandboxDisabled = literalBooleanField(rows.sandbox, 'disabled', 'fs-sandbox', true)

  const localHasDisabled = mapPair(rows.local, 'disabled') !== undefined
  exactMapKeys(
    rows.local,
    localHasDisabled ? ['id', 'name', 'disabled'] : ['id', 'name'],
    'fs-local provider insert',
  )
  literalStringField(rows.local, 'id', 'fs-local', 'fs-local provider insert')
  literalStringField(
    rows.local,
    'name',
    FS_SANDBOX_TO_LOCAL_REPLACEMENT.replacementPluginName,
    'fs-local provider insert',
  )
  const localDisabled = literalBooleanField(rows.local, 'disabled', 'fs-local', false) ?? false
  if (sandboxDisabled === localDisabled) {
    throw new Error(`provider switch requires exactly one active provider; both are ${sandboxDisabled ? 'disabled' : 'enabled'}`)
  }
  const targetDisabled = options.targetEntryId === 'fs-sandbox' ? sandboxDisabled : localDisabled
  if (!targetDisabled) {
    throw new Error(`provider ${JSON.stringify(options.targetEntryId)} is already active`)
  }

  const currentEntryId: FsProviderEntryId = options.targetEntryId === 'fs-sandbox'
    ? 'fs-local'
    : 'fs-sandbox'
  const currentRow = currentEntryId === 'fs-sandbox' ? rows.sandbox : rows.local
  const targetRow = options.targetEntryId === 'fs-sandbox' ? rows.sandbox : rows.local
  const disableCurrent = currentEntryId === 'fs-local' && !localHasDisabled
    ? insertNestedDisabledPreview(patch.text, currentRow, currentEntryId, true)
    : replaceBooleanPreview(patch.text, currentRow, currentEntryId, true)
  const enableTarget = replaceBooleanPreview(patch.text, targetRow, options.targetEntryId, false)
  const previews = [disableCurrent, enableTarget]
  const ordered = [...previews].sort((left, right) => left.startOffset - right.startOffset)
  let candidateText = patch.text
  for (const preview of [...ordered].reverse()) {
    candidateText = `${candidateText.slice(0, preview.startOffset)}${preview.afterText}${candidateText.slice(preview.endOffset)}`
  }
  verifySwitchCandidate(candidateText, options.targetEntryId)
  const finalizedPreviews = previews.map(preview => ({ ...preview, candidateText }))
  const contract = options.targetEntryId === 'fs-sandbox'
    ? FS_LOCAL_TO_SANDBOX_SWITCH
    : FS_SANDBOX_TO_LOCAL_REPLACEMENT
  const intents: SetDeclaredScalarIntent[] = [
    { kind: 'set-declared-scalar', entryId: currentEntryId, path: ['disabled'], value: true },
    { kind: 'set-declared-scalar', entryId: options.targetEntryId, path: ['disabled'], value: false },
  ]
  const summary = `Switch fs provider: disable ${currentEntryId} and enable ${options.targetEntryId}`
  const textChanges = finalizedPreviews.map(preview => ({
    startOffset: preview.startOffset,
    endOffset: preview.endOffset,
    beforeText: preview.beforeText,
    afterText: preview.afterText,
  }))
  const firstPreview = finalizedPreviews[0]
  const firstIntent = intents[0]
  const firstTextChange = textChanges[0]
  if (firstPreview === undefined || firstIntent === undefined || firstTextChange === undefined) {
    throw new Error('unreachable: provider switch has no changes')
  }
  const base = createEditPlan({
    id: `switch-provider:${contract.id}:${encodeURIComponent(options.sources.profile)}`,
    targetUri: patch.uri,
    expectedBytes: patch.rawBytes,
    candidateBytes: new TextEncoder().encode(candidateText),
    summary,
    textChange: firstTextChange,
    textChanges,
    semanticChange: {
      kind: 'switch-provider',
      service: contract.service,
      currentEntryId,
      replacementEntryId: options.targetEntryId,
      risk: contract.risk,
      executionWorldDelta: contract.executionWorldDelta,
      securityDelta: contract.securityDelta,
    },
  })
  return {
    ...base,
    targetOwner: 'profile',
    intent: firstIntent,
    intents,
    preview: firstPreview,
    previews: finalizedPreviews,
    providerReplacement: contract,
    providerChangeMode: 'switch',
  }
}

/**
 * Remove only the untouched provider blocks generated by the initial
 * replacement and first restore. Official bundle composition then supplies
 * fs-sandbox again; no installation-owned source is edited.
 */
export function planFsProviderReset(
  options: PlanFsProviderReplacementOptions,
): DshProviderResetPlan {
  const patch = selectedProfilePatch(options.sources, options.targetUri)
  const document = parseForEdit(patch.text)
  const change = planGeneratedResetRange(patch.text, document)
  const candidateText = `${patch.text.slice(0, change.startOffset)}${change.afterText}${patch.text.slice(change.endOffset)}`
  verifyResetCandidate(candidateText)

  const contract = FS_PROVIDER_RESET_TO_OFFICIAL_DEFAULT
  const preview: YamlScalarEditPreview = {
    operation: 'remove-entry',
    entryId: 'fs-provider-overrides',
    path: [],
    startOffset: change.startOffset,
    endOffset: change.endOffset,
    beforeText: change.beforeText,
    afterText: change.afterText,
    previousValue: 'generated-fs-provider-overrides',
    nextValue: null,
    candidateText,
    changed: true,
  }
  // Existing validation represents positive resolved facts as scalar
  // postconditions. The reset-specific validator additionally proves that the
  // local provider is absent and the sandbox contract is active.
  const intent: SetDeclaredScalarIntent = {
    kind: 'set-declared-scalar',
    entryId: contract.currentEntryId,
    path: ['name'],
    value: contract.currentPluginName,
  }
  const summary = 'Reset fs provider to the official fs-sandbox default by removing generated overrides'
  const base = createEditPlan({
    id: `reset-provider:${contract.id}:${encodeURIComponent(options.sources.profile)}`,
    targetUri: patch.uri,
    expectedBytes: patch.rawBytes,
    candidateBytes: new TextEncoder().encode(candidateText),
    summary,
    textChange: change,
    semanticChange: {
      kind: 'reset-provider',
      service: contract.service,
      currentEntryId: contract.currentEntryId,
      removedEntryIds: [contract.currentEntryId, contract.replacementEntryId],
      inheritedProviderEntryId: contract.currentEntryId,
      risk: contract.risk,
      executionWorldDelta: contract.executionWorldDelta,
      securityDelta: contract.securityDelta,
    },
  })
  return {
    ...base,
    targetOwner: 'profile',
    intent,
    intents: [intent],
    preview,
    previews: [preview],
    providerReplacement: contract,
    providerChangeMode: 'reset',
  }
}
