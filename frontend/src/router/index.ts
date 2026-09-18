import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'
import {
  chiesaConfig,
  dialettoConfig,
  libroConfig,
  personaggioConfig,
  ricettaConfig,
  luogoConfig,
  itinerarioConfig,
} from '../definitions/typeConfigs'

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
      component: () => import('../views/EmptyRoute.vue'),
      meta: { requiresAuth: false, fullBleed: true },
    },
    {
      // The credits surface (spec/design.md D21) — a footer until the map went
      // under every page.
      path: '/il-progetto',
      name: 'progetto',
      component: () => import('../views/ProjectView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/reports/:id',
      name: 'reportdetail',
      component: () => import('../views/ReportDetailView.vue'),
      meta: { requiresAuth: false, panel: 'narrow' },
    },
    {
      path: '/collabora',
      name: 'collabora',
      component: () => import('../views/CollaboraView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/invito/:token',
      name: 'inviteaccept',
      component: () => import('../views/InviteAcceptView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/password-dimenticata',
      name: 'passwordresetrequest',
      component: () => import('../views/PasswordResetRequestView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/reimposta-password/:token',
      name: 'passwordresetconfirm',
      component: () => import('../views/PasswordResetConfirmView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../views/UsersView.vue'),
      meta: { requiresAuth: true },
    },
    {
      // poll reading is open to visitors (spec §3; M2 decision)
      path: '/polls',
      name: 'polls',
      component: () => import('../views/PollsView.vue'),
      meta: { requiresAuth: false },
    },
    {
      // published feste are readable by anyone (spec content.md); the
      // endpoint itself enforces draft-visibility, not the route guard.
      path: '/feste',
      name: 'festelist',
      component: () => import('../views/FesteListView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/feste/nuova',
      name: 'festecreate',
      component: () => import('../views/FesteCreateView.vue'),
      meta: { requiresAuth: true, panel: 'narrow' },
    },
    {
      path: '/feste/:id',
      name: 'festedetail',
      component: () => import('../views/FesteDetailView.vue'),
      meta: { requiresAuth: false, panel: 'narrow' },
    },
    // C3: chiese/ricette/personaggi/dialetto share the same generic
    // Type*View components, parameterized by definitions/typeConfigs.ts —
    // feste keeps its own dedicated views (unique route editor).
    {
      path: '/chiese',
      name: chiesaConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: chiesaConfig },
      meta: { requiresAuth: false },
    },
    {
      path: '/chiese/nuova',
      name: chiesaConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: chiesaConfig },
      meta: { requiresAuth: true, panel: 'narrow' },
    },
    {
      path: '/chiese/:id',
      name: chiesaConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: chiesaConfig },
      meta: { requiresAuth: false, panel: 'narrow' },
    },
    {
      path: '/ricette',
      name: ricettaConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: ricettaConfig },
      meta: { requiresAuth: false },
    },
    {
      path: '/ricette/nuova',
      name: ricettaConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: ricettaConfig },
      meta: { requiresAuth: true, panel: 'narrow' },
    },
    {
      path: '/ricette/:id',
      name: ricettaConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: ricettaConfig },
      meta: { requiresAuth: false, panel: 'narrow' },
    },
    {
      path: '/personaggi',
      name: personaggioConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: personaggioConfig },
      meta: { requiresAuth: false },
    },
    {
      path: '/personaggi/nuovo',
      name: personaggioConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: personaggioConfig },
      meta: { requiresAuth: true, panel: 'narrow' },
    },
    {
      path: '/personaggi/:id',
      name: personaggioConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: personaggioConfig },
      meta: { requiresAuth: false, panel: 'narrow' },
    },
    {
      path: '/dialetto',
      name: dialettoConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: dialettoConfig },
      meta: { requiresAuth: false },
    },
    {
      path: '/dialetto/nuovo',
      name: dialettoConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: dialettoConfig },
      meta: { requiresAuth: true },
    },
    {
      path: '/dialetto/:id',
      name: dialettoConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: dialettoConfig },
      meta: { requiresAuth: false },
    },
    {
      path: '/luoghi',
      name: luogoConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: luogoConfig },
      meta: { requiresAuth: false },
    },
    {
      path: '/luoghi/nuovo',
      name: luogoConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: luogoConfig },
      meta: { requiresAuth: true, panel: 'narrow' },
    },
    {
      path: '/luoghi/:id',
      name: luogoConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: luogoConfig },
      meta: { requiresAuth: false, panel: 'narrow' },
    },
    {
      // The one address printed on every B&B's card (spec itinerari.md I6):
      // "Che cosa ti va di fare?". It must never move.
      path: '/benvenuto',
      name: 'benvenuto',
      component: () => import('../views/WelcomeView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/itinerari',
      name: itinerarioConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: itinerarioConfig },
      meta: { requiresAuth: false },
    },
    {
      path: '/itinerari/nuovo',
      name: itinerarioConfig.routeNames.create,
      component: () => import('../views/ItineraryCreateView.vue'),
      meta: { requiresAuth: true, panel: 'narrow' },
    },
    {
      // Narrow: an open tour draws its stops and path on the map beside it,
      // and its guided mode (?tappa=N) walks it there (I7, I11).
      path: '/itinerari/:id',
      name: itinerarioConfig.routeNames.detail,
      component: () => import('../views/ItineraryDetailView.vue'),
      meta: { requiresAuth: false, panel: 'narrow' },
    },
    {
      path: '/libri',
      name: libroConfig.routeNames.list,
      component: () => import('../views/TypeListView.vue'),
      props: { config: libroConfig },
      meta: { requiresAuth: false },
    },
    {
      path: '/libri/nuovo',
      name: libroConfig.routeNames.create,
      component: () => import('../views/TypeCreateView.vue'),
      props: { config: libroConfig },
      meta: { requiresAuth: true },
    },
    {
      path: '/libri/:id',
      name: libroConfig.routeNames.detail,
      component: () => import('../views/TypeDetailView.vue'),
      props: { config: libroConfig },
      meta: { requiresAuth: false },
    },
    {
      path: '/profile/edit',
      name: 'editprofile',
      component: () => import('../views/EditProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile/edit/password',
      name: 'editpassword',
      component: () => import('../views/EditPasswordView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile/:id',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true },
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

export default router
