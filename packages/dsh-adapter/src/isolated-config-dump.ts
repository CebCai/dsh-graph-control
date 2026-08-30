import { access, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, normalize, parse, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isAlias, isMap, isScalar, isSeq, parseDocument } from 'yaml'
import {
  assertSafeProfileName,
  DshCommandError,
  dumpDshConfig,
  type DshCommandResult,
  type DshInstallation,
} from './index.ts'
import type {
  DshProfileSources,
  DshSourceDocument,
  DshSourceLayer,
  ExistingDshSourceDocument,
  NewlineStyle,
} from './profile-sources.ts'

const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u

export interface DshProfileLayerOverride {
  uri: string
  rawBytes: Uint8Array
}

export interface DumpDshConfigFromProfileSourcesOptions {
  installation: DshInstallation
  sources: DshProfileSources
  cwd: string
  timeoutMs?: number
  overrides?: readonly DshProfileLayerOverride[]
}

export interface DumpDshConfigFromProfileSourcesResult extends DshCommandResult {
  /** The caller-owned source model with candidate bytes applied, never temporary paths. */
  sources: DshProfileSources
}

/** Official DSH normalized the staged profile manifest instead of composing it byte-for-byte. */
export class DshProfileMigrationRequiredError extends Error {
  readonly sourceUri: string

  constructor(sourceUri: string) {
    super('official DSH requires a profile-manifest migration before this profile can be composed safely')
    this.name = 'DshProfileMigrationRequiredError'
    this.sourceUri = sourceUri
  }
}

export type DshStagedSourceMutation = 'created' | 'removed' | 'modified'

/** Official DSH changed a staged declared source while composing the isolated snapshot. */
export class DshStagedSourceMutationError extends Error {
  readonly sourceUri: string
  readonly mutation: DshStagedSourceMutation

  constructor(sourceUri: string, mutation: DshStagedSourceMutation) {
    super(`official DSH ${mutation} a staged declared source while composing the profile`)
    this.name = 'DshStagedSourceMutationError'
    this.sourceUri = sourceUri
    this.mutation = mutation
  }
}

/** A real declared source no longer matches the snapshot used for composition. */
export class DshProfileSourceChangedError extends Error {
  readonly sourceUri: string
  readonly mutation: DshStagedSourceMutation

  constructor(sourceUri: string, mutation: DshStagedSourceMutation) {
    super(`a real DSH profile source was ${mutation} while composing its snapshot`)
    this.name = 'DshProfileSourceChangedError'
    this.sourceUri = sourceUri
    this.mutation = mutation
  }
}

interface StagedSourceExpectation {
  path: string
  sourceUri: string
  kind: 'profile-manifest' | 'profile-patch' | 'home-patch' | 'explicit-patch'
  expectedBytes?: Uint8Array
}

interface ResolvedBundleRoot {
  packageName: string
  lexicalRoot: string
  canonicalRoot: string
  origin: 'installation' | 'profile'
}

interface ProjectedVolume {
  realRoot: string
  projectedRoot: string
}

interface SourcePathProjection {
  root: string
  volumes: Map<string, ProjectedVolume>
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

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false
  }
  return true
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function orderedLayers(sources: DshProfileSources): readonly DshSourceLayer[] {
  const layers = [...sources.layers].sort((left, right) => left.order - right.order)
  if (layers.some((layer, index) => sources.layers[index] !== layer)) {
    throw new Error('DSH source layers must be stored in their declared order')
  }
  for (let index = 1; index < layers.length; index += 1) {
    if (layers[index - 1]?.order === layers[index]?.order) {
      throw new Error(`duplicate DSH source-layer order: ${String(layers[index]?.order)}`)
    }
  }
  return layers
}

function mutableLayers(layers: readonly DshSourceLayer[]): readonly DshSourceLayer[] {
  return layers.filter(layer => layer.owner === 'profile' || layer.owner === 'home' || layer.owner === 'explicit')
}

