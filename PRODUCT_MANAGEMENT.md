# Product Management System

## Overview

The Product Management system allows you to control which modules/products appear on the public `/modules` page without touching code. You can add new products, change their status, and toggle between showing "current reality" vs "full vision" to visitors.

---

## Access

**SuperAdmin URL:** `https://www.finaceverse.io/vault-e9232b8eefbaa45e`

**Master Key:** `FV-SuperKey-7e54227eb017247e4786281289189725`

**Password:** `FinACE@SuperAdmin2026!Secure`

---

## Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   SuperAdmin    │────▶│   Server API    │────▶│   PostgreSQL    │
│   Product UI    │◀────│   /api/admin/*  │◀────│   products      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Public        │────▶│   Public API    │────▶│   Filtered by   │
│   /modules      │◀────│   /api/products │◀────│   view mode     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Database Schema

**Table: `products`**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | SERIAL | Unique identifier |
| `slug` | VARCHAR(100) | URL-safe identifier (e.g., `accute`, `finaid-hub`) |
| `name` | VARCHAR(255) | Display name (e.g., "Accute", "Fin(Ai)d Hub") |
| `tagline` | VARCHAR(500) | Short description shown on cards |
| `description` | TEXT | Full description for detail views |
| `status` | VARCHAR(50) | Controls visibility: `launched`, `launching`, `coming_soon`, `planned` |
| `icon_svg` | TEXT | SVG icon code (optional) |
| `image_url` | VARCHAR(500) | Product image URL |
| `external_url` | VARCHAR(500) | Link to external site (e.g., accute.io) |
| `display_order` | INTEGER | Sort order (1 = first) |
| `features` | JSONB | Array of feature strings `["Feature 1", "Feature 2"]` |
| `cell_size` | VARCHAR(20) | Grid size: `small`, `medium`, `large` |
| `cell_tag` | VARCHAR(50) | Category label (e.g., "Foundation", "Intelligence") |
| `is_hero` | BOOLEAN | Show in hero section of modules page |
| `created_at` | TIMESTAMP | When created |
| `updated_at` | TIMESTAMP | Last modified |

---

## Status System

| Status | Meaning | Visible in "Current" | Visible in "Vision" |
|--------|---------|---------------------|---------------------|
| `launched` | Live product | ✅ Yes | ✅ Yes |
| `launching` | Launching within days/weeks | ✅ Yes | ✅ Yes |
| `coming_soon` | Announced, coming in months | ✅ Yes | ✅ Yes |
| `planned` | Future roadmap, not announced | ❌ No | ✅ Yes |

**Key Logic**: When a user views `/modules` with "Current Products" toggle:
- API is called with `?view=current`
- Server filters: `WHERE status IN ('launched', 'launching', 'coming_soon')`
- Products with `status = 'planned'` are excluded

When "Full Vision" is selected:
- API is called with `?view=vision` (or no filter)
- All products returned regardless of status

---

## API Endpoints

### Public (No Auth Required)

**`GET /api/products?view=current|vision`**
- Returns products filtered by view mode
- Used by public `/modules` page

### Admin (SuperAdmin Auth Required)

**`GET /api/admin/products`**
- Returns ALL products with full details
- Used by Product Manager UI

**`POST /api/admin/products`**
- Creates new product
- Body: `{ slug, name, tagline, description, status, ... }`

**`PUT /api/admin/products/:id`**
- Updates existing product
- Body: Same as create (only include fields to update)

**`DELETE /api/admin/products/:id`**
- Permanently deletes a product

**`POST /api/admin/products/reorder`**
- Bulk update display order
- Body: `{ orders: [{ id: 1, display_order: 1 }, { id: 2, display_order: 2 }] }`

**`POST /api/admin/products/seed`**
- Populates database with 9 default products
- Safe to run multiple times (updates existing, creates new)

---

## How the Modules Page Consumes Products

```javascript
// In modules.js

const [viewMode, setViewMode] = useState('current');
const [products, setProducts] = useState([]);

useEffect(() => {
  fetch(`/api/products?view=${viewMode}`)
    .then(res => res.json())
    .then(data => setProducts(data.products));
}, [viewMode]);

// Helper to check if product should render
const isProductVisible = (slug) => {
  if (products.length === 0) return true; // Fallback
  return products.some(p => p.slug === slug);
};

// In JSX - conditionally render sections
{isProductVisible('vamn') && (
  <ProductCard product={...} />
)}
```

---

## Workflow Examples

### Adding a New Product When You Launch

1. **Login** to SuperAdmin
2. **Click** Product Manager → **+ Add Product**
3. **Fill in**:
   - Slug: `new-product`
   - Name: `New Product`
   - Tagline: `Revolutionary financial tool`
   - Status: `launched`
   - Features: Add each feature
4. **Click** Create Product
5. **Result**: Product immediately appears on `/modules` in both views

### Changing a Product from "Coming Soon" to "Launched"

1. **Login** to SuperAdmin
2. **Click** Product Manager
3. **Find** the product (e.g., SumBuddy)
4. **Click** Edit
5. **Change** Status dropdown to `Launched`
6. **Click** Update Product
7. **Result**: Badge changes from purple "Coming Soon" to green "Launched"

### Hiding a Product Temporarily

1. **Edit** the product
2. **Change** Status to `planned`
3. **Result**: Product hidden from "Current Products" view, still visible in "Full Vision"

### Reordering Products

Products display in order of `display_order` field. To change order:
1. Edit each product
2. Set `display_order` values (1 = first, 2 = second, etc.)
3. Lower numbers appear first

---

## Security

- All admin endpoints require JWT token from SuperAdmin login
- Token stored in `localStorage.superadmin_token`
- Server validates token + checks `role = 'superadmin'`
- Public `/api/products` endpoint is read-only, no sensitive data exposed

---

## Current Product Data (After Seeding)

| Order | Slug | Name | Status | External URL |
|-------|------|------|--------|--------------|
| 1 | accute | Accute | launched | accute.io |
| 2 | luca | Luca | launched | - |
| 3 | epi-q | EPI-Q | launched | - |
| 4 | finaid-hub | Fin(Ai)d Hub | launching | - |
| 5 | sumbuddy | SumBuddy | coming_soon | - |
| 6 | vamn | VAMN | planned | vamn.io |
| 7 | cyloid | Cyloid | planned | cyloid.io |
| 8 | taxblitz | TaxBlitz | planned | - |
| 9 | audric | Audric | planned | - |

---

## Files Involved

| File | Purpose |
|------|---------|
| `server.js` | Database table + all API endpoints |
| `src/views/product-manager.js` | Admin CRUD interface |
| `src/views/product-manager.css` | Admin UI styling |
| `src/views/modules.js` | Public page with view toggle |
| `src/views/modules.css` | Toggle + status badge styling |

---

## Quick Reference

### First Time Setup
1. Login to SuperAdmin
2. Click Product Manager
3. Click "🌱 Seed Defaults"
4. Done - 9 products created

### Change Product Status
1. Product Manager → Find product → Edit → Change status → Update

### Add New Product
1. Product Manager → + Add Product → Fill form → Create

### Delete Product
1. Product Manager → Find product → Delete → Confirm
