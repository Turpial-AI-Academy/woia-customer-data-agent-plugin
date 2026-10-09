---
name: customer-data
description: Search, read, or update the organization's shared customer source of truth with minimum-data, resource-reference, authority, concurrency, and evidence discipline across Marketing and Sales.
license: MIT
metadata:
  author: Turpial AI Academy
  version: "0.5.6"
---

# WOIA Customer Data

Use this skill when a Task needs customer/lead data shared across departments.

## Source-of-truth rule

Resolve the organization's configured customer system from the WOIA organization registry/binding. Do not create a department copy.
Prefer returning/storing stable refs such as customer:123 plus only the minimum fields needed by the current Task.

## Operations

customer.search: read-only search within authorized fields/source.
customer.read: read-only exact-resource lookup with minimum requested fields.
customer.update: effectful bounded patch. Confirm exact ref, bounded fields, effective authority, current revision/evidence, then use a concurrency-aware implementation.

Never retry an ambiguous update blindly.

## Reference local implementation

When the organization binding explicitly selects local-json-reference, use:
- node scripts/customer-store.mjs search --db <path> --query <text> [--fields a,b] [--limit N]
- node scripts/customer-store.mjs read --db <path> --id <customer-id> [--fields a,b]
- node scripts/customer-store.mjs update --db <path> --id <customer-id> --expected-revision N --patch-json <json>

The database path must be outside .woia/ Project state. Update uses an exclusive lock, validates expected revision, writes atomically, increments store revision, and never allows changing id.

## Data minimization

Do not bulk-export records merely for convenience. Do not include credentials/secrets in Task state or receipts.

Marketing and Sales may have different authority/fields over the same source record. Never infer one department's permissions from another's access.

## B5 qualified consumer eligibility

B5 consumer eligibility includes Marketing, Sales, Leasing and Data against the configured CRM/customer binding. Customer Data remains a bounded CRM adapter, never the cross-role identity master; resolve canonical Person/Organization identity through WOIA Identity. Consumer eligibility does not grant update, contact, finance or competent acceptance authority.
