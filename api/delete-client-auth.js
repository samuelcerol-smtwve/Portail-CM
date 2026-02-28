import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requis" });

  try {
    // Trouver l'utilisateur par email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const user = users.find(u => u.email === email);
    if (!user) {
      // Pas de compte Supabase — pas grave, on continue
      return res.status(200).json({ deleted: false, message: "Aucun compte trouvé" });
    }

    // Supprimer le compte
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return res.status(200).json({ deleted: true });
  } catch (err) {
    console.error("Erreur suppression compte client:", err);
    return res.status(500).json({ error: err.message });
  }
}
