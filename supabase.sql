-- Creator Corrupt: tabel voor aanmeldingen.
-- Plak dit hele bestand in Supabase > SQL Editor > Run. Zie SETUP.md.

create table public.aanmeldingen (
  id bigint generated always as identity primary key,
  naam text not null check (char_length(naam) between 1 and 80),
  minecraft text not null check (minecraft ~ '^[A-Za-z0-9_]{3,16}$'),
  discord text not null check (char_length(discord) between 2 and 40),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 120),
  kanaal text not null check (kanaal ~* '^https?://' and char_length(kanaal) <= 200),
  microfoon boolean not null check (microfoon),
  camera boolean not null default false,
  voorwaarden_akkoord boolean not null check (voorwaarden_akkoord),
  voorwaarden_versie text not null,
  aangemaakt_op timestamptz not null default now()
);

-- Iedereen kan zich maar één keer aanmelden per Minecraft-naam en per e-mailadres
create unique index aanmeldingen_minecraft_uniek on public.aanmeldingen (lower(minecraft));
create unique index aanmeldingen_email_uniek on public.aanmeldingen (lower(email));

-- Beveiliging (Row Level Security)
alter table public.aanmeldingen enable row level security;

-- Bezoekers van de website mogen alleen een aanmelding toevoegen.
-- Lezen, wijzigen en verwijderen kan niet via de website, alleen in het Supabase-dashboard.
create policy "aanmelding plaatsen" on public.aanmeldingen
  for insert to anon with check (true);

grant insert on public.aanmeldingen to anon;
