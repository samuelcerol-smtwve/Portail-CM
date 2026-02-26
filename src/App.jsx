import { useState, useEffect, useMemo } from "react";
import { getClients, getPosts, getFactures, getStrategies, updatePostStatus } from "./airtable.js";

// ─── PALETTE (Garden-inspired: dark bg, warm coral/pink accents, organic feel) ───
const C = {
  bg: "#FFFFFF",
  bgLight: "#F8F6FB",
  card: "#FFFFFF",
  cardHover: "#FBF9FD",
  text: "#1A1A1A",
  textSoft: "#4A4550",
  muted: "#9590A0",
  border: "#E8E4F0",
  borderLight: "#D5D0E0",
  accent: "#A78BFA",
  accentSoft: "#A78BFA14",
  accentGlow: "#A78BFA35",
  gold: "#C8A06A",
  goldSoft: "#C8A06A12",
  green: "#4A9E62",
  greenSoft: "#4A9E6212",
  orange: "#D4886B",
  orangeSoft: "#D4886B12",
  red: "#D45B5B",
  redSoft: "#D45B5B12",
  purple: "#8B6EC0",
  purpleSoft: "#8B6EC012",
  blue: "#5B8EC4",
  blueSoft: "#5B8EC412",
  cream: "#F5F0E8",
  lavender: "#C4B5F0",
  lavenderSoft: "#C4B5F012",
};

const CLIENTS = [
  { id: 1, name: "Maison Soleil", initials: "MS", color: C.accent },
  { id: 2, name: "Café Indigo", initials: "CI", color: C.purple },
  { id: 3, name: "Flora & Co", initials: "FC", color: C.green },
  { id: 4, name: "Atelier Brume", initials: "AB", color: C.gold },
];

