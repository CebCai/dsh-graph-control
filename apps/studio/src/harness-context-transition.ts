import { constants, type Dirent } from 'node:fs'
import { access, lstat, readFile, readdir, realpath, stat } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import {
  assertSafeProfileName,
  DshProfileMigrationRequiredError,
  DshProfileSourceChangedError,
  DshStagedSourceMutationError,
  type OfficialDshComponentPackageEvidence,
  type LocalDshProfile,
  type DshProfileSources,
  type DshSourceDocument,
} from '@dsh-graph-control/dsh-adapter'
import { StudioHttpError } from './studio-http-error.ts'

export const HARNESS_CONTEXT_CANDIDATE_TTL_MS = 5 * 60_000

export type HarnessContextErrorStatus = 400 | 409 | 422
export type HarnessContextErrorReason =
  | 'request-invalid'
  | 'explicit-patches'
  | 'context-busy'
  | 'candidate-expired'
  | 'candidate-changed'
  | 'context-changed'
  | 'pending-confirmation-required'
  | 'profile-missing'
  | 'profile-already-exists'
  | 'initialization-preview-required'
  | 'initialization-failed'
  | 'source-changed'
  | 'installation-unavailable'
  | 'home-unavailable'
  | 'installation-incompatible'
  | 'profile-migration-required'
  | 'composition-failed'

export interface HarnessContextCheckRequest {
  installationRoot: string
  dshHome: string
}

export interface HarnessContextOpenRequest {
  candidateId: string
  expectedContextRevision: number
  profile: string
  discardPendingChanges: boolean
}

export interface HarnessContextInitializePreviewRequest {
  candidateId: string
  expectedContextRevision: number
}

export interface HarnessContextInitializeApplyRequest {
  initializationId: string
  expectedContextRevision: number
  discardPendingChanges: boolean
}

export interface CanonicalLocalDirectory {
  requested: string
  canonical: string
}

export interface DshCheckoutFileIdentity {
  version: string
  rootManifestRealPath: string
  cliManifestRealPath: string
  rootManifest: Uint8Array
  cliManifest: Uint8Array
  cliEntry: {
    realPath: string
    size: number
    mtimeMs: number
    ctimeMs: number
  }
}

export interface DshHomePatchIdentity {
  exists: boolean
  rawBytes: Uint8Array
}

const MAX_MANIFEST_BYTES = 64 * 1024
const MAX_CLI_ENTRY_BYTES = 16 * 1024 * 1024
const MAX_HOME_PATCH_BYTES = 4 * 1024 * 1024
const MAX_PROFILE_ENTRIES = 256

export class HarnessContextRequestError extends Error {}
export class HarnessContextLocalDirectoryError extends Error {}
export class HarnessContextSourceChangedError extends Error {}
class HarnessContextPathEscapeError extends Error {}
class HarnessContextBoundedFileError extends Error {}

/** Classify only the finite failures produced while composing a checked context. */
export function harnessContextCompositionError(cause: unknown): StudioHttpError | undefined {
  if (cause instanceof DshProfileMigrationRequiredError) {
    return harnessContextError(422, 'profile-migration-required')
  }
  if (cause instanceof DshStagedSourceMutationError) {
    return harnessContextError(422, 'composition-failed')
  }
  if (cause instanceof DshProfileSourceChangedError
    || cause instanceof HarnessContextSourceChangedError) {
    return harnessContextError(409, 'source-changed')
  }
  return undefined
}

function transitionCode(status: HarnessContextErrorStatus): string {
  return status === 400
    ? 'HARNESS_CONTEXT_REQUEST_INVALID'
    : status === 409
      ? 'HARNESS_CONTEXT_CONFLICT'
      : 'HARNESS_CONTEXT_UNAVAILABLE'
}

