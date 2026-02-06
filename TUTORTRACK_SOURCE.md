# TutorTrack — Complete Source Code Reference

This file contains the complete source code for all custom files in the TutorTrack app. Standard library/framework files (shadcn/ui components, etc.) are omitted — use shadcn/ui CLI to generate those.

---

## Project Structure

```
├── client/
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── components/
│       │   └── MobileNav.tsx
│       ├── hooks/
│       │   └── use-toast.ts          (shadcn default)
│       ├── lib/
│       │   ├── queryClient.ts
│       │   └── utils.ts              (shadcn default)
│       └── pages/
│           ├── Dashboard.tsx
│           ├── StudentList.tsx
│           ├── NewStudent.tsx
│           ├── StudentDetails.tsx
│           ├── ClassSession.tsx
│           ├── History.tsx
│           ├── Earnings.tsx
│           └── not-found.tsx
├── server/
│   ├── index.ts
│   ├── routes.ts
│   ├── storage.ts
│   ├── vite.ts
│   └── static.ts
├── shared/
│   └── schema.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── drizzle.config.ts
```

---

## shared/schema.ts

```typescript
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  grade: text("grade").notNull(),
  parentName: text("parent_name").notNull(),
  parentEmail: text("parent_email").notNull(),
  parentPhone: text("parent_phone").notNull(),
  hourlyRate: integer("hourly_rate").notNull().default(50),
  balance: integer("balance").notNull().default(0),
  totalPaid: integer("total_paid").notNull().default(0),
});

export const classSessions = pgTable("class_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull().defaultNow(),
  durationMinutes: integer("duration_minutes").notNull(),
  summary: text("summary").notNull().default(""),
  studentIds: text("student_ids").array().notNull(),
  status: text("status").notNull().default("completed"),
  isPaid: boolean("is_paid").notNull().default(false),
});

export const insertStudentSchema = createInsertSchema(students).omit({ id: true, balance: true, totalPaid: true });
export const insertClassSessionSchema = createInsertSchema(classSessions).omit({ id: true, date: true });

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

export type InsertClassSession = z.infer<typeof insertClassSessionSchema>;
export type ClassSession = typeof classSessions.$inferSelect;
```

---

## server/storage.ts

```typescript
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  students,
  classSessions,
  type Student,
  type InsertStudent,
  type ClassSession,
  type InsertClassSession,
} from "@shared/schema";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface IStorage {
  getStudents(): Promise<Student[]>;
  getStudent(id: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, data: Partial<Student>): Promise<Student | undefined>;
  deleteStudent(id: string): Promise<boolean>;

  getClassSessions(): Promise<ClassSession[]>;
  getClassSession(id: string): Promise<ClassSession | undefined>;
  getClassSessionsByStudent(studentId: string): Promise<ClassSession[]>;
  createClassSession(session: InsertClassSession): Promise<ClassSession>;
  updateClassSession(id: string, data: Partial<ClassSession>): Promise<ClassSession | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getStudents(): Promise<Student[]> {
    return await db.select().from(students);
  }

  async getStudent(id: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const [student] = await db.insert(students).values(insertStudent).returning();
    return student;
  }

  async updateStudent(id: string, data: Partial<Student>): Promise<Student | undefined> {
    const [student] = await db.update(students).set(data).where(eq(students.id, id)).returning();
    return student;
  }

  async deleteStudent(id: string): Promise<boolean> {
    const result = await db.delete(students).where(eq(students.id, id)).returning();
    return result.length > 0;
  }

  async getClassSessions(): Promise<ClassSession[]> {
    return await db.select().from(classSessions).orderBy(classSessions.date);
  }

  async getClassSession(id: string): Promise<ClassSession | undefined> {
    const [session] = await db.select().from(classSessions).where(eq(classSessions.id, id));
    return session;
  }

  async getClassSessionsByStudent(studentId: string): Promise<ClassSession[]> {
    const allSessions = await db.select().from(classSessions).orderBy(classSessions.date);
    return allSessions.filter(s => s.studentIds.includes(studentId));
  }

  async createClassSession(insertSession: InsertClassSession): Promise<ClassSession> {
    const [session] = await db.insert(classSessions).values(insertSession).returning();
    return session;
  }

  async updateClassSession(id: string, data: Partial<ClassSession>): Promise<ClassSession | undefined> {
    const [session] = await db.update(classSessions).set(data).where(eq(classSessions.id, id)).returning();
    return session;
  }
}

export const storage = new DatabaseStorage();
```

---

## server/routes.ts

