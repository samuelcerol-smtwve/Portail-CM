// ─── PROXY AIRTABLE — Vercel Serverless Function ───
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-airtable-key, x-airtable-base");

  if (req.method === "OPTIONS") return res.status(200).end();

  const API_KEY = req.headers["x-airtable-key"] || process.env.AIRTABLE_API_KEY;
  const BASE_ID = req.headers["x-airtable-base"] || process.env.AIRTABLE_BASE_ID;

  if (!API_KEY || !BASE_ID) {
    return res.status(400).json({ error: "Credentials Airtable manquants" });
  }

  const table = req.query.table;
  const recordId = req.query.recordId;

  if (!table) return res.status(400).json({ error: "Table manquante" });

  const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}`;
  const authHeader = { Authorization: `Bearer ${API_KEY}` };

  try {
    if (req.method === "GET") {
      const queryParams = Object.entries(req.query)
        .filter(([k]) => k !== "table" && k !== "recordId")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
      const url = queryParams ? `${BASE_URL}?${queryParams}` : BASE_URL;
      const r = await fetch(url, { headers: authHeader });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.error });
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const r = await fetch(BASE_URL, {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.error });
      return res.status(200).json(data);
    }

    if (req.method === "PATCH") {
      if (!recordId) return res.status(400).json({ error: "recordId manquant" });
      const r = await fetch(`${BASE_URL}/${recordId}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.error });
      return res.status(200).json(data);
    }

    if (req.method === "DELETE") {
      if (!recordId) return res.status(400).json({ error: "recordId manquant" });
      const r = await fetch(`${BASE_URL}/${recordId}`, {
        method: "DELETE",
        headers: authHeader,
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.error });
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: "Méthode non supportée" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
