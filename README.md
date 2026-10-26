# Meishi Frontend

![Vue](https://img.shields.io/badge/Vue-3.5-42b883?logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![PrimeVue](https://img.shields.io/badge/PrimeVue-4-41b883)
![Tests](https://img.shields.io/badge/tests-Vitest-6e9f18?logo=vitest&logoColor=white)
![Docker](https://img.shields.io/badge/deploy-Docker%20%7C%20Kubernetes-2496ed?logo=docker&logoColor=white)

Web UI for **Meishi** (名刺, "business card"), the account service behind my self-hosted apps. One identity, one login: register, sign in and, for admins, manage the accounts that [omiyage](../omiyage-frontend) and friends rely on.

## Features

- Register and log in
- Account page for the signed-in user
- Admin users page: change roles, freeze/unfreeze and delete accounts, with confirmations
- Friendly 404 page

## Stack and reasoning

| Concern | Choice | Why |
| --- | --- | --- |
| UI | Vue 3 (`<script setup>`) + TypeScript | Small, readable components with typed props |
| Build | Vite | Fast dev server and builds |
| Components | PrimeVue 4 + `@primeuix/themes` | Ready-made accessible forms and tables, so effort goes into behaviour, not widgets |
| Routing | Vue Router | Route guards for login and admin-only pages |
| State | Pinia | Official, minimal store for the session |
| Lint / format | ESLint + Prettier | One style, enforced in `npm test` |
| Tests | Vitest + Vue Test Utils + happy-dom | Fast component tests without a browser |
| Delivery | Docker (nginx), Kubernetes manifests | Small static image |

## Getting started

```sh
npm ci
npm run dev
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` | Prettier on `src/` |
| `npm test` | Type-check, lint and run Vitest |

## Project layout

```
src/
  views/       Route-level screens
  components/  Shared UI
  router/      Routes and guards
  stores/      Pinia stores
  lib/         Helpers
deploy/k8s/    Kubernetes manifests
```

## Deployment

The `Dockerfile` builds the static bundle and serves it with nginx. Manifests live in `deploy/k8s`.
