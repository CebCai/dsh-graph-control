import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const REMOTE_WORKSPACE = '/home/user/workspace' as const
const GIT_TIMEOUT_MS = 5_000
const GIT_OUTPUT_LIMIT = 128 * 1024

export type GitWorkspaceBlockerCode =
  | 'git-unavailable'
  | 'not-git-repository'
  | 'working-directory-not-root'
  | 'no-commit'
  | 'no-origin'
  | 'origin-not-anonymous-https'
  | 'submodules-unsupported'
  | 'git-inspection-failed'

export interface GitWorkspaceBlocker {
  code: GitWorkspaceBlockerCode
  summary: string
}

export interface GitWorkspaceCommandPreview {
  argv: readonly string[]
}

export interface GitWorkspaceMaterialization {
  id: 'pinned-git-checkout'
  label: 'Pinned anonymous HTTPS Git checkout'
  state: 'ready' | 'review' | 'blocked'
  planAvailable: boolean
  hostWorkspace: string
  repositoryRoot?: string
  remoteCwd: typeof REMOTE_WORKSPACE
  localGit?: {
    originUrl?: string
    commit?: string
    branch?: string
  }
  source?: {
    remoteName: 'origin'
    url: string
    commit: string
    branch?: string
  }
  exclusions: {
    source: 'committed-tree-only'
    trackedChanges: number
    untrackedFiles: number
    ignoredFilesIncluded: false
    unsavedEditorChangesIncluded: false
    hostFilesTransferred: false
    hostFileContentsIncluded: false
  }
  runtimePrerequisites: readonly string[]
  limitations: readonly string[]
  sourcePaths: readonly string[]
  blockers: readonly GitWorkspaceBlocker[]
  commandPreview: readonly GitWorkspaceCommandPreview[]
  credentialInspected: false
  networkContacted: false
  workspaceTransferred: false
  remoteRuntimeStarted: false
  externalActionsPerformed: false
}

interface GitResult {
  status: 'completed' | 'unavailable'
  exitCode: number | null
  stdout: string
}

function runGit(workspace: string, args: readonly string[]): Promise<GitResult> {
  return new Promise(resolvePromise => {
    const child = spawn('git', ['-C', workspace, ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        GIT_OPTIONAL_LOCKS: '0',
        GIT_TERMINAL_PROMPT: '0',
        LC_ALL: 'C',
      },
      shell: false,
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    })
    const stdout: Buffer[] = []
    let outputBytes = 0
    let settled = false

    const settle = (result: GitResult): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolvePromise(result)
    }
    const timer = setTimeout(() => {
      child.kill()
      settle({ status: 'completed', exitCode: null, stdout: '' })
    }, GIT_TIMEOUT_MS)

    child.stdout.on('data', (chunk: Buffer) => {
      if (settled) return
      outputBytes += chunk.byteLength
      if (outputBytes > GIT_OUTPUT_LIMIT) {
        child.kill()
        settle({ status: 'completed', exitCode: null, stdout: '' })
        return
      }
      stdout.push(chunk)
    })
    child.once('error', () => {
      settle({ status: 'unavailable', exitCode: null, stdout: '' })
    })
    child.once('close', exitCode => {
      settle({
        status: 'completed',
        exitCode,
        stdout: Buffer.concat(stdout).toString('utf8'),
      })
    })
  })
}

function pathsEqual(left: string, right: string): boolean {
  const [a, b] = [resolve(left), resolve(right)]
  return process.platform === 'win32'
    ? a.toLocaleLowerCase('en-US') === b.toLocaleLowerCase('en-US')
    : a === b
}

function safeAnonymousHttpsUrl(raw: string): string | undefined {
  try {
    const parsed = new URL(raw)
    if (
      parsed.protocol !== 'https:'
      || parsed.username !== ''
      || parsed.password !== ''
      || parsed.search !== ''
      || parsed.hash !== ''
    ) return undefined
    return raw
  } catch {
    return undefined
  }
}

