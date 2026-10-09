# AGENTS.md — WOIA Customer Data

- This is an organization-shared provider; do not fork/copy it per department.
- Prefer the organization's real source-of-truth integration when configured.
- Use only minimum fields required by the Task.
- Project state should store customer/resource refs, not canonical record copies.
- Search/read do not imply update/export/contact/delete authority.
- customer.update requires effective authority and bounded patch intent.
- Delete is unsupported in v0.5.7.
- The local JSON backend is a reference implementation, not permission to move production customer data into a Project.
- Consumers install/update only; canonical source/release changes are maintainer-controlled.
