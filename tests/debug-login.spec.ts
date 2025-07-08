import { test, expect } from '@playwright/test';

test('Debug login page', async ({ page }) => {
  // Navigate to login page
  await page.goto('http://localhost:3000/login');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'login-page-debug.png' });
  
  // Print page title and URL
  console.log('Page title:', await page.title());
  console.log('Page URL:', page.url());
  
  // Print all input fields on the page
  const inputs = await page.locator('input').all();
  console.log('Found', inputs.length, 'input fields:');
  
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const name = await input.getAttribute('name');
    const type = await input.getAttribute('type');
    const placeholder = await input.getAttribute('placeholder');
    const id = await input.getAttribute('id');
    
    console.log(`Input ${i}: name="${name}", type="${type}", placeholder="${placeholder}", id="${id}"`);
  }
  
  // Print all buttons
  const buttons = await page.locator('button').all();
  console.log('Found', buttons.length, 'buttons:');
  
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    const text = await button.textContent();
    const type = await button.getAttribute('type');
    
    console.log(`Button ${i}: text="${text}", type="${type}"`);
  }
  
  // Print page HTML for debugging
  const bodyHTML = await page.locator('body').innerHTML();
  console.log('Page HTML length:', bodyHTML.length);
  
  // Check if we can find any form-related elements
  const forms = await page.locator('form').count();
  console.log('Found', forms, 'forms');
  
  // This test always passes - it's just for debugging
  expect(true).toBe(true);
});