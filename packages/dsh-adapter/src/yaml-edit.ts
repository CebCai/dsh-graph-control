import { isAlias, isMap, isScalar, isSeq, parseDocument } from 'yaml'
import { createEditPlan, type EditPlan } from '@dsh-graph-control/edit-transaction'
import type {
  DshProfileSources,
  DshSourceLayer,
  ExistingDshSourceDocument,
} from './profile-sources.ts'

export type YamlScalarEditValue = string | number | boolean | null

export interface PlanYamlScalarEditOptions {
  source: string
  entryId: string
  path: readonly string[]
  value: YamlScalarEditValue
}

export interface YamlScalarEditPreview {
  operation: 'replace-scalar' | 'insert-field' | 'append-entry' | 'remove-entry'
  entryId: string
  path: readonly string[]
  startOffset: number
  endOffset: number
  beforeText: string
  afterText: string
  previousValue: unknown
  nextValue: YamlScalarEditValue
  candidateText: string
  changed: boolean
}

export interface SetDeclaredScalarIntent {
  kind: 'set-declared-scalar'
  entryId: string
  path: readonly string[]
  value: YamlScalarEditValue
}

export interface PlanDeclaredScalarEditOptions {
  sources: DshProfileSources
  targetUri: string
  intent: SetDeclaredScalarIntent
}

export interface PlanDeclaredScalarEditsOptions {
  sources: DshProfileSources
  targetUri: string
  intents: readonly SetDeclaredScalarIntent[]
}

export interface DshScalarEditPlan extends EditPlan {
  targetOwner: 'profile' | 'home' | 'explicit'
  intent: SetDeclaredScalarIntent
  intents: readonly SetDeclaredScalarIntent[]
  preview: YamlScalarEditPreview
  previews: readonly YamlScalarEditPreview[]
}

function mapPair(node: unknown, name: string): { key: unknown; value: unknown } | undefined {
  if (!isMap(node)) return undefined
  for (const pair of node.items) {
    if (isScalar(pair.key) && pair.key.value === name) return pair
  }
  return undefined
}

function mapField(node: unknown, name: string): unknown {
  return mapPair(node, name)?.value
}

function renderScalar(value: YamlScalarEditValue): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (!Number.isFinite(value)) throw new Error('YAML scalar edit requires a finite number')
  return Object.is(value, -0) ? '-0' : String(value)
}

function renderEntryId(entryId: string): string {
  return /^[A-Za-z_][A-Za-z0-9_.-]*$/u.test(entryId) ? entryId : JSON.stringify(entryId)
}

function parseForEdit(source: string): ReturnType<typeof parseDocument> {
  const document = parseDocument(source, { keepSourceTokens: true, prettyErrors: false })
  if (document.errors.length > 0) {
    throw new Error(`cannot edit invalid YAML: ${document.errors.map(error => error.message).join('; ')}`)
  }
  return document
}

function matchingEntryRows(
  document: ReturnType<typeof parseDocument>,
  entryId: string,
): readonly unknown[] {
  if (!isSeq(document.contents)) return []
  return document.contents.items.filter(row => {
    const id = mapField(row, 'id')
    return isScalar(id) && id.value === entryId
  })
}

function insertionNewline(source: string): string {
  const finalLf = source.lastIndexOf('\n')
  if (finalLf >= 0) return finalLf > 0 && source[finalLf - 1] === '\r' ? '\r\n' : '\n'
  return source.includes('\r') ? '\r' : '\n'
}

/**
 * Plan one surgical replacement of an existing scalar on a top-level id patch.
 * The candidate is returned in memory; this function never writes or evaluates
 * tagged values. Missing fields, aliases, anchors, and tagged targets fail closed.
 */
