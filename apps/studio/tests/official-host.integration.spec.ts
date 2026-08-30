import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  discoverBuiltDshCheckout,
  dumpDshConfig,
  type DshInstallation,
} from '@dsh-graph-control/dsh-adapter'

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))
const checkout = process.env.DSH_GRAPH_CONTROL_UPSTREAM
  ?? join(workspaceRoot, '.upstream', 'deepseek-harness')
const nodeExecutable = process.env.DSH_GRAPH_CONTROL_NODE
  ?? join(workspaceRoot, '.tools', 'node-v24.19.0-win-x64', 'node.exe')
const launcher = fileURLToPath(new URL('../src/hosted.ts', import.meta.url))
const integrationAvailable = existsSync(checkout) && existsSync(nodeExecutable)
const CONTROLLED_SHUTDOWN_MESSAGE = 'dsh-graph-control:shutdown'

interface HostedUrls {
  launchUrl: string
  studioUrl: string
}

function sanitizeHostedOutput(value: string): string {
  return value.replace(/([?&]token=)[^\s&#)]+/giu, '$1<redacted>')
}

function environmentWithoutNodeOptions(source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(source)
    .filter(([key]) => key.toUpperCase() !== 'NODE_OPTIONS'))
}

function waitForHostedUrls(child: ChildProcess): Promise<HostedUrls> {
  const stdout = child.stdout
  const stderr = child.stderr
  if (stdout === null || stderr === null) {
    throw new Error('official-hosted Studio must expose stdout and stderr')
  }
  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false
    let output = ''
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      rejectPromise(new Error(`official-hosted Studio did not become ready:\n${sanitizeHostedOutput(output)}`))
    }, 60_000)
    const capture = (chunk: Buffer): void => {
      output = (output + chunk.toString('utf8')).slice(-256 * 1024)
      const launchMatch = output.match(/dsh web: (http:\/\/[^\s]+)/u)
      const studioMatch = output.match(/dsh graphcontrol: (http:\/\/127\.0\.0\.1:\d+\/harness-studio\/)/u)
      if (launchMatch?.[1] === undefined || studioMatch?.[1] === undefined || settled) return
      settled = true
      clearTimeout(timer)
      resolvePromise({ launchUrl: launchMatch[1], studioUrl: studioMatch[1] })
    }
    stdout.on('data', capture)
    stderr.on('data', capture)
    child.once('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      rejectPromise(new Error(`official-hosted Studio exited with ${String(code)}:\n${sanitizeHostedOutput(output)}`))
    })
  })
}

async function exchangeBrowserSession(launchUrl: string): Promise<string> {
  expect(new URL(launchUrl).searchParams.has('token')).toBe(true)
  const exchange = await fetch(launchUrl, { redirect: 'manual' })
  expect(exchange.status).toBe(303)
  expect(exchange.headers.get('location')).toBe('/')
  const setCookie = exchange.headers.get('set-cookie')
  expect(setCookie).not.toBeNull()
  const cookie = setCookie?.split(';', 1)[0]
  if (cookie === undefined || cookie === '') throw new Error('official DSH did not issue a browser session cookie')
  return cookie
}

async function stop(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return
  const closed = new Promise<void>(resolvePromise => child.once('close', () => resolvePromise()))
  if (child.connected) {
    try {
      child.send(CONTROLLED_SHUTDOWN_MESSAGE)
    } catch {
      // Fall through to process-tree termination below.
    }
  }
  const stoppedGracefully = await Promise.race([
    closed.then(() => true),
    new Promise<boolean>(resolvePromise => setTimeout(() => resolvePromise(false), 15_000)),
  ])
  if (stoppedGracefully) return
  if (process.platform === 'win32' && child.pid !== undefined) {
    const killer = spawn('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {
      shell: false,
      stdio: 'ignore',
      windowsHide: true,
    })
    await new Promise<void>(resolvePromise => killer.once('close', () => resolvePromise()))
  } else child.kill('SIGKILL')
  await Promise.race([
    closed,
    new Promise<never>((_, rejectPromise) => setTimeout(
      () => rejectPromise(new Error('official-hosted Studio did not stop')),
      15_000,
    )),
  ])
}

