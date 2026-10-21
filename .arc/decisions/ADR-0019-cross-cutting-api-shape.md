---
id: ADR-0019
category: cross_cutting
title: 'Cross-cutting: API shape'
status: accepted
superseded_by: null
component_id: null
decision: One Platform API serves the Web App and external API clients directly, with
  no gateway or BFF; rate limiting, auth and TLS are handled in the API and the load
  balancer.
evidence: 'User: ''Single API, no gateway'''
contested: true
alternatives_considered:
- 'Single API behind a gateway: central throttling and routing, extra component not
  yet needed'
- 'One API per domain behind a gateway: no team or NFR driver to split by domain'
consequences:
- Public API and webhook management share the same deployable as the web client's
  API
- A gateway or domain split can be added later if a driver appears
---

## Context

User: 'Single API, no gateway'

## Decision

One Platform API serves the Web App and external API clients directly, with no gateway or BFF; rate limiting, auth and TLS are handled in the API and the load balancer.

## Alternatives considered

- Single API behind a gateway: central throttling and routing, extra component not yet needed
- One API per domain behind a gateway: no team or NFR driver to split by domain

## Consequences

- Public API and webhook management share the same deployable as the web client's API
- A gateway or domain split can be added later if a driver appears
