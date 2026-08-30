import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  buildProfileHarnessGraph,
  discoverOfficialDshComponentPackages,
  dumpDshConfigFromProfileSources,
  normalizeMcpHttpComponentInput,
  proveCurrentOfficialSubprocessRemovalBoundary,
  readProfileSources,
  validateDshScalarEditCandidate,
  type DshInstallation,
  type DshProfileSources,
  type DshScalarEditPlan,
  type SetDeclaredScalarIntent,
  type OfficialDshComponentPackageEvidence,
  type CurrentOfficialSubprocessRemovalBoundary,
  type ValidatedDshScalarEditPlan,
  type YamlScalarEditPreview,
} from '@dsh-graph-control/dsh-adapter'
import { createEditPlan, type TextChange } from '@dsh-graph-control/edit-transaction'
import {
  resolvedEntryActivation,
  selectResolvedServiceFacts,
} from '@dsh-graph-control/harness-graph'
import {
  prepareDirectoryPickerChange,
  prepareFsProviderChange,
  prepareFsProviderReset,
  prepareMcpHttpAdd,
  prepareScheduleChange,
  prepareScalarEdit,
  prepareTimeContextChange,
  type DirectoryPickerChangeProposal,
  type ProviderReplacementProposal,
  type ScalarEditProposal,
  type McpHttpAddProposal,
  type ScheduleChangeProposal,
  type TimeContextChangeProposal,
} from '@dsh-graph-control/profile-edit'
import { createStudioInspection, type StudioInspection } from './inspection.ts'

export const COMPOSER_DRAFT_ACTION_IDS = [
  'fs-sandbox-to-local',
  'fs-local-to-sandbox',
  'fs-provider-reset-official-default',
  'directory-picker-pin-browse',
  'directory-picker-reset-auto',
  'time-context-add',
  'time-context-remove',
  'schedule-add',
  'schedule-remove',
  'fs-provider-remove',
  'fs-provider-remove-with-sandbox',
  'subprocess-provider-remove',
  'web-startup-disable',
  'web-startup-disable-with-consumers',
] as const

export const WEB_STARTUP_DISABLE_REPAIR_ID = 'disable-consumers:webStartup'
export const FS_PROVIDER_REMOVE_REPAIR_ID = 'switch-provider:fs:fs-sandbox'

export type ComposerDraftStaticActionId = typeof COMPOSER_DRAFT_ACTION_IDS[number]
export type ComposerDraftActionId = ComposerDraftStaticActionId
  | `scalar-disabled:${'true' | 'false'}:${string}`
  | `mcp-http-add:${string}:${string}`

export type ComposerDraftConflictReason =
  | 'already-pending'
  | 'resolve-first'
  | 'cannot-combine'
  | 'tray-full'

export type ComposerDraftConflictSafeNextAction =
  | 'review-or-remove'
  | 'repair-or-remove'
  | 'remove-or-clear'
  | 'finish-current-first'
  | 'remove-one-or-clear'

export interface ComposerDraftConflict {
  code: 'COMPOSER_DRAFT_CONFLICT'
  reason: ComposerDraftConflictReason
  attemptedActionId: ComposerDraftActionId
  conflictingActionIds: readonly ComposerDraftActionId[]
  safeNextAction: ComposerDraftConflictSafeNextAction
  repairIds: readonly string[]
  writePerformed: false
}

/** A valid action is no longer valid after replaying the preceding bounded draft actions. */
export class ComposerDraftBoundedSequenceError extends Error {
  readonly attemptedActionId: ComposerDraftActionId
  readonly precedingActionIds: readonly ComposerDraftActionId[]

  constructor(
    attemptedActionId: ComposerDraftActionId,
    precedingActionIds: readonly ComposerDraftActionId[],
  ) {
    super(`Composer action ${JSON.stringify(attemptedActionId)} is not valid after the preceding draft actions`)
    this.name = 'ComposerDraftBoundedSequenceError'
    this.attemptedActionId = attemptedActionId
    this.precedingActionIds = precedingActionIds
  }
}

interface ScalarDisabledComposerAction {
  entryId: string
  value: boolean
}

interface McpHttpComposerAction {
  entryId: string
  serverName: string
  url: string
}

const SCALAR_DISABLED_ACTION_PREFIX = 'scalar-disabled:'
const MCP_HTTP_ACTION_PREFIX = 'mcp-http-add:'

