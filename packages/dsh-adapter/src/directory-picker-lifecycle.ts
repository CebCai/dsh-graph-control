import { isAlias, isMap, isScalar, isSeq, parseDocument } from 'yaml'
import { createEditPlan } from '@dsh-graph-control/edit-transaction'
import {
  DIRECTORY_PICKER_BROWSE_PIN,
  DIRECTORY_PICKER_RESET_AUTO,
} from './current-official-contracts.ts'
import type { DshProfileSources, ExistingDshSourceDocument } from './profile-sources.ts'
import type {
  DshScalarEditPlan,
  SetDeclaredScalarIntent,
  YamlScalarEditPreview,
} from './yaml-edit.ts'

export interface PlanDirectoryPickerChangeOptions {
  sources: DshProfileSources
  targetUri: string
}

export interface DshDirectoryPickerBrowsePinPlan extends DshScalarEditPlan {
  directoryPickerChange: typeof DIRECTORY_PICKER_BROWSE_PIN
  directoryPickerMode: 'pin-browse'
}

export interface DshDirectoryPickerResetPlan extends DshScalarEditPlan {
  directoryPickerChange: typeof DIRECTORY_PICKER_RESET_AUTO
  directoryPickerMode: 'reset-auto'
}

export type DshDirectoryPickerChangePlan =
  | DshDirectoryPickerBrowsePinPlan
  | DshDirectoryPickerResetPlan

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

function selectedProfilePatch(
  sources: DshProfileSources,
  targetUri: string,
): ExistingDshSourceDocument {
  const matches = sources.layers.filter(layer => layer.patch.uri === targetUri)
  if (matches.length === 0) throw new Error('selected DSH patch is not part of this profile source stack')
  if (matches.length > 1) throw new Error('selected DSH patch appears more than once in the source stack')
  const layer = matches[0]
  if (layer?.owner !== 'profile') throw new Error('directory-picker changes currently target only the profile patch')
  if (!layer.patch.exists) throw new Error('selected DSH profile patch does not exist')
  if (!layer.patch.writable) throw new Error('selected DSH profile patch is not writable')
  return layer.patch
}

function insertionNewline(source: string): string {
  const finalLf = source.lastIndexOf('\n')
  if (finalLf >= 0) return finalLf > 0 && source[finalLf - 1] === '\r' ? '\r\n' : '\n'
  return source.includes('\r') ? '\r' : '\n'
}

function quoteYamlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function collectInsertedIds(node: unknown, ids: string[]): void {
  if (isAlias(node)) throw new Error('alias-backed inserted directory-picker rows are read-only')
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
    if (isAlias(patch)) throw new Error('top-level alias patches make directory-picker changes ambiguous')
    const directId = scalarString(mapField(patch, 'id'))
    if (directId !== undefined) ids.push(directId)
    const insert = mapField(patch, 'insert')
    if (isSeq(insert)) {
      for (const entry of insert.items) collectInsertedIds(entry, ids)
    }
  }
  return ids
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

function literalBooleanField(node: unknown, field: string, expected: boolean, label: string): void {
  const value = mapField(node, field)
  if (!isScalar(value)
    || value.value !== expected
    || value.tag !== undefined
    || value.anchor !== undefined) {
    throw new Error(`${label}.${field} must remain the literal ${String(expected)}`)
  }
}

