# TutorTrack — Project Context

> **Purpose:** Quick-reference document for AI agents (and developers) to understand the full scope of the project without needing to search the codebase. Update this file when significant features are added or changed.
>
> **Last updated:** 2026-03-07

---

## 1. What Is This App?

**TutorTrack** is a personal tutoring management web app for a single tutor (Chris Ganta). It allows the tutor to:

- Manage a roster of students (contact details, hourly rate, balance tracking)
- Log tutoring class sessions (date, duration, students, lesson notes)
- View earnings and payment status per student
- Send email notifications to parents (class summaries, payment reminders, custom messages)
- Browse history of all sessions with filtering

The app is **multi-tenant aware** — every record (student, session) is scoped to a `userId`, so multiple tutors could use the system if needed, but the primary user is Chris.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Wouter (routing), TanStack Query, Tailwind CSS v4, Radix UI, Framer Motion |
| **Backend** | Express 5, TypeScript, `tsx` runner |
| **Database** | PostgreSQL (Supabase), Drizzle ORM |
| **Auth** | Passport.js with Google OAuth 2.0, `express-session` stored in PostgreSQL via `connect-pg-simple` |
| **Email** | Resend API |
| **Deployment** | Vercel (serverless functions for API, static files for client) |

---

## 3. Project Structure

```
tutor_app/
├── api/                    # Backend (Express server)
│   ├── app.ts              # Creates Express app, registers middleware
│   ├── auth.ts             # Passport Google OAuth setup, session config
│   ├── email.ts            # Resend email templates & send functions
│   ├── index.ts            # Vercel serverless entry point
│   ├── routes.ts           # All API route handlers
│   ├── schema.ts           # Drizzle ORM schema + Zod types
│   ├── server-local.ts     # Local dev entry point (starts Vite + Express)
│   ├── static.ts           # Static file serving for production
│   ├── storage.ts          # DatabaseStorage class (all DB queries)
│   └── vite.ts             # Vite dev server middleware (local only)
│
├── client/
│   └── src/
│       ├── App.tsx          # Router + auth guard + global providers
│       ├── main.tsx         # React entry point
│       ├── index.css        # Global styles
│       ├── components/
│       │   ├── MobileNav.tsx         # Bottom nav bar (Home, Students, History, Earnings, + New Class)
│       │   ├── StudentForm.tsx       # Reusable student add/edit form
│       │   ├── FilterSection.tsx     # Filter bar for History page
│       │   ├── student-list.tsx      # Reusable student selector list (used in class session form)
│       │   ├── duration-picker.tsx   # Duration selector widget
│       │   ├── payment-toggle.tsx    # Paid/Unpaid toggle widget
│       │   ├── class-summary.tsx     # Class summary text display
│       │   └── ui/                   # Shadcn/Radix UI component library
│       ├── pages/
│       │   ├── Dashboard.tsx         # Home: stats cards + recent classes list
│       │   ├── StudentList.tsx       # All students list
│       │   ├── NewStudent.tsx        # Add student form page
│       │   ├── StudentDetails.tsx    # Student profile + session history + notifications
│       │   ├── EditStudent.tsx       # Edit student page
│       │   ├── ClassSession.tsx      # New class session form (/class/new)
│       │   ├── ClassDetails.tsx      # View a single class session (/class/:id)
│       │   ├── EditClassSession.tsx  # Edit a class session (/classes/:id/edit)
│       │   ├── History.tsx           # Full session history with filters
│       │   ├── Earnings.tsx          # Earnings dashboard with charts
│       │   ├── Login.tsx             # Login page (Google OAuth button)
│       │   └── not-found.tsx         # 404 page
│       ├── hooks/
│       │   └── use-toast.ts          # Toast notification hook
│       └── lib/
│           ├── auth.ts               # useUser() hook, fetches /api/user
│           ├── queryClient.ts        # TanStack Query client config
│           └── utils.ts              # cn() utility (Tailwind class merging)
│
├── drizzle.config.ts        # Drizzle Kit config (points at DATABASE_URL)
├── vite.config.ts           # Vite config (React plugin + path aliases @/)
├── vercel.json              # Vercel routing rules (API → /api/index.ts, rest → client)
├── package.json             # Scripts: dev, build, start, db:push
├── tsconfig.json            # TypeScript config
└── .env                     # Environment variables (NOT committed)
```

