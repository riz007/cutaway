import { expect, test } from '@playwright/test';

const systemsRail = (page: import('@playwright/test').Page) =>
  page.getByRole('navigation', { name: 'Systems' });

const partTree = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Parts' });

const transport = (page: import('@playwright/test').Page) => page.locator('section[aria-label="Simulation"]');

const explodeSlider = (page: import('@playwright/test').Page) =>
  page.locator('section[aria-label="Explode timeline"] [role="slider"]');

async function engineRpm(page: import('@playwright/test').Page): Promise<number> {
  const text = await transport(page).innerText();
  const match = /engine speed\s*([\d.]+)/i.exec(text.replace(/\n/g, ' '));
  return match ? Number(match[1]) : Number.NaN;
}

test.describe('cutaway', () => {
  test('announces a hazard as part of the part name', async ({ page }) => {
    await page.goto('/v/toyota-yaris-cross/hev-series-parallel');
    await expect(partTree(page).getByRole('button', { name: 'Engine block Hot surface' })).toBeVisible();
  });

  test('loads a vehicle and opens a part', async ({ page }) => {
    await page.goto('/v/toyota-yaris-cross/hev-series-parallel');

    await expect(page.getByRole('button', { name: /Toyota Yaris Cross/ })).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();

    await partTree(page).getByRole('button', { name: /^Engine block/ }).click();

    await expect(page.getByRole('heading', { name: 'Engine block', level: 2 })).toBeVisible();
    await expect(page.getByText(/largest casting in a combustion engine/i)).toBeVisible();
  });

  test('warns before showing an unreviewed lesson', async ({ page }) => {
    await page.goto('/v/toyota-yaris-cross/hev-series-parallel');
    await partTree(page).getByRole('button', { name: /^Engine block/ }).click();
    await expect(page.getByText(/awaiting technical review/i)).toBeVisible();
  });

  test('carries the high-voltage warning on pack components', async ({ page }) => {
    await page.goto('/v/mg-mg4');
    await partTree(page).getByRole('button', { name: /^High-voltage battery/ }).click();
    await expect(page.getByText(/requires trained personnel/i)).toBeVisible();
  });

  test('drops the fuel system from an electric car', async ({ page }) => {
    await page.goto('/v/mg-mg4');
    await expect(systemsRail(page).getByRole('button', { name: /^Fuel/ })).toBeDisabled();

    await page.goto('/v/toyota-hilux');
    await expect(systemsRail(page).getByRole('button', { name: /^Fuel/ })).toBeEnabled();
  });

  test('text view reaches every system without WebGL', async ({ page }) => {
    await page.goto('/fallback');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Yaris Cross');
    await expect(page.getByRole('heading', { name: 'Brakes', level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Master cylinder', level: 3 })).toBeVisible();
  });

  test('is operable from the keyboard', async ({ page }) => {
    await page.goto('/v/toyota-yaris-cross/hev-series-parallel');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  });

  test('starting the simulation turns the engine over', async ({ page }) => {
    await page.goto('/v/toyota-hilux');

    await expect(transport(page).getByText(/engine speed/i)).toBeHidden();

    await transport(page).getByRole('button', { name: /Play/ }).click();

    await expect(transport(page).getByRole('button', { name: /Pause/ })).toBeVisible();
    await expect.poll(() => engineRpm(page), { timeout: 15_000 }).toBeGreaterThan(0);
  });

  test('play switches the ignition on and reveals the mechanism', async ({ page }) => {
    await page.goto('/v/toyota-hilux');

    const ignitionOn = transport(page).getByRole('radio', { name: 'On', exact: true });
    await expect(ignitionOn).toHaveAttribute('aria-checked', 'false');

    await transport(page).getByRole('button', { name: /Play/ }).click();

    await expect(ignitionOn).toHaveAttribute('aria-checked', 'true');

    await expect(page.getByRole('button', { name: 'Cutaway' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('assembles each vehicle on arrival and can be skipped', async ({ page }) => {
    await page.goto('/v/toyota-hilux');

    const skip = page.getByRole('button', { name: 'Skip' });
    await expect(page.getByText(/Assembling the .*Hilux/)).toBeAttached();
    await skip.click();

    await expect(skip).toBeHidden();
    await expect(explodeSlider(page)).toHaveAttribute('aria-valuetext', /^0 of \d+ pieces separated$/);
  });

  test('explodes the vehicle layer by layer and puts it back', async ({ page }) => {
    await page.goto('/v/toyota-hilux');
    await expect(page.getByRole('button', { name: 'Skip' })).toBeHidden({ timeout: 30_000 });

    await page.getByRole('button', { name: 'Explode the vehicle' }).click();
    await expect(explodeSlider(page)).toHaveAttribute('aria-valuetext', /^(\d+) of \1 pieces separated$/, {
      timeout: 20_000,
    });

    await page.getByRole('button', { name: 'Reassemble the vehicle' }).click();
    await expect(explodeSlider(page)).toHaveAttribute('aria-valuetext', /^0 of \d+ pieces separated$/, {
      timeout: 20_000,
    });
  });

  test('space toggles playback', async ({ page }) => {
    await page.goto('/v/toyota-hilux');
    await page.locator('canvas').click({ position: { x: 5, y: 5 } });

    await page.keyboard.press('Space');
    await expect(transport(page).getByRole('button', { name: /Pause/ })).toBeVisible();

    await page.keyboard.press('Space');
    await expect(transport(page).getByRole('button', { name: /Play/ })).toBeVisible();
  });
});
