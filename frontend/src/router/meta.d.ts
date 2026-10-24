import 'vue-router'

// What the shell reads from a route (spec/design.md D13–D17).
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    // Why a page behind the login sent a reader to sign in, said in a toast
    // over the login form — for a page a reader can reach by a link, like the
    // polls (review PR-17). Without one the guard just redirects.
    signInToast?: string
    // The home: the map itself is the page, with its chrome floating over it.
    fullBleed?: boolean
    // Every other page opens as a panel over the map (D15). 'narrow' is the
    // side panel for a card that has a place — the map beside it is doing
    // work (D16); 'wide', the default, is the centred reading panel over a
    // veiled map, for everything that has no place (D17). For a card that is
    // its type's default: the card itself says whether it has a place
    // (composables/usePanelShape.ts, review PR-10). 'editor' is every form
    // that writes a card: wide, on the right, beside a live map (review PR-13).
    panel?: 'narrow' | 'wide' | 'editor'
    // The card a detail page shows, fetched before the page mounts so its
    // panel is born in the card's shape (lib/cardFirst.ts). Set per
    // navigation by the route's guard; never declared on a route.
    card?: unknown
    // The window's title, most specific part first and without the site's
    // name, which lib/pageTitle.ts adds — «Itinerari» becomes «Itinerari ·
    // Vivere Gaeta». None on the home, whose title is its own. A page named by
    // its data puts that in front (composables/usePageTitle.ts).
    title?: string[]
  }
}
