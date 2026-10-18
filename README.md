# 🩺 environmentsentrry

Deterministic, offline-first env scanner. Diagnose missing/invalid environment variables, explain errors in plain English, and fix them across any project size — small, big, large, or huge.

[![npm version](https://img.shields.io/npm/v/environmentsentrry.svg)](https://npmjs.com/package/environmentsentrry)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](<https://img.shields.io/badge/node-%3E=18-blue.svg>)](https://nodejs.org)

---

## Commands

```
environmentsentrry check
environmentsentrry fix
environmentsentrry init
environmentsentrry explain -c "npm run build"
environmentsentrry scan [-r <root>] [-d <depth>] [--json] [--strict] [--include <glob>] [--exclude <glob>]
environmentsentrry usage [-r <root>] [--json] [--watch] [--include <glob>] [--exclude <glob>]
environmentsentrry example [-r <root>] [-o <out>] [--include <glob>] [--exclude <glob>]
environmentsentrry prod [-r <root>] [--force]
environmentsentrry vault init
environmentsentrry vault info
environmentsentrry vault set <key> <value>
environmentsentrry vault get <key> [--reveal]
environmentsentrry vault list
environmentsentrry vault remove <key>
environmentsentrry -h
```

---

## check

Checks environment variables against `.env.example` across all projects under the root. Output is a professional styled table showing Project, Variable, Status, Value (masked), Hash, and Suggestion. Raw values are never displayed — only `****` and a short SHA-256 hash.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         environmentsentrry check                                      │
│                    Environment variable diagnosis                          │
╔══════════════════════════════════════════════════════════════════════════════╗
│ Project             │ Variable           │ Status   │ Value   │ Hash        │ Suggestion                              │
├─────────────────────┼────────────────────┼──────────┼─────────┼─────────────┼───────────────────────────────────────────┤
│ .                   │ PORT               │    OK    │ ****    │ a1b2c3d4…   │ —                                       │
│ .                   │ API_KEY            │  MISSING │ ****    │ —           │ Add API_KEY=value to .env                 │
│ examples            │ DATABASE_URL       │  INVALID │ ****    │ x7y8z9…     │ Must start with http:// or https://       │
└─────────────────────┴────────────────────┴──────────┴─────────┴─────────────┴───────────────────────────────────────────┘
```

Options:

- `--watch` — re-scan every 2 seconds in the same terminal (interactive rescan; Ctrl+C to stop)
- `--include <glob>` — only include files matching the glob (e.g. `*.ts`)
- `--exclude <glob>` — exclude files/folders matching the glob (e.g. `node_modules`)
- `--json` — machine-readable JSON output
- `--strict` — exit with code 1 on any issue

---

## usage

Scans source files for `process.env.VAR` and `import.meta.env.VAR` references. Reports each used variable with file location and line number in a styled table, plus unused variables, missing variables, and idle variables.

Options:

- `--watch` — re-scan on changes (interactive terminal)
- `--include <glob>` / `--exclude <glob>` — file/folder filters

---

## example

Generates `.env.example` from source-code env var usage. Lists each variable with the file and line where it is first referenced. Marks existing example variables not found in source as unused.

Options:

- `--include <glob>` / `--exclude <glob>` — file/folder filters

---

## prod

Validates env vars against `.env.example`, creates `.env.production` with empty values ready for production, then runs `npm test`. Use `--force` to overwrite or proceed despite validation issues.

---

## vault

Encodes env values and stores them in a local encrypted SQLite database (`.environmentsentrry-vault.sqlite`). Uses **top-level encryption**: AES-256-GCM with PBKDF2-HMAC-SHA256 key derivation (210,000 iterations). Keys are derived from `ENV_DOCTOR_VAULT_PASS` or stored in `.environmentsentrry-vault.key`.

Values are never exposed in plaintext by default:

- `vault get <key>` shows `****` and a short SHA-256 hash
- Use `--reveal` to show the plaintext value explicitly
- `vault list` shows keys with timestamps and content hashes only
- `vault info` shows the encryption algorithm details

### Encryption specification

| Property        | Value                                      |
| --------------- | ------------------------------------------ |
| Cipher          | AES-256-GCM                                |
| Version         | v1                                         |
| Key derivation  | PBKDF2-HMAC-SHA256                         |
| Iterations      | 210,000                                    |
| Key length      | 256-bit                                    |
| Salt            | 16 bytes (random per value)                |
| IV              | 12 bytes (random per value)                |
| Auth tag        | 16 bytes (GCM)                             |
| At-rest storage | AES-256-GCM encrypted                      |
| Console output  | Masked by default (`****` + sha256 hash) |

### Vault commands

| Command                        | Purpose                                              |
| ------------------------------ | ---------------------------------------------------- |
| `vault init`                 | Initialize vault database + print encryption details |
| `vault info`                 | Show algorithm specs                                 |
| `vault set <key> <value>`    | Store AES-256-GCM encoded value                      |
| `vault get <key> [--reveal]` | Read value (masked by default)                       |
| `vault list`                 | List keys + timestamps + content hashes              |
| `vault remove <key>`         | Remove a key from vault                              |

---

## Why environmentsentrry

- **Works for any project size** — small, big, large, or huge monorepos
- **Offline-first** — no API keys, no network calls, fully local
- **Professional output** — styled tables, color-coded status, summary boxes
- **Watch mode** — live re-scan on file changes
- **Secure by default** — values masked, encrypted at rest, never exposed in dev tools
- **Zero-config** — works out of the box with existing `.env` / `.env.example`

---

## Quick Start

```bash
# Install
npm install -g environmentsentrry

# Create .env from .env.sample
environmentsentrry fix -e .env.sample

# Fill in real values in .env, then verify
environmentsentrry check

# Scan source code for env usage
environmentsentrry usage

# Generate .env.sample from source usage
environmentsentrry example

# Production setup
environmentsentrry prod --force

# Secure vault for sensitive values
environmentsentrry vault init
environmentsentrry vault set DATABASE_URL "postgres://..."
```

---

## Documentation

| Doc | Description |
|---|---|
| [docs/USAGE.md](docs/USAGE.md) | Complete usage guide for all commands |
| [docs/EXAMPLE.md](docs/EXAMPLE.md) | End-to-end example project walkthrough |

---

## Credits

Built with ❤️ by **Harsh Ovhal**

- GitHub: [https://github.com/H2rsh16](https://github.com/H2rsh16)
- Project: [environmentsentrry](https://github.com/H2rsh16/environmentsentrry)

MIT License
