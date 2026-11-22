import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanText, durationMinutes, extractRecipe, extractRecipeFromUrl } from "../src/extract.js";

const URL = "https://blog.test/tomato-soup";

const page = (...jsonLd: string[]) =>
  `<!doctype html><html><head><title>Best soup</title>${jsonLd
    .map((j) => `<script type="application/ld+json">${j}</script>`)
    .join("")}</head><body><p>My grandmother's story…</p></body></html>`;

const recipe = {
  "@context": "https://schema.org",
  "@type": "Recipe",
  name: "Tomato Soup &amp; Basil",
  description: "<p>Quick &#8211; and easy.</p>",
  recipeYield: ["4", "4 servings"],
  prepTime: "PT10M",
  cookTime: "PT1H5M",
  totalTime: "P0DT1H15M0S",
  recipeIngredient: ["2 tbsp olive oil", "1 &frac12; cups stock", "  4 tomatoes, chopped "],
  recipeInstructions: [
    { "@type": "HowToStep", text: "Heat the oil." },
    { "@type": "HowToStep", text: "Add <b>tomatoes</b>." },
  ],
  keywords: "soup, Vegetarian",
  recipeCategory: "Dinner",
  recipeCuisine: ["Italian"],
};

test("durationMinutes handles the forms recipe sites use", () => {
  assert.equal(durationMinutes("PT10M"), 10);
  assert.equal(durationMinutes("PT1H5M"), 65);
  assert.equal(durationMinutes("P0DT1H15M0S"), 75);
  assert.equal(durationMinutes("PT90M"), 90);
  assert.equal(durationMinutes("P1D"), 1440);
  assert.equal(durationMinutes("PT30S"), 1);
  assert.equal(durationMinutes("PT"), null);
  assert.equal(durationMinutes("20 minutes"), null);
  assert.equal(durationMinutes(undefined), null);
});

test("cleanText decodes entities and drops tags", () => {
  assert.equal(cleanText("<p>A &amp; B&#39;s &#x2013;  ok</p>"), "A & B's – ok");
  assert.equal(cleanText("1 &frac12; cups, 350&deg;F &rsquo;til <b>done</b>."), "1 ½ cups, 350°F ’til done.");
  assert.equal(cleanText(4), "4");
  assert.equal(cleanText(null), "");
});

test("a plain Recipe object", () => {
  const out = extractRecipe(page(JSON.stringify(recipe)), URL);
  assert.ok(out);
  assert.equal(out.name, "Tomato Soup & Basil");
  assert.equal(out.description, "Quick – and easy.");
  assert.equal(out.recipeYield, "4 servings");
  assert.deepEqual([out.prepTime, out.cookTime, out.totalTime], [10, 65, 75]);
  assert.deepEqual(out.recipeIngredient, ["2 tbsp olive oil", "1 ½ cups stock", "4 tomatoes, chopped"]);
  assert.deepEqual(out.recipeInstructions, ["Heat the oil.", "Add tomatoes."]);
  assert.deepEqual(out.keywords, ["soup", "vegetarian", "dinner", "italian"]);
});

test("a Recipe inside an array, or an @graph, with @type as an array", () => {
  const inArray = JSON.stringify([{ "@type": "WebSite", name: "Blog" }, recipe]);
  const inGraph = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [{ "@type": "Organization" }, { ...recipe, "@type": ["Recipe", "NewsArticle"] }],
  });
  for (const html of [page(inArray), page(inGraph)]) {
    assert.equal(extractRecipe(html, URL)?.name, "Tomato Soup & Basil");
  }
});

test("HowToSection instructions are flattened with their headings", () => {
  const sectioned = {
    ...recipe,
    recipeInstructions: [
      {
        "@type": "HowToSection",
        name: "For the soup",
        itemListElement: [{ "@type": "HowToStep", text: "Simmer." }],
      },
      { "@type": "HowToSection", name: "To serve:", itemListElement: [{ "@type": "HowToStep", name: "Top with basil." }] },
    ],
  };
  assert.deepEqual(extractRecipe(page(JSON.stringify(sectioned)), URL)?.recipeInstructions, [
    "For the soup:",
    "Simmer.",
    "To serve:",
    "Top with basil.",
  ]);
});

test("string instructions are split by line", () => {
  const stringy = { ...recipe, recipeInstructions: "Heat the oil.\nAdd tomatoes.\n\nServe." };
  assert.deepEqual(extractRecipe(page(JSON.stringify(stringy)), URL)?.recipeInstructions, [
    "Heat the oil.",
    "Add tomatoes.",
    "Serve.",
  ]);
});

test("a malformed block doesn't hide a valid one; no Recipe gives null", () => {
  assert.equal(extractRecipe(page("{not json", JSON.stringify(recipe)), URL)?.name, "Tomato Soup & Basil");
  assert.equal(extractRecipe(page(JSON.stringify({ "@type": "Article" })), URL), null);
  assert.equal(extractRecipe("<html><body>No data</body></html>", URL), null);
});

test("extractRecipeFromUrl turns fetch problems into found: false", async () => {
  const blocked = (async () => new Response("denied", { status: 403 })) as unknown as typeof fetch;
  const offline = (async () => {
    throw new TypeError("fetch failed");
  }) as unknown as typeof fetch;
  const noData = (async () => new Response("<html></html>", { status: 200 })) as unknown as typeof fetch;
  const ok = (async () => new Response(page(JSON.stringify(recipe)), { status: 200 })) as unknown as typeof fetch;

  assert.deepEqual(await extractRecipeFromUrl(URL, blocked), {
    found: false,
    url: URL,
    reason: "The site answered 403 (often bot protection).",
  });
  assert.match(((await extractRecipeFromUrl(URL, offline)) as { reason: string }).reason, /fetch failed/);
  assert.equal((await extractRecipeFromUrl(URL, noData)).found, false);
  assert.equal((await extractRecipeFromUrl(URL, ok)).found, true);
});
