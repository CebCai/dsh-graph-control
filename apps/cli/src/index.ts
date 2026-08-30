#!/usr/bin/env node

import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  applyDshScalarEdit,
  buildProfileHarnessGraph,
  discoverBuiltDshCheckout,
  dumpDshConfigFromProfileSources,
  readProfileSources,
  type DshSourceDocument,
  type FsProviderEntryId,
  type YamlScalarEditValue,
} from '@dsh-graph-control/dsh-adapter'
import {
  prepareDirectoryPickerChange,
  prepareFsProviderChange,
  prepareFsProviderReset,
  prepareScalarEdit,
} from '@dsh-graph-control/profile-edit'

export const CLI_STATUS = 'profile-inspection-ready' as const

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))

interface InspectArguments {
  profile: string
  dshHome: string
  upstream: string
  node: string
  patches: string[]
  compose: boolean
  json: boolean
}

interface PlanScalarArguments {
  profile: string
  dshHome: string
  upstream: string
  node: string
  patches: string[]
  target: string
  entryId: string
  path: string[]
  value: YamlScalarEditValue
  validate: boolean
  repair?: string
  confirm?: string
  json: boolean
}

interface ProviderReplacementArguments {
  profile: string
  dshHome: string
  upstream: string
  node: string
  patches: string[]
  target: string
  to?: FsProviderEntryId
  reset: boolean
  validate: boolean
  confirm?: string
  json: boolean
}

interface DirectoryPickerArguments {
  profile: string
  dshHome: string
  upstream: string
  node: string
  patches: string[]
  target: string
  validate: boolean
  confirm?: string
  json: boolean
}

interface CliIo {
  stdout: (text: string) => void
  stderr: (text: string) => void
}

const HELP = `DSH GraphControl developer CLI

Usage:
  pnpm inspect -- --dsh-home <path> [options]
  pnpm plan:scalar -- --dsh-home <path> --target <patch> --entry <id> --path <field> --value <json-scalar>
  pnpm apply:scalar -- --dsh-home <path> --target <patch> --entry <id> --path <field> --value <json-scalar> --confirm <plan-summary>
  pnpm plan:provider -- --dsh-home <path> --target <patch> [--to fs-sandbox|fs-local|--reset] [--validate]
  pnpm apply:provider -- --dsh-home <path> --target <patch> [--to fs-sandbox|fs-local|--reset] --confirm <plan-summary>
  pnpm plan:picker -- --dsh-home <path> --target <patch> [--validate]
  pnpm apply:picker -- --dsh-home <path> --target <patch> --confirm <plan-summary>

Options:
  --profile <name>     DSH profile to inspect (default: web)
  --dsh-home <path>    Existing DSH_HOME; or set DSH_HOME
  --upstream <path>    Built official DSH checkout
  --node <path>        DSH-supported Node executable
  --patch <path>       Explicit overlay, repeatable
  --compose            Ask official DSH for the resolved plane
  --validate           Validate a scalar plan through official DSH without writing
  --repair <id>        Apply one dependency repair offered by the plan
  --to <provider>      Select fs-sandbox or fs-local; omitted selects the one available change
  --reset              Remove the exact generated fs override pair and inherit the official default
  --json               Print machine-readable inspection output
  --help               Show this help

Without --compose, inspection only reads declared source files.
Planning creates an in-memory preview only; it never writes the selected patch.
Applying always repeats official validation and requires the exact prior plan summary.
The provider command inserts the proven fs-local alternative once, reversibly switches the exact pair, or resets only its untouched generated blocks.
The picker command pins the exact official host/client browser interaction pair, or removes that untouched pin to restore auto selection.
`

function takeValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1]
  if (value === undefined || value.startsWith('--')) throw new Error(`${flag} requires a value`)
  return value
}

function parseInspectArguments(argv: readonly string[]): InspectArguments | 'help' {
  let profile = 'web'
  let dshHome = process.env.DSH_HOME
  let upstream = resolve(workspaceRoot, '.upstream', 'deepseek-harness')
  let node = resolve(workspaceRoot, '.tools', 'node-v24.19.0-win-x64', 'node.exe')
  const patches: string[] = []
  let compose = false
  let json = false

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
        patches.push(takeValue(argv, index, argument))
        index += 1
        break
      case '--compose':
        compose = true
        break
      case '--json':
        json = true
        break
      default:
        throw new Error(`unknown inspect option: ${String(argument)}`)
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
    compose,
    json,
  }
}

