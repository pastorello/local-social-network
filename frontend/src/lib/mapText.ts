// Leaflet treats a tooltip given as a string as HTML — `Tooltip._updateContent`
// assigns it to `innerHTML` — so a card titled `<img src=x onerror=…>` would
// run its script for anyone who hovers the pin. Titles, pin labels, report
// titles and overlay names are all typed by people, and none of them is
// sanitized (only `body_html` is, ADR-0001's amendment). Every text the map
// shows goes through here instead: a node whose `textContent` is the text,
// which Leaflet appends as it is. `mapText.spec.ts` fails if a `bindTooltip`
// anywhere in `src/` is handed anything else.
export const mapText = (text: string): HTMLElement => {
  const node = document.createElement('span')
  node.textContent = text
  return node
}
