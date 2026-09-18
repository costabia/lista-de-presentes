const configuredApiUrl = process.env.ASAAS_API_URL?.replace(/\/$/, "");
const isProductionKey = process.env.ASAAS_API_KEY?.includes("_prod_");
const isSandboxUrl = configuredApiUrl?.includes("sandbox");

// Production keys cannot be used against the sandbox API (and vice versa).
// Infer the endpoint when the variable was not explicitly configured so a
// missing or stale local setting does not silently point to the wrong account.
const apiUrl = isProductionKey && isSandboxUrl
  ? "https://api.asaas.com"
  : !isProductionKey && configuredApiUrl && !isSandboxUrl
    ? "https://api-sandbox.asaas.com"
    : configuredApiUrl || (isProductionKey ? "https://api.asaas.com" : "https://api-sandbox.asaas.com");

export async function createPaymentLink(input:{ name:string; description:string; value:number; externalReference:string; giftId?:string }) {
  const key = process.env.ASAAS_API_KEY;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  if (!key) {
    if (process.env.ALLOW_DEMO_PAYMENTS !== "true") {
      throw new Error("ASAAS_API_KEY is not configured");
    }
    const params = new URLSearchParams({ demo: "1", name: input.name, value: String(input.value), ...(input.giftId ? { giftId: input.giftId } : {}) });
    return { id: "demo", url: `${siteUrl}/checkout?${params.toString()}` };
  }
  const response = await fetch(`${apiUrl}/v3/paymentLinks`, { method:"POST", headers:{ access_token:key, "Content-Type":"application/json" }, body:JSON.stringify({ name:input.name, description:input.description, value:input.value, billingType:"UNDEFINED", chargeType:"DETACHED", externalReference:input.externalReference, notificationEnabled:false, callback:{ successUrl:`${siteUrl}/presentes/obrigado?reference=${encodeURIComponent(input.externalReference)}`, autoRedirect:true } }) });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Asaas payment link failed: ${response.status} ${details}`);
  }
  const link = await response.json() as { id?:string; url?:string };
  if (!link.id || !link.url) throw new Error("Asaas returned an incomplete payment link");
  return link as {id:string,url:string};
}
