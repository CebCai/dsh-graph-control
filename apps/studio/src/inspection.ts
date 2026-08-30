import type {
  GraphEntity,
  GraphPlane,
  HarnessGraph,
  ProvenanceStep,
} from '@dsh-graph-control/harness-graph'
import {
  selectResolvedServiceFacts,
  type ResolvedServiceFacts,
} from '@dsh-graph-control/harness-graph'
// Ask the real writer whether an edit shape is supported so visible controls
// stay aligned with the exact source-preservation rules.
import {
  planDeclaredScalarEdit,
  inspectCurrentOfficialWebSpine,
  type DshInstallation,
  type E2bProfileReadiness,
  type DshProfileSources,
  type GitWorkspaceMaterialization,
  type GraphProjectionDiagnostic,
  type OfficialDshComponentPackageEvidence,
  type CurrentOfficialWebSpineComponentRole,
  type CurrentOfficialWebSpineSemanticId,
  type CurrentOfficialWebSpineServiceName,
  type CurrentOfficialWebSpineUnavailableReason,
} from '@dsh-graph-control/dsh-adapter'
import {
  inspectDirectoryPickerChange,
  inspectFsProviderChange,
  inspectFsProviderReset,
  inspectScheduleChange,
  inspectTimeContextChange,
} from '@dsh-graph-control/profile-edit'
import {
  inspectProfileAuthoringBoundary,
  type ProfileAuthoringBoundary,
} from './profile-authoring.ts'

export interface StudioLayerView {
  order: number
  owner: 'bundle' | 'profile' | 'home' | 'explicit'
  label: string
  path: string
  uri: string
  exists: boolean
  writable: boolean
  state: string
}

export interface StudioNodeView {
  id: string
  semanticId?: CurrentOfficialWebSpineSemanticId
  plane: GraphPlane
  kind: string
  label: string
  subtitle: string
  attributes: Readonly<Record<string, unknown>>
  provenance: readonly ProvenanceStep[]
  typed?:
    | {
        kind: 'web-spine-component'
        role: CurrentOfficialWebSpineComponentRole
        activation: 'active' | 'disabled'
      }
    | {
        kind: 'web-spine-service'
        name: CurrentOfficialWebSpineServiceName
      }
}

export interface StudioEdgeView {
  id: string
  semanticId?: CurrentOfficialWebSpineSemanticId
  plane: GraphPlane
  kind: string
  from: string
  to: string
  evidence?: string
  providerAvailability?: StudioProviderAvailability
  providerPolicy?: StudioProviderPolicyView
  worldCapability?: StudioExecutionWorldCapability
  typed?: {
    kind: 'web-spine-relation'
    relation: 'provides-service' | 'requires-service'
    service: CurrentOfficialWebSpineServiceName
  }
}

export type StudioWebSpineView =
  | {
      kind: 'web-spine'
      status: 'available'
      componentNodeIds: readonly CurrentOfficialWebSpineSemanticId[]
      serviceNodeIds: readonly CurrentOfficialWebSpineSemanticId[]
      relationIds: readonly CurrentOfficialWebSpineSemanticId[]
    }
  | {
      kind: 'web-spine'
      status: 'unavailable'
      reason: CurrentOfficialWebSpineUnavailableReason
    }

export type StudioProviderAvailability = 'active' | 'disabled' | 'unknown'
export type StudioServiceAvailability = 'available' | 'unavailable' | 'conflicting' | 'unknown'

export interface StudioProviderPolicyView {
  id: string
  label: string
  executionWorld: string
  confinement: string
  summary: string
  sourcePaths: readonly string[]
  evidence: 'current-official-source'
}

export interface StudioServiceProviderView {
  nodeId: string
  availability: StudioProviderAvailability
  evidence?: string
  policy?: StudioProviderPolicyView
}

export interface StudioServiceView {
  id: string
  name: string
  availability: StudioServiceAvailability
  providers: readonly StudioServiceProviderView[]
  requiredConsumers: readonly string[]
  optionalConsumers: readonly string[]
}

export type StudioExecutionWorldCapability = 'filesystem' | 'subprocess' | 'world-owner'
export type StudioExecutionWorldState = 'coherent' | 'incomplete' | 'conflicting' | 'unknown'

export interface StudioExecutionWorldMemberView {
  nodeId: string
  capability: StudioExecutionWorldCapability
  availability: StudioProviderAvailability
}

export interface StudioExecutionWorldView {
  id: string
  name: string
  label: string
  locality: 'local' | 'remote'
  state: StudioExecutionWorldState
  summary: string
  sourcePaths: readonly string[]
  members: readonly StudioExecutionWorldMemberView[]
}

