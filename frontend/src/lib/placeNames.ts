import type { Zone, ZoneAlias } from '@/definitions/interfaces/MapData'
import { localName } from '@/lib/i18n'
import cosaFare from '@/lib/i18n/messages/cosaFare'

// «Dove sei?» on «Cosa si può fare qui» (review of 2026-10-22, decision 3;
// spec cosa-fare.md Part −1, D6): a guest types the name of where they stand
// and the page picks the zone. It all runs here, in the browser, on the
// author's list of names: nothing typed is sent anywhere, and no position is
// ever asked for — geolocation is a phase of its own (roadmap 5). The names
// are Gaeta's own, in either language of the interface (review PR-19a): an
// English reader types «castello» as the signs spell it, and what they put
// before it — «I'm at the» — is left out like «sono al».

// One thing the field offers: a name from the author's list, or a zone by its
// own name, so «Porto Salvo» is found though nobody listed it. A name that is
// its zone's own («Serapo», «la Montagna Spaccata») is offered as the zone.
export interface PlaceOption {
  name: string
  zone: string
  zoneName: string
  isZone: boolean
  key: string
}

// What a guest puts before a name — «sono al porto», «davanti al castello» —
// and the article a name is written with. Taken off the front only, and never
// the last word, so «a» typed on its own still finds Ariana.
const LEADING = new Set(
  (
    'il lo la l i gli le a ad di da in su al allo alla all ai agli alle ' +
    'del dello della dell dei degli delle dal dallo dalla dall dai dagli dalle ' +
    'nel nello nella nell nei negli nelle sul sullo sulla sull sui sugli sulle ' +
    'vicino davanti accanto dietro sopra sotto presso verso dentro sono sto siamo stiamo qui qua ' +
    'the at near by on m im am we are next to'
  ).split(' '),
)

// Without accents, capitals, apostrophes and the words above: «Trinità» and
// «trinita», «l'Arenauta» and «Arenauta», «al castello» and «Castello» are
// the same name.
export const normalizePlace = (text: string): string => {
  const words = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
  while (words.length > 1 && LEADING.has(words[0]!)) words.shift()
  return words.join(' ')
}

// The author's names first, in their order, then the zones; a name already
// offered is not offered twice, and a name whose zone is unknown — the zones
// did not load, or it was removed — is not offered at all. A zone is shown by
// its name in the reader's language (lib/i18n::localName), and found by its
// Italian one, which is the one on the signs.
export const placeOptions = (
  aliases: ZoneAlias[],
  zones: Pick<Zone, 'slug' | 'name' | 'name_en'>[],
): PlaceOption[] => {
  const zoneOf = new Map(zones.map((zone) => [zone.slug, zone]))
  const seen = new Set<string>()
  const options: PlaceOption[] = []
  const add = (name: string, zone: string) => {
    const key = normalizePlace(name)
    const ofZone = zoneOf.get(zone)
    if (!key || !ofZone || seen.has(key)) return
    seen.add(key)
    const shown = localName(ofZone)
    const isZone = [ofZone.name, ofZone.name_en ?? ''].some((own) => key === normalizePlace(own))
    options.push({ name: isZone ? shown : name, zone, zoneName: shown, isZone, key })
  }
  for (const alias of aliases) add(alias.name, alias.zone)
  for (const zone of zones) add(zone.name, zone.slug)
  return options
}

// What a query finds, best first: the name itself, a name it begins, a name
// with a word it begins («trinità» → il Santuario della Trinità), and a name
// the query holds whole («spiaggia di Serapo» → Serapo). Ties keep the list's
// order; nothing is ranked by anything but how well the words match.
export const matchPlaces = (query: string, options: PlaceOption[]): PlaceOption[] => {
  const q = normalizePlace(query)
  if (!q) return options
  const rank = (key: string): number =>
    key === q
      ? 0
      : key.startsWith(q)
        ? 1
        : ` ${key}`.includes(` ${q}`)
          ? 2
          : ` ${q} `.includes(` ${key} `)
            ? 3
            : -1
  return options
    .map((option, index) => ({ option, index, rank: rank(option.key) }))
    .filter((entry) => entry.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.option)
}

// The preposition a name takes, from how it is written: «al porto», «alla
// Cattedrale», «ai Quaranta Remi», «in Piazza XIX Maggio», «a Serapo».
const ARTICLES: [RegExp, string][] = [
  [/^il\s+/i, 'al '],
  [/^lo\s+/i, 'allo '],
  [/^la\s+/i, 'alla '],
  [/^l(['’])/i, 'all$1'],
  [/^i\s+/i, 'ai '],
  [/^gli\s+/i, 'agli '],
  [/^le\s+/i, 'alle '],
]
const STREET =
  /^(via|viale|vico|vicolo|piazza|piazzale|piazzetta|largo|corso|salita|lungomare|località)(\s|$)/i

export const atPlace = (name: string): string => {
  for (const [article, preposition] of ARTICLES)
    if (article.test(name)) return name.replace(article, preposition)
  if (STREET.test(name)) return `in ${name}`
  return /^a/i.test(name) ? `ad ${name}` : `a ${name}`
}

// The line under the field once a name is chosen: «Sei al castello: ti
// mostriamo Gaeta Medievale.» A zone chosen by its own name is not told where
// it is. In the reader's language (lib/i18n/messages/cosaFare.ts).
export const placeSentence = (option: PlaceOption): string => {
  const words = cosaFare().where
  return option.isZone
    ? words.chosenZone(option.zoneName)
    : words.chosenPlace(displayName(option.name), atPlace(option.name), option.zoneName)
}

// A name as the list shows it, and as the field holds it once chosen.
export const displayName = (name: string): string => name.charAt(0).toUpperCase() + name.slice(1)
