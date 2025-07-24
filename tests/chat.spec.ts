import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../testUtils';

test.describe('Chat Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.waitForLoadState('networkidle');

    console.log('Navigating to chat page...');

    // Navigate to chat page
    await page.click('a:has-text("Chat")');
    await page.waitForLoadState('networkidle');

    console.log('Waiting for Chat page to load...');

    // Wait for chat page to load
    await page.waitForSelector('h1:has-text("Procurement Assistant")', { timeout: 5000 });
  });

  test('should get Yes answer to question about WA suppliers', async ({ page }) => {
    await page.screenshot({ path: "chat-request.png" });

    const testMessage = 'Do I have any suppliers in Washington state? Please begin your answer with Yes or No.';
    
    await page.fill('input[placeholder*="Ask about suppliers"]', testMessage);
    await page.click('button:has-text("Send")');
    
    // Wait for the message to appear in chat history
    await new Promise(resolve => setTimeout(resolve, 60000));
    await page.screenshot({ path: "chat-response.png" });
    await expect(page.locator(`text=${testMessage}`)).toBeVisible({ timeout: 100 });
    
    // Should show user message with timestamp
    await expect(page.locator('text=Yes(')).toBeVisible();
  });
});