import {
  buildProfileHarnessGraph,
  CURRENT_OFFICIAL_DIRECTORY_PICKER_CONSUMERS,
  DIRECTORY_PICKER_BROWSE_PIN,
  DIRECTORY_PICKER_RESET_AUTO,
  discoverOfficialDshComponentPackages,
  dumpDshConfigFromProfileSources,
  FS_LOCAL_TO_SANDBOX_SWITCH,
  FS_PROVIDER_RESET_TO_OFFICIAL_DEFAULT,
  FS_SANDBOX_TO_LOCAL_REPLACEMENT,
  inspectCurrentOfficialWebSpine,
  planFsProviderReset,
  planFsProviderSwitch,
  planFsSandboxToLocalReplacement,
  planDirectoryPickerBrowsePin,
  planDirectoryPickerResetAuto,
  planTimeContextAdd,
  planTimeContextRemove,
  planScheduleAdd,
  planScheduleRemove,
  planMcpHttpAdd,
  planDeclaredScalarEdits,
  readProfileSources,
  validateDshScalarEdit,
  type DshInstallation,
  type DshDirectoryPickerChangePlan,
  type DshTimeContextChangePlan,
  type DshScheduleChangePlan,
  type DshMcpHttpAddPlan,
  type DshFsProviderChangePlan,
  type DshProviderReplacementPlan,
  type DshProfileSources,
  type DshScalarEditPlan,
  type FsProviderEntryId,
  type CurrentOfficialWebSpineUnavailableReason,
  type SetDeclaredScalarIntent,
  type ValidatedDshScalarEditPlan,
} from '@dsh-graph-control/dsh-adapter'
import {
  analyzeDisableEntry,
  analyzeDisableSet,
  analyzeProviderReplacement,
  analyzeProviderSwitch,
  resolvedEntryActivation,
  selectResolvedServiceFacts,
  type DependencyImpact,
  type ProviderReplacementImpact,
  type RepairCandidate,
  type ResolvedProviderAvailability,
} from '@dsh-graph-control/constraint-engine'

export interface PrepareScalarEditOptions {
  installation: DshInstallation
  profile: string
  dshHome: string
  cwd: string
  patches?: readonly string[]
  targetUri: string
  intent: SetDeclaredScalarIntent
  repairId?: string
  validate?: boolean
}

export interface ScalarEditProposal {
  sources: DshProfileSources
  planned: DshScalarEditPlan
  validation?: ValidatedDshScalarEditPlan
  plan: DshScalarEditPlan | ValidatedDshScalarEditPlan
  dependencyImpact?: DependencyImpact
  selectedRepair?: RepairCandidate
  remainingDependencyImpact?: DependencyImpact
  canApply: boolean
}

export interface InspectFsProviderReplacementOptions {
  sources: DshProfileSources
  graph: ReturnType<typeof buildProfileHarnessGraph>['graph']
  targetUri: string
}

export interface PrepareFsProviderReplacementOptions {
  installation: DshInstallation
  profile: string
  dshHome: string
  cwd: string
  patches?: readonly string[]
  targetUri: string
  validate?: boolean
}

export interface InspectFsProviderSwitchOptions extends InspectFsProviderReplacementOptions {
  targetEntryId: FsProviderEntryId
}

export interface PrepareFsProviderChangeOptions extends PrepareFsProviderReplacementOptions {
  targetEntryId?: FsProviderEntryId
}

export interface ProviderReplacementProposal {
  sources: DshProfileSources
  planned: DshFsProviderChangePlan
  validation?: ValidatedDshScalarEditPlan
  plan: DshFsProviderChangePlan | ValidatedDshScalarEditPlan
  impact: ProviderReplacementImpact
  canApply: true
}

export interface DirectoryPickerChangeProposal {
  sources: DshProfileSources
  planned: DshDirectoryPickerChangePlan
  validation?: ValidatedDshScalarEditPlan
  plan: DshDirectoryPickerChangePlan | ValidatedDshScalarEditPlan
  impact: ProviderReplacementImpact
  canApply: true
}

export type WebStartupDependencyActionUnavailableReason =
  | CurrentOfficialWebSpineUnavailableReason
  | 'web-startup-disabled'

export type WebStartupDependencyActionEligibility =
  | { readonly status: 'available' }
  | {
      readonly status: 'unavailable'
      readonly reason: WebStartupDependencyActionUnavailableReason
    }

