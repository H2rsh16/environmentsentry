# 🩺 environmentsentry

Deterministic, offline-first env scanner. Diagnose missing/invalid environment variables, explain errors in plain English, and fix them across any project size — small, big, large, or huge.

[![npm version](https://img.shields.io/npm/v/environmentsentry.svg)](https://npmjs.com/package/environmentsentry)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](<https://img.shields.io/badge/node-%3E=18-blue.svg>)](https://nodejs.org)

---

## Commands

```
environmentsentry check
environmentsentry fix
environmentsentry init
environmentsentry explain -c "npm run build"
environmentsentry scan [-r <root>] [-d <depth>] [--json] [--strict] [--include <glob>] [--exclude <glob>]
environmentsentry usage [-r <root>] [--json] [--watch] [--include <glob>] [--exclude <glob>]
environmentsentry example [-r <root>] [-o <out>] [--include <glob>] [--exclude <glob>]
environmentsentry prod [-r <root>] [--force]
environmentsentry vault init
environmentsentry vault info
environmentsentry vault set <key> <value>
environmentsentry vault get <key> [--reveal]
environmentsentry vault list
environmentsentry vault remove <key>
environmentsentry -h
```

---

## check

Checks environment variables against `.env.example` across all projects under the root. Output is a professional styled table showing Project, Variable, Status, Value (masked), Hash, and Suggestion. Raw values are never displayed — only `****` and a short SHA-256 hash.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         environmentsentry check                                      │
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

Encodes env values and stores them in a local encrypted SQLite database (`.environmentsentry-vault.sqlite`). Uses **top-level encryption**: AES-256-GCM with PBKDF2-HMAC-SHA256 key derivation (210,000 iterations). Keys are derived from `ENV_DOCTOR_VAULT_PASS` or stored in `.environmentsentry-vault.key`.

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

## Why environmentsentry

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
npm install -g environmentsentry

# Create .env from .env.sample
environmentsentry fix -e .env.sample

# Fill in real values in .env, then verify
environmentsentry check

# Scan source code for env usage
environmentsentry usage

# Generate .env.sample from source usage
environmentsentry example

# Production setup
environmentsentry prod --force

# Secure vault for sensitive values
environmentsentry vault init
environmentsentry vault set DATABASE_URL "postgres://..."
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
- Project: [environmentsentry](https://github.com/H2rsh16/environmentsentry)

MIT License
