export const companyProfile = {
  legalName: 'Meta Labs Tech',
  platformName: 'NEXUS HRMS',
  website: 'https://metalabstech.com',
  email: 'info@metalabstech.com',
  phone: '+92 337 9649228',
  tagline: 'A practical HR and operations workspace for a growing software company.',
  description:
    'NEXUS HRMS brings employee records, leave, attendance, payroll, hiring, and internal communication into one clean workspace for Meta Labs Tech.',
  brand: {
    base: '#16101F',
    surface: '#1B1337',
    panel: '#2A224A',
    primary: '#7F63F4',
    secondary: '#9A85FF',
    accent: '#FFC107',
    ink: '#140A25',
    muted: '#A8A2C5',
  },
  assets: {
    logo: '/assets/brand/metalabs-logo.png',
    icon: '/assets/brand/metalabs-icon.png',
    hero: '/assets/brand/metalabs-hero.svg',
  },
  offices: [
    {
      label: 'Pakistan (Global Delivery Center)',
      city: 'Lahore',
      country: 'Pakistan',
      address: '87A, Sector C Commercial Area, Bahria Town, Lahore, Punjab',
      phone: '+92 337 9649228',
    },
    {
      label: 'UAE (Regional Office)',
      city: 'Dubai',
      country: 'UAE',
      address: 'Office 603, Sama Tower, 12 Sheikh Zayed Road, 6th Floor, Dubai',
      phone: '+971 52 6567752',
    },
  ],
  services: ['Web App Development', 'Mobile App Development', 'GIS App Development', 'Cloud Development', 'UI/UX Design', 'Digital Marketing'],
  sources: ['https://metalabstech.com/', 'https://metalabstech.com/contact-us/', 'https://metalabstech.com/services/'],
} as const;

export type CompanyProfile = typeof companyProfile;
