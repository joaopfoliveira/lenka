import { test, expect } from '@playwright/test';

const mockProducts = [
  {
    id: 'mock-1',
    source: 'supermarket',
    category: 'Bebidas',
    name: 'Mock Cola 1L',
    price: 1.23,
    imageUrl: 'https://example.com/mock-cola.jpg',
    store: 'MockMart',
  },
  {
    id: 'mock-2',
    source: 'supermarket',
    category: 'Bebidas',
    name: 'Mock Juice 1L',
    price: 2.5,
    imageUrl: 'https://example.com/mock-juice.jpg',
    store: 'MockMart',
  },
];

test.setTimeout(120000);

test('solo happy path with mocked products', async ({ page }) => {
  await page.route('**/api/solo-products*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ products: mockProducts }) })
  );
  page.on('console', (msg) => console.log('[SOLO PAGE]', msg.type(), msg.text()));

  await page.goto('/solo?fixture=1');
  await expect(page.getByText(/solo mode/i)).toBeVisible({ timeout: 60000 });
  // Ensure loading banner cleared
  await page.waitForTimeout(1000);

  const input = page.getByPlaceholder('0.00').first().or(page.locator('input[type=number]').first());
  await expect(input).toBeVisible({ timeout: 15000 });
  await input.fill('1.10');
  await page.getByRole('button', { name: /bloquear|lock/i }).click();

  await expect(page.getByText(/resultado da ronda|round result/i)).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/mock cola/i)).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(500);
});