```typescript
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStudentSchema, insertClassSessionSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // --- Students ---

  app.get("/api/students", async (_req, res) => {
    const students = await storage.getStudents();
    res.json(students);
  });

  app.get("/api/students/:id", async (req, res) => {
    const student = await storage.getStudent(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  });

  app.post("/api/students", async (req, res) => {
    try {
      const data = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(data);
      res.status(201).json(student);
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(e).message });
      }
      throw e;
    }
  });

  app.patch("/api/students/:id", async (req, res) => {
    const student = await storage.updateStudent(req.params.id, req.body);
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  });

  app.delete("/api/students/:id", async (req, res) => {
    const success = await storage.deleteStudent(req.params.id);
    if (!success) return res.status(404).json({ message: "Student not found" });
    res.status(204).send();
  });

  // --- Class Sessions ---

  app.get("/api/classes", async (_req, res) => {
    const sessions = await storage.getClassSessions();
    res.json(sessions);
  });

  app.get("/api/classes/:id", async (req, res) => {
    const session = await storage.getClassSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Class session not found" });
    res.json(session);
  });

  app.get("/api/classes/student/:studentId", async (req, res) => {
    const sessions = await storage.getClassSessionsByStudent(req.params.studentId);
    res.json(sessions);
  });

  app.post("/api/classes", async (req, res) => {
    try {
      const data = insertClassSessionSchema.parse(req.body);
      const session = await storage.createClassSession(data);
      res.status(201).json(session);
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(e).message });
      }
      throw e;
    }
  });

  app.patch("/api/classes/:id", async (req, res) => {
    const session = await storage.updateClassSession(req.params.id, req.body);
    if (!session) return res.status(404).json({ message: "Class session not found" });
    res.json(session);
  });

  // --- Dashboard stats ---

  app.get("/api/stats", async (_req, res) => {
    const students = await storage.getStudents();
    const classes = await storage.getClassSessions();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const classesThisWeek = classes.filter(c => new Date(c.date) >= startOfWeek);
    const classesThisMonth = classes.filter(c => new Date(c.date) >= startOfMonth);

    let revenueThisMonth = 0;
    for (const c of classesThisMonth) {
      for (const sid of c.studentIds) {
        const student = students.find(s => s.id === sid);
        if (student) {
          revenueThisMonth += (student.hourlyRate * c.durationMinutes) / 60;
        }
      }
    }

    const unpaidCount = classes.filter(c => !c.isPaid).length;

    res.json({
      totalStudents: students.length,
      classesThisWeek: classesThisWeek.length,
      revenueThisMonth: Math.round(revenueThisMonth),
      unpaidCount,
    });
  });

  return httpServer;
}
```

---

## server/index.ts

```typescript
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
```

---

## client/index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />

    <meta property="og:title" content="TutorTrack" />
    <meta property="og:description" content="Simple student and class management for tutors" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="TutorTrack" />
    <meta name="twitter:description" content="Simple student and class management for tutors" />

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## client/src/main.tsx

```typescript
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

---

## client/src/App.tsx

```typescript
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import StudentList from "@/pages/StudentList";
import NewStudent from "@/pages/NewStudent";
import ClassSession from "@/pages/ClassSession";
import StudentDetails from "@/pages/StudentDetails";
import History from "@/pages/History";
import Earnings from "@/pages/Earnings";
import { MobileNav } from "@/components/MobileNav";

