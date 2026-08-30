#!/usr/bin/env node

import { randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  applyDshScalarEdit,
  assertSafeProfileName,
  buildProfileHarnessGraph,
  discoverBuiltDshCheckout,
  discoverLocalDshProfiles,
  discoverOfficialDshComponentPackages,
  dumpDshConfig,
  dumpDshConfigFromProfileSources,
  probeDshInstallation,
  probeE2bProfileReadiness,
  probeGitWorkspaceMaterialization,
  readProfileSources,
  type DshInstallation,
  type LocalDshProfile,
} from '@dsh-graph-control/dsh-adapter'
import {
  prepareDirectoryPickerChange,
  prepareFsProviderChange,
  prepareFsProviderReset,
  prepareScalarEdit,
  type DirectoryPickerChangeProposal,
  type ProviderReplacementProposal,
  type ScalarEditProposal,
} from '@dsh-graph-control/profile-edit'
import { bytesEqual, StaleSourceError } from '@dsh-graph-control/edit-transaction'
import { createStudioDeveloperDiagnostics } from './developer-diagnostics.ts'
import { createStudioInspection, type StudioInspection } from './inspection.ts'
import {
  ComposerDraftBoundedSequenceError,
  composerDraftActionFamily,
  FS_PROVIDER_REMOVE_REPAIR_ID,
  parseComposerDraftActionId,
  prepareComposerDraft,
  WEB_STARTUP_DISABLE_REPAIR_ID,
  type ComposerDraftActionId,
  type ComposerDraftConflict,
  type PreparedComposerDraft,
} from './composer-draft.ts'
import { composerDraftStaleError } from './composer-draft-stale.ts'
import { createStudioServer, type StudioServerHandlers } from './server.ts'
import {
  inspectProfileAuthoringBoundary,
  profileAuthoringReadOnlyError,
  writableProfilePatch,
  type ProfileAuthoringBoundary,
} from './profile-authoring.ts'
import { StudioHttpError } from './studio-http-error.ts'
import {
  HARNESS_CONTEXT_CANDIDATE_TTL_MS,
  HarnessContextLocalDirectoryError,
  HarnessContextRequestError,
  assertProfileSourcesCoherent,
  canonicalLocalDirectory,
  canonicalPathsMatch,
  componentPackagesAreCoherent,
  discoverBoundedLocalDshProfiles,
  harnessContextCompositionError,
  harnessContextError,
  inspectDshCheckoutFiles,
  inspectLocalDshHomePatch,
  inspectLocalDshProfileTarget,
  parseHarnessContextCheckRequest,
  parseHarnessContextInitializeApplyRequest,
  parseHarnessContextInitializePreviewRequest,
  parseHarnessContextOpenRequest,
  sameCheckoutFileIdentity,
  sameHomePatchIdentity,
  type CanonicalLocalDirectory,
  type DshCheckoutFileIdentity,
  type DshHomePatchIdentity,
} from './harness-context-transition.ts'

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))

export interface StudioArguments {
  profile: string
  dshHome: string
  upstream: string
  node: string
  patches: string[]
  port: number
}

export interface StudioRuntimeArguments {
  profile: string
  dshHome: string
  cwd: string
  patches: readonly string[]
}

export interface StudioRuntime {
  inspection: StudioInspection
  handlers: StudioServerHandlers
}

export interface StudioHarnessContext {
  revision: number
  selectedProfile: string
  dshHome: string
  workspace: string
  installation: {
    root: string
    version: string
    commit?: string
  }
  authoring: ProfileAuthoringBoundary
  profiles: readonly {
    name: string
    directory: string
    selected: boolean
    patchExists: boolean
    editable: boolean
  }[]
  switching: {
    enabled: boolean
    reason?: 'explicit-patches'
  }
  pendingChanges: boolean
  composition: 'official-dsh'
}

interface ActiveStudioContext {
  installation: DshInstallation
  args: StudioRuntimeArguments
  inspection: StudioInspection
  revision: number
}

interface PendingHarnessContextCandidate {
  id: string
  expectedContextRevision: number
  expiresAt: number
  installationDirectory: CanonicalLocalDirectory
  dshHomeDirectory: CanonicalLocalDirectory
  checkoutIdentity: DshCheckoutFileIdentity
  homePatchIdentity: DshHomePatchIdentity
  profileNames: readonly string[]
  nodeExecutable: string
}

interface PendingHarnessContextInitialization {
  id: string
  expectedContextRevision: number
  expiresAt: number
  candidate: PendingHarnessContextCandidate
}

const INITIALIZABLE_PROFILE = 'web' as const

const HELP = `DSH GraphControl Studio

Usage:
  pnpm studio -- --dsh-home <path> [options]

Options:
  --profile <name>     DSH profile to inspect (default: web)
  --dsh-home <path>    Existing DSH_HOME; or set DSH_HOME
  --upstream <path>    Built official DSH checkout
  --node <path>        DSH-supported Node executable
  --patch <path>       Explicit overlay, repeatable
  --port <number>      Loopback port; 0 selects a free port (default: 4317)
  --help               Show this help

Studio always binds to 127.0.0.1. Writes require a validated in-memory plan and a separate apply action.
`

function takeValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1]
  if (value === undefined || value.startsWith('--')) throw new Error(`${flag} requires a value`)
  return value
}

export function parseStudioArguments(argv: readonly string[]): StudioArguments | 'help' {
  let profile = 'web'
  let dshHome = process.env.DSH_HOME
  let upstream = resolve(workspaceRoot, '.upstream', 'deepseek-harness')
  let node = resolve(workspaceRoot, '.tools', 'node-v24.19.0-win-x64', 'node.exe')
  const patches: string[] = []
  let port = 4317

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    switch (argument) {
      case '--':
        break
      case '--help':
      case '-h':
        return 'help'
      case '--profile':
        profile = takeValue(argv, index, argument)
        index += 1
        break
      case '--dsh-home':
        dshHome = takeValue(argv, index, argument)
        index += 1
        break
      case '--upstream':
        upstream = takeValue(argv, index, argument)
        index += 1
        break
      case '--node':
        node = takeValue(argv, index, argument)
        index += 1
        break
      case '--patch':
        patches.push(resolve(takeValue(argv, index, argument)))
        index += 1
        break
      case '--port': {
        const parsed = Number(takeValue(argv, index, argument))
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65_535) {
          throw new Error('--port must be an integer from 0 to 65535')
        }
        port = parsed
        index += 1
        break
      }
      default:
        throw new Error(`unknown Studio option: ${String(argument)}`)
    }
  }
  if (dshHome === undefined || dshHome === '') {
    throw new Error('--dsh-home is required when DSH_HOME is not set')
  }
  return {
    profile,
    dshHome: resolve(dshHome),
    upstream: resolve(upstream),
    node: resolve(node),
    patches,
    port,
  }
}

function parseScalarPlanBody(body: unknown): {
  entryId: string
  value: boolean
  repairId?: string
} {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('scalar plan request must be an object')
  }
  const record = body as Record<string, unknown>
  if (typeof record.entryId !== 'string' || record.entryId === '' || record.entryId.length > 256) {
    throw new Error('entryId must be a non-empty string of at most 256 characters')
  }
  if (typeof record.value !== 'boolean') throw new Error('value must be a boolean')
  if (record.repairId !== undefined
    && (typeof record.repairId !== 'string' || record.repairId === '' || record.repairId.length > 256)) {
    throw new Error('repairId must be a non-empty string of at most 256 characters')
  }
  return {
    entryId: record.entryId,
    value: record.value,
    ...(typeof record.repairId === 'string' ? { repairId: record.repairId } : {}),
  }
}

function parseScalarApplyBody(body: unknown): { planId: string; confirmation: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('scalar apply request must be an object')
  }
  const record = body as Record<string, unknown>
  if (typeof record.planId !== 'string' || record.planId === '' || record.planId.length > 64) {
    throw new Error('planId must be a non-empty string of at most 64 characters')
  }
  if (typeof record.confirmation !== 'string' || record.confirmation === '' || record.confirmation.length > 4096) {
    throw new Error('confirmation must be a non-empty string of at most 4096 characters')
  }
  return { planId: record.planId, confirmation: record.confirmation }
}

function parseProviderReplacementPlanBody(body: unknown): { replacementId: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('provider replacement plan request must be an object')
  }
  const replacementId = (body as Record<string, unknown>).replacementId
  if (typeof replacementId !== 'string' || replacementId === '' || replacementId.length > 256) {
    throw new Error('replacementId must be a non-empty string of at most 256 characters')
  }
  return { replacementId }
}

type ComposerDraftUpdateRequest =
  | { action: 'add'; actionId: ComposerDraftActionId }
  | { action: 'remove'; actionId: ComposerDraftActionId }
  | { action: 'repair'; repairId: typeof WEB_STARTUP_DISABLE_REPAIR_ID | typeof FS_PROVIDER_REMOVE_REPAIR_ID }
  | { action: 'undo' | 'redo' | 'clear' }

function parseComposerDraftUpdateBody(body: unknown): ComposerDraftUpdateRequest {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Composer draft request must be an object')
  }
  const record = body as Record<string, unknown>
  if (record.action === 'add' || record.action === 'remove') {
    return { action: record.action, actionId: parseComposerDraftActionId(record.actionId) }
  }
  if (record.action === 'repair') {
    if (record.repairId !== WEB_STARTUP_DISABLE_REPAIR_ID
      && record.repairId !== FS_PROVIDER_REMOVE_REPAIR_ID) {
      throw new Error('this dependency repair is not supported by the current Composer transaction')
    }
    return { action: 'repair', repairId: record.repairId }
  }
  if (record.action === 'undo' || record.action === 'redo' || record.action === 'clear') {
    return { action: record.action }
  }
  throw new Error('Composer draft action must be add, remove, repair, undo, redo, or clear')
}

