# Password blocklist

`current.txt` is the list the API enforces. `current.json` records where it came from, its SHA-256 and when it was
installed. Every version it replaced is kept under `archive/`, and `HISTORY.md` is the human-readable trail.

Nothing here is edited by hand. Use the command:

```bash
pnpm blocklist:update              # fetch the default source, archive the current list, install the new one
pnpm blocklist:update --source <url>
pnpm blocklist:update --dry-run    # fetch and validate only, change nothing
pnpm blocklist:check               # verify current.txt still matches the SHA-256 in current.json
```

The update is all-or-nothing. If the download fails, the content does not look like a password list, or any later step
throws, the previous `current.txt`, `current.json` and `HISTORY.md` are restored and the command exits non-zero.

Only `current.txt` and `current.json` are copied into `dist`; the archive stays in the repository, where the audit trail
belongs.
