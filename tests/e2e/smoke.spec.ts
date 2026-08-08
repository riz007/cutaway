import { expect, test } from '@playwright/test';

test.describe('cutaway', () => {
  test('loads a vehicle and opens a part', async ({ page }) => {
    await page.goto('/v/toyota-yaris-cross/hev-series-parallel');

    await expect(page.getByRole('button', { name: /Toyota Yaris Cross/ })).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();

    await page.getByRole('button', { name: 'Select Engine block' }).click();
    await expect(page.getByRole('heading', { name: 'Engine block' })).toBeVisible();
    await expect(page.getByText(/cast structure that holds the cylinders/i)).toBeVisible();
  });

  test('warns before showing an unreviewed lesson', async ({ page }) => {
    await page.goto('/v/toyota-yaris-cross/hev-series-parallel');
    await page.getByRole('button', { name: 'Select Engine block' }).click();
    await expect(page.getByText('Draft — awaiting technical review')).toBeVisible();
  });

  test('carries the high-voltage warning on pack components', async ({ page }) => {
    await page.goto('/v/mg-mg4');
    await page.getByRole('button', { name: 'Select High-voltage battery' }).click();
    await expect(page.getByText(/requires trained personnel/i)).toBeVisible();
  });

  test('drops the fuel system from an electric car', async ({ page }) => {
    await page.goto('/v/mg-mg4');
    await expect(page.getByRole('button', { name: 'Toggle Fuel' })).toBeDisabled();

    await page.goto('/v/toyota-hilux');
    await expect(page.getByRole('button', { name: 'Toggle Fuel' })).toBeEnabled();
  });

  test('text view reaches every system without WebGL', async ({ page }) => {
    await page.goto('/fallback');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Yaris Cross');
    await expect(page.getByRole('heading', { name: 'Brakes' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Master cylinder', level: 3 })).toBeVisible();
  });

  test('is operable from the keyboard', async ({ page }) => {
    await page.goto('/v/toyota-yaris-cross/hev-series-parallel');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  });

  test('runs the simulation and moves the readouts', async ({ page }) => {
    await page.goto('/v/toyota-hilux');
    await page.getByRole('tab', { name: 'Simulation' }).click();
    await page.getByRole('radio', { name: 'On', exact: true }).click();
    await page.getByRole('button', { name: /Play/ }).click();

    await expect
      .poll(async () => Number((await page.getByText('Engine speed').locator('..').innerText()).replace(/\D/g, '')), {
        timeout: 8000,
      })
      .toBeGreaterThan(0);
  });
});
