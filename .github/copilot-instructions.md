# GitHub Copilot Instructions for Prayer App

## Testing Preferences

- **Never run vitest in watch mode** - Always use `npm test -- --run` or `npm test` with the `--run` flag
- When running tests, use the `runTests` tool instead of terminal commands when possible
- Do not use `npm test` without the `--run` flag as it starts watch mode

## Code Style

- Use standalone Angular components (no NgModule)
- Prefer OnPush change detection strategy
- Use multi_replace_string_in_file for multiple independent edits
- Include 3-5 lines of context in replace operations

## Documentation

- Do NOT create summary markdown files after changes unless explicitly requested
- Update existing documentation (CHANGELOG.md, DEVELOPMENT.md) for significant changes
- Keep responses concise and direct
