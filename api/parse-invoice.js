/**
 * /api/parse-invoice.js
 * Vercel Serverless Function
 * 
 * Reçoit un PDF en base64, l'envoie à Claude API,
 * retourne les données extraites de la facture.
 */

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { pdfBase64, fileName } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: "Aucun fichier PDF fourni" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Clé API Anthropic manquante" });
    }

    // Appel Claude API avec le PDF en document
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: `Tu es un assistant spécialisé dans l'extraction de données de factures.
Tu dois analyser le PDF fourni et extraire les informations clés.
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans explication.
Si une information est absente, utilise null.`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                type: "text",
                text: `Extrais les informations suivantes de cette facture et retourne-les en JSON :
{
  "numero": "numéro de facture (ex: F-2026-001)",
  "date": "date d'émission au format YYYY-MM-DD",
  "dateEcheance": "date d'échéance au format YYYY-MM-DD ou null",
  "montantHT": nombre en euros sans symbole,
  "montantTVA": nombre en euros sans symbole ou null,
  "montantTTC": nombre total en euros sans symbole,
  "clientNom": "nom du client destinataire",
  "clientEmail": "email du client ou null",
  "description": "description courte de la prestation (max 80 caractères)",
  "statut": "paid" si mention de paiement reçu, sinon "pending"
}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Claude API error:", err);
      return res.status(500).json({ error: "Erreur Claude API", details: err });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || "";

    // Nettoyer et parser le JSON
    let parsed;
    try {
      // Supprimer les éventuels backticks markdown
      const clean = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw:", rawText);
      return res.status(422).json({
        error: "Impossible d'extraire les données",
        raw: rawText,
      });
    }

    return res.status(200).json({
      success: true,
      invoice: parsed,
      fileName: fileName || "facture.pdf",
    });

  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
}
