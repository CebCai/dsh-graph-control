import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'

export const CURRENT_OFFICIAL_E2B_PACKAGES = [
  '@deepseek-ai/dsh-e2b',
  '@deepseek-ai/dsh-fs-e2b',
  '@deepseek-ai/dsh-subprocess-e2b',
] as const

export type CurrentOfficialE2bPackageName = typeof CURRENT_OFFICIAL_E2B_PACKAGES[number]

export interface E2bPackageReadiness {
  packageName: CurrentOfficialE2bPackageName
  status: 'available' | 'not-installed' | 'unresolvable'
  declaredVersion?: string
  installedVersion?: string
}

export interface CurrentOfficialWebE2bParticipant {
  id: string
  plane: 'host-profile' | 'agent-preset' | 'workspace'
  action: 'disable' | 'insert' | 'replace' | 'align' | 'retain'
  summary: string
}

export interface CurrentOfficialWebE2bBlocker {
  code:
    | 'packages-missing'
    | 'host-workspace-contract'
    | 'linux-shell-selection'
    | 'remote-search-carrier'
    | 'permission-semantics'
    | 'runtime-authority'
  stage: 'composition' | 'runtime'
  summary: string
  sourcePaths: readonly string[]
}

export interface CurrentOfficialRemoteSessionFact {
  id: string
  area: 'cwd' | 'preset'
  owner: 'host' | 'session' | 'agent' | 'remote'
  summary: string
  sourcePaths: readonly string[]
}

export interface CurrentOfficialRemoteSessionBoundary {
  id: 'web-remote-session-boundary'
  state: 'blocked'
  coordinateModel: 'coupled-single-cwd'
  requiredSeam: string
  currentFacts: readonly CurrentOfficialRemoteSessionFact[]
  safePlan: {
    hostProjectIdentity: 'host-only'
    remoteCwd: '/home/user/workspace'
    workspaceSync: 'none'
    hostPathTransferAllowed: false
    presetStrategy: 'copy-system-standard-to-user'
    presetChanges: readonly string[]
  }
  externalActionsPerformed: false
}

export interface CurrentOfficialWebE2bTransitionReadiness {
  id: 'web-e2b-transition'
  label: 'Web to E2B execution world'
  state: 'blocked'
  candidateAvailable: false
  hostPlatform: NodeJS.Platform
  participants: readonly CurrentOfficialWebE2bParticipant[]
  blockers: readonly CurrentOfficialWebE2bBlocker[]
  sessionBoundary: CurrentOfficialRemoteSessionBoundary
  externalActionsPerformed: false
}

export interface E2bProfileReadiness {
  id: 'e2b-remote'
  label: 'E2B remote sandbox'
  state: 'packages-ready' | 'packages-missing'
  packages: readonly E2bPackageReadiness[]
  credentialReference: 'E2B_API_KEY'
  credentialInspected: false
  defaultCwd: '/home/user/workspace'
  defaultTimeoutMs: 300000
  lifecycle: string
  security: string
  limitation: string
  sourcePaths: readonly string[]
  webTransition: CurrentOfficialWebE2bTransitionReadiness
}

interface ProfileManifest {
  dependencies?: Readonly<Record<string, unknown>>
}

interface PackageManifest {
  name?: unknown
  version?: unknown
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown
}

const CURRENT_OFFICIAL_WEB_E2B_PARTICIPANTS: readonly CurrentOfficialWebE2bParticipant[] = [
  {
    id: 'local-providers',
    plane: 'host-profile',
    action: 'disable',
    summary: 'Disable the current fs-sandbox and subprocess-local providers as one operation.',
  },
  {
    id: 'e2b-provider-trio',
    plane: 'host-profile',
    action: 'insert',
    summary: 'Insert the shared E2B owner plus its filesystem and subprocess providers with one POSIX cwd.',
  },
  {
    id: 'remote-bash-executor',
    plane: 'host-profile',
    action: 'replace',
    summary: 'Use the portable Bash executor over subprocess-e2b instead of a host-platform sandbox runner.',
  },
  {
    id: 'remote-policy-surface',
    plane: 'host-profile',
    action: 'align',
    summary: 'Make the shown permission policy match the actual full-access semantics inside the isolated E2B world.',
  },
  {
    id: 'remote-agent-preset',
    plane: 'agent-preset',
    action: 'replace',
    summary: 'Select Bash and remote filesystem tools without the host-carried ripgrep search tool.',
  },
  {
    id: 'remote-workspace',
    plane: 'workspace',
    action: 'replace',
    summary: 'Give sessions the remote POSIX cwd instead of a canonical existing host directory.',
  },
  {
    id: 'host-control-plane',
    plane: 'host-profile',
    action: 'retain',
    summary: 'Keep Web, sessions, LLM calls, logs, settings, credentials, and GraphControl on the host.',
  },
]