function parseScalarValue(text: string): YamlScalarEditValue {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch (cause) {
    throw new Error(`--value must be a JSON scalar: ${String(cause)}`)
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  throw new Error('--value must be a string, finite number, boolean, or null')
}

function parsePlanScalarArguments(argv: readonly string[]): PlanScalarArguments | 'help' {
  let profile = 'web'
  let dshHome = process.env.DSH_HOME
  let upstream = resolve(workspaceRoot, '.upstream', 'deepseek-harness')
  let node = resolve(workspaceRoot, '.tools', 'node-v24.19.0-win-x64', 'node.exe')
  const patches: string[] = []
  let target: string | undefined
  let entryId: string | undefined
  let path: string[] | undefined
  let value: YamlScalarEditValue | undefined
  let validate = false
  let repair: string | undefined
  let confirm: string | undefined
  let json = false

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
        patches.push(takeValue(argv, index, argument))
        index += 1
        break
      case '--target':
        target = takeValue(argv, index, argument)
        index += 1
        break
      case '--entry':
        entryId = takeValue(argv, index, argument)
        index += 1
        break
      case '--path': {
        const raw = takeValue(argv, index, argument)
        path = raw.split('.').filter(Boolean)
        index += 1
        break
      }
      case '--value':
        value = parseScalarValue(takeValue(argv, index, argument))
        index += 1
        break
      case '--validate':
        validate = true
        break
      case '--repair':
        repair = takeValue(argv, index, argument)
        index += 1
        break
      case '--confirm':
        confirm = takeValue(argv, index, argument)
        index += 1
        break
      case '--json':
        json = true
        break
      default:
        throw new Error(`unknown plan-scalar option: ${String(argument)}`)
    }
  }
  if (dshHome === undefined || dshHome === '') throw new Error('--dsh-home is required when DSH_HOME is not set')
  if (target === undefined) throw new Error('--target is required')
  if (entryId === undefined || entryId === '') throw new Error('--entry is required')
  if (path === undefined || path.length === 0) throw new Error('--path is required')
  if (value === undefined) throw new Error('--value is required; use null for a YAML null')
  return {
    profile,
    dshHome: resolve(dshHome),
    upstream: resolve(upstream),
    node: resolve(node),
    patches,
    target: resolve(target),
    entryId,
    path,
    value,
    validate,
    ...(repair === undefined ? {} : { repair }),
    ...(confirm === undefined ? {} : { confirm }),
    json,
  }
}

function parseProviderReplacementArguments(argv: readonly string[]): ProviderReplacementArguments | 'help' {
  let profile = 'web'
  let dshHome = process.env.DSH_HOME
  let upstream = resolve(workspaceRoot, '.upstream', 'deepseek-harness')
  let node = resolve(workspaceRoot, '.tools', 'node-v24.19.0-win-x64', 'node.exe')
  const patches: string[] = []
  let target: string | undefined
  let to: FsProviderEntryId | undefined
  let reset = false
  let validate = false
  let confirm: string | undefined
  let json = false

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
        patches.push(takeValue(argv, index, argument))
        index += 1
        break
      case '--target':
        target = takeValue(argv, index, argument)
        index += 1
        break
      case '--to': {
        const value = takeValue(argv, index, argument)
        if (value !== 'fs-sandbox' && value !== 'fs-local') {
          throw new Error('--to must be fs-sandbox or fs-local')
        }
        to = value
        index += 1
        break
      }
      case '--reset':
        reset = true
        break
      case '--validate':
        validate = true
        break
      case '--confirm':
        confirm = takeValue(argv, index, argument)
        index += 1
        break
      case '--json':
        json = true
        break
      default:
        throw new Error(`unknown provider-replacement option: ${String(argument)}`)
    }
  }
  if (dshHome === undefined || dshHome === '') throw new Error('--dsh-home is required when DSH_HOME is not set')
  if (target === undefined) throw new Error('--target is required')
  if (reset && to !== undefined) throw new Error('--reset cannot be combined with --to')
  return {
    profile,
    dshHome: resolve(dshHome),
    upstream: resolve(upstream),
    node: resolve(node),
    patches,
    target: resolve(target),
    ...(to === undefined ? {} : { to }),
    reset,
    validate,
    ...(confirm === undefined ? {} : { confirm }),
    json,
  }
}

