import type {
  GraphEntity,
  GraphPlane,
  GraphRelation,
  HarnessGraph,
  SourceSpan,
} from '@dsh-graph-control/harness-graph'
import { isAlias, isMap, isScalar, isSeq, parseDocument } from 'yaml'
import type { DshInstallation } from './index.ts'
import type {
  DshProfileSources,
  DshSourceDocument,
  DshSourceLayer,
  ExistingDshSourceDocument,
} from './profile-sources.ts'
import {
  CURRENT_OFFICIAL_EXECUTION_WORLD_MEMBERS,
  CURRENT_OFFICIAL_EXECUTION_WORLDS,
  CURRENT_OFFICIAL_FS_PROVIDER_POLICIES,
  CURRENT_OFFICIAL_REQUIRED_SERVICE_CONSUMERS,
  CURRENT_OFFICIAL_SERVICE_PROVIDERS,
} from './current-official-contracts.ts'

export interface GraphProjectionDiagnostic {
  severity: 'warning' | 'error'
  message: string
  uri: string
}

export interface DshConfigEvidence {
  text: string
  mode: 'default' | 'resolved'
  uri?: string
}

export interface BuildProfileHarnessGraphOptions {
  installation: Pick<DshInstallation, 'version' | 'commit'>
  sources: DshProfileSources
  config?: DshConfigEvidence
}

export interface DshHarnessGraphProjection {
  graph: HarnessGraph
  diagnostics: readonly GraphProjectionDiagnostic[]
}

interface MutableGraph {
  nodes: GraphEntity[]
  edges: GraphRelation[]
  diagnostics: GraphProjectionDiagnostic[]
  contributors: Map<string, string[]>
}

interface ResolvedEntryRecord {
  index: number
  nodeId: string
  entryId?: string
  pluginName?: string
  injectNode?: unknown
  providerAvailability: 'active' | 'disabled' | 'unknown'
  provenance: GraphEntity['provenance']
}

const KNOWN_ENTRY_KEYS = new Set([
  'id', 'name', 'config', 'disabled', 'inject', 'children', 'insert', 'remove', 'before', 'after',
])

function encoded(value: string): string {
  return encodeURIComponent(value)
}

function sourceSpan(uri: string, path: readonly (string | number)[], node?: unknown): SourceSpan {
  const range = (node as { range?: readonly number[] } | undefined)?.range
  return {
    uri,
    path,
    ...(range?.[0] === undefined ? {} : { startOffset: range[0] }),
    ...(range?.[2] === undefined && range?.[1] === undefined
      ? {}
      : { endOffset: range[2] ?? range[1] }),
  }
}

function rawNode(node: unknown, text: string): string | undefined {
  const range = (node as { range?: readonly number[] } | undefined)?.range
  const start = range?.[0]
  const end = range?.[2] ?? range?.[1]
  return start === undefined || end === undefined ? undefined : text.slice(start, end)
}

function taggedValue(node: { tag?: string; source?: unknown; value?: unknown }): unknown | undefined {
  if (node.tag === undefined) return undefined
  const tag = node.tag === 'tag:yaml.org,2002:js' ? '!!js' : node.tag
  return {
    symbolic: true,
    tag,
    source: typeof node.source === 'string' ? node.source : String(node.value ?? ''),
  }
}

/** Convert YAML AST to inert graph data. Aliases and all explicit tags remain symbolic. */
function inertYamlValue(node: unknown): unknown {
  if (node === null || node === undefined) return null
  if (isAlias(node)) return { symbolic: true, alias: node.source }
  if (isScalar(node)) return taggedValue(node) ?? node.value
  if (isSeq(node)) return node.items.map(item => inertYamlValue(item))
  if (isMap(node)) {
    const record = Object.create(null) as Record<string, unknown>
    for (const pair of node.items) {
      const keyValue = inertYamlValue(pair.key)
      const key = typeof keyValue === 'string' || typeof keyValue === 'number'
        ? String(keyValue)
        : JSON.stringify(keyValue)
      record[key] = inertYamlValue(pair.value)
    }
    return record
  }
  return { symbolic: true, unsupportedYamlNode: true }
}