export function harnessContextError(
  status: HarnessContextErrorStatus,
  reason: HarnessContextErrorReason,
  details: {
    writePerformed?: boolean
    profileTargetState?: 'missing' | 'present' | 'unknown'
    partialFilesMayRemain?: boolean
  } = {},
): StudioHttpError {
  return new StudioHttpError(status, {
    error: {
      code: transitionCode(status),
      reason,
      currentPreserved: true,
      draftPreserved: true,
      writePerformed: details.writePerformed ?? false,
      ...(details.profileTargetState === undefined
        ? {}
        : { profileTargetState: details.profileTargetState }),
      ...(details.partialFilesMayRemain === undefined
        ? {}
        : { partialFilesMayRemain: details.partialFilesMayRemain }),
    },
  })
}

function exactRecord(body: unknown, fields: readonly string[]): Record<string, unknown> {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new HarnessContextRequestError('request body must be an object')
  }
  const record = body as Record<string, unknown>
  const actual = Object.keys(record).sort()
  const expected = [...fields].sort()
  if (actual.length !== expected.length || actual.some((field, index) => field !== expected[index])) {
    throw new HarnessContextRequestError('request body has unexpected or missing fields')
  }
  return record
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || value === '' || value.length > 32_767 || value.includes('\0')) {
    throw new HarnessContextRequestError('request field must be a bounded non-empty string')
  }
  return value
}

export function parseHarnessContextCheckRequest(body: unknown): HarnessContextCheckRequest {
  const record = exactRecord(body, ['installationRoot', 'dshHome'])
  return {
    installationRoot: requiredString(record.installationRoot),
    dshHome: requiredString(record.dshHome),
  }
}

export function parseHarnessContextOpenRequest(body: unknown): HarnessContextOpenRequest {
  const record = exactRecord(body, [
    'candidateId',
    'expectedContextRevision',
    'profile',
    'discardPendingChanges',
  ])
  const candidateId = requiredString(record.candidateId)
  const profile = requiredString(record.profile)
  const expectedContextRevision = record.expectedContextRevision
  if (candidateId.length > 64
    || !Number.isSafeInteger(expectedContextRevision)
    || Number(expectedContextRevision) < 0
    || typeof record.discardPendingChanges !== 'boolean') {
    throw new HarnessContextRequestError('request field has an invalid type or range')
  }
  try {
    assertSafeProfileName(profile)
  } catch {
    throw new HarnessContextRequestError('profile name is invalid')
  }
  return {
    candidateId,
    expectedContextRevision: Number(expectedContextRevision),
    profile,
    discardPendingChanges: record.discardPendingChanges,
  }
}

export function parseHarnessContextInitializePreviewRequest(
  body: unknown,
): HarnessContextInitializePreviewRequest {
  const record = exactRecord(body, ['candidateId', 'expectedContextRevision'])
  const candidateId = requiredString(record.candidateId)
  const expectedContextRevision = record.expectedContextRevision
  if (candidateId.length > 64
    || !Number.isSafeInteger(expectedContextRevision)
    || Number(expectedContextRevision) < 0) {
    throw new HarnessContextRequestError('request field has an invalid type or range')
  }
  return {
    candidateId,
    expectedContextRevision: Number(expectedContextRevision),
  }
}

export function parseHarnessContextInitializeApplyRequest(
  body: unknown,
): HarnessContextInitializeApplyRequest {
  const record = exactRecord(body, [
    'initializationId',
    'expectedContextRevision',
    'discardPendingChanges',
  ])
  const initializationId = requiredString(record.initializationId)
  const expectedContextRevision = record.expectedContextRevision
  if (initializationId.length > 64
    || !Number.isSafeInteger(expectedContextRevision)
    || Number(expectedContextRevision) < 0
    || typeof record.discardPendingChanges !== 'boolean') {
    throw new HarnessContextRequestError('request field has an invalid type or range')
  }
  return {
    initializationId,
    expectedContextRevision: Number(expectedContextRevision),
    discardPendingChanges: record.discardPendingChanges,
  }
}

