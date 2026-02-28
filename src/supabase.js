import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ggoqdgddsppxrrszqrkm.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnb3FkZ2Rkc3BweHJyc3pxcmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjk5ODIsImV4cCI6MjA4NzcwNTk4Mn0.AWeB0yEigRbYTqnI74QVkefSrFdIB8JkR2iidNp2ctc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ─── RÉCUPÈRE LES CREDENTIALS AIRTABLE DE LA CM CONNECTÉE ───
export async function getCMCredentials(userId) {
  const { data, error } = await supabase
    .from("cms")
    .select("airtable_api_key, airtable_base_id, name, plan")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function uploadImage(file) {
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
