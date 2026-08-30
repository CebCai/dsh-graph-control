export class StudioHttpError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(
    status: number,
    body: unknown,
  ) {
    super(`Studio request failed with HTTP ${status}`)
    this.name = 'StudioHttpError'
    this.status = status
    this.body = body
  }
}
