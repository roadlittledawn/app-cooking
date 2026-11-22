---
name: add-recipe
description: Add a recipe to the cooking app (cooking.clintonlangosch.com) from a web page URL, pasted text, or a description from memory, or change one of the user's existing recipes. Drafts the whole recipe, matches ingredients and tags to the ones the app already has, shows the draft, and saves it only after the user confirms. Use when the user runs /add-recipe, or asks to add, save, import, enter or fix a recipe in the cooking app. Needs the `cooking` MCP server (mcp-server/README.md).
---

# Add a recipe

Turn whatever the user has (a URL, pasted text, or a rough description) into a recipe in the cooking app, using the `cooking` MCP tools. **Never write anything before the user confirms the draft.**

If the `cooking` tools aren't available, stop and point the user to `mcp-server/README.md` for setup.

## 1. Get the recipe

- **URL:** call `extract_recipe_from_url` first. It returns the page's structured recipe data, with ingredient lines exactly as written. If it returns `found: false`, fetch the page with WebFetch, asking for the title, yield, times, every ingredient line verbatim and every step. If that fails too, ask the user to paste the recipe.
- **Pasted text:** read it directly.
- **From memory:** take what the user says. Don't fill gaps with a "typical" recipe; ask (step 3).

Keep a note of the source. For a URL, the description ends with `Adapted from <site name>.`

## 2. Normalize

| Field | Rule |
|---|---|
| `title` | The dish's name in title case, without blog fluff ("The BEST Easy Chili Ever!!" → "Chili"). Keep a distinguishing word if it matters ("Cincinnati Chili"). |
| `description` | One or two plain sentences on what the dish is. Not the blog story. |
| `servings` | An integer. "4 servings" → 4, "makes 24 cookies" → 24, "6–8" → 6. |
| `prepTime`, `cookTime` | Whole minutes. Use the source's prep and cook time, **not** total time, which often includes soaking or chilling. Mention long passive steps (overnight soak, 2 h chill) in the steps instead. |
| `ingredients` | One line per ingredient: `{ name, amount, unit }`. See below. |
| `steps` | Markdown, as a numbered list (`1. …`, one step per item). Keep each step's substance and drop chatter ("This is my favorite part!"). For recipes in sections, put a bold heading on its own line before each section's list (`**For the sauce**`) and restart the numbering. |
| `tags` | From `list_tags` (step 4). |

**Ingredient lines:**

- `name`: lowercase, singular, the ingredient itself. Move prep notes into the steps or drop them: "2 onions, finely diced" → name `onion`. Drop brand names and prices (Budget Bytes adds "($0.17)").
- `amount`: a string, as written: `"2"`, `"1 ½"`, `"2–3"`, `"to taste"`, `"a pinch"`. Unicode fractions are fine.
- `unit`: only a measure (`cup`, `tbsp`, `tsp`, `g`, `ml`, `oz`, `lb`, `clove`, `can`, `pinch`). Leave it empty for counted items: "2 eggs" → amount `2`, unit `""`, name `egg`.
- When the source gives both metric and imperial ("1 pound (450g)"), keep what the source leads with and put the other in parentheses in the amount: amount `"1 (450 g)"`, unit `lb`.
- "Salt and pepper" becomes two ingredients.

## 3. Ask about gaps, once

`servings`, `prepTime`, `cookTime`, `steps` and at least one ingredient are required. If any are missing or genuinely unclear, ask about all of them in **one** message, with a suggested value for each ("Servings: 4?"). Don't invent a number silently. Estimating times from the steps is fine only if you say it's an estimate in the draft.

## 4. Match against the app

Run these lookups in parallel where you can:

- **Duplicates:** `search_recipes` with the main words of the title. If anything looks like the same dish, show it in the draft with its link and ask whether to continue, update that one instead, or stop.
- **Ingredients:** `search_ingredients` for each ingredient, using its main word ("flour" for "all-purpose flour"). Prefer an existing name when the difference is trivial: plurals, "all-purpose flour" vs "flour", "scallion" vs "green onion". If it's a real difference that matters in the kitchen ("bread flour" vs "flour", "smoked paprika" vs "paprika"), keep the specific name, even if that makes it new. Mark every ingredient that would be created as **new**.
- **Tags:** `list_tags`, and pick the ones that fit: course, cuisine, main ingredient, diet, occasion. Use the source's keywords only as hints. Propose a new tag only when nothing in the list fits, and mark it **new**.

## 5. Show the draft and wait

Show one compact draft:

```
**Chili** · serves 10 · prep 25 min · cook 240 min
Hearty beef and bean chili with dried chiles. Adapted from Serious Eats.

| Amount | Unit | Ingredient |
|---|---|---|
| 1 (450 g) | lb | kidney bean |
| 3 | | ancho chile **(new)** |
| … | | |

Tags: dinner, beef, mexican **(new)**
Steps: 8 (1. Place beans, salt and water in a large container…)

⚠ Possible duplicate: "Beef Chili" by Brie (https://…). Add anyway?

Save it?
```

Then **stop and wait**. Apply whatever changes the user asks for and show the draft again if the changes were substantial. Only a clear yes ("yes", "save it", "looks good") counts as confirmation.

## 6. Save

1. `create_ingredient` for each confirmed **new** ingredient. A result with `created: false` means it already existed, which is fine.
2. `create_recipe` with the full draft, ingredients by name. If it fails with "Unknown ingredients", one was missed: look it up, confirm with the user if it's really new, create it, and retry. If it fails with "Validation failed", fix the named field and retry.
3. Reply with the recipe's title and `url`, and nothing else unless something needs the user's attention.

## Changing an existing recipe

For "fix the bake time on my banana bread" and the like:

1. `search_recipes` to find it, and `get_recipe` to read it. If `isMine` is false, say that only its author can change it, and stop.
2. Show exactly what will change (old → new) and wait for confirmation.
3. `update_recipe` with only the changed fields. Passing `ingredients` replaces the whole list, so send every line, not just the changed one.
4. Reply with the `url`.

Recipes can't be deleted from here. Point the user to the recipe page on the site.

## Errors

The tools return one-line errors written to be acted on. If clang-auth rejected the API key or none is configured, relay the message as is, including its link to the key page, and stop. Don't retry.
