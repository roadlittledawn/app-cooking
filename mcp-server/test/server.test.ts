import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ApiError, type CookingApi } from "../src/api.js";
import type { ApiRecipe } from "../src/format.js";
import { createServer } from "../src/server.js";

const BASE = "http://cooking.test";

const recipe: ApiRecipe = {
  _id: "6b0339a4fe56ad03f2195a39",
  title: "Tomato soup",
  description: "Quick",
  ingredients: [
    { ingredientId: { _id: "i1", name: "tomato" }, amount: "4", unit: "" },
    { ingredientId: null, amount: "1", unit: "tsp" },
  ],
  steps: "1. Simmer",
  prepTime: 5,
  cookTime: 20,
  servings: 2,
  tags: ["soup"],
  authorId: { _id: "me", name: "Clinton" },
};

/** A fake API that records calls and answers from `routes`. */
function fakeApi(routes: Record<string, unknown>) {
  const calls: { path: string; query?: Record<string, unknown> }[] = [];
  const api: CookingApi = {
    baseUrl: BASE,
    async get<T>(path: string, query?: Record<string, string | number | undefined>) {
      calls.push({ path, query });
      const answer = routes[path];
      if (answer instanceof Error) throw answer;
      if (answer === undefined) throw new ApiError(404, `no route ${path}`);
      return answer as T;
    },
    post: async () => {
      throw new Error("unexpected POST");
    },
    put: async () => {
      throw new Error("unexpected PUT");
    },
  };
  return { api, calls };
}

async function connect(api: CookingApi) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([
    createServer({ api, authBaseUrl: "http://auth.test" }).connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

function json(result: Awaited<ReturnType<Client["callTool"]>>) {
  const [first] = result.content as { type: string; text: string }[];
  return JSON.parse(first.text);
}

test("registers the read tools", async () => {
  const client = await connect(fakeApi({}).api);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), [
    "get_recipe",
    "list_tags",
    "search_ingredients",
    "search_recipes",
  ]);
});

test("search_recipes escapes the query and returns compact summaries", async () => {
  const { api, calls } = fakeApi({ "/api/recipes": { recipes: [recipe], pagination: {} } });
  const client = await connect(api);
  const result = await client.callTool({ name: "search_recipes", arguments: { query: "soup (v2)" } });
  assert.deepEqual(calls[0], {
    path: "/api/recipes",
    query: { q: "soup \\(v2\\)", tags: undefined, limit: 10 },
  });
  assert.deepEqual(json(result), [
    {
      id: recipe._id,
      title: "Tomato soup",
      author: "Clinton",
      tags: ["soup"],
      url: `${BASE}/recipes/${recipe._id}`,
    },
  ]);
});

test("search_recipes filters by tags, with or without a query", async () => {
  const { api, calls } = fakeApi({ "/api/recipes": { recipes: [], pagination: {} } });
  const client = await connect(api);
  await client.callTool({ name: "search_recipes", arguments: { tags: ["soup", "dinner"], limit: 5 } });
  await client.callTool({ name: "search_recipes", arguments: {} });
  assert.deepEqual(calls.map((c) => c.query), [
    { q: undefined, tags: "soup,dinner", limit: 5 },
    { q: undefined, tags: undefined, limit: 10 },
  ]);
});

test("get_recipe returns ingredients by name and isMine", async () => {
  const { api } = fakeApi({
    [`/api/recipes/${recipe._id}`]: recipe,
    "/api/me": { id: "me" },
  });
  const client = await connect(api);
  const detail = json(await client.callTool({ name: "get_recipe", arguments: { id: recipe._id } }));
  assert.deepEqual(detail.ingredients, [
    { name: "tomato", amount: "4", unit: "" },
    { name: "(deleted ingredient)", amount: "1", unit: "tsp" },
  ]);
  assert.equal(detail.isMine, true);
  assert.equal(detail.url, `${BASE}/recipes/${recipe._id}`);
});

test("get_recipe rejects ids that aren't ObjectIds before calling the API", async () => {
  const { api, calls } = fakeApi({});
  const client = await connect(api);
  const result = await client.callTool({ name: "get_recipe", arguments: { id: "tomato-soup" } });
  assert.equal(result.isError, true);
  assert.equal(calls.length, 0);
});

test("list_tags and search_ingredients", async () => {
  const { api } = fakeApi({
    "/api/tags": { tags: ["dinner", "soup"] },
    "/api/ingredients": [{ _id: "i1", name: "tomato", createdBy: "x", __v: 0 }],
  });
  const client = await connect(api);
  assert.deepEqual(json(await client.callTool({ name: "list_tags", arguments: {} })), ["dinner", "soup"]);
  assert.deepEqual(
    json(await client.callTool({ name: "search_ingredients", arguments: { query: "tom" } })),
    [{ id: "i1", name: "tomato" }]
  );
});

test("API errors come back as readable isError results", async () => {
  const { api } = fakeApi({ "/api/tags": new ApiError(403, "Forbidden") });
  const client = await connect(api);
  const result = await client.callTool({ name: "list_tags", arguments: {} });
  assert.equal(result.isError, true);
  assert.match((result.content as { text: string }[])[0].text, /^Not allowed/);
});
