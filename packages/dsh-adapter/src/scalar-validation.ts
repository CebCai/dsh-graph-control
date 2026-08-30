import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  bytesEqual,
  commitValidatedEdit,
  finalizeCommittedEdit,
  restoreCommittedEdit,
  StaleSourceError,
} from '@dsh-graph-control/edit-transaction'
import { buildProfileHarnessGraph } from './profile-graph.ts'
import {
  readProfileSources,
  type DshProfileSources,
  type DshSourceDocument,
} from './profile-sources.ts'
import { dumpDshConfigFromProfileSources, type DshInstallation } from './index.ts'
import type { DshScalarEditPlan, YamlScalarEditValue } from './yaml-edit.ts'

export interface ValidateDshScalarEditOptions {
  installation: DshInstallation
  sources: DshProfileSources
  plan: DshScalarEditPlan
  cwd: string
  dshHome: string
  timeoutMs?: number
}

export interface ValidatedDshScalarEditPlan extends DshScalarEditPlan {
  state: 'validated'
  validation: {
    resolvedNodeId: string
    observedValue: YamlScalarEditValue
    observations: readonly ResolvedScalarObservation[]
    durationMs: number
  }
}

export interface ValidatedDshScalarEditCandidate {
  plan: ValidatedDshScalarEditPlan
  projection: ReturnType<typeof buildProfileHarnessGraph>
  sources: DshProfileSources
}

export interface ApplyDshScalarEditOptions extends Omit<ValidateDshScalarEditOptions, 'plan'> {
  plan: ValidatedDshScalarEditPlan
  /** Read-only guard for the complete composition immediately around replacement. */
  assertSourcesCurrent?: (phase: 'before-replace' | 'after-replace' | 'before-finalize') => Promise<void>
}

export interface AppliedDshScalarEditPlan extends Omit<ValidatedDshScalarEditPlan, 'state'> {
  state: 'committed'
  reimport: {
    resolvedNodeId: string
    observedValue: YamlScalarEditValue
    observations: readonly ResolvedScalarObservation[]
    durationMs: number
  }
}

export interface ResolvedScalarObservation {
  entryId: string
  path: readonly string[]
  resolvedNodeId: string
  observedValue: YamlScalarEditValue
}

export class DshReimportError extends Error {
  readonly targetUri: string
  readonly restored: boolean
  readonly backupPath?: string

  constructor(
    message: string,
    options: { targetUri: string; restored: boolean; backupPath?: string; cause?: unknown },
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'DshReimportError'
    this.targetUri = options.targetUri
    this.restored = options.restored
    if (options.backupPath !== undefined) this.backupPath = options.backupPath
  }
}

