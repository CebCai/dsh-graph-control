import type {
  DshInstallation,
  DshProfileSources,
  E2bProfileReadiness,
  GitWorkspaceMaterialization,
} from '@dsh-graph-control/dsh-adapter'

export interface StudioDeveloperDiagnostics {
  generatedAt: string
  context: {
    profile: string
    profileDirectory: string
    dshHome: string
    installationRoot: string
    workspace: string
    layers: readonly {
      owner: 'bundle' | 'profile' | 'home' | 'explicit'
      label: string
      path: string
      exists: boolean
      writable: boolean
    }[]
  }
  remoteWorldReadiness: E2bProfileReadiness & {
    workspaceMaterialization: GitWorkspaceMaterialization
  }
  externalActionsPerformed: false
}

export function createStudioDeveloperDiagnostics(options: {
  installation: Pick<DshInstallation, 'root'>
  sources: DshProfileSources
  dshHome: string
  workspace: string
  e2bReadiness: E2bProfileReadiness
  workspaceMaterialization: GitWorkspaceMaterialization
  generatedAt?: string
}): StudioDeveloperDiagnostics {
  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    context: {
      profile: options.sources.profile,
      profileDirectory: options.sources.profileDir,
      dshHome: options.dshHome,
      installationRoot: options.installation.root,
      workspace: options.workspace,
      layers: options.sources.layers.map(layer => ({
        owner: layer.owner,
        label: layer.label,
        path: layer.patch.path,
        exists: layer.patch.exists,
        writable: layer.patch.writable,
      })),
    },
    remoteWorldReadiness: {
      ...options.e2bReadiness,
      packages: options.e2bReadiness.packages.map(candidate => ({ ...candidate })),
      sourcePaths: [...options.e2bReadiness.sourcePaths],
      webTransition: {
        ...options.e2bReadiness.webTransition,
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
      },
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
      },
    },
    externalActionsPerformed: false,
  }
}
