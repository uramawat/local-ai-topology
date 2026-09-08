import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the planner shell and a disposable catalog loading state", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Local topology planner<\/title>/i);
  assert.match(html, /Plan the system,/);
  assert.match(html, /Loading the latest catalog…/);
  assert.match(html, /class="catalog-loading"/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps planner data remote and avoids retired preview scaffolding", async () => {
  const [page, catalog, evidence] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/catalog.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/evidence/v1.json", import.meta.url), "utf8"),
  ]);
  assert.match(page, /catalog-loading/);
  assert.match(page, /local-topology:catalog:v1/);
  assert.match(catalog, /\/catalog\/v1\.json/);
  assert.match(catalog, /\/evidence\/v1\.json/);
  assert.match(evidence, /"records"/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview|react-loading-skeleton/);
});
