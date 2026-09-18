import { NextResponse } from "next/server";
import { claimWebhook, updateOrderByReference } from "@/lib/orders";
export async function POST(request: Request) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  const received = request.headers.get("asaas-access-token");
  if (!expected || !received || received !== expected) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  const event = await request.json() as { id?:string; event?:string; payment?:{ id?:string; externalReference?:string; value?:number; status?:string } };
  if (!event.id || !event.payment?.externalReference) return NextResponse.json({ received:true });
  if (!(await claimWebhook(event.id, event.event || "unknown"))) return NextResponse.json({ received:true });
  const status = event.event === "PAYMENT_RECEIVED" || event.event === "PAYMENT_CONFIRMED" ? "paid" : event.event === "PAYMENT_REFUNDED" ? "refunded" : event.event === "PAYMENT_DELETED" ? "canceled" : undefined;
  if (status) await updateOrderByReference(event.payment.externalReference, { status, asaas_payment_id:event.payment.id, amount:event.payment.value, paid_at:status === "paid" ? new Date().toISOString() : null });
  // Production persistence is intentionally delegated to Supabase (see supabase/schema.sql).
  // The event id is the idempotency key: upsert it before applying the status update.
  console.info("Asaas webhook received", { eventId:event.id, type:event.event, reference:event.payment.externalReference });
  return NextResponse.json({ received:true });
}
