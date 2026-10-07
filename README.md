# Lista de Presentes — Marina & Gabriel

Lista de presentes de casamento com estética editorial e checkout hospedado pelo Asaas.

## Checklist para rodar hoje

### 1. Rodar localmente

Requisitos: Node.js 22.13 ou superior e npm. Na raiz do repositório:

```powershell
npm install
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Abra `http://localhost:3000`. O `.env.local` local deve conter `NEXT_PUBLIC_SITE_URL=http://localhost:3000` — reinicie o servidor depois de mudar variáveis de ambiente. Não compartilhe nem versione `.env.local`.

### 2. Preparar o banco e testar sem cobrança

Crie o projeto Supabase que será usado pela aplicação e execute todo o conteúdo de `supabase/schema.sql` no SQL Editor. Configure `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no servidor. A chave `service_role`/`sb_secret` é secreta, tem acesso privilegiado e nunca deve receber o prefixo `NEXT_PUBLIC_`.

O app agora falha explicitamente ao criar pagamentos ou processar webhooks se o Supabase não estiver configurado ou se as gravações falharem. Isso evita disponibilizar um pagamento que não possa ser associado a um pedido confirmado no banco.

Para validar apenas a interface do checkout, configure `ALLOW_DEMO_PAYMENTS=true`, remova `ASAAS_API_KEY` do ambiente local e reinicie o servidor. O modo demo não cria cobrança no Asaas e não testa o webhook, mas ainda grava o pedido de demonstração no Supabase.

### 3. Testar o checkout com Sandbox

Use credenciais de Sandbox do Asaas, nunca a chave de produção, e configure:

```text
ASAAS_API_URL=https://api-sandbox.asaas.com
ASAAS_API_KEY=<chave de API do Sandbox>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Com o servidor reiniciado e o schema aplicado, teste a rota local com um valor mínimo permitido:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/payments/link -ContentType "application/json" -Body '{"customAmount":30,"guestName":"Teste"}'
```

Ela deve responder com uma URL de checkout do Asaas Sandbox e uma referência. Complete o fluxo com os meios de pagamento de teste disponibilizados pela conta Sandbox e confirme que o pedido aparece em `gift_orders`.

### 4. Configurar e testar o webhook

O Asaas precisa acessar uma URL HTTPS pública; `localhost` não serve. Para testar localmente, publique temporariamente a porta 3000 por um túnel HTTPS confiável. Gere um segredo aleatório de pelo menos 32 caracteres e configure exatamente o mesmo valor em `ASAAS_WEBHOOK_TOKEN` e no webhook do Asaas. Não use nem envie o segredo em mensagens ou logs.

No painel Asaas Sandbox, cadastre:

```text
<URL HTTPS pública>/api/webhooks/asaas
```

Selecione `PAYMENT_CREATED`, `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_REFUNDED` e `PAYMENT_DELETED`. O Asaas envia o token no header `asaas-access-token`. Depois de um pagamento de teste, confirme `status` e `asaas_payment_id` em `gift_orders`, e confirme a gravação do evento em `webhook_events`. O retorno do navegador não confirma pagamento: a confirmação vem do webhook.

## Publicação em produção: ordem recomendada

1. **Revogue e rotacione as credenciais anteriormente usadas no ambiente local.** Se uma chave de Asaas ou segredo do Supabase já foi compartilhado, gere substitutos nos respectivos painéis antes da publicação. Atualize somente os novos valores nos ambientes protegidos; não os cole em chats, commits ou variáveis `NEXT_PUBLIC_*`.
2. **Confirme os dados do evento e da lista.** A data atualmente exibida na página é `14.09.2025`, que já passou. Confirme a data correta com os noivos e atualize a data visível em `app/page.tsx` e `weddingDate` em `config/wedding.ts` antes de divulgar o site. Confira também nomes, itens e valores em `config/wedding.ts` e `lib/gifts.ts`.
3. **Prepare o Supabase de produção.** Crie/valide o projeto de produção, execute `supabase/schema.sql` e mantenha à mão a URL e a chave secreta de servidor. A aplicação usa Supabase REST para gravar pedidos e eventos de webhook.
4. **Prepare o Asaas em Sandbox primeiro.** Valide o checkout e o webhook seguindo a checklist acima. Em seguida, confirme que a conta de produção está habilitada para cobrar e aceitar os meios de pagamento desejados.
5. **Publique na Vercel.** Importe o repositório `costabia/lista-de-presentes`, mantenha Next.js como framework, selecione a raiz do projeto e configure as variáveis em Production (e Preview apenas com credenciais de teste):

   ```text
   ASAAS_API_URL=https://api.asaas.com
   ASAAS_API_KEY=<chave de API de produção do Asaas>
   ASAAS_WEBHOOK_TOKEN=<segredo aleatório de pelo menos 32 caracteres>
   NEXT_PUBLIC_SITE_URL=https://<domínio-final>
   NEXT_PUBLIC_SUPABASE_URL=<URL do projeto Supabase>
   SUPABASE_SERVICE_ROLE_KEY=<chave secreta do servidor Supabase>
   ```

   Não configure `ALLOW_DEMO_PAYMENTS=true` em produção. Não cadastre a chave secreta do Supabase nem a API Key do Asaas como variáveis `NEXT_PUBLIC_*`.
6. **Valide o domínio final e HTTPS.** Aguarde a implantação ficar pronta e confirme que a página inicial responde. Ajuste `NEXT_PUBLIC_SITE_URL` para a URL canônica final (sem barra no fim) e faça uma nova implantação se mudou após o build.
7. **Cadastre o webhook de produção no Asaas.** Use `https://<domínio-final>/api/webhooks/asaas`, configure os mesmos cinco eventos listados acima e o mesmo segredo de `ASAAS_WEBHOOK_TOKEN`. Não reutilize o endpoint de Sandbox.
8. **Faça um teste controlado de ponta a ponta.** Crie um pagamento de baixo valor autorizado pelos responsáveis, confira o pedido em `gift_orders`, o evento em `webhook_events` e a transição do status após o webhook. Verifique também a página de retorno e o cancelamento/estorno conforme aplicável. Não divulgue o link antes de confirmar esses pontos.
9. **Monitore e só então divulgue.** Verifique os logs de Functions da Vercel e as entregas do webhook no Asaas. O pagamento só é considerado confirmado quando o webhook atualiza o pedido; a página de retorno no navegador, sozinha, não é confirmação.

## Referência de configuração

Os presentes editáveis ficam em `lib/gifts.ts` e os dados do evento ficam em `config/wedding.ts`. As variáveis de ambiente são documentadas em `.env.example`. Para mais detalhes sobre o endpoint de pagamento e o webhook, consulte `lib/asaas.ts`, `app/api/payments/link/route.ts` e `app/api/webhooks/asaas/route.ts`.
