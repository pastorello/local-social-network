import { defineMessages } from '..'

// *Il progetto* (design.md D21, review PR-12) around its story, which is
// definitions/copy.ts's (review PR-19a). The editorial rule (D10) is said
// here in both languages: it is what a reader checks the archive against.
// The polls' line is a collaborator's, and stays Italian.
export default defineMessages({
  it: {
    title: 'Il progetto',
    use: {
      heading: 'Come si usa',
      tours: 'Itinerari',
      toursLine:
        ': giri della città scritti dai collaboratori, da seguire una tappa alla volta, con le indicazioni per arrivare a ciascuna.',
      whatToDo: 'Cosa si può fare qui',
      whatToDoLine:
        ': scegli una zona della città e trovi i luoghi, le chiese, gli itinerari e le feste che ci sono.',
      map: 'La mappa',
      mapLine:
        ': ogni scheda che ha un posto è sulla mappa; scegli i livelli da vedere, e gli stessi posti sono anche in un elenco.',
    },
    rule: {
      heading: 'La regola',
      text: 'Le schede di questo archivio sono scelte per merito editoriale: nessuna presenza è acquistata.',
    },
    join: {
      heading: 'Partecipa',
      collaborate: 'Collabora con noi',
      collaborateLine:
        ': se Gaeta la conosci e vuoi scriverne, chiedi di entrare nel gruppo che scrive l’archivio.',
      mistake: 'Hai trovato un errore o una cosa che manca?',
      writeUs: 'Scrivici',
      writeUsLine: ', e nel messaggio indica la scheda e che cosa non torna.',
    },
    index: {
      start: 'Per cominciare',
      map: 'Mappa',
      tours: 'Itinerari',
      found: 'Cosa trovi su Vivere Gaeta',
    },
    // «Mappa e zone: © contributori di OpenStreetMap, dati disponibili con
    // licenza ODbL.» — the two names are links, so the sentence is in parts.
    credits: {
      label: 'Crediti',
      before: 'Mappa e zone: © contributori di',
      afterOsm: ', dati disponibili con licenza',
      end: '.',
    },
  },
  en: {
    title: 'About',
    use: {
      heading: 'How it works',
      tours: 'Tours',
      toursLine:
        ': walks through the town written by the contributors, to follow one stop at a time, with directions to each.',
      whatToDo: 'What there is to do here',
      whatToDoLine:
        ': choose a part of town and find the places, the churches, the tours and the feasts that are there.',
      map: 'The map',
      mapLine:
        ': every entry that has a place is on the map; choose the layers to see, and the same places are in a list too.',
    },
    rule: {
      heading: 'The rule',
      text: 'The entries in this archive are chosen on editorial merit: no presence in it is bought.',
    },
    join: {
      heading: 'Take part',
      collaborate: 'Write with us',
      collaborateLine:
        ': if you know Gaeta and want to write about it, ask to join the group that writes the archive.',
      mistake: 'Found a mistake, or something missing?',
      writeUs: 'Write to us',
      writeUsLine: ', and say in your message which entry it is and what is wrong.',
    },
    index: {
      start: 'Getting started',
      map: 'Map',
      tours: 'Tours',
      found: 'What you will find on Vivere Gaeta',
    },
    credits: {
      label: 'Credits',
      before: 'Map and areas: ©',
      afterOsm: ' contributors, data available under the',
      end: ' licence.',
    },
  },
})
