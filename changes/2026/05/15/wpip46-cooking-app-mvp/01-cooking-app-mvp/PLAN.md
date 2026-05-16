---
title: "Implementation Plan: Cooking App MVP"
change: cooking-app-mvp-1
type: feature
spec: ./SPEC.md
created: 2026-05-15
sdd_version: "7.3.0"
---

# Implementation Plan: Cooking App MVP

## Overview

**Spec:** [SPEC.md](./SPEC.md)

Full-stack Next.js 16 cooking app with invite-gated auth, recipe CRUD with markdown editing, shared ingredients system, and favorites — deployed on Vercel with MongoDB Atlas.

## Affected Components

- Next.js App (webapp — full-stack monolith)
- MongoDB (database — Atlas)

Note: This project uses Next.js on Vercel rather than the tech pack's default Kubernetes/Helm setup. Phases follow Next.js App Router conventions.

## Phases

### Phase 1: Project Bootstrap & Database Setup

**Outcome:** Next.js 16 app initialized with MongoDB connection, Mongoose models, and environment configuration.

**Deliverables:**
- Next.js 16 project scaffolded with TypeScript, Tailwind CSS, ESLint
- shadcn/ui initialized
- Mongoose connection utility with MongoDB Atlas
- All Mongoose models: User, Invite, Ingredient, Recipe, SavedRecipe
- Zod validation schemas for all models
- Environment config (.env.local template)
- Database seed script (creates initial admin user + invite for your email)

**Expected Files:**
- `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`
- `src/lib/db.ts` (MongoDB connection)
- `src/models/` (User, Invite, Ingredient, Recipe, SavedRecipe)
- `src/lib/validations/` (Zod schemas)
- `scripts/seed.ts` (admin seed)
- `.env.local.example`

---

### Phase 2: Authentication & Invite System

**Outcome:** NextAuth.js v5 configured with Credentials + Google providers, invite-gated signup, and admin role system.

**Deliverables:**
- NextAuth.js v5 configuration with Credentials and Google providers
- Custom signup API route with invite check
- Session includes user role
- Protected route middleware
- Login page UI
- Signup page UI (with invite rejection handling)
- Admin invite management page (`/admin/invites`)
- API routes: `/api/auth/signup`, `/api/invites` (GET, POST, DELETE)

