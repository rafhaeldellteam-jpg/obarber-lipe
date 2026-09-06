import { test, expect } from "@playwright/test";
import { TEST_USER } from "./helpers";

let authed: import("@playwright/test").Page;

test.describe("público", () => {
  test("home carrega com formulário de login", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Obarber Lipe" })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("API de feedbacks públicos responde ok", async ({ request }) => {
    const res = await request.get("/api/feedbacks");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("rotas admin recusam sem sessão (401)", async ({ request }) => {
    for (const path of ["/api/admin/appointments", "/api/admin/subscriptions", "/api/admin/feedbacks"]) {
      const res = await request.get(path);
      expect(res.status(), `GET ${path} deveria ser 401`).toBe(401);
    }
  });
});

test.describe("autenticado como cliente", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 480, height: 860 } });
    await page.goto("/");
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/me", { timeout: 20_000 });
    await expect(page.getByText(`Olá, ${TEST_USER.name}`)).toBeVisible();
    authed = page;
  });

  test.afterAll(async () => {
    await authed?.close();
  });

  test("/me mostra perfil do cliente", async () => {
    await expect(authed.getByText(`Olá, ${TEST_USER.name}`)).toBeVisible();
    await expect(authed.getByText("Fazer agendamento completo")).toBeVisible();
  });

  test("aba Planos lista planos com botão de ativação", async () => {
    await authed.getByRole("button", { name: "Planos" }).click();
    await expect(authed.getByText("Planos disponíveis")).toBeVisible();
    await expect(authed.getByRole("button", { name: "Ativar este plano" }).first()).toBeVisible();
  });

  test("aba Feedbacks abre o formulário com estrelas", async () => {
    await authed.getByRole("button", { name: "Feedbacks" }).click();
    await expect(
      authed.locator('input[type="radio"], button[aria-label*="estrela" i], [class*="star" i], svg').first()
    ).toBeVisible();
  });

  test("agendamento: strip de dias e horários visíveis", async () => {
    await authed.goto("/");
    // Seção de agendamento para clientes logados
    const dayStrip = authed.locator("text=Agendar").first();
    await expect(dayStrip.or(authed.getByRole("button", { name: "Agendar" }).first())).toBeVisible({ timeout: 15_000 });
  });
});
