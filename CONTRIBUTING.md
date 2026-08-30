# Contributing

Thank you for helping improve DSH GraphControl. The most useful contributions make a concrete Harness task easier to understand or complete while preserving official DeepSeek Harness semantics.

## Before you start

- Search existing issues before opening a new one.
- Open an issue before a large UI, architecture, or compatibility change so the intended user outcome is clear.
- Report security issues privately as described in [SECURITY.md](SECURITY.md).
- Never include credentials, private configuration, or identifying local paths in issues, screenshots, fixtures, or commits.

## Development setup

GraphControl currently uses a Windows-first source workflow.

```powershell
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dsh:bootstrap
```

Start the standalone console with an existing DSH Home:

```powershell
$env:DSH_HOME = 'C:\path\to\your\dsh-home'
corepack pnpm studio
```

## Checks

Run the standard repository check before opening a pull request:

```powershell
corepack pnpm check
```

If your change touches `packages/dsh-adapter` or depends on changed upstream behavior, prepare the newest official DSH release and run the focused official smoke:

```powershell
corepack pnpm dsh:bootstrap
corepack pnpm test:official:smoke
```

## Pull requests

- Keep each pull request centered on one user-visible outcome or one observed compatibility break.
- Describe what changed from the user's perspective and how it was verified.
- Include a redacted screenshot for visible UI changes.
- Keep rapidly changing official DSH behavior inside `packages/dsh-adapter`.
- Preserve unknown source content and keep unsupported combinations visible and read-only.
- Update public documentation when setup, behavior, or compatibility changes.

By opening a pull request, you confirm that you have the right to contribute the submitted work under the [MIT License](LICENSE).
