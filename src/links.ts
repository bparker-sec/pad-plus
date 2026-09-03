// External links (source, issues, license) and a prefilled bug-report URL.
import { buildLabel } from './buildInfo';

export const REPO_URL = 'https://github.com/bparker-sec/notepadplus_webapp';
export const ISSUES_URL = `${REPO_URL}/issues`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
export const CHANGELOG_URL = `${REPO_URL}/blob/main/CHANGELOG.md`;

/** A "new issue" URL prefilled with a bug template and the current build info. */
export function bugReportUrl(): string {
  const body = [
    '**Describe the bug**',
    '',
    '**Steps to reproduce**',
    '1. ',
    '',
    '**Expected vs. actual**',
    '',
    '---',
    `Build: ${buildLabel()}`,
    `User agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a'}`,
  ].join('\n');
  const params = new URLSearchParams({
    title: '[bug] ',
    labels: 'bug',
    body,
  });
  return `${REPO_URL}/issues/new?${params.toString()}`;
}

/** Open a URL in a new tab, safely. */
export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
