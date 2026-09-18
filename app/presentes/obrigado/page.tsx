import Link from "next/link";
import { Clock3, CheckCircle2 } from "lucide-react";
import { wedding } from "@/config/wedding";
export default async function ThankYou({ searchParams }: { searchParams: Promise<{ reference?: string; demo?: string }> }) {
  const params = await searchParams;
  const isDemo = params.demo === "1";
  return <main className="thank-you"><p className="eyebrow">{wedding.siteName}</p><div className="thank-you-icon">{isDemo ? <Clock3 size={28}/> : <CheckCircle2 size={28}/>}</div><h1>{isDemo ? <>Pagamento em<br/><em>demonstração.</em></> : <>Obrigada pelo<br/><em>carinho.</em></>}</h1><p>{isDemo ? "Este é apenas um ambiente de demonstração. Nenhuma cobrança foi realizada." : "Recebemos seu retorno do pagamento. A confirmação final acontece automaticamente assim que o Asaas enviar a aprovação."}</p><Link href="/">Voltar para o site <span>↗</span></Link></main>
}
