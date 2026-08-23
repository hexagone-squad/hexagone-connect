import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  startWorkQualificationStack,
  type WorkQualificationStack,
} from './support/work-qualification-stack.js';

let stack: WorkQualificationStack;
let baseUrl: string;

test.beforeEach(async () => {
  stack = await startWorkQualificationStack(4174, 4104);
  baseUrl = stack.baseUrl;
});

test.afterEach(() => {
  stack.stop();
});

test('qualifies with the keyboard and exposes accessible audit evidence', async ({ page }) => {
  await page.goto(baseUrl);
  await expect(page.getByRole('heading', { level: 1, name: 'Qualification queue' })).toBeVisible();
  const qualify = page.getByRole('button', { name: 'Qualify request' });
  await expect(qualify).toBeVisible();

  await qualify.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: 'Queue clear' })).toBeVisible();
  await expect(page.getByText('Correlation ID')).toBeVisible();
  await expect(page.getByText('Work request qualified')).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test('reproduces empty, authorization, and service states', async ({ page }) => {
  await page.goto(baseUrl);
  const scenario = page.getByLabel('Demo scenario');

  await scenario.click();
  await page.getByRole('option', { name: 'Empty queue' }).click();
  await expect(
    page.getByText('There are no synthetic work requests awaiting qualification.'),
  ).toBeVisible();

  await scenario.click();
  await page.getByRole('option', { name: 'Access denied' }).click();
  await page.getByRole('button', { name: 'Qualify request' }).click();
  await expect(page.getByRole('alert')).toContainText('You do not have access');

  await scenario.click();
  await page.getByRole('option', { name: 'Service unavailable' }).click();
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
});

test('keeps controls readable at a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto(baseUrl);
  await expect(page.getByLabel('Demo scenario')).toBeInViewport();
  const qualify = page.getByRole('button', { name: 'Qualify request' });
  await qualify.scrollIntoViewIfNeeded();
  await expect(qualify).toBeInViewport();
  await expect(qualify).toBeVisible();
});