export interface StudioRemoteWorldReadinessView {
  id: string
  label: string
  state: 'packages-ready' | 'packages-missing'
  packages: E2bProfileReadiness['packages']
  credentialReference: string
  credentialInspected: false
  defaultCwd: string
  defaultTimeoutMs: number
  lifecycle: string
  security: string
  limitation: string
  sourcePaths: readonly string[]
  workspaceMaterialization?: GitWorkspaceMaterialization
  webTransition: {
    id: string
    label: string
    state: 'blocked'
    candidateAvailable: false
    hostPlatform: string
    participants: E2bProfileReadiness['webTransition']['participants']
    blockers: E2bProfileReadiness['webTransition']['blockers']
    sessionBoundary: E2bProfileReadiness['webTransition']['sessionBoundary']
    externalActionsPerformed: false
  }
}

export interface StudioProviderReplacementView {
  id: string
  mode: 'initial' | 'switch' | 'reset' | 'pin-browse' | 'reset-auto'
  service: string
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
  summary: string
  companionEntryId?: string
  companionPluginName?: string
}

export interface StudioPluginActionView {
  id: 'time-context-add' | 'time-context-remove' | 'schedule-add' | 'schedule-remove'
  mode: 'add-plugin' | 'remove-plugin'
  entryId: 'time-context' | 'schedule'
  pluginName: '@deepseek-ai/dsh-time-context' | '@deepseek-ai/dsh-schedule'
  outcomeGroup: 'understand-now' | 'follow-up'
  activationBoundary: 'next-agent-start'
  label: string
  description: string
  risk: 'safe' | 'review'
  summary: string
}

export interface StudioComponentInstanceView {
  entryId: string
  namespace?: string
  availability: 'active' | 'disabled' | 'unknown'
}

export interface StudioComponentCatalogItem {
  id: 'time-context' | 'schedule' | 'mcp-streamable-http' | 'task-list' | 'goal-tracking'
  family: 'context' | 'follow-up' | 'integration' | 'task-management' | 'goal-management'
  packageName: '@deepseek-ai/dsh-time-context' | '@deepseek-ai/dsh-schedule' | '@deepseek-ai/dsh-mcp-client' | '@deepseek-ai/dsh-tool-todo' | '@deepseek-ai/dsh-tool-goal'
  packageVersion?: string
  source: 'official-cli-package'
  availability: 'available' | 'active' | 'unavailable'
  activeEntryIds: readonly string[]
  instances: readonly StudioComponentInstanceView[]
  canAdd: boolean
  configurable: boolean
  transport?: 'streamable-http'
  credentialsSupported: false
  risk: 'safe' | 'review'
}

export interface StudioInspection {
  generatedAt: string
  installation: {
    version: string
    commit?: string
  }
  profile: {
    name: string
    directory: string
  }
  authoring: ProfileAuthoringBoundary
  layers: readonly StudioLayerView[]
  counts: {
    nodes: number
    edges: number
    declared: number
    resolved: number
    observed: number
  }
  nodes: readonly StudioNodeView[]
  edges: readonly StudioEdgeView[]
  services: readonly StudioServiceView[]
  pluginActions: readonly StudioPluginActionView[]
  componentCatalog: readonly StudioComponentCatalogItem[]
  executionWorlds: readonly StudioExecutionWorldView[]
  webSpine: StudioWebSpineView
  remoteWorldReadiness?: StudioRemoteWorldReadinessView
  diagnostics: readonly GraphProjectionDiagnostic[]
}

export interface CreateStudioInspectionOptions {
  installation: Pick<DshInstallation, 'version' | 'commit'>
  sources: DshProfileSources
  graph: HarnessGraph
  diagnostics: readonly GraphProjectionDiagnostic[]
  e2bReadiness?: E2bProfileReadiness
  workspaceMaterialization?: GitWorkspaceMaterialization
  componentPackages?: readonly OfficialDshComponentPackageEvidence[]
  generatedAt?: string
}

const SAFE_ATTRIBUTE_KEYS = [
  'entryId',
  'pluginName',
  'packageName',
  'name',
  'label',
  'owner',
  'order',
  'writable',
  'exists',
  'byteLength',
  'newline',
  'role',
  'mode',
  'layerOrder',
  'layerLabel',
  'insertCount',
  'unknownKeys',
  'locality',
  'summary',
  'sourcePaths',
  'evidence',
] as const

// Exact top-level implicit-default contracts. Broaden only with current source
// evidence; unresolved group ancestry can still make a nested entry ambiguous.
const IMPLICIT_DISABLED_OVERRIDE_CONTRACTS = new Map([
  ['timer', '@deepseek-ai/cordis-plugin-timer'],
  ['web-startup', '@deepseek-ai/dsh-web-app/startup'],
  ['webserver', '@deepseek-ai/dsh-host-webserver'],
  ['web-runtime', '@deepseek-ai/dsh-web-app'],
  ['connection', '@deepseek-ai/dsh-client-connection'],
])

type DisabledEditMode = 'replace-scalar' | 'insert-field' | 'append-override'

function scalarText(value: unknown): string | undefined {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : undefined
}

