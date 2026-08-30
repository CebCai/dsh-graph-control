export type GraphPlane = 'declared' | 'resolved' | 'observed'

export interface SourceSpan {
  uri: string
  startOffset?: number
  endOffset?: number
  path?: readonly (string | number)[]
}

export interface ProvenanceStep {
  kind: 'declared' | 'inserted' | 'patched' | 'inherited' | 'defaulted' | 'derived' | 'observed'
  source?: SourceSpan
  note?: string
}

export interface GraphEntity<
  Plane extends GraphPlane = GraphPlane,
  Kind extends string = string,
  Attributes extends object = Readonly<Record<string, unknown>>,
> {
  id: string
  plane: Plane
  kind: Kind
  provenance: readonly ProvenanceStep[]
  attributes: Attributes
}

export interface GraphRelation<
  Plane extends GraphPlane = GraphPlane,
  Kind extends string = string,
  Attributes extends object = Readonly<Record<string, unknown>>,
> extends GraphEntity<Plane, Kind, Attributes> {
  from: string
  to: string
}

export type ResolvedProviderAvailability = 'active' | 'disabled' | 'unknown'

export type ResolvedServiceEvidence = 'resolved-inject' | 'current-official-contract'

export interface ResolvedProviderPolicy {
  readonly id: string
  readonly label: string
  readonly executionWorld: string
  readonly confinement: string
  readonly summary: string
  readonly sourcePaths: readonly string[]
  readonly evidence: 'current-official-source'
}

export interface ResolvedEntryAttributes extends Readonly<Record<string, unknown>> {
  readonly entryId?: string
  readonly value: unknown
  readonly unknownKeys: readonly string[]
  readonly raw?: string
}

export interface ResolvedPlainEntryAttributes extends ResolvedEntryAttributes {
  readonly pluginName?: never
}

export interface ResolvedPluginEntryAttributes extends ResolvedEntryAttributes {
  readonly pluginName: string
}

export type ResolvedPlainEntryNode = GraphEntity<
  'resolved',
  'entry',
  ResolvedPlainEntryAttributes
>

export type ResolvedPluginEntryNode = GraphEntity<
  'resolved',
  'plugin-entry',
  ResolvedPluginEntryAttributes
>

export type ResolvedEntryNode = ResolvedPlainEntryNode | ResolvedPluginEntryNode

export interface ResolvedServiceAttributes extends Readonly<Record<string, unknown>> {
  readonly name: string
}

export type ResolvedServiceNode = GraphEntity<
  'resolved',
  'service',
  ResolvedServiceAttributes
>

export interface ResolvedProvidesServiceAttributes extends Readonly<Record<string, unknown>> {
  readonly service: string
  readonly evidence: 'current-official-contract'
  readonly providerAvailability: ResolvedProviderAvailability
  readonly providerPolicy?: ResolvedProviderPolicy
}

export interface ResolvedConsumesServiceAttributes extends Readonly<Record<string, unknown>> {
  readonly service: string
  readonly evidence: ResolvedServiceEvidence
}

export type ResolvedProvidesServiceRelation = GraphRelation<
  'resolved',
  'provides-service',
  ResolvedProvidesServiceAttributes
>

export type ResolvedRequiresServiceRelation = GraphRelation<
  'resolved',
  'requires-service',
  ResolvedConsumesServiceAttributes
>

export type ResolvedOptionallyUsesServiceRelation = GraphRelation<
  'resolved',
  'optionally-uses-service',
  ResolvedConsumesServiceAttributes
>

export type ResolvedServiceRelation =
  | ResolvedProvidesServiceRelation
  | ResolvedRequiresServiceRelation
  | ResolvedOptionallyUsesServiceRelation

export const RESOLVED_SERVICE_FACT_ERROR_CODES = [
  'MALFORMED_ENTRY',
  'MALFORMED_SERVICE',
  'MALFORMED_RELATION',
  'DUPLICATE_NODE_ID',
  'DUPLICATE_RELATION_ID',
  'INVALID_RELATION_SOURCE',
  'INVALID_RELATION_TARGET',
  'SERVICE_NAME_MISMATCH',
  'PROVIDER_AVAILABILITY_MISMATCH',
] as const

export type ResolvedServiceFactErrorCode = typeof RESOLVED_SERVICE_FACT_ERROR_CODES[number]

export class ResolvedServiceFactError extends Error {
  readonly code: ResolvedServiceFactErrorCode
  readonly factId: string

  constructor(code: ResolvedServiceFactErrorCode, factId: string, detail: string) {
    super(detail)
    this.name = 'ResolvedServiceFactError'
    this.code = code
    this.factId = factId
  }
}

