import { isAlias, isMap, isScalar, isSeq, parseDocument } from 'yaml'
import { createEditPlan } from '@dsh-graph-control/edit-transaction'
import {
  TIME_CONTEXT_PLUGIN_ADD,
  TIME_CONTEXT_PLUGIN_REMOVE,
} from './current-official-contracts.ts'
import type { DshProfileSources, ExistingDshSourceDocument } from './profile-sources.ts'
import type {
  DshScalarEditPlan,
  SetDeclaredScalarIntent,
  YamlScalarEditPreview,
} from './yaml-edit.ts'

export interface PlanTimeContextChangeOptions {
  sources: DshProfileSources
  targetUri: string
}

export interface DshTimeContextAddPlan extends DshScalarEditPlan {
  timeContextChange: typeof TIME_CONTEXT_PLUGIN_ADD
  timeContextMode: 'add-plugin'
}

export interface DshTimeContextRemovePlan extends DshScalarEditPlan {
  timeContextChange: typeof TIME_CONTEXT_PLUGIN_REMOVE
  timeContextMode: 'remove-plugin'
}

export type DshTimeContextChangePlan = DshTimeContextAddPlan | DshTimeContextRemovePlan

function mapField(node: unknown, name: string): unknown {
  if (!isMap(node)) return undefined
  return node.items.find(pair => isScalar(pair.key) && pair.key.value === name)?.value
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
  if (layer?.owner !== 'profile') throw new Error('time-context changes currently target only the profile patch')
  if (!layer.patch.exists) throw new Error('selected DSH profile patch does not exist')
  if (!layer.patch.writable) throw new Error('selected DSH profile patch is not writable')
  return layer.patch
}

function insertionNewline(source: string): string {
  const finalLf = source.lastIndexOf('\n')
  if (finalLf >= 0) return finalLf > 0 && source[finalLf - 1] === '\r' ? '\r\n' : '\n'
  return source.includes('\r') ? '\r' : '\n'
}

function collectIds(node: unknown, ids: string[]): void {
  if (isAlias(node)) throw new Error('alias-backed inserted rows make time-context changes ambiguous')
  if (!isMap(node)) return
  const id = scalarString(mapField(node, 'id'))
  if (id !== undefined) ids.push(id)
  const group = mapField(node, 'group')
  const config = mapField(node, 'config')
  if (isScalar(group) && group.value === true && isSeq(config)) {
    for (const child of config.items) collectIds(child, ids)
  }
}

