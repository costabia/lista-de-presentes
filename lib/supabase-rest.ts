const endpoint = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials are not configured");
  return { base:`${url.replace(/\/$/, "")}/rest/v1`, key };
};

export function getSupabaseRest() {
  const { base, key } = endpoint();
  const request = async <T>(path:string, init:RequestInit = {}) => {
    const response = await fetch(`${base}${path}`, { ...init, headers:{ apikey:key, Authorization:`Bearer ${key}`, "Content-Type":"application/json", ...(init.headers || {}) } });
    if (!response.ok) throw new Error(`Supabase request failed: ${response.status} ${await response.text()}`);
    return await response.json() as T;
  };
  return {
    get:<T>(path:string) => request<T>(path),
    post:<T>(path:string, body:unknown, headers:Record<string,string> = {}) => request<T>(path, { method:"POST", headers:{ Prefer:"return=representation", ...headers }, body:JSON.stringify(body) }),
    patch:<T>(path:string, body:unknown) => request<T>(path, { method:"PATCH", headers:{ Prefer:"return=representation" }, body:JSON.stringify(body) }),
  };
}
