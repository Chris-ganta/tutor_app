import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes.js";
import { serveStatic } from "./static.js";
import { getPool } from "./storage.js";

export async function createApp() {
    const app = express();
    const httpServer = createServer(app);

    app.set("trust proxy", 1);

    app.get("/api/health", (_req, res) => {
        res.json({ status: "ok", time: new Date().toISOString() });
    });

    app.get("/api/db-check", async (_req, res) => {
        try {
            const result = await getPool().query("SELECT NOW()");
            res.json({ status: "connected", time: result.rows[0].now });
        } catch (err: any) {
            res.status(500).json({ status: "error", message: err.message });
        }
    });

    app.use(express.json({
        verify: (req: any, _res, buf) => {
            req.rawBody = buf;
        },
    }));
    app.use(express.urlencoded({ extended: false }));

    // Custom logging middleware
    app.use((req, res, next) => {
        const start = Date.now();
        const path = req.path;
        let capturedJsonResponse: any;

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
                if (logLine.length > 80) {
                    logLine = logLine.slice(0, 79) + "…";
                }
                console.log(logLine);
            }
        });

        next();
    });

    await registerRoutes(httpServer, app);

    // Global error handler
    app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        console.error("Internal Server Error:", err);
        if (res.headersSent) {
            return next(err);
        }
        res.status(status).json({ message });
    });

    if (process.env.NODE_ENV === "production" && process.env.VERCEL !== "1") {
        serveStatic(app);
    }

    return { app, httpServer };
}
