# Changelog — documentation

## Documentation experience (this change)

The repository documentation was redesigned to read as a **product + SIH submission + software-engineering assignment**, without changing application behaviour.

### README.md

- Replaced the previous linear README with a GitHub-native product story: hero, 60-second briefing, choose-your-path navigation, problem narrative, feature discovery, pipeline, roles, maturity matrix, architecture, demo, demo-vs-production, and setup.
- Grounded every capability in existing routes, services, adapters, and seed scenarios (`GEM/2026/B/CPCL/001`, Bayfront, Delta).
- Kept the honesty bar: DEMO / SYNTHETIC sources; officers decide; no live government APIs.
- Collapsed API, schema, security, tests, and environment into “Under the hood” so the main page stays navigable.
- Marked screenshots as **not present** in the tree (no image assets found) and listed what should be added later.
- Did not invent coverage percentages, partnerships, or production certification.

### docs/ASSIGNMENT.md

- Added a full academic project document (abstract through references) suitable for a software-engineering / mini-project submission.
- Requirements, use cases, data flow, and traceability map to the implemented modules.

### docs/README.md

- Indexed the assignment document alongside existing architecture, security, and demo guides.

### Not changed

Application code, APIs, database schema, authentication, adapters, and existing technical docs (`BHARATBID_ARCHITECTURE.md`, `BHARATBID_SECURITY.md`, slice notes, infrastructure guides) were left in place. No duplicate architecture rewrite.
