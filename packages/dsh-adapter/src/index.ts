import { spawn } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_OUTPUT_BYTES = 4 * 1024 * 1024
const PROFILE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u

export interface DshInstallation {
  root: string
  cliEntry: string
  nodeExecutable: string
  version: string
  commit?: string
}

export interface DshProbe {
  installation: DshInstallation
  nodeVersion: string
  cliVersion: string
}

export interface DshCommandResult {
  exitCode: number | null
  stdout: string
  stderr: string
  durationMs: number
}

export interface DshCommandOptions {
  installation: DshInstallation
  args: readonly string[]
  cwd: string
  dshHome: string
  timeoutMs?: number
  maxOutputBytes?: number
  environment?: Readonly<Record<string, string>>
}

export interface DumpDshConfigOptions {
  installation: DshInstallation
  profile: string
  mode: 'default' | 'resolved'
  cwd: string
  dshHome: string
  patches?: readonly string[]
  timeoutMs?: number
}

interface PackageManifest {
  name?: string
  version?: string
}

/** A failed official DSH invocation with stdout/stderr kept separate for diagnosis. */
export class DshCommandError extends Error {
  readonly result: DshCommandResult

  constructor(message: string, result: DshCommandResult) {
    super(message)
    this.name = 'DshCommandError'
    this.result = result
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function readManifest(path: string): Promise<PackageManifest> {
  const raw = await readFile(path, 'utf8')
  return JSON.parse(raw) as PackageManifest
}

function shortDiagnostic(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= 800) return trimmed
  return `${trimmed.slice(0, 800)}…`
}

async function runProcess(
  executable: string,
  args: readonly string[],
  options: {
    cwd: string
    environment?: NodeJS.ProcessEnv
    timeoutMs?: number
    maxOutputBytes?: number
  },
): Promise<DshCommandResult> {
  const startedAt = Date.now()
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES

  return await new Promise<DshCommandResult>((resolvePromise, rejectPromise) => {
    const child = spawn(executable, [...args], {
      cwd: options.cwd,
      env: options.environment,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    let outputBytes = 0
    let failure: Error | undefined

    const timer = setTimeout(() => {
      failure = new Error(`process exceeded ${timeoutMs} ms`)
      child.kill()
    }, timeoutMs)

    const capture = (target: Buffer[], chunk: Buffer): void => {
      if (failure !== undefined) return
      outputBytes += chunk.byteLength
      if (outputBytes > maxOutputBytes) {
        failure = new Error(`process output exceeded ${maxOutputBytes} bytes`)
        child.kill()
        return
      }
      target.push(chunk)
    }

    child.stdout.on('data', (chunk: Buffer) => capture(stdout, chunk))
    child.stderr.on('data', (chunk: Buffer) => capture(stderr, chunk))
    child.once('error', (cause) => {
      failure = cause
    })
    child.once('close', (exitCode) => {
      clearTimeout(timer)
      const result: DshCommandResult = {
        exitCode,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
        durationMs: Date.now() - startedAt,
      }
      if (failure !== undefined) {
        rejectPromise(new DshCommandError(failure.message, result))
      } else {
        resolvePromise(result)
      }
    })
  })
}

async function readCommit(root: string): Promise<string | undefined> {
  try {
    const result = await runProcess('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      timeoutMs: 5_000,
      maxOutputBytes: 8_192,
    })
    return result.exitCode === 0 ? result.stdout.trim() : undefined
  } catch {
    return undefined
  }
}

/** Discover a built official DSH source checkout without importing its internals. */
export async function discoverBuiltDshCheckout(
  root: string,
  nodeExecutable: string,
): Promise<DshInstallation> {
  const absoluteRoot = resolve(root)
  const rootManifestPath = join(absoluteRoot, 'package.json')
  const cliManifestPath = join(absoluteRoot, 'apps', 'cli', 'package.json')
  const cliEntry = join(absoluteRoot, 'apps', 'cli', 'lib', 'bin.js')

  const [rootManifest, cliManifest] = await Promise.all([
    readManifest(rootManifestPath),
    readManifest(cliManifestPath),
  ])
  if (rootManifest.name !== '@deepseek-ai/dsh-root') {
    throw new Error(`not an official DeepSeek Harness checkout: ${absoluteRoot}`)
  }
  if (cliManifest.name !== '@deepseek-ai/dsh' || cliManifest.version === undefined) {
    throw new Error(`official DSH CLI metadata is missing under ${absoluteRoot}`)
  }
  if (!(await fileExists(cliEntry))) {
    throw new Error(`official DSH CLI is not built: ${cliEntry}`)
  }
  if (!(await fileExists(nodeExecutable))) {
    throw new Error(`Node executable was not found: ${nodeExecutable}`)
  }

  const commit = await readCommit(absoluteRoot)
  return {
    root: absoluteRoot,
    cliEntry,
    nodeExecutable: resolve(nodeExecutable),
    version: cliManifest.version,
    ...(commit === undefined ? {} : { commit }),
  }
}

/** Match the official DSH engine rule: Node 22.19+ or Node 24 and newer. */
export function isSupportedDshNodeVersion(version: string): boolean {
  const match = version.trim().match(/^v?(\d+)\.(\d+)\.(\d+)/u)
  if (match === null) return false
  const major = Number(match[1])
  const minor = Number(match[2])
  return (major === 22 && minor >= 19) || major >= 24
}

export function assertSafeProfileName(profile: string): void {
  if (!PROFILE_NAME.test(profile)) {
    throw new Error(`invalid DSH profile name: ${JSON.stringify(profile)}`)
  }
}

/** Run the official CLI as an argv array; never through a shell. */
export async function runDshCommand(options: DshCommandOptions): Promise<DshCommandResult> {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    ...options.environment,
    DSH_HOME: resolve(options.dshHome),
    DSH_TELEMETRY_DISABLED: '1',
    NO_COLOR: '1',
  }
  const result = await runProcess(
    options.installation.nodeExecutable,
    [options.installation.cliEntry, ...options.args],
    {
      cwd: resolve(options.cwd),
      environment,
      ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
      ...(options.maxOutputBytes === undefined ? {} : { maxOutputBytes: options.maxOutputBytes }),
    },
  )
  if (result.exitCode !== 0) {
    const detail = shortDiagnostic(result.stderr || result.stdout)
    throw new DshCommandError(
      `official DSH exited with code ${String(result.exitCode)}${detail === '' ? '' : `: ${detail}`}`,
      result,
    )
  }
  return result
}

/** Verify that the selected runtime and built CLI agree with the checkout metadata. */
export async function probeDshInstallation(installation: DshInstallation): Promise<DshProbe> {
  const nodeResult = await runProcess(installation.nodeExecutable, ['--version'], {
    cwd: installation.root,
    timeoutMs: 5_000,
    maxOutputBytes: 8_192,
  })
  const nodeVersion = nodeResult.stdout.trim()
  if (nodeResult.exitCode !== 0 || !isSupportedDshNodeVersion(nodeVersion)) {
    throw new Error(`DSH requires Node ^22.19.0 or >=24.0.0; selected runtime is ${nodeVersion || 'unknown'}`)
  }

  const cliResult = await runDshCommand({
    installation,
    args: ['--version'],
    cwd: installation.root,
    dshHome: join(tmpdir(), 'dsh-graph-control-version-probe'),
    timeoutMs: 10_000,
    maxOutputBytes: 8_192,
  })
  const cliVersion = cliResult.stdout.trim()
  if (cliVersion !== installation.version) {
    throw new Error(
      `built DSH CLI version ${JSON.stringify(cliVersion)} does not match package version ${JSON.stringify(installation.version)}`,
    )
  }

  return { installation, nodeVersion, cliVersion }
}

/** Ask official DSH to compose a profile and return its raw YAML text unchanged. */
export async function dumpDshConfig(options: DumpDshConfigOptions): Promise<DshCommandResult> {
  assertSafeProfileName(options.profile)
  if (options.mode === 'default' && (options.patches?.length ?? 0) > 0) {
    throw new Error('default DSH dumps cannot include user patch overlays')
  }

  const args = ['--profile', options.profile]
  for (const patch of options.patches ?? []) args.push('--patch', resolve(patch))
  args.push(options.mode === 'default' ? '--dump-default-config' : '--dump-config')

  return await runDshCommand({
    installation: options.installation,
    args,
    cwd: options.cwd,
    dshHome: options.dshHome,
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  })
}

export * from './profile-graph.ts'
export * from './web-spine.ts'
export * from './profile-sources.ts'
export * from './isolated-config-dump.ts'
export * from './profile-discovery.ts'
export * from './component-catalog.ts'
export * from './current-official-contracts.ts'
export * from './subprocess-removal-boundary.ts'
export * from './directory-picker-lifecycle.ts'
export * from './time-context-lifecycle.ts'
export * from './schedule-lifecycle.ts'
export * from './mcp-http-lifecycle.ts'
export * from './e2b-readiness.ts'
export * from './git-workspace-materialization.ts'
export * from './provider-replacement.ts'
export * from './scalar-validation.ts'
export * from './yaml-edit.ts'
