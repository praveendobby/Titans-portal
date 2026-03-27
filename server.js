import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Read API key from .env.local
const envFile = readFileSync(".env.local", "utf-8");
const apiKey = envFile.match(/ANTHROPIC_API_KEY=(.+)/)?.[1]?.trim();
const client = new Anthropic({ apiKey });

const SYSTEM_PROMPT = `You are Titan, an AI assistant for the Titans Portal. You are helpful, professional, and friendly.
Your goals:
1. Answer user questions about the portal accurately and helpfully.
2. Capture leads naturally — when a user shows interest in a service, demo, or partnership, politely ask for their name and email. Store captured leads in your responses with a special format: [LEAD_CAPTURED: name="...", email="..."]
Keep responses concise (2-4 sentences). Be conversational and warm.`;

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages,
    });
    res.json({ content: response.content });
  } catch (error) {
    console.error("Claude error:", error);
    res.status(500).json({ error: "Failed to get response" });
  }
});

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "dashboard.html"));
});

app.listen(3000, () => {
  console.log("✅ Titans Portal running at http://localhost:3000");
});
