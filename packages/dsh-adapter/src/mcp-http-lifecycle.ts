import { isAlias, isMap, isScalar, isSeq, parseDocument } from 'yaml'
import { createEditPlan } from '@dsh-graph-control/edit-transaction'
import { MCP_STREAMABLE_HTTP_COMPONENT } from './current-official-contracts.ts'
import type { DshProfileSources, ExistingDshSourceDocument } from './profile-sources.ts'
import type { DshScalarEditPlan, SetDeclaredScalarIntent, YamlScalarEditPreview } from './yaml-edit.ts'

const MCP_SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/u
const MAX_MCP_HTTP_URL_LENGTH = 2_048

export interface McpHttpComponentInput {
  serverName: string
  url: string
}

export interface NormalizedMcpHttpComponentInput extends McpHttpComponentInput {
  entryId: string
}

export interface PlanMcpHttpAddOptions extends McpHttpComponentInput {
  sources: DshProfileSources
  targetUri: string
}

export interface DshMcpHttpAddPlan extends DshScalarEditPlan {
  mcpHttpChange: {
    entryId: string
    pluginName: typeof MCP_STREAMABLE_HTTP_COMPONENT.packageName
    serverName: string
    transport: typeof MCP_STREAMABLE_HTTP_COMPONENT.transport
    url: string
    risk: typeof MCP_STREAMABLE_HTTP_COMPONENT.risk
    securityDelta: typeof MCP_STREAMABLE_HTTP_COMPONENT.securityDelta
  }
  mcpHttpMode: 'add-plugin'
}

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
  if (layer?.owner !== 'profile') throw new Error('MCP component changes currently target only the profile patch')
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
  if (isAlias(node)) throw new Error('alias-backed inserted rows make MCP changes ambiguous')
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
    if (isAlias(patch)) throw new Error('top-level aliases make MCP changes ambiguous')
    const directId = scalarString(mapField(patch, 'id'))
    if (directId !== undefined) ids.push(directId)
    const insert = mapField(patch, 'insert')
    if (isSeq(insert)) for (const entry of insert.items) collectIds(entry, ids)
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

export function normalizeMcpHttpComponentInput(input: McpHttpComponentInput): NormalizedMcpHttpComponentInput {
  const serverName = input.serverName.trim()
  if (!MCP_SERVER_NAME.test(serverName)) {
    throw new Error('MCP server name must use 1-32 letters, numbers, underscores, or hyphens')
  }
  const sourceUrl = input.url.trim()
  if (sourceUrl === '' || sourceUrl.length > MAX_MCP_HTTP_URL_LENGTH) {
    throw new Error(`MCP URL must contain at most ${MAX_MCP_HTTP_URL_LENGTH} characters`)
  }
  let parsed: URL
  try {
    parsed = new URL(sourceUrl)
  } catch {
    throw new Error('MCP URL must be an absolute HTTP or HTTPS URL')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('MCP URL must use HTTP or HTTPS')
  }
  if (parsed.username !== '' || parsed.password !== '') {
    throw new Error('MCP URL must not contain embedded credentials')
  }
  if (parsed.hash !== '') throw new Error('MCP URL must not contain a fragment')
  return {
    serverName,
    url: parsed.href,
    entryId: `mcp-${serverName}`,
  }
}

function generatedText(input: NormalizedMcpHttpComponentInput, newline: string): string {
  return [
    '- insert:',
    `    - id: ${JSON.stringify(input.entryId)}`,
    `      name: '${MCP_STREAMABLE_HTTP_COMPONENT.packageName}'`,
    '      config:',
    `        serverName: ${JSON.stringify(input.serverName)}`,
    `        transport: ${MCP_STREAMABLE_HTTP_COMPONENT.transport}`,
    `        url: ${JSON.stringify(input.url)}`,
  ].join(newline)
}

