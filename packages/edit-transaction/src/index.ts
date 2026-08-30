import { mkdtemp, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export type EditTransactionState =
  | 'planned'
  | 'staged'
  | 'validated'
  | 'committed'
  | 'aborted'

export interface DocumentPrecondition {
  uri: string
  /** Exact in-memory snapshot captured when the plan was created; never log it. */
  expectedBytes: Uint8Array
}

export interface EditPlan {
  id: string
  state: EditTransactionState
  precondition: DocumentPrecondition
  targetUri: string
  summary: string
  candidateBytes: Uint8Array
  textChange: TextChange
  textChanges: readonly TextChange[]
  semanticChange: Readonly<Record<string, unknown>>
}

export interface TextChange {
  startOffset: number
  endOffset: number
  beforeText: string
  afterText: string
}

export interface CreateEditPlanOptions {
  id: string
  targetUri: string
  expectedBytes: Uint8Array
  candidateBytes: Uint8Array
  summary: string
  textChange: EditPlan['textChange']
  textChanges?: readonly TextChange[]
  semanticChange: EditPlan['semanticChange']
}

export interface CommittedEdit<T extends EditPlan = EditPlan> {
  plan: Omit<T, 'state'> & { state: 'committed' }
  stagingDirectory: string
  backupPath: string
}

export interface CommitValidatedEditOptions {
  /**
   * Re-check any non-target source preconditions after staging and immediately
   * before replacement. The callback must be read-only and fail closed.
   */
  assertCanReplace?: () => Promise<void>
}

export class CommitVerificationError extends Error {
  readonly backupPath: string

  constructor(message: string, backupPath: string) {
    super(message)
    this.name = 'CommitVerificationError'
    this.backupPath = backupPath
  }
}

export class StaleSourceError extends Error {
  constructor(uri: string) {
    super(`source changed after the edit was planned: ${uri}`)
    this.name = 'StaleSourceError'
  }
}

function isMissingOrNonFileSource(cause: unknown): boolean {
  if (cause === null || typeof cause !== 'object' || !('code' in cause)) return false
  return cause.code === 'ENOENT' || cause.code === 'ENOTDIR' || cause.code === 'EISDIR'
}

async function readSourceForComparison(targetPath: string, targetUri: string): Promise<Buffer> {
  try {
    return await readFile(targetPath)
  } catch (cause) {
    if (isMissingOrNonFileSource(cause)) throw new StaleSourceError(targetUri)
    throw cause
  }
}

async function sourceModeForCommit(targetPath: string, targetUri: string): Promise<number> {
  try {
    const source = await stat(targetPath)
    if (!source.isFile()) throw new StaleSourceError(targetUri)
    return source.mode
  } catch (cause) {
    if (cause instanceof StaleSourceError || isMissingOrNonFileSource(cause)) {
      throw new StaleSourceError(targetUri)
    }
    throw cause
  }
}

export function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false
  }
  return true
}

/** Create a disposable in-memory plan. Source and candidate bytes must never be logged. */
export function createEditPlan(options: CreateEditPlanOptions): EditPlan {
  return {
    id: options.id,
    state: 'planned',
    precondition: {
      uri: options.targetUri,
      expectedBytes: new Uint8Array(options.expectedBytes),
    },
    targetUri: options.targetUri,
    summary: options.summary,
    candidateBytes: new Uint8Array(options.candidateBytes),
    textChange: { ...options.textChange },
    textChanges: (options.textChanges ?? [options.textChange]).map(change => ({ ...change })),
    semanticChange: { ...options.semanticChange },
  }
}

async function syncFile(path: string): Promise<void> {
  // Windows requires a writable handle for FlushFileBuffers/fsync.
  const handle = await open(path, 'r+')
  try {
    await handle.sync()
  } finally {
    await handle.close()
  }
}

function assertOwnedStagingDirectory(targetPath: string, stagingDirectory: string): void {
  if (dirname(stagingDirectory) !== dirname(targetPath)
    || !basename(stagingDirectory).startsWith('.dsh-graph-control-commit-')) {
    throw new Error(`refusing to manage unexpected staging directory: ${stagingDirectory}`)
  }
}

/**
 * Atomically replace a validated target while retaining a same-directory
 * original-byte backup until reimport succeeds. No delete-and-retry fallback
 * is used: a platform rename failure leaves the original untouched.
 */
export async function commitValidatedEdit<T extends EditPlan & { state: 'validated' }>(
  plan: T,
  options: CommitValidatedEditOptions = {},
): Promise<CommittedEdit<T>> {
  const targetPath = fileURLToPath(plan.targetUri)
  const current = await readSourceForComparison(targetPath, plan.targetUri)
  if (!bytesEqual(current, plan.precondition.expectedBytes)) throw new StaleSourceError(plan.targetUri)

  const targetMode = await sourceModeForCommit(targetPath, plan.targetUri)
  const stagingDirectory = await mkdtemp(join(dirname(targetPath), '.dsh-graph-control-commit-'))
  assertOwnedStagingDirectory(targetPath, stagingDirectory)
  const candidatePath = join(stagingDirectory, 'candidate')
  const backupPath = join(stagingDirectory, 'original.backup')
  let replaced = false
  try {
    await writeFile(backupPath, plan.precondition.expectedBytes, { flag: 'wx', mode: targetMode })
    await writeFile(candidatePath, plan.candidateBytes, { flag: 'wx', mode: targetMode })
    await Promise.all([syncFile(backupPath), syncFile(candidatePath)])

    const immediatelyBeforeCommit = await readSourceForComparison(targetPath, plan.targetUri)
    if (!bytesEqual(immediatelyBeforeCommit, plan.precondition.expectedBytes)) {
      throw new StaleSourceError(plan.targetUri)
    }
    await options.assertCanReplace?.()
    await rename(candidatePath, targetPath)
    replaced = true
    const committedBytes = await readFile(targetPath)
    if (!bytesEqual(committedBytes, plan.candidateBytes)) {
      throw new CommitVerificationError('committed target does not match the validated candidate', backupPath)
    }
    return {
      plan: { ...plan, state: 'committed' },
      stagingDirectory,
      backupPath,
    }
  } catch (cause) {
    if (!replaced) await rm(stagingDirectory, { recursive: true, force: true })
    throw cause
  }
}

/** Remove the recovery backup only after the caller verifies official reimport. */
export async function finalizeCommittedEdit(committed: CommittedEdit): Promise<void> {
  const targetPath = fileURLToPath(committed.plan.targetUri)
  assertOwnedStagingDirectory(targetPath, committed.stagingDirectory)
  await rm(committed.stagingDirectory, { recursive: true, force: true })
}

/** Restore the original only when the target still equals this transaction's candidate. */
export async function restoreCommittedEdit(committed: CommittedEdit): Promise<void> {
  const targetPath = fileURLToPath(committed.plan.targetUri)
  assertOwnedStagingDirectory(targetPath, committed.stagingDirectory)
  const current = await readSourceForComparison(targetPath, committed.plan.targetUri)
  if (!bytesEqual(current, committed.plan.candidateBytes)) throw new StaleSourceError(committed.plan.targetUri)
  await rename(committed.backupPath, targetPath)
  const restored = await readFile(targetPath)
  if (!bytesEqual(restored, committed.plan.precondition.expectedBytes)) {
    throw new CommitVerificationError('restored target does not match the original bytes', committed.backupPath)
  }
  await rm(committed.stagingDirectory, { recursive: true, force: true })
}