function mapField(node: unknown, name: string): unknown {
  if (!isMap(node)) return undefined
  for (const pair of node.items) {
    if (isScalar(pair.key) && pair.key.value === name) return pair.value
  }
  return undefined
}

function scalarString(node: unknown): string | undefined {
  return isScalar(node) && typeof node.value === 'string' ? node.value : undefined
}

function unknownKeys(node: unknown): string[] {
  if (!isMap(node)) return []
  const keys: string[] = []
  for (const pair of node.items) {
    const key = isScalar(pair.key) ? String(pair.key.value) : undefined
    if (key !== undefined && !KNOWN_ENTRY_KEYS.has(key)) keys.push(key)
  }
  return keys
}

function addNode(graph: MutableGraph, node: GraphEntity): void {
  graph.nodes.push(node)
}

function addEdge(
  graph: MutableGraph,
  id: string,
  plane: GraphPlane,
  kind: string,
  from: string,
  to: string,
  attributes: Readonly<Record<string, unknown>> = {},
  provenance: GraphRelation['provenance'] = [],
): void {
  graph.edges.push({ id, plane, kind, from, to, attributes, provenance })
}

function documentNodeId(document: DshSourceDocument, fallback: string): string {
  return `declared:source:${encoded(document.uri)}:${fallback}`
}

function addSourceDocumentNode(
  graph: MutableGraph,
  document: DshSourceDocument,
  fallback: string,
): string {
  const id = documentNodeId(document, fallback)
  if (graph.nodes.some(node => node.id === id)) return id
  addNode(graph, {
    id,
    plane: 'declared',
    kind: 'source-document',
    provenance: [{ kind: 'declared', source: { uri: document.uri } }],
    attributes: {
      uri: document.uri,
      path: document.path,
      role: document.role,
      owner: document.owner,
      writable: document.writable,
      exists: document.exists,
      ...(document.exists
        ? { byteLength: document.byteLength, newline: document.newline }
        : {}),
    },
  })
  return id
}

function contributor(graph: MutableGraph, entryId: string, nodeId: string): void {
  const current = graph.contributors.get(entryId) ?? []
  const previous = current.at(-1)
  if (previous !== undefined) {
    addEdge(
      graph,
      `declared:overrides:${encoded(entryId)}:${current.length}`,
      'declared',
      'overrides',
      previous,
      nodeId,
      { entryId },
    )
  }
  current.push(nodeId)
  graph.contributors.set(entryId, current)
}

function addPluginReference(
  graph: MutableGraph,
  plane: 'declared' | 'resolved',
  entryNodeId: string,
  pluginName: string,
  provenance: GraphEntity['provenance'],
): void {
  const pluginId = `${plane}:plugin:${encoded(pluginName)}`
  if (!graph.nodes.some(node => node.id === pluginId)) {
    addNode(graph, {
      id: pluginId,
      plane,
      kind: 'plugin',
      provenance,
      attributes: { packageName: pluginName },
    })
  }
  addEdge(
    graph,
    `${plane}:declares-plugin:${entryNodeId}`,
    plane,
    'declares-plugin',
    entryNodeId,
    pluginId,
  )
}

