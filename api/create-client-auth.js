import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, password, clientName, airtableId } = req.body;

  if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });

  try {
    // Créer le compte avec email + mot de passe
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Pas besoin de confirmer l'email
      user_metadata: {
        client_name: clientName,
        airtable_id: airtableId,
        role: "client",
      },
    });

    if (error) throw error;

    return res.status(200).json({ userId: data.user.id });
  } catch (err) {
    console.error("Erreur création compte client:", err);
    return res.status(500).json({ error: err.message });
  }
}
