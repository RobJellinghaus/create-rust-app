import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../../testUtils';

test.describe('Relay Todo Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.click('text=Todos (Relay)');
  });

  test('should display Relay todos page', async ({ page }) => {
    await expect(page.locator('h1:has-text("Todos (Relay)")')).toBeVisible();
  });

  test('should show empty state when no todos', async ({ page }) => {
    // Check for empty state message
    await expect(page.locator('text=No todos, create one!')).toBeVisible();
  });

  test('should display existing todos', async ({ page }) => {
    // First add a todo via GraphQL to ensure we have data
    await page.click('text=Todos (GraphQL)');
    await page.fill('input[placeholder="New todo..."]', 'Test Relay Display');
    await page.click('button:has-text("Add")');
    await expect(page.locator('text=Test Relay Display')).toBeVisible();

    // Now check if it shows up in Relay version
    await page.click('text=Todos (Relay)');
    await expect(page.locator('text=Test Relay Display')).toBeVisible();
    
    // Clean up
    await page.click('text=Todos (GraphQL)');
    await page.click('text=delete');
  });

  test('should show disabled form elements with "Coming Soon" text', async ({ page }) => {
    // Check that the input field is disabled
    await expect(page.locator('input[placeholder="New todo..."]')).toBeDisabled();
    
    // Check that the Add button is disabled and shows "Coming Soon"
    await expect(page.locator('button:has-text("Add (Coming Soon)")')).toBeDisabled();
  });

  test('should show disabled pagination controls', async ({ page }) => {
    // Check that pagination buttons are disabled
    await expect(page.locator('button:has-text("<< (Coming Soon)")')).toBeDisabled();
    await expect(page.locator('button:has-text(">> (Coming Soon)")')).toBeDisabled();
  });

  test('should show disabled edit and delete links', async ({ page }) => {
    // First add a todo via GraphQL to have something to test
    await page.click('text=Todos (GraphQL)');
    await page.fill('input[placeholder="New todo..."]', 'Test Relay Actions');
    await page.click('button:has-text("Add")');
    await expect(page.locator('text=Test Relay Actions')).toBeVisible();

    // Go back to Relay page
    await page.click('text=Todos (Relay)');
    await expect(page.locator('text=Test Relay Actions')).toBeVisible();

    // Check that edit and delete links are present but don't have functionality
    await expect(page.locator('a:has-text("edit")')).toBeVisible();
    await expect(page.locator('a:has-text("delete")')).toBeVisible();
    
    // Clean up
    await page.click('text=Todos (GraphQL)');
    await page.click('text=delete');
  });

  test('should display todo information correctly', async ({ page }) => {
    // Add a todo via GraphQL
    await page.click('text=Todos (GraphQL)');
    await page.fill('input[placeholder="New todo..."]', 'Test Relay Info Display');
    await page.click('button:has-text("Add")');
    await expect(page.locator('text=Test Relay Info Display')).toBeVisible();

    // Check display in Relay version
    await page.click('text=Todos (Relay)');
    
    // Check that todo text is displayed
    await expect(page.locator('text=Test Relay Info Display')).toBeVisible();
    
    // Check that todo ID is displayed (format: #1 Todo text)
    await expect(page.locator('text=#')).toBeVisible();
    
    // Clean up
    await page.click('text=Todos (GraphQL)');
    await page.click('text=delete');
  });

  test('should show correct page information', async ({ page }) => {
    // Check that page information is displayed
    await expect(page.locator('text=Page 1 of 1')).toBeVisible();
  });

  test('should navigate properly between Todo implementations', async ({ page }) => {
    // Start at Relay page
    await expect(page.locator('h1:has-text("Todos (Relay)")')).toBeVisible();
    
    // Navigate to GraphQL
    await page.click('text=Todos (GraphQL)');
    await expect(page.locator('h1:has-text("Todos (GraphQL)")')).toBeVisible();
    
    // Navigate to REST
    await page.click('text=Todos (REST)');
    await expect(page.locator('h1:has-text("Todos")')).toBeVisible();
    
    // Navigate back to Relay
    await page.click('text=Todos (Relay)');
    await expect(page.locator('h1:has-text("Todos (Relay)")')).toBeVisible();
  });

  test('should maintain consistent UI structure with GraphQL version', async ({ page }) => {
    // Check that the main container structure matches other Todo pages
    await expect(page.locator('div[style*="display: flex"][style*="flexFlow: column"]')).toBeVisible();
    
    // Check that Form class containers are present
    await expect(page.locator('.Form')).toBeVisible();
    
    // Check that the layout matches the expected structure
    await expect(page.locator('h1:has-text("Todos (Relay)")')).toBeVisible();
  });
});