**Expected Files:**
- `src/auth.ts` (NextAuth config)
- `src/middleware.ts` (route protection)
- `src/app/api/auth/signup/route.ts`
- `src/app/api/invites/route.ts`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/signup/page.tsx`
- `src/app/admin/invites/page.tsx`
- `src/components/auth/` (forms, providers)

---

### Phase 3: Recipe CRUD & Markdown Editor

**Outcome:** Full recipe create/edit/delete functionality with markdown editing for description and steps fields.

**Deliverables:**
- Recipe API routes (GET list, GET detail, POST, PUT, DELETE)
- Create recipe page with form
- Edit recipe page
- Markdown editor component (syntax highlighting + preview pane)
- Ingredient autocomplete component (react-select async creatable)
- Ingredients API route (GET search, POST create)
- Image upload (Vercel Blob or S3)
- Authorization checks (owner-only edit/delete)

**Expected Files:**
- `src/app/api/recipes/route.ts` (list, create)
- `src/app/api/recipes/[id]/route.ts` (get, update, delete)
- `src/app/api/ingredients/route.ts` (search, create)
- `src/app/recipes/new/page.tsx`
- `src/app/recipes/[id]/edit/page.tsx`
- `src/components/recipes/recipe-form.tsx`
- `src/components/recipes/markdown-editor.tsx`
- `src/components/recipes/ingredient-select.tsx`

---

### Phase 4: Browsing, Detail Pages & Favorites

**Outcome:** Public recipe browsing, detail view with rendered markdown, search/filter, and save/favorite functionality.

**Deliverables:**
- Recipe listing page with cards (title, image, prep time, author)
- Recipe detail page with rendered markdown (description + steps)
- Search and tag filtering
- Pagination
- Save/favorite toggle (heart icon on cards and detail)
- Saved recipes page (`/saved`)
- API routes for saved recipes (GET, POST, DELETE)

**Expected Files:**
- `src/app/page.tsx` or `src/app/recipes/page.tsx` (listing)
- `src/app/recipes/[id]/page.tsx` (detail)
- `src/app/saved/page.tsx`
- `src/app/api/saved/route.ts`
- `src/app/api/saved/[recipeId]/route.ts`
- `src/components/recipes/recipe-card.tsx`
- `src/components/recipes/recipe-detail.tsx`
- `src/components/recipes/save-button.tsx`
- `src/components/recipes/search-bar.tsx`

---

### Phase 5: Polish & Deployment

**Outcome:** Production-ready app deployed to Vercel with responsive design, loading states, and error handling.

**Deliverables:**
- Responsive layout (mobile, tablet, desktop)
- Loading skeletons and error states
- SEO metadata (recipe pages server-rendered)
- Navigation/header with auth state
- User profile dropdown
- Vercel deployment configuration
- Environment variables configured in Vercel
- Rate limiting on auth endpoints

**Expected Files:**
- `src/app/layout.tsx` (root layout with nav)
- `src/components/layout/` (header, nav, footer)
- `src/components/ui/` (loading, error states)
- `vercel.json` (if needed)

---

## Dependencies

- MongoDB Atlas cluster (free tier)
- Google Cloud OAuth credentials (client ID + secret)
- Vercel account
- Vercel Blob or S3 bucket for image storage

## Tests

### Unit Tests
- [ ] Signup rejects when no invite exists for email
- [ ] Signup succeeds when invite exists
- [ ] Recipe creation validates required fields
- [ ] Recipe update rejects non-owner
- [ ] Recipe delete rejects non-owner
- [ ] Ingredient search returns matching results (case-insensitive)
- [ ] Ingredient creation deduplicates (lowercase)
- [ ] Save/unsave toggles correctly
- [ ] Admin routes reject non-admin users
- [ ] Invite creation validates email format

### Integration Tests
- [ ] Full signup flow with invite (email/password)
- [ ] Full signup flow with invite (Google OAuth)
- [ ] Recipe CRUD lifecycle (create → read → update → delete)
- [ ] Ingredient autocomplete with existing data
- [ ] Save recipe → appears in saved list → unsave → removed

### E2E Tests
- [ ] New user: receive invite → sign up → create recipe → browse → save another recipe
- [ ] Admin: login → invite user → verify user can sign up
- [ ] Visitor: browse recipes → view detail → prompted to login for save

## Risks

| Risk | Mitigation |
|------|------------|
| NextAuth v5 breaking changes (still in beta?) | Pin exact version, check docs for stable release |
| MongoDB Atlas cold starts on free tier | Connection pooling, keep-alive |
| Image upload size/cost on Vercel Blob | Enforce 5MB limit client-side and server-side |
| Markdown XSS via rendered HTML | Use react-markdown with sanitization (no dangerouslySetInnerHTML) |

## Implementation State

- **Current Phase:** Phase 5 (Polish & Deployment)
- **Status:** in_progress
- **Completed Phases:** Phase 1, Phase 2, Phase 3, Phase 4
- **Actual Files Changed:**
  - `src/auth.config.ts` (new — Edge-compatible NextAuth config)
  - `src/auth.ts` (updated — extends authConfig)
  - `src/middleware.ts` (new — route protection for /saved, /recipes/new, /admin)
  - `src/lib/rate-limit.ts` (new — in-memory rate limiter)
  - `src/app/api/auth/signup/route.ts` (updated — rate limiting, 5 req/min per IP)
  - `src/app/api/saved/route.ts` (new — GET saved recipes list)
  - All Phase 1–4 files from Expected Files sections
- **Blockers:** None
