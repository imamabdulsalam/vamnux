import type { Express, Request, Response } from "express";
import { getLocalStorageDirectory } from "../storage";

function sendLocalMedia(req: Request, res: Response) {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (key.includes("..")) {
      res.status(400).send("Invalid storage key");
      return;
    }
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.sendFile(key, { root: getLocalStorageDirectory(), dotfiles: "deny" }, (error) => {
      if (!error || res.headersSent) return;
      const statusCode = (error as NodeJS.ErrnoException).code === "ENOENT" ? 404 : 500;
      res.status(statusCode).send(statusCode === 404 ? "Media not found" : "Media service error");
    });
}

/** Serves Namecheap-local media and retains a local-only legacy alias for existing database image paths. */
export function registerLocalStorageRoutes(app: Express) {
  app.get("/media/*", sendLocalMedia);
  app.get("/manus-storage/*", sendLocalMedia);
}