export function planYamlScalarEdit(options: PlanYamlScalarEditOptions): YamlScalarEditPreview {
  if (options.entryId === '') throw new Error('entryId must not be empty')
  if (options.path.length === 0) throw new Error('scalar edit path must not be empty')
  const document = parseForEdit(options.source)
  if (!isSeq(document.contents)) throw new Error('DSH patch must contain a top-level YAML sequence')

  const matching = matchingEntryRows(document, options.entryId)
  if (matching.length === 0) throw new Error(`entry patch ${JSON.stringify(options.entryId)} was not found`)
  if (matching.length > 1) throw new Error(`entry patch ${JSON.stringify(options.entryId)} is ambiguous`)

  let target: unknown = matching[0]
  for (const segment of options.path) {
    target = mapField(target, segment)
    if (target === undefined) {
      throw new Error(`scalar path ${options.path.join('.')} was not found on entry ${JSON.stringify(options.entryId)}`)
    }
  }
  if (!isScalar(target)) {
    throw new Error(`scalar path ${options.path.join('.')} does not target a YAML scalar`)
  }
  if (target.tag !== undefined) {
    throw new Error(`tagged YAML scalar ${options.path.join('.')} is read-only`)
  }
  if (target.anchor !== undefined) {
    throw new Error(`anchored YAML scalar ${options.path.join('.')} is read-only`)
  }
  const startOffset = target.range?.[0]
  const endOffset = target.range?.[1]
  if (startOffset === undefined || endOffset === undefined) {
    throw new Error(`scalar path ${options.path.join('.')} has no editable source range`)
  }

  const beforeText = options.source.slice(startOffset, endOffset)
  const afterText = renderScalar(options.value)
  const candidateText = `${options.source.slice(0, startOffset)}${afterText}${options.source.slice(endOffset)}`
  // The small replacement must still be accepted by the same non-evaluating parser.
  parseForEdit(candidateText)
  return {
    operation: 'replace-scalar',
    entryId: options.entryId,
    path: [...options.path],
    startOffset,
    endOffset,
    beforeText,
    afterText,
    previousValue: target.value,
    nextValue: options.value,
    candidateText,
    changed: beforeText !== afterText,
  }
}

/**
 * Append one minimal top-level `disabled` override for an entry that has no
 * row in the selected patch. Existing rows are never broadened or duplicated.
 */
export function planYamlDisabledOverride(options: {
  source: string
  entryId: string
  value: boolean
}): YamlScalarEditPreview {
  if (options.entryId === '') throw new Error('entryId must not be empty')
  const document = parseForEdit(options.source)
  if (!isSeq(document.contents)) throw new Error('DSH patch must contain a top-level YAML sequence')
  if (document.contents.items.some(row => isAlias(row))) {
    throw new Error('top-level alias rows make a missing entry override ambiguous')
  }
  const matching = matchingEntryRows(document, options.entryId)
  if (matching.length === 1) {
    throw new Error(`entry patch ${JSON.stringify(options.entryId)} already exists; refusing to append a duplicate override`)
  }
  if (matching.length > 1) throw new Error(`entry patch ${JSON.stringify(options.entryId)} is ambiguous`)

  const newline = insertionNewline(options.source)
  const rowText = `- id: ${renderEntryId(options.entryId)}${newline}  disabled: ${renderScalar(options.value)}`
  let startOffset: number
  let endOffset: number
  let beforeText: string
  let afterText: string
  let candidateText: string
  if (document.contents.items.length === 0) {
    startOffset = document.contents.range?.[0] ?? -1
    endOffset = document.contents.range?.[1] ?? -1
    if (startOffset < 0 || endOffset < startOffset) {
      throw new Error('empty DSH patch sequence has no editable source range')
    }
    beforeText = options.source.slice(startOffset, endOffset)
    afterText = rowText
    candidateText = `${options.source.slice(0, startOffset)}${afterText}${options.source.slice(endOffset)}`
  } else {
    if (document.contents.flow === true) {
      throw new Error('non-empty flow-style DSH patch sequences are read-only')
    }
    const hasFinalNewline = options.source.endsWith('\n') || options.source.endsWith('\r')
    const leadingNewline = hasFinalNewline ? '' : newline
    const trailingNewline = hasFinalNewline ? newline : ''
    startOffset = options.source.length
    endOffset = startOffset
    beforeText = ''
    afterText = `${leadingNewline}${rowText}${trailingNewline}`
    candidateText = `${options.source}${afterText}`
  }
  const candidate = parseForEdit(candidateText)
  if (!isSeq(candidate.contents)) throw new Error('appended override did not produce a top-level YAML sequence')
  const inserted = matchingEntryRows(candidate, options.entryId)
  if (inserted.length !== 1) throw new Error('appended override did not produce one unique entry patch')
  const disabled = mapField(inserted[0], 'disabled')
  if (!isScalar(disabled) || disabled.value !== options.value) {
    throw new Error('appended override did not preserve the requested disabled value')
  }

  return {
    operation: 'append-entry',
    entryId: options.entryId,
    path: ['disabled'],
    startOffset,
    endOffset,
    beforeText,
    afterText,
    previousValue: undefined,
    nextValue: options.value,
    candidateText,
    changed: true,
  }
}

