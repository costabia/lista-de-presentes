"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Session = { weddingId:string };
type Order = { id:string; gift_id:string|null; guest_name:string|null; guest_message:string|null; amount:number; status:string; created_at:string };
type Payout = { id:string; amount:number; status:string; created_at:string };
const money = (value:number) => value.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

export default function PanelPage() {
  const [session,setSession] = useState<Session|null>(null);
  const [balance,setBalance] = useState<number|null>(null);
  const [orders,setOrders] = useState<Order[]>([]);
  const [payouts,setPayouts] = useState<Payout[]>([]);
  const [amount,setAmount] = useState("");
  const [destinationType,setDestinationType] = useState("PIX");
  const [pix,setPix] = useState("");
  const [pixType,setPixType] = useState("CPF");
  const [bankCode,setBankCode] = useState(""); const [ownerName,setOwnerName] = useState(""); const [cpfCnpj,setCpfCnpj] = useState(""); const [agency,setAgency] = useState(""); const [account,setAccount] = useState(""); const [accountDigit,setAccountDigit] = useState(""); const [bankAccountType,setBankAccountType] = useState("CONTA_CORRENTE");
  const [message,setMessage] = useState("");
  const [loading,setLoading] = useState(true);
  const [payoutLoading,setPayoutLoading] = useState(false);
  const router = useRouter();

  async function refresh(current:Session) {
    const [balanceResponse, ordersResponse, payoutsResponse] = await Promise.all([
      fetch(`/api/weddings/${current.weddingId}/balance`),
      fetch(`/api/weddings/${current.weddingId}/orders`),
      fetch(`/api/weddings/${current.weddingId}/payouts`),
    ]);
    if (balanceResponse.ok) setBalance((await balanceResponse.json() as {balance:number}).balance);
    if (ordersResponse.ok) setOrders((await ordersResponse.json() as {orders:Order[]}).orders);
    if (payoutsResponse.ok) setPayouts((await payoutsResponse.json() as {payouts:Payout[]}).payouts);
  }

  useEffect(() => { (async() => {
    const response = await fetch("/api/auth/session");
    if (!response.ok) { router.push("/login"); return; }
    const current = await response.json() as Session;
    setSession(current);
    await refresh(current);
    setLoading(false);
  })(); }, [router]);

  async function payout(event:FormEvent) {
    event.preventDefault();
    if (!session) return;
    setPayoutLoading(true); setMessage("");
    const destination = destinationType === "PIX" ? { pixAddressKey:pix, pixAddressKeyType:pixType } : { bankAccount:{ bank:{code:bankCode}, ownerName, cpfCnpj, agency, account, accountDigit, bankAccountType } };
    const response = await fetch(`/api/weddings/${session.weddingId}/payouts`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", "Idempotency-Key":crypto.randomUUID() },
      body:JSON.stringify({ amount:Number(amount.replace(",",".")), destinationType, ...destination }),
    });
    setMessage(response.ok ? "Saque solicitado. O status será atualizado após a confirmação do Asaas." : "Não foi possível solicitar o saque.");
    if (response.ok) { setAmount(""); await refresh(session); }
    setPayoutLoading(false);
  }

  if (loading) return <main style={{maxWidth:720,margin:"80px auto",padding:24}}>Carregando…</main>;
  return <main style={{maxWidth:840,margin:"60px auto",padding:24}}>
    <p className="eyebrow">painel financeiro</p>
    <h1>Minha lista de presentes</h1>
    <section style={{margin:"32px 0",padding:24,border:"1px solid #ddd"}}><p>Saldo disponível</p><strong style={{fontSize:32}}>{balance===null?"—":money(balance)}</strong></section>
    <section><h2>Presentes recebidos</h2>{orders.length===0?<p>Nenhum presente recebido ainda.</p>:<div>{orders.map(order=><article key={order.id} style={{padding:"14px 0",borderBottom:"1px solid #eee"}}><strong>{order.gift_id || "Contribuição"}</strong><span> · {money(Number(order.amount))} · {order.status}</span>{order.guest_name&&<p>De: {order.guest_name}</p>}{order.guest_message&&<p>{order.guest_message}</p>}</article>)}</div>}</section>
    <section style={{marginTop:36}}><h2>Solicitar saque</h2><form onSubmit={payout} style={{display:"grid",gap:16,marginTop:16}}><label>Valor<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="R$ 0,00" required /></label><label>Destino<select value={destinationType} onChange={e=>setDestinationType(e.target.value)}><option value="PIX">Pix</option><option value="BANK_ACCOUNT">Conta bancária / TED</option></select></label>{destinationType==="PIX"?<><label>Chave Pix<input value={pix} onChange={e=>setPix(e.target.value)} required /></label><label>Tipo<select value={pixType} onChange={e=>setPixType(e.target.value)}><option>CPF</option><option>CNPJ</option><option>EMAIL</option><option>PHONE</option><option>EVP</option></select></label></>:<><label>Banco<input value={bankCode} onChange={e=>setBankCode(e.target.value)} placeholder="Código bancário" required /></label><label>Nome do titular<input value={ownerName} onChange={e=>setOwnerName(e.target.value)} required /></label><label>CPF/CNPJ do titular<input value={cpfCnpj} onChange={e=>setCpfCnpj(e.target.value)} required /></label><label>Agência<input value={agency} onChange={e=>setAgency(e.target.value)} required /></label><label>Conta<input value={account} onChange={e=>setAccount(e.target.value)} required /></label><label>Dígito<input value={accountDigit} onChange={e=>setAccountDigit(e.target.value)} required /></label><label>Tipo de conta<select value={bankAccountType} onChange={e=>setBankAccountType(e.target.value)}><option value="CONTA_CORRENTE">Conta corrente</option><option value="CONTA_POUPANCA">Poupança</option></select></label></>}<button type="submit" disabled={payoutLoading}>{payoutLoading?"Solicitando…":"Solicitar transferência"}</button></form>{message&&<p role="status">{message}</p>}</section>
    <section style={{marginTop:36}}><h2>Histórico de saques</h2>{payouts.length===0?<p>Nenhum saque solicitado.</p>:<div>{payouts.map(item=><p key={item.id}>{money(Number(item.amount))} · {item.status} · {new Date(item.created_at).toLocaleString("pt-BR")}</p>)}</div>}</section>
    <button onClick={async()=>{await fetch("/api/auth/logout",{method:"POST"});router.push("/login")}} style={{marginTop:32}}>Sair</button>
  </main>;
}
