// ─── PROXY AIRTABLE — Vercel Serverless Function ───
// Reçoit la clé API et le base ID dynamiquement depuis le header
// pour supporter plusieurs CM avec des bases Airtable différentes

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-airtable-key, x-airtable-base");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Récupère la clé API et le base ID depuis les headers (envoyés par le front)
  // Fallback sur les variables d'environnement (pour compatibilité)
  const API_KEY = req.headers["x-airtable-key"] || process.env.AIRTABLE_API_KEY;
  const BASE_ID = req.headers["x-airtable-base"] || process.env.AIRTABLE_BASE_ID;

  if (!API_KEY || !BASE_ID) {
    return res.status(400).json({ error: "Credentials Airtable manquants" });
  }

  const { table, recordId } = req.query;
  if (!table) return res.status(400).json({ error: "Table manquante" });

  const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}`;

  try {
    // GET — liste ou pagination
    if (req.method === "GET") {
      const params = new URLSearchParams();
      Object.entries(req.query).forEach(([k, v]) => {
        if (k !== "table" && k !== "recordId") params.append(k, v);
      });
      const url = `${BASE_URL}${params.toString() ? "?" + params.toString() : ""}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.error });
      return res.json(data);
    }

    // POST — créer
    if (req.method === "POST") {
      const r = await fetch(BASE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.error });
      return res.json(data);
    }

    // PATCH — modifier
    if (req.method === "PATCH") {
      if (!recordId) return res.status(400).json({ error: "recordId manquant" });
      const r = await fetch(`${BASE_URL}/${recordId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.error });
      return res.json(data);
    }

    // DELETE
    if (req.method === "DELETE") {
      if (!recordId) return res.status(400).json({ error: "recordId manquant" });
      const r = await fetch(`${BASE_URL}/${recordId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.error });
      return res.json(data);
    }

    return res.status(405).json({ error: "Méthode non supportée" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
