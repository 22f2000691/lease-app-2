import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import PropertiesView from '../views/PropertiesView.vue';
import LeasesView from '../views/LeasesView.vue';
import RentCollectionView from '../views/RentCollectionView.vue';
import RenewalsView from '../views/RenewalsView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import TenantPortalView from '../views/TenantPortalView.vue';

const routes: RouteRecordRaw[] = [
  // Authentication Routes (Public/Guest)
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: {
      guestOnly: true,
      title: 'Sign In',
      subtitle: 'Access your commercial property portal'
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterView,
    meta: {
      guestOnly: true,
      title: 'Create Account',
      subtitle: 'Join as a Landlord or Commercial Tenant'
    }
  },

  // Tenant Portal (Role: tenant)
  {
    path: '/tenant-portal',
    name: 'TenantPortal',
    component: TenantPortalView,
    meta: {
      requiresAuth: true,
      role: 'tenant',
      title: 'Tenant Self-Service Portal',
      subtitle: 'Monitor your commercial lease terms, upcoming escalations, and monthly invoices.'
    }
  },

  // Landlord Routes (Role: landlord)
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
    meta: {
      requiresAuth: true,
      role: 'landlord',
      title: 'Dashboard',
      subtitle: 'Real-time overview of active leases, rent collections, and urgent renewal notices.'
    }
  },
  {
    path: '/properties',
    name: 'Properties',
    component: PropertiesView,
    meta: {
      requiresAuth: true,
      role: 'landlord',
      title: 'Properties & Locations',
      subtitle: 'Manage commercial buildings, retail complexes, and unit capacities.'
    }
  },
  {
    path: '/leases',
    name: 'Leases',
    component: LeasesView,
    meta: {
      requiresAuth: true,
      role: 'landlord',
      title: 'Tenants & Leases',
      subtitle: 'Searchable register of all commercial tenant contracts and escalated rentals.'
    }
  },
  {
    path: '/rent-collection',
    name: 'RentCollection',
    component: RentCollectionView,
    meta: {
      requiresAuth: true,
      role: 'landlord',
      title: 'Monthly Rent Collection',
      subtitle: 'Track monthly receivables, generate invoices, and log incoming payments.'
    }
  },
  {
    path: '/renewals',
    name: 'Renewals',
    component: RenewalsView,
    meta: {
      requiresAuth: true,
      role: 'landlord',
      title: 'Upcoming Renewals',
      subtitle: 'Automatic 60-day alerts for expiring commercial tenant leases.'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

// Navigation Guards: Protect routes & enforce Role-Based Access Control
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('leaseTracker_token');
  const rawProfile = localStorage.getItem('leaseTracker_profile');
  const profile = rawProfile ? JSON.parse(rawProfile) : null;
  const isAuthenticated = !!token && !!profile;

  // If already logged in, prevent accessing /login or /register
  if (to.meta.guestOnly && isAuthenticated) {
    if (profile.role === 'tenant') {
      return next('/tenant-portal');
    }
    return next('/');
  }

  // If page requires auth and user is not authenticated
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ path: '/login', query: { redirect: to.fullPath } });
  }

  // If user is authenticated, check role requirements
  if (to.meta.role && isAuthenticated) {
    if (to.meta.role !== profile.role) {
      if (profile.role === 'tenant') {
        return next('/tenant-portal');
      } else {
        return next('/');
      }
    }
  }

  next();
});

export default router;
