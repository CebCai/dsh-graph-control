import {
  resolvedEntryActivation,
  selectResolvedServiceFacts,
  type HarnessGraph,
  type ResolvedEntryNode,
  type ResolvedProviderAvailability,
  type ResolvedServiceFacts,
} from '@dsh-graph-control/harness-graph'

// Keep consumers on this package's declared dependency boundary while exposing
// the typed activation/fact vocabulary used by higher-level edit inspection.
export { resolvedEntryActivation, selectResolvedServiceFacts }
export type { ResolvedProviderAvailability }

export type DiagnosticSeverity = 'info' | 'warning' | 'error'

export interface ConstraintDiagnostic {
  code: string
  severity: DiagnosticSeverity
  message: string
  entityIds: readonly string[]
  evidenceEdgeIds: readonly string[]
  repairCandidateIds: readonly string[]
  confidence: 'authoritative' | 'declared' | 'inferred'
}

export interface RepairCandidate {
  id: string
  label: string
  risk: 'safe' | 'review' | 'dangerous'
  explanation: string
  affectedEntityIds: readonly string[]
  followUpIntents: readonly {
    kind: 'set-declared-scalar'
    entryId: string
    path: readonly string[]
    value: boolean
  }[]
  supportedByCurrentWriter: boolean
}

export interface DependencyImpact {
  diagnostics: readonly ConstraintDiagnostic[]
  repairs: readonly RepairCandidate[]
}

export interface AnalyzeProviderReplacementOptions {
  service: string
  currentEntryId: string
  currentPluginName: string
  replacementEntryId: string
  replacementPluginName: string
  requiredConsumerEntryIds: readonly string[]
  risk: 'safe' | 'review' | 'dangerous'
  executionWorldDelta: string
  securityDelta: string
}

export interface ProviderReplacementImpact {
  service: string
  currentProviderNodeId: string
  currentEntryId: string
  currentPluginName: string
  replacementEntryId: string
  replacementPluginName: string
  requiredConsumerEntryIds: readonly string[]
  evidenceEdgeIds: readonly string[]
  confidence: 'authoritative'
  risk: 'safe' | 'review' | 'dangerous'
  executionWorldDelta: string
  securityDelta: string
}

export interface ProviderSwitchImpact extends ProviderReplacementImpact {
  replacementProviderNodeId: string
}

export interface AnalyzeDisableEntryOptions {
  /** Entry ids that the same proposed edit will also disable. */
  proposedDisabledEntryIds?: readonly string[]
}

function entryId(node: ResolvedEntryNode): string {
  const id = node.attributes.entryId
  if (id === undefined || id.length === 0) {
    throw new Error(`resolved service entry node ${JSON.stringify(node.id)} has no entry id`)
  }
  return id
}

function resolvedEntryNode(facts: ResolvedServiceFacts, targetEntryId: string): ResolvedEntryNode {
  const matches = facts.entries.filter(node => node.attributes.entryId === targetEntryId)
  if (matches.length === 0) throw new Error(`resolved entry ${JSON.stringify(targetEntryId)} was not found`)
  if (matches.length > 1) throw new Error(`resolved entry ${JSON.stringify(targetEntryId)} is ambiguous`)
  const node = matches[0]
  if (node === undefined) throw new Error('unreachable: resolved entry lookup failed')
  return node
}

function activationWithProposal(
  node: ResolvedEntryNode,
  proposedDisabledEntryIds: ReadonlySet<string>,
): ResolvedProviderAvailability {
  return proposedDisabledEntryIds.has(entryId(node)) ? 'disabled' : resolvedEntryActivation(node)
}

function requireActiveProvider(node: ResolvedEntryNode): void {
  const activation = resolvedEntryActivation(node)
  if (activation === 'disabled') {
    throw new Error(`current provider ${JSON.stringify(entryId(node))} is disabled`)
  }
  if (activation !== 'active') {
    throw new Error(`current provider ${JSON.stringify(entryId(node))} activation is unknown`)
  }
}

