# TutorTrack — Build Prompt for AI Agents

## What to Build

Build a mobile-first student management web app called **TutorTrack** for a private tutoring/coaching business. The app tracks students, class sessions, payments, and earnings. It should be designed for phone use with a clean, professional look.

## Tech Stack

- **Frontend**: React 19 + Vite, TailwindCSS v4, shadcn/ui components, TanStack React Query, wouter (routing), lucide-react (icons), date-fns
- **Backend**: Express.js (v5), Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Fonts**: Plus Jakarta Sans (headings), Inter (body)
- **Validation**: Zod + drizzle-zod

## Design Requirements

- Mobile-first layout (max ~480px content area, works on desktop too)
- Color theme: "Trust Blue" — primary is indigo/blue (HSL 221 83% 53%), light background (HSL 210 40% 98%)
- Font: Plus Jakarta Sans for headings, Inter for body text
- Bottom tab navigation with floating "New Class" button (raised circle)
- Cards with no borders, subtle shadows
- Avatars use colored circles with initials (hash-based color from name), no image uploads
- Loading states use spinning Loader2 icon
- Empty states with icons and helpful text

## Database Schema

Two tables:

### students
| Column | Type | Notes |
|--------|------|-------|
| id | varchar, PK | UUID auto-generated |
| name | text | Required |
| grade | text | Required (e.g. "10th Grade") |
| parent_name | text | Required |
| parent_email | text | Required |
| parent_phone | text | Required |
| hourly_rate | integer | Default 50 |
| balance | integer | Default 0 |
| total_paid | integer | Default 0 |

### class_sessions
| Column | Type | Notes |
|--------|------|-------|
| id | varchar, PK | UUID auto-generated |
| date | timestamp | Default now() |
| duration_minutes | integer | Required |
| summary | text | Default "" |
| student_ids | text[] | Array of student IDs |
| status | text | Default "completed" |
| is_paid | boolean | Default false |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/students | List all students |
| POST | /api/students | Create student |
| GET | /api/students/:id | Get one student |
| PATCH | /api/students/:id | Update student |
| DELETE | /api/students/:id | Delete student |
| GET | /api/classes | List all class sessions |
| POST | /api/classes | Create class session |
| GET | /api/classes/:id | Get one class session |
| PATCH | /api/classes/:id | Update class session (used for payment toggle) |
| GET | /api/classes/student/:studentId | Get classes for a specific student |
| GET | /api/stats | Dashboard stats (totalStudents, classesThisWeek, revenueThisMonth, unpaidCount) |

## Pages & Routes

### 1. Dashboard (`/`)
- Header: "TutorTrack" title with greeting
- Two stat cards in a grid: Active Students count (links to /students), Classes This Week count (links to /history)
- Recent Classes list (last 5 sessions) with student initials avatar, summary, date, duration
- "View all" link to /history
- Empty state when no classes exist

### 2. Students (`/students`)
- Header with "Students" title and "Add Student" button (links to /students/new)
- Search input to filter by name or grade
- Student cards showing: initials avatar, name, grade, balance badge (Due/Paid), chevron
- Each card links to /student/:id
- Empty state when no students

### 3. Add Student (`/students/new`)
- Back button to /students
- Form fields: Student Name, Grade/Level, Hourly Rate ($), Parent Name, Email, Phone
- All fields required, controlled inputs
- POST to /api/students on submit, redirect to /students on success
- Loading state on submit button

### 4. Student Details (`/student/:id`)
- Back button to /students
- Profile header: large initials avatar, name, grade, Call Parent & Email buttons
- Financial cards: Current Balance, Hourly Rate
- Parent details card: Name, Phone, Total Paid
- Class history list for this student

### 5. New Class Session (`/class/new`)
- Back button to home
- **Attendance**: 2-column grid of student cards with initials avatars, tap to select (checkmark appears), plus "Add Student" card linking to /students/new
- **Duration**: Slider from 15 to 180 minutes, step 15, displayed prominently
- **Summary**: Textarea for class notes
- **Paid toggle**: Switch for "Paid Immediately?"
- Two separate buttons at bottom:
  - "Log Class" (primary) — saves session to database via POST /api/classes
  - "Notify Parents" (outline) — opens notification preview dialog
- Notification preview dialog shows: recipient email, student names, duration, summary, with Send and Edit buttons

### 6. Class History (`/history`)
- Header with "Class History" title
- List of all class sessions showing: student initials avatar, name, date, payment status badge (Paid/Pending — tappable to toggle via PATCH), summary, duration, earned amount
- **Notify button** on each class card — opens a dialog showing full class details (date, duration, payment status, summary) with option to send notification to parent
- Empty state when no classes

### 7. Earnings (`/earnings`)
- Header with "Earnings" title
- Hero card (primary blue background) showing revenue earned this month
- Two stat cards: Collected (paid total) and Unpaid total with count
- List of all sessions showing: student avatar, name, date, duration, amount earned, paid/pending badge
- Revenue calculated as: (student hourlyRate * session durationMinutes) / 60

## Bottom Navigation

Fixed bottom bar with 5 items:
1. Home (house icon) → /
2. Students (users icon) → /students
3. History (book icon) → /history
4. Earnings ($ icon) → /earnings
5. New Class (+ icon, raised floating circle button) → /class/new

Active tab gets primary color highlight. The "New Class" button floats above the nav bar.

## Key Behaviors

- All data persists in PostgreSQL — no mock data or localStorage
- TanStack React Query handles all data fetching with automatic cache invalidation after mutations
- Payment status toggleable from History page (tap Paid/Pending badge)
- "Log Class" and "Notify Parents" are separate actions
- Parent notifications can be sent anytime from History page via Notify button on each class
- Notification preview shows full class details: date, duration, payment status, summary
- Initials avatars use consistent hash-based colors (same name always gets same color)

## Source Code Reference

See the `TUTORTRACK_SOURCE.md` file for complete source code of all custom components, pages, backend routes, database schema, and storage layer.