function countWorkspaceChanges(raw: string): { trackedChanges: number; untrackedFiles: number } {
  const records = raw.split('\0')
  let trackedChanges = 0
  let untrackedFiles = 0
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    if (record === undefined || record === '') continue
    const status = record.slice(0, 2)
    if (status === '??') {
      untrackedFiles += 1
      continue
    }
    trackedChanges += 1
    if (status.includes('R') || status.includes('C')) index += 1
  }
  return { trackedChanges, untrackedFiles }
}

function baseResult(hostWorkspace: string): Omit<GitWorkspaceMaterialization,
  'state' | 'planAvailable' | 'blockers' | 'commandPreview'> {
  return {
    id: 'pinned-git-checkout',
    label: 'Pinned anonymous HTTPS Git checkout',
    hostWorkspace,
    remoteCwd: REMOTE_WORKSPACE,
    exclusions: {
      source: 'committed-tree-only',
      trackedChanges: 0,
      untrackedFiles: 0,
      ignoredFilesIncluded: false,
      unsavedEditorChangesIncluded: false,
      hostFilesTransferred: false,
      hostFileContentsIncluded: false,
    },
    runtimePrerequisites: [
      'The remote E2B image provides a git executable.',
      'The sandbox permits outbound HTTPS to the selected origin.',
      'The pinned commit remains reachable from origin.',
    ],
    limitations: [
      'Official DSH documents the remote argv seam, but its guaranteed E2B utility list does not include git.',
      'Git LFS, private repositories, submodules, host uploads, and remote-to-host synchronization are outside this first flow.',
    ],
    sourcePaths: [
      'packages/e2b/e2b/README.md',
      'packages/e2b/fs-e2b/README.md',
      'packages/e2b/subprocess-e2b/README.md',
    ],
    credentialInspected: false,
    networkContacted: false,
    workspaceTransferred: false,
    remoteRuntimeStarted: false,
    externalActionsPerformed: false,
  }
}

function blocked(
  base: ReturnType<typeof baseResult>,
  blocker: GitWorkspaceBlocker,
): GitWorkspaceMaterialization {
  return {
    ...base,
    state: 'blocked',
    planAvailable: false,
    blockers: [blocker],
    commandPreview: [],
  }
}

/**
 * Inspect only local Git metadata and return a future remote checkout preview.
 * This function never contacts origin, reads credentials, transfers files, or
 * starts a remote runtime.
 */
