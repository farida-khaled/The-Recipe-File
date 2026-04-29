/* ============================================================
   THE RECIPE FILE — app.js
   Complete application logic with universal edit for all recipes
   ============================================================ */

// ── Configuration ──────────────────────────────────────────
const RECIPES_URL = "recipes.json";

// ── State ──────────────────────────────────────────────────
let allRecipes = [];
let filtered = [];
let favorites = JSON.parse(localStorage.getItem("recipeFavorites") || "[]");
let userRecipes = JSON.parse(localStorage.getItem("userRecipes") || "[]");
let recipeEdits = JSON.parse(localStorage.getItem("recipeEdits") || "{}");
let hiddenRecipes = JSON.parse(localStorage.getItem("hiddenRecipes") || "[]");
let ingredientChecks = {};
let currentView = "grid";
let currentRecipe = null;
let currentUnit = "original";
let currentServings = null;
let originalServings = null;
let editingRecipeId = null;
let searchTimeout = null;
let noteTimeout = null;

// ── DOM References ─────────────────────────────────────────
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const grid = $("#recipe-grid");
const detail = $("#recipe-detail");
const searchInput = $("#search-input");
const filterCuisine = $("#filter-cuisine");
const filterMeal = $("#filter-meal");
const filterDiet = $("#filter-diet");
const filterTag = $("#filter-tag");
const searchBar = $("#search-bar");
const searchToggle = $("#search-toggle");
const categoryLabel = $("#category-label");
const loadingEl = $("#loading-state");
const errorEl = $("#error-state");
const emptyEl = $("#empty-state");
const retryBtn = $("#retry-btn");
const swapModal = $("#swap-modal");
const addModal = $("#add-modal");