function resolveOverrideBytes(
  layers: readonly DshSourceLayer[],
  overrides: readonly DshProfileLayerOverride[],
): ReadonlyMap<DshSourceDocument, Uint8Array> {
  const targets = mutableLayers(layers)
  const resolved = new Map<DshSourceDocument, Uint8Array>()
  const seenUris = new Set<string>()

  for (const override of overrides) {
    if (seenUris.has(override.uri)) {
      throw new Error(`duplicate DSH profile-layer override: ${JSON.stringify(override.uri)}`)
    }
    seenUris.add(override.uri)
    if (!(override.rawBytes instanceof Uint8Array)) {
      throw new TypeError('DSH profile-layer override rawBytes must be a Uint8Array')
    }
    const matches = targets.filter(layer => layer.patch.uri === override.uri)
    if (matches.length !== 1) {
      throw new Error(
        `DSH profile-layer override must match exactly one profile, home, or explicit layer: ${JSON.stringify(override.uri)}`,
      )
    }
    const patch = matches[0]?.patch
    if (patch === undefined) throw new Error('unreachable: matched DSH source layer has no patch')
    resolved.set(patch, new Uint8Array(override.rawBytes))
  }

  return resolved
}

function effectiveDocument(
  document: DshSourceDocument,
  overrideBytes: Uint8Array | undefined,
): DshSourceDocument {
  if (overrideBytes === undefined) return document
  const rawBytes = new Uint8Array(overrideBytes)
  const text = Buffer.from(rawBytes).toString('utf8')
  return {
    path: document.path,
    uri: document.uri,
    role: document.role,
    owner: document.owner,
    writable: document.writable,
    exists: true,
    rawBytes,
    text,
    byteLength: rawBytes.byteLength,
    newline: detectNewlineStyle(text),
  }
}

function applyOverrides(
  sources: DshProfileSources,
  overrides: ReadonlyMap<DshSourceDocument, Uint8Array>,
): DshProfileSources {
  if (overrides.size === 0) return sources
  return {
    ...sources,
    layers: sources.layers.map(layer => ({
      ...layer,
      patch: effectiveDocument(layer.patch, overrides.get(layer.patch)),
    })),
  }
}

function onlyLayer(layers: readonly DshSourceLayer[], owner: 'profile' | 'home'): DshSourceLayer {
  const matches = layers.filter(layer => layer.owner === owner)
  if (matches.length !== 1) {
    throw new Error(`DSH profile sources must contain exactly one ${owner} patch layer`)
  }
  const layer = matches[0]
  if (layer === undefined) throw new Error('unreachable: missing required DSH source layer')
  return layer
}

function assertSafeBundleNames(sources: DshProfileSources): void {
  for (const packageName of sources.bundleNames) {
    if (!PACKAGE_NAME.test(packageName)) {
      throw new Error(`unsafe DSH bundle package name: ${JSON.stringify(packageName)}`)
    }
  }
}