function samePath(left: string, right: string): boolean {
  return process.platform === 'win32'
    ? left.localeCompare(right, 'en', { sensitivity: 'accent' }) === 0
    : left === right
}

function validateLocalAbsolutePath(value: string): void {
  if (value.startsWith('~') || /%[^%]+%/u.test(value)) {
    throw new HarnessContextRequestError('path expansion syntax is not accepted')
  }
  const slashes = value.replaceAll('/', '\\')
  if (slashes.startsWith('\\\\')
    || slashes.startsWith('\\?\\')
    || slashes.startsWith('\\.\\')) {
    throw new HarnessContextRequestError('UNC and device paths are not accepted')
  }
  if (process.platform === 'win32') {
    if (!/^[A-Za-z]:[\\/]/u.test(value)) {
      throw new HarnessContextRequestError('a drive-qualified absolute path is required')
    }
  } else if (!isAbsolute(value) || value.startsWith('//')) {
    throw new HarnessContextRequestError('an absolute local path is required')
  }
  if (!isAbsolute(value)) throw new HarnessContextRequestError('an absolute local path is required')
}

/** Canonicalize one explicitly selected directory and recheck its top-level target. */
export async function canonicalLocalDirectory(value: string): Promise<CanonicalLocalDirectory> {
  validateLocalAbsolutePath(value)
  const requested = resolve(value)
  try {
    const before = await lstat(requested)
    if (before.isSymbolicLink()) {
      throw new HarnessContextLocalDirectoryError('selected directory links are not accepted')
    }
    if (!before.isDirectory()) throw new HarnessContextLocalDirectoryError('selected path is not a directory')
    const canonical = await realpath(requested)
    validateLocalAbsolutePath(canonical)
    const [after, repeated] = await Promise.all([lstat(requested), realpath(requested)])
    if (after.isSymbolicLink() || !after.isDirectory() || !samePath(canonical, repeated)) {
      throw new HarnessContextLocalDirectoryError('selected directory changed during canonicalization')
    }
    const canonicalStat = await stat(canonical)
    if (!canonicalStat.isDirectory()) {
      throw new HarnessContextLocalDirectoryError('canonical target is not a directory')
    }
    return { requested, canonical }
  } catch (cause) {
    if (cause instanceof HarnessContextRequestError || cause instanceof HarnessContextLocalDirectoryError) throw cause
    throw new HarnessContextLocalDirectoryError('selected directory is unavailable')
  }
}

interface PackageManifest {
  name?: unknown
  version?: unknown
}

function pathIsWithin(root: string, target: string): boolean {
  const relation = relative(root, target)
  return relation !== ''
    && relation !== '..'
    && !relation.startsWith(`..${sep}`)
    && !isAbsolute(relation)
}

async function boundedFileWithin(
  root: string,
  path: string,
  maximumBytes: number,
): Promise<{ bytes: Buffer; realPath: string; size: number; mtimeMs: number; ctimeMs: number }> {
  const link = await lstat(path)
  if (!link.isFile() && !link.isSymbolicLink()) throw new HarnessContextBoundedFileError('required path is not a file')
  const realPath = await realpath(path)
  if (!pathIsWithin(root, realPath)) {
    throw new HarnessContextPathEscapeError('required file escapes its selected root')
  }
  const file = await stat(realPath)
  if (!file.isFile() || file.size > maximumBytes) {
    throw new HarnessContextBoundedFileError('required file has an invalid size or type')
  }
  const bytes = await readFile(realPath)
  if (bytes.byteLength !== file.size || bytes.byteLength > maximumBytes) {
    throw new HarnessContextBoundedFileError('required file changed during its bounded read')
  }
  const confirmed = await stat(realPath)
  if (!confirmed.isFile()
    || confirmed.size !== file.size
    || confirmed.mtimeMs !== file.mtimeMs
    || confirmed.ctimeMs !== file.ctimeMs) {
    throw new HarnessContextBoundedFileError('required file changed during inspection')
  }
  return {
    bytes,
    realPath,
    size: confirmed.size,
    mtimeMs: confirmed.mtimeMs,
    ctimeMs: confirmed.ctimeMs,
  }
}