function computeDisableClosureFromFacts(
  facts: ResolvedServiceFacts,
  entryIds: readonly string[],
): readonly string[] {
  if (entryIds.length === 0) return []
  const disabled = new Set<string>()
  const queue: string[] = []
  for (const id of entryIds) {
    resolvedEntryNode(facts, id)
    if (!disabled.has(id)) {
      disabled.add(id)
      queue.push(id)
    }
  }
  for (let index = 0; index < queue.length; index += 1) {
    const providerEntryId = queue[index]
    if (providerEntryId === undefined) continue
    const provider = resolvedEntryNode(facts, providerEntryId)
    for (const provides of facts.provides.filter(edge => edge.from === provider.id)) {
      const alternateProviderRemains = facts.provides.some(edge => {
        if (edge.to !== provides.to || edge.from === provider.id) return false
        const alternate = facts.entriesByNodeId.get(edge.from)
        return alternate !== undefined && activationWithProposal(alternate, disabled) === 'active'
      })
      if (alternateProviderRemains) continue
      for (const requires of facts.requires.filter(edge => edge.to === provides.to)) {
        const consumerNode = facts.entriesByNodeId.get(requires.from)
        if (consumerNode === undefined) throw new Error('unreachable: required service consumer is missing')
        if (activationWithProposal(consumerNode, disabled) === 'disabled') continue
        const consumer = entryId(consumerNode)
        if (!disabled.has(consumer)) {
          disabled.add(consumer)
          queue.push(consumer)
        }
      }
    }
  }
  return [...disabled]
}

/** Follow explicit provider -> required consumer edges until disabling reaches a fixed point. */
export function computeDisableClosure(
  graph: HarnessGraph,
  entryIds: readonly string[],
): readonly string[] {
  return computeDisableClosureFromFacts(selectResolvedServiceFacts(graph), entryIds)
}

/**
 * Analyze disabling one resolved entry using only explicit service edges.
 * Unknown providers/consumers are not invented; another known provider keeps
 * the service satisfied and suppresses the missing-service diagnostic.
 */
export function analyzeDisableEntry(
  graph: HarnessGraph,
  targetEntryId: string,
  options: AnalyzeDisableEntryOptions = {},
): DependencyImpact {
  const facts = selectResolvedServiceFacts(graph)
  const proposedDisabled = new Set(options.proposedDisabledEntryIds ?? [])
  const provider = resolvedEntryNode(facts, targetEntryId)

  const diagnostics: ConstraintDiagnostic[] = []
  const repairs: RepairCandidate[] = []
  for (const provides of facts.provides.filter(edge => edge.from === provider.id)) {
    requireActiveProvider(provider)
    const alternateProviderRemains = facts.provides.some(edge => {
      if (edge.to !== provides.to || edge.from === provider.id) return false
      const alternate = facts.entriesByNodeId.get(edge.from)
      return alternate !== undefined && activationWithProposal(alternate, proposedDisabled) === 'active'
    })
    if (alternateProviderRemains) continue
    const consumers = facts.requires.filter(edge => {
      if (edge.to !== provides.to) return false
      const consumer = facts.entriesByNodeId.get(edge.from)
      if (consumer === undefined) throw new Error('unreachable: required service consumer is missing')
      return activationWithProposal(consumer, proposedDisabled) !== 'disabled'
    })
    if (consumers.length === 0) continue

    const serviceNode = facts.servicesByNodeId.get(provides.to)
    if (serviceNode === undefined) throw new Error('unreachable: provided service is missing')
    const serviceName = serviceNode.attributes.name
    const consumerEntryIds = consumers.map(edge => {
      const consumer = facts.entriesByNodeId.get(edge.from)
      if (consumer === undefined) throw new Error('unreachable: required service consumer is missing')
      return entryId(consumer)
    })
    const suffix = encodeURIComponent(serviceName)
    const keepId = `keep-provider:${suffix}`
    const disableConsumersId = `disable-consumers:${suffix}`
    const draftId = `leave-unresolved:${suffix}`
    const closureEntryIds = computeDisableClosureFromFacts(facts, [targetEntryId, ...proposedDisabled])
    const followUpEntryIds = closureEntryIds.filter(id => id !== targetEntryId)
    const affectedClosureNodeIds = followUpEntryIds.map(id => resolvedEntryNode(facts, id).id)
    diagnostics.push({
      code: 'MISSING_REQUIRED_SERVICE',
      severity: 'error',
      message: `Disabling ${targetEntryId} would remove the only known provider of ${serviceName}; required consumers: ${consumerEntryIds.join(', ')}.`,
      entityIds: [provider.id, provides.to, ...consumers.map(edge => edge.from)],
      evidenceEdgeIds: [provides.id, ...consumers.map(edge => edge.id)],
      repairCandidateIds: [keepId, disableConsumersId, draftId],
      confidence: 'declared',
    })
    repairs.push(
      {
        id: keepId,
        label: `Keep ${targetEntryId} enabled`,
        risk: 'safe',
        explanation: `Preserves the provider required by ${consumerEntryIds.join(', ')}.`,
        affectedEntityIds: [provider.id],
        followUpIntents: [{
          kind: 'set-declared-scalar',
          entryId: targetEntryId,
          path: ['disabled'],
          value: false,
        }],
        supportedByCurrentWriter: true,
      },
      {
        id: disableConsumersId,
        label: 'Disable known dependency closure',
        risk: 'review',
        explanation: `Would disable ${followUpEntryIds.join(', ')} in the same selected patch.`,
        affectedEntityIds: affectedClosureNodeIds,
        followUpIntents: followUpEntryIds.map(consumer => ({
          kind: 'set-declared-scalar' as const,
          entryId: consumer,
          path: ['disabled'],
          value: true,
        })),
        supportedByCurrentWriter: true,
      },
      {
        id: draftId,
        label: 'Keep as unresolved draft',
        risk: 'review',
        explanation: 'Shows the invalid candidate for exploration but does not allow commit.',
        affectedEntityIds: [provider.id, ...consumers.map(edge => edge.from)],
        followUpIntents: [],
        supportedByCurrentWriter: false,
      },
    )
  }
  return { diagnostics, repairs }
}


