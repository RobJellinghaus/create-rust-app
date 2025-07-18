import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../testUtils';

test.describe('Supplier Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.waitForLoadState('networkidle');

    // Clean up any existing suppliers
    await page.click('a:has-text("Suppliers")');
    await page.waitForLoadState('networkidle');

    // Wait for React Suspense to resolve and suppliers to load
    await page.waitForSelector('h1:has-text("Suppliers")', { timeout: 5000 });
    
    // Wait for either suppliers to load or empty state to appear
    try {
      await page.waitForFunction(() => {
        const deleteLinks = Array.from(document.querySelectorAll('a')).filter(a => a.textContent?.includes('delete'));
        const hasSuppliers = deleteLinks.length > 0;
        const hasEmptyState = document.textContent?.includes('No suppliers found. Create one to get started!');
        return hasSuppliers || hasEmptyState;
      }, { timeout: 5000 });
    } catch (e) {
      console.log('Timeout waiting for suppliers to load or empty state to appear');
    }

    // Debug: Check what's actually on the page
    const pageContent = await page.locator('body').innerHTML();
    console.log('Page content length:', pageContent.length);
    const deleteButtons = await page.locator('a:has-text("delete")').all();
    console.log('Found delete buttons:', deleteButtons.length);
    const suppliers = await page.locator('.Form').all();
    console.log('Found Form elements:', suppliers.length);

    // Delete any existing suppliers
    let deleteCount = 0;
    while (((await page.locator('a:has-text("delete")').all()).length) > 0) {
      console.log('Found existing supplier, deleting...');
      
      // Set up dialog handler BEFORE clicking
      const dialogPromise = new Promise<void>((resolve) => {
        const handler = (dialog) => {
          dialog.accept();
          page.off('dialog', handler); // Remove handler after use
          resolve();
        };
        page.on('dialog', handler);
      });

      await page.locator('a:has-text("delete")').first().click();
      await dialogPromise; // Wait for dialog to be handled
      
      await page.waitForLoadState('networkidle');
      await new Promise(resolve => setTimeout(resolve, 100));
      deleteCount++;
    }
    
    console.log(`Cleaned up ${deleteCount} existing suppliers`);

    // Verify empty state is shown
    await expect(page.locator('text=No suppliers found. Create one to get started!')).toBeVisible();
  });

  test('should display suppliers page', async ({ page }) => {
    await page.click('a:has-text("Suppliers")');
    await expect(page.locator('h1:has-text("Suppliers")')).toBeVisible();
  });

  test('should show empty state when no suppliers', async ({ page }) => {
    await page.click('a:has-text("Suppliers")');
    await expect(page.locator('text=No suppliers found. Create one to get started!')).toBeVisible();
  });

  test('should show add new supplier button', async ({ page }) => {
    await page.click('a:has-text("Suppliers")');
    await expect(page.locator('button:has-text("Add New Supplier")')).toBeVisible();
    await expect(page.locator('button:has-text("Add New Supplier")')).toBeEnabled();
  });

  test('should display create supplier form when add button is clicked', async ({ page }) => {
    await page.click('a:has-text("Suppliers")');
    await page.click('button:has-text("Add New Supplier")');
    
    // Check that the form is visible
    await expect(page.locator('h3:has-text("Create New Supplier")')).toBeVisible();
    
    // Check that all required fields are present
    await expect(page.locator('input[placeholder="Supplier name"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Contact person name"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Street address"]')).toBeVisible();
    await expect(page.locator('input[placeholder="contact@supplier.com"]')).toBeVisible();
    await expect(page.locator('input[placeholder="City"]')).toBeVisible();
    await expect(page.locator('input[placeholder="(555) 123-4567"]')).toBeVisible();
    await expect(page.locator('input[placeholder="State"]')).toBeVisible();
    await expect(page.locator('input[placeholder="https://supplier.com"]')).toBeVisible();
    await expect(page.locator('input[placeholder="12345"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Country"]')).toBeVisible();
    
    // Check that create button is initially disabled
    await expect(page.locator('button:has-text("Create Supplier")')).toBeDisabled();
    
    // Check that cancel button is present
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
  });

  test('should enable create button when required fields are filled', async ({ page }) => {
    await page.click('a:has-text("Suppliers")');
    await page.click('button:has-text("Add New Supplier")');
    
    // Initially disabled
    await expect(page.locator('button:has-text("Create Supplier")')).toBeDisabled();
    
    // Fill required fields
    await page.fill('input[placeholder="Supplier name"]', 'Test Supplier');
    await page.fill('input[placeholder="contact@supplier.com"]', 'test@supplier.com');
    
    // Should still be disabled (missing other required fields)
    await expect(page.locator('button:has-text("Create Supplier")')).toBeDisabled();
    
    // Fill remaining required fields
    await page.fill('input[placeholder="Contact person name"]', 'John Doe');
    await page.fill('input[placeholder="Street address"]', '123 Main St');
    await page.fill('input[placeholder="City"]', 'Test City');
    await page.fill('input[placeholder="(555) 123-4567"]', '555-123-4567');
    await page.fill('input[placeholder="State"]', 'CA');
    await page.fill('input[placeholder="12345"]', '12345');
    await page.fill('input[placeholder="Country"]', 'USA');
    
    // Now should be enabled
    await expect(page.locator('button:has-text("Create Supplier")')).toBeEnabled();
  });

  test('should cancel supplier creation', async ({ page }) => {
    await page.click('a:has-text("Suppliers")');
    await page.click('button:has-text("Add New Supplier")');
    
    // Fill some fields
    await page.fill('input[placeholder="Supplier name"]', 'Test Supplier');
    await page.fill('input[placeholder="contact@supplier.com"]', 'test@supplier.com');
    
    // Click cancel
    await page.click('button:has-text("Cancel")');
    
    // Form should be hidden
    await expect(page.locator('h3:has-text("Create New Supplier")')).not.toBeVisible();
    
    // Add button should be visible again
    await expect(page.locator('button:has-text("Add New Supplier")')).toBeVisible();
    
    // Empty state should be visible
    await expect(page.locator('text=No suppliers found. Create one to get started!')).toBeVisible();
  });

  test('should create a new supplier successfully', async ({ page }) => {
    await page.click('a:has-text("Suppliers")');
    await page.click('button:has-text("Add New Supplier")');
    
    // Fill all required fields
    const supplierData = {
      name: 'Acme Corp',
      contactName: 'Jane Smith',
      address: '456 Business Ave',
      email: 'jane@acme.com',
      city: 'Business City',
      phone: '555-987-6543',
      state: 'NY',
      website: 'https://acme.com',
      zipCode: '10001',
      country: 'USA'
    };
    
    await page.fill('input[placeholder="Supplier name"]', supplierData.name);
    await page.fill('input[placeholder="Contact person name"]', supplierData.contactName);
    await page.fill('input[placeholder="Street address"]', supplierData.address);
    await page.fill('input[placeholder="contact@supplier.com"]', supplierData.email);
    await page.fill('input[placeholder="City"]', supplierData.city);
    await page.fill('input[placeholder="(555) 123-4567"]', supplierData.phone);
    await page.fill('input[placeholder="State"]', supplierData.state);
    await page.fill('input[placeholder="https://supplier.com"]', supplierData.website);
    await page.fill('input[placeholder="12345"]', supplierData.zipCode);
    await page.fill('input[placeholder="Country"]', supplierData.country);
    
    // Click create
    await page.click('button:has-text("Create Supplier")');
    
    // Wait for creation to complete
    await page.waitForLoadState('networkidle');
    
    // Verify supplier appears in the list
    await expect(page.locator(`text=${supplierData.name}`)).toBeVisible();
    await expect(page.locator(`text=${supplierData.contactName}`)).toBeVisible();
    await expect(page.locator(`text=${supplierData.email}`)).toBeVisible();
    await expect(page.locator(`text=${supplierData.address}`)).toBeVisible();
    await expect(page.locator(`text=${supplierData.city}`)).toBeVisible();
    await expect(page.locator(`text=${supplierData.phone}`)).toBeVisible();
    
    // Verify the form is hidden
    await expect(page.locator('h3:has-text("Create New Supplier")')).not.toBeVisible();
    
    // Verify empty state is no longer visible
    await expect(page.locator('text=No suppliers found. Create one to get started!')).not.toBeVisible();
    
    // Verify supplier has ID and action buttons
    await expect(page.locator('text=#')).toBeVisible();
    await expect(page.locator('a:has-text("edit")')).toBeVisible();
    await expect(page.locator('a:has-text("delete")')).toBeVisible();
  });

  test('should display supplier information correctly', async ({ page }) => {
    await page.click('a:has-text("Suppliers")');
    await page.click('button:has-text("Add New Supplier")');
    
    // Create a supplier with specific data
    const supplierData = {
      name: 'Test Display Corp',
      contactName: 'Display Person',
      address: '789 Display St',
      email: 'display@test.com',
      city: 'Display City',
      phone: '555-DISPLAY',
      state: 'TX',
      website: 'https://display.test',
      zipCode: '77777',
      country: 'USA'
    };
    
    await page.fill('input[placeholder="Supplier name"]', supplierData.name);
    await page.fill('input[placeholder="Contact person name"]', supplierData.contactName);
    await page.fill('input[placeholder="Street address"]', supplierData.address);
    await page.fill('input[placeholder="contact@supplier.com"]', supplierData.email);
    await page.fill('input[placeholder="City"]', supplierData.city);
    await page.fill('input[placeholder="(555) 123-4567"]', supplierData.phone);
    await page.fill('input[placeholder="State"]', supplierData.state);
    await page.fill('input[placeholder="https://supplier.com"]', supplierData.website);
    await page.fill('input[placeholder="12345"]', supplierData.zipCode);
    await page.fill('input[placeholder="Country"]', supplierData.country);
    
    await page.click('button:has-text("Create Supplier")');
    await page.waitForLoadState('networkidle');
    
    // Verify all information is displayed correctly
    await expect(page.locator(`text=${supplierData.name}`)).toBeVisible();
    await expect(page.locator(`text=Contact: ${supplierData.contactName} (${supplierData.email})`)).toBeVisible();
    await expect(page.locator(`text=Address: ${supplierData.address}, ${supplierData.city}, ${supplierData.state} ${supplierData.zipCode}, ${supplierData.country}`)).toBeVisible();
    await expect(page.locator(`text=Phone: ${supplierData.phone}`)).toBeVisible();
    await expect(page.locator(`text=Website:`)).toBeVisible();
    await expect(page.locator(`a[href="${supplierData.website}"]`)).toBeVisible();
  });

  test('should delete a supplier successfully', async ({ page }) => {
    await page.click('a:has-text("Suppliers")');
    await page.click('button:has-text("Add New Supplier")');
    
    // Create a supplier to delete
    await page.fill('input[placeholder="Supplier name"]', 'Delete Me Corp');
    await page.fill('input[placeholder="Contact person name"]', 'Delete Person');
    await page.fill('input[placeholder="Street address"]', '123 Delete St');
    await page.fill('input[placeholder="contact@supplier.com"]', 'delete@me.com');
    await page.fill('input[placeholder="City"]', 'Delete City');
    await page.fill('input[placeholder="(555) 123-4567"]', '555-DELETE');
    await page.fill('input[placeholder="State"]', 'CA');
    await page.fill('input[placeholder="12345"]', '99999');
    await page.fill('input[placeholder="Country"]', 'USA');
    
    await page.click('button:has-text("Create Supplier")');
    await page.waitForLoadState('networkidle');
    
    // Verify supplier exists
    await expect(page.locator('text=Delete Me Corp')).toBeVisible();
    
    // Set up dialog handler before clicking delete
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Are you sure you want to delete this supplier?');
      dialog.accept();
    });
    
    // Click delete
    await page.click('a:has-text("delete")');
    
    // Wait for deletion to complete
    await page.waitForLoadState('networkidle');
    
    // Verify supplier is gone
    await expect(page.locator('text=Delete Me Corp')).not.toBeVisible();
    
    // Verify empty state is shown
    await expect(page.locator('text=No suppliers found. Create one to get started!')).toBeVisible();
  });

  test('should show edit placeholder functionality', async ({ page }) => {
    await page.click('a:has-text("Suppliers")');
    await page.click('button:has-text("Add New Supplier")');
    
    // Create a supplier
    await page.fill('input[placeholder="Supplier name"]', 'Edit Test Corp');
    await page.fill('input[placeholder="Contact person name"]', 'Edit Person');
    await page.fill('input[placeholder="Street address"]', '123 Edit St');
    await page.fill('input[placeholder="contact@supplier.com"]', 'edit@test.com');
    await page.fill('input[placeholder="City"]', 'Edit City');
    await page.fill('input[placeholder="(555) 123-4567"]', '555-EDIT');
    await page.fill('input[placeholder="State"]', 'CA');
    await page.fill('input[placeholder="12345"]', '88888');
    await page.fill('input[placeholder="Country"]', 'USA');
    
    await page.click('button:has-text("Create Supplier")');
    await page.waitForLoadState('networkidle');
    
    // Set up dialog handler for edit placeholder
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Edit functionality coming in Phase 3!');
      dialog.accept();
    });
    
    // Click edit
    await page.click('a:has-text("edit")');
    
    // Verify supplier is still there (edit didn't actually do anything)
    await expect(page.locator('text=Edit Test Corp')).toBeVisible();
  });

  test('should show disabled pagination controls', async ({ page }) => {
    await page.click('a:has-text("Suppliers")');
    
    // Check that pagination buttons are disabled
    await expect(page.locator('button:has-text("<< (Coming Soon)")')).toBeDisabled();
    await expect(page.locator('button:has-text(">> (Coming Soon)")')).toBeDisabled();
    
    // Check page display
    await expect(page.locator('text=Page 1 of 1')).toBeVisible();
  });

  test('should navigate properly to and from suppliers page', async ({ page }) => {
    // Start at home page
    await page.click('a:has-text("Home")');
    await expect(page.locator('h1:has-text("Welcome to create-rust-app!")')).toBeVisible();
    
    // Navigate to suppliers
    await page.click('a:has-text("Suppliers")');
    await expect(page.locator('h1:has-text("Suppliers")')).toBeVisible();
    
    // Navigate to todos
    await page.click('a:has-text("Todos (REST)")');
    await expect(page.locator('h1:has-text("Todos")')).toBeVisible();
    
    // Navigate back to suppliers
    await page.click('a:has-text("Suppliers")');
    await expect(page.locator('h1:has-text("Suppliers")')).toBeVisible();
  });
});