# Changelog

All notable changes to `lintmyvibe` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.11] - 2025-12-15

### Fixed

- Fixed issue where newly installed packages were being lost when updating package.json scripts
- Now uses `npm pkg set` (official npm API) to add scripts, preserving all package.json content

### Changed

- Script name changed from `commit-lint` to `commit-wizard` for better clarity
- Updated to use new ESLint plugin configs style (`...vibelintPlugin.configs.recommended`)
- Updated package references to new names:
  - `@vibelint/eslint-plugin-suppress-approved` → `@vibelint/eslint-plugin-vibelint`
  - `@vibelint/eslint-warning-approval` → `@vibelint/vibelint-wizard`
  - `@vibelint/roasted-commit` → `@vibelint/vibelint-commit`

## [0.1.10] - Previous

### Changed

- Packages are now installed with `@latest` tag to ensure latest versions are always fetched

## [0.1.5] - Previous

### Added

- Initial release with setup CLI for VibeLint packages
- Interactive prompts for tool selection
- Auto-detection of package manager and ESLint config
- Support for npm, pnpm, and yarn
- Installation of @vibelint/vibelint-commit
- Installation of @vibelint/vibelint-wizard
- Installation of @vibelint/eslint-plugin-vibelint
- Automatic script addition to package.json
