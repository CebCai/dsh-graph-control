import type { HarnessGraph } from '@dsh-graph-control/harness-graph'

export interface CurrentOfficialSubprocessRemovalBoundary {
  capability: 'ctx.subprocess'
  serviceNodeId: string
  providerNodeId: string
  providerEntryId: 'subprocess'
  alternateProviderEntryIds: readonly string[]
  evidenceEdgeIds: readonly string[]
  consumers: readonly {
    nodeId: string
    entryId: 'bash-sandbox' | 'pwsh-sandbox' | 'tool-fs-search'
    disabledState: 'platform-controlled' | 'disabled'
    evidenceEdgeId: string
  }[]
}

/**
 * Prove the exact no-alternate ctx.subprocess boundary in the current official
 * Web composition. Symbolic values are compared as inert data and never run.
 */
export function proveCurrentOfficialSubprocessRemovalBoundary(
  graph: HarnessGraph,
): CurrentOfficialSubprocessRemovalBoundary {
  const services = graph.nodes.filter(node =>
    node.plane === 'resolved'
    && node.kind === 'service'
    && node.attributes.name === 'subprocess')
  if (services.length !== 1 || services[0] === undefined) {
    throw new Error('the current graph does not prove one exact ctx.subprocess service')
  }
  const service = services[0]
  const providerEdges = graph.edges.filter(edge =>
    edge.plane === 'resolved'
    && edge.kind === 'provides-service'
    && edge.to === service.id)
  if (providerEdges.length !== 1 || providerEdges[0] === undefined) {
    throw new Error('ctx.subprocess does not have the exact single-Provider boundary required by this action')
  }
  const providerEdge = providerEdges[0]
  const provider = graph.nodes.find(node => node.id === providerEdge.from)
  if (provider === undefined
    || provider.attributes.entryId !== 'subprocess'
    || provider.attributes.pluginName !== '@deepseek-ai/dsh-subprocess-local'
    || providerEdge.attributes.evidence !== 'current-official-contract'
    || providerEdge.attributes.providerAvailability !== 'active') {
    throw new Error('the current graph does not prove subprocess-local as the sole active ctx.subprocess Provider')
  }

  const expectedConsumers = [
    {
      entryId: 'bash-sandbox' as const,
      pluginName: '@deepseek-ai/dsh-bash-sandbox',
      symbolicSource: "process.platform === 'win32'",
    },
    {
      entryId: 'pwsh-sandbox' as const,
      pluginName: '@deepseek-ai/dsh-pwsh-sandbox',
      symbolicSource: "process.platform !== 'win32'",
    },
    {
      entryId: 'tool-fs-search' as const,
      pluginName: '@deepseek-ai/dsh-tool-fs-search',
    },
  ]
  const requiredEdges = graph.edges.filter(edge =>
    edge.plane === 'resolved'
    && edge.kind === 'requires-service'
    && edge.to === service.id)
  const optionalEdges = graph.edges.filter(edge =>
    edge.plane === 'resolved'
    && edge.kind === 'optionally-uses-service'
    && edge.to === service.id)
  if (requiredEdges.length !== expectedConsumers.length || optionalEdges.length !== 0) {
    throw new Error('the current ctx.subprocess consumer boundary changed; no removal preview was created')
  }

  const consumers: CurrentOfficialSubprocessRemovalBoundary['consumers'][number][] = []
  for (const expected of expectedConsumers) {
    const matchingNodes = graph.nodes.filter(node =>
      node.plane === 'resolved'
      && node.attributes.entryId === expected.entryId
      && node.attributes.pluginName === expected.pluginName)
    if (matchingNodes.length !== 1 || matchingNodes[0] === undefined) {
      throw new Error(`the current graph does not prove the exact ${expected.entryId} subprocess consumer`)
    }
    const consumer = matchingNodes[0]
    const matchingEdges = requiredEdges.filter(edge =>
      edge.from === consumer.id
      && (edge.attributes.evidence === 'current-official-contract'
        || edge.attributes.evidence === 'resolved-inject'))
    if (matchingEdges.length !== 1 || matchingEdges[0] === undefined) {
      throw new Error(`the current graph does not prove one authoritative ${expected.entryId} dependency edge`)
    }
    const value = consumer.attributes.value
    const disabled = value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>).disabled
      : undefined
    let disabledState: 'platform-controlled' | 'disabled'
    if ('symbolicSource' in expected) {
      const symbolic = disabled !== null && typeof disabled === 'object' && !Array.isArray(disabled)
        ? disabled as Record<string, unknown>
        : undefined
      if (symbolic?.symbolic !== true
        || symbolic.tag !== '!!js'
        || symbolic.source !== expected.symbolicSource) {
        throw new Error(`the ${expected.entryId} platform condition changed; GraphControl will not interpret it`)
      }
      disabledState = 'platform-controlled'
    } else {
      if (disabled !== true) {
        throw new Error('tool-fs-search is no longer explicitly disabled; the subprocess removal boundary changed')
      }
      disabledState = 'disabled'
    }
    consumers.push({
      nodeId: consumer.id,
      entryId: expected.entryId,
      disabledState,
      evidenceEdgeId: matchingEdges[0].id,
    })
  }

  return {
    capability: 'ctx.subprocess',
    serviceNodeId: service.id,
    providerNodeId: provider.id,
    providerEntryId: 'subprocess',
    alternateProviderEntryIds: [],
    evidenceEdgeIds: [providerEdge.id, ...consumers.map(consumer => consumer.evidenceEdgeId)],
    consumers,
  }
}
