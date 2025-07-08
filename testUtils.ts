import { Page } from '@playwright/test';

export async function loginAsTestUser(page: Page) {
  await page.goto('http://localhost:3000/login');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Fill in login form using proper name attributes
  await page.fill('input[name="email"]', 'test@playwright.local');
  await page.fill('input[name="password"]', 'test123456');
  
  // Click the login button
  await page.click('button:has-text("Login")');
  
  try {
    // Wait for successful login redirect
    await page.waitForURL('**/', { timeout: 10000 });
    
    // Verify we're actually logged in by checking for logout button
    await page.waitForSelector('text=Logout', { timeout: 5000 });
    
    console.log('Successfully logged in as test user');
  } catch (error) {
    // If login fails, throw a descriptive error
    const currentUrl = page.url();
    throw new Error(`Login failed. Current URL: ${currentUrl}. The test user may not be properly activated.`);
  }
}