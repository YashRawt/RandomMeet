
# I AM HERE

> Spontaneous real-world connection — discover interesting people nearby who are open to meeting right now.

![Landing Page](Screenshots/landing.jpg)

---

## What is it?

**I AM HERE** is a full-stack web platform for spontaneous, safe, in-person meetups. Users declare their presence with a mood and time window, appear on a live map for others nearby to discover, and connect through a mutual ping system. Exact location is never revealed until both parties agree to meet.

---

## Screenshots

| Landing Page | Login |
|---|---|
| ![Landing](screenshots/landing.jpg) | ![Login](screenshots/login.jpg) |

---

## Features

- **Live presence map** — dark-themed real-time map with custom glowing mood-colored avatar markers
- **Mood system** — set your vibe: Chill, Talkative, Networking, Creative, or Open
- **AI compatibility scoring** — weighted algorithm (interests · mood affinity · distance · availability) produces a 0–100 match score and surfaces top 3 suggestions
- **Privacy by design** — coordinates blurred 300–500m; exact location only shared on mutual ping accept
- **Time-boxed sessions** — sessions auto-expire; you disappear from the map when time is up
- **Mutual ping system** — rate-limited (5 pings / 10 min), two-way opt-in only
- **Block & report** — instant block, no questions asked; blocked users can never see you
- **JWT authentication** — bcrypt password hashing, protected routes, persistent sessions
- **Live activity ticker** — animated landing page with real-time-looking connection events

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| Backend | Express 5, Node.js, TypeScript |
| Database | PostgreSQL, Drizzle ORM |
| Map | Mapbox GL, react-map-gl |
| Auth | JWT (jsonwebtoken), bcryptjs |
| API | OpenAPI spec → Orval codegen → React Query hooks |
| Monorepo | pnpm workspaces |

---

## Project Structure

```
├── artifacts/
│   ├── i-am-here/          # React + Vite frontend
│   │   └── src/
│   │       ├── pages/      # home, dashboard, login, signup, profile, notifications
│   │       ├── components/ # layout, ui components
│   │       └── lib/        # auth context
│   └── api-server/         # Express 5 backend
│       └── src/
│           ├── routes/     # auth, users, sessions, pings, safety, matches
│           ├── middlewares/ # JWT auth middleware
│           └── lib/        # matching algorithm, utilities
├── lib/
│   ├── db/                 # Drizzle schema (users, sessions, pings, reports, blocks)
│   ├── api-spec/           # OpenAPI contract (openapi.yaml)
│   └── api-client-react/   # Generated React Query hooks + Zod schemas
└── pnpm-workspace.yaml
```

---

## Matching Algorithm

Located in `artifacts/api-server/src/lib/matching.ts`

```
Score (0–100) = shared interests (up to 40pts)
              + mood compatibility (25pts)
              + proximity (up to 20pts)
              + time available (15pts)
```

Mood compatibility is determined by a lookup table — e.g. `chill` pairs well with `open` and `creative`, while `networking` pairs with `talkative` and `open`. The top 3 scored candidates are returned as suggestions.

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm
- PostgreSQL database

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/i-am-here.git
cd i-am-here

# Install all workspace dependencies
pnpm install
```

### Environment Variables

Create a `.env` file in the root or set these in your environment:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/iamhere
SESSION_SECRET=your-jwt-secret-here
VITE_MAPBOX_TOKEN=your-mapbox-public-token
```

### Run in Development

```bash
# Terminal 1 — API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (port 18398)
pnpm --filter @workspace/i-am-here run dev
```

Then open `http://localhost:18398`

### Database Setup

```bash
# Push schema to your database
pnpm --filter @workspace/db run push
```

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/sessions/nearby` | Get sessions near coordinates |
| POST | `/api/sessions` | Create a presence session |
| DELETE | `/api/sessions/:id` | End your session |
| GET | `/api/matches/suggestions` | Get AI match suggestions |
| POST | `/api/pings` | Send a ping (rate limited) |
| GET | `/api/pings/my` | Get sent/received pings |
| PATCH | `/api/pings/:id` | Accept or decline a ping |
| POST | `/api/safety/block` | Block a user |
| POST | `/api/safety/report` | Report a user |

Full contract: `lib/api-spec/openapi.yaml`

---

## Safety Design

- Coordinates offset by 300–500m before storage — never shown exactly on map
- Exact location revealed only when both users accept a ping
- Sessions are time-boxed and auto-expire — no persistent ghost profiles
- Block is immediate and permanent from that user's perspective
- Ping rate limiting prevents spam and harassment

---

## License

MIT
