-- FlexCeiling Pro — Role-based access control
-- Run this in the Supabase SQL Editor AFTER schema.sql.
-- Roles: super (manage users + everything), staff (all documents),
--        quotes (quotations only), invoices (tax invoices only).

-- ── Profiles (one row per auth user) ─────────────────────────────────────────
create table if not exists profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'staff' check (role in ('super','staff','quotes','invoices')),
  active     boolean not null default false,   -- new users start with NO access until a super grants it
  created_at timestamptz default now()
);

-- Auto-create a profile when an account is added (Dashboard → Authentication → Add user)
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role, active)
  values (new.id, new.email, 'staff', false)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill existing user(s) as active SUPER (you are the first/owner account).
-- ⚠ If you already have several users, change this so only YOUR row becomes 'super'.
insert into profiles (id, email, role, active)
  select id, email, 'super', true from auth.users
  on conflict (id) do update set role = 'super', active = true;

-- ── Helper: current user's effective role (null when inactive / no profile) ──
-- SECURITY DEFINER so it bypasses RLS (no recursion when used inside policies).
create or replace function app_user_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active = true
$$;

-- ── RLS: profiles ────────────────────────────────────────────────────────────
alter table profiles enable row level security;
drop policy if exists profiles_read on profiles;
drop policy if exists profiles_write on profiles;
create policy profiles_read on profiles for select to authenticated
  using (id = auth.uid() or app_user_role() = 'super');
create policy profiles_write on profiles for update to authenticated
  using (app_user_role() = 'super') with check (app_user_role() = 'super');

-- A super can never be deactivated or demoted (guards against lockout).
create or replace function protect_super() returns trigger
language plpgsql as $$
begin
  if old.role = 'super' and (new.role <> 'super' or new.active = false) then
    raise exception 'A super user cannot be demoted or revoked';
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect_super on profiles;
create trigger profiles_protect_super before update on profiles
  for each row execute function protect_super();

-- ── RLS: documents (gated by type for quotes/invoices roles) ─────────────────
drop policy if exists auth_all on documents;
drop policy if exists doc_access on documents;
create policy doc_access on documents for all to authenticated
  using (
    app_user_role() in ('super','staff')
    or (app_user_role() = 'quotes'   and type = 'quote')
    or (app_user_role() = 'invoices' and type = 'invoice')
  )
  with check (
    app_user_role() in ('super','staff')
    or (app_user_role() = 'quotes'   and type = 'quote')
    or (app_user_role() = 'invoices' and type = 'invoice')
  );

-- ── RLS: document_items (inherit access from the parent document) ────────────
drop policy if exists auth_all on document_items;
drop policy if exists item_access on document_items;
create policy item_access on document_items for all to authenticated
  using (exists (
    select 1 from documents d where d.id = document_id and (
      app_user_role() in ('super','staff')
      or (app_user_role() = 'quotes'   and d.type = 'quote')
      or (app_user_role() = 'invoices' and d.type = 'invoice'))))
  with check (exists (
    select 1 from documents d where d.id = document_id and (
      app_user_role() in ('super','staff')
      or (app_user_role() = 'quotes'   and d.type = 'quote')
      or (app_user_role() = 'invoices' and d.type = 'invoice'))));

-- ── RLS: clients + catalog (any active user) ─────────────────────────────────
drop policy if exists auth_all on clients;
create policy client_access on clients for all to authenticated
  using (app_user_role() is not null) with check (app_user_role() is not null);
drop policy if exists auth_all on catalog_items;
create policy catalog_access on catalog_items for all to authenticated
  using (app_user_role() is not null) with check (app_user_role() is not null);

-- ── RLS: company settings (everyone reads, only super edits) ─────────────────
drop policy if exists auth_all on company_settings;
create policy settings_read  on company_settings for select to authenticated
  using (app_user_role() is not null);
create policy settings_write on company_settings for update to authenticated
  using (app_user_role() = 'super') with check (app_user_role() = 'super');
