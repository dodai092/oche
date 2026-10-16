import type { Page } from "@playwright/test";

/** Enters a visit total. Phones use the keypad (field is read-only), desktop fills the field. */
export async function enterTotal(page: Page, value: string) {
  const score = page.getByLabel("Visit score", { exact: true });
  if (await score.evaluate((el) => (el as HTMLInputElement).readOnly)) {
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    for (const digit of value) {
      await page.getByRole("button", { name: `Digit ${digit}`, exact: true }).click();
    }
  } else {
    await score.fill(value);
  }
}
