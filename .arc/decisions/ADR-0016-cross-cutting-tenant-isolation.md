---
id: ADR-0016
category: cross_cutting
title: 'Cross-cutting: Tenant isolation'
status: accepted
superseded_by: null
component_id: null
decision: Organizations are tenants sharing the same tables; every tenant-owned row
  carries an organization id, and Platform API enforces it on every query (and in
  object storage key prefixes) alongside RBAC.
evidence: 'User: ''Shared tables with an organization id'''
contested: true
alternatives_considered:
- 'Schema per tenant: stronger isolation but costly migrations and operations across
  many tenants'
- 'Database per tenant: strongest isolation, highest cost and operational overhead'
- 'Stack per tenant: not warranted without a compliance or isolation requirement'
consequences:
- Every query must be scoped by organization id; a missed filter is a cross-tenant
  leak, so tests and possibly row-level security are needed
- Single schema migration path and lowest cost
- Per-tenant data residency or export is harder later
---

## Context

User: 'Shared tables with an organization id'

## Decision

Organizations are tenants sharing the same tables; every tenant-owned row carries an organization id, and Platform API enforces it on every query (and in object storage key prefixes) alongside RBAC.

## Alternatives considered

- Schema per tenant: stronger isolation but costly migrations and operations across many tenants
- Database per tenant: strongest isolation, highest cost and operational overhead
- Stack per tenant: not warranted without a compliance or isolation requirement

## Consequences

- Every query must be scoped by organization id; a missed filter is a cross-tenant leak, so tests and possibly row-level security are needed
- Single schema migration path and lowest cost
- Per-tenant data residency or export is harder later
