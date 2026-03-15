/**
 * /api/assistant.js
 * Vercel Serverless Function
 * Proxy sécurisé pour l'Assistante IA CM
 * La clé Anthropic reste côté serveur, jamais exposée au client.
 */

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { messages, systemPrompt } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages manquants" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Clé API Anthropic non configurée sur le serveur" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt || "Tu es une assistante expert Community Management. Réponds en français.",
        messages: messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Claude API error:", err);
      return res.status(response.status).json({ error: "Erreur Claude API", details: err });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    return res.status(200).json({ text });

  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
}
