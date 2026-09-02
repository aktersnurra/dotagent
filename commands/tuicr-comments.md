---
description: Read saved comments from an active tuicr review session.
argument-hint: "[workspace]"
---

# Read tuicr Comments

Use the supplied `<workspace>` when present; otherwise use the current working
folder as the repository selector.

1. Run:

   ```sh
   tuicr review list --repo <workspace>
   ```

2. If exactly one session is active, use its slug. If none are active, run
   `tuicr review list --all` and use its sole active session when unambiguous.
   If multiple sessions are active, ask the user which session to read; include
   the available slugs and repository paths.

3. Read the selected session:

   ```sh
   tuicr review comments --repo <workspace> --session <slug>
   ```

4. Treat the returned comments as the user's review feedback. Prioritize
   `issue` comments before suggestions and notes. If there are no comments,
   state that clearly without assuming the review is complete.
