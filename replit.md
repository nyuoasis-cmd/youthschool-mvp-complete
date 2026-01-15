# YouthSchool - 학교 문서 행정 AI 자동화

## Overview

YouthSchool (유스쿨) is an AI-powered SaaS platform that automates the creation of school administrative documents. The service uses Claude AI to generate professional documents like parent letters (가정통신문) and external education service plans (외부 교육 용역 계획서), reducing document creation time by approximately 80%.

The MVP targets elementary, middle, and high school teachers and administrative staff in Korea, with the goal of piloting at 5 schools and securing government funding.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Build Tool**: Vite with custom plugins for Replit integration
- **Design System**: Modern SaaS aesthetic inspired by Linear, Vercel, and Stripe with Inter font family

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints under `/api/*` prefix
- **AI Integration**: Anthropic Claude API for document generation via Replit AI Integrations
- **Build**: esbuild for production bundling with selective dependency bundling

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` for shared type definitions
- **Validation**: Zod schemas with drizzle-zod integration
- **Storage**: DatabaseStorage class with PostgreSQL for data persistence

### Authentication & Authorization
- **Auth Provider**: Replit Auth (OIDC) supporting Google, GitHub, and email login
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple
- **User Isolation**: Documents are scoped to authenticated users
- **Security Model**:
  - Anonymous users can generate documents (viewable immediately via state)
  - Anonymous documents cannot be accessed later via API (403)
  - Authenticated users can access/delete only their own documents
  - Document lists and stats are user-scoped (empty for anonymous)

### Project Structure
```
├── client/src/         # React frontend
│   ├── components/ui/  # shadcn/ui components
│   ├── pages/          # Route components
│   └── lib/            # Utilities and query client
├── server/             # Express backend
│   ├── routes.ts       # API endpoints
│   ├── storage.ts      # Data access layer
│   └── replit_integrations/  # AI batch and chat utilities
├── shared/             # Shared types and schemas
└── attached_assets/    # Reference documentation
```

### Key Design Decisions
- **Monorepo Structure**: Single repository with client, server, and shared code for simpler deployment
- **Type Safety**: End-to-end TypeScript with shared schemas between frontend and backend
- **In-Memory Storage**: MemStorage implementation allows development without database, with interface designed for easy PostgreSQL migration
- **AI Integration Pattern**: Centralized Anthropic client initialization with batch processing utilities for rate limit handling

## External Dependencies

### AI Services
- **Anthropic Claude API**: Document generation via `@anthropic-ai/sdk`
  - Configured through `AI_INTEGRATIONS_ANTHROPIC_API_KEY` and `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` environment variables
  - Supports models: claude-opus-4-5, claude-sonnet-4-5, claude-haiku-4-5

### Database
- **PostgreSQL**: Primary database configured via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations stored in `./migrations`

### UI Components
- **Radix UI**: Headless component primitives for accessibility
- **shadcn/ui**: Pre-styled components using Radix + Tailwind

### Development Tools
- **Vite**: Development server with HMR
- **Replit Plugins**: Runtime error overlay, cartographer, and dev banner for Replit environment