import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../testUtils';

test.describe('Supplier Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.waitForLoadState('networkidle');

    console.log('Waiting for network idle...');

    // Clean up any existing suppliers
    await page.click('a:has-text("Suppliers")');
    await page.waitForLoadState('networkidle');

    console.log('Waiting for Suppliers...');

    // Wait for React Suspense to resolve and suppliers to load
    await page.waitForSelector('h1:has-text("Suppliers")', { timeout: 5000 });
    
    /*
    console.log('Waiting for GraphQL response...');

    // Wait for the GraphQL suppliers query to complete
    try {
      await page.waitForResponse(response => 
        response.url().includes('/api/graphql') && 
        response.request().postData()?.includes('SupplierListQuery'),
        { timeout: 5000 }
      );
      console.log('GraphQL suppliers query completed');
    } catch (e) {
      console.log('Timeout waiting for GraphQL suppliers query');
    }
      */

    console.log('bar');

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
    
    // Fill only name (should still be disabled - missing email)
    await page.fill('input[placeholder="Supplier name"]', 'Test Supplier');
    await expect(page.locator('button:has-text("Create Supplier")')).toBeDisabled();
    
    // Fill email (should now be enabled - only name and email are validated)
    await page.fill('input[placeholder="contact@supplier.com"]', 'test@supplier.com');
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

  test('should show functional pagination controls', async ({ page }) => {
    await page.click('a:has-text("Suppliers")');
    
    // Check that pagination buttons are present and Previous is disabled on first page
    await expect(page.locator('button:has-text("Previous")')).toBeDisabled();
    await expect(page.locator('button:has-text("Next")')).toBeVisible();
    
    // Check page display
    await expect(page.locator('text=Page 1 of 1')).toBeVisible();
  });

  test('should upload and import CSV file successfully', async ({ page }) => {
    await page.click('a:has-text("Suppliers")');
    
    // Verify we start with empty state
    await expect(page.locator('text=No suppliers found. Create one to get started!')).toBeVisible();
    
    // Create a small test CSV file
    const csvContent = `name,address,city,state,zipCode,country,contactName,contactEmail,contactPhone,website
"Test Corp","123 Test St","Test City","CA","12345","USA","John Test","john@test.com","555-1234","https://test.com"
"Another Corp","456 Another Ave","Another City","NY","67890","USA","Jane Another","jane@another.com","555-5678","https://another.com"`;
    
    // Create a File object for the CSV
    const file = new File([csvContent], 'test-suppliers.csv', { type: 'text/csv' });
    
    // Find the hidden file input and set the file
    const fileInput = page.locator('input[type="file"][accept=".csv"]');
    await fileInput.setInputFiles({
      name: 'test-suppliers.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    
    // Set up dialog handler to accept the success message
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Successfully imported 2 suppliers');
      dialog.accept();
    });
    
    // Click the import button to trigger the upload
    await page.click('button:has-text("Import CSV")');
    
    // Wait for the import to complete and page to update
    await page.waitForLoadState('networkidle');
    
    // Verify suppliers were imported
    await expect(page.locator('text=Test Corp')).toBeVisible();
    await expect(page.locator('text=Another Corp')).toBeVisible();
    await expect(page.locator('text=john@test.com')).toBeVisible();
    await expect(page.locator('text=jane@another.com')).toBeVisible();
    
    // Verify empty state is no longer visible
    await expect(page.locator('text=No suppliers found. Create one to get started!')).not.toBeVisible();
    
    // Verify we have supplier rows with proper data
    await expect(page.locator('text=Contact: John Test (john@test.com)')).toBeVisible();
    await expect(page.locator('text=Address: 123 Test St, Test City, CA 12345, USA')).toBeVisible();
    await expect(page.locator('text=Contact: Jane Another (jane@another.com)')).toBeVisible();
    await expect(page.locator('text=Address: 456 Another Ave, Another City, NY 67890, USA')).toBeVisible();
  });

  test('should handle invalid CSV file gracefully', async ({ page }) => {
    await page.click('a:has-text("Suppliers")');
    
    // Create an invalid CSV file (missing required headers)
    const invalidCsvContent = `invalid,headers,here
"Some","Data","Here"`;
    
    // Find the hidden file input and set the invalid file
    const fileInput = page.locator('input[type="file"][accept=".csv"]');
    await fileInput.setInputFiles({
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(invalidCsvContent)
    });
    
    // Set up dialog handler to catch the error message
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('No valid supplier data found in CSV file');
      dialog.accept();
    });
    
    // Click the import button
    await page.click('button:has-text("Import CSV")');
    
    // Wait for the error handling
    await page.waitForLoadState('networkidle');
    
    // Verify empty state is still visible (no suppliers were imported)
    await expect(page.locator('text=No suppliers found. Create one to get started!')).toBeVisible();
  });

  test('should show import button and accept CSV files only', async ({ page }) => {
    await page.click('a:has-text("Suppliers")');
    
    // Verify import button is visible and enabled
    await expect(page.locator('button:has-text("Import CSV")')).toBeVisible();
    await expect(page.locator('button:has-text("Import CSV")')).toBeEnabled();
    
    // Verify file input accepts only CSV files
    const fileInput = page.locator('input[type="file"][accept=".csv"]');
    await expect(fileInput).toHaveAttribute('accept', '.csv');
    
    // Verify file input is hidden
    await expect(fileInput).toHaveCSS('display', 'none');
  });

  test('should show working pagination controls', async ({ page }) => {
    await page.click('a:has-text("Suppliers")');
    
    // Verify pagination controls are visible
    await expect(page.locator('button:has-text("Previous")')).toBeVisible();
    await expect(page.locator('button:has-text("Next")')).toBeVisible();
    
    // On first page, Previous should be disabled
    await expect(page.locator('button:has-text("Previous")')).toBeDisabled();
    
    // Check page display shows current page
    await expect(page.locator('text=Page 1 of')).toBeVisible();
    
    // If there are suppliers, verify the item count display
    const supplierCount = await page.locator('a:has-text("delete")').count();
    if (supplierCount > 0) {
      await expect(page.locator('text=Showing')).toBeVisible();
      await expect(page.locator('text=suppliers')).toBeVisible();
    }
  });

});