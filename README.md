# Lista de Presentes — Marina & Gabriel

Lista de presentes de casamento com estética editorial e checkout hospedado pelo Asaas.

## Rodar localmente

1. Copie `.env.example` para `.env.local`.
2. Preencha `ASAAS_API_KEY` apenas no servidor. O projeto bloqueia cobranças quando a chave não está configurada; para uma demonstração sem cobrança, defina explicitamente `ALLOW_DEMO_PAYMENTS=true`.
3. Execute `npm install` e `npm run dev`.
4. Abra `http://localhost:3000`.

Os presentes editáveis ficam em `lib/gifts.ts` e os dados dos noivos em `config/wedding.ts`.

## Asaas Sandbox

Use `https://api-sandbox.asaas.com` em `ASAAS_API_URL`. O endpoint cria `POST /v3/paymentLinks` com `billingType: UNDEFINED`, permitindo PIX e cartão habilitados na conta, e `chargeType: DETACHED`. Configure no Asaas um Webhook de pagamentos apontando para `/api/webhooks/asaas`, com os eventos `PAYMENT_CREATED`, `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_REFUNDED` e `PAYMENT_DELETED`. Gere um token seguro com pelo menos 32 caracteres, salve-o em `ASAAS_WEBHOOK_TOKEN` e configure o mesmo valor no Webhook. O Asaas envia esse token no header `asaas-access-token`.

Para testar localmente, use uma URL pública de desenvolvimento para o webhook. Depois, substitua `NEXT_PUBLIC_SITE_URL` pela URL da Vercel e cadastre `https://seu-dominio.com/api/webhooks/asaas` no Asaas. O retorno do navegador não confirma o pagamento: o pedido só deve ser considerado pago após o webhook.

## Supabase

Crie um projeto e execute `supabase/schema.sql` no SQL Editor. Cadastre as variáveis do `.env.example` na Vercel. O schema inclui `gifts`, `gift_orders` e `webhook_events`; a persistência do ambiente de produção deve usar `SUPABASE_SERVICE_ROLE_KEY` somente em rotas server-side.

## Vercel

Importe o repositório, mantenha o framework Next.js e cadastre as variáveis de ambiente para Preview e Production. Para trocar para produção, substitua apenas `ASAAS_API_URL` por `https://api.asaas.com` e use a API Key de produção. Nunca exponha a chave em variáveis `NEXT_PUBLIC_*`.

## Estrutura

- `app/page.tsx`: experiência principal, filtros e modal de presente.
- `app/api/payments/link`: validação server-side e criação do link Asaas.
- `app/api/webhooks/asaas`: autenticação do webhook e ponto de idempotência.
- `app/presentes/obrigado`: retorno visual após o checkout.
- `lib/gifts.ts`, `lib/asaas.ts`, `config/wedding.ts`, `types/`.