function rangeStart(node: unknown, label: string): number {
  if (node === null || typeof node !== 'object' || !('range' in node)) {
    throw new Error(`${label} has no editable source range`)
  }
  const start = (node as { range?: readonly number[] }).range?.[0]
  if (start === undefined) throw new Error(`${label} has no editable source range`)
  return start
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

function lineStartAt(source: string, offset: number): number {
  const previousLf = source.lastIndexOf('\n', Math.max(0, offset - 1))
  const previousCr = source.lastIndexOf('\r', Math.max(0, offset - 1))
  return Math.max(previousLf, previousCr) + 1
}

function browsePinText(newline: string): string {
  const contract = DIRECTORY_PICKER_BROWSE_PIN
  return [
    `- id: ${contract.currentEntryId}`,
    `  name: ${quoteYamlString(contract.currentPluginName)}`,
    '  disabled: true',
    '- insert:',
    `    - id: ${contract.replacementEntryId}`,
    `      name: ${quoteYamlString(contract.replacementPluginName)}`,
    `    - id: ${contract.companionEntryId}`,
    `      name: ${quoteYamlString(contract.companionPluginName)}`,
  ].join(newline)
}

interface PickerRows {
  auto: unknown
  insertPatch: unknown
  hostBrowse: unknown
  clientBrowse: unknown
}

function browsePinRows(document: ReturnType<typeof parseDocument>): PickerRows {
  if (!isSeq(document.contents) || document.contents.flow === true) {
    throw new Error('directory-picker pin requires one block-style top-level YAML sequence')
  }
  const contract = DIRECTORY_PICKER_BROWSE_PIN
  const participantIds = [contract.currentEntryId, contract.replacementEntryId, contract.companionEntryId]
  const ids = loaderEntryIds(document)
  for (const entryId of participantIds) {
    if (ids.filter(id => id === entryId).length !== 1) {
      throw new Error(`directory-picker pin requires exactly one profile-patch declaration for ${JSON.stringify(entryId)}`)
    }
  }
  const autoRows = document.contents.items.filter(row =>
    scalarString(mapField(row, 'id')) === contract.currentEntryId)
  const insertPatches = document.contents.items.filter(row => {
    const insert = mapField(row, 'insert')
    if (!isSeq(insert)) return false
    return insert.items.some(entry => {
      const id = scalarString(mapField(entry, 'id'))
      return id === contract.replacementEntryId || id === contract.companionEntryId
    })
  })
  if (autoRows.length !== 1 || insertPatches.length !== 1) {
    throw new Error('directory-picker pin requires the exact auto guard and browse insert block')
  }
  const insertPatch = insertPatches[0]
  const insert = mapField(insertPatch, 'insert')
  exactMapKeys(insertPatch, ['insert'], 'directory-picker browse insert patch')
  if (!isSeq(insert)
    || insert.flow === true
    || insert.anchor !== undefined
    || insert.tag !== undefined
    || insert.items.length !== 2) {
    throw new Error('directory-picker browse insert must remain one two-entry block sequence')
  }
  const hostRows = insert.items.filter(row =>
    scalarString(mapField(row, 'id')) === contract.replacementEntryId)
  const clientRows = insert.items.filter(row =>
    scalarString(mapField(row, 'id')) === contract.companionEntryId)
  if (hostRows.length !== 1 || clientRows.length !== 1
    || insert.items[0] !== hostRows[0]
    || insert.items[1] !== clientRows[0]) {
    throw new Error('directory-picker browse pair must remain host-first and client-second')
  }
  return {
    auto: autoRows[0],
    insertPatch,
    hostBrowse: hostRows[0],
    clientBrowse: clientRows[0],
  }
}

function verifyPinnedCandidate(candidateText: string): void {
  const contract = DIRECTORY_PICKER_BROWSE_PIN
  const rows = browsePinRows(parseForEdit(candidateText))
  exactMapKeys(rows.auto, ['id', 'name', 'disabled'], 'directory-picker auto guard')
  literalStringField(rows.auto, 'id', contract.currentEntryId, 'directory-picker auto guard')
  literalStringField(rows.auto, 'name', contract.currentPluginName, 'directory-picker auto guard')
  literalBooleanField(rows.auto, 'disabled', true, 'directory-picker auto guard')
  exactMapKeys(rows.hostBrowse, ['id', 'name'], 'directory-picker host browse insert')
  literalStringField(rows.hostBrowse, 'id', contract.replacementEntryId, 'directory-picker host browse insert')
  literalStringField(rows.hostBrowse, 'name', contract.replacementPluginName, 'directory-picker host browse insert')
  exactMapKeys(rows.clientBrowse, ['id', 'name'], 'directory-picker client browse insert')
  literalStringField(rows.clientBrowse, 'id', contract.companionEntryId, 'directory-picker client browse insert')
  literalStringField(rows.clientBrowse, 'name', contract.companionPluginName, 'directory-picker client browse insert')
}

function generatedResetRange(
  source: string,
  document: ReturnType<typeof parseDocument>,
): { startOffset: number; endOffset: number; beforeText: string; afterText: string } {
  const rows = browsePinRows(document)
  verifyPinnedCandidate(source)
  if (!isSeq(document.contents)) throw new Error('unreachable: directory-picker patch is not a sequence')
  const autoIndex = document.contents.items.indexOf(rows.auto as never)
  const insertIndex = document.contents.items.indexOf(rows.insertPatch as never)
  if (autoIndex < 0
    || insertIndex !== autoIndex + 1
    || insertIndex !== document.contents.items.length - 1) {
    throw new Error('directory-picker reset requires the generated pair to be adjacent and final')
  }
  const startOffset = lineStartAt(source, rangeStart(rows.auto, 'directory-picker auto guard'))
  const insertStart = lineStartAt(source, rangeStart(rows.insertPatch, 'directory-picker browse insert patch'))
  const endOffset = rangeEnd(rows.insertPatch, 'directory-picker browse insert patch')
  if (rangeEnd(rows.auto, 'directory-picker auto guard') !== insertStart || endOffset !== source.length) {
    throw new Error('directory-picker reset requires the generated pair to occupy the final exact source block')
  }
  const newline = insertionNewline(source)
  const expectedAuto = [
    `- id: ${DIRECTORY_PICKER_BROWSE_PIN.currentEntryId}`,
    `  name: ${quoteYamlString(DIRECTORY_PICKER_BROWSE_PIN.currentPluginName)}`,
    '  disabled: true',
    '',
  ].join(newline)
  const expectedInsert = [
    '- insert:',
    `    - id: ${DIRECTORY_PICKER_BROWSE_PIN.replacementEntryId}`,
    `      name: ${quoteYamlString(DIRECTORY_PICKER_BROWSE_PIN.replacementPluginName)}`,
    `    - id: ${DIRECTORY_PICKER_BROWSE_PIN.companionEntryId}`,
    `      name: ${quoteYamlString(DIRECTORY_PICKER_BROWSE_PIN.companionPluginName)}`,
  ].join(newline) + ((source.endsWith('\n') || source.endsWith('\r')) ? newline : '')
  if (source.slice(startOffset, insertStart) !== expectedAuto
    || source.slice(insertStart, endOffset) !== expectedInsert) {
    throw new Error('directory-picker reset accepts only the untouched GraphControl-generated browse pin')
  }
  return {
    startOffset,
    endOffset,
    beforeText: source.slice(startOffset, endOffset),
    afterText: document.contents.items.length === 2
      ? `[]${source.endsWith('\n') || source.endsWith('\r') ? newline : ''}`
      : '',
  }
}

function verifyResetCandidate(candidateText: string): void {
  const document = parseForEdit(candidateText)
  if (!isSeq(document.contents)
    || (document.contents.flow === true && document.contents.items.length > 0)) {
    throw new Error('directory-picker reset did not preserve a supported top-level sequence')
  }
  const participantIds = new Set<string>([
    DIRECTORY_PICKER_BROWSE_PIN.currentEntryId,
    DIRECTORY_PICKER_BROWSE_PIN.replacementEntryId,
    DIRECTORY_PICKER_BROWSE_PIN.companionEntryId,
  ])
  if (loaderEntryIds(document).some(id => participantIds.has(id))) {
    throw new Error('directory-picker reset candidate still declares a generated browse pin')
  }
}

/** Pin the official Web directory picker to the host/client in-app browse pair. */
export function planDirectoryPickerBrowsePin(
  options: PlanDirectoryPickerChangeOptions,
): DshDirectoryPickerBrowsePinPlan {
  const patch = selectedProfilePatch(options.sources, options.targetUri)
  const document = parseForEdit(patch.text)
  if (!isSeq(document.contents)) throw new Error('DSH patch must contain a top-level YAML sequence')
  const contract = DIRECTORY_PICKER_BROWSE_PIN
  const ids = loaderEntryIds(document)
  for (const entryId of [contract.currentEntryId, contract.replacementEntryId, contract.companionEntryId]) {
    if (ids.includes(entryId)) {
      throw new Error(`directory-picker pin requires no existing profile-patch row for ${JSON.stringify(entryId)}`)
    }
  }
  const newline = insertionNewline(patch.text)
  const rowText = browsePinText(newline)
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
  verifyPinnedCandidate(candidateText)
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
    { kind: 'set-declared-scalar', entryId: contract.currentEntryId, path: ['disabled'], value: true },
    { kind: 'set-declared-scalar', entryId: contract.replacementEntryId, path: ['name'], value: contract.replacementPluginName },
    { kind: 'set-declared-scalar', entryId: contract.companionEntryId, path: ['name'], value: contract.companionPluginName },
  ]
  const summary = 'Pin the Web directory picker to the in-app browser interaction'
  const textChange = { startOffset, endOffset, beforeText, afterText }
  const base = createEditPlan({
    id: `pin-directory-picker:${encodeURIComponent(options.sources.profile)}`,
    targetUri: patch.uri,
    expectedBytes: patch.rawBytes,
    candidateBytes: new TextEncoder().encode(candidateText),
    summary,
    textChange,
    semanticChange: {
      kind: 'pin-directory-picker',
      service: contract.service,
      currentEntryId: contract.currentEntryId,
      replacementEntryId: contract.replacementEntryId,
      companionEntryId: contract.companionEntryId,
      risk: contract.risk,
      executionWorldDelta: contract.executionWorldDelta,
      securityDelta: contract.securityDelta,
    },
  })
  const intent = intents[0]
  if (intent === undefined) throw new Error('unreachable: directory-picker pin has no expectation')
  return {
    ...base,
    targetOwner: 'profile',
    intent,
    intents,
    preview,
    previews: [preview],
    directoryPickerChange: contract,
    directoryPickerMode: 'pin-browse',
  }
}

