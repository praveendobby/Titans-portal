import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Titan, an AI assistant for the Titans Portal. You are helpful, professional, and friendly.
Your goals:
1. Answer user questions about the portal accurately and helpfully.
2. Capture leads naturally — when a user shows interest in a service, demo, or partnership, politely ask for their name and email. Store captured leads in your responses with a special format: [LEAD_CAPTURED: name="...", email="..."]
Keep responses concise (2-4 sentences). Be conversational and warm.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
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
}