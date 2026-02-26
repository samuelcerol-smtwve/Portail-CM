// ─── VERCEL SERVERLESS PROXY POUR AIRTABLE ───
// Les secrets restent côté serveur (pas de préfixe VITE_)

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

const ALLOWED_TABLES = ["Clients", "Posts", "Factures", "Strategie"];

export default async function handler(req, res) {
  // ─── CORS (utile pour le dev local) ───
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ─── VALIDATION ───
  if (!API_KEY || !BASE_ID) {
    return res.status(500).json({ error: "Airtable credentials not configured on server" });
  }

  const { table, recordId } = req.query;

  if (!table || !ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ error: `Invalid table. Allowed: ${ALLOWED_TABLES.join(", ")}` });
  }

  // ─── CONSTRUIRE L'URL AIRTABLE ───
  let url = `${BASE_URL}/${encodeURIComponent(table)}`;
  if (recordId) url += `/${recordId}`;

  // Transférer les query params (sauf table/recordId) vers Airtable
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== "table" && key !== "recordId") {
      params.append(key, value);
    }
  }
  const qs = params.toString();
  if (qs) url += `?${qs}`;

  // ─── PROXY LA REQUÊTE ───
  try {
    const options = {
      method: req.method,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    };

    if (req.method === "POST" || req.method === "PATCH") {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(502).json({ error: "Failed to reach Airtable", details: error.message });
  }
}
