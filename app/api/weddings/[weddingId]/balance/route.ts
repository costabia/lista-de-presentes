import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBalance } from "@/lib/asaas";
import { getWeddingAsaasKey } from "@/lib/wedding-asaas";

export async function GET(_request:Request, context:{params:Promise<{weddingId:string}>}) {
  const { weddingId } = await context.params;
  const session = await getSession();
  if (!session || session.weddingId !== weddingId) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  try {
    const balance = await getBalance(await getWeddingAsaasKey(weddingId));
    return NextResponse.json(balance);
  } catch (error) {
    console.error("[balance] could not read balance", { weddingId, error });
    return NextResponse.json({ error:"balance_unavailable" }, { status:503 });
  }
}