function parseComposerDraftApplyBody(body: unknown): { draftId: string; confirmation: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Composer draft apply request must be an object')
  }
  const record = body as Record<string, unknown>
  if (typeof record.draftId !== 'string' || record.draftId === '' || record.draftId.length > 64) {
    throw new Error('draftId must be a non-empty string of at most 64 characters')
  }
  if (typeof record.confirmation !== 'string' || record.confirmation === '' || record.confirmation.length > 8192) {
    throw new Error('confirmation must be a non-empty string of at most 8192 characters')
  }
  return { draftId: record.draftId, confirmation: record.confirmation }
}

function parseHarnessContextSelection(body: unknown): { profile: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Harness context selection must be an object')
  }
  const profile = (body as Record<string, unknown>).profile
  if (typeof profile !== 'string' || profile === '' || profile.length > 128) {
    throw new Error('profile must be a non-empty string of at most 128 characters')
  }
  assertSafeProfileName(profile)
  return { profile }
}

function scalarPlanView(
  proposal: ScalarEditProposal,
  planId?: string,
): Readonly<Record<string, unknown>> {
  return {
    state: proposal.plan.state,
    summary: proposal.plan.summary,
    targetOwner: proposal.plan.targetOwner,
    changes: proposal.plan.textChanges,
    changed: proposal.plan.previews.some(preview => preview.changed),
    canApply: proposal.canApply,
    targetUnchanged: true,
    ...(planId === undefined ? {} : { planId }),
    ...(proposal.validation === undefined ? {} : { validation: proposal.validation.validation }),
    ...(proposal.dependencyImpact === undefined ? {} : { dependencyImpact: proposal.dependencyImpact }),
    ...(proposal.selectedRepair === undefined ? {} : { selectedRepair: proposal.selectedRepair }),
    ...(proposal.remainingDependencyImpact === undefined
      ? {}
      : { remainingDependencyImpact: proposal.remainingDependencyImpact }),
  }
}

type StudioCompositionProposal = ProviderReplacementProposal | DirectoryPickerChangeProposal

function providerReplacementPlanView(
  proposal: StudioCompositionProposal,
  planId?: string,
): Readonly<Record<string, unknown>> {
  return {
    mode: 'providerChangeMode' in proposal.planned
      ? proposal.planned.providerChangeMode
      : proposal.planned.directoryPickerMode,
    state: proposal.plan.state,
    summary: proposal.plan.summary,
    targetOwner: proposal.plan.targetOwner,
    changes: proposal.plan.textChanges,
    changed: proposal.plan.previews.some(preview => preview.changed),
    canApply: proposal.canApply,
    targetUnchanged: true,
    impact: proposal.impact,
    ...(planId === undefined ? {} : { planId }),
    ...(proposal.validation === undefined ? {} : { validation: proposal.validation.validation }),
  }
}

function emptyComposerDraftView(redoAvailable = false): Readonly<Record<string, unknown>> {
  return {
    state: 'empty',
    operations: [],
    canApply: false,
    canUndo: false,
    canRedo: redoAvailable,
    maxActions: 2,
    targetUnchanged: true,
  }
}

function composerDraftView(
  pending: { id: string; prepared: PreparedComposerDraft },
  redoAvailable: boolean,
): Readonly<Record<string, unknown>> {
  const validated = pending.prepared.state === 'validated' ? pending.prepared : undefined
  return {
    state: pending.prepared.state,
    draftId: pending.id,
    summary: pending.prepared.plan.summary,
    operations: pending.prepared.operations,
    changes: pending.prepared.plan.textChanges,
    changed: pending.prepared.plan.previews.some(preview => preview.changed),
    ...(validated === undefined ? {} : { validation: validated.validation.validation }),
    ...(validated === undefined ? {} : { candidate: validated.candidate }),
    byteLength: {
      before: pending.prepared.plan.precondition.expectedBytes.byteLength,
      after: pending.prepared.plan.candidateBytes.byteLength,
    },
    canApply: validated !== undefined,
    canUndo: true,
    canRedo: redoAvailable,
    maxActions: 2,
    targetUnchanged: true,
  }
}

function staleComposerDraftView(
  stale: { id: string; actionIds: readonly ComposerDraftActionId[]; inspectionRefreshed: boolean },
  redoAvailable: boolean,
): Readonly<Record<string, unknown>> {
  return {
    state: 'stale',
    draftId: stale.id,
    operations: stale.actionIds.map(actionId => ({ actionId })),
    canApply: false,
    canUndo: stale.actionIds.length > 0,
    canRedo: redoAvailable,
    maxActions: 2,
    stale: composerDraftStaleError('replan-failed'),
  }
}

function composerDraftConflict(
  reason: ComposerDraftConflict['reason'],
  attemptedActionId: ComposerDraftActionId,
  conflictingActionIds: readonly ComposerDraftActionId[],
  repairIds: readonly string[] = [],
): ComposerDraftConflict {
  const uniqueRepairIds = [...new Set(repairIds)]
  const safeNextAction: ComposerDraftConflict['safeNextAction'] = reason === 'already-pending'
    ? 'review-or-remove'
    : reason === 'resolve-first'
      ? uniqueRepairIds.length > 0 ? 'repair-or-remove' : 'remove-or-clear'
      : reason === 'cannot-combine'
        ? 'finish-current-first'
        : 'remove-one-or-clear'
  return {
    code: 'COMPOSER_DRAFT_CONFLICT',
    reason,
    attemptedActionId,
    conflictingActionIds: [...conflictingActionIds],
    safeNextAction,
    repairIds: uniqueRepairIds,
    writePerformed: false,
  }
}

function blockedComposerDraftDetails(prepared: PreparedComposerDraft): {
  actionIds: readonly ComposerDraftActionId[]
  repairIds: readonly string[]
} {
  const blockedOperations = prepared.operations.filter(operation => {
    const impact = operation.remainingDependencyImpact ?? operation.dependencyImpact
    return (impact?.diagnostics.length ?? 0) > 0
  })
  const operations = blockedOperations.length > 0 ? blockedOperations : prepared.operations
  return {
    actionIds: operations.map(operation => operation.actionId),
    repairIds: operations.flatMap(operation => {
      const impact = operation.remainingDependencyImpact ?? operation.dependencyImpact
      return impact?.repairs
        .map(repair => repair.id)
        .filter(repairId => repairId === WEB_STARTUP_DISABLE_REPAIR_ID
          || repairId === FS_PROVIDER_REMOVE_REPAIR_ID) ?? []
    }),
  }
}

async function loadStudioProfile(
  installation: DshInstallation,
  args: StudioRuntimeArguments,
): Promise<{
  sources: Awaited<ReturnType<typeof readProfileSources>>
  inspection: StudioInspection
}> {
  const sources = await readProfileSources({
    installation,
    profile: args.profile,
    cwd: args.cwd,
    dshHome: args.dshHome,
    patches: args.patches,
  })
  const [resolved, componentPackages] = await Promise.all([
    dumpDshConfigFromProfileSources({ installation, sources, cwd: args.cwd }),
    discoverOfficialDshComponentPackages(installation),
  ])
  const projection = buildProfileHarnessGraph({
    installation,
    sources,
    config: { mode: 'resolved', text: resolved.stdout },
  })
  return {
    sources,
    inspection: createStudioInspection({
      installation,
      sources,
      graph: projection.graph,
      diagnostics: projection.diagnostics,
      componentPackages,
    }),
  }
}

/** Stage a context from one source snapshot, official composition, and a confirming source snapshot. */
async function loadCoherentStudioProfile(
  installation: DshInstallation,
  args: StudioRuntimeArguments,
): Promise<{
  sources: Awaited<ReturnType<typeof readProfileSources>>
  inspection: StudioInspection
  componentPackages: Awaited<ReturnType<typeof discoverOfficialDshComponentPackages>>
}> {
  const sourceOptions = {
    installation,
    profile: args.profile,
    cwd: args.cwd,
    dshHome: args.dshHome,
    patches: args.patches,
  }
  const sources = await readProfileSources(sourceOptions)
  const [resolved, componentPackages] = await Promise.all([
    dumpDshConfigFromProfileSources({ installation, sources, cwd: args.cwd }),
    discoverOfficialDshComponentPackages(installation),
  ])
  const projection = buildProfileHarnessGraph({
    installation,
    sources,
    config: { mode: 'resolved', text: resolved.stdout },
  })
  const confirmedSources = await readProfileSources(sourceOptions)
  assertProfileSourcesCoherent(sources, confirmedSources)
  return {
    sources,
    componentPackages,
    inspection: createStudioInspection({
      installation,
      sources,
      graph: projection.graph,
      diagnostics: projection.diagnostics,
      componentPackages,
    }),
  }
}

function temporaryPreviewHomeIsBounded(temporaryRoot: string, temporaryHome: string): boolean {
  const relation = relative(temporaryRoot, temporaryHome)
  return relation !== ''
    && relation !== '..'
    && !relation.startsWith(`..${sep}`)
    && !isAbsolute(relation)
    && !relation.includes(sep)
    && relation.startsWith('dsh-graph-control-web-preview-')
}

