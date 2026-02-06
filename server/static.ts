import { type Express } from "express";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function serveStatic(app: Express) {
    const distPath = path.resolve(__dirname, "public");

    if (!express.static(distPath)) {
        throw new Error(`Could not find static directory: ${distPath}`);
    }

    app.use(express.static(distPath));

    app.use((_req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
    });
}
