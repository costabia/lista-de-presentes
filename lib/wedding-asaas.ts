import { decryptSecret } from "@/lib/secretbox";
import { getSupabaseRest } from "@/lib/supabase-rest";

export async function getWeddingAsaasKey(weddingId:string) {
  const rows = await getSupabaseRest().get<Array<{api_key_ciphertext:string}>>(`/asaas_accounts?wedding_id=eq.${encodeURIComponent(weddingId)}&select=api_key_ciphertext&limit=1`);
  if (!rows[0]?.api_key_ciphertext) throw new Error("Asaas account is not configured for this wedding");
  return decryptSecret(rows[0].api_key_ciphertext);
}
