---
name: Bug report
about: Something on cidapt.com or in the admin is broken
title: ""
labels: ["bug"]
assignees: []
---

**What were you doing**
Page or flow, and what you clicked/typed. Uploads: note file type, size and how you
added them (drag-drop, file picker, Ctrl+V).

**What happened**
Error text verbatim (English or Thai), screenshot, or the admin URL that failed.

**What should have happened**

**Environment**
- Local dev (`docker compose -f docker-compose.dev.yml up`) or production VM?
- If local: does `docker ps` show `cidaplus-dev-web-1` as healthy?

**Logs**
Paste the relevant lines from `docker logs cidaplus-dev-web-1` if you can reach it.