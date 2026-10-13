export function normalizeGuestName(value:string) {
  return value.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export async function lookupGuestName(name:string) {
  const endpoint = process.env.GUEST_LIST_SCRIPT_URL;
  const token = process.env.GUEST_LIST_SCRIPT_TOKEN;
  if (!endpoint || !token) throw new Error("Guest list integration is not configured");
  const url = new URL(endpoint);
  url.searchParams.set("nome", name);
  url.searchParams.set("token", token);
  const response = await fetch(url, { cache:"no-store" });
  if (!response.ok) throw new Error(`Guest list lookup failed: ${response.status}`);
  const result = await response.json() as { status?:string; nome_exato?:string };
  if ((result.status !== "found" && result.status !== "already_confirmed") || !result.nome_exato) return null;
  return { exactName:result.nome_exato, normalizedName:normalizeGuestName(result.nome_exato), alreadyConfirmed:result.status === "already_confirmed" };
}
