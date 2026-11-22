import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, MissingApiKeyError } from "../src/api.js";
import { ApiKeyRejectedError } from "../src/auth.js";
import { toolErrorMessage } from "../src/errors.js";

const AUTH = "http://auth.test";

test("400 names each invalid field", () => {
  const err = new ApiError(400, "Validation failed", {
    prepTime: ["Expected number, received string"],
    steps: ["Steps are required"],
    title: [],
  });
  assert.equal(
    toolErrorMessage(err, AUTH),
    "Validation failed: prepTime: Expected number, received string; steps: Steps are required"
  );
});

test("400 without field details falls back to the message", () => {
  assert.equal(toolErrorMessage(new ApiError(400, "No file provided"), AUTH), "Bad request: No file provided");
});

test("a rejected or missing key says where to get a new one", () => {
  for (const err of [new ApiKeyRejectedError(), new MissingApiKeyError()]) {
    const message = toolErrorMessage(err, `${AUTH}/`);
    assert.match(message, /http:\/\/auth\.test\/keys\?app=cooking/);
    assert.match(message, /mcp-server\/\.env/);
  }
});

test("403 explains the ownership and delete rules", () => {
  assert.match(toolErrorMessage(new ApiError(403, "Forbidden"), AUTH), /only edit your own recipes/);
});

test("404 and other statuses keep the API's message", () => {
  assert.equal(toolErrorMessage(new ApiError(404, "Recipe not found"), AUTH), "Not found: Recipe not found");
  assert.equal(toolErrorMessage(new ApiError(500, "boom"), AUTH), "Cooking API error 500: boom");
});

test("network failures name the cause", () => {
  const err = new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } });
  assert.match(toolErrorMessage(err, AUTH), /Network error: ECONNREFUSED/);
});