/** Exercise the official initializer and coherent loader without touching the selected DSH home. */
async function previewOfficialWebProfileInitialization(
  installation: DshInstallation,
  args: Pick<StudioRuntimeArguments, 'cwd'>,
  homePatchIdentity: DshHomePatchIdentity,
): Promise<void> {
  const temporaryRoot = resolve(tmpdir())
  const temporaryHome = await mkdtemp(join(temporaryRoot, 'dsh-graph-control-web-preview-'))
  if (!temporaryPreviewHomeIsBounded(temporaryRoot, temporaryHome)) {
    throw new Error('temporary profile preview escaped its owned root')
  }
  try {
    await dumpDshConfig({
      installation,
      profile: INITIALIZABLE_PROFILE,
      mode: 'default',
      cwd: args.cwd,
      dshHome: temporaryHome,
    })
    if (homePatchIdentity.exists) {
      await writeFile(join(temporaryHome, 'cordis.patch.yml'), homePatchIdentity.rawBytes)
    }
    const profiles = await discoverBoundedLocalDshProfiles(temporaryHome)
    if (profiles.length !== 1 || profiles[0]?.name !== INITIALIZABLE_PROFILE) {
      throw new Error('official DSH did not initialize the bounded Web profile preview')
    }
    await loadCoherentStudioProfile(installation, {
      profile: INITIALIZABLE_PROFILE,
      dshHome: temporaryHome,
      cwd: args.cwd,
      patches: [],
    })
  } finally {
    // This directory was created above with a fixed prefix under the OS temp
    // root and is revalidated before the only recursive removal in this flow.
    if (!temporaryPreviewHomeIsBounded(temporaryRoot, resolve(temporaryHome))) {
      throw new Error('temporary profile preview cleanup target changed')
    }
    await rm(temporaryHome, { recursive: true, force: true })
  }
}