function lineStartAt(source: string, offset: number): number {
  const previousLf = source.lastIndexOf('\n', Math.max(0, offset - 1))
  const previousCr = source.lastIndexOf('\r', Math.max(0, offset - 1))
  return Math.max(previousLf, previousCr) + 1
}

function nextLineBreak(
  source: string,
  offset: number,
): { startOffset: number; endOffset: number; text: string } | undefined {
  for (let index = offset; index < source.length; index += 1) {
    const character = source[index]
    if (character === '\n') {
      const startsWithCr = index > 0 && source[index - 1] === '\r'
      return {
        startOffset: startsWithCr ? index - 1 : index,
        endOffset: index + 1,
        text: startsWithCr ? '\r\n' : '\n',
      }
    }
    if (character === '\r') {
      if (source[index + 1] === '\n') continue
      return { startOffset: index, endOffset: index + 1, text: '\r' }
    }
  }
  return undefined
}

/** Insert one boolean `disabled` field after the id line of a direct block-map row. */
export function planYamlDisabledFieldInsertion(options: {
  source: string
  entryId: string
  value: boolean
}): YamlScalarEditPreview {
  if (options.entryId === '') throw new Error('entryId must not be empty')
  const document = parseForEdit(options.source)
  if (!isSeq(document.contents)) throw new Error('DSH patch must contain a top-level YAML sequence')
  const matching = matchingEntryRows(document, options.entryId)
  if (matching.length === 0) throw new Error(`entry patch ${JSON.stringify(options.entryId)} was not found`)
  if (matching.length > 1) throw new Error(`entry patch ${JSON.stringify(options.entryId)} is ambiguous`)
  const row = matching[0]
  if (!isMap(row)) throw new Error(`entry patch ${JSON.stringify(options.entryId)} is not a direct mapping`)
  if (row.flow === true) throw new Error('flow-style entry mappings are read-only')
  if (row.anchor !== undefined || row.tag !== undefined) {
    throw new Error('anchored or tagged entry mappings are read-only')
  }
  if (mapPair(row, 'disabled') !== undefined) {
    throw new Error(`entry patch ${JSON.stringify(options.entryId)} already has a disabled field`)
  }

  const idPair = mapPair(row, 'id')
  if (idPair === undefined || !isScalar(idPair.key) || !isScalar(idPair.value)) {
    throw new Error(`entry patch ${JSON.stringify(options.entryId)} has no editable scalar id`)
  }
  if (idPair.key.tag !== undefined || idPair.key.anchor !== undefined
    || idPair.value.tag !== undefined || idPair.value.anchor !== undefined) {
    throw new Error('tagged or anchored entry ids are read-only')
  }
  const keyStart = idPair.key.range?.[0]
  const valueStart = idPair.value.range?.[0]
  const valueEnd = idPair.value.range?.[1]
  if (keyStart === undefined || valueStart === undefined || valueEnd === undefined) {
    throw new Error('entry id has no editable source range')
  }
  const keyLineStart = lineStartAt(options.source, keyStart)
  const valueLineStart = lineStartAt(options.source, valueStart)
  if (keyLineStart !== valueLineStart) throw new Error('multi-line entry ids are read-only')
  const keyColumn = keyStart - keyLineStart
  const linePrefix = options.source.slice(keyLineStart, keyStart)
  if (keyColumn < 2 || linePrefix.includes('\t')) {
    throw new Error('entry id indentation is not safely editable')
  }
  const indentation = ' '.repeat(keyColumn)
  const lineBreak = nextLineBreak(options.source, valueEnd)
  const startOffset = lineBreak?.endOffset ?? options.source.length
  const newline = lineBreak?.text ?? insertionNewline(options.source)
  const afterText = lineBreak === undefined
    ? `${newline}${indentation}disabled: ${renderScalar(options.value)}`
    : `${indentation}disabled: ${renderScalar(options.value)}${newline}`
  const candidateText = `${options.source.slice(0, startOffset)}${afterText}${options.source.slice(startOffset)}`
  const candidate = parseForEdit(candidateText)
  const inserted = matchingEntryRows(candidate, options.entryId)
  if (inserted.length !== 1) throw new Error('field insertion did not preserve one unique entry patch')
  const disabled = mapField(inserted[0], 'disabled')
  if (!isScalar(disabled) || disabled.value !== options.value) {
    throw new Error('field insertion did not preserve the requested disabled value')
  }

  return {
    operation: 'insert-field',
    entryId: options.entryId,
    path: ['disabled'],
    startOffset,
    endOffset: startOffset,
    beforeText: '',
    afterText,
    previousValue: undefined,
    nextValue: options.value,
    candidateText,
    changed: true,
  }
}

