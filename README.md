# Unlayer CLI

Command-line interface for [Unlayer](https://unlayer.com) — manage templates, projects, and workspaces from your terminal.

## Installation

```bash
npm install -g @unlayer/cli
```

Requires Node.js 20 or later.

## Quick Start

```bash
# Create an account (opens browser)
unlayer signup

# Or log in with an existing account
unlayer login

# Scaffold a new project
unlayer init my-app

# List your templates
unlayer template list

# Pull templates to local files
unlayer pull

# Compare local design against remote
unlayer diff ./templates/welcome-email-42.json
```

## Authentication

The CLI uses Personal Access Tokens (PAT) for authentication.

```bash
# Interactive login (opens browser, creates PAT automatically)
unlayer login

# Non-interactive login (CI/CD)
unlayer login --token unlayer_pat_...

# Or set via environment variable
export UNLAYER_TOKEN=unlayer_pat_...
```

## Commands

### Authentication

| Command | Description |
|---------|-------------|
| `unlayer signup` | Create an account and connect your CLI |
| `unlayer login` | Authenticate with a Personal Access Token |
| `unlayer logout` | Clear stored credentials |
| `unlayer whoami` | Display current user information |

### Content

| Command | Description |
|---------|-------------|
| `unlayer template list` | List templates in a project |
| `unlayer template search <query>` | Search templates by name |
| `unlayer template get <id>` | Get a template by ID |
| `unlayer pull` | Pull all templates to local files |
| `unlayer diff <file>` | Compare a local design against its remote version |

### Management

| Command | Description |
|---------|-------------|
| `unlayer workspace list` | List all accessible workspaces |
| `unlayer workspace use [id]` | Set the active workspace |
| `unlayer project list` | List all projects |
| `unlayer project use [id]` | Set the active project |
| `unlayer project info [id]` | Get detailed project information |
| `unlayer config show` | Show current configuration |
| `unlayer config set <key> <value>` | Set a configuration value |
| `unlayer config reset` | Reset configuration to defaults |
| `unlayer status` | Check CLI health and connectivity |

### Project Setup

| Command | Description |
|---------|-------------|
| `unlayer init [name]` | Scaffold a new Unlayer project |

## Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Output as machine-readable JSON |
| `--non-interactive` | Never prompt; fail if input is needed |
| `-v, --verbose` | Enable verbose logging (to stderr) |
| `-q, --quiet` | Suppress decorative output |

CI environments (`CI` env var or non-TTY stdin) automatically enable `--non-interactive` and `--quiet`.

## Project Configuration

Create an `unlayer.config.json` in your project root to set defaults:

```json
{
  "projectId": null,
  "defaults": {
    "outputDir": "./templates"
  }
}
```

The CLI walks up from the current directory to find this file (like `.gitignore`).

## CI/CD Integration

```bash
#!/bin/bash
export UNLAYER_TOKEN=$UNLAYER_PAT_SECRET

# Pull all templates
unlayer pull --json 2>/dev/null

# Compare against remote
unlayer diff ./templates/welcome-email-42.json --json 2>/dev/null
```

## Output Contract

- **stdout** — machine-readable data only (JSON, URLs). Safe to pipe and parse.
- **stderr** — human-readable messages, spinners, and errors.
- In `--json` mode, errors are written to stderr as `{"error": "..."}`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `UNLAYER_TOKEN` | Personal Access Token (PAT) |
| `UNLAYER_API_URL` | Override API base URL |
| `UNLAYER_WORKSPACE_ID` | Override workspace ID |
| `UNLAYER_PROJECT_ID` | Override project ID |
| `CI` | Enables non-interactive mode |

## Development

```bash
pnpm install
pnpm build
pnpm dev          # watch mode
pnpm typecheck    # type-check without emitting
```

## License

[MIT](LICENSE)
