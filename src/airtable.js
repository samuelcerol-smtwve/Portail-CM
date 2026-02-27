// ─── SERVICE AIRTABLE (via proxy /api/airtable) ───
// La clé API reste côté serveur — le client ne voit jamais le token

const PROXY = "/api/airtable";

// ─── COULEURS PAR DÉFAUT ───
const COLORS = ["#A78BFA", "#8B6EC0", "#4A9E62", "#C8A06A", "#5B8EC4", "#D4886B"];

// ─── HELPER ───
async function fetchAll(table, params = "") {
  let records = [];
  let offset = null;
  do {
    const sep = params ? "&" : "";
    const offsetParam = offset ? `${sep}offset=${offset}` : "";
    const url = `${PROXY}?table=${encodeURIComponent(table)}&${params}${offsetParam}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = typeof err.error === "string" ? err.error : err.error?.message || `Proxy error: ${res.status}`;
      throw new Error(msg);
    }
    const data = await res.json();
    records = [...records, ...data.records];
    offset = data.offset;
  } while (offset);
  return records;
}

async function proxyPost(table, body) {
  const res = await fetch(`${PROXY}?table=${encodeURIComponent(table)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = typeof err.error === "string" ? err.error : err.error?.message || `Proxy error: ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

async function proxyPatch(table, recordId, body) {
  const res = await fetch(`${PROXY}?table=${encodeURIComponent(table)}&recordId=${recordId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = typeof err.error === "string" ? err.error : err.error?.message || `Proxy error: ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
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
  return proxyPost("Clients", {
    fields: {
      Name: data.name,
      Email: data.email,
      Couleur: data.color,
      "Login portail": data.loginPortail,
      "Mot de passe": data.motDePasse,
      "Réseaux actifs": data.reseaux,
    },
  });
}

// ─── POSTS ───
export async function getPosts() {
  const records = await fetchAll("Posts", "sort[0][field]=Date%20de%20publication&sort[0][direction]=asc");
  return records.map(r => ({
    id: r.id,
    airtableId: r.id,
    clientId: r.fields["Client"]?.[0] || null,
    network: (r.fields["Réseau"] || "instagram").toLowerCase(),
    status: mapStatus(r.fields["Statut"]),
    day: r.fields["Date de publication"] ? new Date(r.fields["Date de publication"]).getDate() : 0,
    date: r.fields["Date de publication"] || null,
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
  return proxyPatch("Posts", airtableId, { fields });
}

export async function createPost(data) {
  return proxyPost("Posts", {
    fields: {
      Caption: data.caption,
      Client: [data.clientId],
      Réseau: capitalize(data.network),
      "Date de publication": data.date,
      Statut: mapStatusToAirtable(data.status || "draft"),
      "Visuel URL": data.img || "",
      "Heures attente": data.hours || 0,
    },
  });
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