---

## 4. Database Schema (`api/schema.ts`)

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | Auto-increment integer |
| `googleId` | text, unique | From Google OAuth |
| `email` | text, unique | |
| `name` | text | |
| `picture` | text | Profile photo URL |

### `students`
| Column | Type | Notes |
|---|---|---|
| `id` | varchar UUID PK | `gen_random_uuid()` |
| `userId` | integer FK → users | Multi-tenancy scope |
| `name` | text | |
| `grade` | text | |
| `parentName` | text | |
| `parentEmail` | text | Used for email notifications |
| `parentPhone` | text | |
| `hourlyRate` | integer | In dollars (e.g. 50 = $50/hr) |
| `balance` | integer | Outstanding unpaid amount (auto-recalculated) |
| `totalPaid` | integer | Sum of paid sessions (auto-recalculated) |

### `classSessions`
| Column | Type | Notes |
|---|---|---|
| `id` | varchar UUID PK | `gen_random_uuid()` |
| `userId` | integer FK → users | Multi-tenancy scope |
| `date` | timestamp | Defaults to now |
| `durationMinutes` | integer | e.g. 60 |
| `summary` | text | Lesson notes |
| `studentIds` | text[] | Array of student UUIDs |
| `status` | text | Default "completed" |
| `isPaid` | boolean | Payment flag |

### `session` (express-session store)
| Column | Type |
|---|---|
| `sid` | varchar PK |
| `sess` | text (JSON) |
| `expire` | timestamp |

> **Balance recalculation**: Whenever a class session is created or updated, `storage.recalculateStudentBalance()` is called for all students in that session. It sums unpaid session costs for `balance` and paid session costs for `totalPaid`. Revenue formula: `(hourlyRate × durationMinutes) / 60`.

---

## 5. API Routes (`api/routes.ts`)

All routes under `/api` (except `/api/user`) require authentication (middleware check for `req.isAuthenticated()`).

### Auth
| Method | Path | Description |
|---|---|---|
| `GET` | `/auth/google` | Start Google OAuth flow |
| `GET` | `/auth/google/callback` | OAuth callback, redirects to `/` |
| `POST` | `/api/logout` | Logout |
| `GET` | `/api/user` | Get current user (401 if not logged in) |
| `POST` | `/api/auth/dev-login` | Dev-only login as Chris (bypasses OAuth) |

### Students
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/students` | List all students for user |
| `GET` | `/api/students/:id` | Get specific student |
| `POST` | `/api/students` | Create student (validated via Zod) |
| `PATCH` | `/api/students/:id` | Update student |
| `DELETE` | `/api/students/:id` | Delete student |

### Class Sessions
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/classes` | List all sessions (ordered by date desc) |
| `GET` | `/api/classes/:id` | Get specific session |
| `GET` | `/api/classes/student/:studentId` | Sessions for a specific student |
| `POST` | `/api/classes` | Create session (triggers balance recalc) |
| `PATCH` | `/api/classes/:id` | Update session (date string → Date auto-converted) |

### Dashboard / Stats
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/stats` | Returns `{ totalStudents, classesThisWeek, revenueThisMonth, unpaidCount }` |

### Email Notifications
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/notify/class-summary` | Email class summary to parent(s). Body: `{ studentIds, date, durationMinutes, summary }` |
| `POST` | `/api/notify/payment-reminder` | Email payment reminder. Body: `{ studentId }`. Calculates amount due automatically. |
| `POST` | `/api/notify/custom` | Custom email. Body: `{ studentId, subject, message }` |

---

