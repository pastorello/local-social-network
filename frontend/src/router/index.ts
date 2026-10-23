import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'
import { fetchCardFirst } from '../lib/cardFirst'
import { setTitle } from '../lib/pageTitle'
import {
  chiesaConfig,
  dialettoConfig,
  libroConfig,
  personaggioConfig,
  ricettaConfig,
  luogoConfig,
  itinerarioConfig,
} from '../definitions/typeConfigs'
// The reader's ways in — the map, the address on the B&B cards, and where it
// leads — are in the entry chunk, not a round trip after it (TD-52): their
// words are in the first paint, and the map waits for that paint. Every other
// page loads on demand. They cost ~3 KB (gzip) on every page.
import CosaFareView from '../views/CosaFareView.vue'
import EmptyRoute from '../views/EmptyRoute.vue'
import WelcomeView from '../views/WelcomeView.vue'

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
      meta: { requiresAuth: false, title: ['Il progetto'] },
    },
    {
      // Behind the login since 2026-10-22, like the API it reads: reports are
      // for people with an account (spec reports-and-polls.md R1).
      path: '/reports/:id',
      name: 'reportdetail',
      component: () => import('../views/ReportDetailView.vue'),
      meta: { requiresAuth: true, panel: 'narrow', title: ['Segnalazioni'] },
    },
    {
      path: '/collabora',
      name: 'collabora',
      component: () => import('../views/CollaboraView.vue'),
      meta: { requiresAuth: false, title: ['Collabora con noi'] },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresAuth: false, title: ['Accedi'] },
    },
    {
      path: '/invito/:token',
      name: 'inviteaccept',
      component: () => import('../views/InviteAcceptView.vue'),
      meta: { requiresAuth: false, title: ['Attiva il tuo account'] },
    },
    {
      path: '/password-dimenticata',
      name: 'passwordresetrequest',
      component: () => import('../views/PasswordResetRequestView.vue'),
      meta: { requiresAuth: false, title: ['Password dimenticata'] },
    },
    {
      path: '/reimposta-password/:token',
      name: 'passwordresetconfirm',
      component: () => import('../views/PasswordResetConfirmView.vue'),
      meta: { requiresAuth: false, title: ['Reimposta password'] },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../views/UsersView.vue'),
      meta: { requiresAuth: true, title: ['Utenti'] },
    },
    {
      // poll reading is open to visitors (spec §3; M2 decision)
      path: '/polls',
      name: 'polls',
      component: () => import('../views/PollsView.vue'),
      meta: { requiresAuth: false, title: ['Sondaggi'] },
    },
    {
      // published feste are readable by anyone (spec content.md); the
      // endpoint itself enforces draft-visibility, not the route guard.
      path: '/feste',
      name: 'festelist',
      component: () => import('../views/FesteListView.vue'),
      meta: { requiresAuth: false, title: ['Feste'] },
    },
    {
      path: '/feste/nuova',
      name: 'festecreate',
      component: () => import('../views/FesteCreateView.vue'),
      meta: { requiresAuth: true, panel: 'narrow', title: ['Nuova festa', 'Feste'] },
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
      meta: { requiresAuth: false, panel: 'narrow', title: ['Feste'] },
    },
    // C3: chiese/ricette/personaggi/dialetto share the same generic
    // Type*View components, parameterized by definitions/typeConfigs.ts —
    // feste keeps its own dedicated views (unique route editor).
    {
      path: '/chiese',
      name: chiesaConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: chiesaConfig },
      meta: { requiresAuth: false, title: [chiesaConfig.label] },
    },
    {
      path: '/chiese/nuova',
      name: chiesaConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: chiesaConfig },
      meta: { requiresAuth: true, panel: 'narrow', title: ['Nuova scheda', chiesaConfig.label] },
    },
    {
      path: '/chiese/:id',
      name: chiesaConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: chiesaConfig },
      beforeEnter: fetchCardFirst(chiesaConfig.endpoint),
      meta: { requiresAuth: false, panel: 'narrow', title: [chiesaConfig.label] },
    },
    {
      path: '/ricette',
      name: ricettaConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: ricettaConfig },
      meta: { requiresAuth: false, title: [ricettaConfig.label] },
    },
    {
      path: '/ricette/nuova',
      name: ricettaConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: ricettaConfig },
      meta: { requiresAuth: true, panel: 'narrow', title: ['Nuova scheda', ricettaConfig.label] },
    },
    {
      path: '/ricette/:id',
      name: ricettaConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: ricettaConfig },
      beforeEnter: fetchCardFirst(ricettaConfig.endpoint),
      meta: { requiresAuth: false, panel: 'narrow', title: [ricettaConfig.label] },
    },
    {
      path: '/personaggi',
      name: personaggioConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: personaggioConfig },
      meta: { requiresAuth: false, title: [personaggioConfig.label] },
    },
    {
      path: '/personaggi/nuovo',
      name: personaggioConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: personaggioConfig },
      meta: {
        requiresAuth: true,
        panel: 'narrow',
        title: ['Nuova scheda', personaggioConfig.label],
      },
    },
    {
      path: '/personaggi/:id',
      name: personaggioConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: personaggioConfig },
      beforeEnter: fetchCardFirst(personaggioConfig.endpoint),
      meta: { requiresAuth: false, panel: 'narrow', title: [personaggioConfig.label] },
    },
    {
      path: '/dialetto',
      name: dialettoConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: dialettoConfig },
      meta: { requiresAuth: false, title: [dialettoConfig.label] },
    },
    {
      path: '/dialetto/nuovo',
      name: dialettoConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: dialettoConfig },
      meta: { requiresAuth: true, title: ['Nuova scheda', dialettoConfig.label] },
    },
    {
      path: '/dialetto/:id',
      name: dialettoConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: dialettoConfig },
      meta: { requiresAuth: false, title: [dialettoConfig.label] },
    },
    {
      path: '/luoghi',
      name: luogoConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: luogoConfig },
      meta: { requiresAuth: false, title: [luogoConfig.label] },
    },
    {
      path: '/luoghi/nuovo',
      name: luogoConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: luogoConfig },
      meta: { requiresAuth: true, panel: 'narrow', title: ['Nuova scheda', luogoConfig.label] },
    },
    {
      path: '/luoghi/:id',
      name: luogoConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: luogoConfig },
      beforeEnter: fetchCardFirst(luogoConfig.endpoint),
      meta: { requiresAuth: false, panel: 'narrow', title: [luogoConfig.label] },
    },
    {
      // The one address printed on every B&B's card (spec itinerari.md I6):
      // "Che cosa ti va di fare?". It must never move.
      path: '/benvenuto',
      name: 'benvenuto',
      component: WelcomeView,
      meta: { requiresAuth: false, title: ['Che cosa ti va di fare?'] },
    },
    {
      // «Cosa si può fare qui» (spec cosa-fare.md Part −1): a zone and what is
      // in it. Narrow, so the map beside it shows exactly the list (D5).
      path: '/cosa-fare',
      name: 'cosafare',
      component: CosaFareView,
      meta: { requiresAuth: false, panel: 'narrow', title: ['Cosa fare'] },
    },
    {
      path: '/itinerari',
      name: itinerarioConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: itinerarioConfig },
      meta: { requiresAuth: false, title: [itinerarioConfig.label] },
    },
    {
      path: '/itinerari/nuovo',
      name: itinerarioConfig.routeNames.create,
      component: () => import('../views/ItineraryCreateView.vue'),
      meta: {
        requiresAuth: true,
        panel: 'narrow',
        title: ['Nuovo itinerario', itinerarioConfig.label],
      },
    },
    {
      // Narrow: an open tour draws its stops and path on the map beside it,
      // and its guided mode (?tappa=N) walks it there (I7, I11).
      path: '/itinerari/:id',
      name: itinerarioConfig.routeNames.detail,
      component: () => import('../views/ItineraryDetailView.vue'),
      meta: { requiresAuth: false, panel: 'narrow', title: [itinerarioConfig.label] },
    },
    {
      path: '/libri',
      name: libroConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: libroConfig },
      meta: { requiresAuth: false, title: [libroConfig.label] },
    },
    {
      path: '/libri/nuovo',
      name: libroConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: libroConfig },
      meta: { requiresAuth: true, title: ['Nuova scheda', libroConfig.label] },
    },
    {
      path: '/libri/:id',
      name: libroConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: libroConfig },
      meta: { requiresAuth: false, title: [libroConfig.label] },
    },
    {
      path: '/profile/edit',
      name: 'editprofile',
      component: () => import('../views/EditProfileView.vue'),
      meta: { requiresAuth: true, title: ['Modifica profilo'] },
    },
    {
      path: '/profile/edit/password',
      name: 'editpassword',
      component: () => import('../views/EditPasswordView.vue'),
      meta: { requiresAuth: true, title: ['Cambia password'] },
    },
    {
      path: '/profile/:id',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true, title: ['Profilo'] },
    },
  ],
})

router.beforeEach((to) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.user.isAuthenticated) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }
})

// The window's title (review PR-23, N-04): the route's own, after every
// navigation. A page whose title is its data — a card, a tour, a zone — puts
// its own on top once it has it (composables/usePageTitle.ts).
router.afterEach((to) => setTitle(to.meta.title ?? []))

export default router