function parseDirectoryPickerArguments(argv: readonly string[]): DirectoryPickerArguments | 'help' {
  let profile = 'web'
  let dshHome = process.env.DSH_HOME
  let upstream = resolve(workspaceRoot, '.upstream', 'deepseek-harness')
  let node = resolve(workspaceRoot, '.tools', 'node-v24.19.0-win-x64', 'node.exe')
  const patches: string[] = []
  let target: string | undefined
  let validate = false
  let confirm: string | undefined
  let json = false

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
        patches.push(takeValue(argv, index, argument))
        index += 1
        break
      case '--target':
        target = takeValue(argv, index, argument)
        index += 1
        break
      case '--validate':
        validate = true
        break
      case '--confirm':
        confirm = takeValue(argv, index, argument)
        index += 1
        break
      case '--json':
        json = true
        break
      default:
        throw new Error(`unknown directory-picker option: ${String(argument)}`)
    }
  }
  if (dshHome === undefined || dshHome === '') throw new Error('--dsh-home is required when DSH_HOME is not set')
  if (target === undefined) throw new Error('--target is required')
  return {
    profile,
    dshHome: resolve(dshHome),
    upstream: resolve(upstream),
    node: resolve(node),
    patches,
    target: resolve(target),
    validate,
    ...(confirm === undefined ? {} : { confirm }),
    json,
  }
}

function sourceSummary(source: DshSourceDocument): Readonly<Record<string, unknown>> {
  return {
    uri: source.uri,
    path: source.path,
    role: source.role,
    owner: source.owner,
    writable: source.writable,
    exists: source.exists,
    ...(source.exists
      ? { byteLength: source.byteLength, newline: source.newline }
      : {}),
  }
}

function humanInspection(
  installation: { version: string; commit?: string },
  sources: Awaited<ReturnType<typeof readProfileSources>>,
  graph: ReturnType<typeof buildProfileHarnessGraph>['graph'],
  diagnostics: ReturnType<typeof buildProfileHarnessGraph>['diagnostics'],
): string {
  const planeCounts = new Map<string, number>()
  for (const node of graph.nodes) planeCounts.set(node.plane, (planeCounts.get(node.plane) ?? 0) + 1)
  const lines = [
    `DSH GraphControl — ${sources.profile}`,
    `official DSH ${installation.version}${installation.commit === undefined ? '' : ` (${installation.commit.slice(0, 12)})`}`,
    `profile ${sources.profileDir}`,
    'source layers:',
  ]
  for (const layer of sources.layers) {
    const state = layer.patch.exists ? `${layer.patch.byteLength} bytes, ${layer.patch.newline}` : 'missing'
    const access = layer.patch.writable ? 'writable patch' : 'read-only'
    lines.push(`  ${layer.order}. ${layer.label} [${layer.owner}; ${access}; ${state}]`)
    lines.push(`     ${layer.patch.path}`)
  }
  lines.push(
    `graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`,
    `planes: ${[...planeCounts.entries()].map(([plane, count]) => `${plane}=${count}`).join(', ')}`,
    `diagnostics: ${diagnostics.length}`,
  )
  return `${lines.join('\n')}\n`
}

