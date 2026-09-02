# Feature flags (frontend)

UX-only. The API still enforces flags.

`FeatureProvider` loads `GET /api/v1/features`. BharatBid navigation is always Command Center through Notifications. Flags do not restore Starter Kit product pages.

```ts
const { isEnabled, isDemo } = useFeatures();
if (isEnabled('pdf')) { /* show generate-report when permitted */ }
if (isDemo) { /* DEMO / SYNTHETIC labelling */ }
```

See [docs/features.md](../../../docs/features.md).
