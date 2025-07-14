import { test, expect } from '@playwright/test';

test('Debug login process', async ({ page }) => {
  // Navigate to login page
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  
  console.log('=== LOGIN PAGE ANALYSIS ===');
  console.log('Current URL:', page.url());
  
  // Check if login form elements exist
  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');
  const loginButton = page.locator('button:has-text("Login")');
  
  console.log('Email input exists:', await emailInput.isVisible());
  console.log('Password input exists:', await passwordInput.isVisible());
  console.log('Login button exists:', await loginButton.isVisible());
  
  // Get all form elements for debugging
  const allInputs = await page.locator('input').count();
  const allButtons = await page.locator('button').count();
  console.log('Total inputs on page:', allInputs);
  console.log('Total buttons on page:', allButtons);
  
  // Get page content to see what's actually there
  const pageText = await page.textContent('body');
  console.log('Page contains "Login":', pageText?.includes('Login'));
  console.log('Page contains "email":', pageText?.includes('email'));
  console.log('Page contains "password":', pageText?.includes('password'));
  
  // Try to fill and submit the form
  if (await emailInput.isVisible() && await passwordInput.isVisible()) {
    console.log('=== ATTEMPTING LOGIN ===');
    
    await emailInput.fill('test@playwright.local');
    await passwordInput.fill('test123456');
    
    console.log('Filled form, clicking login...');
    await loginButton.click();
    
    // Wait and see what happens
    await page.waitForTimeout(3000);
    console.log('URL after login attempt:', page.url());
    
    // Check for any error messages
    const errorElements = page.locator('.error, .alert, [role="alert"]');
    const errorCount = await errorElements.count();
    console.log('Error elements found:', errorCount);
    
    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorElements.nth(i).textContent();
        console.log(`Error ${i + 1}:`, errorText);
      }
    }
  } else {
    console.log('Login form elements not found!');
  }
});