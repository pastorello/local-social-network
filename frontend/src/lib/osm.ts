// The base map is OpenStreetMap's tiles, and OpenStreetMap's data is under the
// ODbL: its tile usage policy and the OSMF's attribution guidelines ask for a
// visible credit, in a corner of the map, that names OpenStreetMap and links to
// its copyright page — readable without having to interact with the map.
//
// One host, exactly as the tile policy writes it: "other subdomains or
// hostnames may be slower or withdrawn without notice". The a/b/c subdomains
// this used before also cost a phone three TLS handshakes instead of one —
// with index.html's preconnect, the map's LCP fell from 3.6–4.2 s to 2.6–3.4 s
// on Lighthouse's simulated phone (2026-10-15, TD-52).
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright'

// Leaflet renders an attribution as HTML (`innerHTML`, like a string tooltip —
// see mapText.ts), which is why this is a constant written here and nothing
// else: never a value that comes from the API or from a person.
export const OSM_ATTRIBUTION = `© contributori di <a href="${OSM_COPYRIGHT_URL}">OpenStreetMap</a>`
