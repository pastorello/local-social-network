export interface FieldConfig {
  key: string
  label: string
  // 'select' reads its choices from `optionsEndpoint` — an admin-managed list
  // (luoghi's genres), so the choices are data, not code.
  kind: 'input' | 'textarea' | 'select'
  placeholder?: string
  optionsEndpoint?: string
  // What the reader sees in place of the stored value, where the two differ:
  // a genre is stored as a slug and read as its name.
  displayKey?: string
  // Read under «Dove si trova», above the link that opens the way there,
  // rather than among the card's facts — when the card has a place to read it
  // under (review PR-3). Without one it stays a fact like the others.
  inPlace?: boolean
}

// A list that can be narrowed to one value of a field — luoghi by genre, read
// from the URL so a heading elsewhere can link straight to "Spiagge".
export interface ListFilterConfig {
  param: string
  optionsEndpoint: string
  // What the filter is, for its accessible name ("Filtra luoghi per genere").
  label: string
  // Types that belong under the same heading for the reader without being
  // stored as this type (spec content.md: the churches under "Luoghi").
  related?: { label: string; to: string }[]
}

export interface TypeConfig {
  key: string
  label: string
  singularLabel: string
  endpoint: string
  routeNames: { list: string; detail: string; create: string }
  extraFields: FieldConfig[]
  // Only where the title means something more specific than "the name of this
  // card" — dialetto's title *is* the dialect word since 2026-09-09, and
  // "Es. termine" is a poor hint for that.
  titlePlaceholder?: string
  // Appended to the images field's hint, where a type has a rule of its own
  // about what may be uploaded.
  imagesHint?: string
  mapMode: 'none' | 'pins'
  maxPoints?: number
  listFilter?: ListFilterConfig
  // How the list counts its rows, where "scheda" is the wrong word for them:
  // a guest reading "1 scheda" under *Scoprire la città* is looking at a tour.
  countNouns?: [singular: string, plural: string]
  // The grid's one-line summary, where the first extra field is not enough.
  summaryOf?: (item: Record<string, unknown>) => string
  // A type with a door (ADR-0008): its form gets a *Visita* tab — what is
  // known about getting in — and, with `fromOutside`, «Se la trovi chiusa»
  // (cosa-fare.md D7). `noDoor` offers the open-air state, which a church
  // never is.
  visit?: { fromOutside: boolean; noDoor: boolean }
}

export const chiesaConfig: TypeConfig = {
  key: 'chiese',
  label: 'Chiese',
  singularLabel: 'chiesa',
  endpoint: '/api/chiese/',
  routeNames: { list: 'chieselist', detail: 'chiesedetail', create: 'chiesecreate' },
  extraFields: [],
  mapMode: 'pins',
  maxPoints: 1,
  visit: { fromOutside: true, noDoor: false },
}

export const ricettaConfig: TypeConfig = {
  key: 'ricette',
  label: 'Ricette',
  singularLabel: 'ricetta',
  endpoint: '/api/ricette/',
  routeNames: { list: 'ricettelist', detail: 'ricettedetail', create: 'ricettecreate' },
  extraFields: [
    {
      key: 'ingredients',
      label: 'Ingredienti',
      kind: 'textarea',
      placeholder: 'Un ingrediente per riga...',
    },
    { key: 'servings', label: 'Dosi', kind: 'input', placeholder: 'Es. Per 8 persone' },
    {
      key: 'procedure',
      label: 'Procedimento',
      kind: 'textarea',
      placeholder: 'Il procedimento...',
    },
  ],
  mapMode: 'pins',
  maxPoints: 50,
}

export const personaggioConfig: TypeConfig = {
  key: 'personaggi',
  label: 'Personaggi storici',
  singularLabel: 'personaggio',
  endpoint: '/api/personaggi/',
  routeNames: { list: 'personaggilist', detail: 'personaggidetail', create: 'personaggicreate' },
  extraFields: [
    { key: 'life_dates', label: 'Date', kind: 'input', placeholder: 'Es. 1801 – 1870' },
  ],
  mapMode: 'pins',
  maxPoints: 5,
}

