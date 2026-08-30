import { constants } from 'node:fs'
import type { Dirent } from 'node:fs'
import { access, readFile, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export interface LocalDshProfile {
  name: string
  directory: string
  patchPath: string
  patchExists: boolean
  patchWritable: boolean
}

function isProfileManifest(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const dsh = (value as Record<string, unknown>).dsh
  if (dsh === null || typeof dsh !== 'object' || Array.isArray(dsh)) return false
  const profile = (dsh as Record<string, unknown>).profile
  return profile !== null && typeof profile === 'object' && !Array.isArray(profile)
}

async function fileAccess(path: string, mode: number): Promise<boolean> {
  try {
    await access(path, mode)
    return true
  } catch {
    return false
  }
}

/** Discover only already-initialized local DSH profiles; never creates or repairs one. */
export async function discoverLocalDshProfiles(dshHome: string): Promise<LocalDshProfile[]> {
  const profilesRoot = join(resolve(dshHome), 'profiles')
  let entries: Dirent[]
  try {
    entries = await readdir(profilesRoot, { withFileTypes: true })
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw cause
  }

  const profiles = await Promise.all(entries
    .filter(entry => entry.isDirectory() && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(entry.name))
    .map(async entry => {
      const directory = join(profilesRoot, entry.name)
      const manifestPath = join(directory, 'package.json')
      const patchPath = join(directory, 'cordis.patch.yml')
      try {
        const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as unknown
        if (!isProfileManifest(manifest)) return undefined
      } catch {
        return undefined
      }
      const patchExists = await fileAccess(patchPath, constants.F_OK)
      return {
        name: entry.name,
        directory,
        patchPath,
        patchExists,
        patchWritable: patchExists && await fileAccess(patchPath, constants.W_OK),
      } satisfies LocalDshProfile
    }))

  return profiles
    .filter((profile): profile is LocalDshProfile => profile !== undefined)
    .sort((left, right) => left.name.localeCompare(right.name, 'en'))
}
