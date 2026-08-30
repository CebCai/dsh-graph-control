import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { DshInstallation } from './index.ts'

export const CURRENT_OFFICIAL_COMPONENT_PACKAGES = [
  {
    id: 'time-context',
    packageName: '@deepseek-ai/dsh-time-context',
  },
  {
    id: 'schedule',
    packageName: '@deepseek-ai/dsh-schedule',
  },
  {
    id: 'mcp-streamable-http',
    packageName: '@deepseek-ai/dsh-mcp-client',
  },
  {
    id: 'task-list',
    packageName: '@deepseek-ai/dsh-tool-todo',
  },
  {
    id: 'goal-tracking',
    packageName: '@deepseek-ai/dsh-tool-goal',
  },
] as const

export type OfficialDshComponentId = typeof CURRENT_OFFICIAL_COMPONENT_PACKAGES[number]['id']
export type OfficialDshComponentPackageName = typeof CURRENT_OFFICIAL_COMPONENT_PACKAGES[number]['packageName']

export interface OfficialDshComponentPackageEvidence {
  id: OfficialDshComponentId
  packageName: OfficialDshComponentPackageName
  installed: boolean
  version?: string
}

interface PackageManifest {
  name?: string
  version?: string
}

async function inspectMaterializedPackage(
  installation: DshInstallation,
  contract: typeof CURRENT_OFFICIAL_COMPONENT_PACKAGES[number],
): Promise<OfficialDshComponentPackageEvidence> {
  const manifestPath = join(
    installation.root,
    'apps',
    'cli',
    'node_modules',
    ...contract.packageName.split('/'),
    'package.json',
  )
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as PackageManifest
    if (manifest.name !== contract.packageName || typeof manifest.version !== 'string' || manifest.version === '') {
      return { ...contract, installed: false }
    }
    return { ...contract, installed: true, version: manifest.version }
  } catch {
    return { ...contract, installed: false }
  }
}

/**
 * Inspect the packages actually materialized for the current official DSH CLI.
 * This is runtime evidence, not a package registry or a second plugin manifest.
 */
export async function discoverOfficialDshComponentPackages(
  installation: DshInstallation,
): Promise<readonly OfficialDshComponentPackageEvidence[]> {
  return await Promise.all(CURRENT_OFFICIAL_COMPONENT_PACKAGES.map(async contract =>
    await inspectMaterializedPackage(installation, contract)))
}
