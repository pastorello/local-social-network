import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/reports/:id',
      name: 'reportdetail',
      component: () => import('../views/ReportDetailView.vue'),
      meta: { requiresAuth: false },
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
      meta: { requiresAuth: true },
    },
    {
      path: '/feste/:id',
      name: 'festedetail',
      component: () => import('../views/FesteDetailView.vue'),
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