function entryDisabled(node: GraphEntity): unknown {
  const value = node.attributes.value
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const disabled = (value as Record<string, unknown>).disabled
  if (typeof disabled === 'boolean') return disabled
  if (disabled !== null && typeof disabled === 'object') {
    const symbolic = disabled as Record<string, unknown>
    if (symbolic.symbolic === true) {
      return {
        symbolic: true,
        tag: scalarText(symbolic.tag),
        source: scalarText(symbolic.source),
      }
    }
  }
  return undefined
}

function providerAvailabilityFromNode(node: GraphEntity | undefined): StudioProviderAvailability {
  if (node === undefined) return 'unknown'
  const disabled = entryDisabled(node)
  if (disabled === true) return 'disabled'
  if (disabled === false || disabled === undefined) return 'active'
  return 'unknown'
}

function safeProviderAvailability(value: unknown): StudioProviderAvailability | undefined {
  return value === 'active' || value === 'disabled' || value === 'unknown'
    ? value
    : undefined
}

function safeProviderPolicy(value: unknown): StudioProviderPolicyView | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (typeof record.id !== 'string'
    || typeof record.label !== 'string'
    || typeof record.executionWorld !== 'string'
    || typeof record.confinement !== 'string'
    || typeof record.summary !== 'string'
    || !Array.isArray(record.sourcePaths)
    || !record.sourcePaths.every(path => typeof path === 'string')
    || record.evidence !== 'current-official-source') {
    return undefined
  }
  return {
    id: record.id,
    label: record.label,
    executionWorld: record.executionWorld,
    confinement: record.confinement,
    summary: record.summary,
    sourcePaths: [...record.sourcePaths],
    evidence: 'current-official-source',
  }
}

function serviceAvailability(
  providers: readonly StudioServiceProviderView[],
): StudioServiceAvailability {
  const active = providers.filter(provider => provider.availability === 'active').length
  const unknown = providers.some(provider => provider.availability === 'unknown')
  if (active > 1) return 'conflicting'
  if (unknown) return 'unknown'
  return active === 1 ? 'available' : 'unavailable'
}

function executionWorldState(
  members: readonly StudioExecutionWorldMemberView[],
): StudioExecutionWorldState {
  const capabilities = members.filter(member => member.capability !== 'world-owner')
  if (capabilities.some(member => member.availability === 'unknown')) return 'unknown'
  const activeFilesystem = capabilities.filter(member =>
    member.capability === 'filesystem' && member.availability === 'active').length
  const activeSubprocess = capabilities.filter(member =>
    member.capability === 'subprocess' && member.availability === 'active').length
  if (activeFilesystem > 1 || activeSubprocess > 1) return 'conflicting'
  return activeFilesystem === 1 && activeSubprocess === 1 ? 'coherent' : 'incomplete'
}

function safeExecutionWorldCapability(value: unknown): StudioExecutionWorldCapability | undefined {
  return value === 'filesystem' || value === 'subprocess' || value === 'world-owner'
    ? value
    : undefined
}

function usesSupportedImplicitDisabledDefault(node: GraphEntity): boolean {
  const entryId = typeof node.attributes.entryId === 'string' ? node.attributes.entryId : undefined
  const pluginName = typeof node.attributes.pluginName === 'string' ? node.attributes.pluginName : undefined
  const isTopLevelResolvedEntry = node.provenance.some(step =>
    step.kind === 'derived'
    && step.source?.path?.length === 1
    && typeof step.source.path[0] === 'number')
  return node.plane === 'resolved'
    && node.kind === 'plugin-entry'
    && entryId !== undefined
    && IMPLICIT_DISABLED_OVERRIDE_CONTRACTS.get(entryId) === pluginName
    && entryDisabled(node) === undefined
    && isTopLevelResolvedEntry
}

const AGENT_PRESET_STATE_ENTRIES = new Set(['tool-todo', 'tool-goal'])

function supportsRootDisabledEdit(entryId: string): boolean {
  return !AGENT_PRESET_STATE_ENTRIES.has(entryId)
}

function safeAttributes(
  node: GraphEntity,
  disabledEditModes: ReadonlyMap<string, DisabledEditMode>,
  providerReplacements: ReadonlyMap<string, StudioProviderReplacementView>,
  providerResets: ReadonlyMap<string, StudioProviderReplacementView>,
): Readonly<Record<string, unknown>> {
  const attributes: Record<string, unknown> = {}
  for (const key of SAFE_ATTRIBUTE_KEYS) {
    const value = node.attributes[key]
    if (value !== undefined) attributes[key] = value
  }
  const disabled = entryDisabled(node)
  if (disabled !== undefined) {
    attributes.disabled = disabled
    attributes.disabledOrigin = node.plane === 'declared'
      ? 'declared-source'
      : 'official-resolved-value'
  } else if (usesSupportedImplicitDisabledDefault(node)) {
    attributes.disabled = false
    attributes.disabledOrigin = 'official-loader-default'
  }
  const entryId = typeof node.attributes.entryId === 'string' ? node.attributes.entryId : undefined
  const editMode = disabledEditModes.get(node.id)
  if (node.plane === 'resolved' && editMode !== undefined) {
    attributes.editableFields = ['disabled']
    attributes.editTargetOwner = 'profile'
    attributes.editMode = editMode
  }
  const providerReplacement = entryId === undefined ? undefined : providerReplacements.get(entryId)
  if (node.plane === 'resolved' && providerReplacement !== undefined) {
    attributes.providerReplacement = providerReplacement
  }
  const providerReset = entryId === undefined ? undefined : providerResets.get(entryId)
  if (node.plane === 'resolved' && providerReset !== undefined) {
    attributes.providerReset = providerReset
  }
  return attributes
}