// ── Substitution Database ──────────────────────────────────
const SUBSTITUTIONS = {
  "brown sugar": [
    { name: "White Sugar and Molasses", desc: "Mix 1 cup white sugar with 1 tablespoon molasses to replace 1 cup brown sugar. Adjust molasses for darker or lighter brown sugar." },
    { name: "Coconut Sugar", desc: "Use coconut sugar as a 1:1 direct substitute. It has a similar texture and subtle caramel flavor." },
    { name: "Maple Syrup and White Sugar", desc: "Combine ¾ cup white sugar with ¼ cup maple syrup. Reduce other liquids by 1 tablespoon." },
    { name: "Honey and White Sugar", desc: "Mix ¾ cup white sugar with ¼ cup honey per cup of brown sugar. Reduce liquids by 1 tablespoon." },
    { name: "Agave Nectar and White Sugar", desc: "Combine ¾ cup white sugar with 2 tablespoons agave nectar. Reduce liquids by 1 tablespoon." }
  ],
  "sugar": [
    { name: "Honey", desc: "Use ¾ cup honey per 1 cup sugar. Reduce other liquids by ¼ cup and lower oven temp by 25°F." },
    { name: "Maple Syrup", desc: "Use ¾ cup maple syrup per 1 cup sugar. Reduce other liquids by 3 tablespoons." },
    { name: "Coconut Sugar", desc: "Substitute 1:1. Slightly darker color and mild caramel flavor." },
    { name: "Stevia", desc: "Use 1 teaspoon stevia per 1 cup sugar. Adjust for bulk with applesauce or yogurt." }
  ],
  "powdered sugar": [
    { name: "Blended Granulated Sugar", desc: "Blend 1 cup granulated sugar + 1 tablespoon cornstarch in a blender until powdery." },
    { name: "Coconut Sugar (blended)", desc: "Blend coconut sugar until fine. Slightly darker color." }
  ],
  "butter": [
    { name: "Coconut Oil", desc: "Substitute 1:1. Use refined for neutral flavor, unrefined for coconut taste." },
    { name: "Olive Oil", desc: "Use ¾ the amount of olive oil (¾ cup oil per 1 cup butter). Best for savory recipes." },
    { name: "Applesauce", desc: "Use ½ cup applesauce per 1 cup butter for baking. Reduces fat, adds moisture." },
    { name: "Greek Yogurt", desc: "Use ½ cup yogurt per 1 cup butter. Adds moisture and tang." },
    { name: "Avocado", desc: "Substitute 1:1 mashed avocado. Works well in brownies and chocolate baked goods." }
  ],
  "unsalted butter": [
    { name: "Salted Butter", desc: "Use salted butter 1:1 and reduce added salt in the recipe by ¼ teaspoon per stick." },
    { name: "Coconut Oil", desc: "Substitute 1:1. Use refined for neutral flavor." },
    { name: "Vegetable Oil", desc: "Use ¾ cup oil per 1 cup butter. Texture will be slightly different." }
  ],
  "salted butter": [
    { name: "Unsalted Butter + Salt", desc: "Use unsalted butter 1:1 and add ¼ teaspoon salt per stick (½ cup)." },
    { name: "Coconut Oil + Salt", desc: "Use 1:1 refined coconut oil and add a pinch of salt." }
  ],
  "milk": [
    { name: "Oat Milk", desc: "Substitute 1:1. Creamy texture, works well in baking." },
    { name: "Almond Milk", desc: "Substitute 1:1. Slightly thinner, mild nutty flavor." },
    { name: "Coconut Milk", desc: "Substitute 1:1. Adds richness and subtle coconut flavor." },
    { name: "Soy Milk", desc: "Substitute 1:1. Closest to dairy milk in protein content." },
    { name: "Water + Butter", desc: "Mix 1 cup water with 1 tablespoon melted butter for a quick substitute." }
  ],
  "heavy whipping cream": [
    { name: "Coconut Cream", desc: "Use full-fat coconut cream 1:1. Chill the can and scoop the solid cream." },
    { name: "Milk + Butter", desc: "Mix ¾ cup milk with ¼ cup melted butter per 1 cup cream. Won't whip but works for sauces." },
    { name: "Evaporated Milk", desc: "Substitute 1:1 for cooking. Won't whip but adds richness." },
    { name: "Cashew Cream", desc: "Blend soaked cashews with water until smooth. Great dairy-free option." }
  ],
  "heavy cream": [
    { name: "Coconut Cream", desc: "Use full-fat coconut cream 1:1. Chill the can and scoop the solid cream." },
    { name: "Milk + Butter", desc: "Mix ¾ cup milk with ¼ cup melted butter per 1 cup cream." },
    { name: "Evaporated Milk", desc: "Substitute 1:1 for cooking and sauces." }
  ],
  "sour cream": [
    { name: "Greek Yogurt", desc: "Substitute 1:1. Similar tang and texture, slightly less fat." },
    { name: "Cottage Cheese (blended)", desc: "Blend until smooth and use 1:1. Adds protein." },
    { name: "Buttermilk", desc: "Use ¾ cup buttermilk per 1 cup sour cream. Thinner consistency." },
    { name: "Coconut Cream + Lemon", desc: "Mix coconut cream with a squeeze of lemon juice for dairy-free option." }
  ],
  "cream cheese": [
    { name: "Mascarpone", desc: "Substitute 1:1. Richer and slightly sweeter." },
    { name: "Greek Yogurt (strained)", desc: "Strain yogurt overnight through cheesecloth. Tangier but similar texture." },
    { name: "Cottage Cheese (blended)", desc: "Blend until completely smooth. Lower fat alternative." },
    { name: "Neufchâtel Cheese", desc: "Substitute 1:1. Lower fat version of cream cheese, very similar taste." },
    { name: "Cashew Cream Cheese", desc: "Blend soaked cashews with lemon juice and salt. Dairy-free option." }
  ],
  "eggs": [
    { name: "Flax Egg", desc: "Mix 1 tablespoon ground flaxseed with 3 tablespoons water per egg. Let sit 5 minutes." },
    { name: "Chia Egg", desc: "Mix 1 tablespoon chia seeds with 3 tablespoons water per egg. Let sit 5 minutes." },
    { name: "Mashed Banana", desc: "Use ¼ cup mashed banana per egg. Adds sweetness, best for baking." },
    { name: "Applesauce", desc: "Use ¼ cup unsweetened applesauce per egg. Good for moist baked goods." },
    { name: "Commercial Egg Replacer", desc: "Follow package directions. Bob's Red Mill and JUST Egg are popular options." }
  ],
  "all-purpose flour": [
    { name: "Whole Wheat Flour", desc: "Substitute 1:1 but use ¾ cup + 2 tablespoons per cup of AP flour. Denser result." },
    { name: "Cake Flour", desc: "Use 1 cup + 2 tablespoons cake flour per 1 cup AP flour. Lighter, softer texture." },
    { name: "Almond Flour", desc: "Use 1:1 but add extra binding (egg or xanthan gum). Gluten-free, denser." },
    { name: "Oat Flour", desc: "Blend oats into flour and use 1:1. Slightly denser, mild flavor." },
    { name: "Gluten-Free Blend", desc: "Use a 1:1 GF baking blend like Bob's Red Mill or King Arthur." }
  ],
  "baking powder": [
    { name: "Baking Soda + Cream of Tartar", desc: "Mix ¼ teaspoon baking soda + ½ teaspoon cream of tartar per 1 teaspoon baking powder." },
    { name: "Self-Rising Flour", desc: "Replace flour with self-rising flour and omit the baking powder entirely." }
  ],
  "baking soda": [
    { name: "Baking Powder", desc: "Use 3 times the amount of baking powder (3 tsp baking powder per 1 tsp baking soda). Omit or reduce acidic ingredients." }
  ],
  "vanilla extract": [
    { name: "Vanilla Bean Paste", desc: "Substitute 1:1. Adds visible vanilla bean specks." },
    { name: "Vanilla Bean", desc: "Use seeds from ½ vanilla bean per 1 teaspoon extract." },
    { name: "Maple Extract", desc: "Substitute 1:1. Adds a warm maple flavor instead." },
    { name: "Almond Extract", desc: "Use ½ teaspoon almond extract per 1 teaspoon vanilla. Stronger flavor." }
  ],
  "ground cinnamon": [
    { name: "Allspice", desc: "Use ¼ to ½ teaspoon allspice per 1 teaspoon cinnamon. Warmer, more complex." },
    { name: "Nutmeg", desc: "Use ¼ teaspoon nutmeg per 1 teaspoon cinnamon. Milder, slightly sweet." },
    { name: "Cardamom", desc: "Use ½ teaspoon cardamom per 1 teaspoon cinnamon. Floral and aromatic." },
    { name: "Pumpkin Pie Spice", desc: "Substitute 1:1. Contains cinnamon plus other warm spices." }
  ],
  "cinnamon": [
    { name: "Allspice", desc: "Use ¼ to ½ teaspoon allspice per 1 teaspoon cinnamon." },
    { name: "Nutmeg", desc: "Use ¼ teaspoon nutmeg per 1 teaspoon cinnamon." },
    { name: "Cardamom", desc: "Use ½ teaspoon cardamom per 1 teaspoon cinnamon." }
  ],
  "corn syrup": [
    { name: "Honey", desc: "Substitute 1:1. Adds distinct honey flavor, slightly thicker." },
    { name: "Maple Syrup", desc: "Substitute 1:1. Adds maple flavor." },
    { name: "Agave Nectar", desc: "Substitute 1:1. Milder flavor, similar consistency." },
    { name: "Golden Syrup", desc: "Substitute 1:1. Buttery caramel flavor, common in British baking." }
  ],
  "salt": [
    { name: "Kosher Salt", desc: "Use 1¼ to 1½ teaspoons kosher salt per 1 teaspoon table salt (larger crystals)." },
    { name: "Sea Salt", desc: "Substitute 1:1 for fine sea salt. Adjust if using coarse/flaky." },
    { name: "Soy Sauce", desc: "Use ½ teaspoon soy sauce per pinch of salt in savory dishes. Adds umami." }
  ],
  "olive oil": [
    { name: "Avocado Oil", desc: "Substitute 1:1. Neutral flavor, high smoke point." },
    { name: "Coconut Oil", desc: "Substitute 1:1. Use refined for neutral flavor." },
    { name: "Vegetable Oil", desc: "Substitute 1:1. More neutral flavor." },
    { name: "Butter", desc: "Use about ¾ the amount of butter. Adds richness." }
  ],
  "vegetable oil": [
    { name: "Canola Oil", desc: "Substitute 1:1. Very similar neutral flavor." },
    { name: "Coconut Oil (melted)", desc: "Substitute 1:1. Use refined for neutral taste." },
    { name: "Applesauce", desc: "Use ¾ cup applesauce per 1 cup oil in baking. Reduces fat significantly." }
  ],
  "soy sauce": [
    { name: "Tamari", desc: "Substitute 1:1. Gluten-free option with similar flavor." },
    { name: "Coconut Aminos", desc: "Substitute 1:1. Less sodium, slightly sweeter." },
    { name: "Worcestershire Sauce", desc: "Use ½ the amount. Different flavor profile but adds umami." }
  ],
  "garlic": [
    { name: "Garlic Powder", desc: "Use ⅛ teaspoon garlic powder per clove of fresh garlic." },
    { name: "Garlic Paste", desc: "Use ½ teaspoon paste per clove." },
    { name: "Shallots", desc: "Use 1 small shallot per 2 cloves garlic. Milder, sweeter." }
  ],
  "onion": [
    { name: "Shallots", desc: "Use 2 shallots per 1 medium onion. More delicate flavor." },
    { name: "Onion Powder", desc: "Use 1 teaspoon onion powder per small onion." },
    { name: "Leeks", desc: "Use the white and light green parts. Milder, sweeter flavor." }
  ],
  "rice": [
    { name: "Quinoa", desc: "Substitute 1:1. Higher protein, slightly nutty flavor." },
    { name: "Cauliflower Rice", desc: "Use riced cauliflower for low-carb option. Different texture." },
    { name: "Couscous", desc: "Substitute 1:1. Cooks faster, slightly different texture." }
  ],
  "pasta": [
    { name: "Zucchini Noodles", desc: "Spiralize zucchini for low-carb option. Sauté briefly or serve raw." },
    { name: "Rice Noodles", desc: "Gluten-free option. Cook according to package directions." },
    { name: "Spaghetti Squash", desc: "Roast and scrape into strands. Low-carb, mild flavor." }
  ],
  "breadcrumbs": [
    { name: "Crushed Crackers", desc: "Crush saltines or Ritz crackers. Similar texture, adds flavor." },
    { name: "Panko", desc: "Japanese breadcrumbs, lighter and crispier. Substitute 1:1." },
    { name: "Oats", desc: "Pulse oats in food processor. Good for meatballs and meatloaf." },
    { name: "Crushed Cornflakes", desc: "Adds extra crunch. Great for coating." }
  ],
  "chicken broth": [
    { name: "Vegetable Broth", desc: "Substitute 1:1. Lighter flavor, vegetarian-friendly." },
    { name: "Bouillon + Water", desc: "Dissolve 1 bouillon cube in 1 cup hot water." },
    { name: "Water + Soy Sauce", desc: "Add 1 teaspoon soy sauce per cup of water for umami." }
  ],
  "tomato paste": [
    { name: "Tomato Sauce", desc: "Use 3 tablespoons tomato sauce per 1 tablespoon paste. Reduce other liquids slightly." },
    { name: "Ketchup", desc: "Use 1 tablespoon ketchup per 1 tablespoon paste. Adds sweetness." },
    { name: "Sun-Dried Tomatoes (blended)", desc: "Blend sun-dried tomatoes with a little oil until smooth." }
  ],
  "cornstarch": [
    { name: "All-Purpose Flour", desc: "Use 2 tablespoons flour per 1 tablespoon cornstarch for thickening." },
    { name: "Arrowroot Powder", desc: "Substitute 1:1. Clear finish, freezer-friendly." },
    { name: "Tapioca Starch", desc: "Use 2 tablespoons tapioca per 1 tablespoon cornstarch." }
  ],
  "buttermilk": [
    { name: "Milk + Vinegar", desc: "Add 1 tablespoon white vinegar or lemon juice to 1 cup milk. Let sit 5 minutes." },
    { name: "Milk + Cream of Tartar", desc: "Add 1¾ teaspoons cream of tartar to 1 cup milk." },
    { name: "Plain Yogurt + Milk", desc: "Mix ¾ cup yogurt with ¼ cup milk." }
  ],
  "mayonnaise": [
    { name: "Greek Yogurt", desc: "Substitute 1:1. Tangier, lower fat." },
    { name: "Avocado", desc: "Mash and use 1:1. Adds healthy fats and creaminess." },
    { name: "Sour Cream", desc: "Substitute 1:1. Similar richness and tang." }
  ],
  "parmesan": [
    { name: "Pecorino Romano", desc: "Substitute 1:1. Sharper, saltier flavor." },
    { name: "Nutritional Yeast", desc: "Use 2 tablespoons per ¼ cup parmesan. Vegan, cheesy flavor." },
    { name: "Asiago", desc: "Substitute 1:1. Similar hard cheese, slightly milder." }
  ],
  "mozzarella": [
    { name: "Provolone", desc: "Substitute 1:1. Melts well, slightly sharper." },
    { name: "Monterey Jack", desc: "Substitute 1:1. Mild, great melting cheese." },
    { name: "Cashew Mozzarella", desc: "Blend soaked cashews with tapioca starch for vegan option." }
  ],
  "white wine": [
    { name: "Chicken Broth + Lemon", desc: "Use broth with a squeeze of lemon juice for acidity." },
    { name: "White Wine Vinegar + Water", desc: "Mix 1 tablespoon vinegar with ½ cup water per ½ cup wine." },
    { name: "Apple Cider Vinegar + Broth", desc: "1 tablespoon ACV in broth. Good for deglazing." }
  ],
  "red wine": [
    { name: "Beef Broth", desc: "Substitute 1:1. Adds depth without alcohol." },
    { name: "Red Wine Vinegar + Broth", desc: "Mix 1 tablespoon vinegar with broth to replace wine." },
    { name: "Grape Juice + Vinegar", desc: "Mix ¾ cup grape juice with 1 tablespoon vinegar per cup of wine." }
  ]
};

