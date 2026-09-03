import { test, expect } from '@playwright/test';

test('app shell renders and accepts input without crashing', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  await page.goto('/');

  // Menu bar renders (the "white screen" regression class fails here).
  await expect(
    page.getByRole('button', { name: 'File', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Edit', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Search', exact: true }),
  ).toBeVisible();

  // The recovery boot-guard must NOT be showing.
  await expect(page.locator('#npp-boot-recovery')).toHaveCount(0);

  // Monaco mounts and accepts typing.
  const editor = page.locator('.monaco-editor').first();
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.type('hello pad plus');
  await expect(page.locator('.monaco-editor').first()).toContainText(
    'hello pad plus',
  );

  expect(pageErrors, `uncaught page errors: ${pageErrors.join('; ')}`).toEqual(
    [],
  );
});

test('File menu opens and New creates another tab', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByRole('menuitem', { name: 'New' }).click();
  await expect(page.getByText('new 2')).toBeVisible();
});

test('Help menu opens the About & License dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await page.getByRole('menuitem', { name: /About & License/ }).click();
  const dialog = page.getByRole('dialog', { name: 'About and license' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('GNU General Public License');
});
