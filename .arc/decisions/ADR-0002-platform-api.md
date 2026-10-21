---
id: ADR-0002
category: component
title: Platform API
status: accepted
superseded_by: null
component_id: comp_platform_api
responsibility: 'Single API owning the domain: built-in authentication (registration,
  login, sessions/tokens) and RBAC, users, organizations, configurable workflows and
  tasks, document metadata, search and filtering, reporting queries, audit logging,
  and public API plus webhook management.'
kind: api_service
split_reason: Different runtime from the web client; single API to start (no cited
  driver yet for one per domain).
talks_to:
- component_id: comp_relational_database
  interaction: sync
  evidence: API persists users, tasks, audit logs
- component_id: comp_object_storage
  interaction: sync
  evidence: 'User: ''Document Management'''
- component_id: comp_background_worker
  interaction: async
  evidence: Workflow automation and notifications run off the request path (user's
    feature list)
evidence: 'User: ''Built into the API'' (login); core features list'
---

## Context

User: 'Built into the API' (login); core features list

## Decision

Single API owning the domain: built-in authentication (registration, login, sessions/tokens) and RBAC, users, organizations, configurable workflows and tasks, document metadata, search and filtering, reporting queries, audit logging, and public API plus webhook management.

Kept separate because Different runtime from the web client; single API to start (no cited driver yet for one per domain)..

## Talks to

- **Relational Database** (sync) — API persists users, tasks, audit logs
- **Object Storage** (sync) — User: 'Document Management'
- **Background Worker** (async) — Workflow automation and notifications run off the request path (user's feature list)
