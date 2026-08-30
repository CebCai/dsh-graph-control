import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  buildProfileHarnessGraph,
  discoverBuiltDshCheckout,
  dumpDshConfig,
  inspectCurrentOfficialWebSpine,
  readProfileSources,
} from '../src/index.js'

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))
const checkout = process.env.DSH_GRAPH_CONTROL_UPSTREAM
  ?? join(workspaceRoot, '.upstream', 'deepseek-harness')
const bundledNode = join(workspaceRoot, '.tools', 'node-v24.19.0-win-x64', 'node.exe')
const nodeExecutable = process.env.DSH_GRAPH_CONTROL_NODE
  ?? (existsSync(bundledNode) ? bundledNode : process.execPath)
const available = existsSync(checkout) && existsSync(nodeExecutable)

describe.skipIf(!available)('current official DSH smoke', () => {
  it('composes the Web profile and exposes the supported graph spine', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-graph-control-smoke-'))
    try {
      const installation = await discoverBuiltDshCheckout(checkout, nodeExecutable)
      const resolved = await dumpDshConfig({
        installation,
        profile: 'web',
        mode: 'resolved',
        cwd: workspaceRoot,
        dshHome: home,
      })
      const sources = await readProfileSources({
        installation,
        profile: 'web',
        cwd: workspaceRoot,
        dshHome: home,
      })
      const projection = buildProfileHarnessGraph({
        installation,
        sources,
        config: { mode: 'resolved', text: resolved.stdout },
      })

      expect(projection.graph.nodes.length).toBeGreaterThan(0)
      expect(inspectCurrentOfficialWebSpine(projection.graph).status).toBe('available')
    } finally {
      await rm(home, { recursive: true, force: true })
    }
  })
})