/** Pure filesystem inspection: never invokes Git, Node, or the candidate CLI. */
export async function inspectDshCheckoutFiles(root: string): Promise<DshCheckoutFileIdentity> {
  const rootManifestPath = join(root, 'package.json')
  const cliManifestPath = join(root, 'apps', 'cli', 'package.json')
  const cliEntryPath = join(root, 'apps', 'cli', 'lib', 'bin.js')
  try {
    const [rootManifest, cliManifest, cliEntry] = await Promise.all([
      boundedFileWithin(root, rootManifestPath, MAX_MANIFEST_BYTES),
      boundedFileWithin(root, cliManifestPath, MAX_MANIFEST_BYTES),
      boundedFileWithin(root, cliEntryPath, MAX_CLI_ENTRY_BYTES),
    ])
    const rootValue = JSON.parse(rootManifest.bytes.toString('utf8')) as PackageManifest
    const cliValue = JSON.parse(cliManifest.bytes.toString('utf8')) as PackageManifest
    if (rootValue.name !== '@deepseek-ai/dsh-root'
      || cliValue.name !== '@deepseek-ai/dsh'
      || typeof cliValue.version !== 'string'
      || cliValue.version === '') {
      throw new Error('candidate is not a built official DSH checkout')
    }
    return {
      version: cliValue.version,
      rootManifestRealPath: rootManifest.realPath,
      cliManifestRealPath: cliManifest.realPath,
      rootManifest: new Uint8Array(rootManifest.bytes),
      cliManifest: new Uint8Array(cliManifest.bytes),
      cliEntry: {
        realPath: cliEntry.realPath,
        size: cliEntry.size,
        mtimeMs: cliEntry.mtimeMs,
        ctimeMs: cliEntry.ctimeMs,
      },
    }
  } catch {
    throw new HarnessContextLocalDirectoryError('official DSH checkout files are unavailable')
  }
}

async function fileAccess(path: string, mode: number): Promise<boolean> {
  try {
    await access(path, mode)
    return true
  } catch {
    return false
  }
}

