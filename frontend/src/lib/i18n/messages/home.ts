import { defineEntryMessages, type Widen } from '..'

// The home's words (review PR-19a): what floats over the map in both layouts,
// the sheet on a phone, the layers, the list of places — and the map's own
// name and controls. The reports' section is a collaborator's and stays
// Italian.
const it = {
  title: 'La mappa di Gaeta',
  askAgain: 'Che cosa ti va di fare?',
  placesHeading: 'Luoghi sulla mappa',
  places: (count: number) => (count === 1 ? '1 luogo' : `${count} luoghi`),
  samePlaces: 'Gli stessi luoghi disegnati sulla mappa.',
  noLayers: 'Nessun livello attivo: apri «Livelli» per scegliere cosa vedere.',
  draft: 'bozza',
  layers: 'Livelli',
  overlays: 'Sovrapposizioni',
  opacity: 'Opacità',
  sheet: {
    handle: 'Trascina per vedere più mappa',
    peek: 'Mostra i luoghi',
    half: 'Espandi l’elenco',
    full: 'Riduci l’elenco',
  },
  map: {
    label: 'Mappa di Gaeta. Usa le frecce per spostarti, + e − per lo zoom.',
    zoomIn: 'Ingrandisci',
    zoomOut: 'Riduci',
  },
}

export type HomeWords = Widen<typeof it>

export default defineEntryMessages('home', it)
