"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowLeft, Check, CreditCard, QrCode, ReceiptText, ShieldCheck } from "lucide-react";
import { gifts } from "@/lib/gifts";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function CheckoutContent() {
  const params = useSearchParams();
  const gift = gifts.find(item => item.id === params.get("giftId"));
  const amount = Number(params.get("value") || gift?.price || 0);
  const name = params.get("name") || "Contribuição para Marina & Gabriel";
  const [method, setMethod] = useState("pix");
  const [submitted, setSubmitted] = useState(false);

  if (!amount) return <main className="checkout-page"><p>Não foi possível carregar este checkout.</p><Link href="/">Voltar para a lista</Link></main>;

  return <main className="checkout-page">
    <header className="checkout-header"><Link href="/" className="monogram">M <span>&</span> G</Link><p><ShieldCheck size={14}/> Ambiente seguro</p></header>
    <div className="checkout-layout">
      <section className="checkout-form">
        <Link href="/" className="back-link"><ArrowLeft size={15}/> Voltar para a lista</Link>
        <div className="checkout-steps"><span className="done"><Check size={13}/> 1. Presente</span><span className="current">2. Pagamento</span><span>3. Confirmação</span></div>
        <p className="eyebrow">finalizar presente</p><h1>Como você quer<br/><em>pagar?</em></h1>
        <p className="checkout-note">Escolha uma forma de pagamento para concluir sua contribuição.</p>
        <div className="payment-methods" role="tablist">
          <button className={method === "pix" ? "selected" : ""} onClick={() => setMethod("pix")}><QrCode size={19}/><span>Pix<small>aprovação imediata</small></span></button>
          <button className={method === "card" ? "selected" : ""} onClick={() => setMethod("card")}><CreditCard size={19}/><span>Cartão<small>crédito ou débito</small></span></button>
          <button className={method === "boleto" ? "selected" : ""} onClick={() => setMethod("boleto")}><ReceiptText size={19}/><span>Boleto<small>até 3 dias úteis</small></span></button>
        </div>
        <div className="payment-fields">
          {method === "pix" && <><h2>Pague com Pix</h2><p>Na próxima etapa, vamos mostrar o QR Code e o código Pix para copiar.</p><div className="pix-preview"><QrCode size={43}/><span>QR Code Pix<br/><small>gerado com segurança</small></span></div></>}
          {method === "card" && <><h2>Dados do cartão</h2><label>Número do cartão<input placeholder="0000 0000 0000 0000" inputMode="numeric"/></label><div className="field-row"><label>Validade<input placeholder="MM/AA"/></label><label>CVV<input placeholder="000"/></label></div><label>Nome impresso no cartão<input placeholder="Como está no cartão"/></label></>}
          {method === "boleto" && <><h2>Dados para o boleto</h2><p>O boleto será gerado na próxima etapa e enviado para você.</p><label>Seu CPF<input placeholder="000.000.000-00" inputMode="numeric"/></label></>}
        </div>
        {submitted && <p className="demo-notice"><Check size={15}/> Demonstração concluída. Nenhuma cobrança foi realizada.</p>}
        <button className="checkout-submit" onClick={() => setSubmitted(true)}>{submitted ? "Pagamento concluído" : `Continuar com ${method === "pix" ? "Pix" : method === "card" ? "cartão" : "boleto"}`} <span>→</span></button>
        {submitted && <Link className="confirmation-link" href="/presentes/obrigado?demo=1">Ver confirmação <span>↗</span></Link>}
        <p className="checkout-secure"><ShieldCheck size={14}/> Seus dados são protegidos e criptografados.</p>
      </section>
      <aside className="order-summary"><p className="eyebrow">resumo do presente</p>{gift && <div className="summary-image" style={{ backgroundImage: `url(${gift.imageUrl})` }}/>}<h2>{name}</h2><div className="summary-line"><span>Total</span><strong>{money(amount)}</strong></div><p className="summary-demo">Modo demonstração · nenhuma cobrança será realizada</p></aside>
    </div>
  </main>;
}

export default function Checkout() {
  return <Suspense fallback={<main className="checkout-page"><p>Carregando checkout…</p></main>}><CheckoutContent /></Suspense>;
}
