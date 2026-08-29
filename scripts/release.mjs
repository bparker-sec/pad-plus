#!/usr/bin/env node
// Cut a release: bump the version, commit it, and build the source zip.
//
// Why this exists:
//  - The deliverable zip is produced with `git archive`, which strips .git — so
//    a build made from the zip would otherwise report the version SHA as
//    "nogit". `.gitattributes` marks `.gitsha` as `export-subst`, so
//    `git archive` stamps the real commit hash into that file, and
//    vite.config.ts reads it at build time. Zip builds now report the correct
//    SHA automatically.
//  - The version is bumped here so every release advances package.json without
//    anyone remembering to.
//
// Usage:
//   npm run release            patch  1.0.0 -> 1.0.1  (default)
//   npm run release -- minor          1.0.0 -> 1.1.0
//   npm run release -- major          1.0.0 -> 2.0.0
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const bump = process.argv[2] ?? 'patch';
if (!['patch', 'minor', 'major'].includes(bump)) {
  console.error(`Unknown bump "${bump}". Use: patch | minor | major.`);
  process.exit(1);
}

const capture = (cmd) =>
  execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();

// Refuse to release a dirty tree — the zip must correspond to a real commit.
if (capture('git status --porcelain')) {
  console.error('Working tree not clean. Commit or stash changes before releasing.');
  process.exit(1);
}

// Bump package.json + package-lock.json only (we make the commit ourselves).
execSync(`npm version ${bump} --no-git-tag-version`, { stdio: 'inherit' });
const { version } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
);

// Commit the bump so `git archive HEAD` carries the new version and the
// export-subst SHA stamp resolves to this commit.
execSync('git add package.json package-lock.json', { stdio: 'inherit' });
execSync(`git commit -m "chore(release): v${version}"`, { stdio: 'inherit' });

const sha = capture('git rev-parse --short HEAD');
const zip = `pad-plus-src-v${version}.zip`;
execSync(`git archive --format=zip -o "${zip}" HEAD`, { stdio: 'inherit' });

console.log(`\nReleased v${version} (${sha}) -> ${zip}`);
