# Bundled scripts

Each script is standalone bash. Run with `bash <script>` or `chmod +x` and execute directly.

| Script | Purpose |
|---|---|
| `calibrate.sh <repo-root>` | Runs `scan` + `process --limit 50`, projects full-repo cost. Use this **before every unbounded `process` run** on a new repo. |
| `doctor.sh <repo-root>` | Sanity-checks `.deepsec/` setup — node version, install, config, INFO.md, credentials, OIDC age. Run when something is mysteriously broken. |
| `pr-gate.sh <base-ref> [extra flags]` | Local equivalent of CI's PR gate. Wraps `process --diff`, exits 1 on net-new findings, surfaces the comment artifact path. |

All scripts default to `$PWD` when no repo-root is passed. They walk up to find `.deepsec/` so they can be invoked from anywhere inside a repo.
