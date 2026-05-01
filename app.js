/* ============================================================
   THE RECIPE FILE — app.js
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// ── Firebase Configuration ─────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBpykyAod8H7aJvsuzx8BO0y-CDWGIODlM",
  authDomain: "the-recipe-file.firebaseapp.com",
  projectId: "the-recipe-file",
  storageBucket: "the-recipe-file.firebasestorage.app",
  messagingSenderId: "303652779418",
  appId: "1:303652779418:web:f6db0dd49c1ac47f94f623",
  measurementId: "G-P57WQBH03Z"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── State ──────────────────────────────────────────────────
let allRecipes = [];
let filtered = [];
let ingredientChecks = JSON.parse(localStorage.getItem("ingredientChecks") || "{}");
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
  "brown sugar": [{ name: "White Sugar and Molasses", desc: "Mix 1 cup white sugar with 1 tablespoon molasses to replace 1 cup brown sugar." }, { name: "Coconut Sugar", desc: "Use coconut sugar as a 1:1 direct substitute." }],
  "sugar": [{ name: "Honey", desc: "Use ¾ cup honey per 1 cup sugar. Reduce other liquids by ¼ cup and lower oven temp by 25°F." }, { name: "Maple Syrup", desc: "Use ¾ cup maple syrup per 1 cup sugar. Reduce other liquids by 3 tablespoons." }],
  "butter": [{ name: "Coconut Oil", desc: "Substitute 1:1. Use refined for neutral flavor." }, { name: "Olive Oil", desc: "Use ¾ the amount of olive oil. Best for savory recipes." }],
  "milk": [{ name: "Oat Milk", desc: "Substitute 1:1. Creamy texture, works well in baking." }, { name: "Almond Milk", desc: "Substitute 1:1. Slightly thinner, mild nutty flavor." }],
  "heavy cream": [{ name: "Coconut Cream", desc: "Use full-fat coconut cream 1:1." }, { name: "Milk + Butter", desc: "Mix ¾ cup milk with ¼ cup melted butter per 1 cup cream." }],
  "sour cream": [{ name: "Greek Yogurt", desc: "Substitute 1:1. Similar tang and texture, slightly less fat." }],
  "cream cheese": [{ name: "Mascarpone", desc: "Substitute 1:1. Richer and slightly sweeter." }, { name: "Greek Yogurt (strained)", desc: "Strain yogurt overnight through cheesecloth." }],
  "eggs": [{ name: "Flax Egg", desc: "Mix 1 tablespoon ground flaxseed with 3 tablespoons water per egg. Let sit 5 minutes." }, { name: "Mashed Banana", desc: "Use ¼ cup mashed banana per egg." }],
  "all-purpose flour": [{ name: "Whole Wheat Flour", desc: "Substitute 1:1 but use ¾ cup + 2 tablespoons per cup of AP flour. Denser result." }, { name: "Gluten-Free Blend", desc: "Use a 1:1 GF baking blend." }],
  "vanilla extract": [{ name: "Vanilla Bean Paste", desc: "Substitute 1:1." }],
  "olive oil": [{ name: "Avocado Oil", desc: "Substitute 1:1. Neutral flavor, high smoke point." }],
  "soy sauce": [{ name: "Tamari", desc: "Substitute 1:1. Gluten-free option." }, { name: "Coconut Aminos", desc: "Substitute 1:1. Less sodium, slightly sweeter." }]
};

// ── Fraction Helpers ───────────────────────────────────────
const FRACTIONS = [[1/8, "⅛"], [1/4, "¼"], [1/3, "⅓"], [3/8, "⅜"], [1/2, "½"], [5/8, "⅝"], [2/3, "⅔"], [3/4, "¾"], [7/8, "⅞"]];

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

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

// ── UX Helpers ─────────────────────────────────────────────
function notify(text) {
  if (window.Toastify) {
    Toastify({
      text: text,
      duration: 3000,
      gravity: "bottom",
      position: "right",
      style: {
        background: "var(--text)",
        color: "var(--bg)",
        fontFamily: "var(--sans)",
        fontSize: "0.9rem",
        borderRadius: "0px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
      }
    }).showToast();
  }
}

// Helper to convert "1 hr 15 min" or "50 min" into a pure number for sorting
function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 9999; // Push recipes with no time to the bottom
  let mins = 0;
  const hrMatch = timeStr.match(/(\d+)\s*(hr|hour)/i);
  const minMatch = timeStr.match(/(\d+)\s*min/i);
  if (hrMatch) mins += parseInt(hrMatch[1], 10) * 60;
  if (minMatch) mins += parseInt(minMatch[1], 10);
  return mins || 9999;
}

// ── Data Loading (Firebase) ────────────────────────────────
async function fetchRecipes() {
  showState("loading");
  try {
    const querySnapshot = await getDocs(collection(db, "recipes"));
    allRecipes = [];
    querySnapshot.forEach((doc) => {
      allRecipes.push({ ...doc.data(), id: doc.id });
    });
    
    filtered = [...allRecipes];
    populateFilters();
    showState("grid");
    applyFilters();
    handleHash();
  } catch (err) {
    console.error("Fetch error:", err);
    showState("error");
  }
}

// ── State Management ───────────────────────────────────────
function applyStateChange(state) {
  grid.classList.add("hidden"); detail.classList.add("hidden");
  loadingEl.classList.add("hidden"); errorEl.classList.add("hidden"); emptyEl.classList.add("hidden");
  if (state === "loading") loadingEl.classList.remove("hidden");
  else if (state === "error") errorEl.classList.remove("hidden");
  else if (state === "empty") emptyEl.classList.remove("hidden");
  else if (state === "grid") { grid.classList.remove("hidden"); currentView = "grid"; }
  else if (state === "detail") { detail.classList.remove("hidden"); currentView = "detail"; }
}

function showState(state) {
  // If the browser supports View Transitions, animate it. Otherwise, snap instantly.
  if (!document.startViewTransition) applyStateChange(state);
  else document.startViewTransition(() => applyStateChange(state));
}

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

function applyFilters() {
  const q = searchInput.value.toLowerCase().trim();
  const cuisine = filterCuisine.value;
  const meal = filterMeal.value;
  const diet = filterDiet.value;
  const tag = filterTag.value;
  
  // Safely grab the sort dropdown
  const sortSelect = document.getElementById("sort-recipes");
  const sortVal = sortSelect ? sortSelect.value : "newest";

  // 1. FILTERING
  filtered = allRecipes.filter(r => {
    // A. Check Favorites View
    if (currentView === "favorites" && !r.favorite) return false;

    // B. Check Dropdowns
    if (cuisine && r.cuisine !== cuisine) return false;
    if (meal && r.mealType !== meal) return false;
    if (diet && r.diet !== diet) return false;
    if (tag && (!r.tags || !r.tags.includes(tag))) return false;

    // C. Check Search Query
    if (q) {
      const haystack = [r.title, r.description, r.cuisine, r.mealType, r.diet, ...(r.tags || [])].join(" ").toLowerCase();
      const ingHaystack = (r.ingredients || []).map(g => (g.items || []).map(i => i.item).join(" ")).join(" ").toLowerCase();
      if (!haystack.includes(q) && !ingHaystack.includes(q)) return false;
    }
    return true;
  });

  // 2. SORTING
  filtered.sort((a, b) => {
    if (sortVal === "newest") {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    } else if (sortVal === "oldest") {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    } else if (sortVal === "a-z") {
      return (a.title || "").localeCompare(b.title || "");
    } else if (sortVal === "z-a") {
      return (b.title || "").localeCompare(a.title || "");
    } else if (sortVal === "time-asc") {
      return parseTimeToMinutes(a.totalTime) - parseTimeToMinutes(b.totalTime);
    } else if (sortVal === "time-desc") {
      return parseTimeToMinutes(b.totalTime) - parseTimeToMinutes(a.totalTime);
    }
    return 0;
  });

  // 3. RENDERING
  categoryLabel.textContent = currentView === "favorites" ? "FAVORITES" : "ALL RECIPES";
  renderGrid();
  
  if (filtered.length === 0) showState("empty");
  else showState("grid");
}

function showFavorites() {
  currentView = "favorites";
  applyFilters(); // Pushes the logic through the unified pipeline
}

// ── Grid Rendering ─────────────────────────────────────────
function renderGrid() {
  grid.innerHTML = "";
  filtered.forEach(r => {
    const card = document.createElement("article");
    card.className = "recipe-card";
    card.setAttribute("data-aos", "fade-up");
    const initial = (r.title || "R")[0].toUpperCase();
    card.innerHTML = `
      <div class="card-img-wrap" data-slug="${esc(r.slug)}">
        ${r.image ? `<img src="${esc(r.image)}" alt="${esc(r.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'card-placeholder\\'>${initial}</div>'">` : `<div class="card-placeholder">${initial}</div>`}
      </div>
      <div class="card-body">
        <div class="card-cuisine">${esc(r.cuisine || r.mealType || "")}</div>
        <h2 class="card-title" data-slug="${esc(r.slug)}">${esc(r.title)}</h2>
        <p class="card-desc">${esc(r.description || "")}</p>
        <div class="card-meta">
          ${r.totalTime ? `<span>⏱ ${esc(r.totalTime)}</span>` : ""}
          ${r.servings ? `<span>🍽 ${r.servings}</span>` : ""}
        </div>
        <button class="btn-fav${r.favorite ? " is-fav" : ""}" data-id="${esc(r.id)}" aria-label="Toggle favorite">♥</button>
      </div>`;
    card.querySelector(".card-img-wrap").addEventListener("click", () => showDetail(r.slug));
    card.querySelector(".card-title").addEventListener("click", () => showDetail(r.slug));
    card.querySelector(".btn-fav").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(r.id, !r.favorite);
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
  const isFav = r.favorite;
  const servings = currentServings || originalServings;
  const ratio = servings / originalServings;

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

  let totalIngs = 0, checkedIngs = 0;
  groups.forEach((g, gi) => (g.items || []).forEach((_, ii) => {
    totalIngs++;
    if (ingredientChecks[`${r.id}__${gi}__${ii}`]) checkedIngs++;
  }));

  let instrHTML = "";
  (r.instructions || []).forEach(step => {
    let text = step.text || "";
    if (currentUnit !== "original") text = convertTempInText(text, currentUnit);
    instrHTML += `<div class="step-row"><span class="step-num">${String(step.step).padStart(2, "0")}</span><p class="step-text">${esc(text)}</p></div>`;
  });

  const savedNotes = localStorage.getItem(`notes_${r.id}`) || "";

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
      <div style="display: flex; gap: 24px; width: 100%; flex-wrap: wrap;">
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
      <div class="action-buttons">
         <button class="btn-action" id="btn-copy-ings">📋 Copy Ingredients</button>
         <button class="btn-action" id="btn-cooking-mode">💡 Wake Lock: Off</button>
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
        <span class="notes-time" id="notes-time"></span>
        <button class="btn-clear-notes" id="btn-clear-notes">Clear</button>
      </div>
    </div>`;

  // Listeners
  $("#btn-back").addEventListener("click", goBack);
  $("#btn-edit-recipe").addEventListener("click", () => openEditForm(r));
  $("#btn-delete-recipe").addEventListener("click", () => deleteRecipe(r.id, r.title));
  
  // Copy Ingredients Logic
  $("#btn-copy-ings").addEventListener("click", () => {
    let text = `${r.title} Ingredients:\n\n`;
    groups.forEach(g => {
      if (g.group) text += `${g.group}:\n`;
      g.items.forEach(i => { text += `- ${i.amount || ''} ${i.unit || ''} ${i.item} ${i.notes ? '('+i.notes+')' : ''}\n`; });
      text += '\n';
    });
    navigator.clipboard.writeText(text.trim()).then(() => notify("Ingredients copied to clipboard!"));
  });

  // Cooking Mode (Wake Lock API) Logic
  let wakeLock = null;
  const cookBtn = $("#btn-cooking-mode");
  cookBtn.addEventListener("click", async () => {
    if (wakeLock !== null) {
      wakeLock.release().then(() => { 
        wakeLock = null; 
        cookBtn.textContent = "💡 Wake Lock: Off"; 
        cookBtn.classList.remove("active"); 
        notify("Screen will now sleep normally."); 
      });
    } else {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        cookBtn.textContent = "💡 Wake Lock: ON";
        cookBtn.classList.add("active");
        notify("Cooking mode on. Screen will stay awake!");
      } catch (err) { 
        notify("Wake lock not supported on this browser/device."); 
      }
    }
  });

  detail.querySelector(".detail-fav").addEventListener("click", (e) => {
    const isCurrentlyFav = e.target.classList.contains("is-fav");
    toggleFavorite(r.id, !isCurrentlyFav);
    e.target.classList.toggle("is-fav");
  });

  detail.querySelectorAll(".btn-unit").forEach(btn => {
    btn.addEventListener("click", () => { currentUnit = btn.dataset.unit; renderDetail(); });
  });

  $("#scale-down").addEventListener("click", () => { if (currentServings > 1) { currentServings--; renderDetail(); } });
  $("#scale-up").addEventListener("click", () => { if (currentServings < 99) { currentServings++; renderDetail(); } });
  $("#scale-reset").addEventListener("click", () => { currentServings = originalServings; renderDetail(); });

  detail.querySelectorAll(".ing-checkbox").forEach(cb => {
    cb.addEventListener("change", () => {
      const key = cb.dataset.key;
      ingredientChecks[key] = cb.checked;
      localStorage.setItem("ingredientChecks", JSON.stringify(ingredientChecks));
      cb.closest(".ing-row").classList.toggle("checked", cb.checked);
      updateCheckedCount();
    });
  });

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

  detail.querySelectorAll(".btn-swap").forEach(btn => {
    btn.addEventListener("click", () => openSwapModal(btn.dataset.item, btn.dataset.gi, btn.dataset.ii));
  });

  const notesArea = $("#my-notes-area");
  notesArea.addEventListener("input", () => {
    clearTimeout(noteTimeout);
    noteTimeout = setTimeout(() => {
      localStorage.setItem(`notes_${r.id}`, notesArea.value);
      $("#notes-time").textContent = "Saved to browser";
    }, 500);
  });
  
  $("#btn-clear-notes").addEventListener("click", () => {
    notesArea.value = "";
    localStorage.removeItem(`notes_${r.id}`);
    $("#notes-time").textContent = "";
    notify("Notes cleared!");
  });
}

function updateCheckedCount() {
  const total = detail.querySelectorAll(".ing-checkbox").length;
  const checked = detail.querySelectorAll(".ing-checkbox:checked").length;
  const counter = detail.querySelector(".ing-checked-count");
  if (counter) counter.textContent = `${checked} of ${total} checked`;
}

// ── Subs ───────────────────────────────────────────────────
function findSubstitutions(itemName) {
  if (!itemName) return null;
  const lower = itemName.toLowerCase().trim();
  if (SUBSTITUTIONS[lower]) return SUBSTITUTIONS[lower];
  const stripped = lower.replace(/^(ground|fresh|dried|unsalted|salted|large|medium|small|whole|pure)\s+/i, "");
  if (SUBSTITUTIONS[stripped]) return SUBSTITUTIONS[stripped];
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

function closeSwapModal() { swapModal.classList.add("hidden"); }

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

// ── Firebase Interactions ──────────────────────────────────
async function toggleFavorite(id, isFav) {
  try {
    const recipeRef = doc(db, "recipes", id);
    await updateDoc(recipeRef, { favorite: isFav });
    
    // Update local state instantly so UI doesn't lag
    const rec = allRecipes.find(r => r.id === id);
    if (rec) rec.favorite = isFav;
    if (currentView === "grid") renderGrid();
    
    notify(isFav ? "Saved to Favorites ❤️" : "Removed from Favorites 🤍");
  } catch (error) {
    console.error("Error updating favorite: ", error);
    notify("Error saving favorite.");
  }
}

async function deleteRecipe(id, title) {
  if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
  try {
    await deleteDoc(doc(db, "recipes", id));
    allRecipes = allRecipes.filter(r => r.id !== id);
    goBack();
    notify("Recipe deleted.");
  } catch (error) {
    console.error("Error deleting recipe: ", error);
    notify("Error deleting recipe.");
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

// ── Form Handling ──────────────────────────────────────────
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
  if (groupsContainer.children.length === 0) groupsContainer.appendChild(createIngredientGroupEl(""));

  const stepsContainer = $("#form-steps");
  stepsContainer.innerHTML = "";
  (recipe.instructions || []).forEach(step => {
    stepsContainer.appendChild(createStepRowEl(step.text || ""));
  });
  if (stepsContainer.children.length === 0) stepsContainer.appendChild(createStepRowEl(""));

  addModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeAddForm() {
  addModal.classList.add("hidden");
  document.body.style.overflow = "";
  editingRecipeId = null;
}

function clearForm() {
  $("#form-title").value = ""; $("#form-desc").value = ""; $("#form-image").value = "";
  $("#form-servings").value = ""; $("#form-prep").value = ""; $("#form-cook").value = "";
  $("#form-cuisine").value = ""; $("#form-meal").value = ""; $("#form-diet").value = "";
  $("#form-tags").value = ""; $("#form-source-name").value = ""; $("#form-source-url").value = "";
  $("#form-notes").value = "";
  const groupsContainer = $("#form-ing-groups");
  groupsContainer.innerHTML = ""; groupsContainer.appendChild(createIngredientGroupEl(""));
  const stepsContainer = $("#form-steps");
  stepsContainer.innerHTML = ""; stepsContainer.appendChild(createStepRowEl(""));
  if ($("#form-error")) $("#form-error").textContent = "";
}

function createIngredientGroupEl(groupName) {
  const div = document.createElement("div"); div.className = "form-ing-group";
  div.innerHTML = `
    <div class="form-ing-group-header">
      <input type="text" class="form-input form-group-name" placeholder="Group name (e.g. Filling, Sauce)" value="${esc(groupName)}">
      <button type="button" class="btn-remove-group">✕</button>
    </div>
    <div class="form-ing-items"></div>
    <button type="button" class="btn-add-ing">+ Add Ingredient</button>`;
  div.querySelector(".form-ing-items").appendChild(createIngredientRowEl());
  div.querySelector(".btn-add-ing").addEventListener("click", () => div.querySelector(".form-ing-items").appendChild(createIngredientRowEl()));
  div.querySelector(".btn-remove-group").addEventListener("click", () => { if ($("#form-ing-groups").children.length > 1) div.remove(); });
  return div;
}

function createIngredientRowEl(amt = "", unit = "", item = "", notes = "") {
  const div = document.createElement("div"); div.className = "form-ing-row";
  const unitOptions = ["", "cup", "tablespoon", "teaspoon", "oz", "lb", "g", "kg", "ml", "L", "pinch", "dash", "whole", "large", "medium", "small", "clove", "can", "package", "bunch", "slice"];
  const unitSelect = unitOptions.map(u => `<option value="${u}"${u === unit ? " selected" : ""}>${u || "unit"}</option>`).join("");
  div.innerHTML = `
    <input type="text" class="form-input form-ing-amt" placeholder="Amt" value="${esc(amt)}">
    <select class="form-input form-ing-unit">${unitSelect}</select>
    <input type="text" class="form-input form-ing-item" placeholder="Ingredient" value="${esc(item)}">
    <input type="text" class="form-input form-ing-notes" placeholder="Notes" value="${esc(notes)}">
    <button type="button" class="btn-remove-ing">✕</button>`;
  div.querySelector(".btn-remove-ing").addEventListener("click", () => { if (div.parentElement.children.length > 1) div.remove(); });
  return div;
}

function createStepRowEl(text = "") {
  const div = document.createElement("div"); div.className = "form-step-row";
  div.innerHTML = `<span class="form-step-num"></span><textarea class="form-input form-step-text" placeholder="Describe this step…">${esc(text)}</textarea><button type="button" class="btn-remove-step">✕</button>`;
  div.querySelector(".btn-remove-step").addEventListener("click", () => { if (div.parentElement.children.length > 1) div.remove(); renumberSteps(); });
  return div;
}

function renumberSteps() {
  $$("#form-steps .form-step-row").forEach((s, i) => s.querySelector(".form-step-num").textContent = String(i + 1).padStart(2, "0"));
}

async function saveRecipe() {
  const title = $("#form-title").value.trim();
  const errEl = $("#form-error");
  if (!title) { errEl.textContent = "Title is required."; return; }

  const ingredients = [];
  $$("#form-ing-groups .form-ing-group").forEach(groupEl => {
    const groupName = groupEl.querySelector(".form-group-name").value.trim();
    const items = [];
    groupEl.querySelectorAll(".form-ing-row").forEach(row => {
      const item = row.querySelector(".form-ing-item").value.trim();
      if (!item) return;
      const amtRaw = row.querySelector(".form-ing-amt").value.trim();
      const amt = parseFraction(amtRaw);
      items.push({ item, amount: amt != null ? amt : (amtRaw || null), unit: row.querySelector(".form-ing-unit").value, notes: row.querySelector(".form-ing-notes").value.trim() || "" });
    });
    if (items.length > 0) ingredients.push({ group: groupName, items });
  });
  if (ingredients.length === 0) { errEl.textContent = "Add at least one ingredient."; return; }

  const instructions = [];
  $$("#form-steps .form-step-row").forEach((row, i) => {
    const text = row.querySelector(".form-step-text").value.trim();
    if (text) instructions.push({ step: i + 1, text });
  });
  if (instructions.length === 0) { errEl.textContent = "Add at least one instruction step."; return; }

  let source = null;
  const srcName = $("#form-source-name").value.trim();
  const srcUrl = $("#form-source-url").value.trim();
  if (srcName || srcUrl) { source = {}; if (srcName) source.name = srcName; if (srcUrl) source.url = srcUrl; }

  const prepTime = $("#form-prep").value.trim();
  const cookTime = $("#form-cook").value.trim();
  let totalTime = "";
  if (parseInt(prepTime) || parseInt(cookTime)) totalTime = ((parseInt(prepTime)||0) + (parseInt(cookTime)||0)) + " min";
  
  const tagsRaw = $("#form-tags").value.trim();
  const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];

  const recipeData = {
    title, slug: slugify(title), description: $("#form-desc").value.trim(), image: $("#form-image").value.trim(),
    servings: parseInt($("#form-servings").value) || null, prepTime: prepTime || "", cookTime: cookTime || "",
    totalTime, cuisine: $("#form-cuisine").value.trim(), mealType: $("#form-meal").value.trim(), diet: $("#form-diet").value.trim(),
    tags, ingredients, instructions, notes: $("#form-notes").value.trim(), source, updatedAt: new Date().toISOString()
  };

  saveBtn.textContent = "Saving...";
  saveBtn.disabled = true;

  try {
    if (editingRecipeId) {
      await updateDoc(doc(db, "recipes", editingRecipeId), recipeData);
      const memIdx = allRecipes.findIndex(r => r.id === editingRecipeId);
      if (memIdx > -1) allRecipes[memIdx] = { ...allRecipes[memIdx], ...recipeData };
      notify("Recipe updated!");
    } else {
      recipeData.createdAt = recipeData.updatedAt;
      recipeData.favorite = false;
      const newDocRef = doc(collection(db, "recipes"));
      await setDoc(newDocRef, recipeData);
      allRecipes.push({ ...recipeData, id: newDocRef.id });
      notify("New recipe added!");
    }
    closeAddForm();
    applyFilters();
    if (editingRecipeId) { currentRecipe = allRecipes.find(r => r.id === editingRecipeId); renderDetail(); showState("detail"); }
  } catch (error) {
    console.error("Error saving recipe:", error);
    errEl.textContent = "Error saving to database.";
  } finally {
    saveBtn.textContent = "Save Recipe";
    saveBtn.disabled = false;
  }
}

// ── Listeners & Init ───────────────────────────────────────
const sortRecipesDropdown = document.getElementById("sort-recipes");

searchToggle.addEventListener("click", () => { searchBar.classList.toggle("hidden"); if (!searchBar.classList.contains("hidden")) searchInput.focus(); });
searchInput.addEventListener("input", () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(applyFilters, 250); });

// Attach event listener safely to all dropdowns (including sort)
[filterCuisine, filterMeal, filterDiet, filterTag, sortRecipesDropdown].forEach(el => {
  if (el) el.addEventListener("change", applyFilters);
});

if ($("#nav-favorites")) $("#nav-favorites").addEventListener("click", showFavorites);

if ($("#logo-link")) $("#logo-link").addEventListener("click", (e) => { 
  e.preventDefault(); 
  window.location.hash = ""; 
  searchInput.value = ""; 
  filterCuisine.value = ""; 
  filterMeal.value = ""; 
  filterDiet.value = ""; 
  filterTag.value = ""; 
  if (sortRecipesDropdown) sortRecipesDropdown.value = "newest"; 
  currentView = "grid"; // Resets view from favorites back to home
  applyFilters(); 
});

const addBtn = $("#btn-add-recipe"); if (addBtn) addBtn.addEventListener("click", openAddForm);
if (addModal) addModal.querySelector(".modal-close").addEventListener("click", closeAddForm);
if (addModal) addModal.querySelector(".modal-overlay").addEventListener("click", closeAddForm);
if ($("#btn-add-group")) $("#btn-add-group").addEventListener("click", () => $("#form-ing-groups").appendChild(createIngredientGroupEl("")));
if ($("#btn-add-step")) $("#btn-add-step").addEventListener("click", () => { $("#form-steps").appendChild(createStepRowEl("")); renumberSteps(); });
const saveBtn = $("#btn-save-recipe"); if (saveBtn) saveBtn.addEventListener("click", saveRecipe);
if (retryBtn) retryBtn.addEventListener("click", fetchRecipes);
window.addEventListener("hashchange", () => { const hash = window.location.hash.slice(1); if (!hash) goBack(); else if (hash === "favorites") showFavorites(); else showDetail(hash); });
if ($("#form-steps")) new MutationObserver(renumberSteps).observe($("#form-steps"), { childList: true });

// Boot
fetchRecipes();
if (window.AOS) AOS.init({ duration: 600, once: true, offset: 50 });
