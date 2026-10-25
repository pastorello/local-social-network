import { watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useToastStore } from '../stores/toast'
import { fetchCardFirst } from '../lib/cardFirst'
import { isLocale, locale, setLocale } from '../lib/i18n'
import shell from '../lib/i18n/messages/shell'
import { wordsOf } from '../lib/i18n/messages/types'
import { setTitle, titleParts } from '../lib/pageTitle'
import {
  chiesaConfig,
  dialettoConfig,
  libroConfig,
  personaggioConfig,
  ricettaConfig,
  luogoConfig,
  attivitaConfig,
  itinerarioConfig,
} from '../definitions/typeConfigs'
// The reader's ways in — the map, the address on the B&B cards, and where it
// leads — are in the entry chunk, not a round trip after it (TD-52): their
// words are in the first paint, and the map waits for that paint. Every other
// page loads on demand. They cost ~3 KB (gzip) on every page.
import CosaFareView from '../views/CosaFareView.vue'
import EmptyRoute from '../views/EmptyRoute.vue'
import WelcomeView from '../views/WelcomeView.vue'

// A reader's page is titled in the reader's language (review PR-19a), so its
// title is a function, read when the title is set. A collaborator's page —
// `italian: true` — keeps its Italian strings: those surfaces stay Italian,
// and RoutePanel marks them so (WCAG 3.1.2).
const typeTitle = (key: string) => () => [wordsOf(key)?.label ?? key]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      // The home is the map itself (spec/design.md D13), and its chrome —
      // HomeView — is mounted by the shell for the life of the app rather than
      // by this route, so it keeps its state and its elements while a panel is
      // open over it (D15: closing a panel gives focus back to what opened it).
      // The route renders nothing of its own.
      component: EmptyRoute,
      meta: { requiresAuth: false, fullBleed: true },
    },
    {
      // The credits surface (spec/design.md D21) — a footer until the map went
      // under every page.
      path: '/il-progetto',
      name: 'progetto',
      component: () => import('../views/ProjectView.vue'),
      meta: { requiresAuth: false, title: () => [shell().title.project] },
    },
    {
      // Behind the login since 2026-10-22, like the API it reads: reports are
      // for people with an account (spec reports-and-polls.md R1).
      path: '/reports/:id',
      name: 'reportdetail',
      component: () => import('../views/ReportDetailView.vue'),
      meta: { requiresAuth: true, panel: 'narrow', title: ['Segnalazioni'], italian: true },
    },
    {
      path: '/collabora',
      name: 'collabora',
      component: () => import('../views/CollaboraView.vue'),
      meta: { requiresAuth: false, title: ['Collabora con noi'], italian: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresAuth: false, title: ['Accedi'], italian: true },
    },
    {
      path: '/invito/:token',
      name: 'inviteaccept',
      component: () => import('../views/InviteAcceptView.vue'),
      meta: { requiresAuth: false, title: ['Attiva il tuo account'], italian: true },
    },
    {
      path: '/password-dimenticata',
      name: 'passwordresetrequest',
      component: () => import('../views/PasswordResetRequestView.vue'),
      meta: { requiresAuth: false, title: ['Password dimenticata'], italian: true },
    },
    {
      path: '/reimposta-password/:token',
      name: 'passwordresetconfirm',
      component: () => import('../views/PasswordResetConfirmView.vue'),
      meta: { requiresAuth: false, title: ['Reimposta password'], italian: true },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../views/UsersView.vue'),
      meta: { requiresAuth: true, title: ['Utenti'], italian: true },
    },
    {
      // Behind the login since 2026-10-24, like the API it reads: the polls
      // are an internal tool for the people working on the archive (spec
      // reports-and-polls.md P1). A reader who follows a link here is told so.
      path: '/polls',
      name: 'polls',
      component: () => import('../views/PollsView.vue'),
      meta: {
        requiresAuth: true,
        signInToast: () => shell().pollsSignIn,
        title: ['Sondaggi'],
        italian: true,
      },
    },
    {
      // published feste are readable by anyone (spec content.md); the
      // endpoint itself enforces draft-visibility, not the route guard.
      path: '/feste',
      name: 'festelist',
      component: () => import('../views/FesteListView.vue'),
      meta: { requiresAuth: false, title: typeTitle('feste') },
    },
    {
      // Every form that writes a card opens in the editor's shape, the types
      // with no place too: one shape for writing (review PR-13, design.md
      // D19's note of 2026-10-23). A card's edit form, which opens in place
      // on its own page, asks for the same shape (composables/usePanelShape.ts).
      path: '/feste/nuova',
      name: 'festecreate',
      component: () => import('../views/FesteCreateView.vue'),
      meta: { requiresAuth: true, panel: 'editor', title: ['Nuova festa', 'Feste'], italian: true },
    },
    {
      // 'narrow' is the type's default; the card says whether it has a place,
      // and is fetched before its page mounts so the panel is born in the
      // shape it says (lib/cardFirst.ts, review PR-10). The same for every
      // type with a place below; dialetto and libri have none, and are wide.
      path: '/feste/:id',
      name: 'festedetail',
      component: () => import('../views/FesteDetailView.vue'),
      beforeEnter: fetchCardFirst('/api/feste/'),
      meta: { requiresAuth: false, panel: 'narrow', title: typeTitle('feste') },
    },
    // C3: chiese/ricette/personaggi/dialetto share the same generic
    // Type*View components, parameterized by definitions/typeConfigs.ts —
    // feste keeps its own dedicated views (unique route editor).
    {
      path: '/chiese',
      name: chiesaConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: chiesaConfig },
      meta: { requiresAuth: false, title: typeTitle(chiesaConfig.key) },
    },
    {
      path: '/chiese/nuova',
      name: chiesaConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: chiesaConfig },
      meta: {
        requiresAuth: true,
        panel: 'editor',
        title: ['Nuova scheda', chiesaConfig.label],
        italian: true,
      },
    },
    {
      path: '/chiese/:id',
      name: chiesaConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: chiesaConfig },
      beforeEnter: fetchCardFirst(chiesaConfig.endpoint),
      meta: { requiresAuth: false, panel: 'narrow', title: typeTitle(chiesaConfig.key) },
    },
    {
      path: '/ricette',
      name: ricettaConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: ricettaConfig },
      meta: { requiresAuth: false, title: typeTitle(ricettaConfig.key) },
    },
    {
      path: '/ricette/nuova',
      name: ricettaConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: ricettaConfig },
      meta: {
        requiresAuth: true,
        panel: 'editor',
        title: ['Nuova scheda', ricettaConfig.label],
        italian: true,
      },
    },
    {
      path: '/ricette/:id',
      name: ricettaConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: ricettaConfig },
      beforeEnter: fetchCardFirst(ricettaConfig.endpoint),
      meta: { requiresAuth: false, panel: 'narrow', title: typeTitle(ricettaConfig.key) },
    },
    {
      path: '/personaggi',
      name: personaggioConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: personaggioConfig },
      meta: { requiresAuth: false, title: typeTitle(personaggioConfig.key) },
    },
    {
      path: '/personaggi/nuovo',
      name: personaggioConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: personaggioConfig },
      meta: {
        requiresAuth: true,
        panel: 'editor',
        title: ['Nuova scheda', personaggioConfig.label],
        italian: true,
      },
    },
    {
      path: '/personaggi/:id',
      name: personaggioConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: personaggioConfig },
      beforeEnter: fetchCardFirst(personaggioConfig.endpoint),
      meta: { requiresAuth: false, panel: 'narrow', title: typeTitle(personaggioConfig.key) },
    },
    {
      path: '/dialetto',
      name: dialettoConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: dialettoConfig },
      meta: { requiresAuth: false, title: typeTitle(dialettoConfig.key) },
    },
    {
      path: '/dialetto/nuovo',
      name: dialettoConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: dialettoConfig },
      meta: {
        requiresAuth: true,
        panel: 'editor',
        title: ['Nuova scheda', dialettoConfig.label],
        italian: true,
      },
    },
    {
      path: '/dialetto/:id',
      name: dialettoConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: dialettoConfig },
      meta: { requiresAuth: false, title: typeTitle(dialettoConfig.key) },
    },
    {
      path: '/luoghi',
      name: luogoConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: luogoConfig },
      meta: { requiresAuth: false, title: typeTitle(luogoConfig.key) },
    },
    {
      path: '/luoghi/nuovo',
      name: luogoConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: luogoConfig },
      meta: {
        requiresAuth: true,
        panel: 'editor',
        title: ['Nuova scheda', luogoConfig.label],
        italian: true,
      },
    },
    {
      path: '/luoghi/:id',
      name: luogoConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: luogoConfig },
      beforeEnter: fetchCardFirst(luogoConfig.endpoint),
      meta: { requiresAuth: false, panel: 'narrow', title: typeTitle(luogoConfig.key) },
    },
    {
      path: '/attivita',
      name: attivitaConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: attivitaConfig },
      meta: { requiresAuth: false, title: typeTitle(attivitaConfig.key) },
    },
    {
      path: '/attivita/nuova',
      name: attivitaConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: attivitaConfig },
      meta: {
        requiresAuth: true,
        panel: 'editor',
        title: ['Nuova scheda', attivitaConfig.label],
        italian: true,
      },
    },
    {
      path: '/attivita/:id',
      name: attivitaConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: attivitaConfig },
      beforeEnter: fetchCardFirst(attivitaConfig.endpoint),
      meta: { requiresAuth: false, panel: 'narrow', title: typeTitle(attivitaConfig.key) },
    },
    {
      // The one address printed on every B&B's card (spec itinerari.md I6):
      // "Che cosa ti va di fare?". It must never move.
      path: '/benvenuto',
      name: 'benvenuto',
      component: WelcomeView,
      meta: { requiresAuth: false, title: () => [shell().title.welcome] },
    },
    {
      // «Cosa si può fare qui» (spec cosa-fare.md Part −1): a zone and what is
      // in it. Narrow, so the map beside it shows exactly the list (D5).
      path: '/cosa-fare',
      name: 'cosafare',
      component: CosaFareView,
      meta: { requiresAuth: false, panel: 'narrow', title: () => [shell().title.whatToDo] },
    },
    {
      path: '/itinerari',
      name: itinerarioConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: itinerarioConfig },
      meta: { requiresAuth: false, title: typeTitle(itinerarioConfig.key) },
    },
    {
      path: '/itinerari/nuovo',
      name: itinerarioConfig.routeNames.create,
      component: () => import('../views/ItineraryCreateView.vue'),
      meta: {
        requiresAuth: true,
        panel: 'editor',
        title: ['Nuovo itinerario', itinerarioConfig.label],
        italian: true,
      },
    },
    {
      // Narrow: an open tour draws its stops and path on the map beside it,
      // and its guided mode (?tappa=N) walks it there (I7, I11).
      path: '/itinerari/:id',
      name: itinerarioConfig.routeNames.detail,
      component: () => import('../views/ItineraryDetailView.vue'),
      meta: { requiresAuth: false, panel: 'narrow', title: typeTitle(itinerarioConfig.key) },
    },
    {
      path: '/libri',
      name: libroConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: libroConfig },
      meta: { requiresAuth: false, title: typeTitle(libroConfig.key) },
    },
    {
      path: '/libri/nuovo',
      name: libroConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: libroConfig },
      meta: {
        requiresAuth: true,
        panel: 'editor',
        title: ['Nuova scheda', libroConfig.label],
        italian: true,
      },
    },
    {
      path: '/libri/:id',
      name: libroConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: libroConfig },
      meta: { requiresAuth: false, title: typeTitle(libroConfig.key) },
    },
    {
      // «Gli eventi che conosciamo» (spec cosa-fare.md CF33, Part −1 D9):
      // events and the feasts' editions, in date order; `?finestra=` narrows
      // it to today or this week. Not in the Esplora menu nor on *Il
      // progetto*: a transient notice is not a permanent thing (CF25).
      path: '/eventi',
      name: 'eventilist',
      component: () => import('../views/EventListView.vue'),
      meta: { requiresAuth: false, title: () => [shell().title.events] },
    },
    {
      // An event, filed from a phone (spec cosa-fare.md Part −1 D9) — not a
      // card (CF25): a collaborator files it from *Le mie schede*, where their
      // events are, or from the list. The editor's shape: its one labelled
      // point is drawn on the map beside it.
      path: '/eventi/nuovo',
      name: 'eventocreate',
      component: () => import('../views/EventFormView.vue'),
      meta: { requiresAuth: true, panel: 'editor', title: ['Nuovo evento'], italian: true },
    },
    {
      // An event's own page: narrow, beside the map showing where it is held
      // (D16) — or wide, should it have no place left to show.
      path: '/eventi/:id',
      name: 'eventodetail',
      component: () => import('../views/EventDetailView.vue'),
      meta: { requiresAuth: false, panel: 'narrow', title: () => [shell().title.event] },
    },
    {
      path: '/eventi/:id/modifica',
      name: 'eventoedit',
      component: () => import('../views/EventFormView.vue'),
      meta: { requiresAuth: true, panel: 'editor', title: ['Modifica l’evento'], italian: true },
    },
    {
      // A collaborator's own cards, every type at once, behind the avatar
      // (review PR-13): where they land after signing in while one is a draft.
      path: '/le-mie-schede',
      name: 'lemieschede',
      component: () => import('../views/MyCardsView.vue'),
      meta: { requiresAuth: true, title: ['Le mie schede'], italian: true },
    },
    {
      path: '/profile/edit',
      name: 'editprofile',
      component: () => import('../views/EditProfileView.vue'),
      meta: { requiresAuth: true, title: ['Modifica profilo'], italian: true },
    },
    {
      path: '/profile/edit/password',
      name: 'editpassword',
      component: () => import('../views/EditPasswordView.vue'),
      meta: { requiresAuth: true, title: ['Cambia password'], italian: true },
    },
    {
      path: '/profile/:id',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true, title: ['Profilo'], italian: true },
    },
  ],
})

