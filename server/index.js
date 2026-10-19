import express from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { openDb, seed } from "./db.js";
import { createApp } from "./app.js";
const db = openDb();
if (process.env.SEED_DEMO !== "false") seed(db);
const app = createApp(db);
if (existsSync("dist/index.html")) {
  app.use(express.static(resolve("dist")));
  app.get("/{*path}", (req, res) => res.sendFile(resolve("dist/index.html")));
}
const port = Number(process.env.PORT || 3001);
app.listen(port, "0.0.0.0", () =>
  console.log(`Kömek server listening on ${port}`),
);
