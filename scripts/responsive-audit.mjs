// Responsive audit: renders every page at several viewports, screenshots them,
// and reports horizontal overflow plus the elements causing it.
// usage: node responsive.mjs <baseUrl> <convexUrl> <outDir> [only=mobile]
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [baseUrl, convexUrl, outDir, only] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

async function convex(kind, path, args) {
  const r = await fetch(`${convexUrl}/api/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path, args, format: "json" }) });
  const j = await r.json();
  if (j.status !== "success") throw new Error(`${path}: ${j.errorMessage}`);
  return j.value;
}

const admin = await convex("action", "auth:signIn", { phone: "09304878996", password: "Admin@123" });
const client = await convex("action", "auth:signIn", { phone: "09171000007", password: "client123" });
const clients = await convex("query", "users:listClients", { token: admin.token });
const someClient = clients.find((c) => c.name === "Ramon Garcia") ?? clients[0];

const VIEWPORTS = {
  mobile: { width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  small: { width: 320, height: 568, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  tablet: { width: 768, height: 1024, isMobile: true, hasTouch: true },
  desktop: { width: 1366, height: 768 },
};

/** [path, token, optional interaction] */
const PAGES = [
  ["/", null],
  ["/login", null],
  ["/register", null],
  ["/admin", admin.token],
  ["/admin#menu", admin.token, async (p) => p.getByRole("button", { name: "Open menu" }).click()],
  ["/admin/clients", admin.token],
  ["/admin/clients/new", admin.token],
  [`/admin/clients/${someClient._id}`, admin.token],
  ["/admin/map", admin.token],
  ["/admin/requests", admin.token],
  ["/admin/deliveries", admin.token],
  ["/admin/deliveries#modal", admin.token, async (p) => p.getByRole("button", { name: /Record delivery/ }).first().click()],
  ["/admin/inventory", admin.token],
  ["/admin/inventory#modal", admin.token, async (p) => p.getByRole("button", { name: /^Restock$/ }).first().click()],
  ["/admin/reminders", admin.token],
  ["/admin/messages", admin.token],
  ["/admin/notifications", admin.token],
  ["/portal", client.token],
  ["/portal/request", client.token],
  ["/portal/messages", client.token],
  ["/portal/notifications", client.token],
  ["/portal/profile", client.token],
];

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge" });
const results = [];

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  if (only && vpName !== only) continue;
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor ?? 1 });
  for (const [path, token, act] of PAGES) {
    const [route] = path.split("#");
    await ctx.clearCookies();
    if (token) await ctx.addCookies([{ name: "pgi_session", value: token, url: baseUrl }]);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    try {
      await page.goto(baseUrl + route, { waitUntil: "load", timeout: 90000 });
      await page.waitForTimeout(2500);
      if (act) {
        await act(page);
        await page.waitForTimeout(900);
      }
      const metrics = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const sw = document.documentElement.scrollWidth;
        const offenders = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const cs = getComputedStyle(el);
          if (cs.position === "fixed") continue;
          if (r.right > vw + 1 || r.left < -1) {
            offenders.push({ tag: el.tagName.toLowerCase(), cls: (el.className?.baseVal ?? el.className ?? "").toString().slice(0, 90), right: Math.round(r.right), left: Math.round(r.left), w: Math.round(r.width) });
          }
          if (offenders.length >= 8) break;
        }
        // tiny tap targets (buttons/links smaller than 32px) visible in viewport
        const tiny = [];
        for (const el of document.querySelectorAll("a,button")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0 || r.top > innerHeight) continue;
          if (r.height < 28 && (el.textContent || "").trim().length > 0 && !el.closest("nav")) tiny.push({ text: (el.textContent || "").trim().slice(0, 30), h: Math.round(r.height) });
          if (tiny.length >= 5) break;
        }
        return { vw, sw, overflow: sw - vw, offenders, tiny };
      });
      const slug = path.replace(/^\//, "").replace(/[\/#?]/g, "_").replace(/^$/, "home").replace(/[^a-z0-9_]/gi, "_");
      const file = join(outDir, `${vpName}-${slug}.png`);
      await page.screenshot({ path: file, fullPage: !path.includes("#") });
      results.push({ vp: vpName, path, overflow: metrics.overflow, offenders: metrics.offenders, tiny: metrics.tiny, errors: errors.slice(0, 3), file });
      console.log(`${vpName.padEnd(8)} ${path.padEnd(34)} overflow=${String(metrics.overflow).padStart(4)}px ${metrics.offenders.length ? "⚠ " + metrics.offenders.map((o) => o.tag + "." + o.cls.split(" ")[0]).join(", ") : "ok"}${errors.length ? "  console-errors=" + errors.length : ""}`);
    } catch (e) {
      console.log(`${vpName.padEnd(8)} ${path.padEnd(34)} FAILED ${e.message.split("\n")[0]}`);
      results.push({ vp: vpName, path, failed: e.message.split("\n")[0] });
    } finally {
      await page.close();
    }
  }
  await ctx.close();
}
await browser.close();
writeFileSync(join(outDir, "results.json"), JSON.stringify(results, null, 2));
const bad = results.filter((r) => r.failed || (r.overflow ?? 0) > 1);
console.log(`\n${results.length} renders, ${bad.length} with overflow or failures`);
