# Publishing Guide

## Prerequisites

```bash
npm login
pnpm install
```

## Workflow

```bash
# 1. Bump versions
pnpm version:patch      # or minor/major

# 2. Build
pnpm build

# 3. Dry run
pnpm publish:check

# 4. Publish
pnpm publish:all

# 5. Tag release
VERSION=$(node -p "require('./packages/vibelint-commit/package.json').version")
git add . && git commit -m "chore: release v${VERSION}"
git tag "v${VERSION}" && git push && git push --tags
```

## Individual Packages

Each publish command automatically builds before publishing:

```bash
pnpm publish:plugin   # Builds then publishes plugin
pnpm publish:commit   # Builds then publishes commit tool
pnpm publish:approval # Builds then publishes wizard
pnpm publish:setup    # Builds then publishes setup CLI
```

## Troubleshooting

- **Permission denied**: `npm whoami` and check scope access
- **Version exists**: `pnpm version:patch` then retry
- **Build errors**: Check `dist/` folders exist after `pnpm build`
