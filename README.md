# Presents

Family birthday cards, their artwork, photographs, music, and browser code.

| Present | Public link | Source |
| --- | --- | --- |
| Ben’s birthday, 2025 | https://lkwbr.com/ben-bday-2025/ | `ben-bday-2025/` |
| Mom’s birthday, 2026 | https://lkwbr.com/mom-bday-2026/ | `mom-bday-2026/` |

## Publishing

GitHub is the source of truth and GitHub Pages is the production host for all
presents. Future changes deploy here. The existing Sites publication stays online
only as a legacy redirect; do not use Sites to host or publish these cards.

GitHub Pages publishes this repository’s `main` branch. The actual hosted paths are
`https://lkwbr.com/presents/ben-bday-2025/` and
`https://lkwbr.com/presents/mom-bday-2026/`.

The short public links and Ben’s original `https://lkwbr.com/bennyboo/` link are
redirects in `lkwbr/lkwbr.github.io`. Mom’s original Sites link also redirects here.
Edit the present in this repository and push to `main`; GitHub Pages publishes it.
No build or package installation is required.

## Local preview

Run `python3 -m http.server 8427` from the repository root, then open
`http://127.0.0.1:8427/mom-bday-2026/` or
`http://127.0.0.1:8427/ben-bday-2025/`.

## Source history

This repository was renamed from `lkwbr/bennyboo`, retaining its settings and
original commit history. Ben’s card and Mom’s published source history were arranged
with Git subtrees. Each present keeps its bundled assets beside its code. GitHub
redirects the old repository address to this repository.
