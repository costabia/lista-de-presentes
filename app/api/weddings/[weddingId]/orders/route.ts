import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseRest } from "@/lib/supabase-rest";

export async function GET(_request:Request, context:{params:Promise<{weddingId:string}>}) {
  const { weddingId } = await context.params;
  const session = await getSession();
  if (!session || session.weddingId !== weddingId) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  try {
    const orders = await getSupabaseRest().get<Array<{id:string; gift_id:string|null; guest_name:string|null; guest_name_normalized:string|null; guest_message:string|null; amount:number; status:string; created_at:string}>>(`/gift_orders?wedding_id=eq.${encodeURIComponent(weddingId)}&select=id,gift_id,guest_name,guest_name_normalized,guest_message,amount,status,created_at&order=created_at.desc`);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[orders] could not read orders", { weddingId, error });
    return NextResponse.json({ error:"orders_unavailable" }, { status:503 });
  }
}
