type Order = { gift_id?:string|null; guest_name?:string|null; guest_message?:string|null; amount:number; status:string; external_reference:string; asaas_payment_link_id?:string|null; asaas_payment_id?:string|null; paid_at?:string|null };
const endpoint = () => process.env.NEXT_PUBLIC_SUPABASE_URL && `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
const headers = () => ({ apikey:process.env.SUPABASE_SERVICE_ROLE_KEY || "", Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}`, "Content-Type":"application/json", Prefer:"return=representation" });
export async function saveOrder(order:Order) {
  const base=endpoint();
  if(!base || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const response = await fetch(`${base}/gift_orders`,{method:"POST",headers:headers(),body:JSON.stringify(order)});
    if (!response.ok) console.warn(`[orders] could not save order: ${response.status}`);
  } catch (error) {
    // Payment creation must remain available if the optional order log is down.
    console.warn("[orders] could not save order", error);
  }
}
export async function updateOrderByReference(reference:string, patch:Partial<Order>) {
  const base=endpoint();
  if(!base || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const response = await fetch(`${base}/gift_orders?external_reference=eq.${encodeURIComponent(reference)}`,{method:"PATCH",headers:headers(),body:JSON.stringify(patch)});
    if (!response.ok) console.warn(`[orders] could not update order: ${response.status}`);
  } catch (error) {
    console.warn("[orders] could not update order", error);
  }
}
export async function claimWebhook(id:string,eventType:string) { const base=endpoint(); if(!base || !process.env.SUPABASE_SERVICE_ROLE_KEY) return true; const r=await fetch(`${base}/webhook_events`,{method:"POST",headers:{...headers(),Prefer:"return=minimal,resolution=ignore-duplicates"},body:JSON.stringify({id,event_type:eventType})}); return r.ok; }
