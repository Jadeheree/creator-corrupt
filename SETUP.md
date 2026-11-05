# Creator Corrupt online zetten (Vercel + Supabase)

Beide diensten zijn gratis voor een site als deze.

## 1. Database voor aanmeldingen (Supabase)
1. Maak een gratis account op supabase.com en klik op **New project**. Kies een regio in Europa (bijvoorbeeld Frankfurt) en bewaar het database-wachtwoord.
2. Open **SQL Editor**, plak de hele inhoud van `supabase.sql` en klik op **Run**.
3. Ga naar **Project Settings > API**. Kopieer de **Project URL** en de **anon public** key naar `config.js`.
4. Zet de wijziging op GitHub (vraag Claude om te pushen).

Aanmeldingen bekijken: Supabase > **Table Editor > aanmeldingen**. Daar kun je ze ook exporteren als CSV.

`supabase.sql` maakt ook de tierlist aan: de tabel `tier_stemmen` (alle ingestuurde stemmen) en het overzicht
`tier_resultaten` (gemiddelde per deelnemer, dit toont de site). Bezoekers kunnen alleen stemmen toevoegen.
Let op: er is geen login, dus iemand die zijn browsergegevens wist kan opnieuw stemmen. Voor een fan-tierlist is dat meestal prima.

## 2. Website online (Vercel)
1. Maak een account op vercel.com en log in met GitHub.
2. Klik op **Add New > Project**, kies de repository `creator-corrupt` en klik op **Import**.
3. Laat alles staan zoals het is: **Framework Preset: Other**, geen build command. Klik op **Deploy**.
4. Je krijgt een adres zoals `creator-corrupt.vercel.app`. Bij elke push naar GitHub zet Vercel de nieuwe versie vanzelf online.

## 3. Eigen domein (optioneel)
Vercel > je project > **Settings > Domains** > voeg je domein toe en volg de stappen voor de DNS-instellingen.

## 4. GitHub Pages uitzetten
Draait de site op Vercel, dan kun je GitHub Pages uitzetten zodat er niet twee versies online staan:
GitHub > repository > **Settings > Pages** > **Unpublish site** (of vraag Claude).

## Regels-PDF aanpassen
Het bronbestand staat buiten GitHub: `Desktop\Jadehere\Creator Corrupt\regels-bron.html`.
Na een wijziging moet `regels.pdf` opnieuw gemaakt worden. Verhoog dan ook `voorwaardenVersie` in `config.js`,
zodat je bij elke aanmelding ziet met welke versie iemand akkoord ging.

## Let op
- De anon key in `config.js` is bedoeld om openbaar te zijn. De beveiliging zit in de regels in `supabase.sql`:
  bezoekers kunnen alleen een aanmelding toevoegen, niet lezen of wijzigen.
- Zet **nooit** de `service_role` key in de site.
- Aanmeldingen bevatten persoonsgegevens (e-mail, namen). Verwijder ze na het event, zoals in de voorwaarden staat.
