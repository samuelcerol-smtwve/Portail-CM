# 🌸 Portail CM — Petit bout de com

Portail de suivi community management pour clients.  
Stack : **React 18 + Vite + Vercel**

---

## 🚀 Déploiement en 5 étapes

### 1. Cloner / créer le repo GitHub

```bash
git init
git add .
git commit -m "init: portail CM v1"
git remote add origin https://github.com/TON_USERNAME/portail-cm.git
git push -u origin main
```

### 2. Connecter à Vercel

1. Aller sur [vercel.com](https://vercel.com) → **Add New Project**
2. Importer le repo GitHub `portail-cm`
3. Framework : **Vite** (détecté automatiquement)
4. Cliquer **Deploy** ✅

### 3. Variables d'environnement (Vercel)

Dans Vercel > Settings > Environment Variables, ajouter :

| Variable | Valeur |
|---|---|
| `VITE_AIRTABLE_API_KEY` | Ta clé API Airtable |
| `VITE_AIRTABLE_BASE_ID` | L'ID de ta base Airtable |

### 4. Domaine personnalisé (optionnel)

Dans Vercel > Settings > Domains : ajouter `portail.petitboutdecom.fr`  
Puis ajouter l'enregistrement CNAME chez ton registrar (OVH etc.)

### 5. Mises à jour futures

```bash
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push
```
Vercel redéploie automatiquement à chaque push sur `main` 🎉

---

## 💻 Développement local

```bash
npm install
npm run dev
# → http://localhost:5173
```

---

## 📁 Structure du projet

```
portail-cm/
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx          # Composant principal
│   └── main.jsx         # Point d'entrée React
├── .env.example         # Variables d'env à configurer
├── .gitignore
├── index.html
├── package.json
├── vercel.json          # Config SPA routing
└── vite.config.js
```

---

## 🗄️ Base Airtable

Tables à créer :
- **Clients** — Nom, Email, Réseaux actifs, Couleur
- **Posts** — Client (lien), Réseau, Date, Caption, Visuels, Statut
- **Stratégie** — Client (lien), Période, Objectif, Piliers, KPIs
- **Historique** — Post (lien), Action, Auteur, Date
- **Relances** — Post (lien), Type, Date envoi, Réponse

---

## ⚙️ Automatisations n8n

Workflows à configurer dans n8n connecté à Airtable :
- Relance 48h → Email doux client
- Relance 72h → Email urgent + notif Telegram CM
- Alerte J-1 publication → Email + Telegram
- Validation post → Notif Telegram CM instantanée

---

*Fait avec 💜 pour petit bout de com*