async function inspect(args: InspectArguments, io: CliIo): Promise<void> {
  const installation = await discoverBuiltDshCheckout(args.upstream, args.node)
  const sources = await readProfileSources({
    installation,
    profile: args.profile,
    dshHome: args.dshHome,
    cwd: process.cwd(),
    patches: args.patches,
  })
  const config = args.compose
    ? await dumpDshConfigFromProfileSources({
        installation,
        sources,
        cwd: process.cwd(),
      })
    : undefined
  const projection = buildProfileHarnessGraph({
    installation,
    sources,
    ...(config === undefined ? {} : { config: { text: config.stdout, mode: 'resolved' } }),
  })

  if (args.json) {
    io.stdout(`${JSON.stringify({
      installation: {
        root: installation.root,
        version: installation.version,
        ...(installation.commit === undefined ? {} : { commit: installation.commit }),
      },
      profile: {
        name: sources.profile,
        directory: sources.profileDir,
        manifest: sourceSummary(sources.manifest),
        bundleNames: sources.bundleNames,
      },
      layers: sources.layers.map(layer => ({
        order: layer.order,
        owner: layer.owner,
        label: layer.label,
        ...(layer.packageName === undefined ? {} : { packageName: layer.packageName }),
        ...(layer.manifest === undefined ? {} : { manifest: sourceSummary(layer.manifest) }),
        patch: sourceSummary(layer.patch),
      })),
      graph: projection.graph,
      diagnostics: projection.diagnostics,
    }, undefined, 2)}\n`)
    return
  }
  io.stdout(humanInspection(installation, sources, projection.graph, projection.diagnostics))
}

async function planScalar(args: PlanScalarArguments, io: CliIo, apply: boolean): Promise<void> {
  const installation = await discoverBuiltDshCheckout(args.upstream, args.node)
  const proposal = await prepareScalarEdit({
    installation,
    profile: args.profile,
    dshHome: args.dshHome,
    cwd: process.cwd(),
    patches: args.patches,
    targetUri: pathToFileURL(args.target).href,
    intent: {
      kind: 'set-declared-scalar',
      entryId: args.entryId,
      path: args.path,
      value: args.value,
    },
    ...(args.repair === undefined ? {} : { repairId: args.repair }),
    validate: args.validate || apply,
  })
  const {
    sources,
    planned,
    validation,
    dependencyImpact,
    selectedRepair,
    remainingDependencyImpact,
  } = proposal
  if (apply && args.confirm !== planned.summary) {
    throw new Error(`--confirm must exactly match the preview summary: ${JSON.stringify(planned.summary)}`)
  }
  if (apply && !proposal.canApply) {
    io.stdout([
      'DSH GraphControl scalar edit blocked — no file written',
      `target: ${args.target}`,
      `intent: ${planned.summary}`,
      ...dependencyImpact?.diagnostics.map(diagnostic => `dependency: ${diagnostic.message}`) ?? [],
      ...dependencyImpact?.repairs.map(repair => `repair ${repair.id}: ${repair.label}${repair.supportedByCurrentWriter ? '' : ' (not yet writable)'}`) ?? [],
      ...(selectedRepair === undefined ? [] : [`selected repair: ${selectedRepair.id}`]),
      '',
    ].join('\n'))
    throw new Error('dependency impact must be repaired before commit')
  }
  const applied = apply && validation !== undefined
    ? await applyDshScalarEdit({
        installation,
        sources,
        plan: validation,
        cwd: process.cwd(),
        dshHome: args.dshHome,
      })
    : undefined
  const plan = applied ?? validation ?? planned
  if (args.json) {
    io.stdout(`${JSON.stringify({
      id: plan.id,
      state: plan.state,
      targetUri: plan.targetUri,
      targetOwner: plan.targetOwner,
      summary: plan.summary,
      textChange: plan.textChange,
      textChanges: plan.textChanges,
      semanticChange: plan.semanticChange,
      changed: plan.previews.some(preview => preview.changed),
      ...(validation === undefined ? {} : { validation: validation.validation }),
      ...(applied === undefined ? {} : { reimport: applied.reimport }),
      ...(dependencyImpact === undefined ? {} : { dependencyImpact }),
      ...(selectedRepair === undefined ? {} : { selectedRepair }),
      ...(remainingDependencyImpact === undefined ? {} : { remainingDependencyImpact }),
    }, undefined, 2)}\n`)
    return
  }
  const textChangeLines = plan.textChanges.flatMap((change, index) => [
    `change ${index + 1}: ${change.startOffset}..${change.endOffset}`,
    `- ${change.beforeText}`,
    `+ ${change.afterText}`,
  ])
  io.stdout([
    applied === undefined
      ? 'DSH GraphControl scalar edit plan — no file written'
      : 'DSH GraphControl scalar edit applied',
    `target: ${args.target}`,
    `intent: ${plan.summary}`,
    ...textChangeLines,
    ...dependencyImpact?.diagnostics.map(diagnostic => `dependency: ${diagnostic.message}`) ?? [],
    ...dependencyImpact?.repairs.map(repair => `repair ${repair.id}: ${repair.label}${repair.supportedByCurrentWriter ? '' : ' (not yet writable)'}`) ?? [],
    ...(selectedRepair === undefined ? [] : [`selected repair: ${selectedRepair.id} — ${selectedRepair.label}`]),
    `status: ${applied !== undefined
      ? `committed and reimported by official DSH in ${applied.reimport.durationMs} ms`
      : (remainingDependencyImpact?.diagnostics.length ?? 0) > 0
      ? 'blocked by dependency impact; target unchanged'
      : validation !== undefined
      ? `validated by official DSH in ${validation.validation.durationMs} ms; target unchanged`
      : plan.previews.some(preview => preview.changed) ? 'ready for official validation' : 'no textual change'}`,
    '',
  ].join('\n'))
}

