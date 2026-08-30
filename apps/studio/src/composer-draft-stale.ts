export type ComposerDraftStaleRecovery = 'replanned' | 'replan-failed'

/** Stable machine-readable payload returned when compare-before-write detects drift. */
export interface ComposerDraftStaleError {
  code: 'COMPOSER_DRAFT_STALE'
  reason: 'source-changed'
  recovery: ComposerDraftStaleRecovery
  writePerformed: false
}

export function composerDraftStaleError(
  recovery: ComposerDraftStaleRecovery,
): ComposerDraftStaleError {
  return {
    code: 'COMPOSER_DRAFT_STALE',
    reason: 'source-changed',
    recovery,
    writePerformed: false,
  }
}