/** Bounded, shallow discovery below one already-canonical DSH home. */
export async function discoverBoundedLocalDshProfiles(dshHome: string): Promise<LocalDshProfile[]> {
  const profilesPath = join(dshHome, 'profiles')
  let profilesLink: Awaited<ReturnType<typeof lstat>>
  try {
    profilesLink = await lstat(profilesPath)
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw new HarnessContextLocalDirectoryError('DSH profiles directory is unavailable')
  }
  if (profilesLink.isSymbolicLink() || !profilesLink.isDirectory()) {
    throw new HarnessContextLocalDirectoryError('DSH profiles directory links are not accepted')
  }
  let profilesRoot: string
  try {
    profilesRoot = await realpath(profilesPath)
    const [repeatedLink, repeatedRoot, canonicalStat] = await Promise.all([
      lstat(profilesPath),
      realpath(profilesPath),
      stat(profilesRoot),
    ])
    if (repeatedLink.isSymbolicLink()
      || !repeatedLink.isDirectory()
      || !samePath(profilesRoot, repeatedRoot)
      || !pathIsWithin(dshHome, profilesRoot)
      || !canonicalStat.isDirectory()) {
      throw new Error('profiles directory escapes its selected home')
    }
  } catch {
    throw new HarnessContextLocalDirectoryError('DSH profiles directory is unavailable')
  }
  let entries: Dirent[]
  try {
    entries = await readdir(profilesRoot, { withFileTypes: true })
  } catch {
    throw new HarnessContextLocalDirectoryError('DSH profiles directory is unavailable')
  }
  if (entries.length > MAX_PROFILE_ENTRIES) {
    throw new HarnessContextLocalDirectoryError('DSH profiles directory exceeds the bounded entry limit')
  }

  const profiles: LocalDshProfile[] = []
  for (const entry of entries) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(entry.name)) continue
    if (!entry.isDirectory()) {
      if (entry.isSymbolicLink()) {
        throw new HarnessContextLocalDirectoryError('profile directory links are not accepted')
      }
      continue
    }
    const directoryPath = join(profilesPath, entry.name)
    let directory: string
    try {
      directory = await realpath(directoryPath)
      if (!pathIsWithin(profilesRoot, directory) || !(await stat(directory)).isDirectory()) {
        throw new Error('profile directory escapes its selected home')
      }
    } catch {
      throw new HarnessContextLocalDirectoryError('profile directory is unavailable')
    }
    const manifestPath = join(directory, 'package.json')
    let manifest: unknown
    try {
      const inspected = await boundedFileWithin(directory, manifestPath, MAX_MANIFEST_BYTES)
      manifest = JSON.parse(inspected.bytes.toString('utf8')) as unknown
    } catch (cause) {
      if (cause instanceof HarnessContextPathEscapeError) {
        throw new HarnessContextLocalDirectoryError('profile manifest escapes its selected profile')
      }
      if (cause instanceof HarnessContextBoundedFileError) {
        throw new HarnessContextLocalDirectoryError('profile manifest exceeds its bounded read contract')
      }
      // Match existing discovery semantics for malformed or unrelated profile directories.
      continue
    }
    if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) continue
    const dsh = (manifest as Record<string, unknown>).dsh
    if (dsh === null || typeof dsh !== 'object' || Array.isArray(dsh)) continue
    const profile = (dsh as Record<string, unknown>).profile
    if (profile === null || typeof profile !== 'object' || Array.isArray(profile)) continue

    const patchPath = join(directory, 'cordis.patch.yml')
    const patchExists = await fileAccess(patchPath, constants.F_OK)
    if (patchExists) {
      try {
        const patchRealPath = await realpath(patchPath)
        if (!pathIsWithin(directory, patchRealPath) || !(await stat(patchRealPath)).isFile()) {
          throw new Error('profile patch escapes its selected profile')
        }
      } catch {
        throw new HarnessContextLocalDirectoryError('profile patch is unavailable')
      }
    }
    profiles.push({
      name: entry.name,
      directory,
      patchPath,
      patchExists,
      patchWritable: patchExists && await fileAccess(patchPath, constants.W_OK),
    })
  }
  return profiles.sort((left, right) => left.name.localeCompare(right.name, 'en'))
}

/** Inspect the exact profile target without treating a partial directory as initialized. */
export async function inspectLocalDshProfileTarget(
  dshHome: string,
  profile: string,
): Promise<'missing' | 'present'> {
  assertSafeProfileName(profile)
  try {
    await lstat(join(dshHome, 'profiles', profile))
    return 'present'
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return 'missing'
    throw new HarnessContextLocalDirectoryError('profile target state is unavailable')
  }
}

/** Snapshot the one home-level source that affects a newly initialized profile. */
export async function inspectLocalDshHomePatch(dshHome: string): Promise<DshHomePatchIdentity> {
  const patchPath = join(dshHome, 'cordis.patch.yml')
  try {
    const before = await lstat(patchPath)
    if (before.isSymbolicLink() || !before.isFile()) {
      throw new HarnessContextLocalDirectoryError('DSH home patch is unavailable')
    }
    if (before.size > MAX_HOME_PATCH_BYTES) {
      throw new HarnessContextLocalDirectoryError('DSH home patch exceeds its bounded read contract')
    }
    const canonical = await realpath(patchPath)
    if (!samePath(canonical, patchPath)) {
      throw new HarnessContextLocalDirectoryError('DSH home patch links are not accepted')
    }
    const bytes = await readFile(canonical)
    const after = await stat(canonical)
    if (!after.isFile()
      || after.size !== before.size
      || after.mtimeMs !== before.mtimeMs
      || after.ctimeMs !== before.ctimeMs
      || bytes.byteLength !== before.size
      || bytes.byteLength > MAX_HOME_PATCH_BYTES) {
      throw new HarnessContextLocalDirectoryError('DSH home patch changed during inspection')
    }
    return { exists: true, rawBytes: new Uint8Array(bytes) }
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') {
      return { exists: false, rawBytes: new Uint8Array() }
    }
    if (cause instanceof HarnessContextLocalDirectoryError) throw cause
    throw new HarnessContextLocalDirectoryError('DSH home patch is unavailable')
  }
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength
    && left.every((byte, index) => byte === right[index])
}

