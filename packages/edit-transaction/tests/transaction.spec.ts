import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  commitValidatedEdit,
  createEditPlan,
  finalizeCommittedEdit,
  StaleSourceError,
} from '../src/index.js'

const temporaryDirectories: string[] = []

async function fixture(): Promise<{ directory: string; target: string; original: Uint8Array; candidate: Uint8Array }> {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-graph-control-transaction-'))
  temporaryDirectories.push(directory)
  const target = join(directory, 'cordis.patch.yml')
  const original = new TextEncoder().encode('- id: target\n  disabled: false # keep\n')
  const candidate = new TextEncoder().encode('- id: target\n  disabled: true # keep\n')
  await writeFile(target, original)
  return { directory, target, original, candidate }
}

function validatedPlan(target: string, original: Uint8Array, candidate: Uint8Array) {
  return {
    ...createEditPlan({
      id: 'fixture-plan',
      targetUri: pathToFileURL(target).href,
      expectedBytes: original,
      candidateBytes: candidate,
      summary: 'set target.disabled',
      textChange: { startOffset: 25, endOffset: 30, beforeText: 'false', afterText: 'true' },
      semanticChange: { entryId: 'target', path: ['disabled'], nextValue: true },
    }),
    state: 'validated' as const,
  }
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(async directory => {
    await rm(directory, { recursive: true, force: true })
  }))
})

describe('edit transaction commit', () => {
  it('atomically replaces a validated target and retains recovery until finalized', async () => {
    const { target, original, candidate } = await fixture()
    const committed = await commitValidatedEdit(validatedPlan(target, original, candidate))

    expect(await readFile(target)).toEqual(Buffer.from(candidate))
    expect(await readFile(committed.backupPath)).toEqual(Buffer.from(original))
    await finalizeCommittedEdit(committed)
    await expect(access(committed.backupPath)).rejects.toThrow()
  })

  it('refuses to overwrite a manual change made after planning', async () => {
    const { target, original, candidate } = await fixture()
    const manual = '- id: target\n  disabled: manual\n'
    await writeFile(target, manual)

    await expect(commitValidatedEdit(validatedPlan(target, original, candidate)))
      .rejects.toBeInstanceOf(StaleSourceError)
    expect(await readFile(target, 'utf8')).toBe(manual)
  })
})
