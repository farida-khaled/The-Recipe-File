# The Recipe File

A lightweight, responsive recipe portal built with HTML, CSS, and JavaScript. No frameworks, no build tools — just open `index.html` and start cooking.

## Quick Start

1. Download all files into one folder
2. Double-click `index.html` to open in your browser
3. That's it!

## File Structure

```
recipe-portal/
├── index.html      ← App shell
├── styles.css      ← Editorial design (Playfair Display + Inter)
├── app.js          ← All application logic
├── recipes.json    ← Recipe data (for web servers)
├── recipes.js      ← Recipe data fallback (for local file:// use)
└── README.md       ← This file
```

## Features

### Core
- **Recipe grid** with image cards and editorial layout
- **Recipe detail view** with hero image, metadata, ingredients, instructions
- **Search** across titles, descriptions, cuisines, tags, ingredients
- **4 filter dropdowns** — cuisine, meal type, diet, tags
- **Favorites** — heart toggle, persisted in localStorage

### Cooking Tools
- **Unit conversion** — toggle between Original, US, and Metric
- **Serving scaler** — adjust servings, all ingredients recalculate
- **Ingredient checkboxes** — check off what you have, persistent
- **Ingredient swap** — 35+ ingredients with substitution suggestions
- **Personal notes** — auto-saved per recipe

### Recipe Management
- **Add recipes** via full-screen form with dynamic ingredient groups and steps
- **Edit ALL recipes** — both user-created and JSON-loaded (edits saved as localStorage overlays)
- **Delete/hide recipes** — user recipes are removed, JSON recipes are hidden (restorable)
- **Source field** — link to original recipe URL or note the source
- **Export** — download all recipes (with edits applied) as JSON

### Design
- **Playfair Display** serif headings + **Inter** sans-serif body
- **Eggshell** (#F5F0EB) background
- **Pantone 397 C** (#BFB800) accent color
- **Angular shapes** — no border-radius, editorial feel
- **Mobile-first** responsive layout (1→2→3 columns)
- **Print-friendly** detail view

## Hosting on GitHub Pages

1. Create a repo at github.com/new → name it `recipe-portal` → Public
2. Upload all files
3. Settings → Pages → Source: main branch, / (root) → Save
4. Visit `https://YOUR_USERNAME.github.io/recipe-portal/`

## How Edits Work

- **User-created recipes** are stored in `localStorage` under `userRecipes`
- **Edits to JSON recipes** are stored as overlays in `localStorage` under `recipeEdits`
- **Hidden recipes** are tracked in `localStorage` under `hiddenRecipes`
- The original `recipes.json` is never modified by the app
- Use the Export button to download a merged JSON file with all your changes

## Adding Recipes

Three ways:
1. **Use the + button** in the app header to add via the form
2. **Send recipes to the AI assistant** for conversion to structured JSON
3. **Edit recipes.json directly** and add recipe objects manually

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). No IE support.
