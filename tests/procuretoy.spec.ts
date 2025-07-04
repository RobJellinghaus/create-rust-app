import { test, expect } from '@playwright/test';

test('todos page shows empty state', async ({ page }) => {
  // 1. Connect to http://localhost:3000
  await page.goto('http://localhost:3000');

  // 2. Click the top nav bar button with the label 'Todos'
  await page.click('text=Todos');

  // 3. Check that the page says 'No todos, create one!'
  await expect(page.locator('text=No todos, create one!')).toBeVisible();
});

test('todos page allows adding and deleting new todo', async ({ page }) => {
  // 1. Go to http://localhost:3000
  await page.goto('http://localhost:3000');

  // 2. Click the nav button named 'Todos'
  await page.click('text=Todos');

  // 3. Click in the text entry box which says 'New todo...'
  await page.click('input[placeholder="New todo..."]');

  // 4. Enter the text "Test todo from Playwright"
  await page.fill('input[placeholder="New todo..."]', 'Test todo from Playwright');

  // 5. Click the 'Add' button
  await page.click('button:has-text("Add")');

  // 6. Check that the page now has the text "#1 Test todo from Playwright"
  await expect(page.locator('text=Test todo from Playwright')).toBeVisible();

  // 7. Click the link named 'delete'
  await page.click('text=delete');

  // 8. Verify the page now has the text "No todos, create one!"
  await expect(page.locator('text=No todos, create one!')).toBeVisible();
});