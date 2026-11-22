/**
 * Pull a schema.org Recipe out of a page's JSON-LD (R14). Most recipe sites
 * embed one for search engines, with exact ingredient lines and steps, so the
 * model gets the recipe without the blog post around it.
 */

export interface ExtractedRecipe {
  found: true;
  url: string;
  name: string;
  description: string;
  /** As written: "4", "4 servings", "24 cookies". */
  recipeYield: string | null;
  /** Minutes, from ISO-8601 durations. */
  prepTime: number | null;
  cookTime: number | null;
  totalTime: number | null;
  recipeIngredient: string[];
  /** Steps in order. A section heading appears as its own item ending in ":". */
  recipeInstructions: string[];
  /** keywords, recipeCategory and recipeCuisine, deduped. */
  keywords: string[];
}

export type ExtractResult = ExtractedRecipe | { found: false; url: string; reason: string };

type Json = unknown;

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  frac12: "½", frac13: "⅓", frac23: "⅔", frac14: "¼", frac34: "¾", frac18: "⅛",
  deg: "°", ndash: "–", mdash: "—", hellip: "…",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
};

/** Decode HTML entities and drop tags: JSON-LD text often carries both. */
export function cleanText(value: Json): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, code: string) => {
      if (code[0] === "#") {
        const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : match;
      }
      return ENTITIES[code.toLowerCase()] ?? match;
    })
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?)])/g, "$1")
    .trim();
}

/** ISO-8601 duration ("PT1H15M", "P0DT1H30M0S", "PT90M") → whole minutes. */
export function durationMinutes(value: Json): number | null {
  if (typeof value !== "string") return null;
  const m = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(
    value.trim()
  );
  if (!m || value.trim().toUpperCase() === "P" || value.trim().toUpperCase() === "PT") return null;
  const [, d, h, min, s] = m.map((x) => (x ? Number(x) : 0));
  return Math.round(d * 1440 + h * 60 + min + s / 60);
}

function isRecipe(node: Json): node is Record<string, Json> {
  if (!node || typeof node !== "object" || Array.isArray(node)) return false;
  const type = (node as Record<string, Json>)["@type"];
  return type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
}

/** Depth-first over objects, arrays and @graph, for the first Recipe node. */
function findRecipe(node: Json, depth = 0): Record<string, Json> | null {
  if (depth > 6 || !node || typeof node !== "object") return null;
  if (isRecipe(node)) return node;
  const children = Array.isArray(node) ? node : Object.values(node as Record<string, Json>);
  for (const child of children) {
    const found = findRecipe(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function list(value: Json): Json[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function instructions(value: Json): string[] {
  const out: string[] = [];
  for (const item of list(value)) {
    if (typeof item === "string") {
      // A single string may hold every step, one per line.
      out.push(...item.split(/\n+/).map(cleanText).filter(Boolean));
    } else if (item && typeof item === "object") {
      const node = item as Record<string, Json>;
      if (node["@type"] === "HowToSection" || node.itemListElement) {
        const heading = cleanText(node.name);
        if (heading) out.push(`${heading.replace(/:$/, "")}:`);
        out.push(...instructions(node.itemListElement));
      } else {
        const text = cleanText(node.text) || cleanText(node.name);
        if (text) out.push(text);
      }
    }
  }
  return out;
}

function keywords(recipe: Record<string, Json>): string[] {
  const words = [recipe.keywords, recipe.recipeCategory, recipe.recipeCuisine]
    .flatMap(list)
    .flatMap((k) => (typeof k === "string" ? k.split(",") : []))
    .map(cleanText)
    .filter(Boolean);
  return [...new Set(words.map((w) => w.toLowerCase()))];
}

/** The first JSON-LD Recipe in `html`, normalized, or null. */
export function extractRecipe(html: string, url: string): ExtractedRecipe | null {
  const blocks = html.matchAll(/<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, body] of blocks) {
    let data: Json;
    try {
      data = JSON.parse(body.trim());
    } catch {
      continue; // One malformed block shouldn't hide a valid one.
    }
    const recipe = findRecipe(data);
    if (!recipe) continue;
    const yields = list(recipe.recipeYield).map(cleanText).filter(Boolean);
    return {
      found: true,
      url,
      name: cleanText(recipe.name),
      description: cleanText(recipe.description),
      recipeYield: yields.length > 0 ? yields.sort((a, b) => b.length - a.length)[0] : null,
      prepTime: durationMinutes(recipe.prepTime),
      cookTime: durationMinutes(recipe.cookTime),
      totalTime: durationMinutes(recipe.totalTime),
      recipeIngredient: list(recipe.recipeIngredient ?? recipe.ingredients).map(cleanText).filter(Boolean),
      recipeInstructions: instructions(recipe.recipeInstructions),
      keywords: keywords(recipe),
    };
  }
  return null;
}

const MAX_BYTES = 5 * 1024 * 1024;

/** Fetch `url` and extract its recipe. Failures are results, so the skill can fall back. */
export async function extractRecipeFromUrl(url: string, doFetch: typeof fetch = fetch): Promise<ExtractResult> {
  let res: Response;
  try {
    res = await doFetch(url, {
      headers: { accept: "text/html,application/xhtml+xml", "user-agent": "Mozilla/5.0 (compatible; cooking-mcp-server)" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    return { found: false, url, reason: `Couldn't fetch the page: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (!res.ok) {
    return { found: false, url, reason: `The site answered ${res.status} (often bot protection).` };
  }
  const html = (await res.text()).slice(0, MAX_BYTES);
  return extractRecipe(html, res.url || url) ?? { found: false, url, reason: "No schema.org Recipe data on the page." };
}
