---
description: Fetch and align clean JJ repositories below a directory with an explicit base revision.
argument-hint: "<target-directory> <base-revision>"
---

# Sync JJ Repositories

Synchronize the root workspaces of all Jujutsu repositories below the supplied
directory.

```text
/sync-master <target-directory> <base-revision>
```

Examples:

```text
/sync-master ~/work/venture-falcon/npv1 main@origin
/sync-master ~/work/venture-falcon/npv1 master@origin
```

Do not guess the remote default branch. The caller supplies the base revision.

1. Recursively discover Jujutsu repository root workspaces below
   `<target-directory>`. Filter out every directory matching `*.workspaces`:
   do not descend into it or operate on it. Ignore non-repository directories
   and handle each discovered root workspace once.
2. For each discovered root workspace, run `jj git fetch`.
3. If fetching fails, record `failed: <command error>` and continue.
4. If the root workspace's working-copy commit has local changes, record
   `skipped: local working-copy changes` and leave it untouched.
5. If `<base-revision>` does not exist after the fetch, record
   `skipped: base revision unavailable` and leave the workspace untouched.
6. Run `jj new <base-revision>`. If it fails, record
   `failed: <command error>` and continue. Otherwise record `aligned`.
7. Print a concise final per-repository report with one outcome per repository.

Do not create, amend, rebase, abandon, or push bookmarks or commits. The only
allowed new commit is the empty working-copy commit created by `jj new` for an
aligned repository.