type WritablePatchLayer = Omit<DshSourceLayer, 'owner' | 'patch'> & {
  owner: 'profile' | 'home' | 'explicit'
  patch: ExistingDshSourceDocument
}

function selectedWritablePatch(
  options: Pick<PlanDeclaredScalarEditsOptions, 'sources' | 'targetUri'>,
): WritablePatchLayer {
  const selectedLayer = options.sources.layers.find(layer => layer.patch.uri === options.targetUri)
  if (selectedLayer === undefined) {
    throw new Error(`selected target is not a patch document in profile ${JSON.stringify(options.sources.profile)}`)
  }
  if (selectedLayer.owner === 'bundle') throw new Error('installation-owned DSH bundle patches are read-only')
  if (selectedLayer.patch.owner === 'installation') throw new Error('installation-owned DSH bundle patches are read-only')
  if (!selectedLayer.patch.exists) throw new Error('selected DSH patch does not exist')
  if (!selectedLayer.patch.writable) throw new Error('selected DSH patch is not writable')
  return { ...selectedLayer, owner: selectedLayer.owner, patch: selectedLayer.patch }
}

/**
 * Map a bounded set of scalar intents to one user-selected writable patch.
 * Every source range is discovered against the same original bytes, then the
 * replacements are applied from right to left to produce one candidate.
 */
