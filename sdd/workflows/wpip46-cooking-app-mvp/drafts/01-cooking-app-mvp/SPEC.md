---
title: Cooking App MVP
type: feature
status: draft
change_id: cooking-app-mvp-1
created: 2026-05-15
author: clango
---

# Cooking App MVP

## Overview

### Background

A full-stack cooking recipe application inspired by NYT Cooking. The app allows users to create, browse, and save recipes in a multi-user environment with authentication.

### Current State

Greenfield project — no existing codebase beyond the SDD scaffolding.

## User Stories

- **As a visitor**, I want to browse public recipes so I can find something to cook.
- **As a visitor**, I want to sign up with email/password or Google so I can save recipes and create my own.
- **As a logged-in user**, I want to create a recipe with all relevant details so others can cook my dishes.
- **As a logged-in user**, I want to edit or delete my own recipes so I can keep them up to date.
- **As a logged-in user**, I want to save/favorite recipes from other users so I can easily find them later.
- **As a logged-in user**, I want to view my saved recipes in one place.

## Functional Requirements

### Authentication
- FR-1: Users can sign up with email and password
- FR-2: Users can sign up/log in with Google OAuth
- FR-3: Users can log out
- FR-4: Sessions persist across page refreshes
- FR-5: Protected routes redirect unauthenticated users to login

### Recipe CRUD
- FR-6: Authenticated users can create a recipe with: title, description, ingredients, steps, prep time, cook time, servings, image, tags
- FR-7: Authenticated users can edit their own recipes
- FR-8: Authenticated users can delete their own recipes
- FR-9: All recipes are publicly visible (no private recipes)

### Browsing & Discovery
- FR-10: All users (including unauthenticated) can browse recipes
- FR-11: Recipe listing page shows recipe cards with title, image, prep time, and author
- FR-12: Recipe detail page shows full recipe information
- FR-13: Users can filter/search recipes by title or tags

### Saving/Favorites
- FR-14: Authenticated users can save/favorite any recipe
- FR-15: Authenticated users can unsave/unfavorite a recipe
- FR-16: Authenticated users can view their list of saved recipes
- FR-17: Save state is visible on recipe cards and detail pages (heart/bookmark icon)

## Non-Functional Requirements

- NFR-1: Page load time under 2 seconds on 3G connection
- NFR-2: Responsive design — mobile, tablet, desktop
- NFR-3: Accessible (WCAG 2.1 AA)
- NFR-4: SEO-friendly (server-rendered recipe pages)
- NFR-5: Image upload with size limit (max 5MB)
- NFR-6: Rate limiting on auth endpoints

## Technical Design

### Architecture

Next.js App Router full-stack application deployed on Vercel:

```
┌─────────────────────────────────────────────┐
│                  Vercel                       │
│  ┌─────────────────────────────────────┐    │
│  │         Next.js App Router           │    │
│  │  ┌──────────┐  ┌────────────────┐  │    │
│  │  │  Pages   │  │  API Routes    │  │    │
│  │  │  (React) │  │  (/api/*)      │  │    │
│  │  └──────────┘  └────────────────┘  │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
                      │
              ┌───────┴───────┐
              │   MongoDB     │
              │  (Atlas)      │
              └───────────────┘
```

- **Frontend**: React with Tailwind CSS + shadcn/ui
- **Backend**: Next.js API routes (Route Handlers)
- **Database**: MongoDB Atlas (cloud-hosted)
- **Auth**: NextAuth.js v5 with Credentials + Google providers
- **Image Storage**: Vercel Blob or Cloudinary (TBD)
- **Deployment**: Vercel (automatic from git)

### Data Model

#### User
| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| name | string | Display name |
| email | string | Unique, indexed |
| passwordHash | string | bcrypt hash (null for OAuth-only users) |
| image | string | Avatar URL |
| createdAt | Date | Account creation timestamp |

#### Recipe
| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| title | string | Recipe title |
| description | string | Short description |
| ingredients | array of { item: string, amount: string, unit: string } | Ingredient list |
| steps | array of { order: number, instruction: string } | Ordered instructions |
| prepTime | number | Minutes |
| cookTime | number | Minutes |
| servings | number | Number of servings |
| image | string | Image URL |
| tags | string[] | Category tags |
| authorId | ObjectId | Reference to User |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Last modification |

#### SavedRecipe
| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| userId | ObjectId | Reference to User |
| recipeId | ObjectId | Reference to Recipe |
| savedAt | Date | When saved |

Compound unique index on (userId, recipeId).

## API Contract

### Auth (handled by NextAuth)
- `POST /api/auth/signin` — Login
- `POST /api/auth/signup` — Register (custom route)
- `POST /api/auth/signout` — Logout
- `GET /api/auth/session` — Get session

### Recipes
- `GET /api/recipes` — List recipes (with pagination, search, tag filter)
- `GET /api/recipes/:id` — Get single recipe
- `POST /api/recipes` — Create recipe (auth required)
- `PUT /api/recipes/:id` — Update recipe (auth required, owner only)
- `DELETE /api/recipes/:id` — Delete recipe (auth required, owner only)

### Saved Recipes
- `GET /api/saved` — List user's saved recipes (auth required)
- `POST /api/saved/:recipeId` — Save a recipe (auth required)
- `DELETE /api/saved/:recipeId` — Unsave a recipe (auth required)

## Security Considerations

- Passwords hashed with bcrypt (minimum 12 rounds)
- CSRF protection via NextAuth
- Input validation on all API routes (zod)
- Authorization checks: users can only modify their own recipes
- Rate limiting on auth endpoints (e.g., 5 attempts per minute)
- Image upload validation (file type + size)
- MongoDB injection prevention via Mongoose/Prisma parameterized queries

