# Security Policy

## Supported versions

DSH GraphControl is an early source preview without a tagged release. Security fixes are applied to the latest `main` branch; older commits are not maintained as supported versions.

## Report a vulnerability

Please use [GitHub Private Vulnerability Reporting](https://github.com/CebCai/dsh-graph-control/security/advisories/new). Do not disclose a vulnerability, credential, private configuration, or identifying local path in a public issue.

Include, when possible:

- a concise description and expected impact;
- reproduction steps or a minimal redacted example;
- the GraphControl commit and official DSH version involved;
- relevant Windows and Node.js versions;
- any known workaround.

The project aims to acknowledge a complete report within seven days. Public disclosure should wait until a fix or coordinated disclosure plan is available.

## Runtime trust boundary

- GraphControl binds its control plane to loopback.
- The selected official DSH installation is trusted local code and may execute during composition or DSH Web startup.
- Temporary composition protects the selected DSH Home from expected preparation side effects; it is not a sandbox for malicious local code.
- Configuration writes require Preview, explicit Apply, a fresh source check, and an atomic replacement of one selected profile patch.
- GraphControl preserves `!!js` as source text and never evaluates it.
- Remote runtimes, package installation, credential access, origin contact, and workspace transfer are outside the current default product flow.

Official composition confirms configuration compatibility for the selected action. It does not prove that a component is safe, that it started successfully, or that runtime permissions are appropriate.
