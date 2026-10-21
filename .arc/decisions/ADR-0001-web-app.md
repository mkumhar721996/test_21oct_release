---
id: ADR-0001
category: component
title: Web App
status: accepted
superseded_by: null
component_id: comp_web_app
responsibility: 'Browser UI for administrators and end users: registration/login,
  dashboards, search and filtering, task/workflow screens, document upload and browsing,
  reports, organization and user management.'
kind: web_ui
split_reason: Distinct client runtime (browser); user described a web-based platform
  for admins and end users.
talks_to:
- component_id: comp_platform_api
  interaction: sync
  evidence: 'Web client calls the API (user: web-based platform)'
evidence: 'User: ''A web-based platform ... support administrators and end users ...
  dashboards, search capabilities'''
---

## Context

User: 'A web-based platform ... support administrators and end users ... dashboards, search capabilities'

## Decision

Browser UI for administrators and end users: registration/login, dashboards, search and filtering, task/workflow screens, document upload and browsing, reports, organization and user management.

Kept separate because Distinct client runtime (browser); user described a web-based platform for admins and end users..

## Talks to

- **Platform API** (sync) — Web client calls the API (user: web-based platform)