/** Gate the bounded Web dependency action on the exact current-official spine. */
export function inspectWebStartupDependencyActionEligibility(
  graph: InspectFsProviderReplacementOptions['graph'],
): WebStartupDependencyActionEligibility {
  const spine = inspectCurrentOfficialWebSpine(graph)
  if (spine.status === 'unavailable') {
    return { status: 'unavailable', reason: spine.reason }
  }
  const startup = spine.components.find(component => component.role === 'startup')
  if (startup === undefined) throw new Error('unreachable: available Web spine has no startup component')
  return startup.activation === 'active'
    ? { status: 'available' }
    : { status: 'unavailable', reason: 'web-startup-disabled' }
}

function assertWebStartupDependencyActionAvailable(
  graph: InspectFsProviderReplacementOptions['graph'],
): void {
  const eligibility = inspectWebStartupDependencyActionEligibility(graph)
  if (eligibility.status === 'unavailable') {
    throw new Error(`web-startup dependency action is unavailable: ${eligibility.reason}`)
  }
}

function directoryPickerConsumerEntryIds(
  graph: InspectFsProviderReplacementOptions['graph'],
): readonly string[] {
  const facts = selectResolvedServiceFacts(graph)
  const matches = CURRENT_OFFICIAL_DIRECTORY_PICKER_CONSUMERS.filter(contract => {
    const consumers = facts.entries.filter(node =>
      node.attributes.entryId === contract.entryId
      && node.attributes.pluginName === contract.pluginName)
    if (consumers.length !== 1) return false
    const consumer = consumers[0]
    if (consumer === undefined || resolvedEntryActivation(consumer) !== 'active') return false
    const service = facts.services.filter(node => node.attributes.name === contract.service)
    if (service.length !== 1) return false
    return facts.requires.filter(edge =>
      edge.from === consumer.id
      && edge.to === service[0]?.id
      && edge.attributes.evidence === 'current-official-contract').length === 1
  })
  if (matches.length !== 1) {
    throw new Error('directoryPicker requires exactly one verified official consumer contract')
  }
  const match = matches[0]
  if (match === undefined) throw new Error('unreachable: directoryPicker consumer contract is missing')
  return [match.entryId]
}

export interface TimeContextChangeImpact {
  entryId: 'time-context'
  pluginName: '@deepseek-ai/dsh-time-context'
  action: 'add' | 'remove'
  label: string
  description: string
  risk: 'safe'
}

export interface TimeContextChangeProposal {
  sources: DshProfileSources
  planned: DshTimeContextChangePlan
  validation?: ValidatedDshScalarEditPlan
  plan: DshTimeContextChangePlan | ValidatedDshScalarEditPlan
  impact: TimeContextChangeImpact
  canApply: true
}

export interface ScheduleChangeImpact {
  entryId: 'schedule'
  pluginName: '@deepseek-ai/dsh-schedule'
  action: 'add' | 'remove'
  label: string
  description: string
  risk: 'review'
}

export interface ScheduleChangeProposal {
  sources: DshProfileSources
  planned: DshScheduleChangePlan
  validation?: ValidatedDshScalarEditPlan
  plan: DshScheduleChangePlan | ValidatedDshScalarEditPlan
  impact: ScheduleChangeImpact
  canApply: true
}

export interface PrepareMcpHttpAddOptions extends PrepareFsProviderReplacementOptions {
  serverName: string
  url: string
}

export interface McpHttpAddImpact {
  entryId: string
  pluginName: '@deepseek-ai/dsh-mcp-client'
  packageVersion: string
  action: 'add'
  serverName: string
  transport: 'streamable-http'
  url: string
  label: string
  description: string
  risk: 'review'
}

export interface McpHttpAddProposal {
  sources: DshProfileSources
  planned: DshMcpHttpAddPlan
  validation?: ValidatedDshScalarEditPlan
  plan: DshMcpHttpAddPlan | ValidatedDshScalarEditPlan
  impact: McpHttpAddImpact
  canApply: true
}

function isDisableIntent(intent: SetDeclaredScalarIntent): boolean {
  return intent.path.length === 1 && intent.path[0] === 'disabled' && intent.value === true
}

const CURRENT_OFFICIAL_WEB_SPINE_ENTRY_IDS = new Set([
  'web-startup',
  'webserver',
  'web-runtime',
  'connection',
])