export function sameHomePatchIdentity(
  left: DshHomePatchIdentity,
  right: DshHomePatchIdentity,
): boolean {
  return left.exists === right.exists && sameBytes(left.rawBytes, right.rawBytes)
}

export function componentPackagesAreCoherent(
  before: readonly OfficialDshComponentPackageEvidence[],
  after: readonly OfficialDshComponentPackageEvidence[],
): boolean {
  return before.length === after.length
    && before.every((component, index) => {
      const other = after[index]
      return other !== undefined
        && component.id === other.id
        && component.packageName === other.packageName
        && component.installed === other.installed
        && component.version === other.version
    })
}

export function sameCheckoutFileIdentity(
  left: DshCheckoutFileIdentity,
  right: DshCheckoutFileIdentity,
): boolean {
  return left.version === right.version
    && samePath(left.rootManifestRealPath, right.rootManifestRealPath)
    && samePath(left.cliManifestRealPath, right.cliManifestRealPath)
    && sameBytes(left.rootManifest, right.rootManifest)
    && sameBytes(left.cliManifest, right.cliManifest)
    && samePath(left.cliEntry.realPath, right.cliEntry.realPath)
    && left.cliEntry.size === right.cliEntry.size
    && left.cliEntry.mtimeMs === right.cliEntry.mtimeMs
    && left.cliEntry.ctimeMs === right.cliEntry.ctimeMs
}

function sameSourceDocument(left: DshSourceDocument, right: DshSourceDocument): boolean {
  return left.path === right.path
    && left.uri === right.uri
    && left.role === right.role
    && left.owner === right.owner
    && left.writable === right.writable
    && left.exists === right.exists
    && (!left.exists || (right.exists && sameBytes(left.rawBytes, right.rawBytes)))
}

export function profileSourcesAreCoherent(
  before: DshProfileSources,
  after: DshProfileSources,
): boolean {
  return before.profile === after.profile
    && before.profileDir === after.profileDir
    && sameSourceDocument(before.manifest, after.manifest)
    && before.bundleNames.length === after.bundleNames.length
    && before.bundleNames.every((name, index) => name === after.bundleNames[index])
    && before.layers.length === after.layers.length
    && before.layers.every((layer, index) => {
      const other = after.layers[index]
      return other !== undefined
        && layer.order === other.order
        && layer.owner === other.owner
        && layer.label === other.label
        && layer.packageName === other.packageName
        && (layer.manifest === undefined
          ? other.manifest === undefined
          : other.manifest !== undefined && sameSourceDocument(layer.manifest, other.manifest))
        && sameSourceDocument(layer.patch, other.patch)
    })
}

export function assertProfileSourcesCoherent(
  before: DshProfileSources,
  after: DshProfileSources,
): void {
  if (!profileSourcesAreCoherent(before, after)) {
    throw new HarnessContextSourceChangedError('candidate sources changed during official composition')
  }
}

export function canonicalPathsMatch(
  left: CanonicalLocalDirectory,
  right: CanonicalLocalDirectory,
): boolean {
  return samePath(left.requested, right.requested) && samePath(left.canonical, right.canonical)
}
