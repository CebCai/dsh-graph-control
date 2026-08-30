import { isAbsolute } from 'node:path'

const WINDOWS_ABSOLUTE_PATH = /^[A-Za-z]:[\\/]/u
const UNC_PATH = /^\\\\/u
// URLs in adapter/user messages are delimited by whitespace, quotes, or angle
// brackets. URL-path punctuation such as `,`, `)`, and `]` is valid and must
// remain part of the protected token when more path segments follow it.
const HTTP_URL = /https?:\/\/[^\s"'<>]+/giu

function isExactLocalLocation(value: string): boolean {
  return value.startsWith('file:')
    || WINDOWS_ABSOLUTE_PATH.test(value)
    || UNC_PATH.test(value)
    || isAbsolute(value)
}

function collectLocalLocations(value: unknown, locations: Set<string>): void {
  if (typeof value === 'string') {
    if (isExactLocalLocation(value)) locations.add(value)
    return
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectLocalLocations(item, locations))
    return
  }
  if (value === null || typeof value !== 'object') return
  Object.values(value as Record<string, unknown>)
    .forEach(item => collectLocalLocations(item, locations))
}

function encodedVariants(value: string): readonly string[] {
  const normalized = value.replaceAll('\\', '/')
  return [...new Set([
    value,
    normalized,
    encodeURIComponent(value),
    encodeURIComponent(normalized),
  ])].sort((left, right) => right.length - left.length)
}

function redactNonHttpSegment(
  value: string,
  replacements: readonly { source: string; replacement: string }[],
): string {
  let redacted = value
  for (const { source, replacement } of replacements) {
    redacted = redacted.replaceAll(source, replacement)
  }
  // A path can occur only inside an adapter error or encoded entity id and
  // therefore have no standalone field from which to collect it. Keep these
  // narrow fallbacks at the final browser serialization boundary.
  return redacted
    .replace(/file:\/\/\/[^\s"'<>)}\],]+/giu, 'local-source://redacted')
    .replace(/file%3A(?:%2F){2,3}[^:\s"'<>)}\],]+/giu, 'local-source%3A%2F%2Fredacted')
    .replace(/(?<![A-Za-z0-9])[A-Za-z]:[\\/][^\r\n"'<>|)}\],]+/gu, '[local path]')
    .replace(/(?<![A-Za-z0-9])[A-Za-z]%3A(?:%2F|%5C)[^:\s"'<>)}\],]+/giu, '[local path]')
    .replace(/\\\\[^\r\n"'<>|)}\],]+/gu, '[local path]')
    .replace(/(?:%5C){2}[^:\s"'<>)}\],]+/giu, '[local path]')
    // Avoid matching the path portion of http(s) URLs: a URL's first slash is
    // preceded by ':' and the second by '/'. A standalone POSIX/forward-UNC
    // location begins at the string boundary or after punctuation/whitespace.
    .replace(/(?<![:/A-Za-z0-9])\/\/[^\r\n"'<>|)}\],]+/gu, '[local path]')
    .replace(/(?<![:/A-Za-z0-9])\/(?!\/)[^\r\n"'<>|)}\],]+/gu, '[local path]')
    .replace(/(?<![%A-Za-z0-9])%2F(?!%2F)[^:\s"'<>)}\],]+/giu, '[local path]')
}

function redactString(
  value: string,
  replacements: readonly { source: string; replacement: string }[],
): string {
  // HTTP endpoint paths are product configuration, not local filesystem
  // locations. Sanitize only the text between complete URLs so IPv6 hosts and
  // trailing-dot FQDNs keep an exact preview without placeholder collisions.
  let result = ''
  let cursor = 0
  for (const match of value.matchAll(HTTP_URL)) {
    const index = match.index
    result += redactNonHttpSegment(value.slice(cursor, index), replacements)
    result += match[0]
    cursor = index + match[0].length
  }
  return result + redactNonHttpSegment(value.slice(cursor), replacements)
}

function clonePublicValue(
  value: unknown,
  replacements: readonly { source: string; replacement: string }[],
): unknown {
  if (typeof value === 'string') return redactString(value, replacements)
  if (Array.isArray(value)) return value.map(item => clonePublicValue(item, replacements))
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    // `raw` is lossless source evidence for adapters and Developer diagnostics;
    // it has no product-surface consumer and can contain arbitrary YAML text.
    .filter(([key]) => key !== 'uri' && key !== 'raw')
    .map(([key, item]) => key === 'sourcePaths'
      ? [key, []]
      : [key, clonePublicValue(item, replacements)]))
}

/**
 * Clone a JSON response for the ordinary Studio browser surface while
 * replacing every exact local path/URI (including encoded entity-id forms).
 * The runtime keeps its original objects for planning and guarded writes.
 */
export function createStudioBrowserPublicView<T>(value: T): T {
  const locations = new Set<string>()
  collectLocalLocations(value, locations)
  const replacements = [...locations]
    .sort((left, right) => right.length - left.length)
    .flatMap((location, index) => encodedVariants(location).map(source => ({
      source,
      replacement: `local-source-${index + 1}`,
    })))
    .sort((left, right) => right.source.length - left.source.length)
  return clonePublicValue(value, replacements) as T
}
