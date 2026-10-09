# WOIA Customer Data

Shared organization-level capability used by multiple department marketplaces.

Core rule: Marketing and Sales do not own separate customer databases. They resolve the same organization source of truth through this capability.

The canonical customer record stays in the bound CRM/database/system of record. Projects store resource references and Task-local evidence, not database copies.

Operations:
- customer.search — read
- customer.read — read
- customer.update — effectful write with explicit authority

Delete is intentionally not part of v0.5.6.

The preferred implementation is the organization's configured integration/app/CRM binding.
The plugin also contains a deterministic local JSON-store implementation for controlled E2E/small local deployments. Its database path must be an organization-owned data-plane path outside .woia/ and outside department Project state.

The reference backend does not grant authority. WOIA authority must be established before invoking update.

One canonical plugin/release is referenced by both WOIA Marketing and WOIA Sales marketplaces.

## Maintenance

Edit only this canonical repository. Keep `plugin.json`, `package.json` and `dev.woia/manifest.json` versions aligned. From the canonical WOIA Ecosystem repository, run `mise run plugin:certify-thin --repo <absolute-plugin-repository>`, then use its release preparation/publication tasks. Install and update consumers from immutable published artifacts; keep Project personalization in overlays.
