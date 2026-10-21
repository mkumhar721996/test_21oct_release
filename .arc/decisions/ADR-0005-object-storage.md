---
id: ADR-0005
category: component
title: Object Storage
status: accepted
superseded_by: null
component_id: comp_object_storage
responsibility: Stores uploaded document files; metadata lives in the Relational Database.
  Product open.
kind: managed_service
split_reason: Backing service for binary document storage, different from relational
  data.
evidence: 'User: ''Document Management'''
---

## Context

User: 'Document Management'

## Decision

Stores uploaded document files; metadata lives in the Relational Database. Product open.

Kept separate because Backing service for binary document storage, different from relational data..
