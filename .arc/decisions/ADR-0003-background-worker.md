---
id: ADR-0003
category: component
title: Background Worker
status: accepted
superseded_by: null
component_id: comp_background_worker
responsibility: 'One worker for all asynchronous jobs: workflow automation steps,
  notifications and alerts delivery, report generation, search indexing, outbound
  webhook delivery.'
kind: worker
split_reason: Background work that should not block API requests; kept as one worker
  until a job has its own NFR.
talks_to:
- component_id: comp_relational_database
  interaction: sync
  evidence: Worker reads/updates workflow and notification state
- component_id: comp_object_storage
  interaction: sync
  evidence: Report generation and indexing read documents
evidence: 'User: ''workflow automation'', ''Notifications & Alerts'', ''reporting'',
  ''Webhook Integrations'''
---

## Context

User: 'workflow automation', 'Notifications & Alerts', 'reporting', 'Webhook Integrations'

## Decision

One worker for all asynchronous jobs: workflow automation steps, notifications and alerts delivery, report generation, search indexing, outbound webhook delivery.

Kept separate because Background work that should not block API requests; kept as one worker until a job has its own NFR..

## Talks to

- **Relational Database** (sync) — Worker reads/updates workflow and notification state
- **Object Storage** (sync) — Report generation and indexing read documents
