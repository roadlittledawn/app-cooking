# Cooking App MVP - Context

## Overview
Full-stack CRUD cooking application, inspired by NYT Cooking. Users can create, browse, and save recipes. Multi-user with authentication.

## Tech Stack
- **Framework**: Next.js (App Router, full-stack on Vercel)
- **Database**: MongoDB (via Mongoose or Prisma)
- **Auth**: NextAuth.js (Email/password + Google OAuth)
- **UI**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel

## Core Features (MVP)
1. User authentication (signup, login, logout) via email/password and Google
2. Recipe CRUD (create, read, update, delete own recipes)
3. Browse all public recipes
4. View recipe detail page
5. Save/favorite recipes from other users

## Recipe Data Model
- Title
- Description
- Ingredients list
- Steps/instructions
- Prep time
- Cook time
- Servings
- Image
- Tags/categories
- Author (reference to user)

## Constraints
- All recipes are public (no private recipes for MVP)
- Users can only edit/delete their own recipes
- Users can save/favorite any recipe
