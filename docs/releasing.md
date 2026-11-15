# Releasing

Both layers, `@zooui/nuxt` and `@zooui/theme-forest`, release to the public npm registry
(`publishConfig.access: public`) through **shiprig**, publishing with npm trusted publishing: each package names
`release.yml` and the `release` environment as its trusted publisher, and the run's OIDC token is the only
credential. The theme ships no font files of its own.

1. **In each PR with a user-facing change**, record it: `changerig add -t fix -p @zooui/nuxt -m "…"` (or `-p @zooui/theme-forest`)
   (`feat` for features). The entry is written for the changelog's reader, and links its commit and PR.
2. **To release: merge the release PR, done.** shiprig's action
   (`.github/workflows/release.yml`, `rigsmith/shiprig-action`, settings in `.github/shiprig-action.jsonc`) works the
   way release-please does, on every push to `main` of zooui-dev/zooui (anywhere else it does nothing):
   - With changesets pending, it keeps a standing **release PR** (`chore: release …`) up to date: `shiprig version`
     bumps the versions and writes each package's `CHANGELOG.md`. This needs no approval and no secret.
   - Merge that PR, and the run for the merge publishes: merging is the approval. Its **Publish** job runs in the
     `release` environment, which both packages' npm trusted publishers name, so no other job can publish. It checks every package
     it would publish has a `## <version>` entry in its `CHANGELOG.md` (the GitHub release is made from it) and stops
     with nothing published if one doesn't, then `shiprig publish` packs each layer with pnpm (which rewrites the
     theme's `workspace:*` dependency on the base to the exact version) and npm publishes it with provenance. It
     pushes the tags and makes a GitHub release per package from its changelog entry.
   - Any other push does nothing.
   - **Rehearse** any time: Actions → **Release** → Run workflow, with `dry_run` ticked (the default). It shows the
     release PR it would open or what it would publish, with no approval and no secret, and changes nothing. With
     `dry_run` unticked, a manual run does what a push does: the way to retry a publish that failed or was rejected.
   - **Locally**, `shiprig release --dry-run` previews the whole pipeline (`.changeset/release.jsonc`). A real local
     publish is refused: `node.provenance` is `"always"` (`.changeset/config.json`), and npm provenance can only be
     made in GitHub Actions.
3. **Design source changes** (`packages/theme-forest/design/`) are `@zooui/theme-forest` changes: record them with
   `changerig add -p @zooui/theme-forest`. Like any change to `@zooui/theme-forest`, it is recorded in the theme's changeset and appears in the theme's changelog.

Don't edit the version or changelog by hand, and don't `pnpm publish` directly: `changerig` owns both.
