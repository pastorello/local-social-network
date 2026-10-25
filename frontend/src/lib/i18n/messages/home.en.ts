import type { HomeWords } from './home'

// The English of home.ts (review PR-19a), written by hand against its Italian,
// which types it: a key missing here, or one the Italian does not have, does
// not compile. Apart from the Italian because it is loaded only for an English
// reader (lib/i18n/index.ts::loadEnglish), out of the first paint's bytes.
export default {
  title: 'The map of Gaeta',
  askAgain: 'What do you feel like doing?',
  placesHeading: 'Places on the map',
  places: (count: number) => (count === 1 ? '1 place' : `${count} places`),
  samePlaces: 'The same places drawn on the map.',
  noLayers: 'No layer is on: open “Layers” to choose what to see.',
  draft: 'draft',
  layers: 'Layers',
  overlays: 'Overlays',
  opacity: 'Opacity',
  sheet: {
    handle: 'Drag to see more of the map',
    peek: 'Show the places',
    half: 'Expand the list',
    full: 'Shrink the list',
  },
  map: {
    label: 'Map of Gaeta. Use the arrow keys to move around, + and − to zoom.',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
  },
} satisfies HomeWords
