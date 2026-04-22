# Architecture

## File map

```
pi-kiro/
├── extensions/index.ts     Entry point referenced by package.json "pi.extensions"
├── src/
│   ├── models.ts           Model catalog, dot/dash ID conversion, region map
│   ├── oauth.ts            Builder ID device-code login + SSO-OIDC refresh
│   ├── transform.ts        pi Message[] → Kiro history (merging, converters)
│   ├── history.ts          sanitizeHistory + truncateHistory + addPlaceholderTools
│   ├── thinking-parser.ts  Stateful <thinking> tag splitter
│   ├── event-parser.ts     Kiro JSON event parser (buffer-aware)
│   ├── stream.ts           Orchestrator (request build + retry + consume)
│   ├── tokenizer.ts        js-tiktoken wrapper for output estimation
│   └── debug.ts            4-level logger gated by KIRO_LOG env var
└── test/
    ├── <per-module>.test.ts
    └── pi-mono-suite/      11 standard tests ported from pi-mono
```

## Data flow — streaming request

```
pi.Context (Message[])
        │
        ▼
transform.buildHistory  ── merges consecutive user / tool-result entries
        │
        ▼
history.truncateHistory ── strips images, enforces JSON byte budget
        │
        ▼
history.addPlaceholderTools ── stubs tools referenced in history
        │
        ▼
stream.streamKiro       ── POST /generateAssistantResponse
        │
        ├── resolveProfileArn (cached)     ── AmazonCodeWhispererService.ListAvailableProfiles
        ├── first-token timeout (90s)
        ├── idle timeout (300s rolling)
        ├── 403 → refresh → retry
        ├── INSUFFICIENT_MODEL_CAPACITY → backoff → retry
        ├── empty response → retry
        └── stream error → retry
        │
        ▼
event-parser.parseKiroEvents ── brace-balanced JSON extraction
        │
        ▼
thinking-parser.ThinkingTagParser ── splits <thinking> from text
        │
        ▼
pi.AssistantMessageEventStream ── start/text_delta/toolcall_end/done/error
```

## OAuth flow

Two login methods, both using AWS SSO-OIDC device-code:

- **Builder ID** (personal) — fixed start URL
  `https://view.awsapps.com/start`, fixed region `us-east-1`.
- **IdC** (enterprise) — user-supplied start URL
  (e.g. `https://mycompany.awsapps.com/start`); region is either supplied by
  the user or auto-detected by probing common AWS regions.

```
loginKiro(callbacks)
  ├── prompt: blank → Builder ID, URL → IdC
  ├── (IdC) prompt: region (or blank to probe)
  ├── POST /client/register      → { clientId, clientSecret }
  ├── POST /device_authorization → { userCode, verificationUriComplete, deviceCode }
  ├── callbacks.onAuth({ url, instructions: "Your code: XXXX" })
  └── poll POST /token until {accessToken, refreshToken}

refreshKiroToken(credentials)
  └── POST https://oidc.{region}.amazonaws.com/token
        {grantType: "refresh_token", clientId, clientSecret, refreshToken}
```

Credentials shape (internal extension of `OAuthCredentials`):

```typescript
interface KiroCredentials extends OAuthCredentials {
  refresh: string;       // `${refreshToken}|${clientId}|${clientSecret}|idc`
  access: string;        // current access token
  expires: number;       // ms epoch, with 5-min buffer subtracted
  clientId: string;
  clientSecret: string;
  region: string;        // SSO region (for Builder ID, always us-east-1)
  authMethod: "idc";
}
```

## Region mapping

```
SSO region            → Kiro API region
us-east-1 / us-east-2 → us-east-1
eu-west-1 / eu-west-2 / eu-west-3 / eu-north-1 / eu-central-1 → eu-central-1
ap-*                  → ap-southeast-1
```

Applied via `modifyModels` hook in `extensions/index.ts` after login, before
requests. `modifyModels` rewrites `baseUrl` to
`https://q.{apiRegion}.amazonaws.com/generateAssistantResponse`.

## Debug levels

```
export type LogLevel = "error" | "warn" | "info" | "debug";
```

- `error` — unconditional, goes to `console.error`.
- `warn` — default-on (retries, degraded paths).
- `info` — off by default (session milestones).
- `debug` — off by default (request/response snapshots).

Configured by `KIRO_LOG=debug|info|warn|error`. Default is `warn`.

## Component coupling

```
extensions/index.ts
    └── imports: models, oauth, stream

src/stream.ts (largest module)
    ├── imports: models, transform, history, event-parser, thinking-parser,
    │            tokenizer, debug
    ├── no imports from: oauth (decoupled — token comes via options.apiKey)

src/oauth.ts
    └── imports: (none from ./src) — pure AWS SSO-OIDC

src/transform.ts + src/history.ts
    └── imports: pi-ai types only

src/thinking-parser.ts + src/event-parser.ts
    └── imports: pi-ai types only (self-contained parsers)
```

Low coupling: OAuth, transform/history, and the parsers have zero inter-module
dependencies. `stream.ts` is the only module that imports broadly.

## What pi-mono provides (do not reimplement)

| Concern | pi-mono export |
|---|---|
| Unicode surrogate sanitization | `sanitizeSurrogates` |
| Context-overflow classification | `isContextOverflow` |
| Event stream factory | `createAssistantMessageEventStream` |
| Cost calculation | `calculateCost` |
| Message / type definitions | `Message`, `AssistantMessage`, `Tool`, `ToolCall`, `Model`, `Context`, `SimpleStreamOptions`, `OAuthCredentials`, `OAuthLoginCallbacks` |
