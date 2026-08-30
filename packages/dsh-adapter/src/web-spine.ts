import {
  ResolvedServiceFactError,
  resolvedEntryActivation,
  selectResolvedServiceFacts,
  type HarnessGraph,
  type ProvenanceStep,
  type ResolvedPluginEntryNode,
  type ResolvedProviderAvailability,
  type ResolvedServiceFactErrorCode,
  type ResolvedServiceFacts,
} from '@dsh-graph-control/harness-graph'
import {
  CURRENT_OFFICIAL_WEB_SPINE_COMPONENTS,
  CURRENT_OFFICIAL_WEB_SPINE_RELATIONS,
  CURRENT_OFFICIAL_WEB_SPINE_SERVICES,
} from './current-official-contracts.ts'

type WebSpineComponentContract = typeof CURRENT_OFFICIAL_WEB_SPINE_COMPONENTS[number]
type WebSpineServiceContract = typeof CURRENT_OFFICIAL_WEB_SPINE_SERVICES[number]
type WebSpineRelationContract = typeof CURRENT_OFFICIAL_WEB_SPINE_RELATIONS[number]

export type CurrentOfficialWebSpineComponentRole = WebSpineComponentContract['role']
export type CurrentOfficialWebSpineComponentSemanticId = WebSpineComponentContract['semanticId']
export type CurrentOfficialWebSpineServiceName = WebSpineServiceContract['name']
export type CurrentOfficialWebSpineServiceSemanticId = WebSpineServiceContract['semanticId']
export type CurrentOfficialWebSpineRelationSemanticId = WebSpineRelationContract['semanticId']
export type CurrentOfficialWebSpineSemanticId =
  | CurrentOfficialWebSpineComponentSemanticId
  | CurrentOfficialWebSpineServiceSemanticId
  | CurrentOfficialWebSpineRelationSemanticId

export type CurrentOfficialWebSpineActivation = Exclude<ResolvedProviderAvailability, 'unknown'>

export interface CurrentOfficialWebSpineComponent {
  readonly semanticId: CurrentOfficialWebSpineComponentSemanticId
  readonly role: CurrentOfficialWebSpineComponentRole
  readonly entryId: WebSpineComponentContract['entryId']
  readonly pluginName: WebSpineComponentContract['pluginName']
  readonly activation: CurrentOfficialWebSpineActivation
  readonly sourceNodeId: string
  readonly provenance: readonly ProvenanceStep[]
}

export interface CurrentOfficialWebSpineService {
  readonly semanticId: CurrentOfficialWebSpineServiceSemanticId
  readonly name: CurrentOfficialWebSpineServiceName
  readonly sourceNodeId: string
  readonly provenance: readonly ProvenanceStep[]
}

export interface CurrentOfficialWebSpineRelation {
  readonly semanticId: CurrentOfficialWebSpineRelationSemanticId
  readonly kind: WebSpineRelationContract['kind']
  readonly evidence: WebSpineRelationContract['evidence']
  readonly service: CurrentOfficialWebSpineServiceName
  readonly fromComponentSemanticId: CurrentOfficialWebSpineComponentSemanticId
  readonly toServiceSemanticId: CurrentOfficialWebSpineServiceSemanticId
  readonly sourceRelationId: string
  readonly sourceComponentNodeId: string
  readonly sourceServiceNodeId: string
  readonly provenance: readonly ProvenanceStep[]
}

export interface CurrentOfficialWebSpineAvailable {
  readonly status: 'available'
  readonly components: readonly CurrentOfficialWebSpineComponent[]
  readonly services: readonly CurrentOfficialWebSpineService[]
  readonly relations: readonly CurrentOfficialWebSpineRelation[]
}

export const CURRENT_OFFICIAL_WEB_SPINE_UNAVAILABLE_REASONS = [
  'malformed-service-facts',
  'entry-missing',
  'entry-identity-mismatch',
  'entry-ambiguous',
  'service-missing',
  'service-ambiguous',
  'relation-missing',
  'relation-ambiguous',
  'activation-unknown',
] as const

export type CurrentOfficialWebSpineUnavailableReason =
  typeof CURRENT_OFFICIAL_WEB_SPINE_UNAVAILABLE_REASONS[number]

export interface CurrentOfficialWebSpineUnavailable {
  readonly status: 'unavailable'
  readonly reason: CurrentOfficialWebSpineUnavailableReason
  readonly subjectSemanticId?: CurrentOfficialWebSpineSemanticId
  readonly sourceFactId?: string
  readonly serviceFactErrorCode?: ResolvedServiceFactErrorCode
}

export type CurrentOfficialWebSpineInspection =
  | CurrentOfficialWebSpineAvailable
  | CurrentOfficialWebSpineUnavailable

function unavailable(
  reason: CurrentOfficialWebSpineUnavailableReason,
  options: {
    subjectSemanticId?: CurrentOfficialWebSpineSemanticId
    sourceFactId?: string
    serviceFactErrorCode?: ResolvedServiceFactErrorCode
  } = {},
): CurrentOfficialWebSpineUnavailable {
  return {
    status: 'unavailable',
    reason,
    ...options,
  }
}

