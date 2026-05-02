# Changelog

## 0.1.3

- Drop `@mariozechner/pi-coding-agent` as a dependency and peer. pi-kiro
  used it only for the `ExtensionAPI` type; the minimal shape is now
  declared locally in `src/extension.ts`. Hosts on any pi version can
  install pi-kiro without a resolution error.
- Add `@mariozechner/pi-ai` `^0.72.1` as an explicit devDep (previously
  transitive via pi-coding-agent).
- `@mariozechner/pi-ai` stays declared as peer `*`.
- `ExtensionAPI` / `ProviderConfig` in the emitted `dist/extension.d.ts`
  are now local, not re-exported from pi-coding-agent. Consumers should
  keep importing these types from `@mariozechner/pi-coding-agent`
  directly; pi-kiro does not re-export them.
- Public API surface (`streamKiro`, `kiroModels`, `loginKiro`,
  `refreshKiroToken`, `resolveApiRegion`, `filterModelsByRegion`,
  `KiroCredentials`, `KiroModel`, etc.) is unchanged.
