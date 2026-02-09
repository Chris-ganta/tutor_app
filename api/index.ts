import { createApp } from "./app.js";

let appInstance: any = null;

export default async (req: any, res: any) => {
    try {
        if (!appInstance) {
            console.log("App: Initializing...");
            const result = await createApp();
            appInstance = result.app;
            console.log("App: Initialized successfully.");
        }
        return appInstance(req, res);
    } catch (err: any) {
        console.error("Vercel Function Error:", err);
        return res.status(500).json({
            status: "error",
            message: err.message,
            stack: err.stack,
            time: new Date().toISOString()
        });
    }
};