/** Remove only the exact generated browse pin and inherit the official adaptive chooser. */
export function planDirectoryPickerResetAuto(
  options: PlanDirectoryPickerChangeOptions,
): DshDirectoryPickerResetPlan {
  const patch = selectedProfilePatch(options.sources, options.targetUri)
  const document = parseForEdit(patch.text)
  const change = generatedResetRange(patch.text, document)
  const candidateText = `${patch.text.slice(0, change.startOffset)}${change.afterText}${patch.text.slice(change.endOffset)}`
  verifyResetCandidate(candidateText)
  const contract = DIRECTORY_PICKER_RESET_AUTO
  const preview: YamlScalarEditPreview = {
    operation: 'remove-entry',
    entryId: 'directory-picker-browse-pin',
    path: [],
    startOffset: change.startOffset,
    endOffset: change.endOffset,
    beforeText: change.beforeText,
    afterText: change.afterText,
    previousValue: 'generated-directory-picker-browse-pin',
    nextValue: null,
    candidateText,
    changed: true,
  }
  const intent: SetDeclaredScalarIntent = {
    kind: 'set-declared-scalar',
    entryId: contract.replacementEntryId,
    path: ['name'],
    value: contract.replacementPluginName,
  }
  const summary = 'Reset the Web directory picker to the official adaptive default'
  const base = createEditPlan({
    id: `reset-directory-picker:${encodeURIComponent(options.sources.profile)}`,
    targetUri: patch.uri,
    expectedBytes: patch.rawBytes,
    candidateBytes: new TextEncoder().encode(candidateText),
    summary,
    textChange: change,
    semanticChange: {
      kind: 'reset-directory-picker',
      service: contract.service,
      removedEntryIds: [contract.currentEntryId, contract.companionEntryId],
      inheritedProviderEntryId: contract.replacementEntryId,
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
    directoryPickerChange: contract,
    directoryPickerMode: 'reset-auto',
  }
}