/** Re-evaluate every provider disabled by one proposed batch. */
export function analyzeDisableSet(
  graph: HarnessGraph,
  targetEntryIds: readonly string[],
): DependencyImpact {
  const proposed = [...new Set(targetEntryIds)]
  const diagnostics = new Map<string, ConstraintDiagnostic>()
  const repairs = new Map<string, RepairCandidate>()
  for (const target of proposed) {
    const impact = analyzeDisableEntry(graph, target, { proposedDisabledEntryIds: proposed })
    for (const diagnostic of impact.diagnostics) {
      diagnostics.set(`${diagnostic.code}:${diagnostic.evidenceEdgeIds.join(',')}`, diagnostic)
    }
    for (const repair of impact.repairs) repairs.set(repair.id, repair)
  }
  return { diagnostics: [...diagnostics.values()], repairs: [...repairs.values()] }
}

/**
 * Prove one proposed provider substitution from explicit current graph edges.
 * The replacement contract itself is supplied by the current-official adapter;
 * this function refuses missing, renamed, disabled, duplicated, or already
 * mounted participants rather than inferring compatibility.
 */
export function analyzeProviderReplacement(
  graph: HarnessGraph,
  options: AnalyzeProviderReplacementOptions,
): ProviderReplacementImpact {
  const facts = selectResolvedServiceFacts(graph)
  const current = resolvedEntryNode(facts, options.currentEntryId)
  if (current.attributes.pluginName !== options.currentPluginName) {
    throw new Error(`current provider ${JSON.stringify(options.currentEntryId)} does not match ${JSON.stringify(options.currentPluginName)}`)
  }
  const currentActivation = resolvedEntryActivation(current)
  if (currentActivation === 'disabled') {
    throw new Error(`current provider ${JSON.stringify(options.currentEntryId)} is already disabled`)
  }
  if (currentActivation !== 'active') {
    throw new Error(`current provider ${JSON.stringify(options.currentEntryId)} activation is unknown`)
  }
  const replacementMatches = facts.entries.filter(node =>
    node.attributes.entryId === options.replacementEntryId)
  if (replacementMatches.length > 0) {
    throw new Error(`replacement provider ${JSON.stringify(options.replacementEntryId)} already exists in the resolved profile`)
  }
  const serviceMatches = facts.services.filter(node => node.attributes.name === options.service)
  if (serviceMatches.length !== 1) {
    throw new Error(`service ${JSON.stringify(options.service)} is not represented by one authoritative graph node`)
  }
  const service = serviceMatches[0]
  if (service === undefined) throw new Error('unreachable: provider replacement service is missing')
  const provides = facts.provides.filter(edge => edge.from === current.id && edge.to === service.id)
  if (provides.length !== 1) {
    throw new Error(`current provider ${JSON.stringify(options.currentEntryId)} lacks one authoritative ${options.service} contract`)
  }
  const consumerEvidence = options.requiredConsumerEntryIds.map(consumerEntryId => {
    const consumer = resolvedEntryNode(facts, consumerEntryId)
    const edges = facts.requires.filter(edge => edge.from === consumer.id && edge.to === service.id
      && edge.attributes.evidence === 'current-official-contract')
    if (edges.length !== 1) {
      throw new Error(`required consumer ${JSON.stringify(consumerEntryId)} lacks one authoritative ${options.service} contract`)
    }
    const edge = edges[0]
    if (edge === undefined) throw new Error('unreachable: provider replacement consumer edge is missing')
    return { consumerEntryId, edgeId: edge.id }
  })
  const providerEdge = provides[0]
  if (providerEdge === undefined) throw new Error('unreachable: provider replacement edge is missing')
  return {
    service: options.service,
    currentProviderNodeId: current.id,
    currentEntryId: options.currentEntryId,
    currentPluginName: options.currentPluginName,
    replacementEntryId: options.replacementEntryId,
    replacementPluginName: options.replacementPluginName,
    requiredConsumerEntryIds: consumerEvidence.map(item => item.consumerEntryId),
    evidenceEdgeIds: [providerEdge.id, ...consumerEvidence.map(item => item.edgeId)],
    confidence: 'authoritative',
    risk: options.risk,
    executionWorldDelta: options.executionWorldDelta,
    securityDelta: options.securityDelta,
  }
}