function isWebSpineDisabledMutation(intent: SetDeclaredScalarIntent): boolean {
  return intent.path.length === 1
    && intent.path[0] === 'disabled'
    && typeof intent.value === 'boolean'
    && CURRENT_OFFICIAL_WEB_SPINE_ENTRY_IDS.has(intent.entryId)
}

function assertCurrentOfficialWebSpineAvailable(
  graph: InspectFsProviderReplacementOptions['graph'],
  entryId: string,
): void {
  const webSpine = inspectCurrentOfficialWebSpine(graph)
  if (webSpine.status === 'unavailable') {
    throw new Error(
      `${entryId}.disabled is read-only because the exact current official Web spine is unavailable: ${webSpine.reason}`,
    )
  }
}

const AGENT_PRESET_STATE_ENTRIES = new Set(['tool-todo', 'tool-goal'])

function assertSupportedScalarIntent(options: PrepareScalarEditOptions): void {
  const mutatesDisabled = options.intent.path.length === 1 && options.intent.path[0] === 'disabled'
  if (mutatesDisabled
    && AGENT_PRESET_STATE_ENTRIES.has(options.intent.entryId)) {
    throw new Error(
      `${options.intent.entryId}.disabled is read-only for DSH ${options.installation.version}: `
      + 'current official ownership lives in Agent presets and must be projected before this write can be enabled',
    )
  }
}

/**
 * Prepare the one scalar-edit use case shared by CLI and Studio. This function
 * refreshes source bytes, computes a bounded dependency repair when needed,
 * and optionally asks official DSH to validate; it never writes the target.
 */
export async function prepareScalarEdit(options: PrepareScalarEditOptions): Promise<ScalarEditProposal> {
  assertSupportedScalarIntent(options)
  const sources = await readProfileSources({
    installation: options.installation,
    profile: options.profile,
    dshHome: options.dshHome,
    cwd: options.cwd,
    ...(options.patches === undefined ? {} : { patches: options.patches }),
  })
  let intents: SetDeclaredScalarIntent[] = [options.intent]
  let dependencyImpact: DependencyImpact | undefined
  let remainingDependencyImpact: DependencyImpact | undefined
  let selectedRepair: RepairCandidate | undefined

  const disablesEntry = isDisableIntent(options.intent)
  const touchesWebSpine = isWebSpineDisabledMutation(options.intent)
  if (disablesEntry || touchesWebSpine) {
    const current = await dumpDshConfigFromProfileSources({
      installation: options.installation,
      sources,
      cwd: options.cwd,
    })
    const projection = buildProfileHarnessGraph({
      installation: options.installation,
      sources,
      config: { mode: 'resolved', text: current.stdout },
    })
    if (touchesWebSpine) {
      assertCurrentOfficialWebSpineAvailable(projection.graph, options.intent.entryId)
    }
    if (disablesEntry && options.intent.entryId === 'web-startup') {
      assertWebStartupDependencyActionAvailable(projection.graph)
    }
    if (disablesEntry) {
      dependencyImpact = analyzeDisableEntry(projection.graph, options.intent.entryId)
      remainingDependencyImpact = dependencyImpact
      if (options.repairId !== undefined) {
        selectedRepair = dependencyImpact.repairs.find(repair => repair.id === options.repairId)
        if (selectedRepair === undefined) {
          throw new Error(`dependency repair ${JSON.stringify(options.repairId)} was not offered by this plan`)
        }
        if (!selectedRepair.supportedByCurrentWriter) {
          throw new Error(`dependency repair ${JSON.stringify(options.repairId)} is preview-only`)
        }
        intents = selectedRepair.id.startsWith('keep-provider:')
          ? [...selectedRepair.followUpIntents]
          : [options.intent, ...selectedRepair.followUpIntents]
        remainingDependencyImpact = selectedRepair.id.startsWith('keep-provider:')
          ? { diagnostics: [], repairs: [] }
          : analyzeDisableSet(projection.graph, [
              options.intent.entryId,
              ...selectedRepair.followUpIntents
                .filter(intent => intent.path.length === 1
                  && intent.path[0] === 'disabled'
                  && intent.value === true)
                .map(intent => intent.entryId),
            ])
      }
    }
  } else if (options.repairId !== undefined) {
    throw new Error('a dependency repair is only available when setting disabled to true')
  }

  const planned = planDeclaredScalarEdits({
    sources,
    targetUri: options.targetUri,
    intents,
  })
  const validation = options.validate === true
    ? await validateDshScalarEdit({
        installation: options.installation,
        sources,
        plan: planned,
        cwd: options.cwd,
        dshHome: options.dshHome,
      })
    : undefined
  const remainingDiagnostics = remainingDependencyImpact?.diagnostics.length ?? 0
  return {
    sources,
    planned,
    ...(validation === undefined ? {} : { validation }),
    plan: validation ?? planned,
    ...(dependencyImpact === undefined ? {} : { dependencyImpact }),
    ...(selectedRepair === undefined ? {} : { selectedRepair }),
    ...(remainingDependencyImpact === undefined ? {} : { remainingDependencyImpact }),
    canApply: remainingDiagnostics === 0,
  }
}