async function replaceProvider(
  args: ProviderReplacementArguments,
  io: CliIo,
  apply: boolean,
): Promise<void> {
  const installation = await discoverBuiltDshCheckout(args.upstream, args.node)
  const common = {
    installation,
    profile: args.profile,
    dshHome: args.dshHome,
    cwd: process.cwd(),
    patches: args.patches,
    targetUri: pathToFileURL(args.target).href,
    validate: args.validate || apply,
  }
  const proposal = args.reset
    ? await prepareFsProviderReset(common)
    : await prepareFsProviderChange({
        ...common,
        ...(args.to === undefined ? {} : { targetEntryId: args.to }),
      })
  const { sources, planned, validation, impact } = proposal
  if (apply && args.confirm !== planned.summary) {
    throw new Error(`--confirm must exactly match the preview summary: ${JSON.stringify(planned.summary)}`)
  }
  const applied = apply && validation !== undefined
    ? await applyDshScalarEdit({
        installation,
        sources,
        plan: validation,
        cwd: process.cwd(),
        dshHome: args.dshHome,
      })
    : undefined
  const plan = applied ?? validation ?? planned
  if (args.json) {
    io.stdout(`${JSON.stringify({
      id: plan.id,
      state: plan.state,
      targetUri: plan.targetUri,
      targetOwner: plan.targetOwner,
      summary: plan.summary,
      textChanges: plan.textChanges,
      semanticChange: plan.semanticChange,
      impact,
      ...(validation === undefined ? {} : { validation: validation.validation }),
      ...(applied === undefined ? {} : { reimport: applied.reimport }),
    }, undefined, 2)}\n`)
    return
  }
  const textChangeLines = plan.textChanges.flatMap((change, index) => [
    `change ${index + 1}: ${change.startOffset}..${change.endOffset}`,
    `- ${change.beforeText}`,
    `+ ${change.afterText}`,
  ])
  io.stdout([
    applied === undefined
      ? 'DSH GraphControl provider change plan — no file written'
      : 'DSH GraphControl provider change applied',
    `target: ${args.target}`,
    `intent: ${plan.summary}`,
    `service: ${impact.service}`,
    `required consumers: ${impact.requiredConsumerEntryIds.join(', ')}`,
    `execution world: ${impact.executionWorldDelta}`,
    `risk: ${impact.risk}`,
    `security impact: ${impact.securityDelta}`,
    ...textChangeLines,
    `status: ${applied !== undefined
      ? `committed and reimported by official DSH in ${applied.reimport.durationMs} ms`
      : validation !== undefined
      ? `validated by official DSH in ${validation.validation.durationMs} ms; target unchanged`
      : 'ready for official validation; target unchanged'}`,
    '',
  ].join('\n'))
}

