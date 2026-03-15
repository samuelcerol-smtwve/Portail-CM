import { useState, useEffect, useMemo, useRef } from "react";
import { getClients, getPosts, getFactures, getStrategies, updatePostStatus, createClient, createPost, deleteClient, deletePost, setAirtableCredentials, clearAirtableCredentials } from "./airtable.js";
import { signIn, signOut, getSession, supabase, getCMCredentials } from "./supabase.js";

// ─── RDV DATA ───
const RDV_TYPES = {
  call: { label: "Appel", icon: "📞", color: "#2A8FA8" },
  visio: { label: "Visio", icon: "🎥", color: "#1E6E84" },
  meeting: { label: "Rendez-vous", icon: "🤝", color: "#C8A06A" },
  review: { label: "Bilan mensuel", icon: "📊", color: "#4A9E62" },
  brief: { label: "Brief", icon: "📋", color: "#D4886B" },
};

const INITIAL_RDVS = [
  { id: 1, clientId: 1, type: "review", title: "Bilan mensuel Maison Soleil", date: "2026-03-18", time: "10:00", duration: "1h", location: "Visio", notes: "Revoir stratégie outdoor pour avril" },
  { id: 2, clientId: 3, type: "brief", title: "Brief lancement abonnements Flora", date: "2026-03-20", time: "14:30", duration: "45min", location: "Visio", notes: "" },
  { id: 3, clientId: 2, type: "call", title: "Point soirée jazz Café Indigo", date: "2026-03-22", time: "11:00", duration: "30min", location: "Téléphone", notes: "" },
  { id: 4, clientId: 4, type: "visio", title: "Présentation stratégie e-com Brume", date: "2026-03-25", time: "16:00", duration: "1h30", location: "Teams", notes: "" },
];


async function uploadImage(file) {
  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage
    .from("post-images")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage
    .from("post-images")
    .getPublicUrl(data.path);
  return publicUrl;
}

// ─── PALETTE (PBC Studio — rose/violet, clean white) ───
const C = {
  bg: "#FFFFFF",
  bgLight: "#FDF5F8",
  card: "#FFFFFF",
  cardHover: "#FFF8FA",
  text: "#1A1020",
  textSoft: "#4A3550",
  muted: "#A090A8",
  border: "#F0E0EA",
  borderLight: "#E8D0E0",
  accent: "#E0387A",
  accentSoft: "#E0387A14",
  accentGlow: "#E0387A35",
  gold: "#C8A06A",
  goldSoft: "#C8A06A12",
  green: "#4A9E62",
  greenSoft: "#4A9E6212",
  orange: "#E07838",
  orangeSoft: "#E0783812",
  red: "#D45B5B",
  redSoft: "#D45B5B12",
  purple: "#7C3AED",
  purpleSoft: "#7C3AED12",
  blue: "#5B8EC4",
  blueSoft: "#5B8EC412",
  cream: "#FDF0F5",
  lavender: "#F02D7D",
  lavenderSoft: "#F02D7D14",
  sidebarBg: "#1A0A1E",
  sidebarAccent: "#F472B6",
  sidebarMuted: "#C4A0C8",
  sidebarActive: "rgba(240,45,125,0.2)",
};

const CLIENTS = [
  { id: 1, name: "Maison Soleil", initials: "MS", color: C.accent },
  { id: 2, name: "Café Indigo", initials: "CI", color: C.purple },
  { id: 3, name: "Flora & Co", initials: "FC", color: C.green },
  { id: 4, name: "Atelier Brume", initials: "AB", color: C.gold },
];

const STATUSES = {
  draft: { label: "Brouillon", color: C.muted, bg: "#3D365A44" },
  pending_text: { label: "Validation texte", color: "#F59E0B", bg: "#F59E0B14" },
  pending_visual: { label: "Validation visuel", color: "#8B5CF6", bg: "#8B5CF614" },
  pending: { label: "En attente", color: C.gold, bg: C.goldSoft },
  revision: { label: "Modif demandée", color: C.orange, bg: C.orangeSoft },
  approved: { label: "Validé ✓", color: C.green, bg: C.greenSoft },
  late: { label: "En retard", color: C.red, bg: C.redSoft },
  published: { label: "Publié", color: C.blue, bg: C.blueSoft },
};

const CONTENT_TYPES = {
  image: { label: "Image", icon: "🖼️" },
  video: { label: "Vidéo", icon: "🎬" },
  reel: { label: "Réel", icon: "📹" },
  story: { label: "Story", icon: "📱" },
};

const NETWORKS = {
  instagram: { label: "Instagram", short: "IG", icon: "📸", color: "#E1306C" },
  facebook: { label: "Facebook", short: "FB", icon: "📘", color: "#6B8FE8" },
  linkedin: { label: "LinkedIn", short: "LI", icon: "💼", color: "#7BADE8" },
};