export interface ResolvedServiceFacts {
  readonly entries: readonly ResolvedEntryNode[]
  readonly services: readonly ResolvedServiceNode[]
  readonly relations: readonly ResolvedServiceRelation[]
  readonly provides: readonly ResolvedProvidesServiceRelation[]
  readonly requires: readonly ResolvedRequiresServiceRelation[]
  readonly optionallyUses: readonly ResolvedOptionallyUsesServiceRelation[]
  readonly entriesByNodeId: ReadonlyMap<string, ResolvedEntryNode>
  readonly servicesByNodeId: ReadonlyMap<string, ResolvedServiceNode>
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function hasEntityEnvelope(value: GraphEntity): boolean {
  return typeof value.id === 'string'
    && value.id.length > 0
    && Array.isArray(value.provenance)
    && isRecord(value.attributes)
}

function hasRelationEnvelope(value: GraphRelation): boolean {
  return hasEntityEnvelope(value)
    && typeof value.from === 'string'
    && value.from.length > 0
    && typeof value.to === 'string'
    && value.to.length > 0
}

function hasResolvedEntryAttributes(
  attributes: Readonly<Record<string, unknown>>,
): boolean {
  return Object.hasOwn(attributes, 'value')
    && isStringArray(attributes.unknownKeys)
    && (attributes.entryId === undefined || typeof attributes.entryId === 'string')
    && (attributes.raw === undefined || typeof attributes.raw === 'string')
}

export function isResolvedEntryNode(node: GraphEntity): node is ResolvedEntryNode {
  if (node.plane !== 'resolved'
    || (node.kind !== 'entry' && node.kind !== 'plugin-entry')
    || !hasEntityEnvelope(node)
    || !hasResolvedEntryAttributes(node.attributes)) return false
  return node.kind === 'plugin-entry'
    ? typeof node.attributes.pluginName === 'string' && node.attributes.pluginName.length > 0
    : node.attributes.pluginName === undefined
}

export function isResolvedPluginEntryNode(node: GraphEntity): node is ResolvedPluginEntryNode {
  return node.kind === 'plugin-entry' && isResolvedEntryNode(node)
}

export function isResolvedServiceNode(node: GraphEntity): node is ResolvedServiceNode {
  return node.plane === 'resolved'
    && node.kind === 'service'
    && hasEntityEnvelope(node)
    && typeof node.attributes.name === 'string'
    && node.attributes.name.length > 0
}

function isResolvedProviderAvailability(value: unknown): value is ResolvedProviderAvailability {
  return value === 'active' || value === 'disabled' || value === 'unknown'
}

function isResolvedServiceEvidence(value: unknown): value is ResolvedServiceEvidence {
  return value === 'resolved-inject' || value === 'current-official-contract'
}

function isResolvedProviderPolicy(value: unknown): value is ResolvedProviderPolicy {
  if (!isRecord(value)) return false
  return typeof value.id === 'string'
    && typeof value.label === 'string'
    && typeof value.executionWorld === 'string'
    && typeof value.confinement === 'string'
    && typeof value.summary === 'string'
    && isStringArray(value.sourcePaths)
    && value.evidence === 'current-official-source'
}

function hasServiceName(attributes: Readonly<Record<string, unknown>>): boolean {
  return typeof attributes.service === 'string' && attributes.service.length > 0
}

export function isResolvedProvidesServiceRelation(
  relation: GraphRelation,
): relation is ResolvedProvidesServiceRelation {
  if (relation.plane !== 'resolved'
    || relation.kind !== 'provides-service'
    || !hasRelationEnvelope(relation)
    || !hasServiceName(relation.attributes)
    || relation.attributes.evidence !== 'current-official-contract'
    || !isResolvedProviderAvailability(relation.attributes.providerAvailability)) return false
  const policy = relation.attributes.providerPolicy
  return policy === undefined || isResolvedProviderPolicy(policy)
}

export function isResolvedRequiresServiceRelation(
  relation: GraphRelation,
): relation is ResolvedRequiresServiceRelation {
  return relation.plane === 'resolved'
    && relation.kind === 'requires-service'
    && hasRelationEnvelope(relation)
    && hasServiceName(relation.attributes)
    && isResolvedServiceEvidence(relation.attributes.evidence)
}

export function isResolvedOptionallyUsesServiceRelation(
  relation: GraphRelation,
): relation is ResolvedOptionallyUsesServiceRelation {
  return relation.plane === 'resolved'
    && relation.kind === 'optionally-uses-service'
    && hasRelationEnvelope(relation)
    && hasServiceName(relation.attributes)
    && isResolvedServiceEvidence(relation.attributes.evidence)
}

export function isResolvedServiceRelation(
  relation: GraphRelation,
): relation is ResolvedServiceRelation {
  return isResolvedProvidesServiceRelation(relation)
    || isResolvedRequiresServiceRelation(relation)
    || isResolvedOptionallyUsesServiceRelation(relation)
}

/** Interpret only the inert resolved `disabled` value; never evaluate expressions. */
export function resolvedEntryActivation(node: ResolvedEntryNode): ResolvedProviderAvailability {
  const value = node.attributes.value
  if (!isRecord(value)) return 'unknown'
  if (!Object.hasOwn(value, 'disabled')) return 'active'
  if (value.disabled === true) return 'disabled'
  if (value.disabled === false) return 'active'
  return 'unknown'
}

const SERVICE_RELATION_KINDS = new Set([
  'provides-service',
  'requires-service',
  'optionally-uses-service',
])

function fail(
  code: ResolvedServiceFactErrorCode,
  factId: string,
  detail: string,
): never {
  throw new ResolvedServiceFactError(code, factId, detail)
}

/**
 * Select and validate the bounded resolved-service vocabulary. Unknown graph
 * kinds remain in the open HarnessGraph envelope and are deliberately ignored.
 */
export function selectResolvedServiceFacts(graph: HarnessGraph): ResolvedServiceFacts {
  const entries: ResolvedEntryNode[] = []
  const services: ResolvedServiceNode[] = []
  const entriesByNodeId = new Map<string, ResolvedEntryNode>()
  const servicesByNodeId = new Map<string, ResolvedServiceNode>()

  for (const node of graph.nodes) {
    if (node.plane === 'resolved' && (node.kind === 'entry' || node.kind === 'plugin-entry')) {
      if (!isResolvedEntryNode(node)) {
        fail('MALFORMED_ENTRY', node.id, 'resolved entry fact has invalid required attributes')
      }
      if (entriesByNodeId.has(node.id) || servicesByNodeId.has(node.id)) {
        fail('DUPLICATE_NODE_ID', node.id, 'resolved service vocabulary contains a duplicate node id')
      }
      entries.push(node)
      entriesByNodeId.set(node.id, node)
      continue
    }
    if (node.kind === 'service') {
      if (!isResolvedServiceNode(node)) {
        fail('MALFORMED_SERVICE', node.id, 'resolved service fact has an invalid plane or required attributes')
      }
      if (entriesByNodeId.has(node.id) || servicesByNodeId.has(node.id)) {
        fail('DUPLICATE_NODE_ID', node.id, 'resolved service vocabulary contains a duplicate node id')
      }
      services.push(node)
      servicesByNodeId.set(node.id, node)
    }
  }

  const provides: ResolvedProvidesServiceRelation[] = []
  const requires: ResolvedRequiresServiceRelation[] = []
  const optionallyUses: ResolvedOptionallyUsesServiceRelation[] = []
  const relations: ResolvedServiceRelation[] = []
  const relationIds = new Set<string>()

  for (const relation of graph.edges) {
    if (!SERVICE_RELATION_KINDS.has(relation.kind)) continue
    if (!isResolvedServiceRelation(relation)) {
      fail('MALFORMED_RELATION', relation.id, 'resolved service relation has an invalid plane or required attributes')
    }
    if (relationIds.has(relation.id)) {
      fail('DUPLICATE_RELATION_ID', relation.id, 'resolved service vocabulary contains a duplicate relation id')
    }
    relationIds.add(relation.id)

    const sourceMatches = graph.nodes.filter(node => node.id === relation.from)
    const source = entriesByNodeId.get(relation.from)
    if (sourceMatches.length !== 1 || source === undefined) {
      fail('INVALID_RELATION_SOURCE', relation.id, 'resolved service relation source is not one unambiguous resolved entry')
    }
    if (relation.kind === 'provides-service' && !isResolvedPluginEntryNode(source)) {
      fail('INVALID_RELATION_SOURCE', relation.id, 'resolved service provider source is not a plugin entry')
    }

    const targetMatches = graph.nodes.filter(node => node.id === relation.to)
    const target = servicesByNodeId.get(relation.to)
    if (targetMatches.length !== 1 || target === undefined) {
      fail('INVALID_RELATION_TARGET', relation.id, 'resolved service relation target is not one unambiguous resolved service')
    }
    if (relation.attributes.service !== target.attributes.name) {
      fail('SERVICE_NAME_MISMATCH', relation.id, 'resolved service relation name does not match its target service')
    }
    if (relation.kind === 'provides-service'
      && relation.attributes.providerAvailability !== resolvedEntryActivation(source)) {
      fail('PROVIDER_AVAILABILITY_MISMATCH', relation.id, 'resolved provider availability does not match its inert disabled value')
    }

    if (relation.kind === 'provides-service') provides.push(relation)
    else if (relation.kind === 'requires-service') requires.push(relation)
    else optionallyUses.push(relation)
    relations.push(relation)
  }

  return {
    entries,
    services,
    relations,
    provides,
    requires,
    optionallyUses,
    entriesByNodeId,
    servicesByNodeId,
  }
}

export interface HarnessGraph {
  source: {
    profile: string
    dshVersion: string
    dshCommit?: string
  }
  nodes: readonly GraphEntity[]
  edges: readonly GraphRelation[]
}
