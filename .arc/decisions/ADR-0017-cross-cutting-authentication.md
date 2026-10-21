---
id: ADR-0017
category: cross_cutting
title: 'Cross-cutting: Authentication'
status: accepted
superseded_by: null
component_id: null
decision: Registration, login and credential storage are built into the Platform API
  (no external identity provider, no SSO for now); passwords stored hashed, sessions/tokens
  issued by the API and checked against RBAC.
evidence: 'User: ''Built into the API'''
---

## Context

User: 'Built into the API'

## Decision

Registration, login and credential storage are built into the Platform API (no external identity provider, no SSO for now); passwords stored hashed, sessions/tokens issued by the API and checked against RBAC.