function addDeclaredEntry(
  graph: MutableGraph,
  document: ExistingDshSourceDocument,
  layer: DshSourceLayer,
  parentId: string,
  yamlNode: unknown,
  path: readonly (string | number)[],
  suffix: string,
  operation: 'inserted-entry' | 'patch-operation' | 'opaque-row',
): void {
  const entryId = scalarString(mapField(yamlNode, 'id'))
  const pluginName = scalarString(mapField(yamlNode, 'name'))
  const id = `declared:${operation}:${layer.order}:${suffix}`
  const provenance = [{
    kind: operation === 'inserted-entry' ? 'inserted' as const : 'patched' as const,
    source: sourceSpan(document.uri, path, yamlNode),
  }]
  addNode(graph, {
    id,
    plane: 'declared',
    kind: operation === 'inserted-entry'
      ? (pluginName === undefined ? 'entry' : 'plugin-entry')
      : operation,
    provenance,
    attributes: {
      layerOrder: layer.order,
      layerLabel: layer.label,
      ...(entryId === undefined ? {} : { entryId }),
      ...(pluginName === undefined ? {} : { pluginName }),
      unknownKeys: unknownKeys(yamlNode),
      value: inertYamlValue(yamlNode),
      raw: rawNode(yamlNode, document.text),
    },
  })
  addEdge(graph, `declared:contains:${parentId}:${id}`, 'declared', 'contains', parentId, id)
  if (pluginName !== undefined) addPluginReference(graph, 'declared', id, pluginName, provenance)
  if (entryId !== undefined) contributor(graph, entryId, id)
}

function addPatchRows(
  graph: MutableGraph,
  layer: DshSourceLayer,
  layerNodeId: string,
  document: ExistingDshSourceDocument,
): void {
  const parsed = parseDocument(document.text, { keepSourceTokens: true, prettyErrors: false })
  for (const error of parsed.errors) {
    graph.diagnostics.push({ severity: 'error', message: error.message, uri: document.uri })
  }
  for (const warning of parsed.warnings) {
    if (warning.message.includes('Unresolved tag: tag:yaml.org,2002:js')) continue
    graph.diagnostics.push({ severity: 'warning', message: warning.message, uri: document.uri })
  }
  if (parsed.errors.length > 0) return
  if (!isSeq(parsed.contents)) {
    addDeclaredEntry(graph, document, layer, layerNodeId, parsed.contents, [], 'root', 'opaque-row')
    return
  }

  parsed.contents.items.forEach((row, rowIndex) => {
    const insert = mapField(row, 'insert')
    if (isSeq(insert)) {
      const operationId = `declared:insert-operation:${layer.order}:${rowIndex}`
      addNode(graph, {
        id: operationId,
        plane: 'declared',
        kind: 'insert-operation',
        provenance: [{ kind: 'declared', source: sourceSpan(document.uri, [rowIndex], row) }],
        attributes: {
          layerOrder: layer.order,
          insertCount: insert.items.length,
          unknownKeys: unknownKeys(row),
          raw: rawNode(row, document.text),
        },
      })
      addEdge(graph, `declared:contains:${layerNodeId}:${operationId}`, 'declared', 'contains', layerNodeId, operationId)
      insert.items.forEach((entry, entryIndex) => {
        addDeclaredEntry(
          graph,
          document,
          layer,
          operationId,
          entry,
          [rowIndex, 'insert', entryIndex],
          `${rowIndex}:insert:${entryIndex}`,
          'inserted-entry',
        )
      })
      return
    }
    addDeclaredEntry(
      graph,
      document,
      layer,
      layerNodeId,
      row,
      [rowIndex],
      String(rowIndex),
      scalarString(mapField(row, 'id')) === undefined ? 'opaque-row' : 'patch-operation',
    )
  })
}

