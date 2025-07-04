import { test, expect } from '@playwright/test';

test('todos page shows empty state', async ({ page }) => {
  // 1. Connect to http://localhost:3000
  await page.goto('http://localhost:3000');

  // 2. Click the top nav bar button with the label 'Todos'
  await page.click('text=Todos');

  // 3. Check that the page says 'No todos, create one!'
  await expect(page.locator('text=No todos, create one!')).toBeVisible();
});