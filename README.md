# app-cooking

A personal recipe collection, live at https://cooking.clintonlangosch.com. Next.js 16, MongoDB, Vercel.

## Auth

Sign-in uses the shared clang-auth service (`auth.clintonlangosch.com`). There's no sign-up page: users are invited with the clang-auth CLI. How it works, local setup and the migration from Auth.js are in [docs/clang-auth-migration.md](docs/clang-auth-migration.md). For local development, copy `.env.local.example` to `.env.local` and open the app at `http://cooking.localtest.me:3004` (`npx next dev -p 3004`).

## Getting Started

This project was scaffolded with SDD. To add your first feature:

```bash
/sdd I want to create a new feature
```

This will guide you through:
1. Creating a specification for your feature
2. Planning the implementation
3. Building it step by step

## Development

Once you have features implemented:

```bash
# Install dependencies
npm install

# Start development servers
npm run dev
```

Database and contract operations are performed via SDD commands:

```
/sdd set up the database        # Deploy local database (requires K8s)
/sdd forward the database port  # Forward database port
/sdd generate TypeScript types  # Generate TypeScript types from OpenAPI
```

## Project Structure

```
├── specs/                 # Static specifications
│   ├── domain/            # Domain definitions and use cases
│   ├── architecture/      # Architecture decisions
│   └── glossary.md        # Domain terminology
├── changes/               # Change specifications (features, fixes)
├── sdd/                   # SDD state (workflows, archives, settings)
├── components/            # Application components
│   ├── contract/          # OpenAPI specification
│   ├── server/            # Backend (CMDO architecture)
│   └── webapp/            # Frontend (React + Vite)
└── config/                # Configuration files
```