function addDeclaredPlane(graph: MutableGraph, sources: DshProfileSources): void {
  const profileId = `declared:profile:${encoded(sources.profile)}`
  addNode(graph, {
    id: profileId,
    plane: 'declared',
    kind: 'profile',
    provenance: [{ kind: 'declared', source: { uri: sources.manifest.uri } }],
    attributes: {
      name: sources.profile,
      directory: sources.profileDir,
      bundles: [...sources.bundleNames],
    },
  })

  const profileManifestId = addSourceDocumentNode(graph, sources.manifest, 'profile-manifest')
  addEdge(graph, `declared:contains:${profileId}:${profileManifestId}`, 'declared', 'contains', profileId, profileManifestId)

  for (const layer of sources.layers) {
    const layerId = `declared:layer:${layer.order}:${encoded(layer.label)}`
    addNode(graph, {
      id: layerId,
      plane: 'declared',
      kind: 'layer',
      provenance: [{ kind: 'declared', source: { uri: layer.patch.uri } }],
      attributes: {
        order: layer.order,
        owner: layer.owner,
        label: layer.label,
        ...(layer.packageName === undefined ? {} : { packageName: layer.packageName }),
      },
    })
    addEdge(graph, `declared:includes:${profileId}:${layerId}`, 'declared', 'includes', profileId, layerId)
    if (layer.manifest !== undefined) {
      const manifestId = addSourceDocumentNode(graph, layer.manifest, `bundle-manifest:${layer.order}`)
      addEdge(graph, `declared:contains:${layerId}:${manifestId}`, 'declared', 'contains', layerId, manifestId)
    }
    const patchId = addSourceDocumentNode(graph, layer.patch, `patch:${layer.order}`)
    addEdge(graph, `declared:contains:${layerId}:${patchId}`, 'declared', 'contains', layerId, patchId)
    if (layer.patch.exists) addPatchRows(graph, layer, layerId, layer.patch)
  }
}

function requiredInjection(value: unknown): boolean {
  const required = mapField(value, 'required')
  return !isScalar(required) || required.value !== false
}

function injectedServices(injectNode: unknown): { name: string; required: boolean; sourceNode: unknown }[] {
  if (isSeq(injectNode)) {
    return injectNode.items.flatMap(item => {
      const name = scalarString(item)
      return name === undefined ? [] : [{ name, required: true, sourceNode: item }]
    })
  }
  if (isMap(injectNode)) {
    return injectNode.items.flatMap(pair => {
      const name = scalarString(pair.key)
      return name === undefined
        ? []
        : [{ name, required: requiredInjection(pair.value), sourceNode: pair }]
    })
  }
  return []
}

function providerAvailability(disabledNode: unknown): ResolvedEntryRecord['providerAvailability'] {
  if (disabledNode === undefined) return 'active'
  if (!isScalar(disabledNode) || disabledNode.tag !== undefined || typeof disabledNode.value !== 'boolean') {
    return 'unknown'
  }
  return disabledNode.value ? 'disabled' : 'active'
}

function serviceNode(graph: MutableGraph, name: string, provenance: GraphEntity['provenance']): string {
  const id = `resolved:service:${encoded(name)}`
  if (!graph.nodes.some(node => node.id === id)) {
    addNode(graph, {
      id,
      plane: 'resolved',
      kind: 'service',
      provenance,
      attributes: { name },
    })
  }
  return id
}

function addResolvedExecutionWorldEdges(
  graph: MutableGraph,
  records: readonly ResolvedEntryRecord[],
): void {
  for (const world of CURRENT_OFFICIAL_EXECUTION_WORLDS) {
    const members = CURRENT_OFFICIAL_EXECUTION_WORLD_MEMBERS.flatMap(member => {
      if (member.worldId !== world.id) return []
      const record = records.find(candidate =>
        candidate.entryId === member.entryId && candidate.pluginName === member.pluginName)
      return record === undefined ? [] : [{ member, record }]
    })
    if (members.length === 0) continue

    const worldId = `resolved:execution-world:${encoded(world.id)}`
    const provenance = members[0]!.record.provenance.map(step => ({
      ...step,
      note: `current official execution-world contract: ${world.label}`,
    }))
    addNode(graph, {
      id: worldId,
      plane: 'resolved',
      kind: 'execution-world',
      provenance,
      attributes: {
        name: world.id,
        label: world.label,
        locality: world.locality,
        summary: world.summary,
        sourcePaths: [...world.sourcePaths],
        evidence: 'current-official-source',
      },
    })

    for (const { member, record } of members) {
      const memberProvenance = record.provenance.map(step => ({ ...step, note: member.note }))
      addEdge(
        graph,
        `resolved:belongs-to-world:${member.entryId}:${world.id}`,
        'resolved',
        'belongs-to-world',
        record.nodeId,
        worldId,
        {
          world: world.id,
          capability: member.capability,
          evidence: 'current-official-source',
          providerAvailability: record.providerAvailability,
        },
        memberProvenance,
      )
    }
  }
}