export interface PrepareComposerDraftOptions {
  installation: DshInstallation
  profile: string
  dshHome: string
  cwd: string
  targetUri: string
  actionIds: readonly ComposerDraftActionId[]
  patches?: readonly string[]
}

export interface ComposerDraftOperation {
  actionId: ComposerDraftActionId
  service: string
  mode: 'initial' | 'switch' | 'reset' | 'pin-browse' | 'reset-auto' | 'add-plugin' | 'remove-plugin' | 'disable' | 'disable-with-repair' | 'remove-provider' | 'remove-provider-with-repair' | 'remove-provider-without-repair' | 'set-enabled' | 'set-disabled'
  summary: string
  changes: readonly TextChange[]
  semanticChange: Readonly<Record<string, unknown>>
  expandedIntents: readonly SetDeclaredScalarIntent[]
  dependencyImpact?: NonNullable<ScalarEditProposal['dependencyImpact']>
  selectedRepair?: NonNullable<ScalarEditProposal['selectedRepair']>
  remainingDependencyImpact?: NonNullable<ScalarEditProposal['remainingDependencyImpact']>
  subprocessBoundary?: CurrentOfficialSubprocessRemovalBoundary
}

export interface ComposerDraftCandidateGraph {
  counts: {
    nodes: number
    edges: number
    declared: number
    resolved: number
    observed: number
  }
  services: readonly {
    name: string
    availability: 'available' | 'unavailable' | 'conflicting' | 'unknown'
    activeProviderEntryIds: readonly string[]
  }[]
  affectedEntryIds: readonly string[]
  inspection: Pick<StudioInspection, 'counts' | 'nodes' | 'edges' | 'services' | 'pluginActions' | 'componentCatalog'>
}

interface PreparedComposerDraftBase {
  sources: DshProfileSources
  plan: DshScalarEditPlan
  operations: readonly ComposerDraftOperation[]
}

export interface PreparedBlockedComposerDraft extends PreparedComposerDraftBase {
  state: 'blocked'
}

export interface PreparedValidatedComposerDraft extends PreparedComposerDraftBase {
  state: 'validated'
  validation: ValidatedDshScalarEditPlan
  candidate: ComposerDraftCandidateGraph
}

export type PreparedComposerDraft = PreparedBlockedComposerDraft | PreparedValidatedComposerDraft

type CompositionProposal = ProviderReplacementProposal
  | DirectoryPickerChangeProposal
  | TimeContextChangeProposal
  | ScheduleChangeProposal
  | McpHttpAddProposal
type DraftProposal = CompositionProposal | ScalarEditProposal

function isWebDependencyAction(actionId: ComposerDraftActionId): boolean {
  return actionId === 'web-startup-disable' || actionId === 'web-startup-disable-with-consumers'
}

function isFsProviderRemovalAction(actionId: ComposerDraftActionId): boolean {
  return actionId === 'fs-provider-remove' || actionId === 'fs-provider-remove-with-sandbox'
}

function isSubprocessProviderRemovalAction(actionId: ComposerDraftActionId): boolean {
  return actionId === 'subprocess-provider-remove'
}

function fsProviderRemovalRepair(): NonNullable<ScalarEditProposal['selectedRepair']> {
  return {
    id: FS_PROVIDER_REMOVE_REPAIR_ID,
    label: 'Switch ctx.fs to fs-sandbox',
    risk: 'review',
    explanation: 'Disables fs-local and activates the existing official fs-sandbox provider so File tools and Text editor keep ctx.fs.',
    affectedEntityIds: [
      'fs-local',
      'fs-sandbox',
      'tool-fs',
      'tool-str-replace-editor',
    ],
    followUpIntents: [
      {
        kind: 'set-declared-scalar',
        entryId: 'fs-local',
        path: ['disabled'],
        value: true,
      },
      {
        kind: 'set-declared-scalar',
        entryId: 'fs-sandbox',
        path: ['disabled'],
        value: false,
      },
    ],
    supportedByCurrentWriter: true,
  }
}

