"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { ArrowUpRight, Check, LoaderCircle, X } from "lucide-react";
import { gifts } from "@/lib/gifts";
import type { Gift } from "@/types/gift";

const money = (value:number) => value.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

export default function Home() {
  const [selected, setSelected] = useState<Gift|null>(null);
  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const close = () => {
    if (!loading) {
      setSelected(null);
      setGuestName("");
      setMessage("");
      setError("");
    }
  };

  async function pay(event:FormEvent) {
    event.preventDefault();
    if (!selected || loading) return;
    if (!guestName.trim() || !message.trim()) {
      setError("Preencha seu nome e uma mensagem para os noivos.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/payments/link", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ giftId:selected.id, guestName:guestName.trim(), message:message.trim() || undefined, weddingSlug:process.env.NEXT_PUBLIC_WEDDING_SLUG }),
      });
      const result = await response.json() as { url?:string; error?:string };
      if (!response.ok || !result.url) throw new Error(result.error || "payment_unavailable");
      window.location.assign(result.url);
    } catch (reason) {
      setError("Não foi possível iniciar o pagamento. Tente novamente.");
      setLoading(false);
    }
  }

  return <main className="gift-page">
    <header className="gift-header"><span className="gift-rule"/><h1>Lista de presentes</h1><span className="gift-rule"/></header>
    <section className="gift-grid" aria-label="Presentes disponíveis">
      {gifts.filter(gift => gift.active).map(gift => <article className="gift-tile" key={gift.id}>
        <button className="gift-photo" onClick={() => setSelected(gift)} aria-label={`Escolher ${gift.name}`}>
          <Image src={gift.imageUrl} alt={gift.alt} fill sizes="(max-width: 640px) 50vw, (max-width: 1000px) 25vw, 220px" />
        </button>
        <div className="gift-tile-info"><h2>{gift.name}</h2><strong>{money(gift.price)}</strong></div>
        <button className="gift-choose" onClick={() => setSelected(gift)} disabled={gift.maxPurchases===1 && gift.purchaseCount>=1}>
          {gift.maxPurchases===1 && gift.purchaseCount>=1 ? "Presenteado" : "Escolher presente"}<ArrowUpRight size={14}/>
        </button>
      </article>)}
    </section>

    {selected && <div className="gift-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && close()}>
      <section className="gift-modal" role="dialog" aria-modal="true" aria-labelledby="gift-modal-title">
        <button className="gift-modal-close" onClick={close} aria-label="Fechar"><X size={18}/></button>
        <div className="gift-modal-photo"><Image src={selected.imageUrl} alt="" fill sizes="420px"/></div>
        <p className="gift-modal-label">Seu presente</p>
        <h2 id="gift-modal-title">{selected.name}</h2>
        <p className="gift-modal-price">{money(selected.price)}</p>
        <form onSubmit={pay}>
          <label className="gift-field"><span>Nome completo</span><input value={guestName} onChange={event => setGuestName(event.target.value)} placeholder="Como está na lista de convidados" autoComplete="name" required /></label>
          <label className="gift-field"><span>Mensagem para os noivos <small>(opcional)</small></span><textarea value={message} onChange={event => setMessage(event.target.value)} placeholder="Escreva uma mensagem carinhosa" rows={4} /></label>
          {error && <p className="gift-form-error" role="alert">{error}</p>}
          <button className="gift-modal-submit" type="submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={15}/> Validando…</> : <>Continuar para o pagamento <ArrowUpRight size={15}/></>}</button>
        </form>
        <p className="gift-secure"><Check size={13}/> Seu nome será conferido na lista de convidados.</p>
      </section>
    </div>}
  </main>;
}