function nodeLabel(node: GraphEntity): string {
  for (const key of ['entryId', 'name', 'label', 'packageName'] as const) {
    const value = scalarText(node.attributes[key])
    if (value !== undefined && value !== '') return value
  }
  const path = scalarText(node.attributes.path)
  if (path !== undefined) return path.replaceAll('\\', '/').split('/').at(-1) ?? path
  return node.kind
}

function nodeSubtitle(node: GraphEntity): string {
  const plugin = scalarText(node.attributes.pluginName ?? node.attributes.packageName)
  return plugin === undefined || plugin === nodeLabel(node) ? node.kind : plugin
}

function layerState(layer: DshProfileSources['layers'][number]): string {
  if (!layer.patch.exists) return 'Optional patch not present'
  const ownership = layer.patch.writable ? 'Editable patch' : 'Read-only source'
  return `${ownership} · ${layer.patch.byteLength.toLocaleString('en-US')} bytes · ${layer.patch.newline.toUpperCase()}`
}

function cloneProvenance(step: ProvenanceStep): ProvenanceStep {
  return {
    kind: step.kind,
    ...(step.note === undefined ? {} : { note: step.note }),
    ...(step.source === undefined
      ? {}
      : {
          source: {
            uri: step.source.uri,
            ...(step.source.startOffset === undefined ? {} : { startOffset: step.source.startOffset }),
            ...(step.source.endOffset === undefined ? {} : { endOffset: step.source.endOffset }),
            ...(step.source.path === undefined ? {} : { path: [...step.source.path] }),
          },
        }),
  }
}

const STUDIO_COMPONENT_CONTRACTS = [
  {
    id: 'time-context',
    family: 'context',
    packageName: '@deepseek-ai/dsh-time-context',
    entryId: 'time-context',
    configurable: false,
    risk: 'safe',
  },
  {
    id: 'schedule',
    family: 'follow-up',
    packageName: '@deepseek-ai/dsh-schedule',
    entryId: 'schedule',
    configurable: false,
    risk: 'review',
  },
  {
    id: 'mcp-streamable-http',
    family: 'integration',
    packageName: '@deepseek-ai/dsh-mcp-client',
    configurable: true,
    transport: 'streamable-http',
    risk: 'review',
  },
  {
    id: 'task-list',
    family: 'task-management',
    packageName: '@deepseek-ai/dsh-tool-todo',
    entryId: 'tool-todo',
    stateOnly: true,
    configurable: false,
    risk: 'safe',
  },
  {
    id: 'goal-tracking',
    family: 'goal-management',
    packageName: '@deepseek-ai/dsh-tool-goal',
    entryId: 'tool-goal',
    stateOnly: true,
    configurable: false,
    risk: 'safe',
  },
] as const

function componentInstances(
  graph: HarnessGraph,
  contract: typeof STUDIO_COMPONENT_CONTRACTS[number],
): StudioComponentInstanceView[] {
  return graph.nodes.flatMap(node => {
    if (node.plane !== 'resolved' || node.attributes.pluginName !== contract.packageName) return []
    const entryId = typeof node.attributes.entryId === 'string' ? node.attributes.entryId : undefined
    if (entryId === undefined || ('entryId' in contract && contract.entryId !== entryId)) return []
    const disabled = entryDisabled(node)
    const value = node.attributes.value
    const config = value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>).config
      : undefined
    const namespace = config !== null && typeof config === 'object' && !Array.isArray(config)
      && typeof (config as Record<string, unknown>).serverName === 'string'
      ? (config as Record<string, unknown>).serverName as string
      : undefined
    return [{
      entryId,
      ...(namespace === undefined ? {} : { namespace }),
      availability: disabled === true ? 'disabled' : disabled === false || disabled === undefined ? 'active' : 'unknown',
    }]
  })
}

