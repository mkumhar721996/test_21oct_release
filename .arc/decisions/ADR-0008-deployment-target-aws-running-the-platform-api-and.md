---
id: ADR-0008
category: deployment_target
title: "Deployment target: AWS, running the Platform API and Background Worker as\
  \ containers across\u2026"
status: accepted
superseded_by: null
component_id: null
decision: 'AWS, running the Platform API and Background Worker as containers across
  multiple availability zones; Web App served as a containerised or static-hosted
  frontend; prod and staging environments; active-passive multi-region: one primary
  region serving all traffic, with a read replica of the Relational Database, replicated
  Object Storage and a standby region for failover; specific regions and budget limits
  not stated.'
evidence: 'User: ''One primary region with a read replica and standby region (active-passive)'';
  meets the 99.95%+ multi-region requirement'
contested: true
alternatives_considered:
- 'Active-active across regions: better availability but needs multi-writer data and
  conflict handling'
- 'Stack per region: only warranted by data-residency rules, none stated'
consequences:
- Failover to the standby region needs a runbook and regular drills
- Replication lag means some data loss (RPO) is possible on failover
- Standby region adds ongoing cost
---

## Context

User: 'One primary region with a read replica and standby region (active-passive)'; meets the 99.95%+ multi-region requirement

## Decision

AWS, running the Platform API and Background Worker as containers across multiple availability zones; Web App served as a containerised or static-hosted frontend; prod and staging environments; active-passive multi-region: one primary region serving all traffic, with a read replica of the Relational Database, replicated Object Storage and a standby region for failover; specific regions and budget limits not stated.

## Alternatives considered

- Active-active across regions: better availability but needs multi-writer data and conflict handling
- Stack per region: only warranted by data-residency rules, none stated

## Consequences

- Failover to the standby region needs a runbook and regular drills
- Replication lag means some data loss (RPO) is possible on failover
- Standby region adds ongoing cost