function loaderEntryIds(document: ReturnType<typeof parseDocument>): string[] {
  if (!isSeq(document.contents)) return []
  const ids: string[] = []
  for (const patch of document.contents.items) {
    if (isAlias(patch)) throw new Error('top-level aliases make time-context changes ambiguous')
    const directId = scalarString(mapField(patch, 'id'))
    if (directId !== undefined) ids.push(directId)
    const insert = mapField(patch, 'insert')
    if (isSeq(insert)) {
      for (const entry of insert.items) collectIds(entry, ids)
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

function rangeStart(node: unknown, label: string): number {
  if (node === null || typeof node !== 'object' || !('range' in node)) throw new Error(`${label} has no source range`)
  const start = (node as { range?: readonly number[] }).range?.[0]
  if (start === undefined) throw new Error(`${label} has no source range`)
  return start
}

function rangeEnd(node: unknown, label: string): number {
  if (node === null || typeof node !== 'object' || !('range' in node)) throw new Error(`${label} has no source range`)
  const range = (node as { range?: readonly number[] }).range
  const end = range?.[2] ?? range?.[1]
  if (end === undefined) throw new Error(`${label} has no source range`)
  return end
}

function lineStartAt(source: string, offset: number): number {
  const previousLf = source.lastIndexOf('\n', Math.max(0, offset - 1))
  const previousCr = source.lastIndexOf('\r', Math.max(0, offset - 1))
  return Math.max(previousLf, previousCr) + 1
}

function generatedText(newline: string): string {
  return [
    '- insert:',
    `    - id: ${TIME_CONTEXT_PLUGIN_ADD.entryId}`,
    `      name: '${TIME_CONTEXT_PLUGIN_ADD.pluginName}'`,
  ].join(newline)
}

function exactGeneratedInsert(document: ReturnType<typeof parseDocument>): { patch: unknown; entry: unknown } {
  if (!isSeq(document.contents) || document.contents.flow === true) {
    throw new Error('time-context removal requires a block-style top-level YAML sequence')
  }
  const matches = document.contents.items.flatMap(patch => {
    const insert = mapField(patch, 'insert')
    if (!isSeq(insert)) return []
    return insert.items.some(entry => scalarString(mapField(entry, 'id')) === TIME_CONTEXT_PLUGIN_ADD.entryId)
      ? [{ patch, insert }]
      : []
  })
  if (matches.length !== 1) throw new Error('time-context removal requires one exact generated insert block')
  const match = matches[0]
  if (match === undefined) throw new Error('unreachable: generated time-context insert is missing')
  exactMapKeys(match.patch, ['insert'], 'time-context insert patch')
  if (match.insert.flow === true
    || match.insert.anchor !== undefined
    || match.insert.tag !== undefined
    || match.insert.items.length !== 1) {
    throw new Error('time-context insert must remain a one-entry block sequence')
  }
  const entry = match.insert.items[0]
  exactMapKeys(entry, ['id', 'name'], 'time-context entry')
  const id = mapField(entry, 'id')
  const name = mapField(entry, 'name')
  if (!isScalar(id) || id.value !== TIME_CONTEXT_PLUGIN_ADD.entryId || id.tag !== undefined || id.anchor !== undefined
    || !isScalar(name) || name.value !== TIME_CONTEXT_PLUGIN_ADD.pluginName || name.tag !== undefined || name.anchor !== undefined) {
    throw new Error('time-context insert no longer matches the GraphControl-generated plugin entry')
  }
  return { patch: match.patch, entry }
}

/** Append the one current-official time-context plugin entry without writing. */
export function planTimeContextAdd(options: PlanTimeContextChangeOptions): DshTimeContextAddPlan {
  const patch = selectedProfilePatch(options.sources, options.targetUri)
  const document = parseForEdit(patch.text)
  if (!isSeq(document.contents)) throw new Error('DSH patch must contain a top-level YAML sequence')
  if (loaderEntryIds(document).includes(TIME_CONTEXT_PLUGIN_ADD.entryId)) {
    throw new Error('time-context is already declared in the selected profile patch')
  }
  const newline = insertionNewline(patch.text)
  const rowText = generatedText(newline)
  let startOffset: number
  let endOffset: number
  let beforeText: string
  let afterText: string
  if (document.contents.items.length === 0) {
    startOffset = document.contents.range?.[0] ?? -1
    endOffset = document.contents.range?.[1] ?? -1
    if (startOffset < 0 || endOffset < startOffset) throw new Error('empty DSH patch sequence has no editable source range')
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
  const candidate = parseForEdit(candidateText)
  exactGeneratedInsert(candidate)
  if (loaderEntryIds(candidate).filter(id => id === TIME_CONTEXT_PLUGIN_ADD.entryId).length !== 1) {
    throw new Error('time-context addition did not produce one unique plugin entry')
  }
  const intent: SetDeclaredScalarIntent = {
    kind: 'set-declared-scalar',
    entryId: TIME_CONTEXT_PLUGIN_ADD.entryId,
    path: ['name'],
    value: TIME_CONTEXT_PLUGIN_ADD.pluginName,
  }
  const preview: YamlScalarEditPreview = {
    operation: 'append-entry',
    entryId: intent.entryId,
    path: [...intent.path],
    startOffset,
    endOffset,
    beforeText,
    afterText,
    previousValue: undefined,
    nextValue: intent.value,
    candidateText,
    changed: true,
  }
  const base = createEditPlan({
    id: `add-time-context:${encodeURIComponent(options.sources.profile)}`,
    targetUri: patch.uri,
    expectedBytes: patch.rawBytes,
    candidateBytes: new TextEncoder().encode(candidateText),
    summary: 'Enable current time context for the Agent',
    textChange: { startOffset, endOffset, beforeText, afterText },
    semanticChange: {
      kind: 'add-time-context',
      entryId: intent.entryId,
      pluginName: intent.value,
      securityDelta: TIME_CONTEXT_PLUGIN_ADD.securityDelta,
    },
  })
  return {
    ...base,
    targetOwner: 'profile',
    intent,
    intents: [intent],
    preview,
    previews: [preview],
    timeContextChange: TIME_CONTEXT_PLUGIN_ADD,
    timeContextMode: 'add-plugin',
  }
}

/** Remove only the final, untouched time-context insert created above. */
export function planTimeContextRemove(options: PlanTimeContextChangeOptions): DshTimeContextRemovePlan {
  const patch = selectedProfilePatch(options.sources, options.targetUri)
  const document = parseForEdit(patch.text)
  const generated = exactGeneratedInsert(document)
  if (!isSeq(document.contents)) throw new Error('unreachable: time-context patch is not a sequence')
  const generatedIndex = document.contents.items.indexOf(generated.patch as never)
  if (generatedIndex !== document.contents.items.length - 1) {
    throw new Error('time-context removal requires the generated insert to remain the final patch block')
  }
  const startOffset = lineStartAt(patch.text, rangeStart(generated.patch, 'time-context insert patch'))
  const endOffset = rangeEnd(generated.patch, 'time-context insert patch')
  if (endOffset !== patch.text.length) {
    throw new Error('time-context removal requires the generated insert to occupy the final source block')
  }
  const newline = insertionNewline(patch.text)
  const expected = generatedText(newline) + ((patch.text.endsWith('\n') || patch.text.endsWith('\r')) ? newline : '')
  const beforeText = patch.text.slice(startOffset, endOffset)
  if (beforeText !== expected) {
    throw new Error('time-context removal accepts only the untouched GraphControl-generated insert')
  }
  const afterText = document.contents.items.length === 1
    ? `[]${patch.text.endsWith('\n') || patch.text.endsWith('\r') ? newline : ''}`
    : ''
  const candidateText = `${patch.text.slice(0, startOffset)}${afterText}${patch.text.slice(endOffset)}`
  const candidate = parseForEdit(candidateText)
  if (!isSeq(candidate.contents)
    || loaderEntryIds(candidate).includes(TIME_CONTEXT_PLUGIN_ADD.entryId)) {
    throw new Error('time-context removal candidate still declares the plugin')
  }
  const intent: SetDeclaredScalarIntent = {
    kind: 'set-declared-scalar',
    entryId: TIME_CONTEXT_PLUGIN_REMOVE.entryId,
    path: [],
    value: null,
  }
  const preview: YamlScalarEditPreview = {
    operation: 'remove-entry',
    entryId: intent.entryId,
    path: [],
    startOffset,
    endOffset,
    beforeText,
    afterText,
    previousValue: TIME_CONTEXT_PLUGIN_REMOVE.pluginName,
    nextValue: null,
    candidateText,
    changed: true,
  }
  const base = createEditPlan({
    id: `remove-time-context:${encodeURIComponent(options.sources.profile)}`,
    targetUri: patch.uri,
    expectedBytes: patch.rawBytes,
    candidateBytes: new TextEncoder().encode(candidateText),
    summary: 'Remove current time context from the Agent',
    textChange: { startOffset, endOffset, beforeText, afterText },
    semanticChange: {
      kind: 'remove-time-context',
      entryId: intent.entryId,
      pluginName: TIME_CONTEXT_PLUGIN_REMOVE.pluginName,
    },
  })
  return {
    ...base,
    targetOwner: 'profile',
    intent,
    intents: [intent],
    preview,
    previews: [preview],
    timeContextChange: TIME_CONTEXT_PLUGIN_REMOVE,
    timeContextMode: 'remove-plugin',
  }
}