function buildComponentCatalog(
  options: CreateStudioInspectionOptions,
  writableProfile: boolean,
): StudioComponentCatalogItem[] {
  return STUDIO_COMPONENT_CONTRACTS.map(contract => {
    const evidence = options.componentPackages?.find(component => component.id === contract.id)
    const installed = evidence?.installed === true
    const instances = componentInstances(options.graph, contract)
    const activeEntryIds = instances
      .filter(instance => instance.availability === 'active')
      .map(instance => instance.entryId)
    return {
      id: contract.id,
      family: contract.family,
      packageName: contract.packageName,
      ...(evidence?.version === undefined ? {} : { packageVersion: evidence.version }),
      source: 'official-cli-package' as const,
      availability: installed ? activeEntryIds.length > 0 ? 'active' as const : 'available' as const : 'unavailable' as const,
      activeEntryIds,
      instances,
      canAdd: installed
        && writableProfile
        && !('stateOnly' in contract)
        && (contract.id === 'mcp-streamable-http' || instances.length === 0),
      configurable: contract.configurable,
      ...('transport' in contract ? { transport: contract.transport } : {}),
      credentialsSupported: false as const,
      risk: contract.risk,
    }
  })
}

/**
 * Build the browser-facing read model. Raw YAML, full entry values, and source
 * bytes stay behind the local adapter boundary; the browser receives only the
 * graph facts needed by the first inspector.
 */
