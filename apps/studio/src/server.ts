import { readFile } from 'node:fs/promises'
import {
  createServer,
  type IncomingMessage,
  type RequestListener,
  type Server,
  type ServerResponse,
} from 'node:http'
import { fileURLToPath } from 'node:url'
import type { StudioInspection } from './inspection.ts'
import { createStudioBrowserPublicView } from './browser-public-view.ts'
import { StudioHttpError } from './studio-http-error.ts'

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  // Bundled Cytoscape injects dynamic canvas sizing styles. Current Chrome
  // still checks that path against style-src rather than style-src-attr, so
  // styles alone permit inline generation; scripts, connections, and every
  // remote resource stay self-only.
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
} as const

interface StudioAssets {
  html: Buffer
  css: Buffer
  javascript: Buffer
  composerJavascript: Buffer
  cytoscapeJavascript: Buffer
  phosphorCss: Buffer
  phosphorFont: Buffer
}

export interface StudioServerHandlers {
  getInspection?: () => StudioInspection
  getComposerDraft?: () => unknown
  getHarnessContext?: () => Promise<unknown> | unknown
  getDeveloperDiagnostics?: (body: unknown) => Promise<unknown>
  checkHarnessContext?: (body: unknown) => Promise<unknown>
  openHarnessContext?: (body: unknown) => Promise<unknown>
  previewHarnessContextInitialization?: (body: unknown) => Promise<unknown>
  applyHarnessContextInitialization?: (body: unknown) => Promise<unknown>
  selectHarnessContext?: (body: unknown) => Promise<unknown>
  planScalar?: (body: unknown) => Promise<unknown>
  applyScalar?: (body: unknown) => Promise<unknown>
  planProviderReplacement?: (body: unknown) => Promise<unknown>
  applyProviderReplacement?: (body: unknown) => Promise<unknown>
  updateComposerDraft?: (body: unknown) => Promise<unknown>
  applyComposerDraft?: (body: unknown) => Promise<unknown>
}

export interface StudioRouteOptions {
  /** Empty for the fast standalone preview, or a named official-host prefix. */
  basePath?: string
}

async function readAssets(): Promise<StudioAssets> {
  const publicRoot = new URL('../public/', import.meta.url)
  const phosphorRoot = new URL('../node_modules/@phosphor-icons/web/src/regular/', import.meta.url)
  const cytoscapeRoot = new URL('../node_modules/cytoscape/dist/', import.meta.url)
  const [html, css, javascript, composerJavascript, cytoscapeJavascript, phosphorCss, phosphorFont] = await Promise.all([
    readFile(fileURLToPath(new URL('index.html', publicRoot))),
    readFile(fileURLToPath(new URL('styles.css', publicRoot))),
    readFile(fileURLToPath(new URL('app.js', publicRoot))),
    readFile(fileURLToPath(new URL('composer.js', publicRoot))),
    readFile(fileURLToPath(new URL('cytoscape.min.js', cytoscapeRoot))),
    readFile(fileURLToPath(new URL('style.css', phosphorRoot))),
    readFile(fileURLToPath(new URL('Phosphor.woff2', phosphorRoot))),
  ])
  return { html, css, javascript, composerJavascript, cytoscapeJavascript, phosphorCss, phosphorFont }
}

function send(
  response: ServerResponse,
  status: number,
  contentType: string,
  body: Buffer,
  headOnly: boolean,
): void {
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': contentType,
    'Content-Length': body.byteLength,
  })
  response.end(headOnly ? undefined : body)
}

function sendJson(response: ServerResponse, status: number, value: unknown, headOnly = false): void {
  send(
    response,
    status,
    'application/json; charset=utf-8',
    Buffer.from(JSON.stringify(value)),
    headOnly,
  )
}

function requestIsSameOrigin(request: IncomingMessage): boolean {
  const host = request.headers.host
  const origin = request.headers.origin
  if (host === undefined || origin === undefined) return false
  try {
    const parsed = new URL(origin)
    return parsed.protocol === 'http:'
      && parsed.host === host
      && (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')
  } catch {
    return false
  }
}

function normalizeBasePath(value: string | undefined): string {
  if (value === undefined || value === '' || value === '/') return ''
  if (!value.startsWith('/') || value.endsWith('/') || value.includes('?') || value.includes('#')) {
    throw new Error('Studio basePath must be one absolute pathname without a trailing slash')
  }
  return value
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const declaredLength = Number(request.headers['content-length'] ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > 16_384) {
    throw new Error('request body is too large')
  }
  const chunks: Buffer[] = []
  let length = 0
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    length += bytes.byteLength
    if (length > 16_384) throw new Error('request body is too large')
    chunks.push(bytes)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    throw new Error('request body must be valid JSON')
  }
}