function fsProviderRemovalImpact(
  impact: ProviderReplacementProposal['impact'],
): NonNullable<ScalarEditProposal['dependencyImpact']> {
  if (impact.service !== 'fs'
    || impact.currentEntryId !== 'fs-local'
    || impact.replacementEntryId !== 'fs-sandbox'
    || !impact.requiredConsumerEntryIds.includes('tool-fs')
    || !impact.requiredConsumerEntryIds.includes('tool-str-replace-editor')) {
    throw new Error('the current graph does not prove the exact ctx.fs sandbox repair contract')
  }
  return {
    diagnostics: [{
      code: 'MISSING_REQUIRED_SERVICE',
      severity: 'error',
      message: `Removing fs-local would leave ctx.fs without an active provider; required consumers: ${impact.requiredConsumerEntryIds.join(', ')}.`,
      entityIds: [impact.currentProviderNodeId, 'resolved:service:fs', ...impact.requiredConsumerEntryIds],
      evidenceEdgeIds: [...impact.evidenceEdgeIds],
      repairCandidateIds: [FS_PROVIDER_REMOVE_REPAIR_ID],
      confidence: 'authoritative',
    }],
    repairs: [fsProviderRemovalRepair()],
  }
}

async function proveSubprocessProviderRemovalBoundary(options: {
  installation: DshInstallation
  profile: string
  dshHome: string
  cwd: string
  sources: DshProfileSources
}): Promise<CurrentOfficialSubprocessRemovalBoundary> {
  const current = await dumpDshConfigFromProfileSources({
    installation: options.installation,
    sources: options.sources,
    cwd: options.cwd,
  })
  const { graph } = buildProfileHarnessGraph({
    installation: options.installation,
    sources: options.sources,
    config: { mode: 'resolved', text: current.stdout },
  })
  return proveCurrentOfficialSubprocessRemovalBoundary(graph)
}

function subprocessProviderRemovalImpact(
  boundary: CurrentOfficialSubprocessRemovalBoundary,
): NonNullable<ScalarEditProposal['dependencyImpact']> {
  return {
    diagnostics: [{
      code: 'MISSING_REQUIRED_SERVICE',
      severity: 'error',
      message: 'Removing subprocess would leave ctx.subprocess without an active Provider. No alternate Provider is composed; the platform-controlled command components and disabled file search still declare this service.',
      entityIds: [
        boundary.providerNodeId,
        boundary.serviceNodeId,
        ...boundary.consumers.map(consumer => consumer.nodeId),
      ],
      evidenceEdgeIds: [...boundary.evidenceEdgeIds],
      repairCandidateIds: [],
      confidence: 'authoritative',
    }],
    repairs: [],
  }
}

function parseScalarDisabledAction(actionId: string): ScalarDisabledComposerAction | undefined {
  if (!actionId.startsWith(SCALAR_DISABLED_ACTION_PREFIX)) return undefined
  const match = /^scalar-disabled:(true|false):(.+)$/u.exec(actionId)
  if (match === null) throw new Error('the Composer scalar action is malformed')
  const encodedEntryId = match[2]
  if (encodedEntryId === undefined) throw new Error('the Composer scalar action is malformed')
  let entryId: string
  try {
    entryId = decodeURIComponent(encodedEntryId)
  } catch {
    throw new Error('the Composer scalar action contains an invalid entry id encoding')
  }
  if (entryId === '' || entryId.length > 256 || /[\u0000-\u001f\u007f]/u.test(entryId)) {
    throw new Error('the Composer scalar action entry id is invalid')
  }
  if (encodeURIComponent(entryId) !== encodedEntryId) {
    throw new Error('the Composer scalar action entry id is not canonically encoded')
  }
  return { entryId, value: match[1] === 'true' }
}

export function createScalarDisabledActionId(entryId: string, value: boolean): ComposerDraftActionId {
  const actionId = `${SCALAR_DISABLED_ACTION_PREFIX}${String(value)}:${encodeURIComponent(entryId)}`
  parseScalarDisabledAction(actionId)
  return actionId as ComposerDraftActionId
}

function parseMcpHttpAction(actionId: string): McpHttpComposerAction | undefined {
  if (!actionId.startsWith(MCP_HTTP_ACTION_PREFIX)) return undefined
  const match = /^mcp-http-add:([^:]+):(.+)$/u.exec(actionId)
  if (match === null || match[1] === undefined || match[2] === undefined) {
    throw new Error('the Composer MCP HTTP action is malformed')
  }
  let serverName: string
  let url: string
  try {
    serverName = decodeURIComponent(match[1])
    url = decodeURIComponent(match[2])
  } catch {
    throw new Error('the Composer MCP HTTP action contains invalid encoding')
  }
  const normalized = normalizeMcpHttpComponentInput({ serverName, url })
  if (normalized.serverName !== serverName
    || normalized.url !== url
    || encodeURIComponent(serverName) !== match[1]
    || encodeURIComponent(url) !== match[2]) {
    throw new Error('the Composer MCP HTTP action is not canonically encoded')
  }
  return normalized
}

