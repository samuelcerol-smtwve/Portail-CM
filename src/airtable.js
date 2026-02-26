// ─── SERVICE AIRTABLE ───
const API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY;
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// ─── COULEURS PAR DÉFAUT ───
const COLORS = ["#A78BFA", "#8B6EC0", "#4A9E62", "#C8A06A", "#5B8EC4", "#D4886B"];

// ─── HELPER ───
async function fetchAll(table, params = "") {
  let records = [];
  let offset = null;
  do {
    const url = `${BASE_URL}/${encodeURIComponent(table)}?${params}${offset ? `&offset=${offset}` : ""}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
    const data = await res.json();
    records = [...records, ...data.records];
    offset = data.offset;
  } while (offset);
  return records;
}

// ─── CLIENTS ───
export async function getClients() {
  const records = await fetchAll("Clients");
  return records.map((r, i) => ({
    id: r.id,
    airtableId: r.id,
    name: r.fields["Name"] || "Sans nom",
    email: r.fields["Email"] || "",
    color: r.fields["Couleur"] || COLORS[i % COLORS.length],
    initials: (r.fields["Name"] || "??").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
    loginPortail: r.fields["Login portail"] || "",
    motDePasse: r.fields["Mot de passe"] || "",
    reseaux: r.fields["Réseaux actifs"] || [],
  }));
}

export async function createClient(data) {
  const res = await fetch(`${BASE_URL}/Clients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fields: {
        Name: data.name,
        Email: data.email,
        Couleur: data.color,
        "Login portail": data.loginPortail,
        "Mot de passe": data.motDePasse,
        "Réseaux actifs": data.reseaux,
      },
    }),
  });
  if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
  return res.json();
}

// ─── POSTS ───
export async function getPosts() {
  const records = await fetchAll("Posts", "sort[0][field]=Date%20publication&sort[0][direction]=asc");
  return records.map(r => ({
    id: r.id,
    airtableId: r.id,
    clientId: r.fields["Client"]?.[0] || null,
    network: (r.fields["Réseau"] || "instagram").toLowerCase(),
    status: mapStatus(r.fields["Statut"]),
    day: r.fields["Date publication"] ? new Date(r.fields["Date publication"]).getDate() : 0,
    date: r.fields["Date publication"] || null,
    caption: r.fields["Caption"] || "",
    img: r.fields["Visuel URL"] || "",
    hours: r.fields["Heures attente"] || 0,
    comments: r.fields["Commentaire client"]
      ? [{ author: "client", text: r.fields["Commentaire client"], date: "récemment" }]
      : [],
  }));
}

export async function updatePostStatus(airtableId, status, comment = "") {
  const fields = { Statut: mapStatusToAirtable(status) };
  if (comment) fields["Commentaire client"] = comment;
  const res = await fetch(`${BASE_URL}/Posts/${airtableId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
  return res.json();
}

export async function createPost(data) {
  const res = await fetch(`${BASE_URL}/Posts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fields: {
        Caption: data.caption,
        Client: [data.clientId],
        Réseau: capitalize(data.network),
        "Date publication": data.date,
        Statut: mapStatusToAirtable(data.status || "draft"),
        "Visuel URL": data.img || "",
        "Heures attente": data.hours || 0,
      },
    }),
  });
  if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
  return res.json();
}

// ─── FACTURES ───
export async function getFactures(clientAirtableId = null) {
  const filter = clientAirtableId
    ? `filterByFormula=FIND("${clientAirtableId}",ARRAYJOIN({Client}))`
    : "";
  const records = await fetchAll("Factures", filter);
  return records.map(r => ({
    id: r.fields["Numéro"] || r.id,
    airtableId: r.id,
    clientId: r.fields["Client"]?.[0] || null,
    date: r.fields["Date émission"] || "",
    period: r.fields["Période"] || "",
    amount: r.fields["Montant"] || 0,
    status: mapInvStatus(r.fields["Statut"]),
    paidDate: r.fields["Date paiement"] || null,
    description: r.fields["Description"] || "",
  }));
}

// ─── STRATEGIE ───
export async function getStrategies() {
  const records = await fetchAll("Strategie");
  return records.map(r => ({
    airtableId: r.id,
    clientId: r.fields["Client"]?.[0] || null,
    period: r.fields["Période"] || "",
    objective: r.fields["Objectif"] || "",
    audiences: r.fields["Audiences"] ? r.fields["Audiences"].split("\n").filter(Boolean) : [],
    pillars: r.fields["Piliers"] ? JSON.parse(r.fields["Piliers"]) : [],
    rhythm: r.fields["Rythme"] ? JSON.parse(r.fields["Rythme"]) : [],
    kpis: r.fields["KPIs"] ? r.fields["KPIs"].split("\n").filter(Boolean) : [],
    notes: r.fields["Notes"] || "",
    lastUpdate: r.fields["Dernière MAJ"] || "",
  }));
}

// ─── MAPPERS ───
function mapStatus(airtableStatus) {
  const map = {
    "Brouillon": "draft",
    "En attente": "pending",
    "Validé": "approved",
    "Modif demandée": "revision",
    "En retard": "late",
    "Publié": "published",
  };
  return map[airtableStatus] || "draft";
}

function mapStatusToAirtable(status) {
  const map = {
    draft: "Brouillon",
    pending: "En attente",
    approved: "Validé",
    revision: "Modif demandée",
    late: "En retard",
    published: "Publié",
  };
  return map[status] || "Brouillon";
}

function mapInvStatus(s) {
  const map = { "Payée": "paid", "En attente": "pending", "En retard": "overdue" };
  return map[s] || "pending";
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