function parseJsonObject(bytes: Uint8Array, label: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(bytes).toString('utf8').replace(/^\uFEFF/u, ''))
  } catch (cause) {
    throw new Error(`failed to parse ${label}: ${String(cause)}`)
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must contain a JSON object`)
  }
  return parsed as Record<string, unknown>
}

function manifestBundleNames(manifest: ExistingDshSourceDocument): readonly string[] {
  const parsed = parseJsonObject(manifest.rawBytes, 'DSH profile manifest')
  const dsh = parsed.dsh
  if (dsh === undefined) return []
  if (dsh === null || typeof dsh !== 'object' || Array.isArray(dsh)) {
    throw new Error('DSH profile manifest dsh field must contain an object')
  }
  const profile = (dsh as Record<string, unknown>).profile
  if (profile === undefined) return []
  if (profile === null || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new Error('DSH profile manifest dsh.profile field must contain an object')
  }
  const bundles = (profile as Record<string, unknown>).bundles
  if (bundles === undefined) return []
  if (!Array.isArray(bundles) || !bundles.every(name => typeof name === 'string')) {
    throw new Error('DSH profile manifest dsh.profile.bundles must contain package names')
  }
  return bundles
}

function bundlePatchDeclaration(manifest: ExistingDshSourceDocument): { name?: unknown; patch?: unknown } {
  const parsed = parseJsonObject(manifest.rawBytes, 'DSH bundle manifest')
  const dsh = parsed.dsh
  const bundle = dsh !== null && typeof dsh === 'object' && !Array.isArray(dsh)
    ? (dsh as Record<string, unknown>).bundle
    : undefined
  const patch = bundle !== null && typeof bundle === 'object' && !Array.isArray(bundle)
    ? (bundle as Record<string, unknown>).patch
    : undefined
  return { name: parsed.name, patch }
}

function assertPathContained(root: string, target: string, label: string): void {
  const offset = relative(root, target)
  if (offset === '' || offset === '..' || offset.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
    || isAbsolute(offset)) {
    throw new Error(`${label} escapes its package root`)
  }
}

function assertCoherentBundleLayers(
  sources: DshProfileSources,
  layers: readonly DshSourceLayer[],
): void {
  const declaredNames = manifestBundleNames(sources.manifest)
  if (declaredNames.length !== sources.bundleNames.length
    || declaredNames.some((name, index) => name !== sources.bundleNames[index])) {
    throw new Error('DSH profile manifest bundle order does not match its source snapshot')
  }
  const bundleLayers = layers.filter(layer => layer.owner === 'bundle')
  if (bundleLayers.length !== sources.bundleNames.length) {
    throw new Error('DSH bundle source layers do not match the profile bundle count')
  }
  for (const [index, layer] of layers.entries()) {
    if (layer.order !== index) throw new Error('DSH source-layer order must be contiguous')
    const expectedOwner = index < sources.bundleNames.length
      ? 'bundle'
      : index === sources.bundleNames.length
        ? 'profile'
        : index === sources.bundleNames.length + 1
          ? 'home'
          : 'explicit'
    if (layer.owner !== expectedOwner || layer.patch.role !== 'patch') {
      throw new Error('DSH source-layer topology does not match bundle/profile/home/explicit precedence')
    }
    const expectedDocumentOwner = layer.owner === 'bundle' ? 'installation' : layer.owner
    if (layer.patch.owner !== expectedDocumentOwner) {
      throw new Error('DSH source-layer document ownership does not match its layer')
    }
  }
  for (const [index, packageName] of sources.bundleNames.entries()) {
    const layer = bundleLayers[index]
    if (layer === undefined || layer.packageName !== packageName) {
      throw new Error('DSH bundle source-layer order does not match the profile manifest')
    }
    if (layer.manifest === undefined || layer.manifest.role !== 'bundle-manifest'
      || layer.manifest.owner !== 'installation' || !layer.patch.exists) {
      throw new Error(`DSH bundle source layer is incomplete: ${JSON.stringify(packageName)}`)
    }
    const declaration = bundlePatchDeclaration(layer.manifest)
    if (declaration.name !== packageName || typeof declaration.patch !== 'string' || declaration.patch === '') {
      throw new Error(`DSH bundle manifest does not match its source layer: ${JSON.stringify(packageName)}`)
    }
    const packageRoot = dirname(layer.manifest.path)
    const declaredPatchPath = resolve(packageRoot, declaration.patch)
    assertPathContained(packageRoot, declaredPatchPath, `DSH bundle ${JSON.stringify(packageName)} patch`)
    if (declaredPatchPath !== resolve(layer.patch.path)) {
      throw new Error(`DSH bundle patch path does not match its manifest: ${JSON.stringify(packageName)}`)
    }
  }
}

function installationManifestPath(installation: DshInstallation): string {
  return resolve(dirname(installation.cliEntry), '..', 'package.json')
}

async function resolveBundleRoot(
  packageName: string,
  installation: DshInstallation,
  profileManifestPath: string,
): Promise<Omit<ResolvedBundleRoot, 'packageName'>> {
  // Match official DSH's installation-first, profile-second Node lookup order.
  // Probe package directories directly so packages need not export package.json.
  for (const [index, anchor] of [installationManifestPath(installation), profileManifestPath].entries()) {
    for (const searchPath of createRequire(anchor).resolve.paths(packageName) ?? []) {
      const candidate = join(searchPath, packageName)
      if (await pathExists(join(candidate, 'package.json'))) {
        return {
          lexicalRoot: candidate,
          canonicalRoot: await realpath(candidate),
          origin: index === 0 ? 'installation' : 'profile',
        }
      }
    }
  }
  throw new Error(
    `cannot resolve DSH profile bundle ${JSON.stringify(packageName)} from the selected installation or profile`,
  )
}

function canonicalPathKey(path: string): string {
  const canonical = normalize(path)
  return process.platform === 'win32' ? canonical.toLowerCase() : canonical
}

function createSourcePathProjection(root: string): SourcePathProjection {
  return { root: resolve(root), volumes: new Map() }
}

function projectedPath(projection: SourcePathProjection, sourcePath: string): string {
  if (!isAbsolute(sourcePath)) {
    throw new Error(`DSH source path must be absolute before isolated composition: ${JSON.stringify(sourcePath)}`)
  }
  const absolute = resolve(sourcePath)
  const realRoot = parse(absolute).root
  if (realRoot === '') throw new Error(`DSH source path has no filesystem root: ${JSON.stringify(sourcePath)}`)
  const key = canonicalPathKey(realRoot)
  let volume = projection.volumes.get(key)
  if (volume === undefined) {
    const encodedRoot = Buffer.from(realRoot, 'utf8').toString('base64url') || 'root'
    volume = {
      realRoot,
      projectedRoot: join(projection.root, `volume-${encodedRoot}`),
    }
    projection.volumes.set(key, volume)
  }
  const offset = relative(realRoot, absolute)
  if (offset === '..' || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
    throw new Error(`DSH source path escapes its filesystem root: ${JSON.stringify(sourcePath)}`)
  }
  return offset === '' ? volume.projectedRoot : join(volume.projectedRoot, offset)
}

function trailingSeparator(path: string): string {
  return path.endsWith(sep) ? path : `${path}${sep}`
}

/** Restore only the random projection prefixes that official DSH could have introduced. */
function restoreProjectedPaths(projection: SourcePathProjection, text: string): string {
  const replacements = [...projection.volumes.values()].flatMap((volume) => {
    const projectedNative = trailingSeparator(volume.projectedRoot)
    const realNative = trailingSeparator(volume.realRoot)
    return [
      { from: pathToFileURL(projectedNative).href, to: pathToFileURL(realNative).href },
      { from: pathToFileURL(volume.projectedRoot).href, to: pathToFileURL(volume.realRoot).href },
      ...(sep === '\\'
        ? [{
            from: projectedNative.replaceAll('\\', '\\\\'),
            to: realNative.replaceAll('\\', '\\\\'),
          }, {
            from: volume.projectedRoot.replaceAll('\\', '\\\\'),
            to: volume.realRoot.replaceAll('\\', '\\\\'),
          }, {
            from: projectedNative.replaceAll('\\', '/'),
            to: realNative.replaceAll('\\', '/'),
          }, {
            from: volume.projectedRoot.replaceAll('\\', '/'),
            to: volume.realRoot.replaceAll('\\', '/'),
          }]
        : []),
      { from: projectedNative, to: realNative },
      { from: volume.projectedRoot, to: volume.realRoot },
    ]
  }).sort((left, right) => right.from.length - left.from.length)
  return replacements.reduce(
    (restored, replacement) => restored.replaceAll(replacement.from, replacement.to),
    text,
  )
}

function ownedPathTokens(ownedRoot: string): readonly string[] {
  const absolute = resolve(ownedRoot)
  return [
    pathToFileURL(absolute).href,
    ...(sep === '\\'
      ? [absolute.replaceAll('\\', '\\\\'), absolute.replaceAll('\\', '/')]
      : []),
    absolute,
  ].sort((left, right) => right.length - left.length)
}

function assertNoOwnedPath(text: string, ownedRoot: string): void {
  if (ownedPathTokens(ownedRoot).some(token => text.includes(token))) {
    throw new Error('official DSH composition retained an isolated projection path')
  }
}

function sanitizeOwnedPaths(text: string, ownedRoot: string): string {
  return ownedPathTokens(ownedRoot).reduce(
    (sanitized, token) => sanitized.replaceAll(token, '<isolated-composition>'),
    text,
  )
}

function restoredCommandResult(
  result: DshCommandResult,
  projection: SourcePathProjection,
  ownedRoot: string,
): DshCommandResult {
  const restored = {
    ...result,
    stdout: restoreProjectedPaths(projection, result.stdout),
    stderr: restoreProjectedPaths(projection, result.stderr),
  }
  assertNoOwnedPath(restored.stdout, ownedRoot)
  assertNoOwnedPath(restored.stderr, ownedRoot)
  return restored
}

function restoredCommandFailure(
  cause: unknown,
  projection: SourcePathProjection,
  ownedRoot: string,
): unknown {
  if (!(cause instanceof DshCommandError)) return cause
  const result = {
    ...cause.result,
    stdout: sanitizeOwnedPaths(restoreProjectedPaths(projection, cause.result.stdout), ownedRoot),
    stderr: sanitizeOwnedPaths(restoreProjectedPaths(projection, cause.result.stderr), ownedRoot),
  }
  const message = sanitizeOwnedPaths(restoreProjectedPaths(projection, cause.message), ownedRoot)
  return new DshCommandError(message, result)
}

function samePath(left: string, right: string): boolean {
  return canonicalPathKey(resolve(left)) === canonicalPathKey(resolve(right))
}

function realDshHome(
  sources: DshProfileSources,
  profileLayer: DshSourceLayer,
  homeLayer: DshSourceLayer,
): string {
  if (sources.manifest.role !== 'profile-manifest' || sources.manifest.owner !== 'profile'
    || basename(sources.manifest.path) !== 'package.json'
    || !samePath(sources.manifest.path, join(sources.profileDir, 'package.json'))
    || !samePath(profileLayer.patch.path, join(sources.profileDir, 'cordis.patch.yml'))
    || basename(homeLayer.patch.path) !== 'cordis.patch.yml') {
    throw new Error('DSH profile source paths do not match the official profile layout')
  }
  const home = dirname(homeLayer.patch.path)
  if (!samePath(sources.profileDir, join(home, 'profiles', sources.profile))) {
    throw new Error('DSH profile directory does not belong to the selected DSH home')
  }
  return home
}

type ParsedYamlDocument = ReturnType<typeof parseDocument>

function resolveYamlAlias(node: unknown, document: ParsedYamlDocument): unknown {
  const aliases = new Set<unknown>()
  let current = node
  while (isAlias(current)) {
    if (aliases.has(current)) throw new Error('cyclic YAML alias in a DSH patch cannot be inspected safely')
    aliases.add(current)
    current = current.resolve(document)
  }
  return current
}

function yamlMapField(
  node: unknown,
  field: string,
  document: ParsedYamlDocument,
  visited: Set<unknown> = new Set(),
): unknown {
  const current = resolveYamlAlias(node, document)
  if (!isMap(current) || visited.has(current)) return undefined
  visited.add(current)
  for (const pair of current.items) {
    const key = resolveYamlAlias(pair.key, document)
    if (isScalar(key) && key.value === field) return pair.value
  }
  for (const pair of current.items) {
    const key = resolveYamlAlias(pair.key, document)
    if (!isScalar(key) || key.value !== '<<') continue
    const merged = resolveYamlAlias(pair.value, document)
    if (isSeq(merged)) {
      for (const item of merged.items) {
        const value = yamlMapField(item, field, document, visited)
        if (value !== undefined) return value
      }
    } else {
      const value = yamlMapField(merged, field, document, visited)
      if (value !== undefined) return value
    }
  }
  return undefined
}

function yamlTruthy(node: unknown, document: ParsedYamlDocument): boolean {
  const current = resolveYamlAlias(node, document)
  if (current === null || current === undefined) return false
  return isScalar(current) ? Boolean(current.value) : true
}

function relativePathCrossesFilesystemRoot(base: string, name: string): boolean {
  const absoluteBase = resolve(base)
  const root = parse(absoluteBase).root
  const baseOffset = relative(root, absoluteBase)
  let depth = baseOffset === '' ? 0 : baseOffset.split(sep).filter(Boolean).length
  const parts = process.platform === 'win32' ? name.split(/[\\/]+/u) : name.split(/\/+/u)
  for (const part of parts) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (depth === 0) return true
      depth -= 1
    } else {
      depth += 1
    }
  }
  return false
}

function isRelativeInsertedPluginName(name: string): boolean {
  return name.startsWith('./')
    || name.startsWith('../')
    || (process.platform === 'win32' && (name.startsWith('.\\') || name.startsWith('..\\')))
}

function assertEntryRelativePaths(
  node: unknown,
  document: ParsedYamlDocument,
  sourcePath: string,
  visited: Set<unknown>,
): void {
  const entry = resolveYamlAlias(node, document)
  if (!isMap(entry) || visited.has(entry)) return
  visited.add(entry)
  const nameNode = resolveYamlAlias(yamlMapField(entry, 'name', document), document)
  if (isScalar(nameNode) && typeof nameNode.value === 'string'
    && isRelativeInsertedPluginName(nameNode.value)
    && relativePathCrossesFilesystemRoot(dirname(sourcePath), nameNode.value)) {
    throw new Error(`relative inserted plugin path crosses its filesystem root: ${JSON.stringify(nameNode.value)}`)
  }
  const group = yamlMapField(entry, 'group', document)
  const config = resolveYamlAlias(yamlMapField(entry, 'config', document), document)
  if (yamlTruthy(group, document) && isSeq(config)) {
    for (const child of config.items) assertEntryRelativePaths(child, document, sourcePath, visited)
  }
}

/** Inspect only inserted plugin-name structure; tags and expressions remain inert. */
function assertRelativePluginPathsStayOnVolume(document: DshSourceDocument): void {
  if (!document.exists) return
  const parsed = parseDocument(document.text, {
    keepSourceTokens: true,
    prettyErrors: false,
    uniqueKeys: false,
  })
  if (parsed.errors.length > 0) {
    throw new Error(`failed to inspect relative plugin paths in DSH patch ${document.uri}`)
  }
  const patches = resolveYamlAlias(parsed.contents, parsed)
  if (!isSeq(patches)) return
  for (const patch of patches.items) {
    const insert = resolveYamlAlias(yamlMapField(patch, 'insert', parsed), parsed)
    if (!isSeq(insert)) continue
    const visited = new Set<unknown>()
    for (const entry of insert.items) assertEntryRelativePaths(entry, parsed, document.path, visited)
  }
}

async function assertBundlesBelongToInstallation(
  installation: DshInstallation,
  sources: DshProfileSources,
  layers: readonly DshSourceLayer[],
): Promise<readonly ResolvedBundleRoot[]> {
  const bundleLayers = layers.filter(layer => layer.owner === 'bundle')
  const resolved: ResolvedBundleRoot[] = []
  for (const [index, packageName] of sources.bundleNames.entries()) {
    const layer = bundleLayers[index]
    if (layer?.manifest === undefined) {
      throw new Error(`DSH bundle source layer is missing its manifest: ${JSON.stringify(packageName)}`)
    }
    const [resolvedRoot, sourceRoot] = await Promise.all([
      resolveBundleRoot(packageName, installation, sources.manifest.path),
      realpath(dirname(layer.manifest.path)),
    ])
    if (canonicalPathKey(resolvedRoot.canonicalRoot) !== canonicalPathKey(sourceRoot)) {
      throw new Error(
        `DSH profile bundle ${JSON.stringify(packageName)} resolves to a different package root than its source snapshot`,
      )
    }
    resolved.push({ packageName, ...resolvedRoot })
  }
  return resolved
}

async function linkBundleRoots(
  projection: SourcePathProjection,
  roots: readonly ResolvedBundleRoot[],
): Promise<void> {
  const linked = new Map<string, string>()
  for (const root of roots) {
    // Installation-first bundles remain resolved directly from the selected
    // installation. Only the profile-side fallback needs a projected link.
    if (root.origin === 'installation') continue
    const link = projectedPath(projection, root.lexicalRoot)
    const key = canonicalPathKey(link)
    const previous = linked.get(key)
    if (previous !== undefined) {
      if (canonicalPathKey(previous) !== canonicalPathKey(root.canonicalRoot)) {
        throw new Error(`conflicting projected DSH bundle root: ${JSON.stringify(root.packageName)}`)
      }
      continue
    }
    await mkdir(dirname(link), { recursive: true })
    await symlink(root.canonicalRoot, link, process.platform === 'win32' ? 'junction' : 'dir')
    linked.set(key, root.canonicalRoot)
  }
}

async function stageOptionalPatch(
  document: DshSourceDocument,
  destination: string,
  kind: StagedSourceExpectation['kind'],
): Promise<StagedSourceExpectation> {
  if (document.exists) {
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, document.rawBytes)
  }
  return {
    path: destination,
    sourceUri: document.uri,
    kind,
    ...(document.exists ? { expectedBytes: new Uint8Array(document.rawBytes) } : {}),
  }
}

async function assertExpectation(expectation: StagedSourceExpectation): Promise<void> {
  const mutation = await sourceMutation(expectation)
  if (mutation === undefined) return
  if (expectation.kind === 'profile-manifest') {
    throw new DshProfileMigrationRequiredError(expectation.sourceUri)
  }
  throw new DshStagedSourceMutationError(expectation.sourceUri, mutation)
}

function realSourceExpectations(sources: DshProfileSources): readonly StagedSourceExpectation[] {
  const expectations: StagedSourceExpectation[] = [{
    path: sources.manifest.path,
    sourceUri: sources.manifest.uri,
    kind: 'profile-manifest',
    expectedBytes: new Uint8Array(sources.manifest.rawBytes),
  }]
  for (const layer of sources.layers) {
    if (layer.manifest !== undefined) {
      expectations.push({
        path: layer.manifest.path,
        sourceUri: layer.manifest.uri,
        kind: 'profile-manifest',
        expectedBytes: new Uint8Array(layer.manifest.rawBytes),
      })
    }
    expectations.push({
      path: layer.patch.path,
      sourceUri: layer.patch.uri,
      kind: layer.owner === 'profile'
        ? 'profile-patch'
        : layer.owner === 'home'
          ? 'home-patch'
          : 'explicit-patch',
      ...(layer.patch.exists ? { expectedBytes: new Uint8Array(layer.patch.rawBytes) } : {}),
    })
  }
  const unique = new Map<string, StagedSourceExpectation>()
  for (const expectation of expectations) {
    const previous = unique.get(expectation.sourceUri)
    if (previous !== undefined) {
      const sameExpectation = previous.path === expectation.path
        && (previous.expectedBytes === undefined && expectation.expectedBytes === undefined
          || previous.expectedBytes !== undefined
            && expectation.expectedBytes !== undefined
            && bytesEqual(previous.expectedBytes, expectation.expectedBytes))
      if (!sameExpectation) throw new Error(`conflicting duplicate DSH source URI: ${expectation.sourceUri}`)
      continue
    }
    unique.set(expectation.sourceUri, expectation)
  }
  return [...unique.values()]
}

async function sourceMutation(expectation: StagedSourceExpectation): Promise<DshStagedSourceMutation | undefined> {
  const exists = await pathExists(expectation.path)
  if (expectation.expectedBytes === undefined) return exists ? 'created' : undefined
  if (!exists) return 'removed'
  try {
    const current = new Uint8Array(await readFile(expectation.path))
    return bytesEqual(current, expectation.expectedBytes) ? undefined : 'modified'
  } catch {
    return 'modified'
  }
}

async function assertRealSourcesUnchanged(expectations: readonly StagedSourceExpectation[]): Promise<void> {
  for (const expectation of expectations) {
    const mutation = await sourceMutation(expectation)
    if (mutation !== undefined) {
      throw new DshProfileSourceChangedError(expectation.sourceUri, mutation)
    }
  }
}

/**
 * Ask official DSH to compose an already-read profile snapshot without granting
 * it write access to the selected real DSH_HOME. Source paths keep their
 * within-volume topology under an owned mirror so current official DSH anchors
 * relative inserted plugins correctly; its serialized output is changed only
 * by deterministically restoring that random projection prefix. Profile-side
 * bundle roots remain linked to preserve official package/dependency resolution,
 * so this is not a read-only sandbox around the installation; every declared
 * bundle file in the snapshot is byte-checked after the command. The owned
 * projection is then deleted.
 */
export async function dumpDshConfigFromProfileSources(
  options: DumpDshConfigFromProfileSourcesOptions,
): Promise<DumpDshConfigFromProfileSourcesResult> {
  assertSafeProfileName(options.sources.profile)
  assertSafeBundleNames(options.sources)
  const layers = orderedLayers(options.sources)
  assertCoherentBundleLayers(options.sources, layers)
  const bundleRoots = await assertBundlesBelongToInstallation(options.installation, options.sources, layers)
  const realExpectations = realSourceExpectations(options.sources)
  await assertRealSourcesUnchanged(realExpectations)
  const overrides = resolveOverrideBytes(layers, options.overrides ?? [])
  const sources = applyOverrides(options.sources, overrides)
  const effectiveLayers = orderedLayers(sources)
  for (const layer of effectiveLayers) assertRelativePluginPathsStayOnVolume(layer.patch)
  const profileLayer = onlyLayer(effectiveLayers, 'profile')
  const homeLayer = onlyLayer(effectiveLayers, 'home')
  const explicitLayers = effectiveLayers.filter(layer => layer.owner === 'explicit')
  const selectedHome = realDshHome(sources, profileLayer, homeLayer)
  const temporaryPrefix = join(tmpdir(), 'dsh-graph-control-compose-')
  const ownedRoot = await mkdtemp(temporaryPrefix)

  try {
    const projection = createSourcePathProjection(join(ownedRoot, 'projection'))
    const stagedHome = projectedPath(projection, selectedHome)
    const stagedProfileDir = projectedPath(projection, sources.profileDir)
    if (!samePath(stagedProfileDir, join(stagedHome, 'profiles', sources.profile))) {
      throw new Error('projected DSH profile layout is incoherent')
    }
    await mkdir(stagedProfileDir, { recursive: true })
    const stagedManifestPath = projectedPath(projection, sources.manifest.path)
    await writeFile(stagedManifestPath, sources.manifest.rawBytes)

    const expectations: StagedSourceExpectation[] = [{
      path: stagedManifestPath,
      sourceUri: sources.manifest.uri,
      kind: 'profile-manifest',
      expectedBytes: new Uint8Array(sources.manifest.rawBytes),
    }]
    expectations.push(await stageOptionalPatch(
      profileLayer.patch,
      projectedPath(projection, profileLayer.patch.path),
      'profile-patch',
    ))
    expectations.push(await stageOptionalPatch(
      homeLayer.patch,
      projectedPath(projection, homeLayer.patch.path),
      'home-patch',
    ))

    const explicitPaths: string[] = []
    for (const layer of explicitLayers) {
      if (!layer.patch.exists) {
        throw new Error(`explicit DSH patch source is missing: ${layer.patch.uri}`)
      }
      const destination = projectedPath(projection, layer.patch.path)
      expectations.push(await stageOptionalPatch(layer.patch, destination, 'explicit-patch'))
      explicitPaths.push(destination)
    }

    await linkBundleRoots(projection, bundleRoots)

    let commandResult: DshCommandResult | undefined
    let commandFailure: unknown
    try {
      commandResult = await dumpDshConfig({
        installation: options.installation,
        profile: sources.profile,
        mode: 'resolved',
        cwd: options.cwd,
        dshHome: stagedHome,
        patches: explicitPaths,
        ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
      })
    } catch (cause) {
      commandFailure = restoredCommandFailure(cause, projection, ownedRoot)
    }

    await assertRealSourcesUnchanged(realExpectations)
    for (const expectation of expectations) await assertExpectation(expectation)
    if (commandFailure !== undefined) throw commandFailure
    if (commandResult === undefined) throw new Error('official DSH composition returned no result')
    const restored = restoredCommandResult(commandResult, projection, ownedRoot)
    return {
      ...restored,
      sources,
    }
  } finally {
    await rm(ownedRoot, { recursive: true, force: true, maxRetries: 2, retryDelay: 20 })
  }
}