/** Prove writer support and authoritative current graph evidence without I/O. */
export function inspectFsSandboxToLocalReplacement(
  options: InspectFsProviderReplacementOptions,
): { planned: DshProviderReplacementPlan; impact: ProviderReplacementImpact } {
  const contract = FS_SANDBOX_TO_LOCAL_REPLACEMENT
  const impact = analyzeProviderReplacement(options.graph, {
    service: contract.service,
    currentEntryId: contract.currentEntryId,
    currentPluginName: contract.currentPluginName,
    replacementEntryId: contract.replacementEntryId,
    replacementPluginName: contract.replacementPluginName,
    requiredConsumerEntryIds: contract.requiredConsumerEntryIds,
    risk: contract.risk,
    executionWorldDelta: contract.executionWorldDelta,
    securityDelta: contract.securityDelta,
  })
  const planned = planFsSandboxToLocalReplacement({
    sources: options.sources,
    targetUri: options.targetUri,
  })
  return { planned, impact }
}

/** Prove the exact reversible pair and map its inactive provider to one switch. */
export function inspectFsProviderSwitch(
  options: InspectFsProviderSwitchOptions,
): { planned: DshFsProviderChangePlan; impact: ProviderReplacementImpact } {
  const contract = options.targetEntryId === 'fs-sandbox'
    ? FS_LOCAL_TO_SANDBOX_SWITCH
    : FS_SANDBOX_TO_LOCAL_REPLACEMENT
  const impact = analyzeProviderSwitch(options.graph, {
    service: contract.service,
    currentEntryId: contract.currentEntryId,
    currentPluginName: contract.currentPluginName,
    replacementEntryId: contract.replacementEntryId,
    replacementPluginName: contract.replacementPluginName,
    requiredConsumerEntryIds: contract.requiredConsumerEntryIds,
    risk: contract.risk,
    executionWorldDelta: contract.executionWorldDelta,
    securityDelta: contract.securityDelta,
  })
  const planned = planFsProviderSwitch({
    sources: options.sources,
    targetUri: options.targetUri,
    targetEntryId: options.targetEntryId,
  })
  return { planned, impact }
}

/** Prove that the safe exact pair can be removed back to the official default. */
export function inspectFsProviderReset(
  options: InspectFsProviderReplacementOptions,
): { planned: DshFsProviderChangePlan; impact: ProviderReplacementImpact } {
  const contract = FS_PROVIDER_RESET_TO_OFFICIAL_DEFAULT
  const impact = analyzeProviderSwitch(options.graph, {
    service: contract.service,
    currentEntryId: contract.currentEntryId,
    currentPluginName: contract.currentPluginName,
    replacementEntryId: contract.replacementEntryId,
    replacementPluginName: contract.replacementPluginName,
    requiredConsumerEntryIds: contract.requiredConsumerEntryIds,
    risk: contract.risk,
    executionWorldDelta: contract.executionWorldDelta,
    securityDelta: contract.securityDelta,
  })
  const planned = planFsProviderReset({
    sources: options.sources,
    targetUri: options.targetUri,
  })
  return { planned, impact }
}

function resolvedActivation(
  graph: InspectFsProviderReplacementOptions['graph'],
  entryId: FsProviderEntryId,
): ResolvedProviderAvailability | undefined {
  const facts = selectResolvedServiceFacts(graph)
  const matches = facts.entries.filter(node => node.attributes.entryId === entryId)
  if (matches.length === 0) return undefined
  if (matches.length > 1) throw new Error(`resolved entry ${JSON.stringify(entryId)} is ambiguous`)
  const match = matches[0]
  if (match === undefined) throw new Error('unreachable: resolved provider entry is missing')
  return resolvedEntryActivation(match)
}