// The reader's language lives in the address (review PR-19a): `?lang=en` on
// every page while English is on, so a link copied from the address bar or
// shared carries it, and nothing while Italian is — the Italian address stays
// the canonical one. A link that names a language switches to it. Many
// links build their query from nothing (a zone's chip, a tour's stop); this
// is what keeps the language in it, as one redirect of the same navigation.
router.beforeEach(async (to) => {
  const asked = to.query.lang
  if (isLocale(asked) && asked !== locale.value) await setLocale(asked).catch(() => undefined)
  const wanted = locale.value === 'en' ? 'en' : undefined
  if (asked === wanted) return
  const query = { ...to.query }
  if (wanted) query.lang = wanted
  else delete query.lang
  return { path: to.path, query, hash: to.hash }
})

router.beforeEach((to) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.user.isAuthenticated) {
    const toast = to.meta.signInToast
    if (toast) useToastStore().showToast(5000, typeof toast === 'function' ? toast() : toast)
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }
})

// The window's title (review PR-23, N-04): the route's own, after every
// navigation — and again when the reader changes language, before the page
// whose title is its data puts its own back on top (composables/
// usePageTitle.ts, which runs after the render).
router.afterEach((to) => setTitle(titleParts(to.meta.title)))
watch(locale, () => setTitle(titleParts(router.currentRoute.value.meta.title)))

export default router
