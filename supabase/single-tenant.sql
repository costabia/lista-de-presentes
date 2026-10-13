-- Retorna o fluxo de pagamentos para um único casamento.
-- Esta migração preserva os pedidos e os dados legados da tentativa multi-tenant.

alter table public.gift_orders
  alter column wedding_id drop not null;

-- O backend volta a usar a variável ASAAS_API_KEY da aplicação.
-- As tabelas weddings, asaas_accounts, payouts e wedding_users são mantidas
-- temporariamente para não apagar dados; elas não participam mais do checkout.