async function changeDirectoryPicker(
  args: DirectoryPickerArguments,
  io: CliIo,
  apply: boolean,
): Promise<void> {
  const installation = await discoverBuiltDshCheckout(args.upstream, args.node)
  const proposal = await prepareDirectoryPickerChange({
    installation,
    profile: args.profile,
    dshHome: args.dshHome,
    cwd: process.cwd(),
    patches: args.patches,
    targetUri: pathToFileURL(args.target).href,
    validate: args.validate || apply,
  })
  const { sources, planned, validation, impact } = proposal
  if (apply && args.confirm !== planned.summary) {
    throw new Error(`--confirm must exactly match the preview summary: ${JSON.stringify(planned.summary)}`)
  }
  const applied = apply && validation !== undefined
    ? await applyDshScalarEdit({
        installation,
        sources,
        plan: validation,
        cwd: process.cwd(),
        dshHome: args.dshHome,
      })
    : undefined
  const plan = applied ?? validation ?? planned
  if (args.json) {
    io.stdout(`${JSON.stringify({
      id: plan.id,
      state: plan.state,
      mode: planned.directoryPickerMode,
      targetUri: plan.targetUri,
      targetOwner: plan.targetOwner,
      summary: plan.summary,
      textChanges: plan.textChanges,
      semanticChange: plan.semanticChange,
      impact,
      ...(validation === undefined ? {} : { validation: validation.validation }),
      ...(applied === undefined ? {} : { reimport: applied.reimport }),
    }, undefined, 2)}\n`)
    return
  }
  const textChangeLines = plan.textChanges.flatMap((change, index) => [
    `change ${index + 1}: ${change.startOffset}..${change.endOffset}`,
    `- ${change.beforeText}`,
    `+ ${change.afterText}`,
  ])
  io.stdout([
    applied === undefined
      ? 'DSH GraphControl directory-picker change plan — no file written'
      : 'DSH GraphControl directory-picker change applied',
    `target: ${args.target}`,
    `intent: ${plan.summary}`,
    `mode: ${planned.directoryPickerMode}`,
    `service: ${impact.service}`,
    `required consumers: ${impact.requiredConsumerEntryIds.join(', ')}`,
    `execution impact: ${impact.executionWorldDelta}`,
    `risk: ${impact.risk}`,
    `security impact: ${impact.securityDelta}`,
    ...textChangeLines,
    `status: ${applied !== undefined
      ? `committed and reimported by official DSH in ${applied.reimport.durationMs} ms`
      : validation !== undefined
      ? `validated by official DSH in ${validation.validation.durationMs} ms; target unchanged`
      : 'ready for official validation; target unchanged'}`,
    '',
  ].join('\n'))
}

export async function runCli(
  argv: readonly string[],
  io: CliIo = {
    stdout: text => process.stdout.write(text),
    stderr: text => process.stderr.write(text),
  },
): Promise<number> {
  const [command, ...rest] = argv
  if (command === undefined || command === '--help' || command === '-h') {
    io.stdout(HELP)
    return 0
  }
  if (command !== 'inspect'
    && command !== 'plan-scalar'
    && command !== 'apply-scalar'
    && command !== 'plan-provider'
    && command !== 'apply-provider'
    && command !== 'plan-picker'
    && command !== 'apply-picker') {
    io.stderr(`unknown command: ${command}\n\n${HELP}`)
    return 2
  }
  try {
    if (command === 'plan-picker' || command === 'apply-picker') {
      const args = parseDirectoryPickerArguments(rest)
      if (args === 'help') {
        io.stdout(HELP)
        return 0
      }
      await changeDirectoryPicker(args, io, command === 'apply-picker')
      return 0
    }
    if (command === 'plan-provider' || command === 'apply-provider') {
      const args = parseProviderReplacementArguments(rest)
      if (args === 'help') {
        io.stdout(HELP)
        return 0
      }
      await replaceProvider(args, io, command === 'apply-provider')
      return 0
    }
    if (command === 'plan-scalar' || command === 'apply-scalar') {
      const args = parsePlanScalarArguments(rest)
      if (args === 'help') {
        io.stdout(HELP)
        return 0
      }
      await planScalar(args, io, command === 'apply-scalar')
      return 0
    }
    const args = parseInspectArguments(rest)
    if (args === 'help') {
      io.stdout(HELP)
      return 0
    }
    await inspect(args, io)
    return 0
  } catch (cause) {
    io.stderr(`DSH GraphControl command failed: ${cause instanceof Error ? cause.message : String(cause)}\n`)
    return 1
  }
}

const invokedPath = process.argv[1]
if (invokedPath !== undefined && resolve(invokedPath) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runCli(process.argv.slice(2))
}
