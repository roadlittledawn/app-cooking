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
- **As an invited user**, I want to sign up with email/password or Google so I can save recipes and create my own.
- **As an admin**, I want to invite people by email so only approved users can sign up.
- **As a logged-in user**, I want to create a recipe with all relevant details so others can cook my dishes.
- **As a logged-in user**, I want to edit or delete my own recipes so I can keep them up to date.
- **As a logged-in user**, I want to save/favorite recipes from other users so I can easily find them later.
- **As a logged-in user**, I want to view my saved recipes in one place.

## Functional Requirements

### Authentication
- FR-1: Users can sign up with email and password — only if their email has a matching invite
- FR-2: Users can sign up/log in with Google OAuth — only if their Google email has a matching invite
- FR-3: Users can log out
- FR-4: Sessions persist across page refreshes
- FR-5: Protected routes redirect unauthenticated users to login

### Invite System
- FR-18: Admin can create invites by specifying an email address
- FR-19: Signup checks the `invites` collection for the user's email before allowing account creation
- FR-20: If no matching invite exists, signup is rejected with a clear message ("Invite required")
- FR-21: Admin role is determined by a `role` field on the User model (values: "admin" | "user")
- FR-22: Initial admin user is seeded via a database seed script (your account)

### Recipe CRUD
- FR-6: Authenticated users can create a recipe with: title, description (markdown), ingredients, steps (markdown), prep time, cook time, servings, image, tags
- FR-7: Description and steps fields support markdown, edited via a lightweight markdown editor with syntax highlighting and a preview pane
- FR-8: Markdown content is rendered as HTML on recipe detail pages
- FR-9: Authenticated users can edit their own recipes
- FR-10: Authenticated users can delete their own recipes
- FR-11: All recipes are publicly visible (no private recipes)

### Ingredients System
- FR-23: Ingredients are stored in a shared `ingredients` collection (global to all users)
- FR-24: When adding ingredients to a recipe, users search existing ingredients via an autocomplete/select component (react-select style)
- FR-25: If an ingredient doesn't exist, users can create it inline from the same component
- FR-26: Recipe ingredients reference the shared ingredient record plus amount and unit

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
| role | string | "admin" or "user" (default: "user") |
| createdAt | Date | Account creation timestamp |

#### Invite
| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| email | string | Invited email address (unique, indexed, stored lowercase) |
| invitedBy | ObjectId | Reference to admin User who created the invite |
| usedAt | Date | null until signup completes, then set to signup timestamp |
| createdAt | Date | When the invite was created |

#### Ingredient (shared collection)
| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| name | string | Ingredient name (unique, indexed, stored lowercase for dedup) |
| createdBy | ObjectId | Reference to User who first added it |
| createdAt | Date | Creation timestamp |

#### Recipe
| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| title | string | Recipe title |
| description | string | Markdown content — rendered as HTML on display |
| ingredients | array of { ingredientId: ObjectId, amount: string, unit: string } | References to Ingredient collection + quantity |
| steps | string | Markdown content — rendered as HTML on display |
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

### Ingredients
- `GET /api/ingredients?q=<search>` — Search ingredients by name prefix (auth required, for autocomplete)
- `POST /api/ingredients` — Create a new ingredient (auth required)

### Invites (admin only)
- `GET /api/invites` — List all invites (admin required)
- `POST /api/invites` — Create an invite by email (admin required)
- `DELETE /api/invites/:id` — Revoke an unused invite (admin required)

### Saved Recipes
- `GET /api/saved` — List user's saved recipes (auth required)
- `POST /api/saved/:recipeId` — Save a recipe (auth required)
- `DELETE /api/saved/:recipeId` — Unsave a recipe (auth required)

## Security Considerations

- Passwords hashed with bcrypt (minimum 12 rounds)
- CSRF protection via NextAuth
- Input validation on all API routes (zod)
- Authorization checks: users can only modify their own recipes
- Invite-gated signup: email must exist in invites collection before account creation is allowed
- Admin-only routes protected by role check middleware
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

### Authentication & Invites
- Given an invited email, when they fill in the signup form with valid email/password, then an account is created and they are logged in
- Given a non-invited email, when they try to sign up, then they see "Invite required" and no account is created
- Given an invited email, when they click "Sign in with Google" with that email, then they are authenticated via Google OAuth
- Given a non-invited email, when they try Google OAuth, then signup is rejected
- Given a logged-in user, when they click logout, then their session is destroyed
- Given an admin, when they submit an email to the invite form, then an invite is created and that email can now sign up
- Given a non-admin, when they try to access invite management, then they are denied

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
| User | A registered account that can create and save recipes (has role: admin or user) | New |
| Invite | An email-based invitation that gates signup access | New |
| Ingredient | A shared ingredient record (e.g., "olive oil", "garlic") reusable across recipes | New |
| Recipe | A cooking recipe with markdown description/steps, ingredient references, and metadata | New |
| SavedRecipe | A join record linking a user to a favorited recipe | New |

### Relationships

```
User (admin) --creates--> Invite (1:many)
Invite --gates--> User signup (1:1)
User --creates--> Recipe (1:many)
User --saves--> Recipe (many:many via SavedRecipe)
Recipe --references--> Ingredient (many:many, with amount/unit per recipe)
User --creates--> Ingredient (1:many, shared globally)
```

### Glossary

| Term | Definition |
|------|-----------|
| Recipe | A set of instructions for preparing a dish, including ingredients and steps |
| Saved Recipe | A recipe bookmarked by a user for quick access later |
| Author | The user who created a recipe |
| Tags | Categorical labels for organizing recipes (e.g., "dinner", "vegetarian") |
| Ingredient | A named food item stored globally and reusable across recipes |
| Invite | An admin-created record that allows a specific email to sign up |
| Admin | A user with role "admin" who can manage invites (initially seeded) |

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
- **Assumption**: Admin invite management is a simple /admin/invites page in the app (admin role required)
- **Assumption**: Initial admin user seeded via a one-time DB script with your email
- **Gap**: No email verification flow for MVP (can add later)
- **Gap**: No password reset flow for MVP (can add later)
- **Gap**: No invite notification email sent to invitees (they just need to know the URL)

### Dependencies
- next (^14 or ^15)
- next-auth (v5)
- mongoose (MongoDB ODM)
- tailwindcss
- shadcn/ui components
- zod (validation)
- bcrypt (password hashing)
- react-markdown or similar (markdown rendering)
- a lightweight markdown editor (e.g., @uiw/react-md-editor or similar with syntax highlighting + preview)
- react-select (async creatable variant for ingredient autocomplete)

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
| 11 | Should signup be open or restricted? | Invite-only — admin creates invites by email, signup checks invites collection | User |
| 12 | How to identify admin? | role field on User model; initial admin seeded via script | User |
| 13 | Description/steps formatting? | Markdown with lightweight editor (syntax highlighting + preview pane), rendered as HTML | User |
| 14 | How should ingredients work? | Shared ingredients collection; autocomplete search via react-select; create inline if new | User |

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