## 6. Authentication (`api/auth.ts`)

- **Strategy**: Google OAuth 2.0 via `passport-google-oauth20`
- **Session**: PostgreSQL-backed session store (30-day cookie)
- **Flow**: Google login → upsert user in `users` table → serialize user.id into session
- **Dev mode**: `POST /api/auth/dev-login` creates a session as Chris Ganta (user id=1) without OAuth. Disabled in production unless `ALLOW_DEV_LOGIN=true`.

---

## 7. Email (`api/email.ts`)

Uses **Resend** API. Three email types, all sent from `onboarding@resend.dev`:

| Function | Subject | Triggered from |
|---|---|---|
| `sendClassSummary()` | `Class Summary for {student} - {date}` | StudentDetails page or after creating class |
| `sendPaymentReminder()` | `Payment Reminder for {student}'s Tutoring` | StudentDetails page |
| `sendCustomNotification()` | Custom | StudentDetails page |

---

## 8. Frontend Pages

| Route | Component | Purpose |
|---|---|---|
| `/` | `Dashboard` | Stats + recent classes list |
| `/students` | `StudentList` | Full student roster |
| `/students/new` | `NewStudent` | Add a student |
| `/students/:id` | `StudentDetails` | Student profile, sessions, email actions |
| `/students/:id/edit` | `EditStudent` | Edit student details |
| `/class/new` | `ClassSession` | Log a new tutoring session |
| `/class/:id` | `ClassDetails` | View details of one session |
| `/classes/:id/edit` | `EditClassSession` | Edit a session |
| `/history` | `History` | All sessions with date/student/paid filters |
| `/earnings` | `Earnings` | Revenue charts and totals |
| `/login` | `Login` | Google sign-in button |

### Auth guard
`App.tsx` uses `useUser()` (TanStack Query calling `/api/user`). If not logged in → redirect to `/login`. If loading → full-screen spinner.

### Data fetching
All data fetching done via **TanStack Query** (`useQuery`, `useMutation`). Query client config is in `client/src/lib/queryClient.ts`.

---

## 9. Environment Variables (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Supabase) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `SESSION_SECRET` | Express session signing key |
| `RESEND_API_KEY` | Resend email API key |
| `PORT` | Server port (defaults to 5000; use 3000 locally if 5000 is taken by macOS AirPlay) |
| `NODE_ENV` | `development` or `production` |
| `ALLOW_DEV_LOGIN` | Set to `"true"` in production to enable dev login bypass |

---

## 10. Running Locally

```bash
# Port 5000 is blocked by macOS AirPlay Receiver (ControlCenter) on newer Macs
# Always use PORT=3000 when running locally
PORT=3000 npm run dev

# App available at: http://localhost:3000
# Dev login auto-authenticates as Chris (no Google OAuth needed in dev)
```

### Database
```bash
npm run db:push   # Push schema changes to Supabase via Drizzle Kit
```

---

## 11. Deployment (Vercel)

- **Config**: `vercel.json` routes `/api/*` to `api/index.ts` (serverless), everything else to the Vite-built static client.
- **Build**: `vite build` outputs to `dist/`.
- **Known issue**: React 19 + `react-day-picker@8` peer dependency conflict → resolved via `overrides` in `package.json` and `.npmrc` with `legacy-peer-deps=true`.

---

## 12. Key Design Decisions & Notes

- **`studentIds` is an array** on `classSessions`, supporting group sessions with multiple students.
- **Balance is derived**, not directly entered — it's auto-recalculated from sessions whenever a session is created or updated.
- **No payment recording flow** — `isPaid` is a boolean toggle on each session; there's no separate payments table.
- **No admin UI** — this is a personal tool; no user management screen exists (admin settings section was being discussed as of the last conversation).
- **Mobile-first design** — the bottom `MobileNav` is central to UX; desktop is supported but the layout is optimized for mobile.
- **`@/` alias** maps to `client/src/` (configured in `vite.config.ts` and `tsconfig.json`).