export function createMcpHttpAddActionId(serverName: string, url: string): ComposerDraftActionId {
  const normalized = normalizeMcpHttpComponentInput({ serverName, url })
  const actionId = `${MCP_HTTP_ACTION_PREFIX}${encodeURIComponent(normalized.serverName)}:${encodeURIComponent(normalized.url)}`
  parseMcpHttpAction(actionId)
  return actionId as ComposerDraftActionId
}

export function composerDraftActionFamily(actionId: ComposerDraftActionId): string {
  if (isWebDependencyAction(actionId)) return 'web-startup-disable'
  if (isFsProviderRemovalAction(actionId)
    || actionId === 'fs-sandbox-to-local'
    || actionId === 'fs-local-to-sandbox'
    || actionId === 'fs-provider-reset-official-default') return 'fs-provider'
  if (isSubprocessProviderRemovalAction(actionId)) return 'subprocess-provider-remove'
  if (actionId === 'directory-picker-pin-browse'
    || actionId === 'directory-picker-reset-auto') return 'directory-picker'
  if (actionId === 'time-context-add' || actionId === 'time-context-remove') return 'time-context'
  if (actionId === 'schedule-add' || actionId === 'schedule-remove') return 'schedule'
  const mcp = parseMcpHttpAction(actionId)
  if (mcp !== undefined) return `mcp-http:${mcp.serverName}`
  const scalar = parseScalarDisabledAction(actionId)
  if (scalar?.entryId === 'time-context') return 'time-context'
  if (scalar?.entryId === 'schedule') return 'schedule'
  return scalar === undefined ? actionId : `scalar-disabled:${scalar.entryId}`
}

function isComposerDraftActionId(value: string): value is ComposerDraftActionId {
  return (COMPOSER_DRAFT_ACTION_IDS as readonly string[]).includes(value)
    || parseMcpHttpAction(value) !== undefined
    || parseScalarDisabledAction(value) !== undefined
}

export function parseComposerDraftActionId(value: unknown): ComposerDraftActionId {
  if (typeof value !== 'string' || !isComposerDraftActionId(value)) {
    throw new Error('this Composer action is not supported by the current draft writer')
  }
  return value
}

function proposalAction(proposal: CompositionProposal): {
  id: string
  mode: ComposerDraftOperation['mode']
} {
  if ('providerChangeMode' in proposal.planned) {
    return {
      id: proposal.planned.providerReplacement.id,
      mode: proposal.planned.providerChangeMode,
    }
  }
  if ('timeContextMode' in proposal.planned) {
    return {
      id: proposal.planned.timeContextChange.id,
      mode: proposal.planned.timeContextMode,
    }
  }
  if ('scheduleMode' in proposal.planned) {
    return {
      id: proposal.planned.scheduleChange.id,
      mode: proposal.planned.scheduleMode,
    }
  }
  if ('mcpHttpMode' in proposal.planned) {
    return {
      id: createMcpHttpAddActionId(
        proposal.planned.mcpHttpChange.serverName,
        proposal.planned.mcpHttpChange.url,
      ),
      mode: proposal.planned.mcpHttpMode,
    }
  }
  return {
    id: proposal.planned.directoryPickerChange.id,
    mode: proposal.planned.directoryPickerMode,
  }
}

