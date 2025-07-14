import { test, expect } from '@playwright/test';

test.describe('Relay Authentication Debug', () => {
  test('should debug Relay authentication issues', async ({ page }) => {
    // Capture console logs and errors
    const consoleMessages: string[] = [];
    const jsErrors: string[] = [];
    const networkErrors: string[] = [];

    // Listen for console messages
    page.on('console', (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Listen for JavaScript errors
    page.on('pageerror', (error) => {
      jsErrors.push(`JavaScript Error: ${error.message}`);
    });

    // Listen for failed network requests
    page.on('response', (response) => {
      if (!response.ok() && response.url().includes('/api/graphql')) {
        networkErrors.push(`Network Error: ${response.status()} ${response.statusText()} - ${response.url()}`);
      }
    });

    // Step 1: Navigate to login page
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    console.log('=== Step 1: Navigated to login page ===');

    // Step 2: Login with correct test credentials
    await page.fill('input[name="email"]', 'test@playwright.local');
    await page.fill('input[name="password"]', 'test123456');
    await page.click('button:has-text("Login")');

    // Wait for login to complete
    await page.waitForURL('**/');
    await page.waitForLoadState('networkidle');
    
    // Add delay for React auth context to initialize
    await page.waitForTimeout(2000);

    console.log('=== Step 2: Login completed ===');
    console.log('Current URL:', page.url());

    // Step 3: Check if we're successfully logged in
    const logoutButton = page.locator('text=Logout');
    const isLoggedIn = await logoutButton.isVisible();
    console.log('Is logged in:', isLoggedIn);

    // Step 4: Click on Todos (Relay) tab
    console.log('=== Step 3: Clicking Todos (Relay) tab ===');
    
    await page.click('text=Todos (Relay)');
    await page.waitForLoadState('networkidle');

    // Wait a bit for any async operations to complete
    await page.waitForTimeout(2000);

    // Step 5: Check if navigation was successful
    const relayPageHeading = page.locator('h1:has-text("Todos (Relay)")');
    const isRelayPageVisible = await relayPageHeading.isVisible();
    console.log('Is Relay page visible:', isRelayPageVisible);
    console.log('Current URL after navigation:', page.url());

    // Step 6: Check for specific elements on the Relay page
    const noTodosMessage = page.locator('text=No todos, create one!');
    const isNoTodosVisible = await noTodosMessage.isVisible();
    console.log('Is "No todos, create one!" message visible:', isNoTodosVisible);

    // Step 7: Log all captured errors and messages
    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMessages.forEach((msg, index) => {
      console.log(`${index + 1}. ${msg}`);
    });

    console.log('\n=== JAVASCRIPT ERRORS ===');
    if (jsErrors.length > 0) {
      jsErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    } else {
      console.log('No JavaScript errors detected');
    }

    console.log('\n=== NETWORK ERRORS ===');
    if (networkErrors.length > 0) {
      networkErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    } else {
      console.log('No network errors to GraphQL endpoint detected');
    }

    // Step 8: Get current authentication state from the page
    const authState = await page.evaluate(() => {
      // Try to access authentication info from the page
      const authInfo = {
        hasLocalStorage: !!localStorage,
        localStorageKeys: localStorage ? Object.keys(localStorage) : [],
        cookies: document.cookie,
        userAgent: navigator.userAgent,
      };
      return authInfo;
    });

    console.log('\n=== AUTHENTICATION STATE ===');
    console.log('Local storage keys:', authState.localStorageKeys);
    console.log('Cookies:', authState.cookies);

    // Step 9: Try to trigger a GraphQL request manually to see what happens
    console.log('\n=== MANUAL GRAPHQL REQUEST TEST ===');
    
    const graphqlResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query {
                todos(page: 0, pageSize: 5) {
                  items {
                    id
                    text
                  }
                  totalItems
                }
              }
            `,
          }),
        });

        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: await response.text(),
        };
      } catch (error) {
        return {
          error: error.message,
        };
      }
    });

    console.log('Manual GraphQL request result:', graphqlResponse);

    // Final assertions for the test
    expect(isLoggedIn).toBe(true);
    expect(isRelayPageVisible).toBe(true);
    
    // The test should pass even if there are GraphQL errors - we're just debugging
    console.log('\n=== DEBUG TEST COMPLETED ===');
  });
});