// ── Fraction Helpers ───────────────────────────────────────
const FRACTIONS = [
  [1/8, "⅛"], [1/4, "¼"], [1/3, "⅓"], [3/8, "⅜"], [1/2, "½"],
  [5/8, "⅝"], [2/3, "⅔"], [3/4, "¾"], [7/8, "⅞"]
];

function parseFraction(s) {
  if (s == null || s === "") return null;
  s = String(s).trim();
  const unicodeMap = {"½":.5,"⅓":.333,"⅔":.667,"¼":.25,"¾":.75,"⅛":.125,"⅜":.375,"⅝":.625,"⅞":.875};
  for (const [ch, val] of Object.entries(unicodeMap)) {
    if (s.includes(ch)) {
      const parts = s.split(ch);
      const whole = parts[0] ? parseFloat(parts[0]) : 0;
      return whole + val;
    }
  }
  if (s.includes("/")) {
    const parts = s.split(/\s+/);
    if (parts.length === 2 && parts[1].includes("/")) {
      const [n, d] = parts[1].split("/").map(Number);
      return parseFloat(parts[0]) + (d ? n / d : 0);
    }
    const [n, d] = s.split("/").map(Number);
    return d ? n / d : parseFloat(s);
  }
  if (s.includes("-") || s.includes("–")) {
    const parts = s.split(/[-–]/).map(p => parseFraction(p.trim()));
    if (parts.length === 2 && parts[0] != null && parts[1] != null) return (parts[0] + parts[1]) / 2;
  }
  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

function toFraction(n) {
  if (n == null || isNaN(n)) return "";
  if (n === 0) return "0";
  const neg = n < 0 ? "-" : "";
  n = Math.abs(n);
  const whole = Math.floor(n);
  const frac = n - whole;
  if (frac < 0.03) return neg + (whole || "0");
  let best = "", bestDiff = 1;
  for (const [val, sym] of FRACTIONS) {
    const diff = Math.abs(frac - val);
    if (diff < bestDiff) { bestDiff = diff; best = sym; }
  }
  if (bestDiff < 0.04) return neg + (whole ? whole + " " + best : best);
  return neg + n.toFixed(2).replace(/\.?0+$/, "");
}

// ── Unit Conversion Engine ─────────────────────────────────
const UNIT_ALIASES = {
  "cup": "cup", "cups": "cup", "c": "cup",
  "tablespoon": "tbsp", "tablespoons": "tbsp", "tbsp": "tbsp", "tbs": "tbsp", "tb": "tbsp",
  "teaspoon": "tsp", "teaspoons": "tsp", "tsp": "tsp", "ts": "tsp",
  "ounce": "oz", "ounces": "oz", "oz": "oz",
  "pound": "lb", "pounds": "lb", "lb": "lb", "lbs": "lb",
  "gram": "g", "grams": "g", "g": "g",
  "kilogram": "kg", "kilograms": "kg", "kg": "kg",
  "milliliter": "ml", "milliliters": "ml", "ml": "ml",
  "liter": "L", "liters": "L", "l": "L",
  "inch": "in", "inches": "in", "in": "in",
  "centimeter": "cm", "centimeters": "cm", "cm": "cm",
  "pinch": "pinch", "dash": "dash",
  "whole": "whole", "large": "large", "medium": "medium", "small": "small",
  "clove": "clove", "cloves": "clove",
  "can": "can", "cans": "can",
  "package": "package", "packages": "package", "pkg": "package",
  "bunch": "bunch", "bunches": "bunch",
  "slice": "slice", "slices": "slice",
  "piece": "piece", "pieces": "piece",
  "head": "head", "heads": "head",
  "stalk": "stalk", "stalks": "stalk",
  "sprig": "sprig", "sprigs": "sprig",
  "stick": "stick", "sticks": "stick"
};

const NO_CONVERT = new Set(["pinch","dash","whole","large","medium","small","clove","can","package","bunch","slice","piece","head","stalk","sprig","stick",""]);

const TO_METRIC = {
  "cup": { unit: "ml", factor: 236.588 },
  "tbsp": { unit: "ml", factor: 14.787 },
  "tsp": { unit: "ml", factor: 4.929 },
  "oz": { unit: "g", factor: 28.3495 },
  "lb": { unit: "g", factor: 453.592 },
  "in": { unit: "cm", factor: 2.54 }
};

const TO_US = {
  "ml": { unit: "cup", factor: 1 / 236.588 },
  "g": { unit: "oz", factor: 1 / 28.3495 },
  "kg": { unit: "lb", factor: 2.20462 },
  "L": { unit: "cup", factor: 4.22675 },
  "cm": { unit: "in", factor: 1 / 2.54 }
};

function normalizeUnit(u) {
  if (!u) return "";
  return UNIT_ALIASES[u.toLowerCase().trim()] || u.toLowerCase().trim();
}

function convertAmount(amount, fromUnit, system) {
  const norm = normalizeUnit(fromUnit);
  if (NO_CONVERT.has(norm) || amount == null) return { amount, unit: fromUnit, converted: false };
  const table = system === "metric" ? TO_METRIC : TO_US;
  const conv = table[norm];
  if (!conv) return { amount, unit: fromUnit, converted: false };
  let newAmt = amount * conv.factor;
  let newUnit = conv.unit;
  if (system === "metric") {
    if (newUnit === "ml" && newAmt >= 1000) { newAmt /= 1000; newUnit = "L"; }
    if (newUnit === "g" && newAmt >= 1000) { newAmt /= 1000; newUnit = "kg"; }
  }
  if (system === "us") {
    if (newUnit === "cup" && newAmt < 0.125) { newAmt *= 48; newUnit = "tsp"; }
    else if (newUnit === "cup" && newAmt < 0.25) { newAmt *= 16; newUnit = "tbsp"; }
    if (newUnit === "oz" && newAmt >= 16) { newAmt /= 16; newUnit = "lb"; }
  }
  return { amount: newAmt, unit: newUnit, converted: true };
}

function convertTempInText(text, system) {
  if (!text) return text;
  if (system === "metric") {
    return text.replace(/(\d+)\s*°?\s*F\b/g, (_, f) => Math.round((parseInt(f) - 32) * 5 / 9) + "°C");
  }
  if (system === "us") {
    return text.replace(/(\d+)\s*°?\s*C\b/g, (_, c) => Math.round(parseInt(c) * 9 / 5 + 32) + "°F");
  }
  return text;
}

// ── Sanitize ───────────────────────────────────────────────
function esc(s) {
  if (!s) return "";
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// ── Slug Generator ─────────────────────────────────────────
function slugify(text) {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

// ── Data Loading ───────────────────────────────────────────
async function fetchRecipes() {
  showState("loading");
  try {
    let data;
    try {
      const resp = await fetch(RECIPES_URL);
      if (!resp.ok) throw new Error(resp.status);
      data = await resp.json();
    } catch (e) {
      console.log("Fetch error:", e, "— trying embedded fallback");
      if (window.__RECIPES_DATA) {
        data = window.__RECIPES_DATA;
      } else {
        throw e;
      }
    }
    // Apply edits overlay to JSON-loaded recipes
    const jsonRecipes = data.map(r => {
      if (recipeEdits[r.id]) {
        return { ...r, ...recipeEdits[r.id], _jsonBase: true, _edited: true };
      }
      return { ...r, _jsonBase: true };
    });
    // Filter out hidden recipes
    const visibleJson = jsonRecipes.filter(r => !hiddenRecipes.includes(r.id));
    // Merge with user recipes
    allRecipes = [...visibleJson, ...userRecipes.map(r => ({ ...r, _userCreated: true }))];
    filtered = [...allRecipes];
    populateFilters();
    showState("grid");
    renderGrid();
    handleHash();
  } catch (err) {
    console.error("Fetch error:", err);
    showState("error");
  }
}

// ── State Management ───────────────────────────────────────
function showState(state) {
  grid.classList.add("hidden");
  detail.classList.add("hidden");
  loadingEl.classList.add("hidden");
  errorEl.classList.add("hidden");
  emptyEl.classList.add("hidden");
  if (state === "loading") loadingEl.classList.remove("hidden");
  else if (state === "error") errorEl.classList.remove("hidden");
  else if (state === "empty") emptyEl.classList.remove("hidden");
  else if (state === "grid") { grid.classList.remove("hidden"); currentView = "grid"; }
  else if (state === "detail") { detail.classList.remove("hidden"); currentView = "detail"; }
}

// ── Filter Population ──────────────────────────────────────
function populateFilters() {
  const cuisines = new Set(), meals = new Set(), diets = new Set(), tags = new Set();
  allRecipes.forEach(r => {
    if (r.cuisine) cuisines.add(r.cuisine);
    if (r.mealType) meals.add(r.mealType);
    if (r.diet) diets.add(r.diet);
    if (r.tags) r.tags.forEach(t => tags.add(t));
  });
  fillSelect(filterCuisine, cuisines, "All Cuisines");
  fillSelect(filterMeal, meals, "All Meals");
  fillSelect(filterDiet, diets, "All Diets");
  fillSelect(filterTag, tags, "All Tags");
}

function fillSelect(el, items, placeholder) {
  el.innerHTML = `<option value="">${placeholder}</option>`;
  [...items].sort().forEach(item => {
    el.innerHTML += `<option value="${esc(item)}">${esc(item)}</option>`;
  });
}

// ── Search & Filter ────────────────────────────────────────
function applyFilters() {
  const q = searchInput.value.toLowerCase().trim();
  const cuisine = filterCuisine.value;
  const meal = filterMeal.value;
  const diet = filterDiet.value;
  const tag = filterTag.value;
  filtered = allRecipes.filter(r => {
    if (cuisine && r.cuisine !== cuisine) return false;
    if (meal && r.mealType !== meal) return false;
    if (diet && r.diet !== diet) return false;
    if (tag && (!r.tags || !r.tags.includes(tag))) return false;
    if (q) {
      const haystack = [r.title, r.description, r.cuisine, r.mealType, r.diet, ...(r.tags || [])].join(" ").toLowerCase();
      const ingHaystack = (r.ingredients || []).map(g => (g.items || []).map(i => i.item).join(" ")).join(" ").toLowerCase();
      if (!haystack.includes(q) && !ingHaystack.includes(q)) return false;
    }
    return true;
  });
  // Update category label
  const parts = [];
  if (cuisine) parts.push(cuisine);
  if (meal) parts.push(meal);
  if (diet) parts.push(diet);
  if (tag) parts.push(tag);
  categoryLabel.textContent = parts.length ? parts.join(" · ").toUpperCase() : (favorites.length && currentView === "grid" ? "ALL RECIPES" : "ALL RECIPES");
  renderGrid();
  if (filtered.length === 0 && (q || cuisine || meal || diet || tag)) showState("empty");
  else showState("grid");
}

// ── Favorites View ─────────────────────────────────────────
function showFavorites() {
  filtered = allRecipes.filter(r => favorites.includes(r.id));
  categoryLabel.textContent = "FAVORITES";
  renderGrid();
  if (filtered.length === 0) showState("empty");
  else showState("grid");
}

// ── Grid Rendering ─────────────────────────────────────────
function renderGrid() {
  grid.innerHTML = "";
  // Show hidden recipes notice
  if (hiddenRecipes.length > 0) {
    const notice = document.createElement("div");
    notice.className = "hidden-notice";
    notice.innerHTML = `<span>${hiddenRecipes.length} hidden recipe${hiddenRecipes.length > 1 ? "s" : ""}</span> <button class="btn-show-hidden">Show Hidden</button>`;
    notice.querySelector(".btn-show-hidden").addEventListener("click", () => {
      hiddenRecipes = [];
      localStorage.setItem("hiddenRecipes", "[]");
      fetchRecipes();
    });
    grid.appendChild(notice);
  }
  filtered.forEach(r => {
    const card = document.createElement("article");
    card.className = "recipe-card";
    const isFav = favorites.includes(r.id);
    const initial = (r.title || "R")[0].toUpperCase();
    const badges = [];
    if (r._userCreated) badges.push('<span class="badge-user">MY RECIPE</span>');
    if (r._edited) badges.push('<span class="badge-edited">EDITED</span>');
    card.innerHTML = `
      <div class="card-img-wrap" data-slug="${esc(r.slug)}">
        ${r.image ? `<img src="${esc(r.image)}" alt="${esc(r.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'card-placeholder\\'>${initial}</div>'">` : `<div class="card-placeholder">${initial}</div>`}
      </div>
      <div class="card-body">
        <div class="card-badges">${badges.join("")}</div>
        <div class="card-cuisine">${esc(r.cuisine || r.mealType || "")}</div>
        <h2 class="card-title" data-slug="${esc(r.slug)}">${esc(r.title)}</h2>
        <p class="card-desc">${esc(r.description || "")}</p>
        <div class="card-meta">
          ${r.totalTime ? `<span>⏱ ${esc(r.totalTime)}</span>` : ""}
          ${r.servings ? `<span>🍽 ${r.servings}</span>` : ""}
        </div>
        <button class="btn-fav${isFav ? " is-fav" : ""}" data-id="${esc(r.id)}" aria-label="Toggle favorite">♥</button>
      </div>`;
    card.querySelector(".card-img-wrap").addEventListener("click", () => showDetail(r.slug));
    card.querySelector(".card-title").addEventListener("click", () => showDetail(r.slug));
    card.querySelector(".btn-fav").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(r.id);
    });
    grid.appendChild(card);
  });
}

// ── Detail Rendering ───────────────────────────────────────
function showDetail(slug) {
  const recipe = allRecipes.find(r => r.slug === slug);
  if (!recipe) return;
  currentRecipe = recipe;
  originalServings = recipe.servings || 1;
  currentServings = originalServings;
  currentUnit = "original";
  window.location.hash = slug;
  renderDetail();
  showState("detail");
  detail.scrollTop = 0;
}

function renderDetail() {
  const r = currentRecipe;
  if (!r) return;
  const isFav = favorites.includes(r.id);
  const servings = currentServings || originalServings;
  const ratio = servings / originalServings;

  // Source rendering
  let sourceHTML = "";
  if (r.source) {
    if (typeof r.source === "object" && r.source.url) {
      const domain = r.source.url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      sourceHTML = `<div class="meta-item"><span class="meta-label">SOURCE</span><a href="${esc(r.source.url)}" target="_blank" rel="noopener" class="source-link">🌐 ${esc(r.source.name || domain)}</a></div>`;
    } else if (typeof r.source === "object" && r.source.name) {
      sourceHTML = `<div class="meta-item"><span class="meta-label">SOURCE</span><span>📖 ${esc(r.source.name)}</span></div>`;
    } else if (typeof r.source === "string") {
      sourceHTML = `<div class="meta-item"><span class="meta-label">SOURCE</span><span>📖 ${esc(r.source)}</span></div>`;
    }
  }

  // Ingredient groups
  let ingHTML = "";
  const groups = r.ingredients || [];
  groups.forEach((group, gi) => {
    ingHTML += `<div class="ing-group">`;
    if (group.group) ingHTML += `<div class="ing-group-label">${esc(group.group)}</div>`;
    (group.items || []).forEach((item, ii) => {
      const raw = parseFraction(item.amount);
      let displayAmt = raw != null ? raw * ratio : null;
      let displayUnit = item.unit || "";
      let converted = false;
      if (currentUnit !== "original" && displayAmt != null) {
        const c = convertAmount(displayAmt, displayUnit, currentUnit);
        displayAmt = c.amount;
        displayUnit = c.unit;
        converted = c.converted;
      }
      const amtStr = displayAmt != null ? toFraction(displayAmt) : "";
      const checkKey = `${r.id}__${gi}__${ii}`;
      const isChecked = ingredientChecks[checkKey] || false;
      const hasSubs = findSubstitutions(item.item);
      ingHTML += `
        <div class="ing-row${isChecked ? " checked" : ""}">
          <label class="ing-check-label">
            <input type="checkbox" class="ing-checkbox" data-key="${checkKey}" ${isChecked ? "checked" : ""}>
            <span class="ing-checkmark"></span>
          </label>
          <div class="ing-text">
            <span class="ing-amount">${esc(amtStr)}</span>
            <span class="ing-unit">${esc(displayUnit)}</span>
            <span class="ing-name">${esc(item.item)}</span>
            ${item.notes ? `<span class="ing-notes">(${esc(item.notes)})</span>` : ""}
            ${converted ? '<span class="badge-converted">converted</span>' : ""}
          </div>
          ${hasSubs ? `<button class="btn-swap" data-item="${esc(item.item)}" data-gi="${gi}" data-ii="${ii}">↕ Swap</button>` : ""}
          <div class="ing-sub-inline hidden" data-sub-key="${gi}-${ii}"></div>
        </div>`;
    });
    ingHTML += `</div>`;
  });

  // Count checked
  let totalIngs = 0, checkedIngs = 0;
  groups.forEach((g, gi) => (g.items || []).forEach((_, ii) => {
    totalIngs++;
    if (ingredientChecks[`${r.id}__${gi}__${ii}`]) checkedIngs++;
  }));

  // Instructions
  let instrHTML = "";
  (r.instructions || []).forEach(step => {
    let text = step.text || "";
    if (currentUnit !== "original") text = convertTempInText(text, currentUnit);
    instrHTML += `<div class="step-row"><span class="step-num">${String(step.step).padStart(2, "0")}</span><p class="step-text">${esc(text)}</p></div>`;
  });

  // Notes from localStorage
  const savedNotes = localStorage.getItem(`notes_${r.id}`) || "";
  const savedNotesTime = localStorage.getItem(`notes_${r.id}_time`);
  let notesTimeStr = "";
  if (savedNotesTime) {
    const diff = Date.now() - parseInt(savedNotesTime);
    if (diff < 60000) notesTimeStr = "just now";
    else if (diff < 3600000) notesTimeStr = Math.floor(diff / 60000) + " min ago";
    else if (diff < 86400000) notesTimeStr = Math.floor(diff / 3600000) + " hr ago";
    else notesTimeStr = new Date(parseInt(savedNotesTime)).toLocaleDateString();
  }

  detail.innerHTML = `
    <nav class="detail-nav">
      <button class="btn-back" id="btn-back">← Back</button>
      <div class="detail-actions">
        <button class="btn-edit-recipe" id="btn-edit-recipe">✎ Edit</button>
        <button class="btn-delete-recipe" id="btn-delete-recipe">🗑 Delete</button>
        <button class="btn-fav detail-fav${isFav ? " is-fav" : ""}" data-id="${esc(r.id)}">♥</button>
      </div>
    </nav>
    ${r.image ? `<div class="detail-hero"><img src="${esc(r.image)}" alt="${esc(r.title)}"></div>` : ""}
    <div class="detail-header">
      <h1 class="detail-title">${esc(r.title)}</h1>
      ${r.description ? `<p class="detail-desc">${esc(r.description)}</p>` : ""}
      <div class="detail-meta">
        ${r.totalTime ? `<div class="meta-item"><span class="meta-label">TIME</span><span>${esc(r.totalTime)}</span></div>` : ""}
        ${r.cuisine ? `<div class="meta-item"><span class="meta-label">CUISINE</span><span>${esc(r.cuisine)}</span></div>` : ""}
        ${r.mealType ? `<div class="meta-item"><span class="meta-label">MEAL</span><span>${esc(r.mealType)}</span></div>` : ""}
        ${r.diet ? `<div class="meta-item"><span class="meta-label">DIET</span><span>${esc(r.diet)}</span></div>` : ""}
        ${sourceHTML}
      </div>
      ${r.tags && r.tags.length ? `<div class="detail-tags">${r.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
    </div>
    <div class="detail-controls">
      <div class="unit-toggle">
        <span class="control-label">Units</span>
        <button class="btn-unit${currentUnit === "original" ? " active" : ""}" data-unit="original">Original</button>
        <button class="btn-unit${currentUnit === "us" ? " active" : ""}" data-unit="us">US</button>
        <button class="btn-unit${currentUnit === "metric" ? " active" : ""}" data-unit="metric">Metric</button>
      </div>
      <div class="serving-scaler">
        <span class="control-label">Servings</span>
        <button class="btn-scale" id="scale-down">−</button>
        <span class="scale-value" id="scale-value">${servings}</span>
        <button class="btn-scale" id="scale-up">+</button>
        <button class="btn-scale-reset" id="scale-reset">Reset</button>
      </div>
    </div>
    <div class="detail-body">
      <div class="detail-ingredients">
        <div class="ing-header">
          <h3>Ingredients <span class="ing-count">(${totalIngs})</span></h3>
          <div class="ing-actions">
            <span class="ing-checked-count">${checkedIngs} of ${totalIngs} checked</span>
            <button class="btn-select-all" id="btn-select-all">Select all</button>
            <button class="btn-unselect-all" id="btn-unselect-all">Unselect all</button>
          </div>
        </div>
        ${ingHTML}
      </div>
      <div class="detail-instructions">
        <h3>Instructions <span class="step-count">(${(r.instructions || []).length} steps)</span></h3>
        ${instrHTML}
      </div>
    </div>
    ${r.notes ? `<div class="detail-recipe-notes"><h3>Recipe Notes</h3><p>${esc(r.notes)}</p></div>` : ""}
    <div class="detail-my-notes">
      <h3>My Notes</h3>
      <textarea id="my-notes-area" placeholder="Jot down ideas, modifications, tips…">${esc(savedNotes)}</textarea>
      <div class="notes-footer">
        <span class="notes-time" id="notes-time">${notesTimeStr ? "Last saved " + notesTimeStr : ""}</span>
        <button class="btn-clear-notes" id="btn-clear-notes">Clear</button>
      </div>
    </div>`;

  // ── Event Listeners ──
  // Back
  $("#btn-back").addEventListener("click", goBack);

  // Edit — works for ALL recipes
  $("#btn-edit-recipe").addEventListener("click", () => openEditForm(r));

  // Delete
  $("#btn-delete-recipe").addEventListener("click", () => {
    const label = r._userCreated ? "permanently delete" : "hide";
    if (!confirm(`Are you sure you want to ${label} "${r.title}"?`)) return;
    if (r._userCreated) {
      userRecipes = userRecipes.filter(u => u.id !== r.id);
      localStorage.setItem("userRecipes", JSON.stringify(userRecipes));
    } else {
      // Hide JSON-loaded recipe
      hiddenRecipes.push(r.id);
      localStorage.setItem("hiddenRecipes", JSON.stringify(hiddenRecipes));
      // Also remove any edits
      delete recipeEdits[r.id];
      localStorage.setItem("recipeEdits", JSON.stringify(recipeEdits));
    }
    allRecipes = allRecipes.filter(a => a.id !== r.id);
    filtered = filtered.filter(a => a.id !== r.id);
    goBack();
    renderGrid();
  });

  // Favorite
  detail.querySelector(".detail-fav").addEventListener("click", (e) => {
    toggleFavorite(r.id);
    e.target.classList.toggle("is-fav");
  });

  // Unit toggle
  detail.querySelectorAll(".btn-unit").forEach(btn => {
    btn.addEventListener("click", () => {
      currentUnit = btn.dataset.unit;
      renderDetail();
    });
  });

  // Serving scaler
  $("#scale-down").addEventListener("click", () => {
    if (currentServings > 1) { currentServings--; renderDetail(); }
  });
  $("#scale-up").addEventListener("click", () => {
    if (currentServings < 99) { currentServings++; renderDetail(); }
  });
  $("#scale-reset").addEventListener("click", () => {
    currentServings = originalServings;
    renderDetail();
  });

  // Ingredient checkboxes
  detail.querySelectorAll(".ing-checkbox").forEach(cb => {
    cb.addEventListener("change", () => {
      const key = cb.dataset.key;
      ingredientChecks[key] = cb.checked;
      localStorage.setItem("ingredientChecks", JSON.stringify(ingredientChecks));
      cb.closest(".ing-row").classList.toggle("checked", cb.checked);
      updateCheckedCount();
    });
  });

  // Select all / Unselect all
  $("#btn-select-all").addEventListener("click", () => {
    detail.querySelectorAll(".ing-checkbox").forEach(cb => {
      cb.checked = true;
      ingredientChecks[cb.dataset.key] = true;
      cb.closest(".ing-row").classList.add("checked");
    });
    localStorage.setItem("ingredientChecks", JSON.stringify(ingredientChecks));
    updateCheckedCount();
  });
  $("#btn-unselect-all").addEventListener("click", () => {
    detail.querySelectorAll(".ing-checkbox").forEach(cb => {
      cb.checked = false;
      ingredientChecks[cb.dataset.key] = false;
      cb.closest(".ing-row").classList.remove("checked");
    });
    localStorage.setItem("ingredientChecks", JSON.stringify(ingredientChecks));
    updateCheckedCount();
  });

  // Swap buttons
  detail.querySelectorAll(".btn-swap").forEach(btn => {
    btn.addEventListener("click", () => openSwapModal(btn.dataset.item, btn.dataset.gi, btn.dataset.ii));
  });

  // Notes auto-save
  const notesArea = $("#my-notes-area");
  notesArea.addEventListener("input", () => {
    clearTimeout(noteTimeout);
    noteTimeout = setTimeout(() => {
      localStorage.setItem(`notes_${r.id}`, notesArea.value);
      localStorage.setItem(`notes_${r.id}_time`, Date.now().toString());
      $("#notes-time").textContent = "Last saved just now";
    }, 500);
  });
  $("#btn-clear-notes").addEventListener("click", () => {
    notesArea.value = "";
    localStorage.removeItem(`notes_${r.id}`);
    localStorage.removeItem(`notes_${r.id}_time`);
    $("#notes-time").textContent = "";
  });
}

function updateCheckedCount() {
  const total = detail.querySelectorAll(".ing-checkbox").length;
  const checked = detail.querySelectorAll(".ing-checkbox:checked").length;
  const counter = detail.querySelector(".ing-checked-count");
  if (counter) counter.textContent = `${checked} of ${total} checked`;
}

// ── Substitution Lookup ────────────────────────────────────
function findSubstitutions(itemName) {
  if (!itemName) return null;
  const lower = itemName.toLowerCase().trim();
  if (SUBSTITUTIONS[lower]) return SUBSTITUTIONS[lower];
  // Strip common prefixes
  const stripped = lower.replace(/^(ground|fresh|dried|unsalted|salted|large|medium|small|whole|pure)\s+/i, "");
  if (SUBSTITUTIONS[stripped]) return SUBSTITUTIONS[stripped];
  // Partial match
  for (const key of Object.keys(SUBSTITUTIONS)) {
    if (lower.includes(key) || key.includes(lower)) return SUBSTITUTIONS[key];
  }
  return null;
}

function openSwapModal(itemName, gi, ii) {
  const subs = findSubstitutions(itemName);
  if (!subs) return;
  const body = swapModal.querySelector(".modal-body");
  body.innerHTML = `<h3>Choose a Substitution for ${esc(itemName)}</h3>`;
  subs.forEach(sub => {
    const opt = document.createElement("div");
    opt.className = "swap-option";
    opt.innerHTML = `<div class="swap-option-icon">✓</div><div class="swap-option-content"><strong>${esc(sub.name)}</strong><p>${esc(sub.desc)}</p></div>`;
    opt.addEventListener("click", () => {
      closeSwapModal();
      showInlineSub(gi, ii, sub);
    });
    body.appendChild(opt);
  });
  swapModal.classList.remove("hidden");
  swapModal.querySelector(".modal-close").onclick = closeSwapModal;
  swapModal.querySelector(".modal-overlay").onclick = closeSwapModal;
}

function closeSwapModal() {
  swapModal.classList.add("hidden");
}

function showInlineSub(gi, ii, sub) {
  const el = detail.querySelector(`[data-sub-key="${gi}-${ii}"]`);
  if (!el) return;
  el.classList.remove("hidden");
  el.innerHTML = `
    <div class="sub-inline-card">
      <div class="sub-inline-header">
        <strong>Substitute: ${esc(sub.name)}</strong>
        <button class="sub-inline-close">✕</button>
      </div>
      <p>${esc(sub.desc)}</p>
    </div>`;
  el.querySelector(".sub-inline-close").addEventListener("click", () => {
    el.classList.add("hidden");
    el.innerHTML = "";
  });
}

// ── Favorites ──────────────────────────────────────────────
function toggleFavorite(id) {
  const idx = favorites.indexOf(id);
  if (idx > -1) favorites.splice(idx, 1);
  else favorites.push(id);
  localStorage.setItem("recipeFavorites", JSON.stringify(favorites));
  renderGrid();
  if (currentView === "detail") {
    const btn = detail.querySelector(".detail-fav");
    if (btn) btn.classList.toggle("is-fav", favorites.includes(id));
  }
}

// ── Navigation ─────────────────────────────────────────────
function goBack() {
  window.location.hash = "";
  currentRecipe = null;
  applyFilters();
  showState("grid");
}

function handleHash() {
  const hash = window.location.hash.slice(1);
  if (hash && hash !== "favorites" && hash !== "add") {
    showDetail(hash);
  } else if (hash === "favorites") {
    showFavorites();
  }
}

// ── Add / Edit Recipe Form ─────────────────────────────────
function openAddForm() {
  editingRecipeId = null;
  clearForm();
  addModal.querySelector(".modal-form-title").textContent = "Add New Recipe";
  addModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function openEditForm(recipe) {
  editingRecipeId = recipe.id;
  clearForm();
  addModal.querySelector(".modal-form-title").textContent = "Edit Recipe";
  // Fill form fields
  $("#form-title").value = recipe.title || "";
  $("#form-desc").value = recipe.description || "";
  $("#form-image").value = recipe.image || "";
  $("#form-servings").value = recipe.servings || "";
  $("#form-prep").value = recipe.prepTime || "";
  $("#form-cook").value = recipe.cookTime || "";
  $("#form-cuisine").value = recipe.cuisine || "";
  $("#form-meal").value = recipe.mealType || "";
  $("#form-diet").value = recipe.diet || "";
  $("#form-tags").value = (recipe.tags || []).join(", ");
  $("#form-source-name").value = (recipe.source && typeof recipe.source === "object") ? (recipe.source.name || "") : (typeof recipe.source === "string" ? recipe.source : "");
  $("#form-source-url").value = (recipe.source && typeof recipe.source === "object") ? (recipe.source.url || "") : "";
  $("#form-notes").value = recipe.notes || "";

  // Populate ingredient groups
  const groupsContainer = $("#form-ing-groups");
  groupsContainer.innerHTML = "";
  (recipe.ingredients || []).forEach(group => {
    const groupEl = createIngredientGroupEl(group.group || "");
    const itemsContainer = groupEl.querySelector(".form-ing-items");
    itemsContainer.innerHTML = "";
    (group.items || []).forEach(item => {
      itemsContainer.appendChild(createIngredientRowEl(
        item.amount != null ? String(item.amount) : "",
        item.unit || "",
        item.item || "",
        item.notes || ""
      ));
    });
    groupsContainer.appendChild(groupEl);
  });
  if (groupsContainer.children.length === 0) {
    groupsContainer.appendChild(createIngredientGroupEl(""));
  }

  // Populate instructions
  const stepsContainer = $("#form-steps");
  stepsContainer.innerHTML = "";
  (recipe.instructions || []).forEach(step => {
    stepsContainer.appendChild(createStepRowEl(step.text || ""));
  });
  if (stepsContainer.children.length === 0) {
    stepsContainer.appendChild(createStepRowEl(""));
  }

  addModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeAddForm() {
  addModal.classList.add("hidden");
  document.body.style.overflow = "";
  editingRecipeId = null;
}

function clearForm() {
  $("#form-title").value = "";
  $("#form-desc").value = "";
  $("#form-image").value = "";
  $("#form-servings").value = "";
  $("#form-prep").value = "";
  $("#form-cook").value = "";
  $("#form-cuisine").value = "";
  $("#form-meal").value = "";
  $("#form-diet").value = "";
  $("#form-tags").value = "";
  $("#form-source-name").value = "";
  $("#form-source-url").value = "";
  $("#form-notes").value = "";
  const groupsContainer = $("#form-ing-groups");
  groupsContainer.innerHTML = "";
  groupsContainer.appendChild(createIngredientGroupEl(""));
  const stepsContainer = $("#form-steps");
  stepsContainer.innerHTML = "";
  stepsContainer.appendChild(createStepRowEl(""));
  const errEl = $("#form-error");
  if (errEl) errEl.textContent = "";
}

function createIngredientGroupEl(groupName) {
  const div = document.createElement("div");
  div.className = "form-ing-group";
  div.innerHTML = `
    <div class="form-ing-group-header">
      <input type="text" class="form-input form-group-name" placeholder="Group name (e.g. Filling, Sauce)" value="${esc(groupName)}">
      <button type="button" class="btn-remove-group">✕</button>
    </div>
    <div class="form-ing-items"></div>
    <button type="button" class="btn-add-ing">+ Add Ingredient</button>`;
  div.querySelector(".form-ing-items").appendChild(createIngredientRowEl());
  div.querySelector(".btn-add-ing").addEventListener("click", () => {
    div.querySelector(".form-ing-items").appendChild(createIngredientRowEl());
  });
  div.querySelector(".btn-remove-group").addEventListener("click", () => {
    if ($("#form-ing-groups").children.length > 1) div.remove();
  });
  return div;
}

function createIngredientRowEl(amt = "", unit = "", item = "", notes = "") {
  const div = document.createElement("div");
  div.className = "form-ing-row";
  const unitOptions = ["", "cup", "tablespoon", "teaspoon", "oz", "lb", "g", "kg", "ml", "L", "pinch", "dash", "whole", "large", "medium", "small", "clove", "can", "package", "bunch", "slice"];
  const unitSelect = unitOptions.map(u => `<option value="${u}"${u === unit ? " selected" : ""}>${u || "unit"}</option>`).join("");
  div.innerHTML = `
    <input type="text" class="form-input form-ing-amt" placeholder="Amt" value="${esc(amt)}">
    <select class="form-input form-ing-unit">${unitSelect}</select>
    <input type="text" class="form-input form-ing-item" placeholder="Ingredient" value="${esc(item)}">
    <input type="text" class="form-input form-ing-notes" placeholder="Notes" value="${esc(notes)}">
    <button type="button" class="btn-remove-ing">✕</button>`;
  div.querySelector(".btn-remove-ing").addEventListener("click", () => {
    if (div.parentElement.children.length > 1) div.remove();
  });
  return div;
}

function createStepRowEl(text = "") {
  const div = document.createElement("div");
  div.className = "form-step-row";
  div.innerHTML = `
    <span class="form-step-num"></span>
    <textarea class="form-input form-step-text" placeholder="Describe this step…">${esc(text)}</textarea>
    <button type="button" class="btn-remove-step">✕</button>`;
  div.querySelector(".btn-remove-step").addEventListener("click", () => {
    if (div.parentElement.children.length > 1) div.remove();
    renumberSteps();
  });
  return div;
}

function renumberSteps() {
  const steps = $$("#form-steps .form-step-row");
  steps.forEach((s, i) => {
    s.querySelector(".form-step-num").textContent = String(i + 1).padStart(2, "0");
  });
}

function saveRecipe() {
  const title = $("#form-title").value.trim();
  const errEl = $("#form-error");
  if (!title) { errEl.textContent = "Title is required."; return; }

  // Build ingredients
  const ingredients = [];
  $$("#form-ing-groups .form-ing-group").forEach(groupEl => {
    const groupName = groupEl.querySelector(".form-group-name").value.trim();
    const items = [];
    groupEl.querySelectorAll(".form-ing-row").forEach(row => {
      const item = row.querySelector(".form-ing-item").value.trim();
      if (!item) return;
      const amtRaw = row.querySelector(".form-ing-amt").value.trim();
      const amt = parseFraction(amtRaw);
      items.push({
        item,
        amount: amt != null ? amt : (amtRaw || null),
        unit: row.querySelector(".form-ing-unit").value,
        notes: row.querySelector(".form-ing-notes").value.trim() || ""
      });
    });
    if (items.length > 0) ingredients.push({ group: groupName, items });
  });

  if (ingredients.length === 0) { errEl.textContent = "Add at least one ingredient."; return; }

  // Build instructions
  const instructions = [];
  $$("#form-steps .form-step-row").forEach((row, i) => {
    const text = row.querySelector(".form-step-text").value.trim();
    if (text) instructions.push({ step: i + 1, text });
  });

  if (instructions.length === 0) { errEl.textContent = "Add at least one instruction step."; return; }

  // Build source
  let source = null;
  const srcName = $("#form-source-name").value.trim();
  const srcUrl = $("#form-source-url").value.trim();
  if (srcName || srcUrl) {
    source = {};
    if (srcName) source.name = srcName;
    if (srcUrl) source.url = srcUrl;
  }

  // Compute totalTime
  const prepTime = $("#form-prep").value.trim();
  const cookTime = $("#form-cook").value.trim();
  let totalTime = "";
  const prepMin = parseInt(prepTime) || 0;
  const cookMin = parseInt(cookTime) || 0;
  if (prepMin + cookMin > 0) totalTime = (prepMin + cookMin) + " min";

  // Tags
  const tagsRaw = $("#form-tags").value.trim();
  const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];

  const now = new Date().toISOString();

  if (editingRecipeId) {
    // ── Editing existing recipe ──
    const existingRecipe = allRecipes.find(r => r.id === editingRecipeId);
    if (!existingRecipe) return;

    const updatedFields = {
      title,
      slug: slugify(title),
      description: $("#form-desc").value.trim(),
      image: $("#form-image").value.trim(),
      servings: parseInt($("#form-servings").value) || null,
      prepTime: prepTime || "",
      cookTime: cookTime || "",
      totalTime,
      cuisine: $("#form-cuisine").value.trim(),
      mealType: $("#form-meal").value.trim(),
      diet: $("#form-diet").value.trim(),
      tags,
      ingredients,
      instructions,
      notes: $("#form-notes").value.trim(),
      source,
      updatedAt: now
    };

    if (existingRecipe._userCreated) {
      // Update user recipe in localStorage
      const idx = userRecipes.findIndex(u => u.id === editingRecipeId);
      if (idx > -1) {
        userRecipes[idx] = { ...userRecipes[idx], ...updatedFields };
        localStorage.setItem("userRecipes", JSON.stringify(userRecipes));
      }
    } else {
      // Save as edit overlay for JSON-loaded recipe
      recipeEdits[editingRecipeId] = updatedFields;
      localStorage.setItem("recipeEdits", JSON.stringify(recipeEdits));
    }

    // Update in-memory
    const memIdx = allRecipes.findIndex(r => r.id === editingRecipeId);
    if (memIdx > -1) {
      allRecipes[memIdx] = { ...allRecipes[memIdx], ...updatedFields };
      if (!existingRecipe._userCreated) {
        allRecipes[memIdx]._edited = true;
        allRecipes[memIdx]._jsonBase = true;
      }
    }

    closeAddForm();
    applyFilters();
    // Re-open the detail view with updated data
    currentRecipe = allRecipes.find(r => r.id === editingRecipeId);
    if (currentRecipe) {
      originalServings = currentRecipe.servings || 1;
      currentServings = originalServings;
      renderDetail();
      showState("detail");
    }
  } else {
    // ── Creating new recipe ──
    const newRecipe = {
      id: "rec-" + Date.now(),
      slug: slugify(title),
      title,
      description: $("#form-desc").value.trim(),
      image: $("#form-image").value.trim(),
      servings: parseInt($("#form-servings").value) || null,
      prepTime: prepTime || "",
      cookTime: cookTime || "",
      totalTime,
      cuisine: $("#form-cuisine").value.trim(),
      mealType: $("#form-meal").value.trim(),
      diet: $("#form-diet").value.trim(),
      tags,
      ingredients,
      instructions,
      notes: $("#form-notes").value.trim(),
      source,
      favorite: false,
      createdAt: now,
      updatedAt: now
    };

    userRecipes.push(newRecipe);
    localStorage.setItem("userRecipes", JSON.stringify(userRecipes));
    allRecipes.push({ ...newRecipe, _userCreated: true });
    closeAddForm();
    applyFilters();
  }
}

// ── Export ──────────────────────────────────────────────────
function exportRecipes() {
  // Merge everything: JSON recipes with edits applied + user recipes
  const exportData = allRecipes.map(r => {
    const clean = { ...r };
    delete clean._userCreated;
    delete clean._jsonBase;
    delete clean._edited;
    return clean;
  });
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "recipes-export.json";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Reset to Original (for edited JSON recipes) ────────────
function resetToOriginal(recipeId) {
  delete recipeEdits[recipeId];
  localStorage.setItem("recipeEdits", JSON.stringify(recipeEdits));
  // Reload to get fresh data
  fetchRecipes();
}

// ── Init ───────────────────────────────────────────────────
// Load ingredient checks from localStorage
try {
  ingredientChecks = JSON.parse(localStorage.getItem("ingredientChecks") || "{}");
} catch (e) { ingredientChecks = {}; }

// Search toggle
searchToggle.addEventListener("click", () => {
  searchBar.classList.toggle("hidden");
  if (!searchBar.classList.contains("hidden")) searchInput.focus();
});

// Search input
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(applyFilters, 250);
});

// Filter changes
[filterCuisine, filterMeal, filterDiet, filterTag].forEach(el => {
  el.addEventListener("change", applyFilters);
});

// Favorites nav
const favNav = $("#nav-favorites");
if (favNav) favNav.addEventListener("click", showFavorites);

// Logo / home
const logoLink = $("#logo-link");
if (logoLink) logoLink.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.hash = "";
  searchInput.value = "";
  filterCuisine.value = "";
  filterMeal.value = "";
  filterDiet.value = "";
  filterTag.value = "";
  applyFilters();
  showState("grid");
});

// Add recipe button
const addBtn = $("#btn-add-recipe");
if (addBtn) addBtn.addEventListener("click", openAddForm);

// Add form close
const addFormClose = addModal ? addModal.querySelector(".modal-close") : null;
if (addFormClose) addFormClose.addEventListener("click", closeAddForm);
const addFormOverlay = addModal ? addModal.querySelector(".modal-overlay") : null;
if (addFormOverlay) addFormOverlay.addEventListener("click", closeAddForm);

// Add ingredient group button
const addGroupBtn = $("#btn-add-group");
if (addGroupBtn) addGroupBtn.addEventListener("click", () => {
  $("#form-ing-groups").appendChild(createIngredientGroupEl(""));
});

// Add step button
const addStepBtn = $("#btn-add-step");
if (addStepBtn) addStepBtn.addEventListener("click", () => {
  $("#form-steps").appendChild(createStepRowEl(""));
  renumberSteps();
});

// Save recipe button
const saveBtn = $("#btn-save-recipe");
if (saveBtn) saveBtn.addEventListener("click", saveRecipe);

// Export button
const exportBtn = $("#btn-export");
if (exportBtn) exportBtn.addEventListener("click", exportRecipes);

// Retry button
if (retryBtn) retryBtn.addEventListener("click", fetchRecipes);

// Hash navigation
window.addEventListener("hashchange", () => {
  const hash = window.location.hash.slice(1);
  if (!hash) {
    goBack();
  } else if (hash === "favorites") {
    showFavorites();
  } else {
    showDetail(hash);
  }
});

// MutationObserver for step renumbering
const stepsContainer = $("#form-steps");
if (stepsContainer) {
  const observer = new MutationObserver(renumberSteps);
  observer.observe(stepsContainer, { childList: true });
}

// ── Launch ─────────────────────────────────────────────────
fetchRecipes();
