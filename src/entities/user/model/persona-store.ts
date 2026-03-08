import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@/features/auth/api';

export type PersonaRole = 'CAE' | 'AUDITOR' | 'EXECUTIVE' | 'AUDITEE' | 'SUPPLIER';

export interface PersonaConfig {
 id: string;
 role: PersonaRole;
 name: string;
 email: string;
 title: string;
 allowedPaths: string[];
 hiddenPaths: string[];
}

export const PERSONAS: Record<PersonaRole, PersonaConfig> = {
 CAE: {
 id: 'a0000000-0000-0000-0000-000000000010',
 role: 'CAE',
 name: 'Hilmi Duru',
 email: 'hilmi.duru@sentinelbank.com.tr',
 title: 'Baş Denetçi',
 allowedPaths: ['*'],
 hiddenPaths: [],
 },
 AUDITOR: {
 id: 'a0000000-0000-0000-0000-000000000002',
 role: 'AUDITOR',
 name: 'Ahmet Demir',
 email: 'ahmet.demir@sentinelbank.com.tr',
 title: 'Kıdemli Müfettiş',
 allowedPaths: [
 '/dashboard',
 '/execution',
 '/reporting',
 '/library',
 '/process-canvas',
 '/ccm',
 '/ai-agents',
 '/oracle',
 '/chaos-lab',
 '/automation',
 '/monitoring',
 ],
 hiddenPaths: [
 '/strategy',
 '/governance',
 '/settings',
 '/resources',
 '/qaip',
 ],
 },
 EXECUTIVE: {
 id: 'a0000000-0000-0000-0000-000000000003',
 role: 'EXECUTIVE',
 name: 'Zeynep Aydın',
 email: 'zeynep.aydin@sentinelbank.com.tr',
 title: 'Genel Müdür Yardımcısı',
 allowedPaths: [
 '/dashboard',
 '/reporting',
 '/strategy/risk-heatmap',
 '/strategy/neural-map',
 '/governance/board',
 '/governance/escalation-desk',
 '/security',
 ],
 hiddenPaths: [
 '/execution',
 '/settings',
 '/qaip',
 '/investigation',
 '/ccm',
 ],
 },
 AUDITEE: {
    id: 'a0000000-0000-0000-0000-000000000004',
    role: 'AUDITEE',
    name: 'Mehmet Kaya',
    email: 'mehmet.kaya@sentinelbank.com.tr',
    title: 'Şube Müdürü',
    allowedPaths: [
      '/dashboard',
      '/execution/actions',
      '/execution/actions/*',
      '/auditee',
      '/auditee/*',
      '/auditee-portal',
      '/auditee-portal/*',
      '/action-portal',
      '/action-portal/*'
    ],
    hiddenPaths: [
      '*'
    ],
  },
 SUPPLIER: {
 id: 'a0000000-0000-0000-0000-000000000005',
 role: 'SUPPLIER',
 name: 'Vendor Co.',
 email: 'vendor@partnerfirm.com',
 title: 'Tedarikçi Temsilcisi',
 allowedPaths: [
 '/vendor-portal',
 ],
 hiddenPaths: ['*'], // Hide everything except allowed
 },
};

interface PersonaState {
  currentPersona: PersonaRole;
  activeProfile?: UserProfile;
  setPersona: (persona: PersonaRole, profile?: UserProfile) => void;
  isPathAllowed: (path: string) => boolean;
  getCurrentPersonaConfig: () => PersonaConfig;
}

export const usePersonaStore = create<PersonaState>()(
 persist(
 (set, get) => ({
 currentPersona: 'CAE',

  setPersona: (persona: PersonaRole, profile?: UserProfile) => {
    set({ currentPersona: persona, activeProfile: profile });
    // Update localStorage for compatibility
    const config = PERSONAS[persona];
    localStorage.setItem('sentinel_user', JSON.stringify({
      name: profile ? profile.full_name : config.name,
      role: profile ? profile.title : config.title,
      email: profile ? profile.email : config.email,
    }));
  },

 isPathAllowed: (path: string): boolean => {
 const { currentPersona } = get();
 const config = PERSONAS[currentPersona];

 // CAE has full access
 if (currentPersona === 'CAE') return true;

  // Check if path is explicitly hidden
  if (config.hiddenPaths.includes('*')) {
    return config.allowedPaths.some(allowed => {
      if (allowed === '*') return true;
      if (allowed.endsWith('/*')) {
        const base = allowed.slice(0, -2);
        return path === base || path === base + '/' || path.startsWith(base + '/');
      }
      return path === allowed || path === allowed + '/' || path.startsWith(allowed + '/');
    });
  }

  // Check if path starts with any hidden path
  if (config.hiddenPaths.some(hidden => {
    if (hidden.endsWith('/*')) {
      const base = hidden.slice(0, -2);
      return path === base || path === base + '/' || path.startsWith(base + '/');
    }
    return path === hidden || path === hidden + '/' || path.startsWith(hidden + '/');
  })) {
    return false;
  }

  // Check if path starts with any allowed path
  return config.allowedPaths.some(allowed => {
    if (allowed === '*') return true;
    if (allowed.endsWith('/*')) {
      const base = allowed.slice(0, -2);
      return path === base || path === base + '/' || path.startsWith(base + '/');
    }
    return path === allowed || path === allowed + '/' || path.startsWith(allowed + '/');
  });
 },

  getCurrentPersonaConfig: (): PersonaConfig => {
    const { currentPersona, activeProfile } = get();
    const config = PERSONAS[currentPersona];
    if (activeProfile) {
      return {
        ...config,
        name: activeProfile.full_name,
        email: activeProfile.email,
        title: activeProfile.title,
      };
    }
    return config;
  },
 }),
 {
 name: 'sentinel-persona-storage',
 }
 )
);
