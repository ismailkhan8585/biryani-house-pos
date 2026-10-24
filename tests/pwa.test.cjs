const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const sharp = require("sharp");

test("install manifest launches the protected POS with correctly sized public icons", async () => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("app/manifest.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports });
  const manifest = exports.default();
  assert.equal(manifest.id, "/pos");
  assert.equal(manifest.start_url, "/pos");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "any");
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((icon) => icon.sizes === `${size}x${size}`);
    assert.ok(icon);
    const metadata = await sharp(`public${icon.src}`).metadata();
    assert.equal(metadata.width, size);
    assert.equal(metadata.height, size);
    assert.equal(metadata.format, "png");
  }
  const apple = await sharp("public/icons/pos-180.png").metadata();
  assert.equal(apple.width, 180);
  assert.equal(apple.height, 180);
});