/** Select the initial insertion or the one available reverse/forward switch. */
export function inspectFsProviderChange(
  options: InspectFsProviderReplacementOptions & { targetEntryId?: FsProviderEntryId },
): { planned: DshFsProviderChangePlan; impact: ProviderReplacementImpact } {
  const localActivation = resolvedActivation(options.graph, 'fs-local')
  if (localActivation === undefined) {
    if (options.targetEntryId === 'fs-sandbox') {
      throw new Error('fs-local must be inserted before the provider pair can switch to fs-sandbox')
    }
    return inspectFsSandboxToLocalReplacement(options)
  }
  const sandboxActivation = resolvedActivation(options.graph, 'fs-sandbox')
  if (sandboxActivation === undefined) throw new Error('resolved entry "fs-sandbox" was not found')
  if (localActivation === 'unknown' || sandboxActivation === 'unknown') {
    throw new Error('provider switch requires explicit active/disabled state for both providers')
  }
  if (sandboxActivation === localActivation) {
    throw new Error(`provider switch requires exactly one active provider; both are ${sandboxActivation}`)
  }
  const targetEntryId = options.targetEntryId
    ?? (sandboxActivation === 'disabled' ? 'fs-sandbox' : 'fs-local')
  return inspectFsProviderSwitch({ ...options, targetEntryId })
}

/** Prepare and optionally officially validate the first real provider replacement. */
export async function prepareFsSandboxToLocalReplacement(
  options: PrepareFsProviderReplacementOptions,
): Promise<ProviderReplacementProposal> {
  return await prepareFsProviderChange({ ...options, targetEntryId: 'fs-local' })
}

/** Refresh, prove, plan, and optionally officially validate one fs-provider change. */
export async function prepareFsProviderChange(
  options: PrepareFsProviderChangeOptions,
): Promise<ProviderReplacementProposal> {
  const sources = await readProfileSources({
    installation: options.installation,
    profile: options.profile,
    dshHome: options.dshHome,
    cwd: options.cwd,
    ...(options.patches === undefined ? {} : { patches: options.patches }),
  })
  const current = await dumpDshConfigFromProfileSources({
    installation: options.installation,
    sources,
    cwd: options.cwd,
  })
  const projection = buildProfileHarnessGraph({
    installation: options.installation,
    sources,
    config: { mode: 'resolved', text: current.stdout },
  })
  const { planned, impact } = inspectFsProviderChange({
    sources,
    graph: projection.graph,
    targetUri: options.targetUri,
    ...(options.targetEntryId === undefined ? {} : { targetEntryId: options.targetEntryId }),
  })
  const validation = options.validate === true
    ? await validateDshScalarEdit({
        installation: options.installation,
        sources,
        plan: planned,
        cwd: options.cwd,
        dshHome: options.dshHome,
      })
    : undefined
  return {
    sources,
    planned,
    ...(validation === undefined ? {} : { validation }),
    plan: validation ?? planned,
    impact,
    canApply: true,
  }
}

/** Refresh, prove, plan, and optionally validate the exact official-default reset. */
export async function prepareFsProviderReset(
  options: PrepareFsProviderReplacementOptions,
): Promise<ProviderReplacementProposal> {
  const sources = await readProfileSources({
    installation: options.installation,
    profile: options.profile,
    dshHome: options.dshHome,
    cwd: options.cwd,
    ...(options.patches === undefined ? {} : { patches: options.patches }),
  })
  const current = await dumpDshConfigFromProfileSources({
    installation: options.installation,
    sources,
    cwd: options.cwd,
  })
  const projection = buildProfileHarnessGraph({
    installation: options.installation,
    sources,
    config: { mode: 'resolved', text: current.stdout },
  })
  const { planned, impact } = inspectFsProviderReset({
    sources,
    graph: projection.graph,
    targetUri: options.targetUri,
  })
  const validation = options.validate === true
    ? await validateDshScalarEdit({
        installation: options.installation,
        sources,
        plan: planned,
        cwd: options.cwd,
        dshHome: options.dshHome,
      })
    : undefined
  return {
    sources,
    planned,
    ...(validation === undefined ? {} : { validation }),
    plan: validation ?? planned,
    impact,
    canApply: true,
  }
}

