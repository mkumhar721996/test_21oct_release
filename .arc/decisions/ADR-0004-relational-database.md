---
id: ADR-0004
category: component
title: Relational Database
status: accepted
superseded_by: null
component_id: comp_relational_database
responsibility: System of record for users, organizations, roles, workflows, tasks,
  document metadata, audit logs; also serves search and filtering until a dedicated
  search need is shown. Product open.
kind: infrastructure
split_reason: Backing service the project uses but does not build.
evidence: User's core features list (users, organizations, tasks, audit logs)
---

## Context

User's core features list (users, organizations, tasks, audit logs)

## Decision

System of record for users, organizations, roles, workflows, tasks, document metadata, audit logs; also serves search and filtering until a dedicated search need is shown. Product open.

Kept separate because Backing service the project uses but does not build..
