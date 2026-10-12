import { expect, test, type Page } from "@playwright/test";

async function writePoems(page: Page, numbers: number[]) {
  const input = page.getByRole("textbox", { name: "Message" });
  const studio = page.getByRole("main");
  for (const number of numbers) {
    await input.fill(`Write poem ${number}`);
    await input.press("Enter");
    await expect(studio.getByText(`詩作 ${number}`, { exact: true })).toBeVisible();
  }
}

test("shows an empty studio and clear setup state without a key", async ({ page, request }) => {
  await page.goto("http://127.0.0.1:8101");
  await expect(page.getByRole("heading", { name: /街角詩境/ })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("OPENAI_API_KEY");
  await expect(page.getByTestId("empty-studio")).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open chat" })).toHaveCount(0);
  const response = await request.post("http://127.0.0.1:8101/agent", { data: {} });
  expect(response.status()).toBe(503);
});

test("opens the sidebar on arrival without generating poems or paintings", async ({ page }) => {
  const generation: string[] = [];
  page.on("request", (request) => {
    if (/\/(agent|illustration)$/.test(new URL(request.url()).pathname)) generation.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Copilot chat sidebar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "城市夜色", exact: true })).toBeVisible();
  await expect(page.getByTestId("empty-studio")).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveCount(0);
  expect(generation).toEqual([]);
});

test("chat tool adds poems, navigation works, and a new poem resets selection", async ({ page }) => {
  const errors: string[] = [];
  const runs: any[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/agent") runs.push(request.postDataJSON());
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "城市夜色", exact: true })).toBeVisible();
  const studio = page.getByRole("main");
  await writePoems(page, [1, 2]);
  await studio.getByRole("button", { name: "下一首詩" }).click();
  await expect(studio.getByText("詩作 1", { exact: true })).toBeVisible();
  await writePoems(page, [3]);
  await expect(studio.getByRole("button", { name: "上一首詩" })).toBeDisabled();
  // Only the main gallery displays the generated graffiti.
  await expect(studio.getByText("正在把詩的意象畫成街頭塗鴉…")).toHaveCount(0);
  const drawn = studio.getByTestId("poem-illustration");
  await expect(drawn).toBeVisible();
  expect(await drawn.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(page.getByRole("complementary", { name: "Copilot chat sidebar" }).locator("img")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(runs).toHaveLength(3); // Displaying a poem does not start a follow-up model run.
  expect(runs[1].messages.some((message: any) => message.role === "tool" && message.content.includes("Poem displayed"))).toBe(true);
  await page.getByRole("complementary", { name: "Copilot chat sidebar" }).getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Copilot chat sidebar" })).not.toBeVisible();
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Copilot chat sidebar" }).locator("img")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("works under a Segma URL prefix opened without a trailing slash", async ({ page }) => {
  const outside: string[] = [];
  page.on("request", (request) => {
    if (!new URL(request.url()).pathname.startsWith("/fastapi-prod/7/api")) outside.push(request.url());
  });
  await page.goto("http://127.0.0.1:8102/fastapi-prod/7/api");
  await expect(page.locator("img")).toHaveCount(0);
  await writePoems(page, [1]);
  expect(outside).toEqual([]);
});

test("works without secure-context APIs, as on a plain-HTTP LAN address", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Browsers expose crypto.randomUUID only on HTTPS or localhost.
  await page.addInitScript(() => { Object.defineProperty(Crypto.prototype, "randomUUID", { value: undefined }); });
  await page.goto("/");
  await writePoems(page, [1]);
  expect(errors).toEqual([]);
});

test("survives browsers whose scrollIntoView returns a Promise", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Newer Chrome returns a Promise from scroll methods.
  await page.addInitScript(() => {
    const scroll = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...args) {
      scroll.apply(this, args);
      return Promise.resolve() as unknown as void;
    };
  });
  await page.goto("/");
  await writePoems(page, [1, 2]);
  expect(errors).toEqual([]);
});

test("empty studio fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("http://127.0.0.1:8101");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("CopilotKit sidebar fits mobile and keeps the studio usable after closing", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const sidebar = page.getByRole("complementary", { name: "Copilot chat sidebar" });
  await expect(sidebar).toBeVisible();
  await writePoems(page, [1]);
  expect(await sidebar.evaluate((element) => element.getBoundingClientRect().width <= innerWidth)).toBe(true);
  await page.getByRole("complementary", { name: "Copilot chat sidebar" }).getByRole("button", { name: "Close", exact: true }).click();
  await expect(sidebar).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("painting failure preserves the poem without a placeholder image", async ({ page }) => {
  await page.route("**/illustration", (route) => route.fulfill({ status: 502, contentType: "application/json", body: '{"detail":"Drawing failed"}' }));
  await page.goto("/");
  await writePoems(page, [1]);
  await expect(page.getByRole("main").getByRole("status")).toContainText("詩作已保留");
  await expect(page.locator("img")).toHaveCount(0);
});

test("poem appears while its painting is still being generated", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/illustration", async (route) => {
    await pending;
    await route.fulfill({ status: 404, body: "off" });
  });
  await page.goto("/");
  await writePoems(page, [1]);
  await expect(page.getByRole("main").getByRole("status")).toContainText("正在把詩的意象");
  await expect(page.locator("img")).toHaveCount(0);
  release();
  await expect(page.getByRole("main").getByRole("status")).toContainText("詩作已保留");
});