/**
 * Prove a reversible switch only when both exact providers are already in the
 * resolved graph, the current one is active, the target is disabled, and both
 * retain the same authoritative service contract.
 */
export function analyzeProviderSwitch(
  graph: HarnessGraph,
  options: AnalyzeProviderReplacementOptions,
): ProviderSwitchImpact {
  const facts = selectResolvedServiceFacts(graph)
  const current = resolvedEntryNode(facts, options.currentEntryId)
  const replacement = resolvedEntryNode(facts, options.replacementEntryId)
  if (current.attributes.pluginName !== options.currentPluginName) {
    throw new Error(`current provider ${JSON.stringify(options.currentEntryId)} does not match ${JSON.stringify(options.currentPluginName)}`)
  }
  if (replacement.attributes.pluginName !== options.replacementPluginName) {
    throw new Error(`target provider ${JSON.stringify(options.replacementEntryId)} does not match ${JSON.stringify(options.replacementPluginName)}`)
  }
  const currentActivation = resolvedEntryActivation(current)
  if (currentActivation === 'disabled') {
    throw new Error(`current provider ${JSON.stringify(options.currentEntryId)} is disabled`)
  }
  if (currentActivation !== 'active') {
    throw new Error(`current provider ${JSON.stringify(options.currentEntryId)} activation is unknown`)
  }
  const replacementActivation = resolvedEntryActivation(replacement)
  if (replacementActivation === 'active') {
    throw new Error(`target provider ${JSON.stringify(options.replacementEntryId)} is already active`)
  }
  if (replacementActivation !== 'disabled') {
    throw new Error(`target provider ${JSON.stringify(options.replacementEntryId)} activation is unknown`)
  }
  const serviceMatches = facts.services.filter(node => node.attributes.name === options.service)
  if (serviceMatches.length !== 1) {
    throw new Error(`service ${JSON.stringify(options.service)} is not represented by one authoritative graph node`)
  }
  const service = serviceMatches[0]
  if (service === undefined) throw new Error('unreachable: provider switch service is missing')
  const providerEdges = [current, replacement].map(provider => {
    const edges = facts.provides.filter(edge => edge.from === provider.id && edge.to === service.id)
    if (edges.length !== 1) {
      const providerId = provider === current ? options.currentEntryId : options.replacementEntryId
      throw new Error(`provider ${JSON.stringify(providerId)} lacks one authoritative ${options.service} contract`)
    }
    const edge = edges[0]
    if (edge === undefined) throw new Error('unreachable: provider switch evidence edge is missing')
    return edge
  })
  const consumerEvidence = options.requiredConsumerEntryIds.map(consumerEntryId => {
    const consumer = resolvedEntryNode(facts, consumerEntryId)
    const edges = facts.requires.filter(edge => edge.from === consumer.id && edge.to === service.id
      && edge.attributes.evidence === 'current-official-contract')
    if (edges.length !== 1) {
      throw new Error(`required consumer ${JSON.stringify(consumerEntryId)} lacks one authoritative ${options.service} contract`)
    }
    const edge = edges[0]
    if (edge === undefined) throw new Error('unreachable: provider switch consumer edge is missing')
    return { consumerEntryId, edgeId: edge.id }
  })
  return {
    service: options.service,
    currentProviderNodeId: current.id,
    replacementProviderNodeId: replacement.id,
    currentEntryId: options.currentEntryId,
    currentPluginName: options.currentPluginName,
    replacementEntryId: options.replacementEntryId,
    replacementPluginName: options.replacementPluginName,
    requiredConsumerEntryIds: consumerEvidence.map(item => item.consumerEntryId),
    evidenceEdgeIds: [
      ...providerEdges.map(edge => edge.id),
      ...consumerEvidence.map(item => item.edgeId),
    ],
    confidence: 'authoritative',
    risk: options.risk,
    executionWorldDelta: options.executionWorldDelta,
    securityDelta: options.securityDelta,
  }
}
