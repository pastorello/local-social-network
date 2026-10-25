import shell from '@/lib/i18n/messages/shell'

// The window's title (review PR-23, N-04): the tab, the history, a bookmark
// and a shared link all say which page this is — «Santissima Annunziata ·
// Chiese · Vivere Gaeta» — rather than «Vivere Gaeta» on every one. Most
// specific first, so a row of tabs still tells them apart when they are cut
// short. The router sets each route's own (`meta.title`) after every
// navigation; a page whose title is its data — a card, a tour, a zone — sets
// it again once the data is there (composables/usePageTitle.ts). In the
// reader's language since review PR-19a: a reader's page names its route's
// title with a function, read after each navigation and again when the
// language changes (router/index.ts); a collaborator's page keeps its Italian
// strings. What `navigator.share` sends is this title too (ShareButton).
export const SITE_NAME = 'Vivere Gaeta'

// The home is the map, and its title says so, the one not built from parts.
export const homeTitle = (): string => shell().title.home

export const composeTitle = (parts: readonly string[]): string => {
  const named = parts.map((part) => part.trim()).filter(Boolean)
  return named.length ? [...named, SITE_NAME].join(' · ') : homeTitle()
}

// A route's `meta.title`: the parts themselves, or a function that says them
// in the reader's language.
export type RouteTitle = readonly string[] | (() => readonly string[])

export const titleParts = (title: RouteTitle | undefined): readonly string[] =>
  typeof title === 'function' ? title() : (title ?? [])

export const setTitle = (parts: readonly string[]): void => {
  document.title = composeTitle(parts)
}
