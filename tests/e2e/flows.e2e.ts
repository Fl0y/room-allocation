// Fluxurile principale ale interfeței (D40), pe datele cazului 5: cererea acceptată, cererea refuzată cu o
// alternativă aplicată, orarul unei subgrupe, închiderea unei săli cu repararea. Testele rulează în ordine,
// pe aceeași bază de date.

import { expect, test, type Page } from '@playwright/test';

async function chooseTeacher(page: Page, id: string) {
  await page.goto('/profesor');
  await page.getByLabel('Profesorul').selectOption(id);
}
async function chooseUnit(page: Page, id: string) {
  await page.getByLabel('Caută unități').fill(id);
  await page.getByRole('group', { name: 'Unități' }).getByRole('checkbox', { name: new RegExp(`^${id.replace('/', '\\/')} `) }).check();
}

test.describe.configure({ mode: 'serial' });

test('profesorul: cerere acceptată, apare în rezervările lui și se poate anula', async ({ page }) => {
  await chooseTeacher(page, 'T9');
  await page.getByLabel('Ziua').first().selectOption('2026-11-17');
  await page.getByLabel('Perechea').selectOption('6');
  await chooseUnit(page, 'G7');
  await page.getByRole('button', { name: 'Trimite cererea' }).click();
  const decision = page.getByTestId('decision');
  await expect(decision).toContainText('Acceptată');
  await expect(decision).toContainText('perechea 6');
  const mine = page.getByTestId('my-bookings');
  await expect(mine).toContainText('G7');
  // dublul clic nu creează a doua rezervare (aceeași cheie, D42)
  await page.getByRole('button', { name: 'Trimite cererea' }).click();
  await expect(decision).toContainText('aceeași decizie');
  await expect(mine.locator('tbody tr')).toHaveCount(1);
  await mine.getByRole('button', { name: 'Anulează' }).click();
  await mine.getByRole('button', { name: 'Confirm anularea' }).click();
  await expect(page.getByText('Nicio rezervare.')).toBeVisible();
});

test('profesorul: cerere refuzată (grupa ocupată), alternativă aplicată', async ({ page }) => {
  await chooseTeacher(page, 'T9');
  await page.getByLabel('Ziua').first().selectOption('2026-11-16');
  await page.getByLabel('Perechea').selectOption('1');
  await chooseUnit(page, 'G1');
  await page.getByRole('button', { name: 'Trimite cererea' }).click();
  const decision = page.getByTestId('decision');
  await expect(decision).toContainText('Refuzată');
  await expect(decision).toContainText('GROUP_BUSY');
  await decision.getByRole('button', { name: 'Aplică' }).first().click();
  await expect(page.getByTestId('applied')).toContainText('Alternativa a fost aplicată');
  await expect(page.getByTestId('my-bookings')).toContainText('G1');
});

test('studenții: orarul subgrupei G2/1 arată laboratorul ei', async ({ page }) => {
  await page.goto('/studenti');
  await page.getByLabel('Unitatea').selectOption('G2/1');
  const tt = page.getByTestId('timetable');
  await expect(tt).toContainText('laborator');
  await expect(tt).toContainText('sala L-201');
  await expect(tt).toContainText('T2');
});

test('administratorul: închiderea sălii L-201 repară orarul și propune alternative pentru nerezolvate', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByTestId('room-grid')).toContainText('L-201');
  await page.getByLabel('Sala de închis').selectOption('L-201');
  await page.getByLabel('De la').selectOption('2026-11-16');
  await page.getByLabel('Până la').selectOption('2026-11-24');
  await page.getByRole('button', { name: 'Închide sala și repară orarul' }).click();
  const report = page.getByTestId('closure-report');
  await expect(report).toContainText('9 rezervări afectate');
  await expect(report).toContainText('Nerezolvată: b4-bloc');
  await expect(report).toContainText('Fixare anulată de închidere (D19): b3-examen');
  // în grilă, sala închisă nu mai are rezervări în ziua aleasă
  await expect(page.getByTestId('room-grid').locator('tr', { hasText: 'L-201' })).toContainText('închisă');
  await expect(page.getByTestId('room-grid').locator('tr', { hasText: 'L-201' }).locator('[class*="chip"]')).toHaveCount(0);
  await report.getByRole('button', { name: 'Aplică în numele profesorului' }).first().click();
  await expect(report.getByTestId('applied')).toContainText('Alternativa a fost aplicată');
});