describe.skipIf(!integrationAvailable)('official DSH same-host Studio integration', () => {
  let installation: DshInstallation
  let isolatedHome: string

  beforeAll(async () => {
    installation = await discoverBuiltDshCheckout(checkout, nodeExecutable)
    isolatedHome = await mkdtemp(join(tmpdir(), 'dsh-graph-control-official-host-'))
    await dumpDshConfig({
      installation,
      profile: 'web',
      mode: 'default',
      cwd: workspaceRoot,
      dshHome: isolatedHome,
    })
  })

  afterAll(async () => {
    if (isolatedHome !== undefined) await rm(isolatedHome, { recursive: true, force: true })
  })

  it('refuses to let the official host initialize a missing profile', async () => {
    const missingHome = await mkdtemp(join(tmpdir(), 'dsh-graph-control-missing-profile-'))
    const child = spawn(process.execPath, [
      launcher,
      '--dsh-home', missingHome,
      '--upstream', checkout,
      '--node', nodeExecutable,
      '--port', '0',
    ], {
      cwd: workspaceRoot,
      env: environmentWithoutNodeOptions(),
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      windowsHide: true,
    })
    let output = ''
    child.stdout?.on('data', chunk => { output += String(chunk) })
    child.stderr?.on('data', chunk => { output += String(chunk) })
    try {
      const exitCode = await new Promise<number>((resolvePromise, rejectPromise) => {
        const timer = setTimeout(() => rejectPromise(new Error('missing-profile launch did not fail closed')), 15_000)
        child.once('error', rejectPromise)
        child.once('close', code => {
          clearTimeout(timer)
          resolvePromise(code ?? 1)
        })
      })
      expect(exitCode).not.toBe(0)
      expect(output).toContain('is not initialized')
      expect(existsSync(join(missingHome, 'profiles', 'web'))).toBe(false)
    } finally {
      await stop(child)
      await rm(missingHome, { recursive: true, force: true })
    }
  })

  it('serves official Web and a no-write Composer candidate on one loopback origin', async () => {
    expect(environmentWithoutNodeOptions({
      node_options: '--require malicious.cjs',
      NODE_OPTIONS: '--experimental-transform-types',
      SAFE_VALUE: 'preserved',
    })).toEqual({ SAFE_VALUE: 'preserved' })
    const targetPath = join(isolatedHome, 'profiles', 'web', 'cordis.patch.yml')
    const baseline = [
      '# Your patch layer for this dsh profile, applied after every bundle layer:',
      '# a top-level YAML array of loader patch entries (id-targeted config',
      '# overrides, disables, and insert lists; `!!js` expressions allowed).',
      '- id: timer # unrelated user declaration must survive provider replacement',
      '  disabled: false',
      '',
    ].join('\n')
    expect(Buffer.byteLength(baseline)).toBe(307)
    await writeFile(targetPath, baseline, 'utf8')

    const environment = environmentWithoutNodeOptions()
    environment.DSH_TELEMETRY_DISABLED = '1'
    const child = spawn(process.execPath, [
      launcher,
      '--dsh-home', isolatedHome,
      '--upstream', checkout,
      '--node', nodeExecutable,
      '--port', '0',
    ], {
      cwd: workspaceRoot,
      env: environment,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      windowsHide: true,
    })
    try {
      const { launchUrl, studioUrl } = await waitForHostedUrls(child)
      const origin = new URL(studioUrl).origin
      expect(new URL(launchUrl).origin).toBe(origin)
      const [anonymousStudioPage, anonymousStudioApi] = await Promise.all([
        fetch(studioUrl),
        fetch(new URL('api/inspection', studioUrl)),
      ])
      expect(anonymousStudioPage.status).toBe(401)
      expect(await anonymousStudioPage.text()).toBe('unauthorized')
      expect(anonymousStudioApi.status).toBe(401)
      expect(await anonymousStudioApi.text()).toBe('unauthorized')

      const cookie = await exchangeBrowserSession(launchUrl)
      const authenticatedHeaders = { cookie }
      const [officialRoot, studioPage, inspectionResponse, draftResponse] = await Promise.all([
        fetch(`${origin}/`, { headers: authenticatedHeaders }),
        fetch(studioUrl, { headers: authenticatedHeaders }),
        fetch(new URL('api/inspection', studioUrl), { headers: authenticatedHeaders }),
        fetch(new URL('api/composer-draft', studioUrl), { headers: authenticatedHeaders }),
      ])
      expect(officialRoot.status).toBe(200)
      expect((await officialRoot.text()).length).toBeGreaterThan(10_000)
      expect(studioPage.status).toBe(200)
      expect(await studioPage.text()).toContain('DSH GraphControl')
      const inspection = await inspectionResponse.json() as {
        profile: { name: string }
        counts: { nodes: number }
        nodes: { attributes: { entryId?: string } }[]
      }
      expect(inspection.profile.name).toBe('web')
      expect(inspection.counts.nodes).toBeGreaterThan(500)
      expect(inspection.nodes.some(node => node.attributes.entryId === 'dsh-graph-control-studio')).toBe(false)
      expect((await draftResponse.json() as { state: string }).state).toBe('empty')

      const forbidden = await fetch(studioUrl, {
        headers: { cookie, Origin: 'http://forbidden.invalid' },
      })
      expect(forbidden.status).toBe(403)
      expect(await forbidden.text()).toBe('forbidden')

      const candidateResponse = await fetch(new URL('api/composer-draft', studioUrl), {
        method: 'POST',
        headers: { ...authenticatedHeaders, 'Content-Type': 'application/json', Origin: origin },
        body: JSON.stringify({ action: 'add', actionId: 'scalar-disabled:true:timer' }),
      })
      const candidate = await candidateResponse.json() as {
        state: string
        canApply: boolean
        operations: unknown[]
        validation: { observations: unknown[] }
      }
      expect(candidateResponse.status).toBe(200)
      expect(candidate).toMatchObject({ state: 'validated', canApply: true })
      expect(candidate.operations).toHaveLength(1)
      expect(candidate.validation.observations).toHaveLength(1)
      expect(await readFile(targetPath, 'utf8')).toBe(baseline)

      const clearResponse = await fetch(new URL('api/composer-draft', studioUrl), {
        method: 'POST',
        headers: { ...authenticatedHeaders, 'Content-Type': 'application/json', Origin: origin },
        body: JSON.stringify({ action: 'clear' }),
      })
      expect((await clearResponse.json() as { state: string }).state).toBe('empty')
      expect(await readFile(targetPath, 'utf8')).toBe(baseline)
      expect((await readdir(join(isolatedHome, 'profiles', 'web')))
        .filter(name => name.startsWith('.dsh-graph-control-commit-'))).toEqual([])
    } finally {
      await stop(child)
    }
  }, 90_000)
})
