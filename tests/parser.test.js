const test = require("node:test"); const assert = require("node:assert");
const { parseEnvContent } = require("../dist/core/parser");
test("parses simple key=value", () => { const vars = parseEnvContent("PORT=3000\nNODE_ENV=production"); assert.deepStrictEqual(vars.map(v => v.key), ["PORT","NODE_ENV"]); assert.strictEqual(vars[0].value, "3000"); });
test("ignores comments and blanks", () => { assert.strictEqual(parseEnvContent("# comment\n\nA=1").length, 1); });
test("strips quotes and export prefix", () => { const v = parseEnvContent(`export API_KEY="secret"`); assert.strictEqual(v[0].key, "API_KEY"); assert.strictEqual(v[0].value, "secret"); });
