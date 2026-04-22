# pi-kiro

[Kiro](https://kiro.dev) provider for [pi](https://github.com/badlogic/pi-mono).

Adds the Kiro model family (AWS Builder ID login, CodeWhisperer streaming API)
to pi's coding agent.

## Install

```bash
pi install pi-kiro
```

## Login

```bash
pi /login kiro
```

Two methods are supported:

- **AWS Builder ID** — leave the prompt blank. Opens the standard Builder ID
  device-authorization page.
- **IAM Identity Center (IdC / SSO)** — paste your company start URL
  (e.g. `https://mycompany.awsapps.com/start`). You can supply a specific
  AWS region or leave it blank to auto-detect.

Tokens are stored in `~/.pi/agent/auth.json`.

## Supported models

All Claude models available through the Kiro service, including:

- `claude-sonnet-4-5`
- `claude-sonnet-4-6`
- `claude-opus-4-7`

Run `pi --list-models` for the full list once the extension is loaded.

## Region support

Region is inferred from your Builder ID profile. Kiro API regions currently
available: `us-east-1`, `eu-central-1`, and others. See `src/models.ts` for
the authoritative region-to-model map.

## Development

```bash
bun install
bun run typecheck
bun run test
```

## License

MIT
