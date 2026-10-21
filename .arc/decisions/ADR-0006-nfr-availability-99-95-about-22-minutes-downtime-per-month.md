---
id: ADR-0006
category: nfr
title: "NFR: availability \u2014 >= 99.95% (about 22 minutes downtime per month)"
status: accepted
superseded_by: null
dimension: availability
metric: monthly uptime of the Platform API and Web App
threshold: '>= 99.95% (about 22 minutes downtime per month)'
component_id: null
needs_dedicated_tracking: true
evidence: 'User: ''Large: tens of thousands, 99.95%+ multi-region''; threshold proposed
  from that wording'
---

## Context

User: 'Large: tens of thousands, 99.95%+ multi-region'; threshold proposed from that wording

## Decision

monthly uptime of the Platform API and Web App: >= 99.95% (about 22 minutes downtime per month)
