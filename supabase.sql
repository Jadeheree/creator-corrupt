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


-- ===========================================================
-- Tierlist "Wie is corrupt": stemmen van bezoekers
-- tier: 1 = Zeker corrupt, 2 = Verdacht, 3 = Twijfel, 4 = Vertrouw ik wel, 5 = Zeker creator
-- Elke bezoeker heeft een willekeurige stemmer-code (in zijn browser). Stuurt hij opnieuw in,
-- dan telt alleen zijn nieuwste keuze per deelnemer.
-- ===========================================================

create table public.tier_stemmen (
  id bigint generated always as identity primary key,
  stemmer uuid not null,
  deelnemer text not null check (char_length(deelnemer) between 1 and 60),
  tier smallint not null check (tier between 1 and 5),
  aangemaakt_op timestamptz not null default now()
);
create index tier_stemmen_laatste on public.tier_stemmen (stemmer, deelnemer, aangemaakt_op desc);

alter table public.tier_stemmen enable row level security;

-- Bezoekers mogen alleen stemmen toevoegen, niet lezen, wijzigen of verwijderen
create policy "tier stem plaatsen" on public.tier_stemmen
  for insert to anon with check (true);
grant insert on public.tier_stemmen to anon;

-- Openbaar overzicht: alleen het gemiddelde en het aantal stemmen per deelnemer, geen losse stemmen
create view public.tier_resultaten as
  select deelnemer,
         round(avg(tier)::numeric, 2) as gemiddelde,
         count(*) as stemmen
  from (
    select distinct on (stemmer, deelnemer) stemmer, deelnemer, tier
    from public.tier_stemmen
    order by stemmer, deelnemer, aangemaakt_op desc
  ) laatste
  group by deelnemer;

grant select on public.tier_resultaten to anon;
