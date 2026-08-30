import { isAbsolute } from 'node:path'
import { discoverBuiltDshCheckout } from '@dsh-graph-control/dsh-adapter'
import { createStudioRuntime } from './index.ts'
import { createStudioRequestHandler } from './server.ts'

export const name = 'dsh-graph-control-studio'
export const inject = ['webServer', 'connection']

export interface HostedStudioConfig {
  profile: string
  dshHome: string
  upstream: string
  node: string
  cwd: string
  patches?: string[]
  basePath?: string
}

interface HostedWebServer {
  host: '127.0.0.1' | '0.0.0.0'
  port: number
  register(route: {
    kind: 'prefix'
    path: string
    handler: Awaited<ReturnType<typeof createStudioRequestHandler>>
  }): () => void
}

interface HostedStudioContext {
  webServer: HostedWebServer
  connection?: {
    requestRejection?: (
      request: Parameters<Awaited<ReturnType<typeof createStudioRequestHandler>>>[0],
    ) => 401 | 403 | undefined
  }
  effect(setup: () => () => void, label?: string): unknown
}

type HostedRequestRejection = NonNullable<HostedStudioContext['connection']>['requestRejection']

/** Reuse the current official Web connection's browser-authentication decision. */
export function resolveOfficialRequestRejection(
  officialDshVersion: string,
  connection: HostedStudioContext['connection'],
): HostedRequestRejection {
  if (typeof connection?.requestRejection === 'function') {
    return connection.requestRejection.bind(connection)
  }
  throw new Error(
    `GraphControl refuses to mount Studio because official DSH ${JSON.stringify(officialDshVersion)} `
    + 'does not expose connection.requestRejection',
  )
}

function requiredAbsolutePath(value: unknown, field: string): string {
  if (typeof value !== 'string' || value === '' || !isAbsolute(value)) {
    throw new Error(`GraphControl ${field} must be an absolute path`)
  }
  return value
}

function routePath(value: unknown): string {
  const path = value === undefined ? '/harness-studio' : value
  if (typeof path !== 'string' || !path.startsWith('/') || path === '/' || path.endsWith('/')) {
    throw new Error('GraphControl basePath must be an absolute non-root pathname without a trailing slash')
  }
  return path
}

/** Mount the existing Studio runtime on the official DSH HTTP carrier. */
export async function apply(ctx: HostedStudioContext, config: HostedStudioConfig): Promise<void> {
  if (ctx.webServer.host !== '127.0.0.1') {
    throw new Error('GraphControl refuses to mount on a non-loopback official DSH Web host')
  }
  if (typeof config?.profile !== 'string' || config.profile === '') {
    throw new Error('GraphControl profile must be a non-empty string')
  }
  const dshHome = requiredAbsolutePath(config.dshHome, 'dshHome')
  const upstream = requiredAbsolutePath(config.upstream, 'upstream')
  const node = requiredAbsolutePath(config.node, 'node')
  const cwd = requiredAbsolutePath(config.cwd, 'cwd')
  const patches = config.patches ?? []
  if (!Array.isArray(patches) || patches.some(path => typeof path !== 'string' || !isAbsolute(path))) {
    throw new Error('GraphControl patches must contain only absolute paths')
  }
  const basePath = routePath(config.basePath)
  const installation = await discoverBuiltDshCheckout(upstream, node)
  const runtime = await createStudioRuntime(installation, {
    profile: config.profile,
    dshHome,
    cwd,
    patches,
  })
  const requestRejection = resolveOfficialRequestRejection(
    runtime.inspection.installation.version,
    ctx.connection,
  )
  const handler = await createStudioRequestHandler(runtime.inspection, runtime.handlers, { basePath })
  const authenticatedHandler: typeof handler = (request, response) => {
    const rejection = requestRejection?.(request)
    if (rejection !== undefined) {
      response.writeHead(rejection)
      response.end(rejection === 401 ? 'unauthorized' : 'forbidden')
      return
    }
    handler(request, response)
  }
  ctx.effect(
    () => ctx.webServer.register({ kind: 'prefix', path: basePath, handler: authenticatedHandler }),
    `dsh-graph-control: ${basePath} route`,
  )
  process.stdout.write(`dsh graphcontrol: http://127.0.0.1:${ctx.webServer.port}${basePath}/\n`)
}