export const dialettoConfig: TypeConfig = {
  key: 'dialetto',
  label: 'Dialetto',
  singularLabel: 'termine',
  endpoint: '/api/dialetto/',
  routeNames: { list: 'dialettolist', detail: 'dialettodetail', create: 'dialettocreate' },
  titlePlaceholder: 'Es. Sciuscià',
  extraFields: [
    { key: 'meaning', label: 'Significato', kind: 'textarea', placeholder: 'Il significato...' },
    {
      key: 'example_usage',
      label: 'Esempio d’uso',
      kind: 'textarea',
      placeholder: 'Una frase di esempio...',
    },
  ],
  mapMode: 'none',
}

export const libroConfig: TypeConfig = {
  key: 'libri',
  label: 'Libri consigliati',
  singularLabel: 'libro',
  endpoint: '/api/libri/',
  routeNames: { list: 'librilist', detail: 'libridetail', create: 'libricreate' },
  extraFields: [
    { key: 'book_author', label: 'Autore del libro', kind: 'input', placeholder: 'Es. Anna Ferri' },
    { key: 'year', label: 'Anno', kind: 'input', placeholder: 'Es. 1987, rist. 2004' },
    { key: 'publisher', label: 'Editore', kind: 'input', placeholder: 'Es. Edizioni del Golfo' },
  ],
  imagesHint: 'Usa la copertina fornita dall’editore, non una scansione.',
  mapMode: 'none',
}

export const luogoConfig: TypeConfig = {
  key: 'luoghi',
  label: 'Luoghi',
  singularLabel: 'luogo',
  endpoint: '/api/luoghi/',
  routeNames: { list: 'luoghilist', detail: 'luoghidetail', create: 'luoghicreate' },
  titlePlaceholder: 'Es. Spiaggia di Serapo',
  extraFields: [
    {
      key: 'genre',
      label: 'Genere',
      kind: 'select',
      placeholder: 'Scegli un genere',
      optionsEndpoint: '/api/luoghi/generi/',
      displayKey: 'genre_label',
    },
    {
      key: 'how_to_get_there',
      label: 'Come arrivarci',
      kind: 'textarea',
      placeholder: 'Es. A piedi dal centro; in auto, parcheggio sulla Flacca...',
      inPlace: true,
    },
  ],
  mapMode: 'pins',
  maxPoints: 1,
  visit: { fromOutside: false, noDoor: true },
  listFilter: {
    param: 'genere',
    optionsEndpoint: '/api/luoghi/generi/',
    label: 'Filtra luoghi per genere',
    related: [{ label: 'Chiese', to: '/chiese' }],
  },
}

// Curated tours (spec itinerari.md). Their list is the generic one, narrowed by
// intent; their detail, form and guided mode are their own views, because a
// tour's stops are cards and do not fit TypeForm's field list.
export const itinerarioConfig: TypeConfig = {
  key: 'itinerari',
  label: 'Itinerari',
  singularLabel: 'itinerario',
  countNouns: ['itinerario', 'itinerari'],
  // "Mezza giornata · 5 tappe", as the itinerari canvas drew the list.
  summaryOf: (item) => {
    const stops = Array.isArray(item.stops) ? item.stops.length : 0
    const count =
      item.form === 'raccolta'
        ? stops === 1
          ? '1 luogo'
          : `${stops} luoghi`
        : stops === 1
          ? '1 tappa'
          : `${stops} tappe`
    return [item.duration, stops ? count : ''].filter(Boolean).join(' · ')
  },
  endpoint: '/api/itinerari/',
  routeNames: { list: 'itinerarilist', detail: 'itinerariodetail', create: 'itinerariocreate' },
  extraFields: [{ key: 'duration', label: 'Durata indicativa', kind: 'input' }],
  mapMode: 'none',
  listFilter: {
    param: 'intento',
    optionsEndpoint: '/api/itinerari/intenti/',
    label: 'Filtra itinerari per intento',
  },
}

export const typeConfigs: TypeConfig[] = [
  luogoConfig,
  chiesaConfig,
  ricettaConfig,
  personaggioConfig,
  dialettoConfig,
  libroConfig,
]
