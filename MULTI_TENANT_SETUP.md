# Configuração multi-casamento

## Banco

Execute no SQL Editor do Supabase, nesta ordem:

1. `supabase/schema.sql`
2. `supabase/multi-tenant.sql`

O segundo arquivo cria casamentos, usuários, vínculos de subcontas Asaas e solicitações de saque.

## Segredos do servidor

Para gerar automaticamente os segredos locais, execute uma vez:

```text
npm run setup:multitenant-secrets
```

Configure localmente e na Vercel:

```text
AUTH_SESSION_SECRET=<segredo aleatório com pelo menos 32 caracteres>
ASAAS_CREDENTIALS_ENCRYPTION_KEY=<chave base64 de 32 bytes>
SETUP_ADMIN_TOKEN=<token aleatório para endpoints de configuração>
ASAAS_WEBHOOK_URL=https://seu-dominio.com/api/webhooks/asaas
ASAAS_WEBHOOK_TOKEN=<token de webhook com pelo menos 32 caracteres>
GUEST_LIST_SCRIPT_URL=https://script.google.com/macros/s/seu-script-id/exec
GUEST_LIST_SCRIPT_TOKEN=<token compartilhado somente entre o servidor e o Apps Script>
```

Nunca use esses valores com `NEXT_PUBLIC_` e nunca os envie ao navegador.

`GUEST_LIST_SCRIPT_URL` é a URL pública do Web App do Google Apps Script que poderá consultar a aba `Lista_Original` numa etapa futura. Atualmente o sistema aceita qualquer nome informado pelo convidado e salva esse nome no pedido.

No Apps Script, valide `e.parameter.token` contra uma propriedade secreta antes de executar a busca. Não coloque esse token em `NEXT_PUBLIC_` nem no frontend. O script colado também possui uma senha administrativa fixa; troque-a por uma propriedade do Script antes de publicar em produção.

`ASAAS_WEBHOOK_URL` precisa ser uma URL HTTPS pública. O cadastro de cada subconta já configura os eventos de pagamentos, transferências e aprovação da conta nesse endpoint.

## Criar casamentos

Cada site deve usar um slug diferente:

```sql
insert into weddings (slug, couple_name)
values ('noiva-ana', 'Ana & João');
```

Depois da primeira migração, também é possível criar novos casamentos sem editar SQL:

```text
POST /api/admin/weddings
x-setup-admin-token: SETUP_ADMIN_TOKEN
```

```json
{ "slug": "noiva-ana", "coupleName": "Ana & João" }
```

O mesmo endpoint com `GET` lista os casamentos e o status das subcontas, sem retornar nenhuma credencial.

Configure o slug correspondente no projeto do site:

```text
NEXT_PUBLIC_WEDDING_SLUG=noiva-ana
NEXT_PUBLIC_BRIDE_NAME=Ana
NEXT_PUBLIC_GROOM_NAME=João
NEXT_PUBLIC_WEDDING_DATE=2026-05-30
NEXT_PUBLIC_WEDDING_SITE_NAME=Ana & João
DEFAULT_WEDDING_SLUG=noiva-ana
```

## Subcontas Asaas

A conta principal deve ser PJ e estar habilitada para subcontas. O endpoint interno `POST /api/admin/asaas/subaccounts` usa a chave da conta principal, cria a subconta e guarda a chave retornada criptografada.

Envie o header `x-setup-admin-token` igual a `SETUP_ADMIN_TOKEN`. Não registre a resposta da API em logs, pois a chave da subconta é retornada apenas uma vez pelo Asaas.

Exemplo de corpo:

```json
{
  "weddingId": "UUID_DO_CASAMENTO",
  "name": "Nome da noiva",
  "email": "noiva@example.com",
  "cpfCnpj": "00000000000",
  "birthDate": "1990-01-01",
  "mobilePhone": "11999999999",
  "site": "https://lista-da-noiva.vercel.app",
  "incomeValue": 5000,
  "address": "Rua Exemplo",
  "addressNumber": "100",
  "province": "Centro",
  "postalCode": "00000000"
}
```

## Usuários das noivas

Crie o usuário pelo endpoint `POST /api/admin/wedding-users`, também usando `x-setup-admin-token`. A senha deve ter pelo menos 12 caracteres. A noiva entra em `/login` e acessa `/painel`.

Corpo do cadastro do usuário:

```json
{
  "weddingId": "UUID_DO_CASAMENTO",
  "email": "noiva@example.com",
  "password": "uma-senha-com-12-ou-mais-caracteres"
}
```

O painel consulta o saldo da subconta e permite solicitar saque por Pix ou transferência bancária/TED. A API nunca expõe a chave Asaas nem persiste os dados do destino em texto puro. O resultado final do saque é confirmado pelos webhooks de transferência.