function assertExactGeneratedInsert(
  document: ReturnType<typeof parseDocument>,
  input: NormalizedMcpHttpComponentInput,
): void {
  if (!isSeq(document.contents) || document.contents.flow === true) {
    throw new Error('MCP addition requires a block-style top-level YAML sequence')
  }
  const matches = document.contents.items.flatMap(patch => {
    const insert = mapField(patch, 'insert')
    if (!isSeq(insert)) return []
    return insert.items.flatMap(entry =>
      scalarString(mapField(entry, 'id')) === input.entryId ? [{ patch, insert, entry }] : [])
  })
  if (matches.length !== 1) throw new Error('MCP addition did not produce one unique insert block')
  const match = matches[0]
  if (match === undefined) throw new Error('unreachable: generated MCP insert is missing')
  exactMapKeys(match.patch, ['insert'], 'MCP insert patch')
  if (match.insert.flow === true
    || match.insert.anchor !== undefined
    || match.insert.tag !== undefined
    || match.insert.items.length !== 1) {
    throw new Error('MCP insert must remain a one-entry block sequence')
  }
  exactMapKeys(match.entry, ['id', 'name', 'config'], 'MCP entry')
  const config = mapField(match.entry, 'config')
  exactMapKeys(config, ['serverName', 'transport', 'url'], 'MCP config')
  if (scalarString(mapField(match.entry, 'id')) !== input.entryId
    || scalarString(mapField(match.entry, 'name')) !== MCP_STREAMABLE_HTTP_COMPONENT.packageName
    || scalarString(mapField(config, 'serverName')) !== input.serverName
    || scalarString(mapField(config, 'transport')) !== MCP_STREAMABLE_HTTP_COMPONENT.transport
    || scalarString(mapField(config, 'url')) !== input.url) {
    throw new Error('MCP insert no longer matches the requested HTTP component')
  }
}

/** Append one no-credential Streamable HTTP MCP entry without writing. */
export function planMcpHttpAdd(options: PlanMcpHttpAddOptions): DshMcpHttpAddPlan {
  const input = normalizeMcpHttpComponentInput(options)
  const patch = selectedProfilePatch(options.sources, options.targetUri)
  const document = parseForEdit(patch.text)
  if (!isSeq(document.contents)) throw new Error('DSH patch must contain a top-level YAML sequence')
  if (loaderEntryIds(document).includes(input.entryId)) {
    throw new Error(`MCP entry ${JSON.stringify(input.entryId)} is already declared in the selected profile patch`)
  }
  const newline = insertionNewline(patch.text)
  const rowText = generatedText(input, newline)
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
  assertExactGeneratedInsert(candidate, input)
  const intent: SetDeclaredScalarIntent = {
    kind: 'set-declared-scalar',
    entryId: input.entryId,
    path: ['config', 'url'],
    value: input.url,
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
  const mcpHttpChange: DshMcpHttpAddPlan['mcpHttpChange'] = {
    entryId: input.entryId,
    pluginName: MCP_STREAMABLE_HTTP_COMPONENT.packageName,
    serverName: input.serverName,
    transport: MCP_STREAMABLE_HTTP_COMPONENT.transport,
    url: input.url,
    risk: MCP_STREAMABLE_HTTP_COMPONENT.risk,
    securityDelta: MCP_STREAMABLE_HTTP_COMPONENT.securityDelta,
  }
  const base = createEditPlan({
    id: `add-mcp-http:${encodeURIComponent(options.sources.profile)}:${encodeURIComponent(input.serverName)}`,
    targetUri: patch.uri,
    expectedBytes: patch.rawBytes,
    candidateBytes: new TextEncoder().encode(candidateText),
    summary: `Connect Streamable HTTP MCP server ${input.serverName}`,
    textChange: { startOffset, endOffset, beforeText, afterText },
    semanticChange: {
      kind: 'add-mcp-streamable-http',
      ...mcpHttpChange,
    },
  })
  return {
    ...base,
    targetOwner: 'profile',
    intent,
    intents: [intent],
    preview,
    previews: [preview],
    mcpHttpChange,
    mcpHttpMode: 'add-plugin',
  }
}
