import L from 'leaflet'

/**
 * Keep Leaflet's markers out of the tab order — the decision of 2026-09-05,
 * made real.
 *
 * ADR-0005 settled that the **text lists** are this map's conforming path and
 * that its pins are not in the tab order. The code did not agree: Leaflet ships
 * `keyboard: true` on every marker, and `leaflet.markercluster` builds its
 * cluster icons as markers too, so a reader on a phone tabbed through the map
 * container and then six unnamed stops that announce as "2", "3", "6" before
 * reaching anything with a name. Found by counting tab stops, not by reading.
 *
 * The prototype default rather than an option per marker: cluster icons are
 * created inside the library, on every zoom, so there is no instance to pass an
 * option to — and this app never wants a focusable Leaflet marker anywhere.
 * The one thing that *stays* focusable is the map container itself, which is
 * what makes arrow-key panning possible; it gets a name instead.
 */
export const keepMarkersOutOfTabOrder = () => {
  L.Marker.prototype.options.keyboard = false
}