const STATUSES = {
  draft: { label: "Brouillon", color: C.muted, bg: "#3D365A44" },
  pending: { label: "En attente", color: C.gold, bg: C.goldSoft },
  revision: { label: "Modif demandée", color: C.orange, bg: C.orangeSoft },
  approved: { label: "Validé", color: C.green, bg: C.greenSoft },
  late: { label: "En retard", color: C.red, bg: C.redSoft },
  published: { label: "Publié", color: C.blue, bg: C.blueSoft },
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
function PostCard({ post, client, onApprove, onRevision, isClient }) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [imgLoaded, setImgLoaded] = useState(true);
  const canAct = isClient && (post.status === "pending" || post.status === "late");

  return (
    <div style={{ backgroundColor: C.card, borderRadius: 16, overflow: "hidden", border: `1px solid ${post.status === "late" ? C.red + "40" : C.border}`, transition: "all 0.25s", position: "relative" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,.06)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = C.borderLight; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = post.status === "late" ? C.red + "40" : C.border; }}>
      {imgLoaded && <img src={post.img} alt="" style={{ width: "100%", height: 175, objectFit: "cover", display: "block" }} onError={() => setImgLoaded(false)} />}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <NetIcon network={post.network} size={12} />
            {!isClient && client && <><span style={{ color: C.border }}>·</span><Avatar client={client} size={18} /><span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{client.name}</span></>}
          </div>
          <Badge status={post.status} small />
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>📅 {post.day} mars</div>
        <p style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.55, margin: "0 0 6px", whiteSpace: "pre-wrap", maxHeight: 60, overflow: "hidden" }}>{post.caption}</p>
        {post.hours > 0 && (post.status === "pending" || post.status === "late") && (
          <div style={{ fontSize: 10, color: post.hours > 72 ? C.red : C.muted, marginTop: 4, fontWeight: post.hours > 72 ? 600 : 400 }}>⏱ {post.hours}h{post.hours > 48 && " — relancé"}</div>
        )}
        {post.comments.length > 0 && (
          <div style={{ marginTop: 8, padding: "6px 8px", borderRadius: 8, backgroundColor: C.bgLight, fontSize: 11, color: C.textSoft, border: `1px solid ${C.border}` }}>
            <span style={{ fontWeight: 600, color: C.accent }}>💬</span> {post.comments[0].text}
            <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{post.comments[0].date}</div>
          </div>
        )}
        {canAct && (
          <div style={{ marginTop: 10 }}>
            {!showComment ? (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onApprove(post.id)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.green}, ${C.green}cc)`, color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "opacity .15s" }}
                  onMouseEnter={e => e.target.style.opacity = .85} onMouseLeave={e => e.target.style.opacity = 1}>✓ Valider</button>
                <button onClick={() => setShowComment(true)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1.5px solid ${C.accent}`, backgroundColor: "transparent", color: C.accent, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>✏️ Modifier</button>
              </div>
            ) : (
              <div>
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Votre demande..." style={{ width: "100%", boxSizing: "border-box", padding: 8, borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: C.bgLight, color: C.text, fontSize: 11, resize: "vertical", minHeight: 50, fontFamily: "inherit", outline: "none" }} />
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button onClick={() => { onRevision(post.id, comment); setShowComment(false); setComment(""); }} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", backgroundColor: C.accent, color: "#fff", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Envoyer</button>
                  <button onClick={() => setShowComment(false)} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>Annuler</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CALENDAR ───
function Calendar({ posts, onSelect, selectedId }) {
  const firstDay = new Date(2026, 2, 1).getDay();
  const daysInMonth = 31;
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const calDays = useMemo(() => { const d = []; for (let i = 0; i < offset; i++) d.push(null); for (let i = 1; i <= daysInMonth; i++) d.push(i); return d; }, []);
  const byDay = {}; posts.forEach(p => { if (!byDay[p.day]) byDay[p.day] = []; byDay[p.day].push(p); });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, marginBottom: 1 }}>
        {DAYS_LABELS.map(d => <div key={d} style={{ padding: "6px 0", textAlign: "center", fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, backgroundColor: C.border + "66", borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}` }}>
        {calDays.map((day, i) => {
          const dp = day ? (byDay[day] || []) : [];
          const isToday = day === 22;
          return (
            <div key={i} style={{ minHeight: 78, padding: 5, backgroundColor: day ? C.card : C.bgLight }}>
              {day && <>
                <div style={{ fontSize: 10, fontWeight: isToday ? 700 : 400, color: isToday ? "#fff" : (day < 22 ? C.text : C.muted), marginBottom: 3, ...(isToday ? { backgroundColor: C.accent, width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 } : {}) }}>{day}</div>
                {dp.map(p => (
                  <button key={p.id} onClick={() => onSelect(p.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 3, padding: "2px 4px", marginBottom: 1, borderRadius: 5, border: selectedId === p.id ? `1px solid ${C.accent}` : `1px solid transparent`, backgroundColor: selectedId === p.id ? C.accentSoft : STATUSES[p.status].bg, cursor: "pointer", fontSize: 9, color: C.text, textAlign: "left", transition: "all .1s" }}>
                    <Dot color={STATUSES[p.status].color} pulse={p.status === "late"} />
                    <span style={{ fontWeight: 500 }}>{NETWORKS[p.network].short}</span>
                  </button>
                ))}
              </>}
            </div>
          );
        })}
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

// ─── MAIN ───
export default function App() {
  const [viewMode, setViewMode] = useState("cm");
  const [tab, setTab] = useState("dashboard");
  const [selClient, setSelClient] = useState(null);
  const [posts, setPosts] = useState(POSTS);
  const [clients, setClients] = useState(CLIENTS);
  const [factures, setFactures] = useState(INVOICES);
  const [strategies, setStrategies] = useState(STRATEGIES);
  const [loading, setLoading] = useState(false);
  const [airtableReady, setAirtableReady] = useState(false);
  const [toast, setToast] = useState(null);
  const [calSel, setCalSel] = useState(null);

  // ─── CHARGER LES DONNÉES AIRTABLE (via proxy /api/airtable) ───
  useEffect(() => {
    setLoading(true);
    Promise.all([getClients(), getPosts(), getFactures(), getStrategies()])
      .then(([cls, psts, facts, strats]) => {
        if (cls.length > 0) setClients(cls);
        if (psts.length > 0) setPosts(psts);

        // Factures par clientId
        if (facts.length > 0) {
          const factsByClient = {};
          facts.forEach(f => { if (!factsByClient[f.clientId]) factsByClient[f.clientId] = []; factsByClient[f.clientId].push(f); });
          setFactures(factsByClient);
        }

        // Stratégies par clientId
        if (strats.length > 0) {
          const stratsByClient = {};
          strats.forEach(s => { stratsByClient[s.clientId] = s; });
          setStrategies(stratsByClient);
        }

        setAirtableReady(true);
      })
      .catch(err => { console.error("Airtable error:", err); fire("⚠️ Erreur connexion Airtable", "err"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t); } }, [toast]);
  const fire = (msg, type) => setToast({ msg, type });

  const approve = async (id) => {
    const post = posts.find(p => p.id === id);
    if (post?.airtableId && airtableReady) {
      await updatePostStatus(post.airtableId, "approved", "Validé ✓").catch(console.error);
    }
    setPosts(p => p.map(x => x.id === id ? { ...x, status: "approved", comments: [{ author: "client", text: "Validé ✓", date: "à l'instant" }] } : x));
    fire("✅ Post validé — CM notifiée");
  };

  const revise = async (id, c) => {
    const post = posts.find(p => p.id === id);
    if (post?.airtableId && airtableReady) {
      await updatePostStatus(post.airtableId, "revision", c || "Modification demandée").catch(console.error);
    }
    setPosts(p => p.map(x => x.id === id ? { ...x, status: "revision", comments: [{ author: "client", text: c || "Modification demandée", date: "à l'instant" }] } : x));
    fire("✏️ Demande envoyée", "rev");
  };

  const isClient = viewMode === "client";
  const filtered = posts.filter(p => selClient ? p.clientId === selClient : true);
  const visible = isClient ? filtered.filter(p => p.status !== "draft") : filtered;
  const stats = { total: posts.length, pending: posts.filter(p => p.status === "pending").length, late: posts.filter(p => p.status === "late").length, approved: posts.filter(p => p.status === "approved").length, revision: posts.filter(p => p.status === "revision").length };

  const findClient = (id) => clients.find(c => c.id === id || c.airtableId === id);
  const cmTabs = [{ id: "dashboard", icon: "📊", label: "Dashboard" }, { id: "calendar", icon: "📅", label: "Calendrier" }, { id: "posts", icon: "📋", label: "Posts" }, { id: "stats", icon: "📈", label: "Statistiques" }, { id: "billing", icon: "🧾", label: "Facturation" }, { id: "strategy", icon: "🎯", label: "Stratégie" }, { id: "workflows", icon: "🔔", label: "Relances clients" }, { id: "schema", icon: "🗄️", label: "Airtable" }];
  const clientTabs = [{ id: "calendar", icon: "📅", label: "Calendrier" }, { id: "posts", icon: "📋", label: "Contenus" }, { id: "stats", icon: "📈", label: "Statistiques" }, { id: "billing", icon: "🧾", label: "Factures" }, { id: "strategy", icon: "🎯", label: "Stratégie" }];
  const tabs = isClient ? clientTabs : cmTabs;

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
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: C.accent, boxShadow: `0 0 12px ${C.accentGlow}` }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: -0.5 }}>
            {isClient ? "Mon espace" : "petit bout de com"}
          </span>
          {isClient && selClient && <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>— {clients.find(c => c.id === selClient)?.name}</span>}
          {loading && <span style={{ fontSize: 10, color: C.muted, marginLeft: 8, animation: "pulse 1s infinite" }}>⟳ Chargement...</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, zIndex: 1 }}>
          <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: `1.5px solid ${C.border}` }}>
            {[{ id: "cm", label: "👩‍💻 CM" }, { id: "client", label: "👤 Client" }].map(v => (
              <button key={v.id} onClick={() => { setViewMode(v.id); if (v.id === "client" && !selClient) setSelClient(1); if (v.id === "cm") setTab("dashboard"); else setTab("calendar"); }} style={{ padding: "6px 14px", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all .2s", backgroundColor: viewMode === v.id ? C.accent : "transparent", color: viewMode === v.id ? "#fff" : C.muted }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 58px)" }}>
        {/* ─── SIDEBAR ─── */}
        <div style={{ width: 210, backgroundColor: C.bgLight, borderRight: `1px solid ${C.border}`, padding: "14px 0", flexShrink: 0 }}>
          <div style={{ marginBottom: 16 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setCalSel(null); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 18px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 600 : 400, backgroundColor: tab === t.id ? C.accentSoft : "transparent", color: tab === t.id ? C.accent : C.muted, borderLeft: tab === t.id ? `3px solid ${C.accent}` : "3px solid transparent", transition: "all .15s" }}>
                <span style={{ fontSize: 14 }}>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
          <div style={{ padding: "0 18px", fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 }}>{isClient ? "Simuler" : "Clients"}</div>
          {!isClient && <button onClick={() => setSelClient(null)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 18px", border: "none", cursor: "pointer", fontSize: 11, backgroundColor: !selClient ? C.card : "transparent", color: C.text, fontWeight: !selClient ? 600 : 400, borderRadius: 6 }}>Tous</button>}
          {clients.map(c => (
            <button key={c.id} onClick={() => setSelClient(c.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 18px", border: "none", cursor: "pointer", fontSize: 11, backgroundColor: selClient === c.id ? C.card : "transparent", color: C.text, fontWeight: selClient === c.id ? 600 : 400, borderRadius: 6, transition: "all .15s" }}>
              <Avatar client={c} size={22} /> {c.name}
            </button>
          ))}
          <div style={{ margin: "16px 14px 0", padding: 10, borderRadius: 10, backgroundColor: C.greenSoft, border: `1px solid ${C.green}25` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.green, letterSpacing: .5, marginBottom: 2 }}>🔔 Relances actives</div>
            <div style={{ fontSize: 10, color: C.textSoft }}>6 automatisations</div>
            <div style={{ fontSize: 9, color: C.muted }}>Relance : il y a 2h</div>
          </div>
        </div>

        {/* ─── MAIN ─── */}
        <div style={{ flex: 1, padding: 22, overflowY: "auto", maxHeight: "calc(100vh - 58px)" }}>

          {/* DASHBOARD */}
          {tab === "dashboard" && !isClient && (
            <div style={{ animation: "fadeIn .3s ease" }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, marginBottom: 18 }}>Bonjour 👋</h2>
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
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: C.textSoft }}>🔥 Urgents</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(255px,1fr))", gap: 12 }}>
                {posts.filter(p => p.status === "late" || (p.status === "pending" && p.hours > 48)).map(p => <PostCard key={p.id} post={p} client={clients.find(c => c.id === p.clientId)} isClient={false} onApprove={approve} onRevision={revise} />)}
              </div>
            </div>
          )}

          {/* CALENDAR */}
          {tab === "calendar" && (
            <div style={{ animation: "fadeIn .3s ease" }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, marginBottom: 4 }}>{isClient ? "Mon calendrier" : "Calendrier"}</h2>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Mars 2026{selClient && !isClient ? ` — ${clients.find(c => c.id === selClient)?.name}` : ""}</p>
              <div style={{ display: "flex", gap: 20 }}>
                <div style={{ flex: 1 }}><Calendar posts={visible} onSelect={setCalSel} selectedId={calSel} /></div>
                <div style={{ width: 290, flexShrink: 0 }}>
                  {calSel && (() => {
                    const p = posts.find(x => x.id === calSel); if (!p) return null;
                    const ca = isClient && (p.status === "pending" || p.status === "late");
                    return (
                      <div style={{ backgroundColor: C.card, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.border}`, animation: "fadeIn .2s ease" }}>
                        <img src={p.img} alt="" style={{ width: "100%", height: 190, objectFit: "cover", display: "block" }} onError={e => { e.target.style.display = "none"; }} />
                        <div style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}><span style={{ fontSize: 12, fontWeight: 600 }}>{p.day} mars</span><NetIcon network={p.network} size={11} /><Badge status={p.status} small /></div>
                          <p style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", color: C.textSoft, marginBottom: 10 }}>{p.caption}</p>
                          {p.comments.length > 0 && <div style={{ padding: "6px 8px", borderRadius: 8, backgroundColor: C.bgLight, fontSize: 11, color: C.textSoft, marginBottom: 10, border: `1px solid ${C.border}` }}><span style={{ color: C.accent }}>💬</span> {p.comments[0].text}</div>}
                          {ca && <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => { approve(p.id); setCalSel(null); }} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.green}, ${C.green}cc)`, color: "#fff", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>✓ Valider</button>
                            <button onClick={() => { revise(p.id, "Modification demandée"); setCalSel(null); }} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${C.accent}`, backgroundColor: "transparent", color: C.accent, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>✏️ Modifier</button>
                          </div>}
                          {p.status === "approved" && <div style={{ padding: "8px", borderRadius: 8, backgroundColor: C.greenSoft, fontSize: 11, color: C.green, fontWeight: 500, textAlign: "center", border: `1px solid ${C.green}20` }}>✓ Validé</div>}
                        </div>
                      </div>
                    );
                  })()}
                  {!calSel && <div style={{ backgroundColor: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 28, textAlign: "center" }}><div style={{ fontSize: 24, marginBottom: 8, opacity: .2 }}>📅</div><div style={{ fontSize: 12, color: C.muted }}>Cliquez sur un post</div></div>}
                </div>
              </div>
            </div>
          )}

          {/* POSTS */}
          {tab === "posts" && (
            <div style={{ animation: "fadeIn .3s ease" }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, marginBottom: 4 }}>{isClient ? "Contenus à valider" : "Tous les posts"}</h2>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>{selClient ? clients.find(c => c.id === selClient)?.name : "Tous"} — Mars 2026</p>
              {isClient && <div style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 16, backgroundColor: C.accentSoft, border: `1px solid ${C.accent}25`, fontSize: 12, color: C.textSoft }}>💡 <strong style={{ color: C.accent }}>Validez</strong> ou <strong style={{ color: C.accent }}>demandez une modification</strong>. Notification instantanée.</div>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
                {visible.sort((a, b) => a.day - b.day).map(p => <PostCard key={p.id} post={p} client={clients.find(c => c.id === p.clientId)} isClient={isClient} onApprove={approve} onRevision={revise} />)}
              </div>
              {visible.length === 0 && <div style={{ textAlign: "center", padding: 50, color: C.muted }}><div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>Aucun post</div>}
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
                                <span style={{ fontSize: 9, color: C.muted }}>{m.month}</span>
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
                                <span style={{ fontSize: 9, color: C.muted }}>{m.month}</span>
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
                            <div style={{ textAlign: "center", color: C.textSoft }}>{tp.reach.toLocaleString()}<div style={{ fontSize: 9, color: C.muted }}>portée</div></div>
                            <div style={{ textAlign: "center", color: C.green, fontWeight: 600 }}>{tp.engagement}%<div style={{ fontSize: 9, color: C.muted }}>engage.</div></div>
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

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", padding: "11px 20px", borderRadius: 12, backgroundColor: toast.type === "rev" ? C.orange : C.green, color: "#fff", fontSize: 12, fontWeight: 500, boxShadow: "0 8px 24px rgba(0,0,0,.15)", animation: "toastIn .25s ease" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
