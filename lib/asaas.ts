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

const asaasRequest = async <T>(path:string, init:RequestInit = {}, key = process.env.ASAAS_API_KEY):Promise<T> => {
  if (!key) throw new Error("ASAAS_API_KEY is not configured");
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { access_token:key, "Content-Type":"application/json", ...(init.headers || {}) },
  });
  if (!response.ok) throw new Error(`Asaas request failed: ${response.status} ${await response.text()}`);
  return await response.json() as T;
};

export async function getBalance(key?:string) {
  return asaasRequest<{ balance:number }>("/v3/finance/balance", {}, key);
}

export async function createSubaccount(input:{ name:string; email:string; cpfCnpj:string; birthDate?:string; mobilePhone:string; site?:string; incomeValue:number; address:string; addressNumber:string; province:string; postalCode:string; webhooks?:Array<Record<string,unknown>> }, key?:string) {
  return asaasRequest<{ id:string; apiKey:string; walletId:string }>("/v3/accounts", { method:"POST", body:JSON.stringify(input) }, key);
}

export async function createTransfer(input:{ value:number; externalReference:string; pixAddressKey?:string; pixAddressKeyType?:"CPF"|"CNPJ"|"EMAIL"|"PHONE"|"EVP"; bankAccount?:Record<string,unknown>; key?:string }) {
  const { key, ...body } = input;
  return asaasRequest<{ id:string; status:string; value:number }>("/v3/transfers", { method:"POST", body:JSON.stringify(body) }, key);
}

export async function findTransferByReference(reference:string, createdAt:string, key?:string) {
  const start = new Date(createdAt);
  start.setUTCDate(start.getUTCDate() - 1);
  const params = new URLSearchParams({
    "dateCreated[ge]": start.toISOString().slice(0, 10),
    limit: "100",
    offset: "0",
  });
  const result = await asaasRequest<{ data:Array<{ id:string; status:string; value:number; externalReference?:string | null }>; hasMore?:boolean }>(`/v3/transfers?${params.toString()}`, {}, key);
  return result.data.find((transfer) => transfer.externalReference === reference) || null;
}

export async function createPaymentLink(input:{ name:string; description:string; value:number; externalReference:string; giftId?:string; siteUrl?:string; key?:string }) {
  const key = input.key || process.env.ASAAS_API_KEY;
  const siteUrl = (input.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  if (!key) {
    if (process.env.ALLOW_DEMO_PAYMENTS !== "true") {
      throw new Error("ASAAS_API_KEY is not configured");
    }
    const params = new URLSearchParams({ demo: "1", name: input.name, value: String(input.value), ...(input.giftId ? { giftId: input.giftId } : {}) });
    return { id: "demo", url: `${siteUrl}/checkout?${params.toString()}` };
  }
  const response = await fetch(`${apiUrl}/v3/paymentLinks`, { method:"POST", headers:{ access_token:key, "Content-Type":"application/json" }, body:JSON.stringify({ name:input.name, description:input.description, value:input.value, billingType:"UNDEFINED", chargeType:"DETACHED", dueDateLimitDays:7, externalReference:input.externalReference, notificationEnabled:false, callback:{ successUrl:`${siteUrl}/presentes/obrigado?reference=${encodeURIComponent(input.externalReference)}`, autoRedirect:true } }) });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Asaas payment link failed: ${response.status} ${details}`);
  }
  const link = await response.json() as { id?:string; url?:string };
  if (!link.id || !link.url) throw new Error("Asaas returned an incomplete payment link");
  return link as {id:string,url:string};
}
