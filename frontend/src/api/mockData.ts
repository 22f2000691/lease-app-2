import { Property, Lease, RentRecord, UserProfile } from '../types';

export const INITIAL_PROPERTIES: Property[] = [];
export const INITIAL_LEASES: Lease[] = [];
export const INITIAL_RENTS: RentRecord[] = [];

export const DEMO_LANDLORD: UserProfile = {
  id: 'user-landlord-1',
  email: 'demo.landlord@example.com',
  full_name: 'Demo Landlord',
  phone: '',
  role: 'landlord'
};

export const DEMO_TENANT: UserProfile = {
  id: 'user-tenant-1',
  email: 'demo.tenant@example.com',
  full_name: 'Demo Tenant',
  phone: '',
  role: 'tenant'
};
