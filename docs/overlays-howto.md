# Adding the boundaries and the historical scans

The overlay mechanism has existed since C5 and has never had real data in it
(roadmap item 4). This page is what the author needs to put it there, and it
was written by **walking the path in Django admin with files shaped like the
real ones** — every warning below is something that actually happened, not
something inferred from reading the code.

There is no collaborator-facing editor for this, by design ([map.md](./spec/map.md),
[ADR-0006](./adr/0006-overlay-visibility-gate.md)): the author supplies the
boundaries and the scans, through the admin, as an admin.

## Before you start

Two kinds share one screen:

- **Vector** — a GeoJSON document: the quartieri, the seggi elettorali.
- **Raster** — a georeferenced scan of an old map, plus the box it covers.

Pick the kind first; the form shows **both** sets of fields whatever you pick,
so the ones that do not apply are simply ignored on save. Fill the fieldset
that matches your kind and leave the other alone.

## A vector overlay (quartieri, seggi)

1. **Admin → Maps → Sovrapposizioni → Aggiungi.**
2. **Nome** — what the reader sees in the layer list, so write it for them:
   "Quartieri", not "quartieri_v3_final".
3. **Kind** — *Vector (poligoni GeoJSON)*.
4. **Visibility** — leave it alone unless you mean it. It defaults to
   **Riservato**, the narrowest tier, on purpose: publishing is a deliberate
   act, never a side effect of creating (ADR-0006). The seggi stay Riservato.
5. **Geojson** — the field starts with the word `null` in it. Select all,
   paste over it; do not paste *after* it.
6. Save, then **turn the layer on at `/`** and look. That is the only check
   that means anything.

### What the form will refuse, and why

- **"Le coordinate non sono da queste parti…"** — GeoJSON is
  `[longitudine, latitudine]`, in that order, and your file has them the other
  way round. This is the single most common export mistake, it produces a file
  that is perfectly valid, and before this check existed it saved happily and
  drew a layer you could not see anywhere. If your tool wrote `[lat, lng]`,
  re-export as WGS84 / EPSG:4326 or swap the pairs.
- **"Il GeoJSON è troppo grande (massimo 2 MB)…"** — a municipal export at
  full survey detail runs to several MB, most of it decimals nobody can see.
  Simplify the geometry (QGIS: *Vettore → Strumenti di geometria →
  Semplifica*) or cut the coordinates to six decimals, which is about 10 cm.
- Nothing complains about a `crs` member or a `MultiPolygon` — both are normal
  in a real export, both work, and a quartiere split by a road or a bay is
  supposed to be a MultiPolygon.

## A raster overlay (a scan of an old map)

1. Kind → *Raster (mappa storica georeferenziata)*.
2. **Image** — the scan. **Downsample it first**: the cap is 5 MB and
   40 megapixel, and a scanner's output of a large sheet is well past both. A
   3000 × 2400 JPEG at quality 95 is around 4 MB and is plenty for a map drawn
   over tiles.
3. **South / West / North / East** — the box the scan covers, in degrees. Sud
   must be less than nord and ovest less than est; the form says so if not.
   Getting these right *is* the georeferencing, and the way to do it is to
   save, turn the layer on, and slide the opacity until the coastline lines up
   with the tiles underneath. Then adjust and save again.
4. **Opacity** is the reader's control too — what you set is the starting
   value, not a ceiling.

If the file is too big you get **one** message about its size. (It used to give
two, the second of which said you had not attached an image at all — you had.)

## Checking the result

Open `/`, turn the layer on in **Sovrapposizioni**, and look at where it
landed. For a raster, drag the opacity slider: the moment of truth is whether
the old coastline sits on the new one.

If a layer is on and nothing is drawn, the geometry is somewhere else on Earth
— which, now, the form should have refused. Tell whoever maintains this if it
did not.

## Two things this project knows about itself

- **The plausibility check knows where Gaeta is.** `MAP_CENTER_LAT` /
  `MAP_CENTER_LNG` in `settings.py` bound where overlay geometry may sit
  (±1°). It is the *second* place with that knowledge — the first is the map
  centre in the SPA — and the multi-city phase moves both together.
- **One sentence in the admin is ungrammatical and staying that way for now.**
  Saving prints "Il sovrapposizione … è stato aggiunto": the noun is feminine,
  Django's own Italian message hard-codes a masculine article, and correcting
  it means overriding Django's translations for one sentence. The page titles
  and the model name are right; that line is Django's.
