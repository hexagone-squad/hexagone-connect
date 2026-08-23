import { expect, test } from '@playwright/test';
import {
  startWorkQualificationStack,
  type WorkQualificationStack,
} from './support/work-qualification-stack.js';

let stack: WorkQualificationStack;
let baseUrl: string;

test.beforeAll(async () => {
  stack = await startWorkQualificationStack(4175, 4105);
  baseUrl = stack.baseUrl;
});

test.afterAll(() => stack.stop());

test('qualifies a synthetic request through the reusable React view', async ({ page }) => {
  await page.goto(baseUrl);
  await expect(page.getByRole('heading', { level: 1, name: 'Qualification queue' })).toBeVisible();
  await page.getByRole('button', { name: 'Qualify request' }).click();
  await expect(page.getByRole('heading', { name: 'Queue clear' })).toBeVisible();
  await expect(page.getByText('Work request qualified')).toBeVisible();
});