/** Prove the exact official auto -> host/client browse pin without I/O. */
export function inspectDirectoryPickerBrowsePin(
  options: InspectFsProviderReplacementOptions,
): { planned: DshDirectoryPickerChangePlan; impact: ProviderReplacementImpact } {
  const contract = DIRECTORY_PICKER_BROWSE_PIN
  const requiredConsumerEntryIds = directoryPickerConsumerEntryIds(options.graph)
  const impact = analyzeProviderReplacement(options.graph, {
    service: contract.service,
    currentEntryId: contract.currentEntryId,
    currentPluginName: contract.currentPluginName,
    replacementEntryId: contract.replacementEntryId,
    replacementPluginName: contract.replacementPluginName,
    requiredConsumerEntryIds,
    risk: contract.risk,
    executionWorldDelta: contract.executionWorldDelta,
    securityDelta: contract.securityDelta,
  })
  const planned = planDirectoryPickerBrowsePin({
    sources: options.sources,
    targetUri: options.targetUri,
  })
  return { planned, impact }
}

/** Prove the exact browse pin can be removed back to the official adaptive chooser. */
export function inspectDirectoryPickerResetAuto(
  options: InspectFsProviderReplacementOptions,
): { planned: DshDirectoryPickerChangePlan; impact: ProviderReplacementImpact } {
  const contract = DIRECTORY_PICKER_RESET_AUTO
  const requiredConsumerEntryIds = directoryPickerConsumerEntryIds(options.graph)
  const impact = analyzeProviderSwitch(options.graph, {
    service: contract.service,
    currentEntryId: contract.currentEntryId,
    currentPluginName: contract.currentPluginName,
    replacementEntryId: contract.replacementEntryId,
    replacementPluginName: contract.replacementPluginName,
    requiredConsumerEntryIds,
    risk: contract.risk,
    executionWorldDelta: contract.executionWorldDelta,
    securityDelta: contract.securityDelta,
  })
  const planned = planDirectoryPickerResetAuto({
    sources: options.sources,
    targetUri: options.targetUri,
  })
  return { planned, impact }
}

/** Select pin or reset from the reimported resolved profile. */
export function inspectDirectoryPickerChange(
  options: InspectFsProviderReplacementOptions,
): { planned: DshDirectoryPickerChangePlan; impact: ProviderReplacementImpact } {
  const facts = selectResolvedServiceFacts(options.graph)
  const browse = facts.entries.filter(node =>
    node.attributes.entryId === DIRECTORY_PICKER_BROWSE_PIN.replacementEntryId)
  if (browse.length === 0) return inspectDirectoryPickerBrowsePin(options)
  if (browse.length > 1) throw new Error('resolved directory-picker browse provider is ambiguous')
  const current = browse[0]
  if (current === undefined) throw new Error('unreachable: resolved directory-picker browse provider is missing')
  const activation = resolvedEntryActivation(current)
  if (activation !== 'active') {
    throw new Error(`resolved directory-picker browse provider is ${activation}`)
  }
  return inspectDirectoryPickerResetAuto(options)
}

/** Refresh, prove, plan, and optionally validate the directory-picker lifecycle action. */
export async function prepareDirectoryPickerChange(
  options: PrepareFsProviderReplacementOptions,
): Promise<DirectoryPickerChangeProposal> {
  const sources = await readProfileSources({
    installation: options.installation,
    profile: options.profile,
    dshHome: options.dshHome,
    cwd: options.cwd,
    ...(options.patches === undefined ? {} : { patches: options.patches }),
  })
  const current = await dumpDshConfigFromProfileSources({
    installation: options.installation,
    sources,
    cwd: options.cwd,
  })
  const projection = buildProfileHarnessGraph({
    installation: options.installation,
    sources,
    config: { mode: 'resolved', text: current.stdout },
  })
  const { planned, impact } = inspectDirectoryPickerChange({
    sources,
    graph: projection.graph,
    targetUri: options.targetUri,
  })
  const validation = options.validate === true
    ? await validateDshScalarEdit({
        installation: options.installation,
        sources,
        plan: planned,
        cwd: options.cwd,
        dshHome: options.dshHome,
      })
    : undefined
  return {
    sources,
    planned,
    ...(validation === undefined ? {} : { validation }),
    plan: validation ?? planned,
    impact,
    canApply: true,
  }
}