/**
 * Extract declared Loader injections plus the one current official provider
 * contract needed by the first dependency flow. Exact entry/plugin matching
 * intentionally fails closed when upstream renames either side.
 */
function addResolvedServiceEdges(
  graph: MutableGraph,
  records: readonly ResolvedEntryRecord[],
  uri: string,
): void {
  for (const record of records) {
    for (const injection of injectedServices(record.injectNode)) {
      const provenance = [{
        kind: 'declared' as const,
        source: sourceSpan(uri, [record.index, 'inject'], injection.sourceNode),
        note: 'official resolved Loader injection',
      }]
      const serviceId = serviceNode(graph, injection.name, provenance)
      addEdge(
        graph,
        `resolved:${injection.required ? 'requires' : 'optionally-uses'}:${record.nodeId}:${encoded(injection.name)}`,
        'resolved',
        injection.required ? 'requires-service' : 'optionally-uses-service',
        record.nodeId,
        serviceId,
        { service: injection.name, evidence: 'resolved-inject' },
        provenance,
      )
    }
  }

  for (const contract of CURRENT_OFFICIAL_SERVICE_PROVIDERS) {
    const provider = records.find(record =>
      record.entryId === contract.entryId && record.pluginName === contract.pluginName)
    if (provider === undefined) continue
    const provenance = provider.provenance.map(step => ({ ...step, note: contract.note }))
    const serviceId = serviceNode(graph, contract.service, provenance)
    const policy = CURRENT_OFFICIAL_FS_PROVIDER_POLICIES.find(candidate =>
      candidate.entryId === contract.entryId && candidate.pluginName === contract.pluginName)
    addEdge(
      graph,
      `resolved:provides:${contract.entryId}:${contract.service}`,
      'resolved',
      'provides-service',
      provider.nodeId,
      serviceId,
      {
        service: contract.service,
        evidence: 'current-official-contract',
        providerAvailability: provider.providerAvailability,
        ...(policy === undefined
          ? {}
          : {
              providerPolicy: {
                id: policy.id,
                label: policy.label,
                executionWorld: policy.executionWorld,
                confinement: policy.confinement,
                summary: policy.summary,
                sourcePaths: [...policy.sourcePaths],
                evidence: 'current-official-source',
              },
            }),
      },
      provenance,
    )
  }
  for (const contract of CURRENT_OFFICIAL_REQUIRED_SERVICE_CONSUMERS) {
    const consumer = records.find(record =>
      record.entryId === contract.entryId && record.pluginName === contract.pluginName)
    if (consumer === undefined) continue
    const alreadyDeclared = graph.edges.some(edge =>
      edge.kind === 'requires-service'
      && edge.from === consumer.nodeId
      && edge.attributes.service === contract.service)
    if (alreadyDeclared) continue
    const provenance = consumer.provenance.map(step => ({ ...step, note: contract.note }))
    const serviceId = serviceNode(graph, contract.service, provenance)
    addEdge(
      graph,
      `resolved:requires-contract:${contract.entryId}:${contract.service}`,
      'resolved',
      'requires-service',
      consumer.nodeId,
      serviceId,
      { service: contract.service, evidence: 'current-official-contract' },
      provenance,
    )
  }
  addResolvedExecutionWorldEdges(graph, records)
}