function inspectComponent(
  facts: ResolvedServiceFacts,
  contract: WebSpineComponentContract,
): CurrentOfficialWebSpineComponent | CurrentOfficialWebSpineUnavailable {
  const sameEntryId = facts.entries.filter(entry => entry.attributes.entryId === contract.entryId)
  const samePluginName = facts.entries.filter(entry =>
    entry.kind === 'plugin-entry' && entry.attributes.pluginName === contract.pluginName)
  const related = new Set([...sameEntryId, ...samePluginName])
  const exact = sameEntryId.filter((entry): entry is ResolvedPluginEntryNode =>
    entry.kind === 'plugin-entry' && entry.attributes.pluginName === contract.pluginName)

  if (exact.length > 1 || related.size > 1) {
    return unavailable('entry-ambiguous', { subjectSemanticId: contract.semanticId })
  }
  if (exact.length === 0) {
    return unavailable(related.size === 0 ? 'entry-missing' : 'entry-identity-mismatch', {
      subjectSemanticId: contract.semanticId,
    })
  }

  const source = exact[0]!
  const activation = resolvedEntryActivation(source)
  if (activation === 'unknown') {
    return unavailable('activation-unknown', {
      subjectSemanticId: contract.semanticId,
      sourceFactId: source.id,
    })
  }
  return {
    semanticId: contract.semanticId,
    role: contract.role,
    entryId: contract.entryId,
    pluginName: contract.pluginName,
    activation,
    sourceNodeId: source.id,
    provenance: source.provenance,
  }
}

function inspectService(
  facts: ResolvedServiceFacts,
  contract: WebSpineServiceContract,
): CurrentOfficialWebSpineService | CurrentOfficialWebSpineUnavailable {
  const matches = facts.services.filter(service => service.attributes.name === contract.name)
  if (matches.length === 0) {
    return unavailable('service-missing', { subjectSemanticId: contract.semanticId })
  }
  if (matches.length > 1) {
    return unavailable('service-ambiguous', { subjectSemanticId: contract.semanticId })
  }
  const source = matches[0]!
  return {
    semanticId: contract.semanticId,
    name: contract.name,
    sourceNodeId: source.id,
    provenance: source.provenance,
  }
}

function inspectRelation(
  facts: ResolvedServiceFacts,
  contract: WebSpineRelationContract,
  component: CurrentOfficialWebSpineComponent,
  service: CurrentOfficialWebSpineService,
): CurrentOfficialWebSpineRelation | CurrentOfficialWebSpineUnavailable {
  const endpointRelations = facts.relations.filter(relation =>
    relation.from === component.sourceNodeId
    && relation.to === service.sourceNodeId
    && relation.attributes.service === contract.service)
  const exact = endpointRelations.filter(relation => relation.kind === contract.kind)
    .filter(relation => relation.attributes.evidence === contract.evidence)
  if (exact.length === 0) {
    return unavailable('relation-missing', { subjectSemanticId: contract.semanticId })
  }
  if (exact.length > 1 || endpointRelations.length > 1) {
    return unavailable('relation-ambiguous', { subjectSemanticId: contract.semanticId })
  }
  const source = exact[0]!
  return {
    semanticId: contract.semanticId,
    kind: contract.kind,
    evidence: contract.evidence,
    service: contract.service,
    fromComponentSemanticId: component.semanticId,
    toServiceSemanticId: service.semanticId,
    sourceRelationId: source.id,
    sourceComponentNodeId: component.sourceNodeId,
    sourceServiceNodeId: service.sourceNodeId,
    provenance: source.provenance,
  }
}

/**
 * Prove the bounded Web startup/runtime spine without changing the open graph.
 * Stable semantic ids live only in this disposable typed view; source ids and
 * provenance always lead back to the generic official-derived facts.
 */
export function inspectCurrentOfficialWebSpine(
  graph: HarnessGraph,
): CurrentOfficialWebSpineInspection {
  let facts: ResolvedServiceFacts
  try {
    facts = selectResolvedServiceFacts(graph)
  } catch (error) {
    if (!(error instanceof ResolvedServiceFactError)) throw error
    return unavailable('malformed-service-facts', {
      sourceFactId: error.factId,
      serviceFactErrorCode: error.code,
    })
  }

  const components: CurrentOfficialWebSpineComponent[] = []
  const componentsByEntryId = new Map<string, CurrentOfficialWebSpineComponent>()
  for (const contract of CURRENT_OFFICIAL_WEB_SPINE_COMPONENTS) {
    const inspected = inspectComponent(facts, contract)
    if ('status' in inspected) return inspected
    components.push(inspected)
    componentsByEntryId.set(inspected.entryId, inspected)
  }

  const services: CurrentOfficialWebSpineService[] = []
  const servicesByName = new Map<string, CurrentOfficialWebSpineService>()
  for (const contract of CURRENT_OFFICIAL_WEB_SPINE_SERVICES) {
    const inspected = inspectService(facts, contract)
    if ('status' in inspected) return inspected
    services.push(inspected)
    servicesByName.set(inspected.name, inspected)
  }

  const relations: CurrentOfficialWebSpineRelation[] = []
  for (const contract of CURRENT_OFFICIAL_WEB_SPINE_RELATIONS) {
    const component = componentsByEntryId.get(contract.entryId)
    const service = servicesByName.get(contract.service)
    if (component === undefined || service === undefined) {
      throw new Error('unreachable: a proven Web spine relation endpoint is missing')
    }
    const inspected = inspectRelation(facts, contract, component, service)
    if ('status' in inspected) return inspected
    relations.push(inspected)
  }

  return {
    status: 'available',
    components,
    services,
    relations,
  }
}
