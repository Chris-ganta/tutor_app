import type { Express } from "express";
import passport from "passport";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStudentSchema, insertClassSessionSchema } from "../shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";

export async function registerRoutes(
    httpServer: Server,
    app: Express
): Promise<Server> {

    setupAuth(app);

    app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

    app.get(
        "/auth/google/callback",
        passport.authenticate("google", { failureRedirect: "/login" }),
        (_req, res) => {
            res.redirect("/");
        }
    );

    app.post("/api/logout", (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            res.status(200).json({ message: "Logged out successfully" });
        });
    });

    app.get("/api/user", (req, res) => {
        if (req.isAuthenticated()) {
            res.json(req.user);
        } else {
            res.status(401).json({ message: "Not authenticated" });
        }
    });

    // Middleware to check authentication for all subsequent /api routes
    app.use("/api", (req, res, next) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Not authenticated" });
        }
        next();
    });

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
        try {
            const updateData = { ...req.body };
            // Convert date string to Date object if present
            if (updateData.date) {
                console.log("Received date:", updateData.date, "Type:", typeof updateData.date);
                updateData.date = new Date(updateData.date);
                console.log("Converted date:", updateData.date, "Type:", typeof updateData.date);
            }
            console.log("Update data:", JSON.stringify(updateData, null, 2));
            const session = await storage.updateClassSession(req.params.id, updateData);
            if (!session) return res.status(404).json({ message: "Class session not found" });
            res.json(session);
        } catch (error: any) {
            console.error("Error updating class session:", error);
            return res.status(500).json({ message: error.message || "Internal server error" });
        }
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

    // Force JSON content-type for API routes to clarify response type
    app.use("/api", (_req, res, next) => {
        res.setHeader("Content-Type", "application/json");
        next();
    });

    return httpServer;
}
