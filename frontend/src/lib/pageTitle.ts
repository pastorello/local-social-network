// The window's title (review PR-23, N-04): the tab, the history, a bookmark
// and a shared link all say which page this is — «Santissima Annunziata ·
// Chiese · Vivere Gaeta» — rather than «Vivere Gaeta» on every one. Most
// specific first, so a row of tabs still tells them apart when they are cut
// short. The router sets each route's own (`meta.title`) after every
// navigation; a page whose title is its data — a card, a tour, a zone — sets
// it again once the data is there (composables/usePageTitle.ts). Italian for
// now: the parts arrive as strings, so the reader's language (review PR-19)
// needs nothing here.
export const SITE_NAME = 'Vivere Gaeta'

// The home is the map, and its title says so, the one not built from parts.
export const HOME_TITLE = `${SITE_NAME} — la mappa di Gaeta`

export const composeTitle = (parts: readonly string[]): string => {
  const named = parts.map((part) => part.trim()).filter(Boolean)
  return named.length ? [...named, SITE_NAME].join(' · ') : HOME_TITLE
}

export const setTitle = (parts: readonly string[]): void => {
  document.title = composeTitle(parts)
}