export async function probeGitWorkspaceMaterialization(
  cwd: string,
): Promise<GitWorkspaceMaterialization> {
  const hostWorkspace = resolve(cwd)
  const base = baseResult(hostWorkspace)
  const rootResult = await runGit(hostWorkspace, ['rev-parse', '--show-toplevel'])
  if (rootResult.status === 'unavailable') {
    return blocked(base, {
      code: 'git-unavailable',
      summary: 'The local Git executable is unavailable, so no checkout source can be inspected.',
    })
  }
  if (rootResult.exitCode !== 0 || rootResult.stdout.trim() === '') {
    return blocked(base, {
      code: 'not-git-repository',
      summary: 'The selected DSH working directory is not inside a Git repository.',
    })
  }

  const repositoryRoot = resolve(rootResult.stdout.trim())
  const repositoryBase = { ...base, repositoryRoot }
  if (!pathsEqual(hostWorkspace, repositoryRoot)) {
    return blocked(repositoryBase, {
      code: 'working-directory-not-root',
      summary: 'The first materialization flow requires the DSH working directory to be the Git repository root.',
    })
  }

  const [head, origin, branch, status, gitmodules] = await Promise.all([
    runGit(repositoryRoot, ['rev-parse', '--verify', 'HEAD']),
    runGit(repositoryRoot, ['remote', 'get-url', 'origin']),
    runGit(repositoryRoot, ['symbolic-ref', '--short', '-q', 'HEAD']),
    runGit(repositoryRoot, ['status', '--porcelain=v1', '-z', '--untracked-files=all']),
    runGit(repositoryRoot, ['ls-files', '--error-unmatch', '--', '.gitmodules']),
  ])
  if ([head, origin, branch, status, gitmodules].some(result => result.status === 'unavailable')) {
    return blocked(repositoryBase, {
      code: 'git-unavailable',
      summary: 'The local Git executable became unavailable during inspection.',
    })
  }

  const blockers: GitWorkspaceBlocker[] = []
  const commit = head.exitCode === 0 && /^[0-9a-f]{40,64}$/u.test(head.stdout.trim())
    ? head.stdout.trim()
    : undefined
  if (commit === undefined) {
    blockers.push({
      code: 'no-commit',
      summary: 'The repository has no commit to pin for a reproducible remote checkout.',
    })
  }

  let originUrl: string | undefined
  if (origin.exitCode !== 0 || origin.stdout.trim() === '') {
    blockers.push({
      code: 'no-origin',
      summary: 'The repository has no origin URL to use as a checkout source.',
    })
  } else {
    originUrl = safeAnonymousHttpsUrl(origin.stdout.trim())
    if (originUrl === undefined) {
      blockers.push({
        code: 'origin-not-anonymous-https',
        summary: 'The origin is not a credential-free HTTPS URL supported by this first flow.',
      })
    }
  }

  const changes = status.exitCode === 0
    ? countWorkspaceChanges(status.stdout)
    : { trackedChanges: 0, untrackedFiles: 0 }
  if (status.exitCode !== 0 || (gitmodules.exitCode !== 0 && gitmodules.exitCode !== 1)) {
    blockers.push({
      code: 'git-inspection-failed',
      summary: 'Git could not produce the bounded local metadata needed for a safe preview.',
    })
  }
  if (gitmodules.exitCode === 0) {
    blockers.push({
      code: 'submodules-unsupported',
      summary: 'This repository tracks .gitmodules; submodule materialization is outside the first flow.',
    })
  }

  const withExclusions = {
    ...repositoryBase,
    localGit: {
      ...(originUrl === undefined ? {} : { originUrl }),
      ...(commit === undefined ? {} : { commit }),
      ...(branch.exitCode === 0 && branch.stdout.trim() !== ''
        ? { branch: branch.stdout.trim() }
        : {}),
    },
    exclusions: {
      ...repositoryBase.exclusions,
      trackedChanges: changes.trackedChanges,
      untrackedFiles: changes.untrackedFiles,
    },
  }
  let source: GitWorkspaceMaterialization['source']
  if (blockers.length === 0 && commit !== undefined && originUrl !== undefined) {
    source = {
      remoteName: 'origin',
      url: originUrl,
      commit,
      ...(branch.exitCode === 0 && branch.stdout.trim() !== ''
        ? { branch: branch.stdout.trim() }
        : {}),
    }
  }
  const planAvailable = source !== undefined
  const commandPreview: readonly GitWorkspaceCommandPreview[] = source === undefined
    ? []
    : [
        { argv: ['git', '-C', REMOTE_WORKSPACE, 'init'] },
        { argv: ['git', '-C', REMOTE_WORKSPACE, 'remote', 'add', 'origin', source.url] },
        { argv: ['git', '-C', REMOTE_WORKSPACE, 'fetch', '--depth=1', 'origin', source.commit] },
        { argv: ['git', '-C', REMOTE_WORKSPACE, 'checkout', '--detach', 'FETCH_HEAD'] },
      ]
  const hasLocalOnlyChanges = changes.trackedChanges > 0 || changes.untrackedFiles > 0

  return {
    ...withExclusions,
    state: planAvailable ? (hasLocalOnlyChanges ? 'review' : 'ready') : 'blocked',
    planAvailable,
    ...(source === undefined ? {} : { source }),
    blockers,
    commandPreview,
  }
}