export async function createStudioRuntime(
  installation: DshInstallation,
  args: StudioRuntimeArguments,
): Promise<StudioRuntime> {
  const initialArgs: StudioRuntimeArguments = {
    profile: args.profile,
    dshHome: resolve(args.dshHome),
    cwd: resolve(args.cwd),
    patches: [...args.patches],
  }
  const initialLoaded = await loadStudioProfile(installation, initialArgs)
  let activeContext: ActiveStudioContext = {
    installation,
    args: initialArgs,
    inspection: initialLoaded.inspection,
    revision: 0,
  }
  const launchNodeExecutable = installation.nodeExecutable
  let pendingPlan: { id: string; proposal: ScalarEditProposal } | undefined
  let pendingProviderReplacement: { id: string; proposal: StudioCompositionProposal } | undefined
  let composerDraftActions: ComposerDraftActionId[] = []
  let composerDraftRedo: { actionId: ComposerDraftActionId; index: number } | undefined
  let pendingComposerDraft: { id: string; prepared: PreparedComposerDraft } | undefined
  let staleComposerDraft: {
    id: string
    actionIds: readonly ComposerDraftActionId[]
    inspectionRefreshed: boolean
  } | undefined
  let applying = false
  let planningChange = false
  let selectingContext = false
  let checkingContext = false
  let composerDraftUpdating = false
  let pendingHarnessContextCandidate: PendingHarnessContextCandidate | undefined
  let pendingHarnessContextInitialization: PendingHarnessContextInitialization | undefined

  const clearComposerDraft = (): void => {
    composerDraftActions = []
    composerDraftRedo = undefined
    pendingComposerDraft = undefined
    staleComposerDraft = undefined
  }
  const clearAllPending = (): void => {
    pendingPlan = undefined
    pendingProviderReplacement = undefined
    clearComposerDraft()
  }
  const activateComposerDraftFamily = (): void => {
    pendingPlan = undefined
    pendingProviderReplacement = undefined
  }
  const reloadCurrentProfile = async (): Promise<void> => {
    const operationContext = activeContext
    const reloaded = await loadCoherentStudioProfile(operationContext.installation, operationContext.args)
    if (operationContext !== activeContext) {
      throw new Error('the selected Harness changed while the profile was being reloaded')
    }
    activeContext = { ...operationContext, inspection: reloaded.inspection }
  }
  const assertCurrentContext = (revision: number): void => {
    if (revision !== activeContext.revision) {
      throw new Error('the selected Harness changed while this preview was being built; try again')
    }
  }
  const rejectProfileAuthoringReadOnly = (
    boundary: Extract<ProfileAuthoringBoundary, { state: 'read-only' }>,
  ): never => {
    throw new StudioHttpError(409, {
      error: profileAuthoringReadOnlyError(boundary.reason),
    })
  }
  const readCurrentProfileAuthoring = async (operationContext: ActiveStudioContext = activeContext) => {
    const operationArgs = operationContext.args
    const sources = await readProfileSources({
      installation: operationContext.installation,
      profile: operationArgs.profile,
      cwd: operationArgs.cwd,
      dshHome: operationArgs.dshHome,
      patches: operationArgs.patches,
    })
    const boundary = inspectProfileAuthoringBoundary(sources)
    return { sources, boundary }
  }
  const requireCurrentProfileAuthoring = async (operationContext: ActiveStudioContext = activeContext) => {
    const current = await readCurrentProfileAuthoring(operationContext)
    if (current.boundary.state === 'read-only') rejectProfileAuthoringReadOnly(current.boundary)
    const profilePatch = writableProfilePatch(current.sources, current.boundary)
    if (profilePatch === undefined) {
      return rejectProfileAuthoringReadOnly({ state: 'read-only', reason: 'profile-patch-unavailable' })
    }
    return { ...current, profilePatch }
  }
  const assertPendingApplySourcesCurrent = async (
    operationContext: ActiveStudioContext,
    targetUri: string,
    expectedBytes: Uint8Array,
  ): Promise<void> => {
    let current: Awaited<ReturnType<typeof readCurrentProfileAuthoring>>
    try {
      current = await readCurrentProfileAuthoring(operationContext)
    } catch {
      // Any source-set read failure means the composition that was validated
      // is no longer provably current. Treat it as stale without guessing
      // which document changed or leaking a local path through the error.
      throw new StaleSourceError(targetUri)
    }
    if (current.boundary.state === 'read-only') {
      if (current.boundary.reason === 'higher-precedence-layer-active') {
        rejectProfileAuthoringReadOnly(current.boundary)
      }
      throw new StaleSourceError(targetUri)
    }
    const profilePatch = writableProfilePatch(current.sources, current.boundary)
    if (profilePatch === undefined
      || profilePatch.uri !== targetUri
      || !bytesEqual(profilePatch.rawBytes, expectedBytes)) {
      throw new StaleSourceError(targetUri)
    }
  }
  const assertPreparedSourcesRemainWritable = (
    sources: Awaited<ReturnType<typeof readProfileSources>>,
  ): void => {
    const boundary = inspectProfileAuthoringBoundary(sources)
    if (boundary.state === 'read-only') rejectProfileAuthoringReadOnly(boundary)
  }
  const hasPendingChanges = (): boolean => pendingPlan !== undefined
    || pendingProviderReplacement !== undefined
    || composerDraftActions.length > 0
    || composerDraftRedo !== undefined
    || pendingComposerDraft !== undefined
    || staleComposerDraft !== undefined
  const harnessContextView = (
    context: ActiveStudioContext,
    profiles: readonly LocalDshProfile[],
  ): StudioHarnessContext => ({
    revision: context.revision,
    selectedProfile: context.args.profile,
    dshHome: context.args.dshHome,
    workspace: context.args.cwd,
    installation: {
      root: context.installation.root,
      version: context.installation.version,
      ...(context.installation.commit === undefined ? {} : { commit: context.installation.commit }),
    },
    authoring: context.inspection.authoring,
    profiles: profiles.map(profile => ({
      name: profile.name,
      directory: profile.directory,
      selected: profile.name === context.args.profile,
      patchExists: profile.patchExists,
      editable: profile.patchWritable && context.inspection.authoring.state === 'writable',
    })),
    switching: context.args.patches.length === 0
      ? { enabled: true }
      : { enabled: false, reason: 'explicit-patches' },
    pendingChanges: hasPendingChanges(),
    composition: 'official-dsh',
  })
  const currentHarnessContext = async (): Promise<StudioHarnessContext> => {
    const operationContext = activeContext
    const profiles = await discoverLocalDshProfiles(operationContext.args.dshHome)
    assertCurrentContext(operationContext.revision)
    return harnessContextView(operationContext, profiles)
  }
  const recheckHarnessContextCandidate = async (
    candidate: PendingHarnessContextCandidate,
  ): Promise<{
    installationDirectory: CanonicalLocalDirectory
    dshHomeDirectory: CanonicalLocalDirectory
    checkoutIdentity: DshCheckoutFileIdentity
    homePatchIdentity: DshHomePatchIdentity
    profiles: LocalDshProfile[]
  }> => {
    const [installationDirectory, dshHomeDirectory] = await Promise.all([
      canonicalLocalDirectory(candidate.installationDirectory.requested),
      canonicalLocalDirectory(candidate.dshHomeDirectory.requested),
    ])
    if (!canonicalPathsMatch(candidate.installationDirectory, installationDirectory)
      || !canonicalPathsMatch(candidate.dshHomeDirectory, dshHomeDirectory)) {
      throw new HarnessContextLocalDirectoryError('candidate path changed')
    }
    const [checkoutIdentity, homePatchIdentity, profiles] = await Promise.all([
      inspectDshCheckoutFiles(installationDirectory.canonical),
      inspectLocalDshHomePatch(dshHomeDirectory.canonical),
      discoverBoundedLocalDshProfiles(dshHomeDirectory.canonical),
    ])
    if (!sameCheckoutFileIdentity(candidate.checkoutIdentity, checkoutIdentity)
      || !sameHomePatchIdentity(candidate.homePatchIdentity, homePatchIdentity)
      || profiles.length !== candidate.profileNames.length
      || profiles.some((profile, index) => profile.name !== candidate.profileNames[index])) {
      throw new HarnessContextLocalDirectoryError('candidate identity changed')
    }
    return { installationDirectory, dshHomeDirectory, checkoutIdentity, homePatchIdentity, profiles }
  }
  const discoverCheckedCandidateInstallation = async (
    candidate: PendingHarnessContextCandidate,
    installationDirectory: CanonicalLocalDirectory,
    checkoutIdentity: DshCheckoutFileIdentity,
  ): Promise<DshInstallation> => {
    const installation = await discoverBuiltDshCheckout(
      installationDirectory.canonical,
      candidate.nodeExecutable,
    )
    if (installation.version !== checkoutIdentity.version
      || installation.nodeExecutable !== candidate.nodeExecutable) {
      throw new Error('candidate installation identity changed')
    }
    return installation
  }
  const profileInitializationFailure = async (dshHome: string): Promise<StudioHttpError> => {
    let profileTargetState: 'missing' | 'present' | 'unknown' = 'unknown'
    try {
      profileTargetState = await inspectLocalDshProfileTarget(dshHome, INITIALIZABLE_PROFILE)
    } catch {
      // The target is intentionally left untouched; an unreadable state must
      // be reported conservatively because the official CLI may have written.
    }
    return harnessContextError(422, 'initialization-failed', {
      writePerformed: profileTargetState !== 'missing',
      profileTargetState,
      partialFilesMayRemain: profileTargetState !== 'missing',
    })
  }
  const requireMissingProfileInitializationTarget = async (dshHome: string): Promise<void> => {
    let state: Awaited<ReturnType<typeof inspectLocalDshProfileTarget>>
    try {
      state = await inspectLocalDshProfileTarget(dshHome, INITIALIZABLE_PROFILE)
    } catch {
      throw harnessContextError(409, 'candidate-changed')
    }
    if (state !== 'missing') throw harnessContextError(409, 'profile-already-exists')
  }
  const currentComposerDraftView = (): Readonly<Record<string, unknown>> =>
    staleComposerDraft !== undefined
      ? staleComposerDraftView(staleComposerDraft, composerDraftRedo !== undefined)
      : pendingComposerDraft === undefined
        ? emptyComposerDraftView(composerDraftRedo !== undefined)
        : composerDraftView(pendingComposerDraft, composerDraftRedo !== undefined)
  const rejectComposerDraftConflict = (conflict: ComposerDraftConflict): never => {
    throw new StudioHttpError(409, {
      error: conflict,
      draft: currentComposerDraftView(),
    })
  }
  const rejectStaleComposerDraft = (): never => {
    const stale = staleComposerDraft
    if (stale === undefined) throw new Error('the Composer draft is not stale')
    throw new StudioHttpError(409, {
      error: composerDraftStaleError('replan-failed'),
      draft: currentComposerDraftView(),
      ...(stale.inspectionRefreshed ? { inspection: activeContext.inspection } : {}),
    })
  }
  const refreshStaleInspection = async (): Promise<boolean> => {
    const stale = staleComposerDraft
    if (stale === undefined) return false
    try {
      await reloadCurrentProfile()
    } catch {
      staleComposerDraft = { ...stale, inspectionRefreshed: false }
      return false
    }
    staleComposerDraft = { ...stale, inspectionRefreshed: true }
    return true
  }
  const reloadStaleInspectionForRecovery = async (): Promise<boolean> => {
    if (staleComposerDraft === undefined) return false
    if (!(await refreshStaleInspection())) rejectStaleComposerDraft()
    return true
  }
  const prepareDraftActions = async (
    actionIds: readonly ComposerDraftActionId[],
  ): Promise<{ id: string; prepared: PreparedComposerDraft }> => {
    const operationContext = activeContext
    const operationArgs = operationContext.args
    const { profilePatch } = await requireCurrentProfileAuthoring(operationContext)
    let prepared: PreparedComposerDraft
    try {
      prepared = await prepareComposerDraft({
        installation: operationContext.installation,
        profile: operationArgs.profile,
        dshHome: operationArgs.dshHome,
        cwd: operationArgs.cwd,
        patches: operationArgs.patches,
        targetUri: profilePatch.uri,
        actionIds,
      })
    } catch (cause) {
      // Convert a higher-precedence layer that appeared during the official
      // preview into the same narrow product boundary instead of leaking a
      // deeper adapter failure.
      await requireCurrentProfileAuthoring(operationContext)
      throw cause
    }
    assertPreparedSourcesRemainWritable(prepared.sources)
    assertCurrentContext(operationContext.revision)
    return {
      id: randomUUID(),
      prepared,
    }
  }
  const handlers: StudioServerHandlers = {
    getInspection: () => {
      if (staleComposerDraft?.inspectionRefreshed === false) rejectStaleComposerDraft()
      return activeContext.inspection
    },
    getComposerDraft: currentComposerDraftView,
    getHarnessContext: currentHarnessContext,
    getDeveloperDiagnostics: async () => {
      const operationContext = activeContext
      const operationArgs = operationContext.args
      const sources = await readProfileSources({
        installation: operationContext.installation,
        profile: operationArgs.profile,
        cwd: operationArgs.cwd,
        dshHome: operationArgs.dshHome,
        patches: operationArgs.patches,
      })
      const [e2bReadiness, workspaceMaterialization] = await Promise.all([
        probeE2bProfileReadiness(sources.profileDir),
        probeGitWorkspaceMaterialization(operationArgs.cwd),
      ])
      assertCurrentContext(operationContext.revision)
      return createStudioDeveloperDiagnostics({
        installation: operationContext.installation,
        sources,
        dshHome: operationArgs.dshHome,
        workspace: operationArgs.cwd,
        e2bReadiness,
        workspaceMaterialization,
      })
    },
    checkHarnessContext: async body => {
      let request: ReturnType<typeof parseHarnessContextCheckRequest>
      try {
        request = parseHarnessContextCheckRequest(body)
      } catch (cause) {
        if (cause instanceof HarnessContextRequestError) throw harnessContextError(400, 'request-invalid')
        throw cause
      }
      // Every schema-valid Check invalidates the previous one, even if this attempt fails.
      pendingHarnessContextCandidate = undefined
      pendingHarnessContextInitialization = undefined
      if (activeContext.args.patches.length > 0) throw harnessContextError(409, 'explicit-patches')
      if (checkingContext || selectingContext) throw harnessContextError(409, 'context-busy')
      checkingContext = true
      const operationContext = activeContext
      try {
        let installationDirectory: CanonicalLocalDirectory
        try {
          installationDirectory = await canonicalLocalDirectory(request.installationRoot)
        } catch (cause) {
          if (cause instanceof HarnessContextRequestError) throw harnessContextError(400, 'request-invalid')
          if (cause instanceof HarnessContextLocalDirectoryError) {
            throw harnessContextError(422, 'installation-unavailable')
          }
          throw cause
        }
        let dshHomeDirectory: CanonicalLocalDirectory
        try {
          dshHomeDirectory = await canonicalLocalDirectory(request.dshHome)
        } catch (cause) {
          if (cause instanceof HarnessContextRequestError) throw harnessContextError(400, 'request-invalid')
          if (cause instanceof HarnessContextLocalDirectoryError) throw harnessContextError(422, 'home-unavailable')
          throw cause
        }
        let checkoutIdentity: DshCheckoutFileIdentity
        try {
          checkoutIdentity = await inspectDshCheckoutFiles(installationDirectory.canonical)
        } catch {
          throw harnessContextError(422, 'installation-unavailable')
        }
        let homePatchIdentity: DshHomePatchIdentity
        let profiles: LocalDshProfile[]
        try {
          [homePatchIdentity, profiles] = await Promise.all([
            inspectLocalDshHomePatch(dshHomeDirectory.canonical),
            discoverBoundedLocalDshProfiles(dshHomeDirectory.canonical),
          ])
        } catch {
          throw harnessContextError(422, 'home-unavailable')
        }
        if (operationContext !== activeContext) throw harnessContextError(409, 'context-changed')
        const candidate: PendingHarnessContextCandidate = {
          id: randomUUID(),
          expectedContextRevision: operationContext.revision,
          expiresAt: Date.now() + HARNESS_CONTEXT_CANDIDATE_TTL_MS,
          installationDirectory,
          dshHomeDirectory,
          checkoutIdentity,
          homePatchIdentity,
          profileNames: profiles.map(profile => profile.name),
          nodeExecutable: launchNodeExecutable,
        }
        pendingHarnessContextCandidate = candidate
        return {
          candidateId: candidate.id,
          expectedContextRevision: candidate.expectedContextRevision,
          installation: { version: checkoutIdentity.version },
          profiles: candidate.profileNames.map(name => ({ name })),
        }
      } finally {
        checkingContext = false
      }
    },
    previewHarnessContextInitialization: async body => {
      let request: ReturnType<typeof parseHarnessContextInitializePreviewRequest>
      try {
        request = parseHarnessContextInitializePreviewRequest(body)
      } catch (cause) {
        if (cause instanceof HarnessContextRequestError) throw harnessContextError(400, 'request-invalid')
        throw cause
      }
      // A schema-valid preview supersedes any earlier initialization preview.
      pendingHarnessContextInitialization = undefined
      if (activeContext.args.patches.length > 0) throw harnessContextError(409, 'explicit-patches')
      const candidate = pendingHarnessContextCandidate
      if (candidate === undefined || candidate.id !== request.candidateId) {
        throw harnessContextError(409, 'candidate-expired')
      }
      if (checkingContext || selectingContext || applying || planningChange || composerDraftUpdating) {
        throw harnessContextError(409, 'context-busy')
      }
      if (Date.now() > candidate.expiresAt) throw harnessContextError(409, 'candidate-expired')
      if (request.expectedContextRevision !== candidate.expectedContextRevision
        || request.expectedContextRevision !== activeContext.revision) {
        throw harnessContextError(409, 'context-changed')
      }

      checkingContext = true
      const operationContext = activeContext
      try {
        let checked: Awaited<ReturnType<typeof recheckHarnessContextCandidate>>
        try {
          checked = await recheckHarnessContextCandidate(candidate)
        } catch {
          throw harnessContextError(409, 'candidate-changed')
        }
        await requireMissingProfileInitializationTarget(checked.dshHomeDirectory.canonical)

        let candidateInstallation: DshInstallation
        try {
          candidateInstallation = await discoverCheckedCandidateInstallation(
            candidate,
            checked.installationDirectory,
            checked.checkoutIdentity,
          )
        } catch {
          throw harnessContextError(422, 'installation-unavailable')
        }
        try {
          await probeDshInstallation(candidateInstallation)
        } catch {
          throw harnessContextError(422, 'installation-incompatible')
        }
        try {
          await previewOfficialWebProfileInitialization(candidateInstallation, {
            cwd: operationContext.args.cwd,
          }, checked.homePatchIdentity)
        } catch (cause) {
          const compositionError = harnessContextCompositionError(cause)
          if (compositionError !== undefined) throw compositionError
          throw harnessContextError(422, 'composition-failed')
        }

        try {
          checked = await recheckHarnessContextCandidate(candidate)
        } catch {
          throw harnessContextError(409, 'candidate-changed')
        }
        await requireMissingProfileInitializationTarget(checked.dshHomeDirectory.canonical)
        if (operationContext !== activeContext) throw harnessContextError(409, 'context-changed')

        const initialization: PendingHarnessContextInitialization = {
          id: randomUUID(),
          expectedContextRevision: operationContext.revision,
          expiresAt: Date.now() + HARNESS_CONTEXT_CANDIDATE_TTL_MS,
          candidate,
        }
        pendingHarnessContextInitialization = initialization
        return {
          initializationId: initialization.id,
          candidateId: candidate.id,
          expectedContextRevision: initialization.expectedContextRevision,
          profile: INITIALIZABLE_PROFILE,
          installation: { version: candidateInstallation.version },
          canApply: true,
          pendingChanges: hasPendingChanges(),
          preview: {
            source: 'official-dsh',
            outcome: 'initialize-missing-profile',
            profileTargetState: 'missing',
            realHomeWritePerformed: false,
          },
        }
      } finally {
        checkingContext = false
      }
    },
    applyHarnessContextInitialization: async body => {
      let request: ReturnType<typeof parseHarnessContextInitializeApplyRequest>
      try {
        request = parseHarnessContextInitializeApplyRequest(body)
      } catch (cause) {
        if (cause instanceof HarnessContextRequestError) throw harnessContextError(400, 'request-invalid')
        throw cause
      }
      if (activeContext.args.patches.length > 0) throw harnessContextError(409, 'explicit-patches')
      const initialization = pendingHarnessContextInitialization
      if (initialization === undefined || initialization.id !== request.initializationId) {
        throw harnessContextError(409, 'initialization-preview-required')
      }
      // A valid opaque initialization preview is consumed by one Apply attempt.
      pendingHarnessContextInitialization = undefined
      pendingHarnessContextCandidate = undefined
      if (checkingContext || selectingContext || applying || planningChange || composerDraftUpdating) {
        throw harnessContextError(409, 'context-busy')
      }
      if (Date.now() > initialization.expiresAt) {
        throw harnessContextError(409, 'initialization-preview-required')
      }
      if (request.expectedContextRevision !== initialization.expectedContextRevision
        || request.expectedContextRevision !== activeContext.revision) {
        throw harnessContextError(409, 'context-changed')
      }
      if (hasPendingChanges() && !request.discardPendingChanges) {
        throw harnessContextError(409, 'pending-confirmation-required')
      }

      selectingContext = true
      const operationContext = activeContext
      const candidate = initialization.candidate
      let officialWriteAttempted = false
      let selectedDshHome: string | undefined
      try {
        let checked: Awaited<ReturnType<typeof recheckHarnessContextCandidate>>
        try {
          checked = await recheckHarnessContextCandidate(candidate)
        } catch {
          throw harnessContextError(409, 'candidate-changed')
        }
        selectedDshHome = checked.dshHomeDirectory.canonical
        await requireMissingProfileInitializationTarget(selectedDshHome)

        let candidateInstallation: DshInstallation
        try {
          candidateInstallation = await discoverCheckedCandidateInstallation(
            candidate,
            checked.installationDirectory,
            checked.checkoutIdentity,
          )
        } catch {
          throw harnessContextError(422, 'installation-unavailable')
        }
        try {
          await probeDshInstallation(candidateInstallation)
        } catch {
          throw harnessContextError(422, 'installation-incompatible')
        }

        // This is the final no-write basis check. The official command is the
        // only writer and receives argv directly with shell execution disabled.
        let finalHomePatchIdentity: DshHomePatchIdentity
        try {
          finalHomePatchIdentity = await inspectLocalDshHomePatch(selectedDshHome)
        } catch {
          throw harnessContextError(409, 'candidate-changed')
        }
        if (!sameHomePatchIdentity(candidate.homePatchIdentity, finalHomePatchIdentity)) {
          throw harnessContextError(409, 'candidate-changed')
        }
        await requireMissingProfileInitializationTarget(selectedDshHome)
        officialWriteAttempted = true
        await dumpDshConfig({
          installation: candidateInstallation,
          profile: INITIALIZABLE_PROFILE,
          mode: 'default',
          cwd: operationContext.args.cwd,
          dshHome: selectedDshHome,
        })

        const nextArgs: StudioRuntimeArguments = {
          profile: INITIALIZABLE_PROFILE,
          dshHome: selectedDshHome,
          cwd: operationContext.args.cwd,
          patches: [],
        }
        const expectedProfileNames = [...candidate.profileNames, INITIALIZABLE_PROFILE]
          .sort((left, right) => left.localeCompare(right, 'en'))
        const initializedProfiles = await discoverBoundedLocalDshProfiles(selectedDshHome)
        if (initializedProfiles.length !== expectedProfileNames.length
          || initializedProfiles.some((profile, index) => profile.name !== expectedProfileNames[index])) {
          throw new Error('official DSH initialization produced an unexpected profile set')
        }

        const nextLoaded = await loadCoherentStudioProfile(candidateInstallation, nextArgs)
        const confirmation = await Promise.all([
          discoverBoundedLocalDshProfiles(selectedDshHome),
          inspectDshCheckoutFiles(checked.installationDirectory.canonical),
          discoverOfficialDshComponentPackages(candidateInstallation),
          readProfileSources({
            installation: candidateInstallation,
            profile: nextArgs.profile,
            cwd: nextArgs.cwd,
            dshHome: nextArgs.dshHome,
            patches: nextArgs.patches,
          }),
        ])
        const confirmedProfiles = confirmation[0]
        const confirmedCheckoutIdentity = confirmation[1]
        const confirmedComponentPackages = confirmation[2]
        const confirmedSources = confirmation[3]
        assertProfileSourcesCoherent(nextLoaded.sources, confirmedSources)
        if (confirmedProfiles.length !== expectedProfileNames.length
          || confirmedProfiles.some((profile, index) => profile.name !== expectedProfileNames[index])
          || !sameCheckoutFileIdentity(candidate.checkoutIdentity, confirmedCheckoutIdentity)
          || !componentPackagesAreCoherent(nextLoaded.componentPackages, confirmedComponentPackages)) {
          throw new Error('initialized profile changed during official composition')
        }
        if (operationContext !== activeContext) throw new Error('selected Harness changed during initialization')

        const nextContext: ActiveStudioContext = {
          installation: candidateInstallation,
          args: nextArgs,
          inspection: nextLoaded.inspection,
          revision: operationContext.revision + 1,
        }
        // The selected context and its draft change only after the initialized
        // profile has passed discovery, official composition, and confirmation.
        activeContext = nextContext
        clearAllPending()
        return {
          context: harnessContextView(nextContext, confirmedProfiles),
          inspection: nextContext.inspection,
          draft: currentComposerDraftView(),
          initialization: {
            profile: INITIALIZABLE_PROFILE,
            source: 'official-dsh',
            writePerformed: true,
          },
        }
      } catch (cause) {
        if (officialWriteAttempted && selectedDshHome !== undefined) {
          throw await profileInitializationFailure(selectedDshHome)
        }
        throw cause
      } finally {
        selectingContext = false
      }
    },
    openHarnessContext: async body => {
      let request: ReturnType<typeof parseHarnessContextOpenRequest>
      try {
        request = parseHarnessContextOpenRequest(body)
      } catch (cause) {
        if (cause instanceof HarnessContextRequestError) throw harnessContextError(400, 'request-invalid')
        throw cause
      }
      if (activeContext.args.patches.length > 0) throw harnessContextError(409, 'explicit-patches')
      const candidate = pendingHarnessContextCandidate
      if (candidate === undefined || candidate.id !== request.candidateId) {
        throw harnessContextError(409, 'candidate-expired')
      }
      // A valid opaque candidate is consumed by exactly one Open attempt.
      pendingHarnessContextCandidate = undefined
      pendingHarnessContextInitialization = undefined
      if (checkingContext || selectingContext || applying || planningChange || composerDraftUpdating) {
        throw harnessContextError(409, 'context-busy')
      }
      if (Date.now() > candidate.expiresAt) throw harnessContextError(409, 'candidate-expired')
      if (request.expectedContextRevision !== candidate.expectedContextRevision
        || request.expectedContextRevision !== activeContext.revision) {
        throw harnessContextError(409, 'context-changed')
      }
      if (hasPendingChanges() && !request.discardPendingChanges) {
        throw harnessContextError(409, 'pending-confirmation-required')
      }
      selectingContext = true
      const operationContext = activeContext
      try {
        let installationDirectory: CanonicalLocalDirectory
        let dshHomeDirectory: CanonicalLocalDirectory
        let checkoutIdentity: DshCheckoutFileIdentity
        let profiles: LocalDshProfile[]
        try {
          [installationDirectory, dshHomeDirectory] = await Promise.all([
            canonicalLocalDirectory(candidate.installationDirectory.requested),
            canonicalLocalDirectory(candidate.dshHomeDirectory.requested),
          ])
          if (!canonicalPathsMatch(candidate.installationDirectory, installationDirectory)
            || !canonicalPathsMatch(candidate.dshHomeDirectory, dshHomeDirectory)) {
            throw new HarnessContextLocalDirectoryError('candidate path changed')
          }
          checkoutIdentity = await inspectDshCheckoutFiles(installationDirectory.canonical)
          profiles = await discoverBoundedLocalDshProfiles(dshHomeDirectory.canonical)
          if (!sameCheckoutFileIdentity(candidate.checkoutIdentity, checkoutIdentity)
            || profiles.length !== candidate.profileNames.length
            || profiles.some((profile, index) => profile.name !== candidate.profileNames[index])) {
            throw new HarnessContextLocalDirectoryError('candidate identity changed')
          }
        } catch {
          throw harnessContextError(409, 'candidate-changed')
        }
        if (!candidate.profileNames.includes(request.profile)) {
          throw harnessContextError(409, 'profile-missing')
        }

        let candidateInstallation: DshInstallation
        try {
          candidateInstallation = await discoverBuiltDshCheckout(
            installationDirectory.canonical,
            candidate.nodeExecutable,
          )
          if (candidateInstallation.version !== checkoutIdentity.version
            || candidateInstallation.nodeExecutable !== candidate.nodeExecutable) {
            throw new Error('candidate installation identity changed')
          }
        } catch {
          throw harnessContextError(422, 'installation-unavailable')
        }
        try {
          await probeDshInstallation(candidateInstallation)
        } catch {
          throw harnessContextError(422, 'installation-incompatible')
        }

        const nextArgs: StudioRuntimeArguments = {
          profile: request.profile,
          dshHome: dshHomeDirectory.canonical,
          cwd: operationContext.args.cwd,
          patches: [],
        }
        let nextLoaded: Awaited<ReturnType<typeof loadCoherentStudioProfile>>
        try {
          nextLoaded = await loadCoherentStudioProfile(candidateInstallation, nextArgs)
        } catch (cause) {
          const compositionError = harnessContextCompositionError(cause)
          if (compositionError !== undefined) throw compositionError
          if (cause instanceof StudioHttpError) throw cause
          throw harnessContextError(422, 'composition-failed')
        }
        let confirmedProfiles: LocalDshProfile[]
        try {
          const confirmation = await Promise.all([
            discoverBoundedLocalDshProfiles(dshHomeDirectory.canonical),
            inspectDshCheckoutFiles(installationDirectory.canonical),
            discoverOfficialDshComponentPackages(candidateInstallation),
            readProfileSources({
              installation: candidateInstallation,
              profile: nextArgs.profile,
              cwd: nextArgs.cwd,
              dshHome: nextArgs.dshHome,
              patches: nextArgs.patches,
            }),
          ])
          confirmedProfiles = confirmation[0]
          const confirmedCheckoutIdentity = confirmation[1]
          const confirmedComponentPackages = confirmation[2]
          const confirmedSources = confirmation[3]
          assertProfileSourcesCoherent(nextLoaded.sources, confirmedSources)
          if (confirmedProfiles.length !== candidate.profileNames.length
            || confirmedProfiles.some((profile, index) => profile.name !== candidate.profileNames[index])
            || !sameCheckoutFileIdentity(candidate.checkoutIdentity, confirmedCheckoutIdentity)
            || !componentPackagesAreCoherent(nextLoaded.componentPackages, confirmedComponentPackages)) {
            throw new HarnessContextLocalDirectoryError('candidate identity changed during composition')
          }
        } catch (cause) {
          const compositionError = harnessContextCompositionError(cause)
          if (compositionError !== undefined) throw compositionError
          throw harnessContextError(409, 'candidate-changed')
        }
        if (operationContext !== activeContext) throw harnessContextError(409, 'context-changed')

        const nextContext: ActiveStudioContext = {
          installation: candidateInstallation,
          args: nextArgs,
          inspection: nextLoaded.inspection,
          revision: operationContext.revision + 1,
        }
        // This is the only commit point. Everything above staged candidate state only.
        activeContext = nextContext
        clearAllPending()
        return {
          context: harnessContextView(nextContext, confirmedProfiles),
          inspection: nextContext.inspection,
          draft: currentComposerDraftView(),
        }
      } finally {
        selectingContext = false
      }
    },
    selectHarnessContext: async body => {
      if (applying) throw new Error('wait for the current configuration apply to finish before switching Harness')
      if (planningChange) throw new Error('wait for the current configuration preview to finish before switching Harness')
      if (composerDraftUpdating) throw new Error('wait for the current Composer draft update to finish before switching Harness')
      if (checkingContext) throw new Error('wait for the Harness context check to finish before switching Harness')
      if (selectingContext) throw new Error('a Harness switch is already in progress')
      selectingContext = true
      try {
        const operationContext = activeContext
        const request = parseHarnessContextSelection(body)
        if (request.profile !== operationContext.args.profile && operationContext.args.patches.length > 0) {
          throw new Error('profile switching is unavailable while explicit patch overlays are active')
        }
        const profiles = await discoverLocalDshProfiles(operationContext.args.dshHome)
        if (!profiles.some(profile => profile.name === request.profile)) {
          throw new Error(`DSH profile ${JSON.stringify(request.profile)} is not an initialized local profile`)
        }
        const nextArgs = { ...operationContext.args, profile: request.profile }
        const nextLoaded = await loadCoherentStudioProfile(operationContext.installation, nextArgs)
        if (operationContext !== activeContext) {
          throw new Error('the selected Harness changed while this profile was being loaded')
        }
        const nextContext: ActiveStudioContext = {
          ...operationContext,
          args: nextArgs,
          inspection: nextLoaded.inspection,
          revision: operationContext.revision + 1,
        }
        activeContext = nextContext
        clearAllPending()
        return {
          context: harnessContextView(nextContext, profiles),
          inspection: nextContext.inspection,
          draft: currentComposerDraftView(),
        }
      } finally {
        selectingContext = false
      }
    },
    planScalar: async body => {
      if (selectingContext) throw new Error('wait for the Harness switch to finish before building a preview')
      if (applying) throw new Error('wait for the current configuration apply to finish before building a preview')
      if (planningChange) throw new Error('another configuration preview is already in progress')
      if (composerDraftUpdating) throw new Error('wait for the current Composer draft update to finish before building a preview')
      if (staleComposerDraft !== undefined) rejectStaleComposerDraft()
      planningChange = true
      try {
        const operationContext = activeContext
        const operationArgs = operationContext.args
        const request = parseScalarPlanBody(body)
        const { profilePatch } = await requireCurrentProfileAuthoring(operationContext)
        const editable = operationContext.inspection.nodes.some(node =>
          node.plane === 'resolved'
          && node.attributes.entryId === request.entryId
          && Array.isArray(node.attributes.editableFields)
          && node.attributes.editableFields.includes('disabled'))
        if (!editable) {
          throw new Error(`entry ${JSON.stringify(request.entryId)} has no supported disabled edit in the profile patch`)
        }
        let proposal: ScalarEditProposal
        try {
          proposal = await prepareScalarEdit({
            installation: operationContext.installation,
            profile: operationArgs.profile,
            dshHome: operationArgs.dshHome,
            cwd: operationArgs.cwd,
            patches: operationArgs.patches,
            targetUri: profilePatch.uri,
            intent: {
              kind: 'set-declared-scalar',
              entryId: request.entryId,
              path: ['disabled'],
              value: request.value,
            },
            ...(request.repairId === undefined ? {} : { repairId: request.repairId }),
            validate: true,
          })
        } catch (cause) {
          await requireCurrentProfileAuthoring(operationContext)
          throw cause
        }
        assertPreparedSourcesRemainWritable(proposal.sources)
        assertCurrentContext(operationContext.revision)
        const planId = proposal.canApply && proposal.validation !== undefined && proposal.plan.previews.some(preview => preview.changed)
          ? randomUUID()
          : undefined
        clearAllPending()
        if (planId !== undefined) pendingPlan = { id: planId, proposal }
        return scalarPlanView(proposal, planId)
      } finally {
        planningChange = false
      }
    },
    applyScalar: async body => {
      if (selectingContext) throw new Error('wait for the Harness switch to finish before applying a change')
      if (applying) throw new Error('another configuration apply is already in progress')
      if (planningChange) throw new Error('wait for the current configuration preview to finish before applying a change')
      if (composerDraftUpdating) throw new Error('wait for the current Composer draft update to finish before applying a change')
      const request = parseScalarApplyBody(body)
      const pending = pendingPlan
      if (pending === undefined || pending.id !== request.planId) {
        throw new Error('this validated plan is no longer current; create a new preview')
      }
      if (pending.proposal.validation === undefined || !pending.proposal.canApply) {
        throw new Error('this plan is not eligible for apply')
      }
      if (request.confirmation !== pending.proposal.plan.summary) {
        throw new Error('confirmation does not match the validated plan summary')
      }
      const operationContext = activeContext
      applying = true
      try {
        const assertSourcesCurrent = (phase: 'before-replace' | 'after-replace' | 'before-finalize') => assertPendingApplySourcesCurrent(
          operationContext,
          pending.proposal.plan.targetUri,
          phase === 'before-replace'
            ? pending.proposal.plan.precondition.expectedBytes
            : pending.proposal.plan.candidateBytes,
        )
        await assertSourcesCurrent('before-replace')
        const applied = await applyDshScalarEdit({
          installation: operationContext.installation,
          sources: pending.proposal.sources,
          plan: pending.proposal.validation,
          cwd: operationContext.args.cwd,
          dshHome: operationContext.args.dshHome,
          assertSourcesCurrent,
        })
        clearAllPending()
        await reloadCurrentProfile()
        return {
          state: applied.state,
          summary: applied.summary,
          reimport: applied.reimport,
          inspection: activeContext.inspection,
        }
      } finally {
        applying = false
      }
    },
    planProviderReplacement: async body => {
      if (selectingContext) throw new Error('wait for the Harness switch to finish before building a preview')
      if (applying) throw new Error('wait for the current configuration apply to finish before building a preview')
      if (planningChange) throw new Error('another configuration preview is already in progress')
      if (composerDraftUpdating) throw new Error('wait for the current Composer draft update to finish before building a preview')
      if (staleComposerDraft !== undefined) rejectStaleComposerDraft()
      planningChange = true
      try {
        const operationContext = activeContext
        const operationArgs = operationContext.args
        const request = parseProviderReplacementPlanBody(body)
        const { profilePatch } = await requireCurrentProfileAuthoring(operationContext)
        let available: Record<string, unknown> | undefined
        for (const node of operationContext.inspection.nodes) {
          if (node.plane !== 'resolved') continue
          for (const action of [node.attributes.providerReplacement, node.attributes.providerReset]) {
            if (action !== null
              && typeof action === 'object'
              && !Array.isArray(action)
              && (action as Record<string, unknown>).id === request.replacementId) {
              available = action as Record<string, unknown>
              break
            }
          }
          if (available !== undefined) break
        }
        if (available === undefined) {
          throw new Error('this provider action is not supported by the current graph and profile patch')
        }
        const common = {
          installation: operationContext.installation,
          profile: operationArgs.profile,
          dshHome: operationArgs.dshHome,
          cwd: operationArgs.cwd,
          patches: operationArgs.patches,
          targetUri: profilePatch.uri,
          validate: true,
        }
        let proposal: StudioCompositionProposal
        try {
          if (available.mode === 'pin-browse' || available.mode === 'reset-auto') {
            proposal = await prepareDirectoryPickerChange(common)
          } else if (available.mode === 'reset') {
            proposal = await prepareFsProviderReset(common)
          } else {
            const targetEntryId = available.replacementEntryId
            if (targetEntryId !== 'fs-sandbox' && targetEntryId !== 'fs-local') {
              throw new Error('this provider action has no supported target provider')
            }
            proposal = await prepareFsProviderChange({ ...common, targetEntryId })
          }
        } catch (cause) {
          await requireCurrentProfileAuthoring(operationContext)
          throw cause
        }
        assertPreparedSourcesRemainWritable(proposal.sources)
        assertCurrentContext(operationContext.revision)
        const planId = proposal.validation !== undefined && proposal.plan.previews.some(preview => preview.changed)
          ? randomUUID()
          : undefined
        clearAllPending()
        if (planId !== undefined) pendingProviderReplacement = { id: planId, proposal }
        return providerReplacementPlanView(proposal, planId)
      } finally {
        planningChange = false
      }
    },
    applyProviderReplacement: async body => {
      if (selectingContext) throw new Error('wait for the Harness switch to finish before applying a change')
      if (applying) throw new Error('another configuration apply is already in progress')
      if (planningChange) throw new Error('wait for the current configuration preview to finish before applying a change')
      if (composerDraftUpdating) throw new Error('wait for the current Composer draft update to finish before applying a change')
      const request = parseScalarApplyBody(body)
      const pending = pendingProviderReplacement
      if (pending === undefined || pending.id !== request.planId) {
        throw new Error('this validated provider replacement is no longer current; create a new preview')
      }
      if (pending.proposal.validation === undefined || !pending.proposal.canApply) {
        throw new Error('this provider replacement is not eligible for apply')
      }
      if (request.confirmation !== pending.proposal.plan.summary) {
        throw new Error('confirmation does not match the validated provider replacement summary')
      }
      const operationContext = activeContext
      applying = true
      try {
        const assertSourcesCurrent = (phase: 'before-replace' | 'after-replace' | 'before-finalize') => assertPendingApplySourcesCurrent(
          operationContext,
          pending.proposal.plan.targetUri,
          phase === 'before-replace'
            ? pending.proposal.plan.precondition.expectedBytes
            : pending.proposal.plan.candidateBytes,
        )
        await assertSourcesCurrent('before-replace')
        const applied = await applyDshScalarEdit({
          installation: operationContext.installation,
          sources: pending.proposal.sources,
          plan: pending.proposal.validation,
          cwd: operationContext.args.cwd,
          dshHome: operationContext.args.dshHome,
          assertSourcesCurrent,
        })
        clearAllPending()
        await reloadCurrentProfile()
        return {
          state: applied.state,
          summary: applied.summary,
          reimport: applied.reimport,
          inspection: activeContext.inspection,
        }
      } finally {
        applying = false
      }
    },
    updateComposerDraft: async body => {
      if (selectingContext) throw new Error('wait for the Harness switch to finish before updating the Composer draft')
      if (applying) throw new Error('wait for the current configuration apply to finish before updating the Composer draft')
      if (planningChange) throw new Error('wait for the current configuration preview to finish before updating the Composer draft')
      if (composerDraftUpdating) throw new Error('another Composer draft update is already in progress')
      composerDraftUpdating = true
      try {
        const request = parseComposerDraftUpdateBody(body)
        if (staleComposerDraft !== undefined
          && (request.action === 'repair' || request.action === 'redo')) {
          rejectStaleComposerDraft()
        }
        if (request.action === 'clear') {
          if (staleComposerDraft !== undefined) {
            const stale = staleComposerDraft
            activateComposerDraftFamily()
            composerDraftActions = []
            composerDraftRedo = undefined
            pendingComposerDraft = undefined
            staleComposerDraft = {
              ...stale,
              actionIds: [],
            }
            if (!(await refreshStaleInspection())) rejectStaleComposerDraft()
            clearComposerDraft()
            return {
              draft: currentComposerDraftView(),
              inspection: activeContext.inspection,
            }
          }
          activateComposerDraftFamily()
          clearComposerDraft()
          return currentComposerDraftView()
        }
        if (request.action === 'add') {
          const sameOutcomeActions = composerDraftActions.filter(actionId => actionId === request.actionId)
          if (sameOutcomeActions.length > 0) {
            rejectComposerDraftConflict(composerDraftConflict(
              'already-pending',
              request.actionId,
              sameOutcomeActions,
            ))
          }
          const mutuallyExclusiveActions = composerDraftActions.filter(actionId =>
            actionId !== request.actionId
              && composerDraftActionFamily(actionId) === composerDraftActionFamily(request.actionId))
          if (mutuallyExclusiveActions.length > 0) {
            rejectComposerDraftConflict(composerDraftConflict(
              'cannot-combine',
              request.actionId,
              mutuallyExclusiveActions,
            ))
          }
          if (staleComposerDraft !== undefined) {
            rejectComposerDraftConflict(composerDraftConflict(
              'resolve-first',
              request.actionId,
              composerDraftActions,
            ))
          }
          if (pendingComposerDraft?.prepared.state === 'blocked') {
            const blocked = blockedComposerDraftDetails(pendingComposerDraft.prepared)
            rejectComposerDraftConflict(composerDraftConflict(
              'resolve-first',
              request.actionId,
              blocked.actionIds,
              blocked.repairIds,
            ))
          }
          if (composerDraftActions.length >= 2) {
            rejectComposerDraftConflict(composerDraftConflict(
              'tray-full',
              request.actionId,
              composerDraftActions,
            ))
          }
          const nextActions = [...composerDraftActions, request.actionId]
          let nextPending: { id: string; prepared: PreparedComposerDraft }
          try {
            nextPending = await prepareDraftActions(nextActions)
          } catch (cause) {
            if (cause instanceof ComposerDraftBoundedSequenceError) {
              rejectComposerDraftConflict(composerDraftConflict(
                'cannot-combine',
                request.actionId,
                composerDraftActions,
              ))
            }
            throw cause
          }
          if (composerDraftActions.length > 0 && nextPending.prepared.state === 'blocked') {
            rejectComposerDraftConflict(composerDraftConflict(
              'cannot-combine',
              request.actionId,
              composerDraftActions,
            ))
          }
          activateComposerDraftFamily()
          composerDraftActions = nextActions
          composerDraftRedo = undefined
          pendingComposerDraft = nextPending
          staleComposerDraft = undefined
          return currentComposerDraftView()
        }
        if (request.action === 'repair') {
          const blockedAction = request.repairId === WEB_STARTUP_DISABLE_REPAIR_ID
            ? 'web-startup-disable' as const
            : 'fs-provider-remove' as const
          const repairedAction = request.repairId === WEB_STARTUP_DISABLE_REPAIR_ID
            ? 'web-startup-disable-with-consumers' as const
            : 'fs-provider-remove-with-sandbox' as const
          const blockedIndex = composerDraftActions.indexOf(blockedAction)
          if (blockedIndex === -1) {
            throw new Error('the current Composer draft does not contain the dependency operation for this repair')
          }
          const nextActions = composerDraftActions.map((actionId, index) =>
            index === blockedIndex ? repairedAction : actionId)
          const nextPending = await prepareDraftActions(nextActions)
          activateComposerDraftFamily()
          composerDraftActions = nextActions
          composerDraftRedo = undefined
          pendingComposerDraft = nextPending
          staleComposerDraft = undefined
          return currentComposerDraftView()
        }
        if (request.action === 'remove') {
          const removedIndex = composerDraftActions.indexOf(request.actionId)
          if (removedIndex === -1) {
            throw new Error('the current Composer draft does not contain this operation')
          }
          const recoveringStaleDraft = await reloadStaleInspectionForRecovery()
          const nextActions = composerDraftActions.filter((_, index) => index !== removedIndex)
          let nextPending: { id: string; prepared: PreparedComposerDraft } | undefined
          try {
            nextPending = nextActions.length === 0 ? undefined : await prepareDraftActions(nextActions)
          } catch (cause) {
            if (recoveringStaleDraft) {
              await refreshStaleInspection()
              rejectStaleComposerDraft()
            }
            throw cause
          }
          activateComposerDraftFamily()
          composerDraftActions = nextActions
          composerDraftRedo = { actionId: request.actionId, index: removedIndex }
          pendingComposerDraft = nextPending
          staleComposerDraft = undefined
          const draft = currentComposerDraftView()
          return recoveringStaleDraft ? { draft, inspection: activeContext.inspection } : draft
        }
        if (request.action === 'undo') {
          const undone = composerDraftActions.at(-1)
          if (undone === undefined) return currentComposerDraftView()
          const recoveringStaleDraft = await reloadStaleInspectionForRecovery()
          const nextActions = composerDraftActions.slice(0, -1)
          let nextPending: { id: string; prepared: PreparedComposerDraft } | undefined
          try {
            nextPending = nextActions.length === 0 ? undefined : await prepareDraftActions(nextActions)
          } catch (cause) {
            if (recoveringStaleDraft) {
              await refreshStaleInspection()
              rejectStaleComposerDraft()
            }
            throw cause
          }
          activateComposerDraftFamily()
          composerDraftActions = nextActions
          composerDraftRedo = { actionId: undone, index: nextActions.length }
          pendingComposerDraft = nextPending
          staleComposerDraft = undefined
          const draft = currentComposerDraftView()
          return recoveringStaleDraft ? { draft, inspection: activeContext.inspection } : draft
        }
        if (composerDraftRedo === undefined) return currentComposerDraftView()
        const nextActions = [...composerDraftActions]
        nextActions.splice(
          Math.min(composerDraftRedo.index, nextActions.length),
          0,
          composerDraftRedo.actionId,
        )
        const nextPending = await prepareDraftActions(nextActions)
        activateComposerDraftFamily()
        composerDraftActions = nextActions
        composerDraftRedo = undefined
        pendingComposerDraft = nextPending
        staleComposerDraft = undefined
        return currentComposerDraftView()
      } finally {
        composerDraftUpdating = false
      }
    },
    applyComposerDraft: async body => {
      if (selectingContext) throw new Error('wait for the Harness switch to finish before applying a change')
      if (applying) throw new Error('another configuration apply is already in progress')
      if (planningChange) throw new Error('wait for the current configuration preview to finish before applying a change')
      if (composerDraftUpdating) throw new Error('wait for the current Composer draft update to finish before applying a change')
      const request = parseComposerDraftApplyBody(body)
      const pending = pendingComposerDraft
      if (pending === undefined || pending.id !== request.draftId) {
        throw new Error('this validated Composer draft is no longer current; rebuild the draft')
      }
      if (pending.prepared.state !== 'validated') {
        throw new Error('this Composer draft still has an unresolved dependency blocker')
      }
      if (request.confirmation !== pending.prepared.plan.summary) {
        throw new Error('confirmation does not match the validated Composer draft summary')
      }
      const operationContext = activeContext
      applying = true
      try {
        const assertSourcesCurrent = (phase: 'before-replace' | 'after-replace' | 'before-finalize') => assertPendingApplySourcesCurrent(
          operationContext,
          pending.prepared.plan.targetUri,
          phase === 'before-replace'
            ? pending.prepared.plan.precondition.expectedBytes
            : pending.prepared.plan.candidateBytes,
        )
        await assertSourcesCurrent('before-replace')
        const applied = await applyDshScalarEdit({
          installation: operationContext.installation,
          sources: pending.prepared.sources,
          plan: pending.prepared.validation,
          cwd: operationContext.args.cwd,
          dshHome: operationContext.args.dshHome,
          assertSourcesCurrent,
        })
        pendingPlan = undefined
        pendingProviderReplacement = undefined
        clearComposerDraft()
        await reloadCurrentProfile()
        return {
          state: applied.state,
          summary: applied.summary,
          reimport: applied.reimport,
          inspection: activeContext.inspection,
          draft: currentComposerDraftView(),
        }
      } catch (cause) {
        if (!(cause instanceof StaleSourceError)) throw cause

        const preservedActions = [...composerDraftActions]
        const preservedRedo = composerDraftRedo === undefined
          ? undefined
          : { ...composerDraftRedo }
        pendingComposerDraft = undefined
        staleComposerDraft = {
          id: randomUUID(),
          actionIds: preservedActions,
          inspectionRefreshed: false,
        }

        let replanned: { id: string; prepared: PreparedComposerDraft } | undefined
        let inspectionRefreshed = await refreshStaleInspection()
        if (inspectionRefreshed) {
          try {
            replanned = await prepareDraftActions(preservedActions)
          } catch {
            // Re-read after a failed replay so a second external change cannot revive an older graph.
            inspectionRefreshed = await refreshStaleInspection()
          }
        }

        composerDraftActions = preservedActions
        composerDraftRedo = preservedRedo
        if (replanned?.prepared.state === 'validated') {
          pendingComposerDraft = replanned
          staleComposerDraft = undefined
          throw new StudioHttpError(409, {
            error: composerDraftStaleError('replanned'),
            draft: currentComposerDraftView(),
            inspection: activeContext.inspection,
          })
        }

        pendingComposerDraft = undefined
        staleComposerDraft = {
          ...staleComposerDraft,
          inspectionRefreshed,
        }
        rejectStaleComposerDraft()
      } finally {
        applying = false
      }
    },
  }
  return {
    get inspection() {
      return activeContext.inspection
    },
    handlers,
  }
}

