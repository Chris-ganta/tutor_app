import type { Express } from "express";
import passport from "passport";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertStudentSchema, insertClassSessionSchema } from "./schema.js";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth.js";

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

    app.get("/api/students", async (req: any, res) => {
        const students = await storage.getStudents(req.user.id);
        res.json(students);
    });

    app.get("/api/students/:id", async (req: any, res) => {
        const student = await storage.getStudent(req.params.id, req.user.id);
        if (!student) return res.status(404).json({ message: "Student not found" });
        res.json(student);
    });

    app.post("/api/students", async (req: any, res) => {
        try {
            const data = insertStudentSchema.parse(req.body);
            const student = await storage.createStudent({ ...data, userId: req.user.id });
            res.status(201).json(student);
        } catch (e) {
            if (e instanceof ZodError) {
                return res.status(400).json({ message: fromZodError(e).message });
            }
            throw e;
        }
    });

    app.patch("/api/students/:id", async (req: any, res) => {
        const student = await storage.updateStudent(req.params.id, req.user.id, req.body);
        if (!student) return res.status(404).json({ message: "Student not found" });
        res.json(student);
    });

    app.delete("/api/students/:id", async (req: any, res) => {
        const success = await storage.deleteStudent(req.params.id, req.user.id);
        if (!success) return res.status(404).json({ message: "Student not found" });
        res.status(204).send();
    });

    // --- Class Sessions ---

    app.get("/api/classes", async (req: any, res) => {
        const sessions = await storage.getClassSessions(req.user.id);
        res.json(sessions);
    });

    app.get("/api/classes/:id", async (req: any, res) => {
        const session = await storage.getClassSession(req.params.id, req.user.id);
        if (!session) return res.status(404).json({ message: "Class session not found" });
        res.json(session);
    });

    app.get("/api/classes/student/:studentId", async (req: any, res) => {
        const sessions = await storage.getClassSessionsByStudent(req.params.studentId, req.user.id);
        res.json(sessions);
    });

    app.post("/api/classes", async (req: any, res) => {
        try {
            const data = insertClassSessionSchema.parse(req.body);
            const session = await storage.createClassSession({ ...data, userId: req.user.id });
            res.status(201).json(session);
        } catch (e) {
            if (e instanceof ZodError) {
                return res.status(400).json({ message: fromZodError(e).message });
            }
            throw e;
        }
    });

    app.patch("/api/classes/:id", async (req: any, res) => {
        try {
            const updateData = { ...req.body };
            // Convert date string to Date object if present
            if (updateData.date) {
                console.log("Received date:", updateData.date, "Type:", typeof updateData.date);
                updateData.date = new Date(updateData.date);
                console.log("Converted date:", updateData.date, "Type:", typeof updateData.date);
            }
            console.log("Update data:", JSON.stringify(updateData, null, 2));
            const session = await storage.updateClassSession(req.params.id, req.user.id, updateData);
            if (!session) return res.status(404).json({ message: "Class session not found" });
            res.json(session);
        } catch (error: any) {
            console.error("Error updating class session:", error);
            return res.status(500).json({ message: error.message || "Internal server error" });
        }
    });

    // --- Dashboard stats ---

    app.get("/api/stats", async (req: any, res) => {
        const students = await storage.getStudents(req.user.id);
        const classes = await storage.getClassSessions(req.user.id);

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

    // --- Email Notifications ---

    app.post("/api/notify/class-summary", async (req: any, res) => {
        try {
            const { studentIds, date, durationMinutes, summary } = req.body;
            if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
                return res.status(400).json({ message: "studentIds required" });
            }
            const allStudents = await storage.getStudents(req.user.id);
            const targetStudents = allStudents.filter(s => studentIds.includes(s.id));
            if (targetStudents.length === 0) {
                return res.status(404).json({ message: "No matching students found" });
            }
            const { sendClassSummary } = await import("./email.js");
            const results = await Promise.all(
                targetStudents.map(student =>
                    sendClassSummary(
                        student.parentEmail,
                        student.parentName,
                        student.name,
                        req.user.name,
                        date || new Date().toLocaleDateString(),
                        durationMinutes || 60,
                        summary || ""
                    )
                )
            );
            const failed = results.filter(r => !r.success);
            if (failed.length > 0) {
                return res.status(207).json({
                    message: `${results.length - failed.length}/${results.length} emails sent`,
                    errors: failed.map(f => f.error),
                });
            }
            res.json({ message: `${results.length} email(s) sent successfully` });
        } catch (error: any) {
            console.error("Error sending class summary:", error);
            res.status(500).json({ message: error.message || "Failed to send notifications" });
        }
    });

    app.post("/api/notify/payment-reminder", async (req: any, res) => {
        try {
            const { studentId } = req.body;
            if (!studentId) return res.status(400).json({ message: "studentId required" });
            const student = await storage.getStudent(studentId, req.user.id);
            if (!student) return res.status(404).json({ message: "Student not found" });
            const classes = await storage.getClassSessionsByStudent(studentId, req.user.id);
            const unpaidSessions = classes.filter(c => !c.isPaid);
            let amountDue = 0;
            for (const c of unpaidSessions) {
                amountDue += (student.hourlyRate * c.durationMinutes) / 60;
            }
            const { sendPaymentReminder } = await import("./email.js");
            const result = await sendPaymentReminder(
                student.parentEmail,
                student.parentName,
                student.name,
                req.user.name,
                Math.round(amountDue),
                unpaidSessions.length
            );
            if (!result.success) {
                return res.status(500).json({ message: result.error });
            }
            res.json({ message: "Payment reminder sent", amountDue: Math.round(amountDue), unpaidSessions: unpaidSessions.length });
        } catch (error: any) {
            console.error("Error sending payment reminder:", error);
            res.status(500).json({ message: error.message || "Failed to send reminder" });
        }
    });

    app.post("/api/notify/custom", async (req: any, res) => {
        try {
            const { studentId, subject, message } = req.body;
            if (!studentId || !subject || !message) {
                return res.status(400).json({ message: "studentId, subject, and message required" });
            }
            const student = await storage.getStudent(studentId, req.user.id);
            if (!student) return res.status(404).json({ message: "Student not found" });
            const { sendCustomNotification } = await import("./email.js");
            const result = await sendCustomNotification(
                student.parentEmail,
                student.parentName,
                student.name,
                req.user.name,
                subject,
                message
            );
            if (!result.success) {
                return res.status(500).json({ message: result.error });
            }
            res.json({ message: "Custom notification sent" });
        } catch (error: any) {
            console.error("Error sending custom notification:", error);
            res.status(500).json({ message: error.message || "Failed to send notification" });
        }
    });

    // Force JSON content-type for API routes to clarify response type
    app.use("/api", (_req, res, next) => {
        res.setHeader("Content-Type", "application/json");
        next();
    });

    return httpServer;
}