function valueAtPath(value: unknown, path: readonly string[]): unknown {
  let current = value
  for (const segment of path) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

interface CompositionSourceSlot {
  id: string
  document: DshSourceDocument
}

function compositionSourceSlots(sources: DshProfileSources): CompositionSourceSlot[] {
  return [
    { id: 'profile-manifest', document: sources.manifest },
    ...sources.layers.flatMap((layer, index) => [
      ...(layer.manifest === undefined
        ? []
        : [{ id: `layer:${index}:manifest`, document: layer.manifest }]),
      { id: `layer:${index}:patch`, document: layer.patch },
    ]),
  ]
}

function sourceSetMatches(
  expected: DshProfileSources,
  current: DshProfileSources,
  targetUri: string,
  expectedTargetBytes: Uint8Array,
): boolean {
  if (expected.profile !== current.profile
    || expected.profileDir !== current.profileDir
    || expected.bundleNames.length !== current.bundleNames.length
    || expected.bundleNames.some((name, index) => name !== current.bundleNames[index])
    || expected.layers.length !== current.layers.length
    || expected.layers.some((layer, index) => {
      const next = current.layers[index]
      return next === undefined
        || layer.order !== next.order
        || layer.owner !== next.owner
        || layer.label !== next.label
        || layer.packageName !== next.packageName
        || (layer.manifest === undefined) !== (next.manifest === undefined)
    })) return false

  const expectedSlots = compositionSourceSlots(expected)
  const currentSlots = compositionSourceSlots(current)
  if (expectedSlots.length !== currentSlots.length) return false
  return expectedSlots.every((slot, index) => {
    const next = currentSlots[index]
    if (next === undefined
      || slot.id !== next.id
      || slot.document.path !== next.document.path
      || slot.document.uri !== next.document.uri
      || slot.document.role !== next.document.role
      || slot.document.owner !== next.document.owner
      || slot.document.exists !== next.document.exists) return false
    if (!slot.document.exists || !next.document.exists) return true
    const expectedBytes = slot.document.uri === targetUri
      ? expectedTargetBytes
      : slot.document.rawBytes
    return bytesEqual(expectedBytes, next.document.rawBytes)
  })
}

async function assertCompositionSourcesCurrent(
  options: ApplyDshScalarEditOptions,
  expectedTargetBytes: Uint8Array,
): Promise<void> {
  const explicitPatches = options.sources.layers
    .filter(layer => layer.owner === 'explicit' && layer.patch.exists)
    .map(layer => layer.patch.path)
  let current: DshProfileSources
  try {
    current = await readProfileSources({
      installation: options.installation,
      profile: options.sources.profile,
      cwd: resolve(options.cwd),
      dshHome: resolve(options.dshHome),
      patches: explicitPatches,
    })
  } catch {
    throw new StaleSourceError(options.plan.targetUri)
  }
  if (!sourceSetMatches(options.sources, current, options.plan.targetUri, expectedTargetBytes)) {
    throw new StaleSourceError(options.plan.targetUri)
  }
}

function semanticKinds(plan: DshScalarEditPlan): readonly string[] {
  const semantic = plan.semanticChange
  if (semantic === null || typeof semantic !== 'object' || Array.isArray(semantic)) return []
  const kind = semantic.kind
  if (kind !== 'composer-draft') return typeof kind === 'string' ? [kind] : []
  const operations = semantic.operations
  if (!Array.isArray(operations)) throw new Error('composer draft has no semantic operations')
  return operations.map(operation => {
    if (operation === null || typeof operation !== 'object' || Array.isArray(operation)) {
      throw new Error('composer draft contains an invalid semantic operation')
    }
    const operationKind = (operation as Record<string, unknown>).kind
    if (typeof operationKind !== 'string') throw new Error('composer draft operation has no kind')
    return operationKind
  })
}

function planIntents(plan: DshScalarEditPlan): DshScalarEditPlan['intents'] {
  const first = plan.intents[0]
  if (first === undefined) throw new Error('validated scalar edit plan has no intents')
  if (JSON.stringify(first) !== JSON.stringify(plan.intent)) {
    throw new Error('validated scalar edit plan has inconsistent primary intent')
  }
  return plan.intents
}

function expectedResolvedScalars(
  projection: ReturnType<typeof buildProfileHarnessGraph>,
  plan: DshScalarEditPlan,
): {
  resolvedNodeId: string
  observedValue: YamlScalarEditValue
  observations: readonly ResolvedScalarObservation[]
} {
  if (projection.diagnostics.some(diagnostic => diagnostic.severity === 'error')) {
    throw new Error(`official DSH returned an unreadable resolved config: ${projection.diagnostics.map(diagnostic => diagnostic.message).join('; ')}`)
  }
  const kinds = semanticKinds(plan)
  const observations = planIntents(plan).map(intent => {
    const matches = projection.graph.nodes.filter(node =>
      node.plane === 'resolved' && node.attributes.entryId === intent.entryId)
    if (kinds.includes('remove-time-context')
      && intent.entryId === 'time-context'
      && intent.path.length === 0
      && intent.value === null) {
      if (matches.length !== 0) throw new Error('official DSH still resolved time-context after removal')
      return {
        entryId: intent.entryId,
        path: [],
        resolvedNodeId: 'absent:time-context',
        observedValue: null,
      }
    }
    if (kinds.includes('remove-schedule')
      && intent.entryId === 'schedule'
      && intent.path.length === 0
      && intent.value === null) {
      if (matches.length !== 0) throw new Error('official DSH still resolved Schedule after removal')
      return {
        entryId: intent.entryId,
        path: [],
        resolvedNodeId: 'absent:schedule',
        observedValue: null,
      }
    }
    if (matches.length === 0) {
      throw new Error(`official DSH resolved entry ${JSON.stringify(intent.entryId)} was not found`)
    }
    if (matches.length > 1) {
      throw new Error(`official DSH resolved entry ${JSON.stringify(intent.entryId)} is ambiguous`)
    }
    const resolved = matches[0]
    if (resolved === undefined) throw new Error('unreachable: resolved scalar entry is missing')
    const observed = valueAtPath(resolved.attributes.value, intent.path)
    if (!Object.is(observed, intent.value)) {
      throw new Error(`official DSH did not resolve the expected scalar at ${intent.entryId}.${intent.path.join('.')}`)
    }
    return {
      entryId: intent.entryId,
      path: [...intent.path],
      resolvedNodeId: resolved.id,
      observedValue: observed as YamlScalarEditValue,
    }
  })
  const first = observations[0]
  if (first === undefined) throw new Error('unreachable: scalar observations are empty')
  if (kinds.includes('add-time-context')) {
    const matches = projection.graph.nodes.filter(node =>
      node.plane === 'resolved'
      && node.attributes.entryId === 'time-context'
      && node.attributes.pluginName === '@deepseek-ai/dsh-time-context')
    if (matches.length !== 1) {
      throw new Error('official DSH did not compose the exact current time-context plugin')
    }
  }
  if (kinds.includes('remove-time-context')) {
    const matches = projection.graph.nodes.filter(node =>
      node.plane === 'resolved' && node.attributes.entryId === 'time-context')
    if (matches.length !== 0) {
      throw new Error('official DSH did not remove the current time-context plugin')
    }
  }
  if (kinds.includes('add-schedule')) {
    const matches = projection.graph.nodes.filter(node =>
      node.plane === 'resolved'
      && node.attributes.entryId === 'schedule'
      && node.attributes.pluginName === '@deepseek-ai/dsh-schedule')
    if (matches.length !== 1) {
      throw new Error('official DSH did not compose the exact current Schedule plugin')
    }
  }
  if (kinds.includes('remove-schedule')) {
    const matches = projection.graph.nodes.filter(node =>
      node.plane === 'resolved' && node.attributes.entryId === 'schedule')
    if (matches.length !== 0) {
      throw new Error('official DSH did not remove the current Schedule plugin')
    }
  }
  if (kinds.includes('reset-provider')) {
    const sandbox = projection.graph.nodes.filter(node =>
      node.plane === 'resolved'
      && node.attributes.entryId === 'fs-sandbox'
      && node.attributes.pluginName === '@deepseek-ai/dsh-fs-sandbox')
    const local = projection.graph.nodes.filter(node =>
      node.plane === 'resolved' && node.attributes.entryId === 'fs-local')
    const fsService = projection.graph.nodes.filter(node =>
      node.plane === 'resolved' && node.kind === 'service' && node.attributes.name === 'fs')
    if (sandbox.length !== 1 || local.length !== 0 || fsService.length !== 1) {
      throw new Error('official DSH did not restore the exact bundle-provided fs-sandbox topology')
    }
    const activeContract = projection.graph.edges.filter(edge =>
      edge.kind === 'provides-service'
      && edge.from === sandbox[0]?.id
      && edge.to === fsService[0]?.id
      && edge.attributes.evidence === 'current-official-contract'
      && edge.attributes.providerAvailability === 'active')
    if (activeContract.length !== 1) {
      throw new Error('official DSH did not restore one active fs-sandbox service contract')
    }
  }
  if (kinds.includes('pin-directory-picker')) {
    const auto = projection.graph.nodes.filter(node =>
      node.plane === 'resolved'
      && node.attributes.entryId === 'directory-picker'
      && node.attributes.pluginName === '@deepseek-ai/dsh-host-directory-picker-auto')
    const browse = projection.graph.nodes.filter(node =>
      node.plane === 'resolved'
      && node.attributes.entryId === 'directory-picker-browse'
      && node.attributes.pluginName === '@deepseek-ai/dsh-host-directory-picker-browse')
    const client = projection.graph.nodes.filter(node =>
      node.plane === 'resolved'
      && node.attributes.entryId === 'ui-directory-picker-browse'
      && node.attributes.pluginName === '@deepseek-ai/dsh-client-ui-directory-picker-browse')
    const service = projection.graph.nodes.filter(node =>
      node.plane === 'resolved' && node.kind === 'service' && node.attributes.name === 'directoryPicker')
    if (auto.length !== 1 || browse.length !== 1 || client.length !== 1 || service.length !== 1) {
      throw new Error('official DSH did not compose the exact host/client directory-browser pin')
    }
    const contracts = projection.graph.edges.filter(edge =>
      edge.kind === 'provides-service'
      && edge.to === service[0]?.id
      && edge.attributes.evidence === 'current-official-contract')
    const autoContract = contracts.filter(edge =>
      edge.from === auto[0]?.id && edge.attributes.providerAvailability === 'disabled')
    const browseContract = contracts.filter(edge =>
      edge.from === browse[0]?.id && edge.attributes.providerAvailability === 'active')
    if (autoContract.length !== 1 || browseContract.length !== 1) {
      throw new Error('official DSH did not activate exactly the pinned directory-browser provider')
    }
  }
  if (kinds.includes('reset-directory-picker')) {
    const auto = projection.graph.nodes.filter(node =>
      node.plane === 'resolved'
      && node.attributes.entryId === 'directory-picker'
      && node.attributes.pluginName === '@deepseek-ai/dsh-host-directory-picker-auto')
    const browse = projection.graph.nodes.filter(node =>
      node.plane === 'resolved' && node.attributes.entryId === 'directory-picker-browse')
    const client = projection.graph.nodes.filter(node =>
      node.plane === 'resolved' && node.attributes.entryId === 'ui-directory-picker-browse')
    const service = projection.graph.nodes.filter(node =>
      node.plane === 'resolved' && node.kind === 'service' && node.attributes.name === 'directoryPicker')
    if (auto.length !== 1 || browse.length !== 0 || client.length !== 0 || service.length !== 1) {
      throw new Error('official DSH did not restore the adaptive directory-picker topology')
    }
    const activeContract = projection.graph.edges.filter(edge =>
      edge.kind === 'provides-service'
      && edge.from === auto[0]?.id
      && edge.to === service[0]?.id
      && edge.attributes.evidence === 'current-official-contract'
      && edge.attributes.providerAvailability === 'active')
    if (activeContract.length !== 1) {
      throw new Error('official DSH did not restore one active adaptive directory-picker contract')
    }
  }
  return {
    resolvedNodeId: first.resolvedNodeId,
    observedValue: first.observedValue,
    observations,
  }
}

/** Validate one scalar candidate through the selected official DSH without touching its target. */
export async function validateDshScalarEditCandidate(
  options: ValidateDshScalarEditOptions,
): Promise<ValidatedDshScalarEditCandidate> {
  const targetPath = fileURLToPath(options.plan.targetUri)
  const currentBytes = await readFile(targetPath)
  if (!bytesEqual(currentBytes, options.plan.precondition.expectedBytes)) {
    throw new StaleSourceError(options.plan.targetUri)
  }

  const result = await dumpDshConfigFromProfileSources({
    installation: options.installation,
    sources: options.sources,
    cwd: resolve(options.cwd),
    overrides: [{
      uri: options.plan.targetUri,
      rawBytes: options.plan.candidateBytes,
    }],
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  })
  const projection = buildProfileHarnessGraph({
    installation: options.installation,
    sources: result.sources,
    config: { mode: 'resolved', text: result.stdout },
  })
  const expected = expectedResolvedScalars(projection, options.plan)
  return {
    plan: {
      ...options.plan,
      state: 'validated',
      validation: {
        ...expected,
        durationMs: result.durationMs,
      },
    },
    projection,
    sources: result.sources,
  }
}

/** Validate a candidate while keeping the projected graph private to the caller. */
export async function validateDshScalarEdit(
  options: ValidateDshScalarEditOptions,
): Promise<ValidatedDshScalarEditPlan> {
  return (await validateDshScalarEditCandidate(options)).plan
}


/** Commit a validated scalar plan, reimport through official DSH, then remove recovery data. */
export async function applyDshScalarEdit(
  options: ApplyDshScalarEditOptions,
): Promise<AppliedDshScalarEditPlan> {
  const assertCurrent = async (
    phase: 'before-replace' | 'after-replace' | 'before-finalize',
    expectedTargetBytes: Uint8Array,
  ): Promise<void> => {
    await options.assertSourcesCurrent?.(phase)
    await assertCompositionSourcesCurrent(options, expectedTargetBytes)
  }
  const committed = await commitValidatedEdit(options.plan, {
    assertCanReplace: () => assertCurrent('before-replace', options.plan.precondition.expectedBytes),
  })
  try {
    await assertCurrent('after-replace', options.plan.candidateBytes)
  } catch (cause) {
    try {
      await restoreCommittedEdit(committed)
    } catch (restoreFailure) {
      throw new DshReimportError(
        `composition source guard failed and automatic restore failed: ${String(restoreFailure)}`,
        {
          targetUri: options.plan.targetUri,
          restored: false,
          backupPath: committed.backupPath,
          cause,
        },
      )
    }
    throw cause
  }
  const explicitPatches = options.sources.layers
    .filter(layer => layer.owner === 'explicit' && layer.patch.exists)
    .map(layer => layer.patch.path)
  let reimport: AppliedDshScalarEditPlan['reimport']
  try {
    const refreshedSources = await readProfileSources({
      installation: options.installation,
      profile: options.sources.profile,
      cwd: resolve(options.cwd),
      dshHome: resolve(options.dshHome),
      patches: explicitPatches,
    })
    const result = await dumpDshConfigFromProfileSources({
      installation: options.installation,
      sources: refreshedSources,
      cwd: resolve(options.cwd),
      ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    })
    const projection = buildProfileHarnessGraph({
      installation: options.installation,
      sources: result.sources,
      config: { mode: 'resolved', text: result.stdout },
    })
    reimport = {
      ...expectedResolvedScalars(projection, options.plan),
      durationMs: result.durationMs,
    }
  } catch (cause) {
    let restored = false
    let restoreFailure: unknown
    try {
      await restoreCommittedEdit(committed)
      restored = true
    } catch (error) {
      restoreFailure = error
    }
    throw new DshReimportError(
      restored
        ? 'official DSH reimport failed; the original patch was restored'
        : `official DSH reimport failed and automatic restore failed: ${String(restoreFailure)}`,
      {
        targetUri: options.plan.targetUri,
        restored,
        ...(restored ? {} : { backupPath: committed.backupPath }),
        cause,
      },
    )
  }

  try {
    await assertCurrent('before-finalize', options.plan.candidateBytes)
  } catch (cause) {
    try {
      await restoreCommittedEdit(committed)
    } catch (restoreFailure) {
      throw new DshReimportError(
        `composition source guard failed before finalize and automatic restore failed: ${String(restoreFailure)}`,
        {
          targetUri: options.plan.targetUri,
          restored: false,
          backupPath: committed.backupPath,
          cause,
        },
      )
    }
    throw cause
  }

  await finalizeCommittedEdit(committed)
  return {
    ...options.plan,
    state: 'committed',
    reimport,
  }
}
