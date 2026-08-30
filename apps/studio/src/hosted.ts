#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { discoverBuiltDshCheckout } from '@dsh-graph-control/dsh-adapter'
import { stringify } from 'yaml'
import {
  canonicalLocalDirectory,
  discoverBoundedLocalDshProfiles,
} from './harness-context-transition.ts'
import { parseStudioArguments } from './index.ts'

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))
const CONTROLLED_SHUTDOWN_MESSAGE = 'dsh-graph-control:shutdown'

const HELP = `DSH GraphControl on the official DSH Web host

Usage:
  pnpm studio:official -- --dsh-home <path> [Studio options]

The official DSH root and /harness-studio/ run on one loopback origin. The
generated startup overlay is temporary and never changes the selected profile.
`

async function run(argv: readonly string[]): Promise<void> {
  const args = parseStudioArguments(argv)
  if (args === 'help') {
    process.stdout.write(HELP)
    return
  }
  const installation = await discoverBuiltDshCheckout(args.upstream, args.node)
  const dshHomeDirectory = await canonicalLocalDirectory(args.dshHome)
  const selectedDshHome = dshHomeDirectory.canonical

  const temporaryRoot = await mkdtemp(join(tmpdir(), 'dsh-graph-control-hosted-'))
  try {
    const overlayPath = join(temporaryRoot, 'graphcontrol.patch.yml')
    const hostPluginUrl = pathToFileURL(resolve(workspaceRoot, 'apps', 'studio', 'src', 'host-plugin.ts')).href
    const launchPatches = [...args.patches, overlayPath]
    await writeFile(overlayPath, stringify([{
      insert: [{
        id: 'dsh-graph-control-studio',
        name: hostPluginUrl,
        config: {
          profile: args.profile,
          dshHome: selectedDshHome,
          upstream: args.upstream,
          node: args.node,
          cwd: process.cwd(),
          // The temporary control-plane mount is not part of the Harness the
          // user is inspecting or editing. Real user overlays remain visible.
          patches: args.patches,
          basePath: '/harness-studio',
        },
      }],
    }]), 'utf8')

    const profiles = await discoverBoundedLocalDshProfiles(selectedDshHome)
    const selectedProfile = profiles.find(profile => profile.name === args.profile)
    if (selectedProfile?.patchExists !== true) {
      throw new Error(
        `profile ${JSON.stringify(args.profile)} is not initialized; open standalone Studio and Preview the official initialization before Apply`,
      )
    }
    const childArgs = [installation.cliEntry, '--profile', args.profile]
    for (const patch of launchPatches) childArgs.push('--patch', patch)
    childArgs.push('--no-open', '--port', String(args.port))
    const child = spawn(installation.nodeExecutable, childArgs, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DSH_HOME: selectedDshHome,
        DSH_TELEMETRY_DISABLED: '1',
      },
      shell: false,
      stdio: 'inherit',
      windowsHide: true,
    })
    const stop = (): void => { child.kill() }
    const stopFromController = (message: unknown): void => {
      if (message === CONTROLLED_SHUTDOWN_MESSAGE) stop()
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
    process.on('message', stopFromController)
    try {
      const exitCode = await new Promise<number>((resolvePromise, rejectPromise) => {
        child.once('error', rejectPromise)
        child.once('close', code => resolvePromise(code ?? 1))
      })
      if (exitCode !== 0) process.exitCode = exitCode
    } finally {
      process.off('SIGINT', stop)
      process.off('SIGTERM', stop)
      process.off('message', stopFromController)
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}

try {
  await run(process.argv.slice(2))
} catch (cause) {
  process.stderr.write(`DSH GraphControl official-host launch failed: ${cause instanceof Error ? cause.message : String(cause)}\n`)
  process.exitCode = 1
}
