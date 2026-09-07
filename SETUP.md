# Setup

Drop these into an empty repo:

```
your-project/
├── CLAUDE.md                        # loaded every Claude Code session
├── docs/
│   ├── SPEC.md                      # full build specification
│   └── DESIGN.md                    # palette, product card, Thai typography
└── .claude/
    └── skills/
        └── phase/
            └── SKILL.md             # /phase command
```

Then:

```bash
cd your-project
git init
claude
```

First session — answer the open questions before any code is written:

```
Read CLAUDE.md, docs/SPEC.md and docs/DESIGN.md.
Then ask me the §14 open questions and every [DECIDE] item. Don't write any code yet.
```

Once those are answered, work phase by phase:

```
/phase 0
```

Review, then `/phase 1`, and so on through phase 11. Run `/clear` between phases — each phase skill
re-reads what it needs, so a fresh context is cheaper and more accurate than a long one.

Notes:

- `.claude/skills/` is the current form for custom commands. `.claude/commands/phase.md` with the
  same body still works if you prefer the older layout; if both exist, the skill wins.
- Answer the §14 questions in SPEC.md itself as they get settled, so the file stays the source of
  truth instead of the answers living in a chat log.