async function prepareAction(options: {
  actionId: ComposerDraftActionId
  installation: DshInstallation
  profile: string
  dshHome: string
  cwd: string
  targetUri: string
}): Promise<DraftProposal> {
  const common = {
    installation: options.installation,
    profile: options.profile,
    dshHome: options.dshHome,
    cwd: options.cwd,
    targetUri: options.targetUri,
    validate: false,
  } as const
  const scalarAction = parseScalarDisabledAction(options.actionId)
  if (scalarAction !== undefined) {
    if (scalarAction.entryId === 'web-startup' && scalarAction.value) {
      throw new Error('disable web-startup through its dependency-aware Composer action')
    }
    const proposal = await prepareScalarEdit({
      ...common,
      intent: {
        kind: 'set-declared-scalar',
        entryId: scalarAction.entryId,
        path: ['disabled'],
        value: scalarAction.value,
      },
    })
    if (!proposal.canApply) {
      throw new Error(`entry ${JSON.stringify(scalarAction.entryId)} has a dependency blocker that the generic Composer action cannot repair`)
    }
    const current = await dumpDshConfigFromProfileSources({
      installation: options.installation,
      sources: proposal.sources,
      cwd: options.cwd,
    })
    const graph = buildProfileHarnessGraph({
      installation: options.installation,
      sources: proposal.sources,
      config: { mode: 'resolved', text: current.stdout },
    }).graph
    const serviceFacts = selectResolvedServiceFacts(graph)
    const entries = serviceFacts.entries.filter(node =>
      node.attributes.entryId === scalarAction.entryId)
    if (entries.length !== 1) {
      throw new Error(`resolved entry ${JSON.stringify(scalarAction.entryId)} is missing or ambiguous`)
    }
    const entry = entries[0]
    if (entry === undefined) throw new Error('unreachable: resolved scalar entry disappeared')
    if (serviceFacts.provides.some(edge => edge.from === entry.id)) {
      throw new Error(`entry ${JSON.stringify(scalarAction.entryId)} provides a service and requires a contract-aware Composer action`)
    }
    const activation = resolvedEntryActivation(entry)
    if (activation === 'unknown') {
      throw new Error(`entry ${JSON.stringify(scalarAction.entryId)} has a symbolic disabled value and is read-only`)
    }
    const currentDisabled = activation === 'disabled'
    if (currentDisabled === scalarAction.value) {
      throw new Error(`entry ${JSON.stringify(scalarAction.entryId)} already has the requested disabled state`)
    }
    return proposal
  }
  const mcpAction = parseMcpHttpAction(options.actionId)
  if (mcpAction !== undefined) {
    return await prepareMcpHttpAdd({
      ...common,
      serverName: mcpAction.serverName,
      url: mcpAction.url,
    })
  }
  switch (options.actionId) {
    case 'fs-sandbox-to-local':
      return await prepareFsProviderChange({ ...common, targetEntryId: 'fs-local' })
    case 'fs-local-to-sandbox':
      return await prepareFsProviderChange({ ...common, targetEntryId: 'fs-sandbox' })
    case 'fs-provider-reset-official-default':
      return await prepareFsProviderReset(common)
    case 'directory-picker-pin-browse':
    case 'directory-picker-reset-auto':
      return await prepareDirectoryPickerChange(common)
    case 'time-context-add':
    case 'time-context-remove':
      return await prepareTimeContextChange(common)
    case 'schedule-add':
    case 'schedule-remove':
      return await prepareScheduleChange(common)
    case 'fs-provider-remove':
      return await prepareScalarEdit({
        ...common,
        intent: {
          kind: 'set-declared-scalar',
          entryId: 'fs-local',
          path: ['disabled'],
          value: true,
        },
      })
    case 'fs-provider-remove-with-sandbox':
      return await prepareFsProviderChange({ ...common, targetEntryId: 'fs-sandbox' })
    case 'subprocess-provider-remove':
      return await prepareScalarEdit({
        ...common,
        intent: {
          kind: 'set-declared-scalar',
          entryId: 'subprocess',
          path: ['disabled'],
          value: true,
        },
      })
    case 'web-startup-disable':
    case 'web-startup-disable-with-consumers':
      return await prepareScalarEdit({
        ...common,
        intent: {
          kind: 'set-declared-scalar',
          entryId: 'web-startup',
          path: ['disabled'],
          value: true,
        },
        ...(options.actionId === 'web-startup-disable-with-consumers'
          ? { repairId: WEB_STARTUP_DISABLE_REPAIR_ID }
          : {}),
      })
    default:
      throw new Error('this Composer action is not supported by the current draft writer')
  }
}

function combinedTextChange(before: string, after: string): TextChange {
  let startOffset = 0
  const sharedLength = Math.min(before.length, after.length)
  while (startOffset < sharedLength && before[startOffset] === after[startOffset]) startOffset += 1

  let sharedSuffix = 0
  while (sharedSuffix < before.length - startOffset
    && sharedSuffix < after.length - startOffset
    && before[before.length - sharedSuffix - 1] === after[after.length - sharedSuffix - 1]) {
    sharedSuffix += 1
  }
  return {
    startOffset,
    endOffset: before.length - sharedSuffix,
    beforeText: before.slice(startOffset, before.length - sharedSuffix),
    afterText: after.slice(startOffset, after.length - sharedSuffix),
  }
}