const CURRENT_OFFICIAL_REMOTE_SESSION_FACTS: readonly CurrentOfficialRemoteSessionFact[] = [
  {
    id: 'host-workspace',
    area: 'cwd',
    owner: 'host',
    summary: 'A Web workspace is an existing host directory canonicalized through realpath.',
    sourcePaths: ['packages/workspace/workspace/src/index.ts'],
  },
  {
    id: 'session-create',
    area: 'cwd',
    owner: 'host',
    summary: 'session.create chooses workspace.path, request.cwd, or the Host cwd, then ensures that directory with host mkdir.',
    sourcePaths: [
      'packages/host/apiproxy/src/index.ts',
      'packages/host/apiproxy/src/api-proxy.ts',
    ],
  },
  {
    id: 'session-header',
    area: 'cwd',
    owner: 'session',
    summary: 'The same cwd becomes durable session identity and workspace membership requires its canonical host path to match.',
    sourcePaths: [
      'packages/host/apiproxy/src/api/sessions.ts',
      'packages/workspace/workspace/src/index.ts',
    ],
  },
  {
    id: 'agent-tool-routing',
    area: 'cwd',
    owner: 'agent',
    summary: 'The persona, filesystem tools, and Bash resolve their working directory from session.header.cwd.',
    sourcePaths: [
      'apps/cli/config/agent-presets/standard/agent.cordis.yml',
      'packages/fs/tool-fs/src/session-cwd.ts',
      'packages/shell/tool-bash/src/index.ts',
    ],
  },
  {
    id: 'remote-cwd',
    area: 'cwd',
    owner: 'remote',
    summary: 'E2B independently requires an absolute Linux cwd, while fs-e2b gives a session-supplied cwd priority over that provider default.',
    sourcePaths: [
      'packages/e2b/e2b/src/index.ts',
      'packages/e2b/fs-e2b/src/index.ts',
    ],
  },
  {
    id: 'no-workspace-transfer',
    area: 'cwd',
    owner: 'remote',
    summary: 'The official POC uploads, mounts, and synchronizes none of the host workspace.',
    sourcePaths: ['examples/headless-agent/README.md'],
  },
  {
    id: 'preset-ownership',
    area: 'preset',
    owner: 'host',
    summary: 'Shipped presets are read-only; the supported authoring path copies one whole preset into the user root, and the chosen id is recorded with the session.',
    sourcePaths: [
      'packages/preset/agent-presets/README.md',
      'packages/host/apiproxy/src/api/sessions.ts',
    ],
  },
  {
    id: 'remote-preset-delta',
    area: 'preset',
    owner: 'agent',
    summary: 'A Windows remote preset must force Bash, disable PowerShell, retain fs-backed tools, and omit host-carried ripgrep search.',
    sourcePaths: [
      'apps/cli/config/agent-presets/standard/agent.cordis.yml',
      'packages/fs/tool-fs-search/README.md',
    ],
  },
]

function currentOfficialRemoteSessionBoundary(): CurrentOfficialRemoteSessionBoundary {
  return {
    id: 'web-remote-session-boundary',
    state: 'blocked',
    coordinateModel: 'coupled-single-cwd',
    requiredSeam: 'DSH must separate host project identity from remote execution cwd before Web session creation and tool routing can form a safe remote candidate.',
    currentFacts: CURRENT_OFFICIAL_REMOTE_SESSION_FACTS.map(fact => ({
      ...fact,
      sourcePaths: [...fact.sourcePaths],
    })),
    safePlan: {
      hostProjectIdentity: 'host-only',
      remoteCwd: '/home/user/workspace',
      workspaceSync: 'none',
      hostPathTransferAllowed: false,
      presetStrategy: 'copy-system-standard-to-user',
      presetChanges: [
        'Force the Bash tool active for the Linux remote world.',
        'Disable the PowerShell tool selected from the Windows host platform.',
        'Retain filesystem tools that resolve through ctx.fs.',
        'Omit tool-fs-search until a remote search carrier exists.',
      ],
    },
    externalActionsPerformed: false,
  }
}

/**
 * Describe why the current official Web composition is not yet a safe E2B
 * candidate. This is an exact current-source assessment, not a generic remote
 * provider protocol and not permission to perform any external action.
 */