export function planDeclaredScalarEdits(options: PlanDeclaredScalarEditsOptions): DshScalarEditPlan {
  if (options.intents.length === 0) throw new Error('at least one scalar edit intent is required')
  const selectedLayer = selectedWritablePatch(options)

  const seenTargets = new Set<string>()
  const previews = options.intents.map(intent => {
    const targetKey = JSON.stringify([intent.entryId, intent.path])
    if (seenTargets.has(targetKey)) {
      throw new Error(`duplicate scalar edit target ${intent.entryId}.${intent.path.join('.')}`)
    }
    seenTargets.add(targetKey)
    const document = parseForEdit(selectedLayer.patch.text)
    const matching = matchingEntryRows(document, intent.entryId)
    const disabledValue = intent.path.length === 1
      && intent.path[0] === 'disabled'
      && typeof intent.value === 'boolean'
      ? intent.value
      : undefined
    if (matching.length === 0 && disabledValue !== undefined) {
      return planYamlDisabledOverride({
        source: selectedLayer.patch.text,
        entryId: intent.entryId,
        value: disabledValue,
      })
    }
    if (matching.length === 1
      && disabledValue !== undefined
      && mapPair(matching[0], 'disabled') === undefined) {
      return planYamlDisabledFieldInsertion({
        source: selectedLayer.patch.text,
        entryId: intent.entryId,
        value: disabledValue,
      })
    }
    return planYamlScalarEdit({
      source: selectedLayer.patch.text,
      entryId: intent.entryId,
      path: intent.path,
      value: intent.value,
    })
  })

  const ordered = previews
    .map((preview, index) => ({ preview, index }))
    .sort((left, right) => left.preview.startOffset - right.preview.startOffset || left.index - right.index)
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]?.preview
    const current = ordered[index]?.preview
    if (previous !== undefined && current !== undefined && current.startOffset < previous.endOffset) {
      throw new Error(`scalar edit ranges overlap at ${current.entryId}.${current.path.join('.')}`)
    }
  }

  let candidateText = selectedLayer.patch.text
  for (const { preview } of [...ordered].reverse()) {
    candidateText = `${candidateText.slice(0, preview.startOffset)}${preview.afterText}${candidateText.slice(preview.endOffset)}`
  }
  parseForEdit(candidateText)

  const summaries = previews.map((preview, index) => {
    const intent = options.intents[index]
    if (intent === undefined) throw new Error('unreachable: scalar intent is missing')
    if (preview.operation === 'append-entry') {
      return `Add ${intent.entryId}.${intent.path.join('.')} override with ${renderScalar(intent.value)}`
    }
    if (preview.operation === 'insert-field') {
      return `Add ${intent.entryId}.${intent.path.join('.')} field with ${renderScalar(intent.value)}`
    }
    return `Set ${intent.entryId}.${intent.path.join('.')} from ${preview.beforeText} to ${preview.afterText}`
  })
  const summary = summaries.join('; ')
  const textChanges = previews.map(preview => ({
    startOffset: preview.startOffset,
    endOffset: preview.endOffset,
    beforeText: preview.beforeText,
    afterText: preview.afterText,
  }))
  const firstIntent = options.intents[0]
  const firstPreview = previews[0]
  const firstTextChange = textChanges[0]
  if (firstIntent === undefined || firstPreview === undefined || firstTextChange === undefined) {
    throw new Error('unreachable: scalar edit batch is empty')
  }

  const plan = createEditPlan({
    id: `set-scalars:${encodeURIComponent(options.sources.profile)}:${options.intents.map(intent => `${encodeURIComponent(intent.entryId)}:${intent.path.map(encodeURIComponent).join('.')}`).join(',')}`,
    targetUri: selectedLayer.patch.uri,
    expectedBytes: selectedLayer.patch.rawBytes,
    candidateBytes: new TextEncoder().encode(candidateText),
    summary,
    textChange: firstTextChange,
    textChanges,
    semanticChange: {
      kind: options.intents.length === 1 ? 'set-declared-scalar' : 'set-declared-scalars',
      changes: options.intents.map((intent, index) => ({
        entryId: intent.entryId,
        path: [...intent.path],
        previousValue: previews[index]?.previousValue,
        nextValue: intent.value,
      })),
    },
  })
  return {
    ...plan,
    targetOwner: selectedLayer.owner,
    intent: { ...firstIntent, path: [...firstIntent.path] },
    intents: options.intents.map(intent => ({ ...intent, path: [...intent.path] })),
    preview: firstPreview,
    previews,
  }
}

/** Map one scalar intent to exactly one user-selected, writable DSH patch document. */
export function planDeclaredScalarEdit(options: PlanDeclaredScalarEditOptions): DshScalarEditPlan {
  return planDeclaredScalarEdits({
    sources: options.sources,
    targetUri: options.targetUri,
    intents: [options.intent],
  })
}
