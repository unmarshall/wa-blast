# wa-blast

A CLI tool to send personalized WhatsApp messages to contacts from a CSV file.

Avoids the native WhatsApp broadcast feature (which requires recipients to have saved your number) by sending individual direct messages — ensuring delivery to everyone regardless of whether they have your contact saved.

## Features

- Sends personalized individual DMs to each contact in a CSV file
- `{name}` and `{phone}` placeholders in message text
- Scheduled sending — start at a specific time (`HH:MM` or ISO 8601)
- Rate limiting with random delays and batch pauses to reduce ban risk
- Crash-safe — state written after every message, resume from where it left off
- Delivery tracking — tracks `sent → delivered → read` status per contact
- Final report — JSON file + terminal summary table with success/failure/unconfirmed breakdown

## Prerequisites

- An active WhatsApp account (personal or business)
- Node.js 20+ (only required for the npm and source options below)

## Installation

Choose the option that best suits you.

### Option 1 — npm (recommended)

Installs `wa-blast` globally as a command available anywhere on your system.

```bash
npm install -g wa-blast
```

Run it:

```bash
wa-blast --csv contacts.csv --msg "Hello {name}!"
```

### Option 2 — Standalone binary (no Node.js required)

Download the pre-built binary for your OS from the [latest GitHub Release](https://github.com/unmarshall/wa-blast/releases/latest). No Node.js installation needed.

**macOS / Linux:**

```bash
chmod +x wa-blast-*-macos-x64   # or linux-x64
./wa-blast-*-macos-x64 --csv contacts.csv --msg "Hello {name}!"
```

**Windows:**

Open a terminal (cmd or PowerShell) in the download folder:

```
wa-blast-*-win-x64.exe --csv contacts.csv --msg "Hello {name}!"
```

### Option 3 — Build from source

Clone the repo, install dependencies, and compile TypeScript yourself.

```bash
git clone https://github.com/unmarshall/wa-blast.git
cd wa-blast
npm install
npm run build
```

Run it:

```bash
node dist/index.js --csv contacts.csv --msg "Hello {name}!"
```

## Usage

```bash
wa-blast --csv contacts.csv --msg "Hello {name}!"
```

### Options

| Option | Description | Default |
|---|---|---|
| `--csv <path>` | Path to CSV file (columns: `name`, `phone`) | required |
| `--msg <text>` | Message text — supports `{name}` and `{phone}` placeholders | required* |
| `--msg-file <path>` | Read message from a text file (alternative to `--msg`) | required* |
| `--schedule <time>` | Start time: `HH:MM` (local) or ISO 8601 | run immediately |
| `--output <path>` | State/output file path | `results_<timestamp>.json` |
| `--delay-min <ms>` | Minimum delay between messages | `3000` |
| `--delay-max <ms>` | Maximum delay between messages | `8000` |
| `--batch-size <n>` | Number of messages before a long pause | `5` |
| `--batch-pause-min <ms>` | Minimum long pause duration | `30000` |
| `--batch-pause-max <ms>` | Maximum long pause duration | `60000` |
| `--resume` | Resume a previous interrupted run | `false` |

*Exactly one of `--msg` or `--msg-file` must be provided.

### CSV Format

```csv
name,phone
John Doe,+491234567890
Jane Smith,+4917612345678
```

Phone numbers should be in E.164 format (e.g. `+15551234567`). Set `WA_BLAST_COUNTRY_CODE` env var to auto-prefix 10-digit numbers.

### Examples

```bash
# Send immediately
wa-blast --csv contacts.csv --msg "Hi {name}, just checking in!"

# Schedule for 9am
wa-blast --csv contacts.csv --msg-file message.txt --schedule 09:00

# Custom delays (more conservative)
wa-blast --csv contacts.csv --msg "Hello {name}" --delay-min 5000 --delay-max 15000

# Resume an interrupted run
wa-blast --csv contacts.csv --msg "Hello {name}" --output results_123.json --resume
```

## First Run — QR Code

On the first run you will be shown a QR code. Scan it with WhatsApp → **Linked Devices** → **Link a Device**.

The session is saved to `~/.wa-blast/session/` and reused on all subsequent runs — no re-scanning needed unless you log out or unlink the device.

## Output

After the run completes, two files are written:

- **State file** (`--output`, default `results_<timestamp>.json`) — live state, used for `--resume`
- **Report file** (`<name>_report_<timestamp>.json`) — final summary with succeeded/failed/unconfirmed lists

A summary table is also printed to the terminal:

```
=== Message Delivery Summary ===
┌──────────────┬───────┬────────────┐
│ Status       │ Count │ % of Total │
├──────────────┼───────┼────────────┤
│ read         │   142 │     71.0%  │
│ delivered    │    28 │     14.0%  │
│ unconfirmed  │     8 │      4.0%  │
│ failed       │    22 │     11.0%  │
├──────────────┼───────┼────────────┤
│ Total        │   200 │    100.0%  │
└──────────────┴───────┴────────────┘
```

### Status meanings

| Status | Meaning |
|---|---|
| `read` | Recipient opened the message |
| `delivered` | Reached recipient's device |
| `sent` | Accepted by WhatsApp servers, awaiting delivery |
| `unconfirmed` | Sent but no delivery confirmation after 24h (possibly blocked, offline, or uninstalled) |
| `failed` | Hard error — number not on WhatsApp, invalid format, etc. |

## Rate Limiting

Default settings send messages with a 3–8 second random delay between each, and a 30–60 second pause every 5 messages. All of these are configurable via `--delay-min`, `--delay-max`, `--batch-size`, `--batch-pause-min`, and `--batch-pause-max`.

> **Warning:** Aggressive bulk messaging risks WhatsApp account suspension. Use conservative delays and ensure recipients expect your message.

## Platform Support

Works on macOS, Linux, and Windows.

## License

MIT
