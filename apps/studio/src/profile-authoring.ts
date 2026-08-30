import type { DshProfileSources, ExistingDshSourceDocument } from '@dsh-graph-control/dsh-adapter'

export type ProfileAuthoringReadOnlyReason =
  | 'profile-patch-unavailable'
  | 'higher-precedence-layer-active'

export type ProfileAuthoringBoundary =
  | {
      state: 'writable'
      target: 'profile-patch'
    }
  | {
      state: 'read-only'
      reason: ProfileAuthoringReadOnlyReason
    }

export interface ProfileAuthoringReadOnlyError {
  code: 'PROFILE_AUTHORING_READ_ONLY'
  reason: ProfileAuthoringReadOnlyReason
  writePerformed: false
}

export function inspectProfileAuthoringBoundary(
  sources: DshProfileSources,
): ProfileAuthoringBoundary {
  const profileIndex = sources.layers.findIndex(layer => layer.owner === 'profile')
  const profilePatch = profileIndex === -1 ? undefined : sources.layers[profileIndex]?.patch
  if (profilePatch?.exists !== true || !profilePatch.writable) {
    return { state: 'read-only', reason: 'profile-patch-unavailable' }
  }
  if (sources.layers.slice(profileIndex + 1).some(layer =>
    (layer.owner === 'home' || layer.owner === 'explicit') && layer.patch.exists)) {
    return { state: 'read-only', reason: 'higher-precedence-layer-active' }
  }
  return { state: 'writable', target: 'profile-patch' }
}

export function writableProfilePatch(
  sources: DshProfileSources,
  boundary = inspectProfileAuthoringBoundary(sources),
): ExistingDshSourceDocument | undefined {
  if (boundary.state !== 'writable') return undefined
  const patch = sources.layers.find(layer => layer.owner === 'profile')?.patch
  return patch?.exists === true && patch.writable ? patch : undefined
}

export function profileAuthoringReadOnlyError(
  reason: ProfileAuthoringReadOnlyReason,
): ProfileAuthoringReadOnlyError {
  return {
    code: 'PROFILE_AUTHORING_READ_ONLY',
    reason,
    writePerformed: false,
  }
}