async function run(argv: readonly string[]): Promise<void> {
  const args = parseStudioArguments(argv)
  if (args === 'help') {
    process.stdout.write(HELP)
    return
  }
  const installation = await discoverBuiltDshCheckout(args.upstream, args.node)
  const runtime = await createStudioRuntime(installation, { ...args, cwd: process.cwd() })
  const server = await createStudioServer(runtime.inspection, runtime.handlers)
  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise)
    server.listen(args.port, '127.0.0.1', () => resolvePromise())
  })
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('Studio did not obtain a TCP address')
  process.stdout.write(`DSH GraphControl Studio is ready at http://127.0.0.1:${address.port}\n`)
  process.stdout.write(`Profile ${runtime.inspection.profile.name} · official DSH ${runtime.inspection.installation.version} · ${runtime.inspection.counts.nodes} nodes\n`)
  const close = (): void => {
    server.close(error => {
      if (error !== undefined) process.stderr.write(`Studio shutdown failed: ${error.message}\n`)
    })
  }
  process.once('SIGINT', close)
  process.once('SIGTERM', close)
}

const invokedPath = process.argv[1]
if (invokedPath !== undefined && resolve(invokedPath) === fileURLToPath(import.meta.url)) {
  try {
    await run(process.argv.slice(2))
  } catch (cause) {
    process.stderr.write(`DSH GraphControl Studio failed: ${cause instanceof Error ? cause.message : String(cause)}\n`)
    process.exitCode = 1
  }
}
