export interface FieldConfig {
  key: string
  label: string
  kind: 'input' | 'textarea'
  placeholder?: string
}

export interface TypeConfig {
  key: string
  label: string
  singularLabel: string
  endpoint: string
  routeNames: { list: string; detail: string; create: string }
  extraFields: FieldConfig[]
  mapMode: 'none' | 'pins'
  maxPoints?: number
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
  extraFields: [
    { key: 'term', label: 'Termine', kind: 'input', placeholder: 'Es. Muffato' },
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
  mapMode: 'none',
}

export const typeConfigs: TypeConfig[] = [
  chiesaConfig,
  ricettaConfig,
  personaggioConfig,
  dialettoConfig,
  libroConfig,
]