export function createStudioInspection(options: CreateStudioInspectionOptions): StudioInspection {
  const profileLayer = options.sources.layers.find(layer => layer.owner === 'profile')
  const authoring = inspectProfileAuthoringBoundary(options.sources)
  const webSpine = inspectCurrentOfficialWebSpine(options.graph)
  let resolvedServiceFacts: ResolvedServiceFacts | undefined
  try {
    resolvedServiceFacts = selectResolvedServiceFacts(options.graph)
  } catch {
    // Malformed known service facts remain visible through the open node/edge
    // envelope, but no typed service summary or edit eligibility is inferred.
  }
  const webComponentsBySourceNodeId = new Map(webSpine.status === 'available'
    ? webSpine.components.map(component => [component.sourceNodeId, component] as const)
    : [])
  const webServicesBySourceNodeId = new Map(webSpine.status === 'available'
    ? webSpine.services.map(service => [service.sourceNodeId, service] as const)
    : [])
  const webRelationsBySourceRelationId = new Map(webSpine.status === 'available'
    ? webSpine.relations.map(relation => [relation.sourceRelationId, relation] as const)
    : [])
  const publicNodeId = (sourceNodeId: string): string =>
    webComponentsBySourceNodeId.get(sourceNodeId)?.semanticId
    ?? webServicesBySourceNodeId.get(sourceNodeId)?.semanticId
    ?? sourceNodeId
  const profileEntryIds = new Set(options.graph.nodes.flatMap(node => {
    const entryId = typeof node.attributes.entryId === 'string' ? node.attributes.entryId : undefined
    const declaredInProfile = node.plane === 'declared'
      && profileLayer !== undefined
      && node.attributes.layerOrder === profileLayer.order
      && node.provenance.some(step => step.source?.uri === profileLayer.patch.uri)
    return declaredInProfile && entryId !== undefined ? [entryId] : []
  }))
  const disabledEditModes = new Map<string, DisabledEditMode>()
  const providerReplacements = new Map<string, StudioProviderReplacementView>()
  const providerResets = new Map<string, StudioProviderReplacementView>()
  const pluginActions: StudioPluginActionView[] = []
  if (profileLayer?.patch.exists === true
    && profileLayer.patch.writable) {
    for (const node of options.graph.nodes) {
      const entryId = typeof node.attributes.entryId === 'string' ? node.attributes.entryId : undefined
      const declaredDisabled = entryDisabled(node)
      const effectiveDisabled = typeof declaredDisabled === 'boolean'
        ? declaredDisabled
        : usesSupportedImplicitDisabledDefault(node)
          ? false
          : undefined
      if (node.plane !== 'resolved' || entryId === undefined || effectiveDisabled === undefined) continue
      if (IMPLICIT_DISABLED_OVERRIDE_CONTRACTS.has(entryId)
        && entryId !== 'timer'
        && !webComponentsBySourceNodeId.has(node.id)) continue
      if (!supportsRootDisabledEdit(entryId)) continue
      try {
        const plan = planDeclaredScalarEdit({
          sources: options.sources,
          targetUri: profileLayer.patch.uri,
          intent: {
            kind: 'set-declared-scalar',
            entryId,
            path: ['disabled'],
            value: !effectiveDisabled,
          },
        })
        if (plan.preview.operation === 'remove-entry') continue
        if (plan.preview.operation === 'append-entry' && profileEntryIds.has(entryId)) continue
        disabledEditModes.set(
          node.id,
          plan.preview.operation === 'append-entry' ? 'append-override' : plan.preview.operation,
        )
      } catch {
        // Unsupported or ambiguous source shapes remain visible but read-only.
      }
    }
    try {
      const { planned, impact } = inspectFsProviderChange({
        sources: options.sources,
        graph: options.graph,
        targetUri: profileLayer.patch.uri,
      })
      providerReplacements.set(impact.currentEntryId, {
        id: planned.providerReplacement.id,
        mode: planned.providerChangeMode,
        service: impact.service,
        currentEntryId: impact.currentEntryId,
        currentPluginName: impact.currentPluginName,
        replacementEntryId: impact.replacementEntryId,
        replacementPluginName: impact.replacementPluginName,
        requiredConsumerEntryIds: [...impact.requiredConsumerEntryIds],
        evidenceEdgeIds: [...impact.evidenceEdgeIds],
        confidence: impact.confidence,
        risk: impact.risk,
        executionWorldDelta: impact.executionWorldDelta,
        securityDelta: impact.securityDelta,
        summary: planned.summary,
      })
    } catch {
      // A replacement is shown only when both graph evidence and the real
      // source-preserving writer support this exact current profile shape.
    }
    try {
      const { planned, impact } = inspectFsProviderReset({
        sources: options.sources,
        graph: options.graph,
        targetUri: profileLayer.patch.uri,
      })
      providerResets.set(impact.currentEntryId, {
        id: planned.providerReplacement.id,
        mode: planned.providerChangeMode,
        service: impact.service,
        currentEntryId: impact.currentEntryId,
        currentPluginName: impact.currentPluginName,
        replacementEntryId: impact.replacementEntryId,
        replacementPluginName: impact.replacementPluginName,
        requiredConsumerEntryIds: [...impact.requiredConsumerEntryIds],
        evidenceEdgeIds: [...impact.evidenceEdgeIds],
        confidence: impact.confidence,
        risk: impact.risk,
        executionWorldDelta: impact.executionWorldDelta,
        securityDelta: impact.securityDelta,
        summary: planned.summary,
      })
    } catch {
      // Reset appears only for the untouched generated pair in the safe state.
    }
    try {
      const { planned, impact } = inspectDirectoryPickerChange({
        sources: options.sources,
        graph: options.graph,
        targetUri: profileLayer.patch.uri,
      })
      providerReplacements.set(impact.currentEntryId, {
        id: planned.directoryPickerChange.id,
        mode: planned.directoryPickerMode,
        service: impact.service,
        currentEntryId: impact.currentEntryId,
        currentPluginName: impact.currentPluginName,
        replacementEntryId: impact.replacementEntryId,
        replacementPluginName: impact.replacementPluginName,
        companionEntryId: planned.directoryPickerChange.companionEntryId,
        companionPluginName: planned.directoryPickerChange.companionPluginName,
        requiredConsumerEntryIds: [...impact.requiredConsumerEntryIds],
        evidenceEdgeIds: [...impact.evidenceEdgeIds],
        confidence: impact.confidence,
        risk: impact.risk,
        executionWorldDelta: impact.executionWorldDelta,
        securityDelta: impact.securityDelta,
        summary: planned.summary,
      })
    } catch {
      // The picker action requires both exact current-official graph evidence
      // and the exact profile-patch source form for pin or reset.
    }
    try {
      if (options.componentPackages !== undefined
        && options.componentPackages.find(component => component.id === 'time-context')?.installed !== true) {
        throw new Error('time-context package is not installed for this official CLI')
      }
      const { planned, impact } = inspectTimeContextChange({
        sources: options.sources,
        graph: options.graph,
        targetUri: profileLayer.patch.uri,
      })
      pluginActions.push({
        id: planned.timeContextChange.id,
        mode: planned.timeContextMode,
        entryId: impact.entryId,
        pluginName: impact.pluginName,
        outcomeGroup: 'understand-now',
        activationBoundary: 'next-agent-start',
        label: impact.label,
        description: impact.description,
        risk: impact.risk,
        summary: planned.summary,
      })
    } catch {
      // Show the action only when the current official graph and exact source
      // shape support one reversible time-context change.
    }
    try {
      if (options.componentPackages !== undefined
        && options.componentPackages.find(component => component.id === 'schedule')?.installed !== true) {
        throw new Error('Schedule package is not installed for this official CLI')
      }
      const { planned, impact } = inspectScheduleChange({
        sources: options.sources,
        graph: options.graph,
        targetUri: profileLayer.patch.uri,
      })
      pluginActions.push({
        id: planned.scheduleChange.id,
        mode: planned.scheduleMode,
        entryId: impact.entryId,
        pluginName: impact.pluginName,
        outcomeGroup: 'follow-up',
        activationBoundary: 'next-agent-start',
        label: impact.label,
        description: impact.description,
        risk: impact.risk,
        summary: planned.summary,
      })
    } catch {
      // Show the action only when current official DSH and the exact source
      // shape support one reversible Schedule change.
    }
  }
  const nodes: StudioNodeView[] = options.graph.nodes.map(node => {
    const component = webComponentsBySourceNodeId.get(node.id)
    const service = webServicesBySourceNodeId.get(node.id)
    const semanticId = component?.semanticId ?? service?.semanticId
    return {
      id: semanticId ?? node.id,
      ...(semanticId === undefined ? {} : { semanticId }),
      plane: node.plane,
      kind: node.kind,
      label: nodeLabel(node),
      subtitle: nodeSubtitle(node),
      attributes: safeAttributes(node, disabledEditModes, providerReplacements, providerResets),
      provenance: node.provenance.map(cloneProvenance),
      ...(component === undefined
        ? service === undefined
          ? {}
          : {
              typed: {
                kind: 'web-spine-service' as const,
                name: service.name,
              },
            }
        : {
            typed: {
              kind: 'web-spine-component' as const,
              role: component.role,
              activation: component.activation,
            },
          }),
    }
  })
  const nodeIds = new Set(nodes.map(node => node.id))
  const serviceRelationsById = new Map((resolvedServiceFacts?.relations ?? [])
    .map(relation => [relation.id, relation] as const))
  const edges: StudioEdgeView[] = options.graph.edges
    .filter(edge => nodeIds.has(publicNodeId(edge.from)) && nodeIds.has(publicNodeId(edge.to)))
    .map(edge => {
      const serviceRelation = serviceRelationsById.get(edge.id)
      const declaredAvailability = serviceRelation?.kind === 'provides-service'
        ? serviceRelation.attributes.providerAvailability
        : edge.attributes.providerAvailability
      const providerAvailability: StudioProviderAvailability | undefined = serviceRelation?.kind === 'provides-service'
        ? serviceRelation.attributes.providerAvailability
        : edge.kind !== 'belongs-to-world'
          ? undefined
          : safeProviderAvailability(declaredAvailability)
            ?? providerAvailabilityFromNode(options.graph.nodes.find(node => node.id === edge.from))
      const providerPolicy = serviceRelation?.kind === 'provides-service'
        && serviceRelation.attributes.providerPolicy !== undefined
        ? {
            ...serviceRelation.attributes.providerPolicy,
            sourcePaths: [...serviceRelation.attributes.providerPolicy.sourcePaths],
          }
        : safeProviderPolicy(edge.attributes.providerPolicy)
      const worldCapability = safeExecutionWorldCapability(edge.attributes.capability)
      const webRelation = webRelationsBySourceRelationId.get(edge.id)
      const semanticId = webRelation?.semanticId
      return {
        id: semanticId ?? edge.id,
        ...(semanticId === undefined ? {} : { semanticId }),
        plane: edge.plane,
        kind: edge.kind,
        from: publicNodeId(edge.from),
        to: publicNodeId(edge.to),
        ...(serviceRelation === undefined
          ? typeof edge.attributes.evidence === 'string' ? { evidence: edge.attributes.evidence } : {}
          : { evidence: serviceRelation.attributes.evidence }),
        ...(providerAvailability === undefined ? {} : { providerAvailability }),
        ...(providerPolicy === undefined ? {} : { providerPolicy }),
        ...(worldCapability === undefined ? {} : { worldCapability }),
        ...(webRelation === undefined
          ? {}
          : {
              typed: {
                kind: 'web-spine-relation' as const,
                relation: webRelation.kind,
                service: webRelation.service,
              },
            }),
      }
    })
  const services: StudioServiceView[] = (resolvedServiceFacts?.services ?? [])
    .map(serviceFact => {
      const serviceId = publicNodeId(serviceFact.id)
      const providers = edges
        .filter(edge => edge.kind === 'provides-service' && edge.to === serviceId)
        .map(edge => ({
          nodeId: edge.from,
          availability: edge.providerAvailability ?? 'unknown',
          ...(edge.evidence === undefined ? {} : { evidence: edge.evidence }),
          ...(edge.providerPolicy === undefined ? {} : { policy: edge.providerPolicy }),
        }))
        .sort((left, right) => {
          const order = { active: 0, disabled: 1, unknown: 2 } as const
          return order[left.availability] - order[right.availability]
        })
      return {
        id: serviceId,
        name: serviceFact.attributes.name,
        availability: serviceAvailability(providers),
        providers,
        requiredConsumers: edges.filter(edge => edge.kind === 'requires-service' && edge.to === serviceId).map(edge => edge.from),
        optionalConsumers: edges.filter(edge => edge.kind === 'optionally-uses-service' && edge.to === serviceId).map(edge => edge.from),
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name))
  const executionWorlds: StudioExecutionWorldView[] = nodes
    .filter(node => node.kind === 'execution-world')
    .flatMap(world => {
      const locality: StudioExecutionWorldView['locality'] | undefined = world.attributes.locality === 'local'
        || world.attributes.locality === 'remote'
        ? world.attributes.locality
        : undefined
      const summary = world.attributes.summary
      const sourcePaths = world.attributes.sourcePaths
      if (locality === undefined
        || typeof summary !== 'string'
        || !Array.isArray(sourcePaths)
        || !sourcePaths.every(path => typeof path === 'string')) return []
      const members: StudioExecutionWorldMemberView[] = edges
        .filter(edge => edge.kind === 'belongs-to-world' && edge.to === world.id && edge.worldCapability !== undefined)
        .map(edge => ({
          nodeId: edge.from,
          capability: edge.worldCapability!,
          availability: edge.providerAvailability ?? 'unknown',
        }))
      return [{
        id: world.id,
        name: typeof world.attributes.name === 'string' ? world.attributes.name : world.label,
        label: typeof world.attributes.label === 'string' ? world.attributes.label : world.label,
        locality,
        state: executionWorldState(members),
        summary,
        sourcePaths: [...sourcePaths],
        members,
      }]
    })
    .sort((left, right) => left.locality.localeCompare(right.locality) || left.name.localeCompare(right.name))
  const planeCount = (plane: GraphPlane): number => nodes.filter(node => node.plane === plane).length

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    installation: {
      version: options.installation.version,
      ...(options.installation.commit === undefined ? {} : { commit: options.installation.commit }),
    },
    profile: {
      name: options.sources.profile,
      directory: options.sources.profileDir,
    },
    authoring,
    layers: options.sources.layers.map(layer => ({
      order: layer.order,
      owner: layer.owner,
      label: layer.label,
      path: layer.patch.path,
      uri: layer.patch.uri,
      exists: layer.patch.exists,
      writable: layer.patch.writable,
      state: layerState(layer),
    })),
    counts: {
      nodes: nodes.length,
      edges: edges.length,
      declared: planeCount('declared'),
      resolved: planeCount('resolved'),
      observed: planeCount('observed'),
    },
    nodes,
    edges,
    services,
    pluginActions,
    componentCatalog: buildComponentCatalog(
      options,
      authoring.state === 'writable',
    ),
    executionWorlds,
    webSpine: webSpine.status === 'available'
      ? {
          kind: 'web-spine',
          status: 'available',
          componentNodeIds: webSpine.components.map(component => component.semanticId),
          serviceNodeIds: webSpine.services.map(service => service.semanticId),
          relationIds: webSpine.relations.map(relation => relation.semanticId),
        }
      : {
          kind: 'web-spine',
          status: 'unavailable',
          reason: webSpine.reason,
        },
    ...(options.e2bReadiness === undefined
      ? {}
      : {
          remoteWorldReadiness: {
            id: options.e2bReadiness.id,
            label: options.e2bReadiness.label,
            state: options.e2bReadiness.state,
            packages: options.e2bReadiness.packages.map(candidate => ({ ...candidate })),
            credentialReference: options.e2bReadiness.credentialReference,
            credentialInspected: false as const,
            defaultCwd: options.e2bReadiness.defaultCwd,
            defaultTimeoutMs: options.e2bReadiness.defaultTimeoutMs,
            lifecycle: options.e2bReadiness.lifecycle,
            security: options.e2bReadiness.security,
            limitation: options.e2bReadiness.limitation,
            sourcePaths: [...options.e2bReadiness.sourcePaths],
            ...(options.workspaceMaterialization === undefined
              ? {}
              : {
                  workspaceMaterialization: {
                    ...options.workspaceMaterialization,
                    ...(options.workspaceMaterialization.localGit === undefined
                      ? {}
                      : { localGit: { ...options.workspaceMaterialization.localGit } }),
                    ...(options.workspaceMaterialization.source === undefined
                      ? {}
                      : { source: { ...options.workspaceMaterialization.source } }),
                    exclusions: { ...options.workspaceMaterialization.exclusions },
                    runtimePrerequisites: [...options.workspaceMaterialization.runtimePrerequisites],
                    limitations: [...options.workspaceMaterialization.limitations],
                    sourcePaths: [...options.workspaceMaterialization.sourcePaths],
                    blockers: options.workspaceMaterialization.blockers.map(blocker => ({ ...blocker })),
                    commandPreview: options.workspaceMaterialization.commandPreview.map(command => ({
                      argv: [...command.argv],
                    })),
                    credentialInspected: false as const,
                    networkContacted: false as const,
                    workspaceTransferred: false as const,
                    remoteRuntimeStarted: false as const,
                    externalActionsPerformed: false as const,
                  },
                }),
            webTransition: {
              id: options.e2bReadiness.webTransition.id,
              label: options.e2bReadiness.webTransition.label,
              state: options.e2bReadiness.webTransition.state,
              candidateAvailable: false as const,
              hostPlatform: options.e2bReadiness.webTransition.hostPlatform,
              participants: options.e2bReadiness.webTransition.participants.map(participant => ({ ...participant })),
              blockers: options.e2bReadiness.webTransition.blockers.map(blocker => ({
                ...blocker,
                sourcePaths: [...blocker.sourcePaths],
              })),
              sessionBoundary: {
                ...options.e2bReadiness.webTransition.sessionBoundary,
                currentFacts: options.e2bReadiness.webTransition.sessionBoundary.currentFacts.map(fact => ({
                  ...fact,
                  sourcePaths: [...fact.sourcePaths],
                })),
                safePlan: {
                  ...options.e2bReadiness.webTransition.sessionBoundary.safePlan,
                  presetChanges: [...options.e2bReadiness.webTransition.sessionBoundary.safePlan.presetChanges],
                },
              },
              externalActionsPerformed: false as const,
            },
          },
        }),
    diagnostics: options.diagnostics.map(diagnostic => ({ ...diagnostic })),
  }
}