const DAYS_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const POSTS = [
  { id: 1, clientId: 1, network: "instagram", status: "pending", day: 3, caption: "☀️ Nouvelle collection printemps ! Découvrez nos créations solaires, pensées pour illuminer votre intérieur.\n\n#MaisonSoleil #Printemps2026 #Déco", img: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&h=400&fit=crop", hours: 52, comments: [] },
  { id: 2, clientId: 1, network: "facebook", status: "approved", day: 5, caption: "Notre pop-up store ouvre ses portes le 15 mars au Marché des Créateurs. On vous y attend ✨", img: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=400&fit=crop", hours: 0, comments: [{ author: "client", text: "Parfait, on valide ! 👍", date: "il y a 2h" }] },
  { id: 3, clientId: 1, network: "linkedin", status: "revision", day: 7, caption: "Chez Maison Soleil, chaque espace mérite une touche de lumière. Notre approche du design responsable.", img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=400&fit=crop", hours: 0, comments: [{ author: "client", text: "Remplacer 'responsable' par 'éco-conçu' svp.", date: "il y a 5h" }] },
  { id: 4, clientId: 1, network: "instagram", status: "late", day: 10, caption: "Nos coussins en lin lavé — le détail qui change tout.", img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop", hours: 96, comments: [] },
  { id: 5, clientId: 1, network: "facebook", status: "pending", day: 14, caption: "🎵 Soirée spéciale ce week-end. Ambiance feutrée, nouvelles pièces en avant-première.", img: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=400&fit=crop", hours: 24, comments: [] },
  { id: 6, clientId: 1, network: "instagram", status: "draft", day: 17, caption: "Behind the scenes — dans l'atelier, chaque pièce prend forme à la main.", img: "https://images.unsplash.com/photo-1602607715585-c1e1f6e70a9b?w=400&h=400&fit=crop", hours: 0, comments: [] },
  { id: 7, clientId: 1, network: "linkedin", status: "pending", day: 21, caption: "Notre engagement : matériaux sourcés en Europe, fabrication locale, impact mesuré.", img: "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?w=400&h=400&fit=crop", hours: 12, comments: [] },
  { id: 8, clientId: 1, network: "instagram", status: "draft", day: 24, caption: "La lumière du matin dans notre showroom — design rencontre nature.", img: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400&h=400&fit=crop", hours: 0, comments: [] },
  { id: 9, clientId: 2, network: "instagram", status: "late", day: 2, caption: "Le latte art, c'est notre rituel du matin ☕\n\n#CaféIndigo #LatteArt", img: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=400&fit=crop", hours: 96, comments: [] },
  { id: 10, clientId: 2, network: "facebook", status: "pending", day: 8, caption: "🎵 Soirée jazz ce vendredi ! Réservez votre table.", img: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=400&fit=crop", hours: 24, comments: [] },
  { id: 11, clientId: 2, network: "instagram", status: "approved", day: 12, caption: "Nouveau blend éthiopien — notes florales, acidité douce.", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop", hours: 0, comments: [{ author: "client", text: "Go ! 👌", date: "hier" }] },
  { id: 12, clientId: 2, network: "linkedin", status: "draft", day: 18, caption: "Café Indigo recrute un barista passionné.", img: "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=400&h=400&fit=crop", hours: 0, comments: [] },
  { id: 13, clientId: 3, network: "instagram", status: "pending", day: 4, caption: "🌿 Bouquets de saison. Pivoines, renoncules, eucalyptus.\n\n#FloraAndCo", img: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400&h=400&fit=crop", hours: 36, comments: [] },
  { id: 14, clientId: 3, network: "facebook", status: "approved", day: 9, caption: "Atelier bouquet ce samedi 15h — places limitées !", img: "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?w=400&h=400&fit=crop", hours: 0, comments: [{ author: "client", text: "Super !", date: "il y a 1j" }] },
  { id: 15, clientId: 3, network: "instagram", status: "pending", day: 16, caption: "Le pouvoir d'un bouquet frais sur votre bureau un lundi 🌸", img: "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=400&h=400&fit=crop", hours: 8, comments: [] },
  { id: 16, clientId: 4, network: "instagram", status: "approved", day: 1, caption: "Lumière du matin dans l'atelier... ✨ Bougies coulées à la main.\n\n#AtelierBrume", img: "https://images.unsplash.com/photo-1602607715585-c1e1f6e70a9b?w=400&h=400&fit=crop", hours: 0, comments: [{ author: "client", text: "Magnifique !", date: "il y a 3j" }] },
  { id: 17, clientId: 4, network: "facebook", status: "pending", day: 6, caption: "Coffret découverte — 3 bougies, 3 ambiances.", img: "https://images.unsplash.com/photo-1543006320-d12c97cff0db?w=400&h=400&fit=crop", hours: 40, comments: [] },
  { id: 18, clientId: 4, network: "linkedin", status: "draft", day: 20, caption: "Atelier Brume : artisanat rencontre bien-être.", img: "https://images.unsplash.com/photo-1516905041604-7935af78f572?w=400&h=400&fit=crop", hours: 0, comments: [] },
];

const STRATEGIES = {
  1: { period: "Mars — Avril 2026", objective: "Installer Maison Soleil comme référence déco éco-conçue et préparer le lancement outdoor.", audiences: ["Femmes 28-45, urbaines, design & éco-responsabilité", "Architectes d'intérieur (LinkedIn)"], pillars: [{ name: "Produit", desc: "Pièces phares + teasing outdoor", ratio: "40%" }, { name: "Coulisses", desc: "Fabrication, matériaux, artisans", ratio: "25%" }, { name: "Lifestyle", desc: "Ambiances inspirantes", ratio: "20%" }, { name: "Engagement", desc: "RSE, sourcing local", ratio: "15%" }], rhythm: [{ net: "Instagram", freq: "3x/sem", type: "1 Reel + 1 carrousel + 1 photo" }, { net: "Facebook", freq: "2x/sem", type: "1 événement + 1 partage" }, { net: "LinkedIn", freq: "1x/sem", type: "1 post corporate" }], kpis: ["Reach IG +15%", "Engagement > 3.5%", "5 leads architectes"], notes: "Ajustable selon retours pop-up store (15 mars).", lastUpdate: "28 fév 2026" },
  2: { period: "Mars — Avril 2026", objective: "Renforcer la communauté locale et booster les réservations soirées + brunchs.", audiences: ["Habitants du quartier 25-40 ans", "Amateurs café de spécialité"], pillars: [{ name: "Produit", desc: "Blends, recettes signature", ratio: "35%" }, { name: "Événements", desc: "Jazz, ateliers, brunchs", ratio: "30%" }, { name: "Ambiance", desc: "Mises en scène du lieu", ratio: "25%" }, { name: "Recrutement", desc: "Nouvelle adresse", ratio: "10%" }], rhythm: [{ net: "Instagram", freq: "4x/sem", type: "2 Reels + 1 story + 1 photo" }, { net: "Facebook", freq: "2x/sem", type: "1 événement + 1 partage" }, { net: "LinkedIn", freq: "2x/mois", type: "Recrutement" }], kpis: ["30 réservations jazz/sem", "+200 followers/mois", "Stories > 8%"], notes: "Focus événementiel en mars.", lastUpdate: "25 fév 2026" },
  3: { period: "Mars — Avril 2026", objective: "Lancer les abonnements bouquets hebdomadaires et développer la notoriété.", audiences: ["Femmes 25-50, CSP+", "Entreprises B2B"], pillars: [{ name: "Produit", desc: "Bouquets, abonnements", ratio: "40%" }, { name: "Ateliers", desc: "Composition florale", ratio: "25%" }, { name: "Inspiration", desc: "Tips, mises en scène", ratio: "20%" }, { name: "Corporate", desc: "Offre B2B", ratio: "15%" }], rhythm: [{ net: "Instagram", freq: "3x/sem", type: "1 Reel + 1 carrousel + 1 photo" }, { net: "Facebook", freq: "1x/sem", type: "1 événement" }, { net: "LinkedIn", freq: "1x/sem", type: "B2B + témoignages" }], kpis: ["20 abonnements lancés", "Conversion IG 2%", "3 contrats B2B"], notes: "Lancement mi-mars.", lastUpdate: "26 fév 2026" },
  4: { period: "Mars — Avril 2026", objective: "Construire l'univers Atelier Brume et préparer le lancement e-commerce.", audiences: ["Femmes 28-45, bien-être & artisanat", "Concept stores"], pillars: [{ name: "Produit", desc: "Bougies, diffuseurs, coffrets", ratio: "35%" }, { name: "Savoir-faire", desc: "Coulisses atelier", ratio: "30%" }, { name: "Bien-être", desc: "Rituels, slow living", ratio: "25%" }, { name: "Lancement", desc: "Teasing e-commerce", ratio: "10%" }], rhythm: [{ net: "Instagram", freq: "3x/sem", type: "1 Reel + 1 carrousel + 1 ambiance" }, { net: "Facebook", freq: "1x/sem", type: "1 partage" }, { net: "LinkedIn", freq: "2x/mois", type: "Marque + revendeurs" }], kpis: ["500 inscrits e-shop", "Reels > 5%", "10 demandes revendeurs"], notes: "Teasing e-com à partir du 15 mars.", lastUpdate: "27 fév 2026" },
};

const N8N_WORKFLOWS = [
  { name: "Relance 48h", trigger: "Toutes les 6h", condition: "Attente > 48h", action: "Email client doux" },
  { name: "Relance urgente 72h", trigger: "Toutes les 6h", condition: "Attente > 72h", action: "Email urgent + notif CM" },
  { name: "Alerte J-1", trigger: "9h chaque jour", condition: "Publi demain, non validé", action: "Email + Telegram CM" },
  { name: "Notif validation", trigger: "Statut → Validé", condition: "Immédiat", action: "Telegram CM ✅" },
  { name: "Notif modif", trigger: "Statut → Modif", condition: "Immédiat", action: "Telegram CM ✏️" },
  { name: "Récap lundi", trigger: "Lundi 8h", condition: "Toujours", action: "Email récap hebdo" },
];

const AIRTABLE = [
  { table: "Clients", fields: ["Nom", "Email", "Réseaux actifs", "Couleur", "Login portail"], color: C.accent },
  { table: "Posts", fields: ["Client (lien)", "Réseau", "Date", "Caption", "Visuels", "Statut", "Commentaire client"], color: C.gold },
  { table: "Stratégie", fields: ["Client (lien)", "Période", "Objectif", "Piliers", "KPIs", "Notes"], color: C.green },
  { table: "Historique", fields: ["Post (lien)", "Action", "Auteur", "Date"], color: C.purple },
  { table: "Relances", fields: ["Post (lien)", "Type", "Date envoi", "Réponse"], color: C.blue },
];

// ─── STATS DATA ───
const STATS_DATA = {
  1: {
    overview: { followers: 4820, followersGrowth: 12.3, reach: 18400, reachGrowth: 8.5, engagement: 4.2, engagementGrowth: 0.6, impressions: 42300, clicks: 1240 },
    monthly: [
      { month: "Oct", followers: 3900, reach: 12000, engagement: 3.2 },
      { month: "Nov", followers: 4100, reach: 14200, engagement: 3.5 },
      { month: "Déc", followers: 4290, reach: 13800, engagement: 3.8 },
      { month: "Jan", followers: 4450, reach: 15600, engagement: 3.9 },
      { month: "Fév", followers: 4820, reach: 18400, engagement: 4.2 },
    ],
    topPosts: [
      { title: "Collection printemps ☀️", net: "instagram", reach: 3200, engagement: 6.8, type: "Carrousel" },
      { title: "Pop-up store annonce", net: "facebook", reach: 2800, engagement: 5.2, type: "Image" },
      { title: "Design responsable", net: "linkedin", reach: 1900, engagement: 4.1, type: "Article" },
    ],
    byNetwork: [
      { net: "instagram", followers: 3100, engagement: 4.8, posts: 12, bestDay: "Mercredi", bestHour: "18h" },
      { net: "facebook", followers: 1200, engagement: 3.1, posts: 8, bestDay: "Jeudi", bestHour: "12h" },
      { net: "linkedin", followers: 520, engagement: 3.8, posts: 4, bestDay: "Mardi", bestHour: "9h" },
    ],
    audience: { women: 72, men: 28, age: "28-35 ans", topCity: "Paris", topCountry: "France" },
  },
  2: {
    overview: { followers: 2150, followersGrowth: 18.1, reach: 9800, reachGrowth: 15.2, engagement: 5.6, engagementGrowth: 1.2, impressions: 21000, clicks: 680 },
    monthly: [
      { month: "Oct", followers: 1400, reach: 5200, engagement: 3.8 },
      { month: "Nov", followers: 1580, reach: 6400, engagement: 4.1 },
      { month: "Déc", followers: 1720, reach: 7100, engagement: 4.6 },
      { month: "Jan", followers: 1890, reach: 8200, engagement: 5.0 },
      { month: "Fév", followers: 2150, reach: 9800, engagement: 5.6 },
    ],
    topPosts: [
      { title: "Latte art ritual ☕", net: "instagram", reach: 2100, engagement: 8.2, type: "Reel" },
      { title: "Soirée jazz vendredi", net: "facebook", reach: 1600, engagement: 5.8, type: "Événement" },
      { title: "Blend éthiopien", net: "instagram", reach: 1400, engagement: 6.1, type: "Carrousel" },
    ],
    byNetwork: [
      { net: "instagram", followers: 1650, engagement: 6.2, posts: 16, bestDay: "Vendredi", bestHour: "8h" },
      { net: "facebook", followers: 420, engagement: 4.1, posts: 8, bestDay: "Jeudi", bestHour: "11h" },
      { net: "linkedin", followers: 80, engagement: 2.8, posts: 2, bestDay: "Lundi", bestHour: "9h" },
    ],
    audience: { women: 58, men: 42, age: "25-34 ans", topCity: "Lyon", topCountry: "France" },
  },
  3: {
    overview: { followers: 3400, followersGrowth: 9.8, reach: 14200, reachGrowth: 11.4, engagement: 5.1, engagementGrowth: 0.4, impressions: 31500, clicks: 920 },
    monthly: [
      { month: "Oct", followers: 2800, reach: 10200, engagement: 4.2 },
      { month: "Nov", followers: 2950, reach: 11000, engagement: 4.5 },
      { month: "Déc", followers: 3080, reach: 11800, engagement: 4.7 },
      { month: "Jan", followers: 3220, reach: 12900, engagement: 4.9 },
      { month: "Fév", followers: 3400, reach: 14200, engagement: 5.1 },
    ],
    topPosts: [
      { title: "Bouquets de saison 🌿", net: "instagram", reach: 2900, engagement: 7.4, type: "Carrousel" },
      { title: "Atelier bouquet", net: "facebook", reach: 2100, engagement: 5.6, type: "Événement" },
      { title: "Bouquet du lundi 🌸", net: "instagram", reach: 1800, engagement: 6.2, type: "Photo" },
    ],
    byNetwork: [
      { net: "instagram", followers: 2600, engagement: 5.8, posts: 12, bestDay: "Lundi", bestHour: "7h" },
      { net: "facebook", followers: 580, engagement: 3.9, posts: 4, bestDay: "Samedi", bestHour: "10h" },
      { net: "linkedin", followers: 220, engagement: 3.2, posts: 4, bestDay: "Mercredi", bestHour: "8h" },
    ],
    audience: { women: 82, men: 18, age: "30-45 ans", topCity: "Paris", topCountry: "France" },
  },
  4: {
    overview: { followers: 1890, followersGrowth: 22.5, reach: 8600, reachGrowth: 19.8, engagement: 6.3, engagementGrowth: 1.8, impressions: 18200, clicks: 540 },
    monthly: [
      { month: "Oct", followers: 1050, reach: 3800, engagement: 3.6 },
      { month: "Nov", followers: 1220, reach: 4900, engagement: 4.2 },
      { month: "Déc", followers: 1390, reach: 5800, engagement: 4.9 },
      { month: "Jan", followers: 1580, reach: 7100, engagement: 5.5 },
      { month: "Fév", followers: 1890, reach: 8600, engagement: 6.3 },
    ],
    topPosts: [
      { title: "Lumière atelier ✨", net: "instagram", reach: 1900, engagement: 9.1, type: "Reel" },
      { title: "Coffret découverte", net: "facebook", reach: 1200, engagement: 5.4, type: "Image" },
      { title: "Manifeste artisanat", net: "linkedin", reach: 800, engagement: 4.2, type: "Article" },
    ],
    byNetwork: [
      { net: "instagram", followers: 1520, engagement: 7.1, posts: 12, bestDay: "Dimanche", bestHour: "10h" },
      { net: "facebook", followers: 280, engagement: 4.3, posts: 4, bestDay: "Mercredi", bestHour: "12h" },
      { net: "linkedin", followers: 90, engagement: 3.5, posts: 2, bestDay: "Mardi", bestHour: "8h" },
    ],
    audience: { women: 78, men: 22, age: "28-40 ans", topCity: "Bordeaux", topCountry: "France" },
  },
};

// ─── INVOICES DATA ───
const INVOICES = {
  1: [
    { id: "F-2026-012", date: "2026-02-01", period: "Février 2026", amount: 850, status: "paid", paidDate: "2026-02-08", description: "Community management — Pack Premium" },
    { id: "F-2026-006", date: "2026-01-02", period: "Janvier 2026", amount: 850, status: "paid", paidDate: "2026-01-10", description: "Community management — Pack Premium" },
    { id: "F-2025-048", date: "2025-12-01", period: "Décembre 2025", amount: 850, status: "paid", paidDate: "2025-12-09", description: "Community management — Pack Premium" },
    { id: "F-2026-018", date: "2026-03-01", period: "Mars 2026", amount: 850, status: "pending", paidDate: null, description: "Community management — Pack Premium" },
  ],
  2: [
    { id: "F-2026-013", date: "2026-02-01", period: "Février 2026", amount: 620, status: "paid", paidDate: "2026-02-12", description: "Community management — Pack Essentiel" },
    { id: "F-2026-007", date: "2026-01-02", period: "Janvier 2026", amount: 620, status: "paid", paidDate: "2026-01-08", description: "Community management — Pack Essentiel" },
    { id: "F-2026-019", date: "2026-03-01", period: "Mars 2026", amount: 620, status: "pending", paidDate: null, description: "Community management — Pack Essentiel" },
    { id: "F-2026-020", date: "2026-03-05", period: "Mars 2026", amount: 180, status: "overdue", paidDate: null, description: "Prestation supplémentaire — Shooting photo" },
  ],
  3: [
    { id: "F-2026-014", date: "2026-02-01", period: "Février 2026", amount: 720, status: "paid", paidDate: "2026-02-05", description: "Community management — Pack Croissance" },
    { id: "F-2026-008", date: "2026-01-02", period: "Janvier 2026", amount: 720, status: "paid", paidDate: "2026-01-06", description: "Community management — Pack Croissance" },
    { id: "F-2026-021", date: "2026-03-01", period: "Mars 2026", amount: 720, status: "pending", paidDate: null, description: "Community management — Pack Croissance" },
  ],
  4: [
    { id: "F-2026-015", date: "2026-02-01", period: "Février 2026", amount: 550, status: "paid", paidDate: "2026-02-14", description: "Community management — Pack Starter" },
    { id: "F-2026-009", date: "2026-01-02", period: "Janvier 2026", amount: 550, status: "paid", paidDate: "2026-01-15", description: "Community management — Pack Starter" },
    { id: "F-2026-022", date: "2026-03-01", period: "Mars 2026", amount: 550, status: "pending", paidDate: null, description: "Community management — Pack Starter" },
  ],
};

const INV_STATUS = {
  paid: { label: "Payée", color: C.green, bg: C.greenSoft },
  pending: { label: "En attente", color: C.gold, bg: C.goldSoft },
  overdue: { label: "En retard", color: C.red, bg: C.redSoft },
};
function FloralCorner({ style }) {
  return (
    <svg viewBox="0 0 120 120" style={{ position: "absolute", opacity: 0.1, ...style }} fill="none">
      <path d="M10 110C10 60 60 10 110 10" stroke={C.accent} strokeWidth="2" />
      <circle cx="110" cy="10" r="6" fill={C.accent} />
      <path d="M30 110C30 70 70 30 110 30" stroke={C.lavender} strokeWidth="1.5" />
      <circle cx="50" cy="90" r="4" fill={C.lavender} />
      <path d="M60 110Q80 80 110 60" stroke={C.accent} strokeWidth="1" />
      <circle cx="85" cy="55" r="3" fill={C.accent} />
      <path d="M20 100Q40 85 60 70Q80 55 100 40" stroke={C.cream} strokeWidth="1" strokeDasharray="4 4" />
    </svg>
  );
}

// ─── UTILITY COMPONENTS ───
function Dot({ color, pulse }) {
  return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", backgroundColor: color, flexShrink: 0, animation: pulse ? "pulse 1.5s infinite" : "none" }} />;
}

function Badge({ status, small }) {
  const s = STATUSES[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: small ? "2px 8px" : "3px 10px", borderRadius: 20, fontSize: small ? 10 : 11, fontWeight: 600, color: s.color, backgroundColor: s.bg, letterSpacing: 0.3, border: `1px solid ${s.color}20` }}>
      <Dot color={s.color} pulse={status === "late"} />
      {s.label}
    </span>
  );
}

function NetIcon({ network, size = 13 }) {
  const n = NETWORKS[network];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: size, color: n.color, fontWeight: 600 }}>{n.icon} <span style={{ fontSize: size - 1 }}>{n.label}</span></span>;
}

function Avatar({ client, size = 32 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${client.color}, ${client.color}88)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, letterSpacing: 0.5, flexShrink: 0, boxShadow: `0 2px 8px ${client.color}30` }}>
      {client.initials}
    </div>
  );
}

function StatCard({ label, value, accent, sub }) {
  return (
    <div style={{ flex: 1, minWidth: 115, backgroundColor: C.card, borderRadius: 14, padding: "14px 16px", border: `1px solid ${C.border}`, transition: "all 0.2s", cursor: "default", position: "relative", overflow: "hidden" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = accent || C.border; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = C.border; }}>
      <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent || C.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ─── POST CARD ───
function EditPostForm({ post, onSave, onCancel }) {
  const [caption, setCaption] = useState(post.caption || "");
  const [date, setDate] = useState(post.date || "");
  const [status, setStatus] = useState(post.status || "pending_text");
  const [contentType, setContentType] = useState(post.contentType || "image");
  const [img, setImg] = useState(post.img || "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 5 }}>Type de contenu</label>
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(CONTENT_TYPES).map(([k, v]) => (
            <button key={k} onClick={() => setContentType(k)} style={{ flex: 1, padding: "7px 0", borderRadius: 10, border: `1.5px solid ${contentType === k ? C.accent : C.border}`, backgroundColor: contentType === k ? C.accentSoft : "transparent", color: contentType === k ? C.accent : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 5 }}>Caption</label>
        <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={4} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, backgroundColor: C.bgLight, boxSizing: "border-box", fontFamily: "inherit", resize: "vertical", outline: "none" }} />
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 5 }}>Date de publication</label>
        <input value={date} onChange={e => setDate(e.target.value)} type="date" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, backgroundColor: C.bgLight, boxSizing: "border-box", fontFamily: "inherit" }} />
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 5 }}>Statut</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["draft","pending_text","pending_visual","revision","approved"].map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{ padding: "6px 12px", borderRadius: 10, border: `1.5px solid ${status === s ? STATUSES[s].color : C.border}`, backgroundColor: status === s ? STATUSES[s].bg : "transparent", color: status === s ? STATUSES[s].color : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {STATUSES[s].label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 5 }}>URL du visuel</label>
        <input value={img} onChange={e => setImg(e.target.value)} placeholder="https://..." style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 12, color: C.text, backgroundColor: C.bgLight, boxSizing: "border-box", fontFamily: "inherit" }} />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button onClick={() => onSave({ caption, date, status, contentType, img })} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.accent}, ${C.tealDark})`, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          💾 Enregistrer
        </button>
        <button onClick={onCancel} style={{ padding: "11px 18px", borderRadius: 12, border: `1.5px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Annuler</button>
      </div>
    </div>
  );
}