function Router() {
  return (
    <div className="font-sans antialiased text-foreground bg-background">
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/students" component={StudentList} />
        <Route path="/students/new" component={NewStudent} />
        <Route path="/class/new" component={ClassSession} />
        <Route path="/history" component={History} />
        <Route path="/earnings" component={Earnings} />
        <Route path="/student/:id" component={StudentDetails} />
        <Route component={NotFound} />
      </Switch>
      <MobileNav />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
```

---

## client/src/index.css

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  
  --color-chart-1: hsl(var(--chart-1));
  --color-chart-2: hsl(var(--chart-2));
  --color-chart-3: hsl(var(--chart-3));
  --color-chart-4: hsl(var(--chart-4));
  --color-chart-5: hsl(var(--chart-5));
  
  --font-sans: 'Inter', sans-serif;
  --font-display: 'Plus Jakarta Sans', sans-serif;
  
  --radius: 0.75rem;
}

:root {
  --background: 210 40% 98%;
  --foreground: 222 47% 11%;

  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;

  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;

  --primary: 221 83% 53%;
  --primary-foreground: 210 40% 98%;

  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222 47% 11.2%;

  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;

  --accent: 210 40% 96.1%;
  --accent-foreground: 222 47% 11.2%;

  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;

  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221 83% 53%;

  --chart-1: 221 83% 53%;
  --chart-2: 173 58% 39%;
  --chart-3: 197 37% 24%;
  --chart-4: 43 74% 66%;
  --chart-5: 27 87% 67%;
}

.dark {
  --background: 222 47% 11%;
  --foreground: 210 40% 98%;

  --card: 222 47% 11%;
  --card-foreground: 210 40% 98%;

  --popover: 222 47% 11%;
  --popover-foreground: 210 40% 98%;

  --primary: 217 91% 60%;
  --primary-foreground: 222 47% 11.2%;

  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;

  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;

  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;

  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;

  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 48%;

  --chart-1: 220 70% 50%;
  --chart-2: 160 60% 45%;
  --chart-3: 30 80% 55%;
  --chart-4: 280 65% 60%;
  --chart-5: 340 75% 55%;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply font-sans antialiased bg-background text-foreground;
  }
  h1, h2, h3, h4, h5, h6 {
    @apply font-display tracking-tight;
  }
}
```

---

## client/src/lib/queryClient.ts

```typescript
import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

---

## client/src/components/MobileNav.tsx

```typescript
import { Plus, Home, Users, BookOpen, DollarSign } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Users, label: "Students", href: "/students", match: (loc: string) => loc.startsWith("/student") },
    { icon: BookOpen, label: "History", href: "/history" },
    { icon: DollarSign, label: "Earnings", href: "/earnings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-lg pb-safe">
      <div className="flex items-center justify-around p-2">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.match && item.match(location));
          
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 active:scale-95 gap-1",
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <item.icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
        
        <Link href="/class/new">
          <div className="flex flex-col items-center justify-center -mt-8">
            <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform active:scale-95 border-4 border-background">
              <Plus className="h-7 w-7" />
            </div>
            <span className="text-[10px] font-medium mt-1 text-primary">New Class</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
```

---

## client/src/pages/Dashboard.tsx

```typescript
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const AVATAR_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-red-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<{ totalStudents: number; classesThisWeek: number; revenueThisMonth: number; unpaidCount: number }>({
    queryKey: ["/api/stats"],
  });

  const { data: classes, isLoading: classesLoading } = useQuery<any[]>({
    queryKey: ["/api/classes"],
  });

  const { data: students, isLoading: studentsLoading } = useQuery<any[]>({
    queryKey: ["/api/students"],
  });

  const isLoading = statsLoading || classesLoading || studentsLoading;

  const totalStudents = stats?.totalStudents ?? 0;
  const classesThisWeek = stats?.classesThisWeek ?? 0;

  const recentClasses = (classes || []).slice(0, 5);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-24">
      <div className="bg-background pt-8 pb-6 px-6 border-b">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary" data-testid="text-app-title">TutorTrack</h1>
            <p className="text-sm text-muted-foreground">Good afternoon, Coach!</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            JD
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Link href="/students">
            <Card className="bg-background border-none shadow-sm active:scale-95 transition-transform cursor-pointer" data-testid="card-total-students">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-students">{totalStudents}</p>
                  <p className="text-xs text-muted-foreground">Active Students</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/history">
            <Card className="bg-background border-none shadow-sm active:scale-95 transition-transform cursor-pointer" data-testid="card-classes-week">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-classes-week">{classesThisWeek}</p>
                  <p className="text-xs text-muted-foreground">Classes this week</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-display">Recent Classes</h2>
            <Link href="/history" className="text-xs font-medium text-primary flex items-center gap-1" data-testid="link-view-all-history">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentClasses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-classes">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No classes recorded yet.</p>
              <p className="text-xs mt-1">Log your first class session to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentClasses.map((session: any) => {
                const student = (students || []).find((s: any) => s.id === session.studentIds[0]);
                const studentName = student?.name || "Unknown Student";
                return (
                  <Card key={session.id} className="border-none shadow-sm overflow-hidden" data-testid={`card-class-${session.id}`}>
                    <div className="flex">
                      <div className="w-1.5 bg-primary"></div>
                      <CardContent className="p-4 flex-1 flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(studentName)}`}>
                          {getInitials(studentName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate" data-testid={`text-class-student-${session.id}`}>{studentName}</h4>
                          <p className="text-xs text-muted-foreground truncate">{session.summary}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">{format(new Date(session.date), "MMM d")}</p>
                          <p className="text-xs text-muted-foreground">{session.durationMinutes} min</p>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## client/src/pages/StudentList.tsx

```typescript
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Mail, Phone, ChevronRight, Plus, Loader2, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const AVATAR_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-red-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function StudentList() {
  const [search, setSearch] = useState("");

  const { data: students = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/students"],
  });
  
  const filteredStudents = students.filter((s: any) => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.grade.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted/20 pb-24">
      <div className="bg-background pt-8 pb-4 px-6 border-b sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold font-display" data-testid="text-students-title">Students</h1>
          <Link href="/students/new">
            <Button size="sm" className="h-9 px-4 rounded-full shadow-sm" data-testid="button-add-student">
              <Plus className="h-4 w-4 mr-1.5" /> Add Student
            </Button>
          </Link>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search students..." 
            className="pl-9 bg-muted/50 border-none h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-students"
          />
        </div>
      </div>

      <div className="p-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground" data-testid="text-no-students">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{search ? "No students match your search." : "No students yet."}</p>
            {!search && <p className="text-xs mt-1">Add your first student to get started!</p>}
          </div>
        ) : (
          filteredStudents.map((student: any) => (
            <Link href={`/student/${student.id}`} key={student.id}>
              <Card className="border-none shadow-sm mb-3 active:scale-[0.99] transition-transform" data-testid={`card-student-${student.id}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full border-2 border-background shadow-sm flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(student.name)}`}>
                    {getInitials(student.name)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-base" data-testid={`text-student-name-${student.id}`}>{student.name}</h4>
                    <p className="text-xs text-muted-foreground">{student.grade}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                      student.balance > 0 
                        ? "bg-red-100 text-red-700" 
                        : student.balance < 0 
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`} data-testid={`status-balance-${student.id}`}>
                      {student.balance > 0 ? `Due: $${student.balance}` : "Paid"}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
```

---

## client/src/pages/NewStudent.tsx

```typescript
import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, User, Upload, Mail, Phone, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NewStudent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [rate, setRate] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  const createStudentMutation = useMutation({
    mutationFn: async (data: { name: string; grade: string; hourlyRate: number; parentName: string; parentEmail: string; parentPhone: string }) => {
      await apiRequest("POST", "/api/students", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Student Added",
        description: "Successfully added new student to your roster.",
      });
      setLocation("/students");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createStudentMutation.mutate({
      name,
      grade,
      hourlyRate: parseInt(rate),
      parentName,
      parentEmail,
      parentPhone,
    });
  };

  return (
    <div className="min-h-screen bg-muted/20 pb-24">
      <div className="bg-background pt-8 pb-4 px-6 border-b sticky top-0 z-10 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/students")} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold font-display">Add New Student</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-muted border-2 border-dashed border-muted-foreground/50 flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted/70 transition-colors">
            <Upload className="h-6 w-6 mb-1" />
            <span className="text-[10px]">Add Photo</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Student Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="name" placeholder="e.g. Alex Johnson" className="pl-9" required value={name} onChange={(e) => setName(e.target.value)} data-testid="input-name" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grade">Grade / Level</Label>
            <Input id="grade" placeholder="e.g. 10th Grade Math" required value={grade} onChange={(e) => setGrade(e.target.value)} data-testid="input-grade" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate">Hourly Rate ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="rate" type="number" placeholder="50" className="pl-9" required value={rate} onChange={(e) => setRate(e.target.value)} data-testid="input-rate" />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Parent Details</h3>
          
          <div className="space-y-2">
            <Label htmlFor="parentName">Parent Name</Label>
            <Input id="parentName" placeholder="e.g. Sarah Johnson" required value={parentName} onChange={(e) => setParentName(e.target.value)} data-testid="input-parent-name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder="parent@example.com" className="pl-9" required value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} data-testid="input-parent-email" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" className="pl-9" required value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} data-testid="input-parent-phone" />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button type="submit" className="w-full h-11 text-base shadow-lg shadow-primary/20" disabled={createStudentMutation.isPending} data-testid="button-save-student">
            {createStudentMutation.isPending ? "Adding..." : "Save Student"}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

---

## client/src/pages/StudentDetails.tsx

```typescript
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Phone, Mail, Clock, DollarSign, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const AVATAR_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-red-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function StudentDetails() {
  const [match, params] = useRoute("/student/:id");

  const { data: student, isLoading: studentLoading } = useQuery<any>({
    queryKey: ["/api/students", params?.id],
    enabled: !!params?.id,
  });

  const { data: studentClasses = [], isLoading: classesLoading } = useQuery<any[]>({
    queryKey: ["/api/classes/student", params?.id],
    enabled: !!params?.id,
  });

  const isLoading = studentLoading || classesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-muted/20 pb-24">
        <div className="bg-background border-b sticky top-0 z-10">
          <div className="p-4 flex items-center gap-2">
            <Link href="/students">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <span className="font-semibold text-lg">Student Profile</span>
          </div>
        </div>
        <div className="p-6 text-center text-muted-foreground" data-testid="text-student-not-found">
          Student not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-24">
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="p-4 flex items-center gap-2">
          <Link href="/students">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <span className="font-semibold text-lg">Student Profile</span>
        </div>
        
        <div className="px-6 pb-6 flex flex-col items-center">
          <div className={`h-24 w-24 rounded-full border-4 border-white shadow-lg mb-4 flex items-center justify-center text-white font-bold text-2xl ${getAvatarColor(student.name)}`}>
            {getInitials(student.name)}
          </div>
          <h1 className="text-2xl font-bold font-display" data-testid="text-student-name">{student.name}</h1>
          <p className="text-muted-foreground" data-testid="text-student-grade">{student.grade}</p>
          
          <div className="flex gap-3 mt-4 w-full justify-center">
            <Button size="sm" variant="outline" className="rounded-full gap-2" asChild data-testid="button-call-parent">
              <a href={`tel:${student.parentPhone}`}>
                <Phone className="h-4 w-4" /> Call Parent
              </a>
            </Button>
            <Button size="sm" variant="outline" className="rounded-full gap-2" asChild data-testid="button-email-parent">
              <a href={`mailto:${student.parentEmail}`}>
                <Mail className="h-4 w-4" /> Email
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-sm bg-primary/5" data-testid="card-balance">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
              <p className={`text-xl font-bold ${student.balance > 0 ? "text-red-600" : "text-green-600"}`} data-testid="text-balance">
                ${student.balance}
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm" data-testid="card-hourly-rate">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Hourly Rate</p>
              <p className="text-xl font-bold" data-testid="text-hourly-rate">${student.hourlyRate}/hr</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Parent Details</h3>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="font-medium" data-testid="text-parent-name">{student.parentName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span className="font-medium" data-testid="text-parent-phone">{student.parentPhone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Paid</span>
                <span className="font-medium text-green-600" data-testid="text-total-paid">${student.totalPaid}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Class History</h3>
          <div className="space-y-3">
            {studentClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-classes">No classes recorded yet.</p>
            ) : (
              studentClasses.map((session: any) => (
                <Card key={session.id} className="border-none shadow-sm" data-testid={`card-class-${session.id}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium">{format(new Date(session.date), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{session.durationMinutes}m</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                      {session.summary}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## client/src/pages/ClassSession.tsx

```typescript
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Clock, Send, CheckCircle2, Mail, Plus, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const AVATAR_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-red-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ClassSession() {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [duration, setDuration] = useState([60]);
  const [summary, setSummary] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: students = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/students"],
  });

  const createClassMutation = useMutation({
    mutationFn: async (data: { durationMinutes: number; summary: string; studentIds: string[]; status: string; isPaid: boolean }) => {
      await apiRequest("POST", "/api/classes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Class Logged!",
        description: `Notification sent to ${selectedStudents.length} parents.${isPaid ? " Marked as paid." : ""}`,
      });
      setTimeout(() => setLocation("/"), 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggleStudent = (id: string) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(selectedStudents.filter(s => s !== id));
    } else {
      setSelectedStudents([...selectedStudents, id]);
    }
  };

  const handleLogClass = () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "No students selected",
        description: "Please select at least one student.",
        variant: "destructive"
      });
      return;
    }
    createClassMutation.mutate({
      durationMinutes: duration[0],
      summary,
      studentIds: selectedStudents,
      status: "completed",
      isPaid,
    });
  };

  const handleNotifyParents = () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "No students selected",
        description: "Please select at least one student.",
        variant: "destructive"
      });
      return;
    }
    setShowPreview(true);
  };

  const handleSendNotification = () => {
    setShowPreview(false);
    toast({
      title: "Notification Sent!",
      description: `Summary sent to ${selectedStudents.length} parent(s).`,
    });
  };

  const studentNames = selectedStudents.map(id => students.find((s: any) => s.id === id)?.name).join(", ");
  const parentEmail = selectedStudents.length > 0 ? students.find((s: any) => s.id === selectedStudents[0])?.parentEmail : "";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      <div className="p-6 border-b flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold font-display">New Class Session</h1>
      </div>

      <div className="flex-1 p-6 space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Mark Attendance</h2>
          <div className="grid grid-cols-2 gap-3">
            {students.map((student: any) => {
              const isSelected = selectedStudents.includes(student.id);
              return (
                <div 
                  key={student.id}
                  onClick={() => handleToggleStudent(student.id)}
                  data-testid={`card-student-${student.id}`}
                  className={`
                    relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                    ${isSelected 
                      ? "border-primary bg-primary/5 shadow-md" 
                      : "border-transparent bg-muted/50 hover:bg-muted"
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(student.name)}`}>
                      {getInitials(student.name)}
                    </div>
                    <span className="font-semibold text-sm text-center leading-tight">{student.name}</span>
                    
                    {isSelected && (
                      <div className="absolute top-2 right-2 text-primary">
                        <CheckCircle2 className="h-5 w-5 fill-primary text-white" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            <Link href="/students/new">
              <div className="relative p-4 rounded-xl border-2 border-dashed border-muted-foreground/30 cursor-pointer transition-all duration-200 hover:bg-muted/50 hover:border-muted-foreground/50 h-full flex flex-col items-center justify-center gap-2 min-h-[140px]" data-testid="link-add-student">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="font-medium text-sm text-muted-foreground">Add Student</span>
              </div>
            </Link>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Duration</h2>
             <span className="text-lg font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg" data-testid="text-duration">{duration[0]} min</span>
          </div>
          <Card className="border-none bg-muted/30 shadow-none">
            <CardContent className="pt-6">
              <Slider 
                value={duration} 
                onValueChange={setDuration} 
                max={180} 
                step={15} 
                min={15}
                className="py-4"
                data-testid="slider-duration"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>15m</span>
                <span>1h</span>
                <span>2h</span>
                <span>3h</span>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Class Summary</h2>
            <Textarea 
              placeholder="What did you cover today? (Sent to parents)"
              className="min-h-[120px] bg-muted/30 border-none resize-none text-base"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              data-testid="input-summary"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
             <div className="space-y-0.5">
               <Label className="text-base font-medium">Paid Immediately?</Label>
               <p className="text-xs text-muted-foreground">Mark this session as already paid</p>
             </div>
             <Switch checked={isPaid} onCheckedChange={setIsPaid} data-testid="switch-paid" />
          </div>
        </section>
      </div>

      <div className="p-6 border-t bg-background space-y-3">
        <Button 
          className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20" 
          onClick={handleLogClass}
          disabled={createClassMutation.isPending}
          data-testid="button-log-class"
        >
          {createClassMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4 mr-2" />
          )}
          Log Class
        </Button>
        <Button 
          variant="outline"
          className="w-full h-12 text-base font-semibold" 
          onClick={handleNotifyParents}
          data-testid="button-notify-parents"
        >
          <Mail className="w-4 h-4 mr-2" />
          Notify Parents
        </Button>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-md rounded-2xl mx-4">
          <DialogHeader>
            <DialogTitle>Notification Preview</DialogTitle>
            <DialogDescription>
              This message will be sent to the parent(s).
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 p-4 rounded-lg space-y-3 my-2 border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground border-b pb-2">
               <Mail className="h-3 w-3" /> 
               To: {selectedStudents.length > 1 ? "Parents (Multiple)" : parentEmail}
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm">Class Summary: {studentNames}</p>
              <p className="text-sm text-foreground/80">
                Hi! Just letting you know we completed a {duration[0]} min session today.
              </p>
              {summary && (
                <p className="text-sm text-foreground/80 italic mt-2">
                  "{summary}"
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPreview(false)} data-testid="button-edit-preview">Edit</Button>
            <Button onClick={handleSendNotification} className="w-full sm:w-auto" data-testid="button-send-notification">
              <Send className="w-4 h-4 mr-2" /> Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## client/src/pages/History.tsx

```typescript
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Calendar, Clock, Filter, DollarSign, CheckCircle2, Send, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const AVATAR_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-red-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function History() {
  const { toast } = useToast();
  const [notifySession, setNotifySession] = useState<any>(null);

  const { data: classes = [], isLoading: classesLoading } = useQuery<any[]>({
    queryKey: ["/api/classes"],
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery<any[]>({
    queryKey: ["/api/students"],
  });

  const isLoading = classesLoading || studentsLoading;

  const togglePaymentMutation = useMutation({
    mutationFn: async ({ id, isPaid }: { id: string; isPaid: boolean }) => {
      await apiRequest("PATCH", `/api/classes/${id}`, { isPaid });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: variables.isPaid ? "Marked as Paid" : "Marked as Unpaid",
        description: "Class session has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const togglePayment = (id: string, currentIsPaid: boolean) => {
    togglePaymentMutation.mutate({ id, isPaid: !currentIsPaid });
  };

  const handleSendNotification = () => {
    const session = notifySession;
    const sessionStudents = session.studentIds.map((sid: string) => students.find((s: any) => s.id === sid)).filter(Boolean);
    setNotifySession(null);
    toast({
      title: "Notification Sent!",
      description: `Summary sent to ${sessionStudents.length} parent(s).`,
    });
  };

  const getNotifyStudents = () => {
    if (!notifySession) return [];
    return notifySession.studentIds.map((sid: string) => students.find((s: any) => s.id === sid)).filter(Boolean);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-24">
      <div className="bg-background pt-8 pb-4 px-6 border-b sticky top-0 z-10 flex justify-between items-end">
        <h1 className="text-2xl font-bold font-display" data-testid="text-history-title">Class History</h1>
        <div className="p-2 bg-muted rounded-full">
          <Filter className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="p-6 space-y-4">
        {classes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground" data-testid="text-no-classes">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No classes recorded yet.</p>
            <p className="text-xs mt-1">Log your first class to see it here!</p>
          </div>
        ) : (
          classes.map((session: any) => {
            const student = students.find((s: any) => s.id === session.studentIds[0]);
            const studentName = student?.name || "Unknown Student";
            return (
              <Card key={session.id} className="border-none shadow-sm" data-testid={`card-class-${session.id}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                       <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(studentName)}`}>
                          {getInitials(studentName)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm" data-testid={`text-class-student-${session.id}`}>{studentName}</h4>
                          <p className="text-xs text-muted-foreground">{format(new Date(session.date), "EEEE, MMM d")}</p>
                        </div>
                    </div>
                    <div className="text-right">
                      <button 
                        onClick={() => togglePayment(session.id, session.isPaid)}
                        data-testid={`button-toggle-payment-${session.id}`}
                        className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors gap-1",
                          session.isPaid 
                            ? "bg-green-100 text-green-700 hover:bg-green-200" 
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        )}
                      >
                        {session.isPaid ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" /> Pending
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="pl-[3.25rem]">
                    <p className="text-sm text-foreground/80 mb-3">{session.summary}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {session.durationMinutes} mins
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> ${Math.round((student?.hourlyRate || 0) * (session.durationMinutes / 60))} earned
                        </span>
                      </div>
                      <button
                        onClick={() => setNotifySession(session)}
                        data-testid={`button-notify-${session.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                      >
                        <Send className="h-3 w-3" /> Notify
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={!!notifySession} onOpenChange={(open) => !open && setNotifySession(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl mx-4">
          <DialogHeader>
            <DialogTitle>Notify Parents</DialogTitle>
            <DialogDescription>
              Send class details to parent(s).
            </DialogDescription>
          </DialogHeader>
          {notifySession && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-3 my-2 border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground border-b pb-2">
                <Mail className="h-3 w-3" />
                To: {getNotifyStudents().map((s: any) => s.parentEmail).join(", ") || "N/A"}
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-sm">
                  Class Summary — {getNotifyStudents().map((s: any) => s.name).join(", ")}
                </p>
                <div className="text-sm text-foreground/80 space-y-1">
                  <p>Hi! Here are the details from our recent session:</p>
                  <div className="bg-background rounded-md p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">{format(new Date(notifySession.date), "EEEE, MMM d, yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{notifySession.durationMinutes} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className={cn("font-medium", notifySession.isPaid ? "text-green-600" : "text-amber-600")}>
                        {notifySession.isPaid ? "Paid" : "Payment Pending"}
                      </span>
                    </div>
                  </div>
                  {notifySession.summary && (
                    <p className="italic mt-2">"{notifySession.summary}"</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setNotifySession(null)} data-testid="button-cancel-notify">Cancel</Button>
            <Button onClick={handleSendNotification} className="w-full sm:w-auto" data-testid="button-send-notification">
              <Send className="w-4 h-4 mr-2" /> Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## client/src/pages/Earnings.tsx

```typescript
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign, Clock, CheckCircle2, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const AVATAR_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-red-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Earnings() {
  const { data: stats, isLoading: statsLoading } = useQuery<{ totalStudents: number; classesThisWeek: number; revenueThisMonth: number; unpaidCount: number }>({
    queryKey: ["/api/stats"],
  });

  const { data: classes, isLoading: classesLoading } = useQuery<any[]>({
    queryKey: ["/api/classes"],
  });

  const { data: students, isLoading: studentsLoading } = useQuery<any[]>({
    queryKey: ["/api/students"],
  });

  const isLoading = statsLoading || classesLoading || studentsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
      </div>
    );
  }

  const revenueThisMonth = stats?.revenueThisMonth ?? 0;
  const unpaidCount = stats?.unpaidCount ?? 0;
  const allClasses = classes || [];
  const allStudents = students || [];

  const paidClasses = allClasses.filter(c => c.isPaid);
  const unpaidClasses = allClasses.filter(c => !c.isPaid);

  const totalEarned = allClasses.reduce((sum: number, c: any) => {
    let sessionTotal = 0;
    for (const sid of c.studentIds) {
      const student = allStudents.find((s: any) => s.id === sid);
      if (student) {
        sessionTotal += (student.hourlyRate * c.durationMinutes) / 60;
      }
    }
    return sum + sessionTotal;
  }, 0);

  const totalPaid = paidClasses.reduce((sum: number, c: any) => {
    let sessionTotal = 0;
    for (const sid of c.studentIds) {
      const student = allStudents.find((s: any) => s.id === sid);
      if (student) {
        sessionTotal += (student.hourlyRate * c.durationMinutes) / 60;
      }
    }
    return sum + sessionTotal;
  }, 0);

  const totalUnpaid = totalEarned - totalPaid;

  return (
    <div className="min-h-screen bg-muted/20 pb-24">
      <div className="bg-background pt-8 pb-4 px-6 border-b">
        <h1 className="text-2xl font-bold font-display">Earnings</h1>
      </div>

      <div className="p-6 space-y-6">
        <Card className="bg-primary text-primary-foreground border-none shadow-md overflow-hidden relative" data-testid="card-revenue">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>

          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full text-white backdrop-blur-sm flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> This month
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white" data-testid="text-revenue">${revenueThisMonth}</p>
              <p className="text-blue-100 text-sm">Earned this month</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-sm" data-testid="card-total-paid">
            <CardContent className="p-4">
              <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p className="text-xl font-bold text-green-600" data-testid="text-total-paid">${Math.round(totalPaid)}</p>
              <p className="text-xs text-muted-foreground">Collected</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm" data-testid="card-total-unpaid">
            <CardContent className="p-4">
              <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
                <Clock className="h-4 w-4" />
              </div>
              <p className="text-xl font-bold text-amber-600" data-testid="text-total-unpaid">${Math.round(totalUnpaid)}</p>
              <p className="text-xs text-muted-foreground">{unpaidCount} unpaid</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">All Sessions</h2>

          {allClasses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No earnings yet.</p>
              <p className="text-xs mt-1">Log your first class to start tracking.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allClasses.map((session: any) => {
                const student = allStudents.find((s: any) => s.id === session.studentIds[0]);
                const studentName = student?.name || "Unknown Student";
                const sessionEarned = student ? Math.round((student.hourlyRate * session.durationMinutes) / 60) : 0;

                return (
                  <Card key={session.id} className="border-none shadow-sm" data-testid={`card-earning-${session.id}`}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(studentName)}`}>
                        {getInitials(studentName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{studentName}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(session.date), "MMM d")} · {session.durationMinutes} min
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">${sessionEarned}</p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          session.isPaid
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {session.isPaid ? "Paid" : "Pending"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## client/src/pages/not-found.tsx

```typescript
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Configuration Files

### drizzle.config.ts

```typescript
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

### tsconfig.json

```json
{
  "include": ["client/src/**/*", "shared/**/*", "server/**/*"],
  "exclude": ["node_modules", "build", "dist", "**/*.test.ts"],
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/typescript/tsbuildinfo",
    "noEmit": true,
    "module": "ESNext",
    "strict": true,
    "lib": ["esnext", "dom", "dom.iterable"],
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "types": ["node", "vite/client"],
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}
```

### Key Dependencies (package.json)

```
react, react-dom (v19)
@tanstack/react-query (v5)
wouter (v3)
express (v5)
drizzle-orm, drizzle-zod, drizzle-kit
pg (node-postgres)
tailwindcss (v4), @tailwindcss/vite
shadcn/ui components (radix-ui based)
lucide-react (icons)
date-fns (date formatting)
zod, zod-validation-error
vite (v7)
```

---

## Setup Instructions

1. Create a new project with React + Vite + Express + PostgreSQL
2. Install dependencies from the package.json list above
3. Set up shadcn/ui components (card, button, input, label, dialog, slider, switch, checkbox, textarea, toast, tooltip, select, separator, tabs, scroll-area)
4. Create the database schema using `shared/schema.ts`
5. Run `npm run db:push` to create database tables
6. Copy all source files into their respective locations
7. Start with `npm run dev`
