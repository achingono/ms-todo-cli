# ms-todo-cli

A command-line interface for Microsoft To Do, built with TypeScript and Node.js.

## Features

- OAuth authentication via Microsoft device code flow
- Manage todo lists (create, list)
- Manage tasks (create, update, complete, list, get)
- JSON output for easy scripting and integration
- Secure token storage via keytar (with file fallback)

## Installation

```bash
npm install -g ms-todo-cli
```

Or clone and build locally:

```bash
git clone https://github.com/your-org/ms-todo-cli
cd ms-todo-cli
npm install
npm run build
npm link
```

## Azure App Registration

To use this CLI, you need to register an application in Azure Active Directory:

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click **New registration**
   - Name: `ms-todo-cli` (or any name)
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: leave blank (device code flow doesn't need one)
3. Click **Register**
4. Copy the **Application (client) ID**
5. Under **API permissions**, add:
   - `Tasks.ReadWrite` (Microsoft Graph, Delegated)
   - `User.Read` (Microsoft Graph, Delegated)
   - `offline_access` (Microsoft Graph, Delegated)
6. Grant admin consent if required by your organization

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `MS_TODO_CLIENT_ID` | Azure app client ID | `YOUR_CLIENT_ID_HERE` |

Set your client ID before using:

```bash
export MS_TODO_CLIENT_ID="your-azure-client-id"
```

## Authentication

### Login

```bash
ms-todo-cli auth login
```

Follow the device code instructions printed to stderr. After login, a success JSON is printed to stdout.

### Check status

```bash
ms-todo-cli auth status
```

### Print account info

```bash
ms-todo-cli auth print-account
```

### Logout

```bash
ms-todo-cli auth logout
```

## List Commands

### Create a list

```bash
ms-todo-cli list create "Shopping"
```

### List all lists

```bash
ms-todo-cli list list
```

## Task Commands

### Create a task

```bash
ms-todo-cli task create --title "Buy milk" --list "Shopping"
ms-todo-cli task create --title "Buy milk" --due "2024-12-31T00:00:00Z" --priority high
```

### Create a task via stdin (JSON)

```bash
echo '{"title":"Buy eggs","list":"Shopping"}' | ms-todo-cli task create --stdin
```

### Update a task

```bash
ms-todo-cli task update --task-id "TASK_ID" --title "Buy oat milk"
ms-todo-cli task update --task-id "TASK_ID" --completed true
```

### Complete a task

```bash
ms-todo-cli task complete --task-id "TASK_ID"
```

### List tasks in a list

```bash
ms-todo-cli task list --list "Shopping"
ms-todo-cli task list --list-id "LIST_ID"
```

### Get a single task

```bash
ms-todo-cli task get --task-id "TASK_ID"
```

## Short-form Aliases

Top-level shortcuts for common task operations:

```bash
ms-todo-cli create --title "Buy milk"
ms-todo-cli update --task-id "TASK_ID" --title "Buy oat milk"
ms-todo-cli get --task-id "TASK_ID"
```

## Output Format

All output is valid JSON. Success responses have `ok: true`:

```json
{"ok":true,"task":{"id":"...","title":"Buy milk","status":"notStarted"}}
```

Error responses have `ok: false` and exit with code 1:

```json
{"ok":false,"error":{"code":"AUTH_REQUIRED","message":"Not authenticated. Run: ms-todo-cli auth login"}}
```

## OpenClaw / Scripting Integration

The JSON output is designed for easy parsing:

```bash
# Get all lists and parse with jq
ms-todo-cli list list | jq '.lists[].displayName'

# Create a task and capture its ID
TASK_ID=$(ms-todo-cli create --title "Review PR" | jq -r '.task.id')

# Complete the task
ms-todo-cli task complete --task-id "$TASK_ID"
```

## Development

```bash
npm run build   # Compile TypeScript
npm test        # Run tests
npm run lint    # Lint source files
```

## License

MIT
OpenClaw CLI client for Microsoft Todo