export function assessCurrentOfficialWebE2bTransition(
  packageState: E2bProfileReadiness['state'],
  hostPlatform: NodeJS.Platform = process.platform,
): CurrentOfficialWebE2bTransitionReadiness {
  const blockers: CurrentOfficialWebE2bBlocker[] = []
  if (packageState !== 'packages-ready') {
    blockers.push({
      code: 'packages-missing',
      stage: 'composition',
      summary: 'The selected profile cannot resolve all three official E2B packages.',
      sourcePaths: ['packages/e2b/README.md'],
    })
  }
  blockers.push({
    code: 'host-workspace-contract',
    stage: 'composition',
    summary: 'Official Web workspaces and session cwd values are canonical existing host directories; E2B needs a POSIX remote cwd and performs no host workspace sync.',
    sourcePaths: [
      'packages/workspace/workspace/src/index.ts',
      'packages/e2b/fs-e2b/README.md',
      'examples/headless-agent/README.md',
    ],
  })
  if (hostPlatform === 'win32') {
    blockers.push({
      code: 'linux-shell-selection',
      stage: 'composition',
      summary: 'The shipped Web presets select PowerShell from the Windows host platform, while subprocess-e2b exposes a Linux execution world that requires Bash selection.',
      sourcePaths: [
        'apps/cli/config/agent-presets/standard/agent.cordis.yml',
        'packages/e2b/subprocess-e2b/README.md',
      ],
    })
  }
  blockers.push({
    code: 'remote-search-carrier',
    stage: 'composition',
    summary: 'The visible glob/grep tools spawn the host-platform packaged ripgrep binary; official source explicitly requires a co-located remote carrier or provider-specific search backend.',
    sourcePaths: ['packages/fs/tool-fs-search/README.md'],
  })
  blockers.push({
    code: 'permission-semantics',
    stage: 'composition',
    summary: 'The official E2B POC uses danger-full-access inside the remote sandbox; the current Web permission surface must not promise host read-only/workspace-write fencing for bare E2B providers.',
    sourcePaths: [
      'examples/headless-agent/e2b.cordis.yml',
      'packages/e2b/fs-e2b/README.md',
      'packages/e2b/subprocess-e2b/README.md',
    ],
  })
  blockers.push({
    code: 'runtime-authority',
    stage: 'runtime',
    summary: 'Package installation, E2B credential inspection, provisioning, and remote start each require separate explicit authority.',
    sourcePaths: ['packages/e2b/e2b/README.md'],
  })

  return {
    id: 'web-e2b-transition',
    label: 'Web to E2B execution world',
    state: 'blocked',
    candidateAvailable: false,
    hostPlatform,
    participants: CURRENT_OFFICIAL_WEB_E2B_PARTICIPANTS.map(participant => ({ ...participant })),
    blockers,
    sessionBoundary: currentOfficialRemoteSessionBoundary(),
    externalActionsPerformed: false,
  }
}

/**
 * Probe one selected profile's exact current-official E2B package readiness.
 * This performs local manifest/module-resolution checks only: it never reads an
 * API key, imports plugin code, contacts E2B, or mutates the profile.
 */
export async function probeE2bProfileReadiness(
  profileDir: string,
  hostPlatform: NodeJS.Platform = process.platform,
): Promise<E2bProfileReadiness> {
  const manifestPath = join(profileDir, 'package.json')
  const parsed = await readJson(manifestPath)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('selected DSH profile package.json must contain an object')
  }
  const manifest = parsed as ProfileManifest
  const dependencies = manifest.dependencies ?? {}
  const profileRequire = createRequire(manifestPath)
  const packages = await Promise.all(CURRENT_OFFICIAL_E2B_PACKAGES.map(async packageName => {
    const declared = dependencies[packageName]
    const declaredVersion = typeof declared === 'string' ? declared : undefined
    if (declaredVersion === undefined) {
      return { packageName, status: 'not-installed' as const }
    }
    try {
      const packageManifestPath = profileRequire.resolve(`${packageName}/package.json`)
      const packageManifest = await readJson(packageManifestPath) as PackageManifest
      if (packageManifest.name !== packageName || typeof packageManifest.version !== 'string') {
        return { packageName, status: 'unresolvable' as const, declaredVersion }
      }
      return {
        packageName,
        status: 'available' as const,
        declaredVersion,
        installedVersion: packageManifest.version,
      }
    } catch {
      return { packageName, status: 'unresolvable' as const, declaredVersion }
    }
  }))

  const state = packages.every(candidate => candidate.status === 'available')
    ? 'packages-ready' as const
    : 'packages-missing' as const
  return {
    id: 'e2b-remote',
    label: 'E2B remote sandbox',
    state,
    packages,
    credentialReference: 'E2B_API_KEY',
    credentialInspected: false,
    defaultCwd: '/home/user/workspace',
    defaultTimeoutMs: 300000,
    lifecycle: 'Creates one ephemeral sandbox for the shared providers; timeout or owner disposal deletes it.',
    security: 'The API key configures the host SDK connection and is never installed inside the sandbox.',
    limitation: 'Agent/session state, LLM calls, logs, settings, credentials, and the control plane remain on the host; no workspace sync or retention is implied.',
    sourcePaths: [
      'packages/e2b/e2b/README.md',
      'packages/e2b/e2b/src/index.ts',
      'examples/headless-agent/e2b.cordis.yml',
    ],
    webTransition: assessCurrentOfficialWebE2bTransition(state, hostPlatform),
  }
}
