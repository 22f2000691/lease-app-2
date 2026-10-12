import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import PropertiesView from '../views/PropertiesView.vue';
import LeasesView from '../views/LeasesView.vue';
import RentCollectionView from '../views/RentCollectionView.vue';
import RenewalsView from '../views/RenewalsView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
    meta: {
      title: 'Dashboard',
      subtitle: 'Real-time overview of active leases, rent collections, and urgent renewal notices.'
    }
  },
  {
    path: '/properties',
    name: 'Properties',
    component: PropertiesView,
    meta: {
      title: 'Properties & Locations',
      subtitle: 'Manage commercial buildings, retail complexes, and unit capacities.'
    }
  },
  {
    path: '/leases',
    name: 'Leases',
    component: LeasesView,
    meta: {
      title: 'Tenants & Leases',
      subtitle: 'Searchable register of all commercial tenant contracts and escalated rentals.'
    }
  },
  {
    path: '/rent-collection',
    name: 'RentCollection',
    component: RentCollectionView,
    meta: {
      title: 'Monthly Rent Collection',
      subtitle: 'Track monthly receivables, generate invoices, and log incoming payments.'
    }
  },
  {
    path: '/renewals',
    name: 'Renewals',
    component: RenewalsView,
    meta: {
      title: 'Upcoming Renewals',
      subtitle: 'Automatic 30-day alerts for expiring commercial tenant leases.'
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

export default router;
