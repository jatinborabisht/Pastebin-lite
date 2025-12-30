import { test, expect } from '@playwright/test';

test.describe('Create Paste Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should display the create paste form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /pastebin lite/i })).toBeVisible();
    await expect(page.getByLabel(/content/i)).toBeVisible();
    await expect(page.getByLabel(/expires after/i)).toBeVisible();
    await expect(page.getByLabel(/max views/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create paste/i })).toBeVisible();
  });

  test('should have submit button disabled when content is empty', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /create paste/i });
    await expect(submitButton).toBeDisabled();
  });

  test('should enable submit button when content is entered', async ({ page }) => {
    const textarea = page.getByLabel(/content/i);
    await textarea.fill('Hello, world!');

    const submitButton = page.getByRole('button', { name: /create paste/i });
    await expect(submitButton).toBeEnabled();
  });

  test('should create paste and display URL on success', async ({ page }) => {
    const testContent = `Test paste content - ${Date.now()}`;
    
    // Fill in content
    await page.getByLabel(/content/i).fill(testContent);

    // Submit form using force to bypass any overlays
    await page.getByRole('button', { name: /create paste/i }).click({ force: true });

    // Wait for success message
    await expect(page.getByText(/paste created successfully/i)).toBeVisible({ timeout: 15000 });

    // Check URL is displayed as a link
    const pasteLink = page.getByRole('link', { name: /\/p\// });
    await expect(pasteLink).toBeVisible();
    
    // Verify the URL format
    const href = await pasteLink.getAttribute('href');
    expect(href).toMatch(/\/p\/[a-zA-Z0-9]+/);
  });

  test('should clear form after successful paste creation', async ({ page }) => {
    const textarea = page.getByLabel(/content/i);
    await textarea.fill('Test content to be cleared');

    await page.getByRole('button', { name: /create paste/i }).click({ force: true });

    // Wait for success
    await expect(page.getByText(/paste created successfully/i)).toBeVisible({ timeout: 15000 });

    // Form should be cleared
    await expect(textarea).toHaveValue('');
  });

  test('should navigate to paste view when clicking created URL', async ({ page }) => {
    const testContent = `Navigate test content - ${Date.now()}`;
    
    // Create paste
    await page.getByLabel(/content/i).fill(testContent);
    await page.getByRole('button', { name: /create paste/i }).click({ force: true });

    // Wait for success and get the link
    await expect(page.getByText(/paste created successfully/i)).toBeVisible({ timeout: 15000 });
    
    const pasteLink = page.getByRole('link', { name: /\/p\// });
    await pasteLink.click({ force: true });

    // Should navigate to the paste view page
    await expect(page).toHaveURL(/\/p\/[a-zA-Z0-9]+/);
    
    // Wait for page to load and content should be visible on the paste page
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(testContent)).toBeVisible({ timeout: 10000 });
  });

  test('should create paste with TTL and max views options', async ({ page }) => {
    const testContent = `Paste with options - ${Date.now()}`;
    
    // Fill all fields
    await page.getByLabel(/content/i).fill(testContent);
    await page.getByLabel(/expires after/i).fill('3600');
    await page.getByLabel(/max views/i).fill('10');

    // Submit
    await page.getByRole('button', { name: /create paste/i }).click({ force: true });

    // Should succeed
    await expect(page.getByText(/paste created successfully/i)).toBeVisible({ timeout: 15000 });
    
    // Link should be displayed
    await expect(page.getByRole('link', { name: /\/p\// })).toBeVisible();
  });

  test('should display error when server returns validation error', async ({ page }) => {
    // Intercept the API request and return a validation error
    await page.route('/api/pastes', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation failed',
          details: [{ field: 'content', message: 'content cannot be empty' }]
        })
      });
    });

    // Fill in content and submit
    await page.getByLabel(/content/i).fill('Test content');
    await page.getByRole('button', { name: /create paste/i }).click({ force: true });

    // Should show the error message from server
    await expect(page.getByText(/content cannot be empty/i)).toBeVisible({ timeout: 5000 });
  });

  test('should display network error message', async ({ page }) => {
    // Intercept the API request and simulate network failure
    await page.route('/api/pastes', async route => {
      await route.abort('failed');
    });

    // Fill in content and submit
    await page.getByLabel(/content/i).fill('Test content');
    await page.getByRole('button', { name: /create paste/i }).click({ force: true });

    // Should show network error message
    await expect(page.getByText(/network error/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle paste creation and verify paste is accessible', async ({ page, request }) => {
    const testContent = `API verification test - ${Date.now()}`;
    
    // Create paste through UI
    await page.getByLabel(/content/i).fill(testContent);
    await page.getByRole('button', { name: /create paste/i }).click({ force: true });

    await expect(page.getByText(/paste created successfully/i)).toBeVisible({ timeout: 15000 });
    
    // Get the created paste URL
    const pasteLink = page.getByRole('link', { name: /\/p\// });
    const href = await pasteLink.getAttribute('href');
    
    // Extract paste ID and verify via API
    const match = href?.match(/\/p\/([a-zA-Z0-9]+)/);
    expect(match).toBeTruthy();
    const pasteId = match![1];

    // Verify paste exists via API
    const response = await request.get(`/api/pastes/${pasteId}`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.content).toBe(testContent);
  });
});

test.describe('Paste View Page', () => {
  test('should display 404 for non-existent paste', async ({ page }) => {
    await page.goto('/p/nonexistent-paste-id-12345');
    await page.waitForLoadState('networkidle');
    
    // Check page shows not found content - use heading or paragraph specifically
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible({ timeout: 10000 });
  });

  test('should display paste content when paste exists', async ({ page, request }) => {
    const testContent = `Direct view test - ${Date.now()}`;
    
    // Create paste via API with proper headers
    const createResponse = await request.post('/api/pastes', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: { content: testContent }
    });
    expect(createResponse.ok()).toBeTruthy();
    
    const { id } = await createResponse.json();

    // Navigate to paste view
    await page.goto(`/p/${id}`);
    await page.waitForLoadState('networkidle');

    // Content should be displayed
    await expect(page.getByText(testContent)).toBeVisible({ timeout: 10000 });
  });

  test('should show 404 for paste that exceeded max views', async ({ page, request }) => {
    const testContent = `Max views test - ${Date.now()}`;
    
    // Create paste with max_views = 1 via API
    const createResponse = await request.post('/api/pastes', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: { content: testContent, max_views: 1 }
    });
    expect(createResponse.ok()).toBeTruthy();
    
    const { id } = await createResponse.json();

    // First view should work
    await page.goto(`/p/${id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(testContent)).toBeVisible({ timeout: 10000 });

    // Second view should show 404
    await page.goto(`/p/${id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible({ timeout: 10000 });
  });
});
