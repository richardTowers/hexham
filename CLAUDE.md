# Hexham

Hexagonal pathfinding visualizer.

## Commands

- `npm test` - Run all Playwright tests
- `npx serve .` - Start local dev server on port 3000

## Before committing

1. Run `npm test` to verify all tests pass
2. If you modified JS files, ensure JSDoc types are correct - `npm run check`

## Cache busting

When deploying changes to JS files:

1. Update the version in `VERSION`
2. Update all `?v=X` strings in `index.html` to match: `sed -i 's/?v=OLD/?v=NEW/g' index.html`
3. If you added a new module to `src/`, add it to the import map in `index.html`

Tests will fail if versions are inconsistent or modules are missing from the import map.