function combinedPreview(
  before: string,
  after: string,
  change: TextChange,
): YamlScalarEditPreview {
  const operation = change.startOffset === before.length
    ? 'append-entry'
    : change.afterText === ''
      ? 'remove-entry'
      : 'replace-scalar'
  return {
    operation,
    entryId: 'composer-draft',
    path: [],
    startOffset: change.startOffset,
    endOffset: change.endOffset,
    beforeText: change.beforeText,
    afterText: change.afterText,
    previousValue: before.length,
    nextValue: after.length,
    candidateText: after,
    changed: before !== after,
  }
}

function candidateGraphView(
  validated: Awaited<ReturnType<typeof validateDshScalarEditCandidate>>,
  installation: DshInstallation,
  intents: readonly SetDeclaredScalarIntent[],
  componentPackages: readonly OfficialDshComponentPackageEvidence[],
): ComposerDraftCandidateGraph {
  const { graph } = validated.projection
  const countPlane = (plane: 'declared' | 'resolved' | 'observed'): number =>
    graph.nodes.filter(node => node.plane === plane).length
  const inspection = createStudioInspection({
    installation,
    sources: validated.sources,
    graph,
    diagnostics: validated.projection.diagnostics,
    componentPackages,
  })
  const services = inspection.services
    .map(service => {
      return {
        name: service.name,
        availability: service.availability,
        activeProviderEntryIds: service.providers
          .filter(provider => provider.availability === 'active')
          .flatMap(provider => {
            const entryId = inspection.nodes.find(node => node.id === provider.nodeId)?.attributes.entryId
            return typeof entryId === 'string' ? [entryId] : []
          }),
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name))
  return {
    counts: {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      declared: countPlane('declared'),
      resolved: countPlane('resolved'),
      observed: countPlane('observed'),
    },
    services,
    affectedEntryIds: [...new Set(intents.map(intent => intent.entryId))],
    inspection: {
      counts: inspection.counts,
      nodes: inspection.nodes.map(node => ({ ...node, provenance: [] })),
      edges: inspection.edges,
      services: inspection.services,
      pluginActions: inspection.pluginActions,
      componentCatalog: inspection.componentCatalog,
    },
  }
}

/** Replay up to two real Composer actions in isolation, then validate one combined candidate. */
export async function prepareComposerDraft(
  options: PrepareComposerDraftOptions,
): Promise<PreparedComposerDraft> {
  if (options.actionIds.length === 0) throw new Error('a Composer draft needs at least one action')
  if (options.actionIds.length > 2) throw new Error('the current Composer draft supports at most two actions')
  if (new Set(options.actionIds.map(composerDraftActionFamily)).size !== options.actionIds.length) {
    throw new Error('the same Composer action cannot be added twice')
  }
  const blockedAction = options.actionIds.find(actionId =>
    actionId === 'web-startup-disable'
      || actionId === 'fs-provider-remove'
      || actionId === 'subprocess-provider-remove')
  if (blockedAction !== undefined && options.actionIds.length > 1) {
    const attemptedActionId = options.actionIds.at(-1)
    if (attemptedActionId === undefined) throw new Error('unreachable: bounded Composer draft has no action')
    throw new ComposerDraftBoundedSequenceError(attemptedActionId, options.actionIds.slice(0, -1))
  }

  const sources = await readProfileSources({
    installation: options.installation,
    profile: options.profile,
    dshHome: options.dshHome,
    cwd: options.cwd,
    ...(options.patches === undefined ? {} : { patches: options.patches }),
  })
  const selected = sources.layers.find(layer => layer.patch.uri === options.targetUri)
  if (selected?.owner !== 'profile' || !selected.patch.exists || !selected.patch.writable) {
    throw new Error('Composer drafts require the selected writable profile patch')
  }
  if (sources.layers.some(layer => (layer.owner === 'home' || layer.owner === 'explicit') && layer.patch.exists)) {
    throw new Error('Composer drafts currently require the profile patch to be the final active DSH layer')
  }

  const draftRoot = await mkdtemp(join(tmpdir(), 'dsh-graph-control-draft-'))
  try {
    const draftHome = join(draftRoot, 'home')
    const draftProfile = join(draftHome, 'profiles', options.profile)
    const draftPatch = join(draftProfile, 'cordis.patch.yml')
    await mkdir(draftProfile, { recursive: true })
    await writeFile(join(draftProfile, 'package.json'), sources.manifest.rawBytes, { flag: 'wx' })
    await writeFile(draftPatch, selected.patch.rawBytes, { flag: 'wx' })
    const draftTargetUri = pathToFileURL(draftPatch).href
    const operations: ComposerDraftOperation[] = []
    const intents: SetDeclaredScalarIntent[] = []
    const semanticOperations: Readonly<Record<string, unknown>>[] = []
    let blocked = false

    for (const actionId of options.actionIds) {
      const fsRemovalRepair = actionId === 'fs-provider-remove'
        ? await prepareFsProviderChange({
            installation: options.installation,
            profile: options.profile,
            dshHome: draftHome,
            cwd: resolve(options.cwd),
            targetUri: draftTargetUri,
            targetEntryId: 'fs-sandbox',
            validate: false,
          })
        : undefined
      const proposal = await prepareAction({
        actionId,
        installation: options.installation,
        profile: options.profile,
        dshHome: draftHome,
        cwd: resolve(options.cwd),
        targetUri: draftTargetUri,
      })
      const subprocessBoundary = isSubprocessProviderRemovalAction(actionId)
        ? await proveSubprocessProviderRemovalBoundary({
            installation: options.installation,
            profile: options.profile,
            dshHome: draftHome,
            cwd: resolve(options.cwd),
            sources: proposal.sources,
          })
        : undefined
      await writeFile(draftPatch, proposal.plan.candidateBytes)
      if (isWebDependencyAction(actionId)) {
        const scalar = proposal as ScalarEditProposal
        const isRepaired = actionId === 'web-startup-disable-with-consumers'
        if (isRepaired && !scalar.canApply) {
          throw new Error('the selected web-startup dependency repair still leaves a blocker')
        }
        if (!isRepaired && scalar.canApply) {
          throw new Error('web-startup no longer requires the expected dependency repair')
        }
        blocked = !scalar.canApply
        operations.push({
          actionId,
          service: 'webStartup',
          mode: isRepaired ? 'disable-with-repair' : 'disable',
          summary: scalar.plan.summary,
          changes: scalar.plan.textChanges.map(change => ({ ...change })),
          semanticChange: { ...scalar.plan.semanticChange },
          expandedIntents: scalar.plan.intents.map(intent => ({ ...intent, path: [...intent.path] })),
          ...(scalar.dependencyImpact === undefined ? {} : { dependencyImpact: scalar.dependencyImpact }),
          ...(scalar.selectedRepair === undefined ? {} : { selectedRepair: scalar.selectedRepair }),
          ...(scalar.remainingDependencyImpact === undefined
            ? {}
            : { remainingDependencyImpact: scalar.remainingDependencyImpact }),
        })
      } else if (isFsProviderRemovalAction(actionId)) {
        const isRepaired = actionId === 'fs-provider-remove-with-sandbox'
        if (!isRepaired) {
          const scalar = proposal as ScalarEditProposal
          if (fsRemovalRepair === undefined) throw new Error('the ctx.fs sandbox repair proof is missing')
          const dependencyImpact = fsProviderRemovalImpact(fsRemovalRepair.impact)
          blocked = true
          operations.push({
            actionId,
            service: 'fs',
            mode: 'remove-provider',
            summary: 'Remove fs-local from the active ctx.fs connection',
            changes: scalar.plan.textChanges.map(change => ({ ...change })),
            semanticChange: { ...scalar.plan.semanticChange },
            expandedIntents: scalar.plan.intents.map(intent => ({ ...intent, path: [...intent.path] })),
            dependencyImpact,
            remainingDependencyImpact: dependencyImpact,
          })
        } else {
          const composition = proposal as CompositionProposal
          const action = proposalAction(composition)
          if (action.id !== 'fs-local-to-sandbox') {
            throw new Error('the sandbox repair is not valid for the current filesystem provider')
          }
          operations.push({
            actionId,
            service: 'fs',
            mode: 'remove-provider-with-repair',
            summary: 'Remove fs-local and switch ctx.fs to fs-sandbox',
            changes: composition.plan.textChanges.map(change => ({ ...change })),
            semanticChange: { ...composition.plan.semanticChange },
            expandedIntents: composition.plan.intents.map(intent => ({ ...intent, path: [...intent.path] })),
            selectedRepair: fsProviderRemovalRepair(),
            remainingDependencyImpact: { diagnostics: [], repairs: [] },
          })
        }
      } else if (isSubprocessProviderRemovalAction(actionId)) {
        const scalar = proposal as ScalarEditProposal
        if (subprocessBoundary === undefined) throw new Error('the ctx.subprocess removal boundary proof is missing')
        const dependencyImpact = subprocessProviderRemovalImpact(subprocessBoundary)
        blocked = true
        operations.push({
          actionId,
          service: 'subprocess',
          mode: 'remove-provider-without-repair',
          summary: 'Preview removal of the only ctx.subprocess Provider without inventing a repair',
          changes: scalar.plan.textChanges.map(change => ({ ...change })),
          semanticChange: { ...scalar.plan.semanticChange },
          expandedIntents: scalar.plan.intents.map(intent => ({ ...intent, path: [...intent.path] })),
          dependencyImpact,
          remainingDependencyImpact: dependencyImpact,
          subprocessBoundary,
        })
      } else if (parseScalarDisabledAction(actionId) !== undefined) {
        const scalarAction = parseScalarDisabledAction(actionId)
        if (scalarAction === undefined) throw new Error('unreachable: scalar Composer action disappeared')
        const scalar = proposal as ScalarEditProposal
        operations.push({
          actionId,
          service: scalarAction.entryId,
          mode: scalarAction.value ? 'set-disabled' : 'set-enabled',
          summary: scalar.plan.summary,
          changes: scalar.plan.textChanges.map(change => ({ ...change })),
          semanticChange: { ...scalar.plan.semanticChange },
          expandedIntents: scalar.plan.intents.map(intent => ({ ...intent, path: [...intent.path] })),
        })
      } else {
        const composition = proposal as CompositionProposal
        const action = proposalAction(composition)
        if (action.id !== actionId) {
          throw new ComposerDraftBoundedSequenceError(actionId, options.actionIds.slice(0, operations.length))
        }
        operations.push({
          actionId,
          service: 'action' in composition.impact
            ? composition.impact.entryId
            : composition.impact.service,
          mode: action.mode,
          summary: composition.plan.summary,
          changes: composition.plan.textChanges.map(change => ({ ...change })),
          semanticChange: { ...composition.plan.semanticChange },
          expandedIntents: composition.plan.intents.map(intent => ({ ...intent, path: [...intent.path] })),
        })
      }
      intents.push(...proposal.plan.intents.map(intent => ({ ...intent, path: [...intent.path] })))
      semanticOperations.push({ ...proposal.plan.semanticChange })
    }

    const candidateBytes = new Uint8Array(await readFile(draftPatch))
    const candidateText = new TextDecoder().decode(candidateBytes)
    const change = combinedTextChange(selected.patch.text, candidateText)
    const preview = combinedPreview(selected.patch.text, candidateText, change)
    const firstIntent = intents[0]
    if (firstIntent === undefined) throw new Error('unreachable: Composer draft has no resolved intent')
    const summary = `${blocked ? 'Review blocked' : 'Apply'} ${operations.length} Composer ${operations.length === 1 ? 'intent' : 'intents'}: ${operations.map(operation => operation.summary).join('; ')}`
    const base = createEditPlan({
      id: `composer-draft:${encodeURIComponent(options.profile)}:${options.actionIds.join(',')}`,
      targetUri: selected.patch.uri,
      expectedBytes: selected.patch.rawBytes,
      candidateBytes,
      summary,
      textChange: change,
      semanticChange: {
        kind: 'composer-draft',
        operations: semanticOperations,
      },
    })
    const plan: DshScalarEditPlan = {
      ...base,
      targetOwner: 'profile',
      intent: firstIntent,
      intents,
      preview,
      previews: [preview],
    }
    if (blocked) {
      return {
        state: 'blocked',
        sources,
        plan,
        operations,
      }
    }
    const validated = await validateDshScalarEditCandidate({
      installation: options.installation,
      sources,
      plan,
      cwd: options.cwd,
      dshHome: options.dshHome,
    })
    const componentPackages = await discoverOfficialDshComponentPackages(options.installation)
    return {
      state: 'validated',
      sources,
      plan,
      validation: validated.plan,
      operations,
      candidate: candidateGraphView(validated, options.installation, intents, componentPackages),
    }
  } finally {
    await rm(draftRoot, { recursive: true, force: true })
  }
}
