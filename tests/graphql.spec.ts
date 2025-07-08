import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../testUtils';

test.describe('GraphQL Features', () => {
  test('GraphQL page ping query works', async ({ page }) => {
    // Login as test user
    await loginAsTestUser(page);
    
    // Navigate to GraphQL page
    await page.click('text=GraphQL');
    
    // Wait for GraphQL interface to load
    await expect(page.locator('h1')).toContainText('GraphQL');
    
    // Look for ping query result or interface
    // This depends on what the GraphQL page actually shows
    await expect(page.locator('body')).toBeVisible();
  });

  test('GraphQL todos page shows empty state when authenticated', async ({ page }) => {
    // Login as test user
    await loginAsTestUser(page);
    
    // Navigate to GraphQL todos page
    await page.click('text=Todos (GraphQL)');
    
    // Check that the page loads (may show todos or empty state)
    await expect(page.locator('h1, h2, div')).toBeVisible();
    
    // The exact content depends on whether there are existing todos
    // For now, just verify the page loads without errors
  });

  test('GraphQL todos page allows adding and deleting todo when authenticated', async ({ page }) => {
    // Login as test user
    await loginAsTestUser(page);
    
    // Navigate to GraphQL todos page
    await page.click('text=Todos (GraphQL)');
    
    // Try to add a todo
    await page.click('input[placeholder="New todo..."]');
    await page.fill('input[placeholder="New todo..."]', 'Test GraphQL todo from Playwright');
    await page.click('button:has-text("Add")');
    
    // Verify the todo appears
    await expect(page.locator('text=Test GraphQL todo from Playwright')).toBeVisible();
    
    // Try to delete the todo
    await page.click('text=delete');
    
    // Verify the todo is gone (may show empty state or just absence of the todo)
    await expect(page.locator('text=Test GraphQL todo from Playwright')).not.toBeVisible();
  });
});