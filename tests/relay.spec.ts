import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../testUtils';

test.describe('Relay Todo Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.click('text=Todos (REST)');
    await page.waitForLoadState('networkidle');

    // clean up any stale todos
    while (((await page.locator('text=delete').all()).length) > 0) {
      {
          // Get all elements matching the locator
          const deleteElements = await page.locator('text=delete').all();
          console.log(`Found ${deleteElements.length} delete elements`);

          for (let i = 0; i < deleteElements.length; i++) {
            const element = deleteElements[i];
            console.log(`Element ${i}:`);
            console.log(`  innerHTML: ${await element.innerHTML()}`);
            console.log(`  textContent: ${await element.textContent()}`);
            console.log(`  isVisible: ${await element.isVisible()}`);
            console.log(`  outerHTML: ${await element.evaluate(el => el.outerHTML)}`);
          }
      }

      await page.screenshot({ path: 'todos-rest-delete-debug.png' });
      console.log('text=delete is visible; clicking it');
      await page.locator('text=delete').first().click();
      await page.waitForLoadState('networkidle');
      // Wait for stability, 1/10 sec
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('text=delete no longer visible, navigating to Todos (Relay)');
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
    // First add a todo via REST to ensure we have data
    await page.click('text=Todos (REST)');
    await page.fill('input[placeholder="New todo..."]', 'Test Relay Display');
    await page.click('button:has-text("Add")');
    await expect(page.locator('text=Test Relay Display')).toBeVisible();

    // Now check if it shows up in Relay version
    await page.click('text=Todos (Relay)');
    // Take a screenshot for debugging
    await page.screenshot({ path: 'todos-relay-page-1-debug.png' });
    // Flip back to REST and shoot that
    await page.click('text=Todos (REST)');
    await page.screenshot({ path: 'todos-rest-page-1-debug.png' });
    // And repeat
    await page.click('text=Todos (Relay)');
    await page.screenshot({ path: 'todos-relay-page-2-debug.png' });

    await expect(page.locator('text=Test Relay Display')).toBeVisible();
    
    // Clean up - delete the todo via REST
    await page.click('text=Todos (REST)');
    await page.click('text=delete');
    await page.screenshot({ path: 'todos-rest-page-2-debug.png' });
    
    // Verify the todo is gone from REST page
    await expect(page.locator('text=Test Relay Display')).not.toBeVisible();
    await expect(page.locator('text=No todos, create one!')).toBeVisible();
    
    // Now verify that Relay page also shows empty state
    await page.click('text=Todos (Relay)');
    await expect(page.locator('text=Test Relay Display')).not.toBeVisible();
    await expect(page.locator('text=No todos, create one!')).toBeVisible();
  });

  test('should show active form elements for adding todos', async ({ page }) => {
    // Check that the input field is enabled
    await expect(page.locator('input[placeholder="New todo..."]')).toBeEnabled();
    
    // Check that the Add button shows correct text and is initially disabled (empty input)
    await expect(page.locator('button:has-text("Add")')).toBeVisible();
    await expect(page.locator('button:has-text("Add")')).toBeDisabled();
    
    // When text is entered, button should be enabled
    await page.fill('input[placeholder="New todo..."]', 'Test input');
    await expect(page.locator('button:has-text("Add")')).toBeEnabled();
  });

  test('should show disabled pagination controls', async ({ page }) => {
    // Check that pagination buttons are disabled
    await expect(page.locator('button:has-text("<< (Coming Soon)")')).toBeDisabled();
    await expect(page.locator('button:has-text(">> (Coming Soon)")')).toBeDisabled();
  });

  test('should show disabled edit and delete links', async ({ page }) => {
    // First add a todo via REST to have something to test
    await page.click('text=Todos (REST)');
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
    await page.click('text=Todos (REST)');
    await page.click('text=delete');
  });

  test('should display todo information correctly', async ({ page }) => {
    // Add a todo via REST
    await page.click('text=Todos (REST)');
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
    await page.click('text=Todos (REST)');
    await page.click('text=delete');
  });

  test('should show correct page information', async ({ page }) => {
    // Check that page information is displayed
    await expect(page.locator('text=Page 1 of 1')).toBeVisible();
  });

  test('should navigate properly between Todo implementations', async ({ page }) => {
    // Start at Relay page
    await expect(page.locator('h1:has-text("Todos (Relay)")')).toBeVisible();
    
    // Navigate to REST
    await page.click('text=Todos (REST)');
    await expect(page.locator('h1:has-text("Todos")')).toBeVisible();
    
    // Navigate back to Relay
    await page.click('text=Todos (Relay)');
    await expect(page.locator('h1:has-text("Todos (Relay)")')).toBeVisible();
  });

  test('should maintain consistent UI structure with REST version', async ({ page }) => {
    // Check that the main container structure matches other Todo page
    await expect(page.locator('div[style*="display: flex"][style*="flexFlow: column"]')).toBeVisible();
    
    // Check that Form class containers are present
    await expect(page.locator('.Form')).toBeVisible();
    
    // Check that the layout matches the expected structure
    await expect(page.locator('h1:has-text("Todos (Relay)")')).toBeVisible();
  });

  test('should allow adding a new todo item', async ({ page }) => {
    // Initially should show empty state
    await expect(page.locator('text=No todos, create one!')).toBeVisible();
    
    // Fill in the input field
    const todoText = 'Test Relay Todo from Playwright';
    await page.fill('input[placeholder="New todo..."]', todoText);
    
    // Verify button is enabled
    await expect(page.locator('button:has-text("Add")')).toBeEnabled();
    
    // Click the Add button
    await page.click('button:has-text("Add")');
    
    // Wait for the page to reload and check that the todo appears
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`text=${todoText}`)).toBeVisible();
    
    // Verify the input field is cleared
    await expect(page.locator('input[placeholder="New todo..."]')).toHaveValue('');
    
    // Verify the todo has an ID number displayed
    await expect(page.locator('text=#')).toBeVisible();
    
    // Clean up by deleting via REST (since Relay delete isn't implemented yet)
    await page.click('text=Todos (REST)');
    await page.click('text=delete');
  });

  test('should support Enter key to add todo', async ({ page }) => {
    // Fill in the input field
    const todoText = 'Test Relay Enter Key Todo';
    await page.fill('input[placeholder="New todo..."]', todoText);
    
    // Press Enter key
    await page.press('input[placeholder="New todo..."]', 'Enter');
    
    // Wait for the page to reload and check that the todo appears
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`text=${todoText}`)).toBeVisible();
    
    // Clean up
    await page.click('text=Todos (GraphQL)');
    await page.click('text=delete');
  });

  test('should not add empty todos', async ({ page }) => {
    // Try to click Add button without entering text
    await expect(page.locator('button:has-text("Add")')).toBeDisabled();
    
    // Try with only whitespace
    await page.fill('input[placeholder="New todo..."]', '   ');
    await expect(page.locator('button:has-text("Add")')).toBeDisabled();
    
    // Add some text and then clear it
    await page.fill('input[placeholder="New todo..."]', 'test');
    await expect(page.locator('button:has-text("Add")')).toBeEnabled();
    
    await page.fill('input[placeholder="New todo..."]', '');
    await expect(page.locator('button:has-text("Add")')).toBeDisabled();
  });
});