/** Select the exact add/remove action from the current official resolved graph. */
export function inspectTimeContextChange(
  options: InspectFsProviderReplacementOptions,
): { planned: DshTimeContextChangePlan; impact: TimeContextChangeImpact } {
  const matches = options.graph.nodes.filter(node =>
    node.plane === 'resolved' && node.attributes.entryId === 'time-context')
  if (matches.length > 1) throw new Error('resolved time-context plugin is ambiguous')
  const resolved = matches[0]
  if (resolved !== undefined
    && resolved.attributes.pluginName !== '@deepseek-ai/dsh-time-context') {
    throw new Error('resolved time-context entry does not match the current official plugin')
  }
  const action = resolved === undefined ? 'add' as const : 'remove' as const
  const planned = action === 'add'
    ? planTimeContextAdd({ sources: options.sources, targetUri: options.targetUri })
    : planTimeContextRemove({ sources: options.sources, targetUri: options.targetUri })
  return {
    planned,
    impact: {
      entryId: 'time-context',
      pluginName: '@deepseek-ai/dsh-time-context',
      action,
      label: action === 'add' ? 'Let the Agent know the current time' : 'Remove current time awareness',
      description: action === 'add'
        ? 'Provides the current zoned time, browser time zone, and elapsed session time.'
        : 'Stops adding current time and elapsed-time context to Agent steps.',
      risk: 'safe',
    },
  }
}

/** Refresh, plan, and optionally validate the bounded time-context lifecycle. */
export async function prepareTimeContextChange(
  options: PrepareFsProviderReplacementOptions,
): Promise<TimeContextChangeProposal> {
  const sources = await readProfileSources({
    installation: options.installation,
    profile: options.profile,
    dshHome: options.dshHome,
    cwd: options.cwd,
    ...(options.patches === undefined ? {} : { patches: options.patches }),
  })
  const current = await dumpDshConfigFromProfileSources({
    installation: options.installation,
    sources,
    cwd: options.cwd,
  })
  const projection = buildProfileHarnessGraph({
    installation: options.installation,
    sources,
    config: { mode: 'resolved', text: current.stdout },
  })
  const { planned, impact } = inspectTimeContextChange({
    sources,
    graph: projection.graph,
    targetUri: options.targetUri,
  })
  const validation = options.validate === true
    ? await validateDshScalarEdit({
        installation: options.installation,
        sources,
        plan: planned,
        cwd: options.cwd,
        dshHome: options.dshHome,
      })
    : undefined
  return {
    sources,
    planned,
    ...(validation === undefined ? {} : { validation }),
    plan: validation ?? planned,
    impact,
    canApply: true,
  }
}

/** Select the exact add/remove action from the current official resolved graph. */
export function inspectScheduleChange(
  options: InspectFsProviderReplacementOptions,
): { planned: DshScheduleChangePlan; impact: ScheduleChangeImpact } {
  const matches = options.graph.nodes.filter(node =>
    node.plane === 'resolved' && node.attributes.entryId === 'schedule')
  if (matches.length > 1) throw new Error('resolved Schedule plugin is ambiguous')
  const resolved = matches[0]
  if (resolved !== undefined
    && resolved.attributes.pluginName !== '@deepseek-ai/dsh-schedule') {
    throw new Error('resolved Schedule entry does not match the current official plugin')
  }
  const action = resolved === undefined ? 'add' as const : 'remove' as const
  const planned = action === 'add'
    ? planScheduleAdd({ sources: options.sources, targetUri: options.targetUri })
    : planScheduleRemove({ sources: options.sources, targetUri: options.targetUri })
  return {
    planned,
    impact: {
      entryId: 'schedule',
      pluginName: '@deepseek-ai/dsh-schedule',
      action,
      label: action === 'add' ? 'Let the Agent set Session-local reminders' : 'Remove Session-local reminders',
      description: action === 'add'
        ? 'Adds delayed, explicit-time, and fixed-interval reminders delivered in the original DSH conversation.'
        : 'Stops new Agents from creating Session-local reminders; existing Session logs remain user data.',
      risk: 'review',
    },
  }
}

