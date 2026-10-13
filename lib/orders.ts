type Order = { gift_id?:string|null; guest_name?:string|null; guest_name_normalized?:string|null; guest_message?:string|null; amount:number; status:string; external_reference:string; asaas_payment_link_id?:string|null; asaas_payment_id?:string|null; paid_at?:string|null };
const endpoint = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials are not configured");
  return `${url.replace(/\/$/, "")}/rest/v1`;
};
const headers = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return { apikey:key, Authorization:`Bearer ${key}`, "Content-Type":"application/json", Prefer:"return=representation" };
};
export async function saveOrder(order:Order) {
  const base=endpoint();
  const response = await fetch(`${base}/gift_orders`,{method:"POST",headers:headers(),body:JSON.stringify(order)});
  if (!response.ok) throw new Error(`Supabase could not save order: ${response.status} ${await response.text()}`);
}
export async function getWeddingIdBySlug(slug = process.env.DEFAULT_WEDDING_SLUG || "marina-gabriel") {
  const base=endpoint();
  const response=await fetch(`${base}/weddings?slug=eq.${encodeURIComponent(slug)}&select=id&limit=1`,{headers:headers()});
  if (!response.ok) throw new Error(`Supabase could not find wedding: ${response.status} ${await response.text()}`);
  const rows=await response.json() as Array<{id:string}>;
  if (!rows[0]?.id) throw new Error(`Wedding not configured: ${slug}`);
  return rows[0].id;
}
export async function updateOrderByReference(reference:string, patch:Partial<Order>) {
  const base=endpoint();
  const response = await fetch(`${base}/gift_orders?external_reference=eq.${encodeURIComponent(reference)}`,{method:"PATCH",headers:headers(),body:JSON.stringify(patch)});
  if (!response.ok) throw new Error(`Supabase could not update order: ${response.status} ${await response.text()}`);
}
export async function claimWebhook(id:string,eventType:string) {
  const base=endpoint();
  const existing=await fetch(`${base}/webhook_events?id=eq.${encodeURIComponent(id)}&select=id&limit=1`,{headers:headers()});
  if (!existing.ok) throw new Error(`Supabase could not check webhook event: ${existing.status} ${await existing.text()}`);
  if ((await existing.json() as Array<{id:string}>).length > 0) return false;
  const response=await fetch(`${base}/webhook_events`,{method:"POST",headers:{...headers(),Prefer:"return=minimal"},body:JSON.stringify({id,event_type:eventType})});
  if (response.status === 409) return false;
  if (!response.ok) throw new Error(`Supabase could not record webhook event: ${response.status} ${await response.text()}`);
  return true;
}
