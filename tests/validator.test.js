const test = require("node:test"); const assert = require("node:assert");
const { validate } = require("../dist/core/validator");
test("flags missing required", () => { const r = validate(".env", [{ key: "API_KEY", required: true }], []); assert.strictEqual(r.ok, false); assert.strictEqual(r.summary.missing, 1); });
test("passes when valid", () => { const r = validate(".env", [{ key: "PORT", required: true }], [{ key: "PORT", value: "3000", required: true }]); assert.strictEqual(r.ok, true); });
test("flags invalid port", () => { const r = validate(".env", [{ key: "PORT", required: true }], [{ key: "PORT", value: "abc", required: true }]); assert.strictEqual(r.summary.invalid, 1); });
