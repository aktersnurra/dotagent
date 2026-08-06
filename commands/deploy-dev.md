---
description: Move the dev tag to the current Jujutsu working-copy commit and deploy it.
---

Deploy the current Jujutsu working-copy commit (`@`) to dev.

1. Invoke the `dev-tag-deployment` skill and follow it.
2. Fetch remotes with `jj git fetch`.
3. Verify that `@` descends from `master@origin`. Refuse to tag if it does not.
4. Resolve the full Git commit ID with `jj log --no-graph -r "@" --template 'commit_id ++ "\n"'`. Do not use Git `HEAD`.
5. Replace the existing `dev` tag with that commit and force-push it to `origin`.
6. Report the deployed commit ID and the result of the tag push.

Do not create, amend, rebase, or push any bookmarks. This command moves only the `dev` tag.
