# Feature flags and demo mode

Env-based flags so BharatBid can turn capabilities on or off. There is no remote flag service.

Server evaluation is authoritative. The frontend may hide navigation from `GET /api/v1/features`; that is UX only.

```ts
import { isFeatureEnabled, isDemoMode, requireFeature } from '../features';

if (isFeatureEnabled(config, 'ai')) { /* document intelligence */ }
if (isDemoMode(config)) { /* mock OTP, email, SMS, optional AI */ }
requireFeature(config, 'pdf'); // throws FEATURE_DISABLED
```

See [docs/features.md](../../../docs/features.md) for the registry (name, default, dependencies, purpose).