/** Refresh, plan, and optionally validate the bounded Schedule lifecycle. */
export async function prepareScheduleChange(
  options: PrepareFsProviderReplacementOptions,
): Promise<ScheduleChangeProposal> {
  const sources = await readProfileSources({
    installation: options.installation,
    profile: options.profile,
    dshHome: options.dshHome,
    cwd: options.cwd,
    ...(options.patches === undefined ? {} : { patches: options.patches }),
  })
  const current = await dumpDshConfigFromProfileSources({
    installation: options.installation,
    sources,
    cwd: options.cwd,
  })
  const projection = buildProfileHarnessGraph({
    installation: options.installation,
    sources,
    config: { mode: 'resolved', text: current.stdout },
  })
  const { planned, impact } = inspectScheduleChange({
    sources,
    graph: projection.graph,
    targetUri: options.targetUri,
  })
  const validation = options.validate === true
    ? await validateDshScalarEdit({
        installation: options.installation,
        sources,
        plan: planned,
        cwd: options.cwd,
        dshHome: options.dshHome,
      })
    : undefined
  return {
    sources,
    planned,
    ...(validation === undefined ? {} : { validation }),
    plan: validation ?? planned,
    impact,
    canApply: true,
  }
}

function resolvedEntryConfig(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const config = (value as Record<string, unknown>).config
  return config !== null && typeof config === 'object' && !Array.isArray(config)
    ? config as Readonly<Record<string, unknown>>
    : undefined
}

/**
 * Discover the bundled official MCP bridge, prove namespace/id uniqueness in
 * the current resolved profile, then prepare one no-credential HTTP entry.
 */
export async function prepareMcpHttpAdd(
  options: PrepareMcpHttpAddOptions,
): Promise<McpHttpAddProposal> {
  const packages = await discoverOfficialDshComponentPackages(options.installation)
  const installed = packages.find(component => component.id === 'mcp-streamable-http')
  if (installed?.installed !== true || installed.version === undefined) {
    throw new Error('the selected official DSH CLI does not contain @deepseek-ai/dsh-mcp-client')
  }
  const sources = await readProfileSources({
    installation: options.installation,
    profile: options.profile,
    dshHome: options.dshHome,
    cwd: options.cwd,
    ...(options.patches === undefined ? {} : { patches: options.patches }),
  })
  const current = await dumpDshConfigFromProfileSources({
    installation: options.installation,
    sources,
    cwd: options.cwd,
  })
  const projection = buildProfileHarnessGraph({
    installation: options.installation,
    sources,
    config: { mode: 'resolved', text: current.stdout },
  })
  const planned = planMcpHttpAdd({
    sources,
    targetUri: options.targetUri,
    serverName: options.serverName,
    url: options.url,
  })
  const collision = projection.graph.nodes.find(node =>
    node.plane === 'resolved' && node.attributes.entryId === planned.mcpHttpChange.entryId)
  if (collision !== undefined) {
    throw new Error(`resolved DSH entry ${JSON.stringify(planned.mcpHttpChange.entryId)} already exists`)
  }
  const duplicateNamespace = projection.graph.nodes.find(node => {
    if (node.plane !== 'resolved'
      || node.attributes.pluginName !== planned.mcpHttpChange.pluginName) return false
    return resolvedEntryConfig(node.attributes.value)?.serverName === planned.mcpHttpChange.serverName
  })
  if (duplicateNamespace !== undefined) {
    throw new Error(`MCP server name ${JSON.stringify(planned.mcpHttpChange.serverName)} is already active`)
  }
  const validation = options.validate === true
    ? await validateDshScalarEdit({
        installation: options.installation,
        sources,
        plan: planned,
        cwd: options.cwd,
        dshHome: options.dshHome,
      })
    : undefined
  return {
    sources,
    planned,
    ...(validation === undefined ? {} : { validation }),
    plan: validation ?? planned,
    impact: {
      entryId: planned.mcpHttpChange.entryId,
      pluginName: planned.mcpHttpChange.pluginName,
      packageVersion: installed.version,
      action: 'add',
      serverName: planned.mcpHttpChange.serverName,
      transport: planned.mcpHttpChange.transport,
      url: planned.mcpHttpChange.url,
      label: `Connect MCP server ${planned.mcpHttpChange.serverName}`,
      description: 'Adds the server tools to the Agent under a stable namespace. No headers or credentials are stored by this flow.',
      risk: planned.mcpHttpChange.risk,
    },
    canApply: true,
  }
}
