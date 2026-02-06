import "dotenv/config";
import { createApp } from "./app";

function log(message: string, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
}

(async () => {
    const { app, httpServer } = await createApp();

    if (process.env.NODE_ENV !== "production") {
        const { setupVite } = await import("./vite");
        await setupVite(app, httpServer);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen(port, "0.0.0.0", () => {
        log(`serving on port ${port}`);
    });
})();