/** Build the shared request surface used by standalone preview and official DSH hosting. */
export async function createStudioRequestHandler(
  inspection: StudioInspection,
  handlers: StudioServerHandlers = {},
  options: StudioRouteOptions = {},
): Promise<RequestListener> {
  const assets = await readAssets()
  const basePath = normalizeBasePath(options.basePath)
  return (request, response) => {
    const requestPathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
    if (basePath !== '' && requestPathname === basePath) {
      response.writeHead(308, { ...SECURITY_HEADERS, Location: `${basePath}/` })
      response.end()
      return
    }
    if (basePath !== '' && !requestPathname.startsWith(`${basePath}/`)) {
      send(response, 404, 'text/plain; charset=utf-8', Buffer.from('Not found\n'), false)
      return
    }
    const pathname = basePath === '' ? requestPathname : requestPathname.slice(basePath.length)
    const method = request.method ?? 'GET'
    const jsonPostHandler = pathname === '/api/plan-scalar'
      ? handlers.planScalar
      : pathname === '/api/apply-scalar'
      ? handlers.applyScalar
      : pathname === '/api/plan-provider-replacement'
      ? handlers.planProviderReplacement
      : pathname === '/api/apply-provider-replacement'
      ? handlers.applyProviderReplacement
      : pathname === '/api/composer-draft'
      ? handlers.updateComposerDraft
      : pathname === '/api/apply-composer-draft'
      ? handlers.applyComposerDraft
      : pathname === '/api/harness-context/check'
      ? handlers.checkHarnessContext
      : pathname === '/api/harness-context/open'
      ? handlers.openHarnessContext
      : pathname === '/api/harness-context/initialize/preview'
      ? handlers.previewHarnessContextInitialization
      : pathname === '/api/harness-context/initialize/apply'
      ? handlers.applyHarnessContextInitialization
      : pathname === '/api/harness-context/select'
      ? handlers.selectHarnessContext
      : pathname === '/api/developer-diagnostics'
      ? handlers.getDeveloperDiagnostics
      : undefined
    if (method === 'POST' && jsonPostHandler !== undefined) {
      if (!requestIsSameOrigin(request)) {
        sendJson(response, 403, { error: 'same-origin Studio request required' })
        return
      }
      if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
        sendJson(response, 415, { error: 'application/json request required' })
        return
      }
      void readJsonBody(request)
        .then(body => jsonPostHandler(body))
        .then(result => sendJson(
          response,
          200,
          pathname === '/api/developer-diagnostics'
            ? result
            : createStudioBrowserPublicView(result),
        ))
        .catch(cause => {
          if (cause instanceof StudioHttpError) {
            sendJson(response, cause.status, createStudioBrowserPublicView(cause.body))
            return
          }
          sendJson(response, 400, {
            error: createStudioBrowserPublicView(cause instanceof Error ? cause.message : String(cause)),
          })
        })
      return
    }
    if (method !== 'GET' && method !== 'HEAD') {
      response.writeHead(405, { ...SECURITY_HEADERS, Allow: 'GET, HEAD' })
      response.end()
      return
    }
    const headOnly = method === 'HEAD'
    if (pathname === '/') {
      send(response, 200, 'text/html; charset=utf-8', assets.html, headOnly)
      return
    }
    if (pathname === '/styles.css') {
      send(response, 200, 'text/css; charset=utf-8', assets.css, headOnly)
      return
    }
    if (pathname === '/app.js') {
      send(response, 200, 'text/javascript; charset=utf-8', assets.javascript, headOnly)
      return
    }
    if (pathname === '/composer.js') {
      send(response, 200, 'text/javascript; charset=utf-8', assets.composerJavascript, headOnly)
      return
    }
    if (pathname === '/vendor/cytoscape/cytoscape.min.js') {
      send(response, 200, 'text/javascript; charset=utf-8', assets.cytoscapeJavascript, headOnly)
      return
    }
    if (pathname === '/vendor/phosphor/style.css') {
      send(response, 200, 'text/css; charset=utf-8', assets.phosphorCss, headOnly)
      return
    }
    if (pathname === '/vendor/phosphor/Phosphor.woff2') {
      send(response, 200, 'font/woff2', assets.phosphorFont, headOnly)
      return
    }
    if (pathname === '/api/inspection') {
      try {
        const currentInspection = handlers.getInspection?.() ?? inspection
        sendJson(response, 200, createStudioBrowserPublicView(currentInspection), headOnly)
      } catch (cause) {
        if (cause instanceof StudioHttpError) {
          sendJson(response, cause.status, createStudioBrowserPublicView(cause.body), headOnly)
        }
        else sendJson(response, 500, { error: 'current Harness inspection is unavailable' }, headOnly)
      }
      return
    }
    if (pathname === '/api/composer-draft' && handlers.getComposerDraft !== undefined) {
      try {
        sendJson(response, 200, createStudioBrowserPublicView(handlers.getComposerDraft()), headOnly)
      } catch (cause) {
        if (cause instanceof StudioHttpError) {
          sendJson(response, cause.status, createStudioBrowserPublicView(cause.body), headOnly)
        } else {
          sendJson(response, 500, {
            error: createStudioBrowserPublicView(cause instanceof Error ? cause.message : String(cause)),
          }, headOnly)
        }
      }
      return
    }
    if (pathname === '/api/harness-context' && handlers.getHarnessContext !== undefined) {
      // Enter a promise chain before invoking the handler so synchronous and
      // asynchronous failures share the same sanitized response boundary.
      void Promise.resolve()
        .then(() => handlers.getHarnessContext!())
        .then(result => sendJson(response, 200, createStudioBrowserPublicView(result), headOnly))
        .catch(cause => sendJson(response, 500, {
          error: createStudioBrowserPublicView(cause instanceof Error ? cause.message : String(cause)),
        }, headOnly))
      return
    }
    send(response, 404, 'text/plain; charset=utf-8', Buffer.from('Not found\n'), headOnly)
  }
}

/** Create the loopback-facing standalone Studio preview. The caller owns listen/close. */
export async function createStudioServer(
  inspection: StudioInspection,
  handlers: StudioServerHandlers = {},
  options: StudioRouteOptions = {},
): Promise<Server> {
  return createServer(await createStudioRequestHandler(inspection, handlers, options))
}
