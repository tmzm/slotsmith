---
name: release
description: Cut a slotsmith release - bump slotsmith and slotsmith-ai together, write the changelog entry, verify, and publish both packages to npm.
disable-model-invocation: true
argument-hint: "<version, e.g. 1.8.0>"
---

# Release $ARGUMENTS

`slotsmith` (root) and `slotsmith-ai` (`packages/ai`) are released together
and always carry the same version, because the AI package's knowledge is
generated from the library at that version.

## 1. Preconditions

- Working tree clean (`git status`), on `master`, up to date with `origin`.
- Stop and ask if either holds:
  - `$ARGUMENTS` is not newer than the `version` in `package.json`.
  - The changes since the last release don't match the bump: breaking changes
    need a major, new features a minor, fixes only a patch.

## 2. Changelog

Read the commits since the last release: `git log v<previous>..HEAD --oneline`.
Releases before tagging started have no tag; for those, find the previous
version bump with `git log -1 --format=%H -S'"version"' -- package.json` and
log from there. Add an entry at the top of the
`## Changelog` section in `README.md`, in the existing style:

- First bullet: `**<version>** — ` and a summary paragraph that links to the
  README sections it touches.
- Further bullets for details: new props, slots and labels by name, behaviour
  changes, deprecations, and fixes.
- Write for library users. Never name clients or other projects.

The docs site parses this section for its changelog page, so keep the format.

## 3. Bump

Set `"version": "$ARGUMENTS"` in both `package.json` and
`packages/ai/package.json`.

## 4. Verify

```bash
pnpm install --frozen-lockfile
pnpm typecheck && pnpm test && pnpm build
pnpm typecheck:ai && pnpm test:ai && pnpm build:ai
pnpm --filter slotsmith-docs check
```

Every command must pass. Don't continue on a failure; report it.

## 5. Commit and tag

One commit, single-line message, no attribution lines:

```bash
git add package.json packages/ai/package.json README.md packages/ai/knowledge
git commit -m "chore: release $ARGUMENTS"
git tag v$ARGUMENTS
```

## 6. Publish

Publishing is outward-facing and cannot be undone: confirm with the user
before running it, and before pushing.

```bash
npm publish                        # slotsmith, from the root
cd packages/ai && npm publish      # slotsmith-ai; prepack rebuilds it
git push origin master --tags
```

The npm account needs a granular token with 2FA bypass; classic tokens and
`--otp` are rejected. A new version can take a few minutes to appear, so
verify with a fresh install (`npm view slotsmith@$ARGUMENTS version`) rather
than trusting the publish output.