## Error Handling

- 400: Invalid input (validation errors with field-level messages)
- 401: Not authenticated (redirect to login)
- 403: Not authorized (e.g., editing another user's recipe)
- 404: Recipe not found
- 413: Image too large
- 429: Rate limited
- 500: Internal server error (generic message to user, detailed in logs)

## Observability

- Vercel Analytics for web vitals
- Console logging for API errors (Vercel logs)
- NextAuth events for auth debugging

## Acceptance Criteria

### Authentication
- Given a new user, when they fill in the signup form with valid email/password, then an account is created and they are logged in
- Given a user, when they click "Sign in with Google", then they are authenticated via Google OAuth
- Given a logged-in user, when they click logout, then their session is destroyed

### Recipe CRUD
- Given a logged-in user, when they submit the create recipe form with valid data, then the recipe is saved and visible publicly
- Given a recipe author, when they edit their recipe, then the changes are saved
- Given a recipe author, when they delete their recipe, then it is permanently removed
- Given a non-author, when they try to edit/delete a recipe, then they receive a 403 error

### Browsing
- Given any user, when they visit the recipes page, then they see a paginated list of recipe cards
- Given any user, when they search by title, then only matching recipes are shown
- Given any user, when they click a recipe card, then they see the full recipe detail

### Saving
- Given a logged-in user, when they click the save button on a recipe, then it appears in their saved list
- Given a logged-in user, when they unsave a recipe, then it is removed from their saved list

## Domain Model

### Entities

| Entity | Definition | Status |
|--------|-----------|--------|
| User | A registered account that can create and save recipes | New |
| Recipe | A cooking recipe with ingredients, steps, and metadata | New |
| SavedRecipe | A join record linking a user to a favorited recipe | New |

### Relationships

```
User --creates--> Recipe (1:many)
User --saves--> Recipe (many:many via SavedRecipe)
```

### Glossary

| Term | Definition |
|------|-----------|
| Recipe | A set of instructions for preparing a dish, including ingredients and steps |
| Saved Recipe | A recipe bookmarked by a user for quick access later |
| Author | The user who created a recipe |
| Tags | Categorical labels for organizing recipes (e.g., "dinner", "vegetarian") |

## Components

New components will be scaffolded during implementation.

| Component | Type | Purpose |
|-----------|------|---------|
| Next.js App | webapp | Full-stack application (frontend + API routes) |
| MongoDB | database | Recipe and user data persistence |

Note: Since this is a Next.js monolith on Vercel (not the tech pack's default Kubernetes setup), the standard component types (server, helm, contract, etc.) don't directly apply. Implementation will follow Next.js conventions instead.

## System Analysis

### Inferred Requirements
- MongoDB Atlas account and connection string needed
- Vercel account for deployment
- Google Cloud OAuth credentials for Google sign-in
- Image hosting solution (Vercel Blob or Cloudinary)

### Gaps & Assumptions
- **Assumption**: MongoDB Atlas free tier is sufficient for MVP
- **Assumption**: Vercel hobby/pro plan for deployment
- **Assumption**: Image storage via Vercel Blob (simplest integration)
- **Gap**: No email verification flow for MVP (can add later)
- **Gap**: No password reset flow for MVP (can add later)

### Dependencies
- next (^14 or ^15)
- next-auth (v5)
- mongoose (MongoDB ODM)
- tailwindcss
- shadcn/ui components
- zod (validation)
- bcrypt (password hashing)

## Requirements Discovery

### Solicitation Phase

| # | Question | Answer | Source |
|---|----------|--------|--------|
| 1 | What is the app inspired by? | NYT Cooking — start simple, expand later | User |
| 2 | What database? | MongoDB | User |
| 3 | Where to deploy? | Vercel | User |
| 4 | Auth requirements? | Multi-user, authenticated | User |
| 5 | Tech stack? | Next.js + NextAuth + MongoDB | User confirmed |
| 6 | UI library? | Tailwind CSS + shadcn/ui | User |
| 7 | MVP feature scope? | Recipes CRUD + Auth + Browse + Save/Favorites | User |
| 8 | Auth methods? | Email/password + Google OAuth | User |
| 9 | Recipe data model? | Standard fields (title, desc, ingredients, steps, times, servings, image, tags, author) | User confirmed |
| 10 | Recipe visibility? | All recipes are public | User |

### Open Questions (BLOCKING)

| # | Question | Status | Blocker For |
|---|----------|--------|-------------|
| — | None | — | — |

## Testing Strategy

### Unit Tests
| Area | What to Test |
|------|-------------|
| API routes | Input validation, auth checks, CRUD operations |
| Data models | Schema validation, indexes |
| Utils | Helper functions |

### Integration Tests
| Area | What to Test |
|------|-------------|
| Auth flow | Signup, login, session management |
| Recipe CRUD | Full lifecycle with database |
| Saved recipes | Save/unsave with proper user isolation |

### E2E Tests
| Area | What to Test |
|------|-------------|
| Happy path | Sign up → create recipe → browse → save |
| Auth flows | Login/logout with both providers |
| Error states | Invalid forms, unauthorized access |

## Migration / Rollback

Not applicable — greenfield project. MongoDB collections are created on first write.

## Out of Scope

- Recipe collections/folders (future enhancement)
- Comments or ratings on recipes
- Social features (following users)
- Meal planning / shopping lists
- Nutrition information
- Recipe import from URLs
- Email verification
- Password reset
- Admin panel
- Mobile app

## References

- [NYT Cooking](https://cooking.nytimes.com/) — UX inspiration
- [NextAuth.js v5 docs](https://authjs.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vercel deployment docs](https://vercel.com/docs)