function addResolvedPlane(graph: MutableGraph, profile: string, config: DshConfigEvidence): void {
  const uri = config.uri ?? `dsh://profile/${encoded(profile)}/${config.mode}-config`
  const sourceId = `resolved:source:${config.mode}`
  addNode(graph, {
    id: sourceId,
    plane: 'resolved',
    kind: 'official-config-dump',
    provenance: [{ kind: 'derived', source: { uri }, note: `official DSH --dump-${config.mode}-config` }],
    attributes: { mode: config.mode, byteLength: Buffer.byteLength(config.text, 'utf8') },
  })
  const parsed = parseDocument(config.text, { keepSourceTokens: true, prettyErrors: false })
  for (const error of parsed.errors) {
    graph.diagnostics.push({ severity: 'error', message: error.message, uri })
  }
  for (const warning of parsed.warnings) {
    if (warning.message.includes('Unresolved tag: tag:yaml.org,2002:js')) continue
    graph.diagnostics.push({ severity: 'warning', message: warning.message, uri })
  }
  if (parsed.errors.length > 0 || !isSeq(parsed.contents)) return

  const records: ResolvedEntryRecord[] = []
  parsed.contents.items.forEach((entry, index) => {
    const entryId = scalarString(mapField(entry, 'id'))
    const pluginName = scalarString(mapField(entry, 'name'))
    const nodeId = `resolved:entry:${entryId === undefined ? `index-${index}` : encoded(entryId)}:${index}`
    const provenance = [{
      kind: 'derived' as const,
      source: sourceSpan(uri, [index], entry),
      note: 'composed by official DSH',
    }]
    addNode(graph, {
      id: nodeId,
      plane: 'resolved',
      kind: pluginName === undefined ? 'entry' : 'plugin-entry',
      provenance,
      attributes: {
        ...(entryId === undefined ? {} : { entryId }),
        ...(pluginName === undefined ? {} : { pluginName }),
        unknownKeys: unknownKeys(entry),
        value: inertYamlValue(entry),
        raw: rawNode(entry, config.text),
      },
    })
    addEdge(graph, `resolved:contains:${sourceId}:${nodeId}`, 'resolved', 'contains', sourceId, nodeId)
    if (pluginName !== undefined) addPluginReference(graph, 'resolved', nodeId, pluginName, provenance)
    records.push({
      index,
      nodeId,
      ...(entryId === undefined ? {} : { entryId }),
      ...(pluginName === undefined ? {} : { pluginName }),
      injectNode: mapField(entry, 'inject'),
      providerAvailability: providerAvailability(mapField(entry, 'disabled')),
      provenance,
    })
    if (entryId !== undefined) {
      for (const [contributorIndex, contributorId] of (graph.contributors.get(entryId) ?? []).entries()) {
        addEdge(
          graph,
          `resolved:resolves-to:${encoded(entryId)}:${contributorIndex}`,
          'resolved',
          'resolves-to',
          contributorId,
          nodeId,
          { entryId },
        )
      }
    }
  })
  addResolvedServiceEdges(graph, records, uri)
}

/** Build declared and, when supplied, official-resolved planes without evaluating YAML expressions. */
export function buildProfileHarnessGraph(options: BuildProfileHarnessGraphOptions): DshHarnessGraphProjection {
  const mutable: MutableGraph = {
    nodes: [],
    edges: [],
    diagnostics: [],
    contributors: new Map(),
  }
  addDeclaredPlane(mutable, options.sources)
  if (options.config !== undefined) addResolvedPlane(mutable, options.sources.profile, options.config)
  return {
    graph: {
      source: {
        profile: options.sources.profile,
        dshVersion: options.installation.version,
        ...(options.installation.commit === undefined ? {} : { dshCommit: options.installation.commit }),
      },
      nodes: mutable.nodes,
      edges: mutable.edges,
    },
    diagnostics: mutable.diagnostics,
  }
}