function PostCard({ post, client, onApprove, onApproveVisual, onRevision, isClient, onDelete, onEdit, onAddComment }) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [imgLoaded, setImgLoaded] = useState(true);
  const canAct = isClient && ["pending", "pending_text", "pending_visual", "late"].includes(post.status);
  const typeInfo = post.contentType ? CONTENT_TYPES[post.contentType] : null;
  const isPhase1 = post.status === "pending_text";
  const isPhase2 = post.status === "pending_visual";
  const borderColor = post.status === "late" ? C.red + "50" : isPhase1 ? "#F59E0B50" : isPhase2 ? "#8B5CF650" : C.border;

  return (
    <div style={{ backgroundColor: C.card, borderRadius: 16, overflow: "hidden", border: `1.5px solid ${borderColor}`, transition: "all 0.25s", position: "relative" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,.06)"; e.currentTarget.style.transform = "translateY(-3px)"; if(onDelete) e.currentTarget.querySelector(".post-del")?.style && (e.currentTarget.querySelector(".post-del").style.opacity = "1"); }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; if(onDelete) e.currentTarget.querySelector(".post-del")?.style && (e.currentTarget.querySelector(".post-del").style.opacity = "0"); }}>
      {(isPhase1 || isPhase2) && <div style={{ height: 3, background: isPhase1 ? "linear-gradient(90deg, #F59E0B, #FBBF24)" : "linear-gradient(90deg, #8B5CF6, #A78BFA)" }} />}
      {onDelete && <button className="post-del" onClick={e => { e.stopPropagation(); onDelete(); }} style={{ position: "absolute", top: 8, right: 8, opacity: 0, border: "none", borderRadius: 8, backgroundColor: "rgba(0,0,0,.5)", color: "#fff", fontSize: 13, padding: "4px 8px", cursor: "pointer", transition: "opacity .15s", zIndex: 2 }}>🗑</button>}
      {imgLoaded && post.img && !isPhase1 && <img src={post.img} alt="" style={{ width: "100%", height: 175, objectFit: "cover", display: "block" }} onError={() => setImgLoaded(false)} />}
      {isPhase1 && (
        <div style={{ width: "100%", height: 72, background: "linear-gradient(135deg, #FEF3C7, #FDE68A)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>📸</span>
          <span style={{ fontSize: 11, color: "#92400E", fontWeight: 600 }}>Visuel en cours de réalisation</span>
        </div>
      )}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <NetIcon network={post.network} size={12} />
            {typeInfo && <span style={{ fontSize: 10, color: C.muted, backgroundColor: C.bgLight, border: `1px solid ${C.border}`, borderRadius: 6, padding: "1px 6px", fontWeight: 600 }}>{typeInfo.icon} {typeInfo.label}</span>}
            {!isClient && client && <><span style={{ color: C.border }}>·</span><Avatar client={client} size={18} /><span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{client.name}</span></>}
          </div>
          <Badge status={post.status} small />
        </div>
        {(isPhase1 || isPhase2) && (
          <div style={{ marginBottom: 8, padding: "5px 10px", borderRadius: 8, backgroundColor: isPhase1 ? "#FEF3C720" : "#EDE9FE20", border: `1px solid ${isPhase1 ? "#F59E0B30" : "#8B5CF630"}`, fontSize: 10, color: isPhase1 ? "#D97706" : "#7C3AED", fontWeight: 600 }}>
            {isPhase1 ? "📝 Phase 1 — Validation du texte" : "🖼️ Phase 2 — Validation du visuel"}
          </div>
        )}
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>📅 {post.day} mars</div>
        <p style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.55, margin: "0 0 6px", whiteSpace: "pre-wrap", maxHeight: 60, overflow: "hidden" }}>{post.caption}</p>
        {post.hours > 0 && (post.status === "pending" || post.status === "late") && (
          <div style={{ fontSize: 10, color: post.hours > 72 ? C.red : C.muted, marginTop: 4, fontWeight: post.hours > 72 ? 600 : 400 }}>⏱ {post.hours}h{post.hours > 48 && " — relancé"}</div>
        )}
        {/* Fil de commentaires */}
        {post.comments?.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
            {post.comments.map((c, i) => (
              <div key={i} style={{ padding: "6px 10px", borderRadius: 10, backgroundColor: c.author === "cm" ? "#EEF7FF" : C.bgLight, border: `1px solid ${c.author === "cm" ? C.accent + "30" : C.border}`, fontSize: 11, color: C.textSoft }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 10, color: c.author === "cm" ? C.accent : C.orange }}>
                    {c.author === "cm" ? "👩‍💻 CM" : "👤 Client"}
                  </span>
                  <span style={{ fontSize: 9, color: C.muted }}>{c.date}</span>
                </div>
                {c.text}
              </div>
            ))}
          </div>
        )}
        {/* Zone message */}
        {onAddComment && (
          <div style={{ marginTop: 8 }}>
            {!showComment ? (
              <button onClick={() => setShowComment(true)} style={{ width: "100%", padding: "6px 0", borderRadius: 8, border: `1px dashed ${C.border}`, backgroundColor: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>
                💬 Ajouter un message
              </button>
            ) : (
              <div>
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={isClient ? "Votre message à la CM..." : "Votre message au client..."} style={{ width: "100%", boxSizing: "border-box", padding: 8, borderRadius: 8, border: `1px solid ${C.accent}`, backgroundColor: C.bgLight, color: C.text, fontSize: 11, resize: "vertical", minHeight: 44, fontFamily: "inherit", outline: "none" }} autoFocus />
                <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                  <button onClick={() => { onAddComment(post.id, comment); setShowComment(false); setComment(""); }} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "none", backgroundColor: C.accent, color: "#fff", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Envoyer</button>
                  <button onClick={() => { setShowComment(false); setComment(""); }} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>✕</button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Boutons validation client */}
        {canAct && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => isPhase2 ? onApproveVisual(post.id) : onApprove(post.id)}
                style={{ flex: 2, padding: "9px 0", borderRadius: 10, border: "none", background: isPhase2 ? "linear-gradient(135deg, #8B5CF6, #7C3AED)" : `linear-gradient(135deg, ${C.green}, ${C.green}cc)`, color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                onMouseEnter={e => e.target.style.opacity = .85} onMouseLeave={e => e.target.style.opacity = 1}>
                {isPhase1 ? "✓ Valider le texte" : isPhase2 ? "✓ Valider le visuel" : "✓ Valider"}
              </button>
              <button onClick={() => { setShowComment(true); }} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1.5px solid ${C.orange}`, backgroundColor: "transparent", color: C.orange, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>✏️ Modif</button>
            </div>
          </div>
        )}
        {/* Bouton édition CM */}
        {onEdit && (
          <div style={{ marginTop: 8 }}>
            <button onClick={() => onEdit(post.id)} style={{ width: "100%", padding: "7px 0", borderRadius: 10, border: `1.5px solid ${C.accent}`, backgroundColor: "transparent", color: C.accent, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
              ✏️ Modifier ce post
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CALENDAR VIEW (avec filtres Posts / RDVs / Tout) ───
const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function CalendarView({ posts, rdvs, clients, calSel, setCalSel, isClient, approve, revise, posts_all }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [filter, setFilter] = useState("all"); // "all" | "posts" | "rdv"
  const [selRdv, setSelRdv] = useState(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const calDays = useMemo(() => {
    const d = [];
    for (let i = 0; i < offset; i++) d.push(null);
    for (let i = 1; i <= daysInMonth; i++) d.push(i);
    return d;
  }, [year, month]);

  // Posts par jour
  const postsByDay = {};
  if (filter !== "rdv") {
    posts.forEach(p => {
      if (!p.date) return;
      const d = new Date(p.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!postsByDay[day]) postsByDay[day] = [];
        postsByDay[day].push(p);
      }
    });
  }

  // RDVs par jour
  const rdvsByDay = {};
  if (filter !== "posts") {
    rdvs.forEach(r => {
      if (!r.date) return;
      const d = new Date(r.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!rdvsByDay[day]) rdvsByDay[day] = [];
        rdvsByDay[day].push(r);
      }
    });
  }

  const selectedPost = calSel ? posts_all.find(x => x.id === calSel) : null;
  const selectedRdvObj = selRdv ? rdvs.find(r => r.id === selRdv) : null;

  const FILTERS = [
    { id: "all", label: "Tout", icon: "🗓️" },
    { id: "posts", label: "Posts", icon: "📣" },
    { id: "rdv", label: "RDV", icon: "📞" },
  ];

  return (
    <div>
      {/* Filtres + légende */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        {/* Filtres */}
        <div style={{ display: "flex", gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => { setFilter(f.id); setCalSel(null); setSelRdv(null); }}
              style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${filter === f.id ? C.accent : C.border}`, backgroundColor: filter === f.id ? C.accentSoft : "transparent", color: filter === f.id ? C.accent : C.muted, fontSize: 12, fontWeight: filter === f.id ? 700 : 500, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>
        {/* Légende */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {filter !== "rdv" && [
            { color: C.accent, label: "Post" },
            { color: C.green, label: "Validé" },
            { color: "#F59E0B", label: "En attente" },
            { color: C.red, label: "En retard" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: l.color }} />
              {l.label}
            </div>
          ))}
          {filter !== "posts" && [
            { color: "#7C3AED", label: "RDV" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}>
              <div style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* Calendrier */}
        <div style={{ flex: 1 }}>
          {/* Nav mois */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ padding: "5px 14px", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontSize: 16, cursor: "pointer" }}>‹</button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{MONTHS_FR[month]} {year}</span>
              {!isCurrentMonth && <button onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))} style={{ padding: "3px 10px", borderRadius: 20, border: `1px solid ${C.accent}40`, backgroundColor: C.accentSoft, color: C.accent, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Aujourd'hui</button>}
            </div>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ padding: "5px 14px", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontSize: 16, cursor: "pointer" }}>›</button>
          </div>

          {/* Jours de la semaine */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, marginBottom: 1 }}>
            {DAYS_LABELS.map(d => <div key={d} style={{ padding: "6px 0", textAlign: "center", fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>{d}</div>)}
          </div>

          {/* Grille */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, backgroundColor: C.border + "66", borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}` }}>
            {calDays.map((day, i) => {
              const dp = day ? (postsByDay[day] || []) : [];
              const dr = day ? (rdvsByDay[day] || []) : [];
              const isToday = isCurrentMonth && day === today.getDate();
              const isPast = day && new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const hasSelected = dp.some(p => p.id === calSel) || dr.some(r => r.id === selRdv);

              return (
                <div key={i} style={{ minHeight: 82, padding: 5, backgroundColor: hasSelected ? C.accentSoft + "80" : day ? C.card : C.bgLight }}>
                  {day && <>
                    <div style={{ fontSize: 10, fontWeight: isToday ? 700 : 400, color: isToday ? "#fff" : isPast ? C.muted : C.text, marginBottom: 3, ...(isToday ? { backgroundColor: C.accent, width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 } : {}) }}>{day}</div>

                    {/* Posts */}
                    {dp.slice(0, 3).map(p => (
                      <button key={p.id} onClick={() => { setCalSel(p.id); setSelRdv(null); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 3, padding: "2px 4px", marginBottom: 1, borderRadius: 5, border: calSel === p.id ? `1px solid ${C.accent}` : `1px solid transparent`, backgroundColor: calSel === p.id ? C.accentSoft : STATUSES[p.status]?.bg || C.bgLight, cursor: "pointer", fontSize: 9, color: C.text, textAlign: "left", transition: "all .1s" }}>
                        <Dot color={STATUSES[p.status]?.color || C.muted} pulse={p.status === "late"} />
                        <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{NETWORKS[p.network]?.short || "?"}</span>
                      </button>
                    ))}
                    {dp.length > 3 && <div style={{ fontSize: 8, color: C.muted, paddingLeft: 4 }}>+{dp.length - 3}</div>}

                    {/* RDVs */}
                    {dr.slice(0, 2).map(r => {
                      const rt = RDV_TYPES[r.type] || RDV_TYPES.call;
                      return (
                        <button key={r.id} onClick={() => { setSelRdv(r.id); setCalSel(null); }}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 3, padding: "2px 4px", marginBottom: 1, borderRadius: 5, border: selRdv === r.id ? `1px solid #7C3AED` : `1px solid transparent`, backgroundColor: selRdv === r.id ? "#7C3AED14" : "#7C3AED10", cursor: "pointer", fontSize: 9, color: C.text, textAlign: "left", transition: "all .1s" }}>
                          <div style={{ width: 6, height: 6, borderRadius: 2, backgroundColor: "#7C3AED", flexShrink: 0 }} />
                          <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.time}</span>
                        </button>
                      );
                    })}
                    {dr.length > 2 && <div style={{ fontSize: 8, color: C.muted, paddingLeft: 4 }}>+{dr.length - 2}</div>}
                  </>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panneau de détail */}
        <div style={{ width: 290, flexShrink: 0 }}>
          {/* Détail post sélectionné */}
          {selectedPost && (() => {
            const p = selectedPost;
            const ca = isClient && ["pending", "pending_text", "pending_visual", "late"].includes(p.status);
            const cl = clients.find(c => c.id === p.clientId);
            return (
              <div style={{ backgroundColor: C.card, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.border}`, animation: "fadeIn .2s ease" }}>
                {p.img && <img src={p.img} alt="" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} onError={e => { e.target.style.display = "none"; }} />}
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                    {cl && !isClient && <><Avatar client={cl} size={18} /><span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{cl.name}</span><span style={{ color: C.border }}>·</span></>}
                    <NetIcon network={p.network} size={11} />
                    <Badge status={p.status} small />
                  </div>
                  {p.date && <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>📅 {new Date(p.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</div>}
                  <p style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", color: C.textSoft, marginBottom: 10 }}>{p.caption}</p>
                  {p.comments?.length > 0 && <div style={{ padding: "6px 8px", borderRadius: 8, backgroundColor: C.bgLight, fontSize: 11, color: C.textSoft, marginBottom: 10, border: `1px solid ${C.border}` }}><span style={{ color: C.accent }}>💬</span> {p.comments[0].text}</div>}
                  {ca && <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { approve(p.id); setCalSel(null); }} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.green}, ${C.green}cc)`, color: "#fff", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>✓ Valider</button>
                    <button onClick={() => { revise(p.id, "Modification demandée"); setCalSel(null); }} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${C.accent}`, backgroundColor: "transparent", color: C.accent, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>✏️ Modifier</button>
                  </div>}
                  {p.status === "approved" && <div style={{ padding: "8px", borderRadius: 8, backgroundColor: C.greenSoft, fontSize: 11, color: C.green, fontWeight: 500, textAlign: "center", border: `1px solid ${C.green}20` }}>✓ Validé</div>}
                  <button onClick={() => setCalSel(null)} style={{ marginTop: 10, width: "100%", padding: "6px 0", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>✕ Fermer</button>
                </div>
              </div>
            );
          })()}

          {/* Détail RDV sélectionné */}
          {selectedRdvObj && (() => {
            const r = selectedRdvObj;
            const rt = RDV_TYPES[r.type] || RDV_TYPES.call;
            const cl = clients.find(c => String(c.id) === String(r.clientId));
            return (
              <div style={{ backgroundColor: C.card, borderRadius: 16, border: `1px solid #7C3AED30`, animation: "fadeIn .2s ease", overflow: "hidden" }}>
                <div style={{ height: 4, background: "linear-gradient(90deg, #7C3AED, #E0387A)" }} />
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: rt.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{rt.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.title}</div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#7C3AED", backgroundColor: "#7C3AED15", padding: "2px 8px", borderRadius: 20 }}>{rt.label}</span>
                    </div>
                  </div>
                  {cl && <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><Avatar client={cl} size={18} /><span style={{ fontSize: 12, color: C.textSoft, fontWeight: 500 }}>{cl.name}</span></div>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: C.textSoft }}>
                    <div>📅 {new Date(r.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
                    <div>🕐 {r.time} · {r.duration}</div>
                    {r.location && <div>📍 {r.location}</div>}
                  </div>
                  {r.notes && <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, backgroundColor: C.bgLight, fontSize: 11, color: C.muted, fontStyle: "italic", border: `1px solid ${C.border}` }}>{r.notes}</div>}
                  <button onClick={() => setSelRdv(null)} style={{ marginTop: 12, width: "100%", padding: "6px 0", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>✕ Fermer</button>
                </div>
              </div>
            );
          })()}

          {/* État vide */}
          {!selectedPost && !selectedRdvObj && (
            <div style={{ backgroundColor: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 28, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8, opacity: .2 }}>📅</div>
              <div style={{ fontSize: 12, color: C.muted }}>Cliquez sur un post ou un RDV</div>
            </div>
          )}

          {/* Prochains RDVs du mois */}
          {!isClient && filter !== "posts" && (() => {
            const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
            const monthRdvs = rdvs.filter(r => r.date?.startsWith(monthStr)).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
            if (monthRdvs.length === 0) return null;
            return (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>RDV ce mois</div>
                <div style={{ backgroundColor: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                  {monthRdvs.map((r, i) => {
                    const rt = RDV_TYPES[r.type] || RDV_TYPES.call;
                    const cl = clients.find(c => String(c.id) === String(r.clientId));
                    return (
                      <div key={r.id} onClick={() => { setSelRdv(r.id); setCalSel(null); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: i < monthRdvs.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer", backgroundColor: selRdv === r.id ? "#7C3AED08" : "transparent", transition: "background .1s" }}>
                        <div style={{ fontSize: 16 }}>{rt.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                          <div style={{ fontSize: 10, color: C.muted }}>{new Date(r.date).getDate()} · {r.time} · {cl?.name}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── STRATEGY ───
function StrategyPanel({ strategy, isClient, onSuggest }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  if (!strategy) return null;
  const SH = ({ children }) => <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8, paddingBottom: 5, borderBottom: `1px solid ${C.border}` }}>{children}</div>;

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <div style={{ marginBottom: 20 }}><h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Stratégie éditoriale</h3><div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{strategy.period} · MAJ {strategy.lastUpdate}</div></div>
      <div style={{ marginBottom: 18 }}><SH>Objectif</SH><p style={{ fontSize: 13, lineHeight: 1.7, color: C.textSoft }}>{strategy.objective}</p></div>
      <div style={{ marginBottom: 18 }}><SH>Audiences</SH>{strategy.audiences.map((a, i) => <div key={i} style={{ fontSize: 12, padding: "3px 0", lineHeight: 1.6, color: C.textSoft }}><span style={{ color: C.accent, marginRight: 6 }}>→</span>{a}</div>)}</div>
      <div style={{ marginBottom: 18 }}><SH>Piliers</SH>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {strategy.pillars.map((p, i) => (
            <div key={i} style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: C.bgLight }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}><span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{p.name}</span><span style={{ fontSize: 10, fontWeight: 600, color: C.accent, padding: "1px 6px", borderRadius: 10, backgroundColor: C.accentSoft }}>{p.ratio}</span></div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 18 }}><SH>Rythme</SH>
        <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          {strategy.rhythm.map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "85px 80px 1fr", padding: "8px 12px", fontSize: 11, backgroundColor: i % 2 === 0 ? C.card : C.bgLight, borderBottom: i < strategy.rhythm.length - 1 ? `1px solid ${C.border}` : "none", color: C.textSoft }}>
              <span style={{ fontWeight: 600, color: C.text }}>{r.net}</span><span style={{ color: C.muted }}>{r.freq}</span><span>{r.type}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 18 }}><SH>KPIs</SH>{strategy.kpis.map((k, i) => <div key={i} style={{ fontSize: 12, padding: "2px 0", color: C.textSoft }}><span style={{ color: C.green, marginRight: 6, fontWeight: 600 }}>◎</span>{k}</div>)}</div>
      <div style={{ marginBottom: 18 }}><SH>Notes</SH><p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, fontStyle: "italic" }}>{strategy.notes}</p>
        {isClient && (
          <div style={{ marginTop: 14 }}>
            {!editing ? <button onClick={() => setEditing(true)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>💬 Suggérer une modification</button>
            : <div><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Votre suggestion..." autoFocus style={{ width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: C.bgLight, color: C.text, fontSize: 11, minHeight: 60, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button onClick={() => { onSuggest(note); setEditing(false); setNote(""); }} style={{ padding: "7px 16px", borderRadius: 8, border: "none", backgroundColor: C.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Envoyer</button>
                <button onClick={() => { setEditing(false); setNote(""); }} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>Annuler</button>
              </div></div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LOGIN PAGE ───
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      await onLogin(email, password);
    } catch(e) {
      setError("Email ou mot de passe incorrect");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bgLight, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ width: 380, backgroundColor: C.card, borderRadius: 24, padding: 40, boxShadow: "0 20px 60px rgba(0,0,0,.08)", border: `1px solid ${C.border}`, position: "relative", overflow: "hidden" }}>
        <FloralCorner style={{ width: 150, top: -30, right: -20 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: C.accent, boxShadow: `0 0 12px ${C.accentGlow}` }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: C.text }}>Mon espace</span>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 6 }}>Connexion</h2>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 28 }}>Accédez à votre espace client</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 5 }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} type="email" placeholder="votre@email.com" style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, backgroundColor: C.bgLight, boxSizing: "border-box", fontFamily: "inherit", outline: "none", transition: "border .2s" }} onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.border} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 5 }}>Mot de passe</label>
            <input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} type="password" placeholder="••••••••" style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, backgroundColor: C.bgLight, boxSizing: "border-box", fontFamily: "inherit", outline: "none", transition: "border .2s" }} onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.border} />
          </div>
          {error && <div style={{ padding: "8px 12px", borderRadius: 10, backgroundColor: C.redSoft, border: `1px solid ${C.red}20`, fontSize: 12, color: C.red }}>{error}</div>}
          <button onClick={handleSubmit} disabled={loading || !email || !password} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.accent}, ${C.lavender})`, color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "wait" : "pointer", opacity: (!email || !password) ? .6 : 1, marginTop: 6, boxShadow: `0 4px 14px ${C.accentGlow}`, transition: "opacity .2s" }}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </div>
        <p style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 20 }}>Contactez votre community manager pour obtenir vos accès</p>
      </div>
    </div>
  );
}

// ─── MAIN ───
export default function App() {
  const [viewMode, setViewMode] = useState("cm");
  const [tab, setTab] = useState("dashboard");
  const [selClient, setSelClient] = useState(null);
  const [posts, setPosts] = useState([]);
  const [clients, setClients] = useState([]);
  const [factures, setFactures] = useState(INVOICES);
  const [strategies, setStrategies] = useState(STRATEGIES);
  const [loading, setLoading] = useState(true);
  const [airtableReady, setAirtableReady] = useState(false);
  const [cmProfile, setCmProfile] = useState(null);
  const [toast, setToast] = useState(null);
  const [calSel, setCalSel] = useState(null);

  // ─── RDV STATE ───
  const [rdvs, setRdvs] = useState(INITIAL_RDVS);
  const [showAddRdv, setShowAddRdv] = useState(false);
  const [newRdv, setNewRdv] = useState({ clientId: "", type: "call", title: "", date: "", time: "10:00", duration: "1h", location: "", notes: "" });

  // ─── POMODORO STATE ───
  const [pTime, setPTime] = useState(25 * 60);
  const [pRun, setPRun] = useState(false);
  const [pMode, setPMode] = useState("work");
  const [pCount, setPCount] = useState(0);
  const pRef = useRef();

  // ─── AI STATE ───
  const [aiMsgs, setAiMsgs] = useState([{ role: "assistant", content: "👋 Bonjour ! Je suis ton assistante CM. Demande-moi des idées de contenu, des captions, des stratégies ou de l'aide pour planifier ta semaine !" }]);
  const [aiIn, setAiIn] = useState("");
  const [aiLoad, setAiLoad] = useState(false);
  const chatRef = useRef();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNewClient, setShowNewClient] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", prenom: "", nom: "", email: "", motDePasse: "", telephone: "", adresse: "", color: "#2A8FA8", reseaux: [] });
  const [newPost, setNewPost] = useState({ caption: "", network: "instagram", date: "", status: "pending_text", img: "", contentType: "image" });
  const [imgPreview, setImgPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeletePost, setConfirmDeletePost] = useState(null);
  const [editPostId, setEditPostId] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // clientId à supprimer

  // ─── AUTH SUPABASE ───
  const loadCMData = async (user) => {
    try {
      const creds = await getCMCredentials(user.id);
      setCmProfile(creds);
      setAirtableCredentials(creds.airtable_api_key, creds.airtable_base_id);
      setLoading(true);
      const [cls, psts, facts, strats] = await Promise.all([
        getClients(), getPosts(), getFactures(), getStrategies()
      ]);
      if (cls.length > 0) setClients(cls);
      if (psts.length > 0) setPosts(psts);
      if (facts.length > 0) {
        const fb = {};
        facts.forEach(f => { if (!fb[f.clientId]) fb[f.clientId] = []; fb[f.clientId].push(f); });
        setFactures(fb);
      }
      if (strats.length > 0) {
        const sb = {};
        strats.forEach(s => { sb[s.clientId] = s; });
        setStrategies(sb);
      }
      setAirtableReady(true);
    } catch (err) {
      console.error("Erreur chargement CM:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getSession().then(session => {
      if (session?.user) {
        setAuthUser(session.user);
        setViewMode("cm");
        loadCMData(session.user);
      } else {
        setLoading(false);
      }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) setAuthUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (email, password) => {
    // Essaie d'abord de se connecter comme CM via Supabase
    try {
      const user = await signIn(email, password);
      setAuthUser(user);
      setViewMode("cm");
      setTab("dashboard");
      await loadCMData(user);
      fire("👋 Bienvenue !");
      return;
    } catch (supabaseErr) {
      // Pas une CM → essaie comme client Airtable
    }
    // Connexion client : vérifie email dans Airtable
    const allClients = clients.length > 0 ? clients : await getClients().catch(() => []);
    const match = allClients.find(c =>
      (c.email?.toLowerCase() === email.toLowerCase() ||
      c.loginPortail?.toLowerCase() === email.toLowerCase()) &&
      (c.motDePasse === password)
    );
    if (match) {
      setAuthUser({ id: "client-" + match.id, email });
      setViewMode("client");
      setTab("calendar");
      setClients(prev => prev.some(c => c.id === match.id) ? prev : [...prev, match]);
      setSelClient(match.id);
      fire("👋 Bienvenue !");
    } else {
      fire("❌ Email ou mot de passe incorrect", "err");
    }
  };

  const handleLogout = async () => {
    await signOut();
    clearAirtableCredentials();
    setAuthUser(null);
    setCmProfile(null);
    setViewMode("cm");
    setTab("dashboard");
    setClients([]);
    setPosts([]);
    setFactures({});
    setStrategies({});
    setAirtableReady(false);
  };



  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t); } }, [toast]);

  // ─── POMODORO EFFECT ───
  useEffect(() => {
    if (pRun) {
      pRef.current = setInterval(() => setPTime(t => {
        if (t <= 1) {
          setPRun(false);
          if (pMode === "work") { setPCount(c => c + 1); setPMode("break"); return 5 * 60; }
          else { setPMode("work"); return 25 * 60; }
        }
        return t - 1;
      }), 1000);
    }
    return () => clearInterval(pRef.current);
  }, [pRun, pMode]);

  useEffect(() => { chatRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMsgs]);
  const fire = (msg, type) => setToast({ msg, type });

  // ─── AI SEND ───
  const sendAI = async () => {
    if (!aiIn.trim() || aiLoad) return;
    const um = { role: "user", content: aiIn };
    setAiMsgs(m => [...m, um]); setAiIn(""); setAiLoad(true);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: `Tu es une assistante expert Community Management pour "Petit bout de com", une agence CM indépendante. Aide la CM avec ses clients, ses contenus et ses stratégies. Réponds en français avec des emojis. Clients actuels : ${clients.map(c => c.name).join(", ")}.`,
          messages: [...aiMsgs, um].map(m => ({ role: m.role, content: m.content }))
        })
      });
      const d = await r.json();
      setAiMsgs(m => [...m, { role: "assistant", content: d.content?.[0]?.text || "Erreur de réponse." }]);
    } catch { setAiMsgs(m => [...m, { role: "assistant", content: "⚠️ Erreur de connexion à l'API." }]); }
    setAiLoad(false);
  };

  // ─── RDV HELPERS ───
  const addRdv = () => {
    if (!newRdv.title || !newRdv.date) return;
    setRdvs(r => [...r, { ...newRdv, id: Date.now(), clientId: newRdv.clientId || (clients[0]?.id) }]);
    setNewRdv({ clientId: "", type: "call", title: "", date: "", time: "10:00", duration: "1h", location: "", notes: "" });
    setShowAddRdv(false);
    fire("📅 RDV ajouté");
  };
  const delRdv = id => setRdvs(r => r.filter(x => x.id !== id));
  const fmtSecs = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const approve = async (id) => {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    const nextStatus = post.status === "pending_text" ? "pending_visual" : "approved";
    const msg = nextStatus === "pending_visual" ? "✓ Texte validé — en attente du visuel" : "Validé ✓";
    if (post?.airtableId && airtableReady) {
      await updatePostStatus(post.airtableId, nextStatus, msg).catch(console.error);
    }
    setPosts(p => p.map(x => x.id === id ? { ...x, status: nextStatus, comments: [{ author: "client", text: msg, date: "à l'instant" }] } : x));
    fire(nextStatus === "pending_visual" ? "✓ Texte validé ! La CM va ajouter le visuel" : "✅ Post entièrement validé !");
  };

  const approveVisual = async (id) => {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    if (post?.airtableId && airtableReady) {
      await updatePostStatus(post.airtableId, "approved", "Visuel validé ✓").catch(console.error);
    }
    setPosts(p => p.map(x => x.id === id ? { ...x, status: "approved", comments: [{ author: "client", text: "Visuel validé ✓", date: "à l'instant" }] } : x));
    fire("✅ Visuel validé — post prêt à publier !");
  };

  const revise = async (id, c) => {
    const post = posts.find(p => p.id === id);
    if (post?.airtableId && airtableReady) {
      await updatePostStatus(post.airtableId, "revision", c || "Modification demandée").catch(console.error);
    }
    setPosts(p => p.map(x => x.id === id ? { ...x, status: "revision", comments: [...(x.comments||[]), { author: "client", text: c || "Modification demandée", date: "à l'instant" }] } : x));
    fire("✏️ Demande envoyée", "rev");
  };

  const addComment = (id, text, author) => {
    if (!text?.trim()) return;
    setPosts(p => p.map(x => x.id === id ? { ...x, comments: [...(x.comments||[]), { author, text, date: "à l'instant" }] } : x));
    fire(author === "cm" ? "💬 Message envoyé au client" : "💬 Message envoyé à la CM");
  };

  const updatePost = (id, fields) => {
    setPosts(p => p.map(x => x.id === id ? { ...x, ...fields } : x));
    fire("✅ Post modifié");
  };

  const handleDeleteClient = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      const client = clients.find(c => c.id === confirmDelete);

      // 1. Supprimer dans Airtable
      await deleteClient(confirmDelete);

      // 2. Supprimer le compte Supabase Auth si email connu
      if (client?.email) {
        await fetch("/api/delete-client-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: client.email }),
        }).catch(err => console.warn("Suppression Supabase échouée:", err));
      }

      setClients(c => c.filter(x => x.id !== confirmDelete));
      setPosts(p => p.filter(x => x.clientId !== confirmDelete));
      if (selClient === confirmDelete) setSelClient(null);
      setConfirmDelete(null);
      fire("🗑 Client supprimé");
    } catch(e) { console.error(e); fire("❌ Erreur suppression", "err"); }
    setSaving(false);
  };

  const handleDeletePost = async () => {
    if (!confirmDeletePost) return;
    setSaving(true);
    try {
      await deletePost(confirmDeletePost);
      setPosts(p => p.filter(x => x.id !== confirmDeletePost));
      setConfirmDeletePost(null);
      fire("🗑 Post supprimé");
    } catch(e) { console.error(e); fire("❌ Erreur suppression", "err"); }
    setSaving(false);
  };

  const isClient = viewMode === "client";

  const handleCreateClient = async () => {
    if (!newClient.name.trim() || !newClient.email.trim() || !newClient.motDePasse.trim()) return;
    setSaving(true);
    try {
      // 1. Créer le compte Supabase Auth via fonction serverless
      const authRes = await fetch("/api/create-client-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newClient.email,
          password: newClient.motDePasse,
          clientName: newClient.name,
        }),
      });
      const authData = await authRes.json();
      if (!authRes.ok) throw new Error(authData.error || "Erreur création compte");

      // 2. Créer dans Airtable avec tous les champs + supabaseId
      const res = await createClient({
        name: newClient.name,
        prenom: newClient.prenom,
        nom: newClient.nom,
        email: newClient.email,
        motDePasse: newClient.motDePasse,
        telephone: newClient.telephone,
        adresse: newClient.adresse,
        color: newClient.color,
        reseaux: newClient.reseaux,
        supabaseId: authData.userId,
      });

      const created = {
        id: res.id, airtableId: res.id,
        name: newClient.name, email: newClient.email,
        prenom: newClient.prenom, nom: newClient.nom,
        telephone: newClient.telephone, adresse: newClient.adresse,
        color: newClient.color, reseaux: newClient.reseaux,
        initials: newClient.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
      };
      setClients(c => [...c, created]);
      setShowNewClient(false);
      setNewClient({ name: "", prenom: "", nom: "", email: "", motDePasse: "", telephone: "", adresse: "", color: "#2A8FA8", reseaux: [] });
      fire("✅ Client créé ! Accès : " + newClient.email);
    } catch(e) { console.error(e); fire("❌ " + e.message, "err"); }
    setSaving(false);
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = e => setImgPreview(e.target.result);
    reader.readAsDataURL(file);
    try {
      const url = await uploadImage(file);
      setNewPost(p => ({ ...p, img: url }));
      fire("🖼 Image uploadée !");
    } catch(e) {
      console.error(e);
      fire("❌ Erreur upload image", "err");
    }
    setUploading(false);
  };

  const handleCreatePost = async () => {
    if (!newPost.caption.trim() || !selClient) return;
    setSaving(true);
    try {
      const res = await createPost({
        caption: newPost.caption, clientId: selClient, network: newPost.network,
        date: newPost.date, status: newPost.status, img: newPost.img,
      });
      const created = {
        id: res.id, airtableId: res.id, clientId: selClient,
        network: newPost.network, status: newPost.status,
        day: newPost.date ? new Date(newPost.date).getDate() : 0,
        date: newPost.date, caption: newPost.caption, img: newPost.img, hours: 0, comments: [],
      };
      setPosts(p => [...p, created]);
      setShowNewPost(false);
      setNewPost({ caption: "", network: "instagram", date: "", status: "pending", img: "" });
      setImgPreview(null);
      fire("✅ Post créé !");
    } catch(e) { console.error(e); fire("❌ Erreur création post", "err"); }
    setSaving(false);
  };
  const filtered = posts.filter(p => selClient ? p.clientId === selClient : true);
  const visible = isClient ? filtered.filter(p => p.status !== "draft") : filtered;
  const stats = { total: posts.length, pending: posts.filter(p => p.status === "pending").length, late: posts.filter(p => p.status === "late").length, approved: posts.filter(p => p.status === "approved").length, revision: posts.filter(p => p.status === "revision").length };

  const findClient = (id) => clients.find(c => c.id === id || c.airtableId === id);
  const cmTabs = [{ id: "dashboard", icon: "📊", label: "Dashboard" }, { id: "calendar", icon: "📅", label: "Calendrier" }, { id: "posts", icon: "📋", label: "Posts" }, { id: "billing", icon: "🧾", label: "Facturation" }, { id: "rdv", icon: "📞", label: "Rendez-vous" }, { id: "assistant", icon: "🤖", label: "Assistante IA" }, { id: "pomodoro", icon: "⏱️", label: "Pomodoro" }, { id: "workflows", icon: "🔔", label: "Relances clients" }];
  const clientTabs = [{ id: "calendar", icon: "📅", label: "Calendrier" }, { id: "posts", icon: "📋", label: "Contenus" }, { id: "billing", icon: "🧾", label: "Factures" }];
  const tabs = isClient ? clientTabs : cmTabs;

  // Afficher login si mode client et pas connecté
  if (authLoading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Sans, sans-serif", color: "#9590A0" }}>Chargement...</div>;
  if (!authUser) return <LoginPage onLogin={handleLogin} />;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        ::placeholder{color:#BFBAB2}
        textarea:focus,input:focus{outline:none}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#D0CCC6;border-radius:3px}
      `}</style>

      {/* ─── HEADER ─── */}
      <div style={{ background: `linear-gradient(135deg, #FFFFFF 0%, ${C.bgLight} 50%, #FFFFFF 100%)`, borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58, position: "relative", overflow: "hidden" }}>
        <FloralCorner style={{ width: 140, top: -25, right: 50 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: C.accent, boxShadow: `0 0 12px ${C.accentGlow}` }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: -0.5 }}>
            {isClient ? "Mon espace" : cmProfile?.name ? `Espace CM — ${cmProfile.name}` : "petit bout de com"}
          </span>
          {isClient && selClient && <span style={{ fontSize: 12, color: C.accent, fontWeight: 400 }}>— {clients.find(c => c.id === selClient)?.name}</span>}
          {loading && <span style={{ fontSize: 10, color: C.muted, marginLeft: 8, animation: "pulse 1s infinite" }}>⟳ Chargement...</span>}
          <button onClick={() => setSidebarOpen(o => !o)} style={{ marginLeft: 8, padding: "5px 8px", border: `1px solid ${C.border}`, borderRadius: 8, backgroundColor: "transparent", color: C.muted, fontSize: 16, cursor: "pointer", lineHeight: 1, display: "flex", alignItems: "center" }} title="Menu">
            {sidebarOpen ? "☰" : "☰"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, zIndex: 1 }}>
          <span style={{ fontSize: 11, color: C.muted }}>{authUser?.email}</span>
          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, backgroundColor: isClient ? C.accentSoft : C.sidebarBg, color: isClient ? C.accent : C.sidebarAccent, fontWeight: 700, border: `1px solid ${isClient ? C.accent + "40" : C.sidebarAccent + "40"}` }}>
            {isClient ? "👤 Client" : "👩‍💻 CM"}
          </span>
          <button onClick={handleLogout} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
            Déconnexion
          </button>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 58px)" }}>
        {/* ─── SIDEBAR ─── */}
        <div style={{ width: sidebarOpen ? 218 : 0, minWidth: sidebarOpen ? 218 : 0, background: C.sidebarBg, border: "none", padding: sidebarOpen ? "14px 0" : 0, flexShrink: 0, boxShadow: "4px 0 20px rgba(0,0,0,0.25)", overflow: "hidden", transition: "all .25s ease" }}>
          <div style={{ marginBottom: 16 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setCalSel(null); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 18px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 600 : 400, backgroundColor: tab === t.id ? C.sidebarActive : "transparent", color: tab === t.id ? C.sidebarAccent : C.sidebarMuted, borderLeft: tab === t.id ? `3px solid ${C.sidebarAccent}` : "3px solid transparent", transition: "all .15s" }}>
                <span style={{ fontSize: 14 }}>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
          <div style={{ padding: "0 18px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.sidebarMuted, letterSpacing: 1.2, textTransform: "uppercase" }}>{isClient ? "Simuler" : "Clients"}</span>
            {!isClient && <button onClick={() => setShowNewClient(true)} style={{ fontSize: 18, lineHeight: 1, border: "none", background: "none", color: C.sidebarAccent, cursor: "pointer", fontWeight: 700, padding: "0 2px" }} title="Nouveau client">+</button>}
          </div>
          {!isClient && <button onClick={() => setSelClient(null)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 18px", border: "none", cursor: "pointer", fontSize: 11, backgroundColor: !selClient ? C.sidebarActive : "transparent", color: !selClient ? "#FFD6E8" : C.sidebarMuted, fontWeight: !selClient ? 600 : 400, borderRadius: 6 }}>Tous</button>}
          {/* En mode client connecté, afficher uniquement son compte */}
          {isClient && authUser ? (
            selClient && (() => {
              const c = clients.find(x => x.id === selClient);
              return c ? (
                <div style={{ padding: "7px 18px", display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar client={c} size={22} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{c.name}</span>
                </div>
              ) : null;
            })()
          ) : (
            clients.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", paddingRight: 8 }}
                onMouseEnter={e => { const btn = e.currentTarget.querySelector(".del-btn"); if(btn) btn.style.opacity = "1"; }}
                onMouseLeave={e => { const btn = e.currentTarget.querySelector(".del-btn"); if(btn) btn.style.opacity = "0"; }}>
                <button onClick={() => setSelClient(c.id)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "7px 18px", border: "none", cursor: "pointer", fontSize: 11, backgroundColor: selClient === c.id ? C.sidebarActive : "transparent", color: selClient === c.id ? "#FFD6E8" : C.sidebarMuted, fontWeight: selClient === c.id ? 600 : 400, borderRadius: 6, transition: "all .15s" }}>
                  <Avatar client={c} size={22} /> {c.name}
                </button>
                {!isClient && <button className="del-btn" onClick={() => setConfirmDelete(c.id)} style={{ opacity: 0, border: "none", background: "none", cursor: "pointer", fontSize: 13, color: C.red, padding: "4px 6px", borderRadius: 6, transition: "opacity .15s", flexShrink: 0 }} title="Supprimer">🗑</button>}
              </div>
            ))
          )}
          <div style={{ margin: "16px 14px 0", padding: 12, borderRadius: 12, background: C.sidebarActive, border: `1px solid ${C.sidebarAccent}40` }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: C.sidebarAccent, letterSpacing: .8, marginBottom: 2 }}>🔔 Relances actives</div>
            <div style={{ fontSize: 10, color: "#FFD6E8" }}>6 automatisations</div>
            <div style={{ fontSize: 9, color: C.sidebarMuted }}>Relance : il y a 2h</div>
          </div>
        </div>

        {/* ─── MAIN ─── */}
        <div style={{ flex: 1, padding: 22, overflowY: "auto", maxHeight: "calc(100vh - 58px)", backgroundColor: C.bg }}>

          {/* DASHBOARD */}
          {tab === "dashboard" && !isClient && (
            <div style={{ animation: "fadeIn .3s ease" }}>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: C.text, marginBottom: 6, letterSpacing: -0.5 }}>{cmProfile?.name ? `Bonjour ${cmProfile.name} 👋` : "Bonjour 👋"}</h2>
                <p style={{ fontSize: 15, color: C.textSoft, marginBottom: 6, fontWeight: 500 }}>Bienvenue dans ton espace de gestion.</p>
                <p style={{ fontSize: 13, color: C.muted }}>
                  {stats.pending > 0
                    ? <>Tu as <strong style={{ color: C.orange, fontWeight: 700 }}>{stats.pending} post{stats.pending > 1 ? "s" : ""}</strong> en attente de validation à ce jour.</>
                    : <span style={{ color: C.green }}>Tout est à jour, aucun post en attente ✓</span>
                  }
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
                <StatCard label="Total" value={stats.total} sub="ce mois" />
                <StatCard label="En attente" value={stats.pending} accent={C.gold} sub="validation" />
                <StatCard label="En retard" value={stats.late} accent={C.red} sub="relancé" />
                <StatCard label="Validés" value={stats.approved} accent={C.green} sub="prêts" />
                <StatCard label="Modifs" value={stats.revision} accent={C.orange} sub="à traiter" />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: C.textSoft }}>Par client</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 10, marginBottom: 22 }}>
                {clients.map(cl => {
                  const cp = posts.filter(p => p.clientId === cl.id);
                  const pe = cp.filter(p => p.status === "pending" || p.status === "late").length;
                  const ap = cp.filter(p => p.status === "approved").length;
                  return (
                    <div key={cl.id} onClick={() => { setSelClient(cl.id); setTab("posts"); }} style={{ backgroundColor: C.card, borderRadius: 14, padding: 14, border: `1px solid ${C.border}`, cursor: "pointer", transition: "all .2s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = cl.color; e.currentTarget.style.boxShadow = `0 4px 16px ${cl.color}15`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><Avatar client={cl} size={28} /><span style={{ fontWeight: 600, fontSize: 13 }}>{cl.name}</span></div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 8, backgroundColor: pe > 0 ? C.goldSoft : C.greenSoft, color: pe > 0 ? C.gold : C.green, fontWeight: 600, border: `1px solid ${pe > 0 ? C.gold : C.green}20` }}>{pe} en attente</span>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 8, backgroundColor: C.greenSoft, color: C.green, fontWeight: 600, border: `1px solid ${C.green}20` }}>{ap} validé{ap > 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
                🔥 Urgents
                {(() => { const n = posts.filter(p => p.status === "late" || (p.status === "pending" && p.date && (new Date() - new Date(p.date)) / 86400000 > 2)).length; return n > 0 ? <span style={{ backgroundColor: C.red, color: "#fff", borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "1px 8px" }}>{n}</span> : null; })()}
              </h3>
              {(() => {
                const urgents = posts.filter(p => p.status === "late" || (p.status === "pending" && p.date && (new Date() - new Date(p.date)) / 86400000 > 2));
                if (urgents.length === 0) return (
                  <div style={{ padding: "16px 20px", borderRadius: 14, backgroundColor: C.greenSoft, border: `1px solid ${C.green}25`, fontSize: 13, color: C.green, fontWeight: 500 }}>
                    ✅ Aucun post urgent — tout est dans les temps !
                  </div>
                );
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(255px,1fr))", gap: 12 }}>
                    {urgents.map(p => {
                      const cl = clients.find(c => c.id === p.clientId);
                      const daysLate = p.date ? Math.floor((new Date() - new Date(p.date)) / 86400000) : null;
                      return (
                        <div key={p.id} style={{ backgroundColor: C.card, borderRadius: 14, padding: "14px 16px", border: `1.5px solid ${C.red}40`, position: "relative", overflow: "hidden" }}>
                          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.red}, ${C.orange})` }} />
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            {cl && <Avatar client={cl} size={22} />}
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{cl?.name || "—"}</span>
                            <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: p.status === "late" ? C.red : C.orange, backgroundColor: p.status === "late" ? C.redSoft : C.orangeSoft, padding: "2px 8px", borderRadius: 20 }}>
                              {p.status === "late" ? "En retard" : `+${daysLate}j`}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: C.textSoft, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.caption || "Sans caption"}</p>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>📅 {p.date ? new Date(p.date).toLocaleDateString("fr-FR") : "Pas de date"}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* CALENDAR */}
          {tab === "calendar" && !isClient && (
            <div style={{ animation: "fadeIn .3s ease" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, marginBottom: 2 }}>Calendrier</h2>
                  {selClient && <p style={{ fontSize: 12, color: C.muted }}>{clients.find(c => c.id === selClient)?.name}</p>}
                </div>
                <button onClick={() => setShowAddRdv(true)} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.accent}, ${C.lavender})`, color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", boxShadow: `0 2px 8px ${C.accentGlow}` }}>
                  + Ajouter
                </button>
              </div>
              <CalendarView
                posts={visible}
                rdvs={selClient ? rdvs.filter(r => String(r.clientId) === String(selClient)) : rdvs}
                clients={clients}
                calSel={calSel}
                setCalSel={setCalSel}
                isClient={isClient}
                approve={approve}
                revise={revise}
                posts_all={posts}
              />
            </div>
          )}

          {tab === "calendar" && isClient && (
            <div style={{ animation: "fadeIn .3s ease" }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, marginBottom: 16 }}>Mon calendrier</h2>
              <CalendarView
                posts={visible}
                rdvs={[]}
                clients={clients}
                calSel={calSel}
                setCalSel={setCalSel}
                isClient={isClient}
                approve={approve}
                revise={revise}
                posts_all={posts}
              />
            </div>
          )}

          {/* POSTS */}
          {tab === "posts" && (
            <div style={{ animation: "fadeIn .3s ease" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22 }}>{isClient ? "Contenus à valider" : "Tous les posts"}</h2>
                {!isClient && selClient && (
                  <button onClick={() => setShowNewPost(true)} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.accent}, ${C.lavender})`, color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", boxShadow: `0 2px 8px ${C.accentGlow}`, display: "flex", alignItems: "center", gap: 6 }}>
                    + Nouveau post
                  </button>
                )}
              </div>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>{selClient ? clients.find(c => c.id === selClient)?.name : "Tous"}</p>
              {isClient && <div style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 16, backgroundColor: C.accentSoft, border: `1px solid ${C.accent}25`, fontSize: 12, color: C.textSoft }}>💡 <strong style={{ color: C.accent }}>Validez</strong> ou <strong style={{ color: C.accent }}>demandez une modification</strong>. Notification instantanée.</div>}
              {isClient ? (() => {
                const ORDER = ["late","pending_text","pending_visual","pending","revision","approved","published","draft"];
                const SECTIONS = [
                  { key: "urgent", label: "🔴 À traiter en urgence", statuses: ["late"], color: C.red },
                  { key: "validate", label: "🟡 En attente de ta validation", statuses: ["pending_text","pending_visual","pending"], color: "#F59E0B" },
                  { key: "revision", label: "🟠 Modifications demandées", statuses: ["revision"], color: C.orange },
                  { key: "approved", label: "✅ Validés ce mois-ci", statuses: ["approved","published"], color: C.green },
                  { key: "draft", label: "📝 Brouillons", statuses: ["draft"], color: C.muted },
                ];
                return (
                  <div>
                    {SECTIONS.map(sec => {
                      const secPosts = visible.filter(p => sec.statuses.includes(p.status)).sort((a,b) => a.day - b.day);
                      if (secPosts.length === 0) return null;
                      return (
                        <div key={sec.key} style={{ marginBottom: 28 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: sec.color }}>{sec.label}</span>
                            <span style={{ backgroundColor: sec.color + "20", color: sec.color, borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "1px 8px" }}>{secPosts.length}</span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
                            {secPosts.map(p => <PostCard key={p.id} post={p} client={clients.find(c => c.id === p.clientId)} isClient={isClient} onApprove={approve} onApproveVisual={approveVisual} onRevision={revise} onDelete={null} onAddComment={(id, text) => addComment(id, text, "client")} />)}
                          </div>
                        </div>
                      );
                    })}
                    {visible.length === 0 && <div style={{ textAlign: "center", padding: 50, color: C.muted }}><div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>Aucun post</div>}
                  </div>
                );
              })() : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
                    {visible.sort((a, b) => a.day - b.day).map(p => <PostCard key={p.id} post={p} client={clients.find(c => c.id === p.clientId)} isClient={isClient} onApprove={approve} onApproveVisual={approveVisual} onRevision={revise} onDelete={!isClient ? () => setConfirmDeletePost(p.id) : null} onEdit={!isClient ? (id) => setEditPostId(id) : null} onAddComment={(id, text) => addComment(id, text, "cm")} />)}
                  </div>
                  {visible.length === 0 && <div style={{ textAlign: "center", padding: 50, color: C.muted }}><div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>Aucun post</div>}
                </>
              )}
            </div>
          )}

          {/* STATS */}
          {tab === "stats" && (
            <div style={{ animation: "fadeIn .3s ease" }}>
              {selClient ? (() => {
                const sd = STATS_DATA[selClient];
                const cl = clients.find(c => c.id === selClient);
                if (!sd) return null;
                const maxReach = Math.max(...sd.monthly.map(m => m.reach));
                const maxFollowers = Math.max(...sd.monthly.map(m => m.followers));

                return (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                      {!isClient && <Avatar client={cl} size={28} />}
                      <div>
                        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22 }}>{isClient ? "Mes statistiques" : cl.name}</h2>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Données février 2026</div>
                      </div>
                    </div>

                    {/* KPI cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginBottom: 24 }}>
                      {[
                        { label: "Abonnés", value: sd.overview.followers.toLocaleString(), growth: sd.overview.followersGrowth, color: C.accent },
                        { label: "Portée", value: sd.overview.reach.toLocaleString(), growth: sd.overview.reachGrowth, color: C.purple },
                        { label: "Engagement", value: sd.overview.engagement + "%", growth: sd.overview.engagementGrowth, color: C.green, suffix: "pts" },
                        { label: "Impressions", value: sd.overview.impressions.toLocaleString(), color: C.blue },
                        { label: "Clics", value: sd.overview.clicks.toLocaleString(), color: C.gold },
                      ].map((kpi, i) => (
                        <div key={i} style={{ backgroundColor: C.card, borderRadius: 14, padding: "14px 16px", border: `1px solid ${C.border}`, transition: "all .2s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = kpi.color + "40"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
                          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: .8, textTransform: "uppercase", marginBottom: 4 }}>{kpi.label}</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                          {kpi.growth && <div style={{ fontSize: 10, color: C.green, marginTop: 4, fontWeight: 600 }}>↑ +{kpi.growth}{kpi.suffix || "%"} vs mois dernier</div>}
                        </div>
                      ))}
                    </div>

                    {/* Charts row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                      {/* Followers evolution */}
                      <div style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>Évolution abonnés</div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
                          {sd.monthly.map((m, i) => {
                            const h = (m.followers / maxFollowers) * 100;
                            return (
                              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                <span style={{ fontSize: 9, color: C.textSoft, fontWeight: 600 }}>{(m.followers / 1000).toFixed(1)}k</span>
                                <div style={{ width: "100%", height: h, borderRadius: 6, background: i === sd.monthly.length - 1 ? `linear-gradient(to top, ${C.accent}, ${C.lavender})` : C.bgLight, border: `1px solid ${i === sd.monthly.length - 1 ? C.accent + "30" : C.border}`, transition: "height .5s ease" }} />
                                <span style={{ fontSize: 9, color: "#4A9BB0" }}>{m.month}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Reach evolution */}
                      <div style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>Portée mensuelle</div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
                          {sd.monthly.map((m, i) => {
                            const h = (m.reach / maxReach) * 100;
                            return (
                              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                <span style={{ fontSize: 9, color: C.textSoft, fontWeight: 600 }}>{(m.reach / 1000).toFixed(1)}k</span>
                                <div style={{ width: "100%", height: h, borderRadius: 6, background: i === sd.monthly.length - 1 ? `linear-gradient(to top, ${C.purple}, ${C.lavender})` : C.bgLight, border: `1px solid ${i === sd.monthly.length - 1 ? C.purple + "30" : C.border}`, transition: "height .5s ease" }} />
                                <span style={{ fontSize: 9, color: "#4A9BB0" }}>{m.month}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* By network */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Par réseau</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                        {sd.byNetwork.map((n, i) => (
                          <div key={i} style={{ backgroundColor: C.card, borderRadius: 14, padding: 14, border: `1px solid ${C.border}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                              <NetIcon network={n.net} size={13} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <div><div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>Abonnés</div><div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{n.followers.toLocaleString()}</div></div>
                              <div><div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>Engagement</div><div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>{n.engagement}%</div></div>
                              <div><div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>Posts</div><div style={{ fontSize: 14, fontWeight: 600, color: C.textSoft }}>{n.posts}</div></div>
                              <div><div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>Meilleur créneau</div><div style={{ fontSize: 12, fontWeight: 600, color: C.textSoft }}>{n.bestDay} {n.bestHour}</div></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top posts */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Top posts du mois</div>
                      <div style={{ backgroundColor: C.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}` }}>
                        {sd.topPosts.map((tp, i) => (
                          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 80px 80px", gap: 8, padding: "10px 14px", fontSize: 12, alignItems: "center", backgroundColor: i % 2 === 0 ? C.card : C.bgLight, borderBottom: i < sd.topPosts.length - 1 ? `1px solid ${C.border}` : "none" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>{i + 1}</span>
                              <div>
                                <div style={{ fontWeight: 600, color: C.text }}>{tp.title}</div>
                                <div style={{ fontSize: 10, color: C.muted }}>{tp.type}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: "center" }}><NetIcon network={tp.net} size={10} /></div>
                            <div style={{ textAlign: "center", color: C.textSoft }}>{tp.reach.toLocaleString()}<div style={{ fontSize: 9, color: "#4A9BB0" }}>portée</div></div>
                            <div style={{ textAlign: "center", color: C.green, fontWeight: 600 }}>{tp.engagement}%<div style={{ fontSize: 9, color: "#4A9BB0" }}>engage.</div></div>
                            {/* Engagement bar */}
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <div style={{ flex: 1, height: 6, backgroundColor: C.bgLight, borderRadius: 3, overflow: "hidden", border: `1px solid ${C.border}` }}>
                                <div style={{ width: `${Math.min(tp.engagement * 12, 100)}%`, height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${C.accent}, ${C.lavender})` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Audience */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Audience</div>
                      <div style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 140 }}>
                            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Genre</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <div style={{ flex: 1, height: 8, backgroundColor: C.bgLight, borderRadius: 4, overflow: "hidden", border: `1px solid ${C.border}` }}>
                                <div style={{ width: `${sd.audience.women}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${C.accent}, ${C.lavender})` }} />
                              </div>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                              <span style={{ color: C.accent, fontWeight: 600 }}>♀ {sd.audience.women}%</span>
                              <span style={{ color: C.blue, fontWeight: 600 }}>♂ {sd.audience.men}%</span>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Tranche d'âge</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{sd.audience.age}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Top ville</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{sd.audience.topCity}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
              : !isClient ? (
                <div>
                  <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, marginBottom: 16 }}>Statistiques</h2>
                  <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Sélectionnez un client pour voir ses statistiques détaillées</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
                    {clients.map(cl => {
                      const sd = STATS_DATA[cl.id];
                      return (
                        <div key={cl.id} onClick={() => setSelClient(cl.id)} style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}`, cursor: "pointer", transition: "all .2s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = cl.color; e.currentTarget.style.transform = "translateY(-2px)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><Avatar client={cl} size={28} /><span style={{ fontWeight: 600, fontSize: 14 }}>{cl.name}</span></div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                            <div><div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: "uppercase" }}>Abonnés</div><div style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>{(sd.overview.followers / 1000).toFixed(1)}k</div><div style={{ fontSize: 10, color: C.green, fontWeight: 600 }}>↑ {sd.overview.followersGrowth}%</div></div>
                            <div><div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: "uppercase" }}>Portée</div><div style={{ fontSize: 18, fontWeight: 700, color: C.purple }}>{(sd.overview.reach / 1000).toFixed(1)}k</div><div style={{ fontSize: 10, color: C.green, fontWeight: 600 }}>↑ {sd.overview.reachGrowth}%</div></div>
                            <div><div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: "uppercase" }}>Engage.</div><div style={{ fontSize: 18, fontWeight: 700, color: C.green }}>{sd.overview.engagement}%</div><div style={{ fontSize: 10, color: C.green, fontWeight: 600 }}>↑ {sd.overview.engagementGrowth}pts</div></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : <div style={{ textAlign: "center", padding: 50, color: C.muted }}>Sélectionnez un client</div>}
            </div>
          )}

          {/* BILLING */}
          {tab === "billing" && (
            <div style={{ animation: "fadeIn .3s ease" }}>
              {selClient ? (() => {
                const invoices = factures[selClient] || [];
                const cl = clients.find(c => c.id === selClient);
                const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
                const totalPending = invoices.filter(i => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);

                return (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {!isClient && <Avatar client={cl} size={28} />}
                        <div>
                          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22 }}>{isClient ? "Mes factures" : `Facturation — ${cl.name}`}</h2>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Historique et suivi des paiements</div>
                        </div>
                      </div>
                      {!isClient && (
                        <button onClick={() => fire("📎 Facture déposée (simulation)")} style={{
                          padding: "9px 18px", borderRadius: 10, border: "none",
                          background: `linear-gradient(135deg, ${C.accent}, ${C.lavender})`,
                          color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer",
                          boxShadow: `0 2px 8px ${C.accentGlow}`, transition: "all .2s",
                        }}
                        onMouseEnter={e => e.target.style.transform = "translateY(-1px)"}
                        onMouseLeave={e => e.target.style.transform = "translateY(0)"}>
                          + Déposer une facture
                        </button>
                      )}
                    </div>

                    {/* Summary cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10, marginBottom: 24 }}>
                      <div style={{ backgroundColor: C.card, borderRadius: 14, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: .8, textTransform: "uppercase", marginBottom: 4 }}>Total facturé</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: C.text }}>{(totalPaid + totalPending).toLocaleString()} €</div>
                      </div>
                      <div style={{ backgroundColor: C.card, borderRadius: 14, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: .8, textTransform: "uppercase", marginBottom: 4 }}>Payé</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: C.green }}>{totalPaid.toLocaleString()} €</div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{invoices.filter(i => i.status === "paid").length} facture{invoices.filter(i => i.status === "paid").length > 1 ? "s" : ""}</div>
                      </div>
                      <div style={{ backgroundColor: C.card, borderRadius: 14, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: .8, textTransform: "uppercase", marginBottom: 4 }}>En attente</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: totalPending > 0 ? C.gold : C.green }}>{totalPending.toLocaleString()} €</div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{invoices.filter(i => i.status !== "paid").length} facture{invoices.filter(i => i.status !== "paid").length > 1 ? "s" : ""}</div>
                      </div>
                    </div>

                    {/* Invoices list */}
                    <div style={{ backgroundColor: C.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}` }}>
                      <div style={{ display: "grid", gridTemplateColumns: "100px 2fr 1.2fr 90px 90px 80px", gap: 6, padding: "9px 14px", fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: .8, textTransform: "uppercase", backgroundColor: C.bgLight, borderBottom: `1px solid ${C.border}` }}>
                        <span>N° facture</span><span>Description</span><span>Période</span><span style={{ textAlign: "right" }}>Montant</span><span style={{ textAlign: "center" }}>Statut</span><span style={{ textAlign: "center" }}>Action</span>
                      </div>
                      {invoices.sort((a, b) => new Date(b.date) - new Date(a.date)).map((inv, i) => {
                        const st = INV_STATUS[inv.status];
                        return (
                          <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "100px 2fr 1.2fr 90px 90px 80px", gap: 6, padding: "11px 14px", fontSize: 12, alignItems: "center", backgroundColor: i % 2 === 0 ? C.card : C.bgLight, borderBottom: `1px solid ${C.border}` }}>
                            <span style={{ fontWeight: 600, color: C.accent, fontSize: 11 }}>{inv.id}</span>
                            <div>
                              <div style={{ fontWeight: 500, color: C.text }}>{inv.description}</div>
                              <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                                Émise le {new Date(inv.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                                {inv.paidDate && <> · Payée le {new Date(inv.paidDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</>}
                              </div>
                            </div>
                            <span style={{ color: C.textSoft }}>{inv.period}</span>
                            <span style={{ textAlign: "right", fontWeight: 700, color: C.text }}>{inv.amount.toLocaleString()} €</span>
                            <div style={{ textAlign: "center" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, color: st.color, backgroundColor: st.bg, border: `1px solid ${st.color}20` }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: st.color, animation: inv.status === "overdue" ? "pulse 1.5s infinite" : "none" }} />
                                {st.label}
                              </span>
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <button onClick={() => fire(`📄 Téléchargement ${inv.id} (simulation)`)} style={{
                                padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`,
                                backgroundColor: "transparent", color: C.accent, fontSize: 10,
                                fontWeight: 600, cursor: "pointer", transition: "all .15s",
                              }}
                              onMouseEnter={e => { e.target.style.backgroundColor = C.accentSoft; e.target.style.borderColor = C.accent + "40"; }}
                              onMouseLeave={e => { e.target.style.backgroundColor = "transparent"; e.target.style.borderColor = C.border; }}>
                                ↓ PDF
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Upload zone CM only */}
                    {!isClient && (
                      <div style={{ marginTop: 20, padding: 24, borderRadius: 14, border: `2px dashed ${C.accent}30`, backgroundColor: C.accentSoft, textAlign: "center", cursor: "pointer", transition: "all .2s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent + "60"; e.currentTarget.style.backgroundColor = C.accent + "08"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.accent + "30"; e.currentTarget.style.backgroundColor = C.accentSoft; }}
                        onClick={() => fire("📎 Zone de dépôt — connecter à Airtable (simulation)")}>
                        <div style={{ fontSize: 28, marginBottom: 8, opacity: .5 }}>📎</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.accent, marginBottom: 4 }}>Déposer une facture</div>
                        <div style={{ fontSize: 11, color: C.muted }}>Glissez un PDF ici ou cliquez pour sélectionner un fichier</div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>Le client sera notifié automatiquement par email</div>
                      </div>
                    )}

                    {/* Info client */}
                    {isClient && (
                      <div style={{ marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: C.accentSoft, border: `1px solid ${C.accent}20` }}>
                        <div style={{ fontSize: 12, color: C.textSoft }}>
                          💡 Cliquez sur <strong style={{ color: C.accent }}>↓ PDF</strong> pour télécharger une facture. Pour toute question, contactez votre CM directement.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
              : !isClient ? (
                <div>
                  <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, marginBottom: 16 }}>Facturation</h2>
                  <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Vue d'ensemble par client</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
                    {clients.map(cl => {
                      const invoices = factures[cl.id] || [];
                      const paid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
                      const pending = invoices.filter(i => i.status !== "paid").reduce((s, i) => s + i.amount, 0);
                      const hasOverdue = invoices.some(i => i.status === "overdue");
                      return (
                        <div key={cl.id} onClick={() => setSelClient(cl.id)} style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, border: `1px solid ${hasOverdue ? C.red + "40" : C.border}`, cursor: "pointer", transition: "all .2s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = cl.color; e.currentTarget.style.transform = "translateY(-2px)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = hasOverdue ? C.red + "40" : C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                            <Avatar client={cl} size={28} />
                            <div>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{cl.name}</span>
                              {hasOverdue && <div style={{ fontSize: 10, color: C.red, fontWeight: 600 }}>⚠ Facture en retard</div>}
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div><div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: "uppercase" }}>Payé</div><div style={{ fontSize: 18, fontWeight: 700, color: C.green }}>{paid.toLocaleString()} €</div></div>
                            <div><div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: "uppercase" }}>En attente</div><div style={{ fontSize: 18, fontWeight: 700, color: pending > 0 ? C.gold : C.green }}>{pending.toLocaleString()} €</div></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : <div style={{ textAlign: "center", padding: 50, color: C.muted }}>Sélectionnez un client</div>}
            </div>
          )}

          {/* STRATEGY */}
          {tab === "strategy" && (
            <div style={{ maxWidth: 660, animation: "fadeIn .3s ease" }}>
              {selClient ? <StrategyPanel strategy={strategies[selClient]} isClient={isClient} onSuggest={() => fire("💬 Suggestion envoyée")} />
              : <div><h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, marginBottom: 16 }}>Stratégies</h2>
                <div style={{ display: "grid", gap: 12 }}>
                  {clients.map(cl => (
                    <div key={cl.id} onClick={() => setSelClient(cl.id)} style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}`, cursor: "pointer", transition: "all .2s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = cl.color} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><Avatar client={cl} size={28} /><span style={{ fontWeight: 600, fontSize: 14 }}>{cl.name}</span></div>
                      <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{strategies[cl.id]?.objective}</p>
                    </div>
                  ))}
                </div></div>}
            </div>
          )}

          {/* RDV */}
          {tab === "rdv" && !isClient && (
            <div style={{ animation: "fadeIn .3s ease" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22 }}>Rendez-vous</h2>
                  <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Appels, visios et bilans clients</p>
                </div>
                <button onClick={() => { setShowAddRdv(!showAddRdv); if (!newRdv.clientId && clients.length) setNewRdv(r => ({...r, clientId: clients[0].id})); }} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.accent}, ${C.lavender})`, color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", boxShadow: `0 2px 8px ${C.accentGlow}` }}>
                  + Nouveau RDV
                </button>
              </div>

              {showAddRdv && (
                <div style={{ backgroundColor: C.card, borderRadius: 14, padding: 18, marginBottom: 20, border: `1px solid ${C.accent}30` }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 14 }}>Nouveau rendez-vous</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <input value={newRdv.title} onChange={e => setNewRdv(r => ({...r, title: e.target.value}))} placeholder="Titre du RDV *" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: C.bgLight, color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <select value={newRdv.clientId} onChange={e => setNewRdv(r => ({...r, clientId: e.target.value}))} style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: C.bgLight, color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none" }}>
                      <option value="">— Client —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={newRdv.type} onChange={e => setNewRdv(r => ({...r, type: e.target.value}))} style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: C.bgLight, color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none" }}>
                      {Object.entries(RDV_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                    <input type="date" value={newRdv.date} onChange={e => setNewRdv(r => ({...r, date: e.target.value}))} style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: C.bgLight, color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
                    <input type="time" value={newRdv.time} onChange={e => setNewRdv(r => ({...r, time: e.target.value}))} style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: C.bgLight, color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
                    <input value={newRdv.duration} onChange={e => setNewRdv(r => ({...r, duration: e.target.value}))} placeholder="Durée (ex: 1h30)" style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: C.bgLight, color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
                    <input value={newRdv.location} onChange={e => setNewRdv(r => ({...r, location: e.target.value}))} placeholder="Lieu / Visio / Téléphone" style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: C.bgLight, color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
                    <div style={{ gridColumn: "1 / -1" }}>
                      <textarea value={newRdv.notes} onChange={e => setNewRdv(r => ({...r, notes: e.target.value}))} placeholder="Notes (ordre du jour, points à aborder...)" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: C.bgLight, color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 56, boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={addRdv} style={{ padding: "8px 18px", borderRadius: 8, border: "none", backgroundColor: C.accent, color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Ajouter</button>
                    <button onClick={() => setShowAddRdv(false)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontSize: 12, cursor: "pointer" }}>Annuler</button>
                  </div>
                </div>
              )}

              {/* Prochains RDVs */}
              {(() => {
                const today = new Date().toISOString().split("T")[0];
                const upcoming = rdvs.filter(r => r.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
                const past = rdvs.filter(r => r.date < today).sort((a, b) => b.date.localeCompare(a.date));
                const RdvRow = ({ r, isPast }) => {
                  const cl = clients.find(c => String(c.id) === String(r.clientId));
                  const rt = RDV_TYPES[r.type] || RDV_TYPES.call;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderBottom: `1px solid ${C.border}`, opacity: isPast ? 0.55 : 1 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: rt.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{rt.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.title}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                          {cl && <><span style={{ fontWeight: 600, color: cl.color }}>{cl.name}</span> · </>}
                          {r.date.split("-").reverse().join("/")} à {r.time} · {r.duration}
                          {r.location && <> · <span style={{ color: C.accent }}>{r.location}</span></>}
                        </div>
                        {r.notes && <div style={{ fontSize: 10, color: C.muted, marginTop: 2, fontStyle: "italic" }}>{r.notes}</div>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: rt.color, backgroundColor: rt.color + "15", padding: "2px 8px", borderRadius: 20, border: `1px solid ${rt.color}25`, whiteSpace: "nowrap" }}>{rt.label}</span>
                        <button onClick={() => delRdv(r.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 15, padding: "2px 5px", borderRadius: 6, lineHeight: 1 }}>×</button>
                      </div>
                    </div>
                  );
                };
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {upcoming.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>À venir</div>
                        <div style={{ backgroundColor: C.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}` }}>
                          {upcoming.map(r => <RdvRow key={r.id} r={r} isPast={false} />)}
                        </div>
                      </div>
                    )}
                    {past.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Passés</div>
                        <div style={{ backgroundColor: C.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}` }}>
                          {past.map(r => <RdvRow key={r.id} r={r} isPast={true} />)}
                        </div>
                      </div>
                    )}
                    {rdvs.length === 0 && <div style={{ textAlign: "center", padding: 50, color: C.muted }}><div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>Aucun RDV planifié</div>}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ASSISTANT IA */}
          {tab === "assistant" && !isClient && (
            <div style={{ animation: "fadeIn .3s ease", display: "flex", flexDirection: "column", height: "calc(100vh - 160px)" }}>
              <div style={{ marginBottom: 14 }}>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, marginBottom: 4 }}>Assistante IA</h2>
                <p style={{ fontSize: 12, color: C.muted }}>Idées de contenu, captions, stratégies, planning — demande-moi tout !</p>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                {["💡 Idées posts Instagram", "📝 Caption pour TikTok", "📊 Stratégie de la semaine", "🎯 Meilleurs hashtags", "⏰ Meilleurs créneaux"].map(q => (
                  <button key={q} onClick={() => setAiIn(q)} style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${C.border}`, backgroundColor: C.accentSoft, color: C.accent, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{q}</button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "4px 0", marginBottom: 12 }}>
                {aiMsgs.map((msg, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                    <div style={{ maxWidth: "82%", padding: "11px 14px", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", backgroundColor: msg.role === "user" ? C.accent : C.card, color: msg.role === "user" ? "#fff" : C.text, fontSize: 12, lineHeight: 1.65, border: msg.role === "user" ? "none" : `1px solid ${C.border}`, whiteSpace: "pre-wrap", animation: "fadeIn .25s ease" }}>
                      {msg.role === "assistant" && <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, marginBottom: 5, letterSpacing: 0.5 }}>✦ ASSISTANTE CM</div>}
                      {msg.content}
                    </div>
                  </div>
                ))}
                {aiLoad && (
                  <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
                    <div style={{ padding: "11px 16px", borderRadius: "14px 14px 14px 4px", backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, marginBottom: 5 }}>✦ ASSISTANTE CM</div>
                      <span style={{ color: C.accent, animation: "pulse 1.5s infinite", fontSize: 16 }}>✦ ✦ ✦</span>
                    </div>
                  </div>
                )}
                <div ref={chatRef} />
              </div>
              <div style={{ display: "flex", gap: 8, backgroundColor: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 10 }}>
                <input value={aiIn} onChange={e => setAiIn(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendAI()} placeholder="Demande une idée de post, une caption, une stratégie..." style={{ flex: 1, background: "transparent", border: "none", color: C.text, fontSize: 12, outline: "none", fontFamily: "inherit" }} />
                <button onClick={sendAI} disabled={aiLoad || !aiIn.trim()} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: aiLoad || !aiIn.trim() ? C.border : `linear-gradient(135deg, ${C.accent}, ${C.lavender})`, color: "#fff", fontWeight: 600, fontSize: 12, cursor: aiLoad || !aiIn.trim() ? "default" : "pointer", opacity: aiLoad || !aiIn.trim() ? 0.5 : 1, transition: "all .15s" }}>
                  Envoyer →
                </button>
              </div>
            </div>
          )}

          {/* POMODORO */}
          {tab === "pomodoro" && !isClient && (
            <div style={{ animation: "fadeIn .3s ease", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 30 }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, marginBottom: 4 }}>Pomodoro</h2>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 36 }}>Focus 25 min · Pause 5 min · Répète</p>
              <div style={{ position: "relative", marginBottom: 32 }}>
                <svg width={240} height={240} style={{ transform: "rotate(-90deg)" }}>
                  <circle cx={120} cy={120} r={104} fill="none" stroke={C.border} strokeWidth={12} />
                  <circle cx={120} cy={120} r={104} fill="none"
                    stroke={pMode === "work" ? C.accent : "#4A9E62"} strokeWidth={12} strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 104}
                    strokeDashoffset={2 * Math.PI * 104 * (1 - pTime / (pMode === "work" ? 25 * 60 : 5 * 60))}
                    style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 8px ${pMode === "work" ? C.accentGlow : "#4A9E6240"})` }} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>{pMode === "work" ? "⚡ Focus" : "☕ Pause"}</div>
                  <div style={{ fontSize: 46, fontWeight: 700, color: pMode === "work" ? C.accent : "#4A9E62", fontFamily: "'Playfair Display',serif", lineHeight: 1 }}>{fmtSecs(pTime)}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Session #{pCount + 1}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
                <button onClick={() => setPRun(r => !r)} style={{ padding: "12px 32px", borderRadius: 14, border: pRun ? `2px solid ${C.accent}` : "none", background: pRun ? "transparent" : `linear-gradient(135deg, ${C.accent}, ${C.lavender})`, color: pRun ? C.accent : "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: pRun ? "none" : `0 4px 16px ${C.accentGlow}`, fontFamily: "'DM Sans',sans-serif", transition: "all .2s" }}>
                  {pRun ? "⏸ Pause" : "▶ Démarrer"}
                </button>
                <button onClick={() => { setPRun(false); setPTime(25 * 60); setPMode("work"); }} style={{ padding: "12px 20px", borderRadius: 14, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontWeight: 600, fontSize: 15, cursor: "pointer" }}>↺ Reset</button>
              </div>
              <div style={{ backgroundColor: C.card, borderRadius: 16, padding: "18px 24px", border: `1px solid ${C.border}`, textAlign: "center", minWidth: 320 }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 }}>Sessions complétées</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 12 }}>
                  {Array.from({ length: 8 }, (_, i) => (
                    <div key={i} style={{ width: 26, height: 26, borderRadius: 8, background: i < pCount ? `linear-gradient(135deg, ${C.accent}, ${C.lavender})` : C.bgLight, border: `1px solid ${i < pCount ? C.accent + "40" : C.border}`, boxShadow: i < pCount ? `0 2px 8px ${C.accentGlow}` : "none", transition: "all .3s" }} />
                  ))}
                </div>
                <div style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{pCount} pomodoros · ~{pCount * 25} min de focus</div>
              </div>
            </div>
          )}

          {/* WORKFLOWS */}
          {tab === "workflows" && !isClient && (
            <div style={{ animation: "fadeIn .3s ease" }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, marginBottom: 16 }}>Relances clients</h2>
              <div style={{ backgroundColor: C.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 2fr 60px", gap: 6, padding: "8px 12px", fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: .8, textTransform: "uppercase", backgroundColor: C.bgLight, borderBottom: `1px solid ${C.border}` }}>
                  <span>Workflow</span><span>Trigger</span><span>Condition</span><span>Action</span><span>Statut</span>
                </div>
                {N8N_WORKFLOWS.map((w, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 2fr 60px", gap: 6, padding: "9px 12px", fontSize: 11, alignItems: "center", backgroundColor: i % 2 === 0 ? C.card : C.bgLight, borderBottom: `1px solid ${C.border}`, color: C.textSoft }}>
                    <span style={{ fontWeight: 600, color: C.text }}>{w.name}</span><span style={{ color: C.muted }}>{w.trigger}</span><span style={{ color: C.muted }}>{w.condition}</span><span>{w.action}</span>
                    <span style={{ padding: "2px 6px", borderRadius: 10, fontSize: 9, fontWeight: 600, backgroundColor: C.greenSoft, color: C.green, textAlign: "center", border: `1px solid ${C.green}20` }}>Actif</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: C.purpleSoft, border: `1px solid ${C.purple}25` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.purple, marginBottom: 4 }}>💡 Comment ça marche</div>
                <div style={{ fontSize: 11, lineHeight: 1.8, color: C.textSoft }}><strong style={{ color: C.text }}>0-48h</strong> Attente<br /><strong style={{ color: C.text }}>48h</strong> Email doux<br /><strong style={{ color: C.text }}>72h</strong> Urgence + Telegram CM<br /><strong style={{ color: C.text }}>J-1</strong> Alerte rouge<br /><strong style={{ color: C.text }}>Validation</strong> Notif instantanée</div>
              </div>
            </div>
          )}

          {/* SCHEMA */}
          {tab === "schema" && !isClient && (
            <div style={{ animation: "fadeIn .3s ease" }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, marginBottom: 16 }}>Base Airtable</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
                {AIRTABLE.map((t, i) => (
                  <div key={i} style={{ backgroundColor: C.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}` }}>
                    <div style={{ padding: "10px 14px", background: `linear-gradient(135deg, ${t.color}, ${t.color}88)`, color: "#fff", fontWeight: 700, fontSize: 13 }}>🗄️ {t.table}</div>
                    <div style={{ padding: "10px 14px" }}>
                      {t.fields.map((f, j) => <div key={j} style={{ padding: "4px 0", fontSize: 11, color: C.textSoft, borderBottom: j < t.fields.length - 1 ? `1px solid ${C.border}` : "none" }}>• {f}</div>)}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: C.goldSoft, border: `1px solid ${C.gold}25` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.gold, marginBottom: 6 }}>🔗 Connexions</div>
                <div style={{ fontSize: 11, lineHeight: 1.8, color: C.textSoft }}><strong style={{ color: C.text }}>Airtable</strong> source de vérité<br /><strong style={{ color: C.text }}>Softr</strong> portail client<br /><strong style={{ color: C.text }}>n8n</strong> automatisations<br /><strong style={{ color: C.text }}>Telegram/Email</strong> notifications</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CONFIRMATION SUPPRESSION POST */}
      {confirmDeletePost && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, animation: "fadeIn .2s ease" }}>
          <div style={{ backgroundColor: C.card, borderRadius: 20, padding: 28, width: 360, boxShadow: "0 20px 60px rgba(0,0,0,.15)", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗑</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Supprimer ce post ?</h3>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>
              Cette action est irréversible.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDeletePost(null)} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: `1.5px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Annuler</button>
              <button onClick={handleDeletePost} disabled={saving} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", backgroundColor: C.red, color: "#fff", fontWeight: 700, fontSize: 13, cursor: saving ? "wait" : "pointer" }}>
                {saving ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION SUPPRESSION */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, animation: "fadeIn .2s ease" }}>
          <div style={{ backgroundColor: C.card, borderRadius: 20, padding: 28, width: 360, boxShadow: "0 20px 60px rgba(0,0,0,.15)", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗑</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Supprimer ce client ?</h3>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>
              <strong style={{ color: C.text }}>{clients.find(c => c.id === confirmDelete)?.name}</strong> et tous ses posts seront supprimés. Cette action est irréversible.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: `1.5px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Annuler</button>
              <button onClick={handleDeleteClient} disabled={saving} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", backgroundColor: C.red, color: "#fff", fontWeight: 700, fontSize: 13, cursor: saving ? "wait" : "pointer" }}>
                {saving ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOUVEAU CLIENT */}
      {showNewClient && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, animation: "fadeIn .2s ease" }} onClick={() => setShowNewClient(false)}>
          <div style={{ backgroundColor: C.card, borderRadius: 20, padding: 28, width: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.15)", animation: "fadeIn .2s ease" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, marginBottom: 4 }}>Nouveau client</h3>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>Un email d'invitation sera envoyé automatiquement.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Entreprise */}
              <div style={{ padding: "12px 14px", borderRadius: 12, backgroundColor: C.bgLight, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>🏢 Entreprise</div>
                <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Nom de l'entreprise *</label>
                <input value={newClient.name} onChange={e => setNewClient(n => ({...n, name: e.target.value}))} placeholder="Ex: Café Lumière"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, backgroundColor: C.card, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
              </div>

              {/* Correspondant */}
              <div style={{ padding: "12px 14px", borderRadius: 12, backgroundColor: C.bgLight, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>👤 Correspondant <span style={{ fontWeight: 400, color: C.muted }}>(facultatif)</span></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Prénom</label>
                    <input value={newClient.prenom} onChange={e => setNewClient(n => ({...n, prenom: e.target.value}))} placeholder="Marie"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, backgroundColor: C.card, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Nom</label>
                    <input value={newClient.nom} onChange={e => setNewClient(n => ({...n, nom: e.target.value}))} placeholder="Dupont"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, backgroundColor: C.card, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div style={{ padding: "12px 14px", borderRadius: 12, backgroundColor: C.bgLight, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>📬 Contact & accès</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Email * <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(identifiant de connexion)</span></label>
                    <input value={newClient.email} onChange={e => setNewClient(n => ({...n, email: e.target.value}))} placeholder="client@email.com" type="email"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, backgroundColor: C.card, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Mot de passe * <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(à communiquer au client)</span></label>
                    <input value={newClient.motDePasse} onChange={e => setNewClient(n => ({...n, motDePasse: e.target.value}))} placeholder="Ex: Lumiere2026!"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, backgroundColor: C.card, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                    <p style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>💡 Conseillé : nom du client + année + caractère spécial</p>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Téléphone</label>
                    <input value={newClient.telephone} onChange={e => setNewClient(n => ({...n, telephone: e.target.value}))} placeholder="+33 6 00 00 00 00" type="tel"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, backgroundColor: C.card, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Adresse</label>
                    <input value={newClient.adresse} onChange={e => setNewClient(n => ({...n, adresse: e.target.value}))} placeholder="12 rue des Fleurs, 75001 Paris"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, backgroundColor: C.card, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                  </div>
                </div>
              </div>

              {/* Réseaux & couleur */}
              <div style={{ padding: "12px 14px", borderRadius: 12, backgroundColor: C.bgLight, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>🎨 Identité portail</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Réseaux actifs</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["Instagram","Facebook","LinkedIn","TikTok"].map(r => (
                      <button key={r} onClick={() => setNewClient(n => ({ ...n, reseaux: n.reseaux.includes(r) ? n.reseaux.filter(x => x !== r) : [...n.reseaux, r] }))}
                        style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${newClient.reseaux.includes(r) ? C.accent : C.border}`, backgroundColor: newClient.reseaux.includes(r) ? C.accentSoft : "transparent", color: newClient.reseaux.includes(r) ? C.accent : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Couleur avatar</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["#2A8FA8","#4A9E62","#C8A06A","#D4886B","#5B8EC4","#1E6E84","#D45B5B","#7CCFDF","#9B59B6","#E67E22"].map(col => (
                      <button key={col} onClick={() => setNewClient(n => ({...n, color: col}))}
                        style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: col, border: newClient.color === col ? `3px solid ${C.text}` : "3px solid transparent", cursor: "pointer", transition: "border .15s" }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={handleCreateClient} disabled={saving || !newClient.name.trim() || !newClient.email.trim() || !newClient.motDePasse.trim()} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.accent}, ${C.lavender})`, color: "#fff", fontWeight: 700, fontSize: 13, cursor: saving ? "wait" : "pointer", opacity: (!newClient.name.trim() || !newClient.email.trim() || !newClient.motDePasse.trim()) ? .5 : 1 }}>
                {saving ? "Création..." : "✅ Créer le client"}
              </button>
              <button onClick={() => setShowNewClient(false)} style={{ padding: "11px 18px", borderRadius: 12, border: `1.5px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Annuler</button>
            </div>
            <p style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 10 }}>Le compte sera créé immédiatement. Communiquez l'email et le mot de passe au client.</p>
          </div>
        </div>
      )}

      {/* MODAL NOUVEAU POST */}
      {showNewPost && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, animation: "fadeIn .2s ease" }} onClick={() => { setShowNewPost(false); setImgPreview(null); }}>
          <div style={{ backgroundColor: C.card, borderRadius: 20, padding: 28, width: 460, boxShadow: "0 20px 60px rgba(0,0,0,.15)", animation: "fadeIn .2s ease" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, marginBottom: 6 }}>Nouveau post</h3>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>Client : <strong style={{ color: C.text }}>{clients.find(c => c.id === selClient)?.name}</strong></p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 5 }}>Réseau</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["instagram","facebook","linkedin"].map(r => (
                    <button key={r} onClick={() => setNewPost(p => ({...p, network: r}))} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${newPost.network === r ? C.accent : C.border}`, backgroundColor: newPost.network === r ? C.accentSoft : "transparent", color: newPost.network === r ? C.accent : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      {NETWORKS[r].icon} {NETWORKS[r].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 5 }}>Type de contenu</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {Object.entries(CONTENT_TYPES).map(([k, v]) => (
                    <button key={k} onClick={() => setNewPost(p => ({...p, contentType: k}))} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${newPost.contentType === k ? C.accent : C.border}`, backgroundColor: newPost.contentType === k ? C.accentSoft : "transparent", color: newPost.contentType === k ? C.accent : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      {v.icon} {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 5 }}>Date de publication</label>
                <input value={newPost.date} onChange={e => setNewPost(p => ({...p, date: e.target.value}))} type="date" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, backgroundColor: C.bgLight, boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 5 }}>Caption *</label>
                <textarea value={newPost.caption} onChange={e => setNewPost(p => ({...p, caption: e.target.value}))} placeholder="Texte du post..." rows={4} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, backgroundColor: C.bgLight, boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 5 }}>Visuel</label>
                {imgPreview && <img src={imgPreview} alt="preview" style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 10, marginBottom: 8, border: `1px solid ${C.border}` }} />}
                <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 0", borderRadius: 10, border: `2px dashed ${uploading ? C.accent : C.border}`, backgroundColor: uploading ? C.accentSoft : C.bgLight, cursor: "pointer", fontSize: 12, color: uploading ? C.accent : C.muted, fontWeight: 600, transition: "all .2s" }}>
                  <input type="file" accept="image/*" onChange={e => e.target.files[0] && handleImageUpload(e.target.files[0])} style={{ display: "none" }} />
                  {uploading ? "⏳ Upload en cours..." : imgPreview ? "🔄 Changer l'image" : "📁 Choisir une image"}
                </label>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 5 }}>Statut initial</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["draft","pending_text","pending_visual"].map(s => (
                    <button key={s} onClick={() => setNewPost(p => ({...p, status: s}))} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${newPost.status === s ? STATUSES[s].color : C.border}`, backgroundColor: newPost.status === s ? STATUSES[s].bg : "transparent", color: newPost.status === s ? STATUSES[s].color : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      {STATUSES[s].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={handleCreatePost} disabled={saving || !newPost.caption.trim()} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.accent}, ${C.lavender})`, color: "#fff", fontWeight: 700, fontSize: 13, cursor: saving ? "wait" : "pointer", opacity: !newPost.caption.trim() ? .5 : 1 }}>
                {saving ? "Création..." : "Créer le post"}
              </button>
              <button onClick={() => { setShowNewPost(false); setImgPreview(null); }} style={{ padding: "11px 18px", borderRadius: 12, border: `1.5px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT POST CM */}
      {editPostId && (() => {
        const ep = posts.find(p => p.id === editPostId);
        if (!ep) return null;
        return (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ backgroundColor: C.card, borderRadius: 20, padding: 24, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>✏️ Modifier le post</h3>
                <button onClick={() => setEditPostId(null)} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: C.muted }}>✕</button>
              </div>
              <EditPostForm post={ep} onSave={(fields) => { updatePost(ep.id, fields); setEditPostId(null); }} onCancel={() => setEditPostId(null)} />
            </div>
          </div>
        );
      })()}

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", padding: "11px 20px", borderRadius: 12, backgroundColor: toast.type === "rev" ? C.orange : C.green, color: "#fff", fontSize: 12, fontWeight: 500, boxShadow: "0 8px 24px rgba(0,0,0,.15)", animation: "toastIn .25s ease" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
