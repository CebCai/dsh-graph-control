import { constants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { DshInstallation } from './index.ts'

const PROFILE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u

export type DshSourceOwner = 'installation' | 'profile' | 'home' | 'explicit'
export type DshSourceRole = 'profile-manifest' | 'bundle-manifest' | 'patch'
export type NewlineStyle = 'lf' | 'crlf' | 'mixed' | 'none'

interface DshSourceBase {
  path: string
  uri: string
  role: DshSourceRole
  owner: DshSourceOwner
  writable: boolean
}

export interface ExistingDshSourceDocument extends DshSourceBase {
  exists: true
  rawBytes: Uint8Array
  text: string
  byteLength: number
  newline: NewlineStyle
}

export interface MissingDshSourceDocument extends DshSourceBase {
  exists: false
}

export type DshSourceDocument = ExistingDshSourceDocument | MissingDshSourceDocument

export interface DshSourceLayer {
  order: number
  owner: Exclude<DshSourceOwner, 'installation'> | 'bundle'
  label: string
  packageName?: string
  manifest?: ExistingDshSourceDocument
  patch: DshSourceDocument
}

export interface DshProfileSources {
  profile: string
  profileDir: string
  manifest: ExistingDshSourceDocument
  bundleNames: readonly string[]
  layers: readonly DshSourceLayer[]
}

export interface ReadProfileSourcesOptions {
  installation: DshInstallation
  profile: string
  dshHome: string
  cwd?: string
  patches?: readonly string[]
}

interface ProfileManifest {
  name?: unknown
  dsh?: {
    profile?: {
      bundles?: unknown
    }
    bundle?: {
      patch?: unknown
    }
  }
}

function detectNewlineStyle(text: string): NewlineStyle {
  const crlf = text.match(/\r\n/gu)?.length ?? 0
  const withoutCrlf = text.replace(/\r\n/gu, '')
  const lf = withoutCrlf.match(/\n/gu)?.length ?? 0
  const cr = withoutCrlf.match(/\r/gu)?.length ?? 0
  if (crlf === 0 && lf === 0 && cr === 0) return 'none'
  if (crlf > 0 && lf === 0 && cr === 0) return 'crlf'
  if (crlf === 0 && lf > 0 && cr === 0) return 'lf'
  return 'mixed'
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function canWrite(path: string, sourceExists: boolean): Promise<boolean> {
  try {
    await access(sourceExists ? path : dirname(path), constants.W_OK)
    return true
  } catch {
    return false
  }
}

async function readSource(
  path: string,
  role: DshSourceRole,
  owner: DshSourceOwner,
  policyWritable: boolean,
  required: boolean,
): Promise<DshSourceDocument> {
  const absolutePath = resolve(path)
  const sourceExists = await exists(absolutePath)
  const writable = policyWritable && await canWrite(absolutePath, sourceExists)
  const base: DshSourceBase = {
    path: absolutePath,
    uri: pathToFileURL(absolutePath).href,
    role,
    owner,
    writable,
  }
  if (!sourceExists) {
    if (required) throw new Error(`DSH source document was not found: ${absolutePath}`)
    return { ...base, exists: false }
  }

  const buffer = await readFile(absolutePath)
  const text = buffer.toString('utf8')
  return {
    ...base,
    exists: true,
    rawBytes: new Uint8Array(buffer),
    text,
    byteLength: buffer.byteLength,
    newline: detectNewlineStyle(text),
  }
}

function parseManifest(source: ExistingDshSourceDocument, label: string): ProfileManifest {
  let value: unknown
  try {
    value = JSON.parse(source.text.replace(/^\uFEFF/u, ''))
  } catch (cause) {
    throw new Error(`failed to parse ${label} ${source.path}: ${String(cause)}`)
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must contain a JSON object: ${source.path}`)
  }
  return value as ProfileManifest
}

function readBundleNames(manifest: ProfileManifest, manifestPath: string): string[] {
  const value = manifest.dsh?.profile?.bundles
  if (value === undefined) return []
  if (!Array.isArray(value) || !value.every(name => typeof name === 'string' && name !== '')) {
    throw new Error(`dsh.profile.bundles must be an array of package names: ${manifestPath}`)
  }
  return [...value]
}

async function resolveBundleDirectory(
  packageName: string,
  installationAnchor: string,
  profileManifestPath: string,
): Promise<string> {
  // Match official DSH's installation-first, profile-second Node lookup order.
  for (const anchor of [installationAnchor, profileManifestPath]) {
    for (const searchPath of createRequire(anchor).resolve.paths(packageName) ?? []) {
      const candidate = join(searchPath, packageName)
      if (await exists(join(candidate, 'package.json'))) return candidate
    }
  }
  throw new Error(
    `cannot resolve DSH profile bundle ${JSON.stringify(packageName)} from the installation or profile`,
  )
}

function installationManifestPath(installation: DshInstallation): string {
  return resolve(dirname(installation.cliEntry), '..', 'package.json')
}

/**
 * Read the exact declared source stack for an already initialized DSH profile.
 * Only JSON manifests are interpreted; YAML is retained as raw bytes/text and
 * no tag or expression is evaluated.
 */
export async function readProfileSources(options: ReadProfileSourcesOptions): Promise<DshProfileSources> {
  if (!PROFILE_NAME.test(options.profile)) {
    throw new Error(`invalid DSH profile name: ${JSON.stringify(options.profile)}`)
  }
  const profileDir = resolve(options.dshHome, 'profiles', options.profile)
  const profileManifestPath = join(profileDir, 'package.json')
  const manifestSource = await readSource(
    profileManifestPath,
    'profile-manifest',
    'profile',
    false,
    true,
  )
  if (!manifestSource.exists) throw new Error('unreachable: required profile manifest is missing')
  const manifest = parseManifest(manifestSource, 'DSH profile manifest')
  const bundleNames = readBundleNames(manifest, profileManifestPath)
  const layers: DshSourceLayer[] = []
  const installAnchor = installationManifestPath(options.installation)

  for (const [order, packageName] of bundleNames.entries()) {
    const packageDir = await resolveBundleDirectory(packageName, installAnchor, profileManifestPath)
    const bundleManifestSource = await readSource(
      join(packageDir, 'package.json'),
      'bundle-manifest',
      'installation',
      false,
      true,
    )
    if (!bundleManifestSource.exists) throw new Error('unreachable: required bundle manifest is missing')
    const bundleManifest = parseManifest(bundleManifestSource, `DSH bundle ${JSON.stringify(packageName)} manifest`)
    const declaredPatch = bundleManifest.dsh?.bundle?.patch
    if (typeof declaredPatch !== 'string' || declaredPatch === '') {
      throw new Error(`DSH profile bundle ${JSON.stringify(packageName)} declares no dsh.bundle.patch`)
    }
    layers.push({
      order,
      owner: 'bundle',
      label: packageName,
      packageName,
      manifest: bundleManifestSource,
      patch: await readSource(resolve(packageDir, declaredPatch), 'patch', 'installation', false, true),
    })
  }

  const profileOrder = layers.length
  layers.push({
    order: profileOrder,
    owner: 'profile',
    label: `${options.profile} profile patch`,
    patch: await readSource(join(profileDir, 'cordis.patch.yml'), 'patch', 'profile', true, false),
  })
  layers.push({
    order: profileOrder + 1,
    owner: 'home',
    label: 'DSH home patch',
    patch: await readSource(join(resolve(options.dshHome), 'cordis.patch.yml'), 'patch', 'home', true, false),
  })

  const cwd = resolve(options.cwd ?? process.cwd())
  for (const [index, patch] of (options.patches ?? []).entries()) {
    const patchPath = resolve(cwd, patch)
    layers.push({
      order: profileOrder + 2 + index,
      owner: 'explicit',
      label: `explicit patch ${index + 1}`,
      patch: await readSource(patchPath, 'patch', 'explicit', true, true),
    })
  }

  return {
    profile: options.profile,
    profileDir,
    manifest: manifestSource,
    bundleNames,
    layers,
  }
}
