# Project: app-cooking

## Tech Stack

- **API Contract:** OpenAPI 3.x (path depends on contract component name in `sdd/sdd-settings.yaml`)
- **Backend:** Node.js 20, TypeScript 5, Express (CMDO architecture)
- **Frontend:** React 19, TypeScript 5.9, Vite (MVVM architecture)
- **Database:** PostgreSQL 15
- **Testing:** Vitest (unit), Testkube (integration/E2E)
- **Deployment:** Kubernetes, Helm

## Components

| Component | Path | Purpose |
|-----------|------|---------|
| Config | `components/config/` | Environment configuration (mandatory singleton) |
| Contract | `components/contracts/{name}/` | OpenAPI spec, type generation |
| Server | `components/servers/{name}/` | Backend (CMDO architecture) |
| Webapp | `components/webapps/{name}/` | React frontend (MVVM) |
| Database | `components/databases/{name}/` | PostgreSQL migrations and seeds |
| Helm | `components/helm_charts/{name}/` | Kubernetes deployment |
| Testing | `components/testing/{name}/` | Testkube test definitions |

Component directories follow the pattern `components/{type-plural}/{name}/` (e.g., `components/contracts/public-api/`, `components/servers/main/`).

## Backend Architecture (CMDO)

**C**ontroller **M**odel **D**AL **O**perator - strict separation of concerns:

```
Operator → Controller → Model Use Cases
   ↓            ↓              ↑
Config → [All layers] → Dependencies
                              ↓
                            DAL
```

## Coding Standards (MANDATORY)

**You MUST follow the project's standards skills when writing or modifying code.** Before starting any implementation work, read the relevant standards skill to load the coding patterns. These are mandatory, not optional.

| When working on... | Standards skill to follow |
|---------------------|--------------------------|
| Any TypeScript code | `typescript-standards` |
| Backend (server) components | `backend-standards` |
| Frontend (webapp) components | `frontend-standards` |
| Database migrations/schema | `database-standards` |
| API contracts (OpenAPI) | `contract-standards` |
| Helm charts / Kubernetes | `helm-standards` |
| CI/CD pipelines | `cicd-standards` |
| Configuration | `config-standards` |
| Integration tests | `integration-testing-standards` |
| E2E tests | `e2e-testing-standards` |

**Multiple standards apply simultaneously.** For example, backend work requires both `typescript-standards` AND `backend-standards`. Database work in a backend context requires `typescript-standards`, `backend-standards`, AND `database-standards`.

**This applies to ALL code changes** — whether through agent workflows, direct prompts, corrections, or ad-hoc requests. Never write code without first loading the relevant standards.

## Behavior Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Spec-Driven Development

1. **Specs are truth:** Every change needs a SPEC.md
2. **Change types:** Changes can be `feature`, `bugfix`, or `refactor`
3. **Issue required:** Every spec references a tracking issue
4. **Git = state machine:** PR = draft, merged = active

## Key Paths

| Path | Purpose |
|------|---------|
| `changes/INDEX.md` | Registry of all change specs |
| `changes/` | Change specifications (features, bugfixes, refactors) |
| `specs/` | Static domain knowledge (glossary, definitions, architecture) |
| `components/contracts/{name}/openapi.yaml` | API contract |
| `sdd/sdd-settings.yaml` | Project settings (components, domains) |

## Claude Code Commands

- `/sdd I want to initialize a new project` - Initialize new project
- `/sdd I want to create a new feature` - Start new change
- `/sdd I want to import an external spec` - Import changes from external spec
- `/sdd` - Show workflow status (no-arg reads context)
- `/sdd I want to continue` - Resume current workflow
- `/sdd I want to approve the spec` - Approve spec, create plan
- `/sdd I want to approve the plan` - Approve plan, enable implementation
- `/sdd I want to start implementing` - Implement change
- `/sdd I want to verify the implementation` - Verify implementation
