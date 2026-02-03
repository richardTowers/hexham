import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

test.describe('Cache busting version', () => {
  test('all version strings in index.html match VERSION file', () => {
    const rootDir = join(import.meta.dirname, '..');

    const version = readFileSync(join(rootDir, 'VERSION'), 'utf-8').trim();
    const indexHtml = readFileSync(join(rootDir, 'index.html'), 'utf-8');

    // Find all ?v=X patterns in index.html
    const versionPattern = /\?v=([^"'\s]+)/g;
    const matches = [...indexHtml.matchAll(versionPattern)];

    expect(matches.length).toBeGreaterThan(0);

    const mismatched = matches
      .filter(match => match[1] !== version)
      .map(match => match[0]);

    expect(mismatched, `Expected all versions to be "${version}", but found: ${mismatched.join(', ')}`).toEqual([]);
  });

  test('all src/*.js files are in the import map', () => {
    const rootDir = join(import.meta.dirname, '..');

    const srcFiles = readdirSync(join(rootDir, 'src'))
      .filter(f => f.endsWith('.js'));

    const indexHtml = readFileSync(join(rootDir, 'index.html'), 'utf-8');

    // Extract the import map JSON
    const importMapMatch = indexHtml.match(/<script type="importmap">\s*([\s\S]*?)\s*<\/script>/);
    expect(importMapMatch, 'Could not find import map in index.html').toBeTruthy();

    const importMap = JSON.parse(importMapMatch[1]);
    const scopedImports = importMap.scopes?.['./src/'] || {};

    // Check each src file (except main.js which is the entry point)
    const missing = srcFiles
      .filter(f => f !== 'main.js')
      .filter(f => !(`./${f}` in scopedImports));

    expect(missing, `Missing from import map: ${missing.join(', ')}`).toEqual([]);
  });
});
