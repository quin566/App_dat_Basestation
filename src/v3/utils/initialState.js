export const emptyClient = {
  id: '',
  name: '',
  phone: '',
  email: '',
  shootType: '',
  shootDate: '',
  shootTime: '',
  duration: '',
  location: {
    name: '',
    address: '',
    mapUrl: '',
    parkingNotes: '',
  },
  packageName: '',
  packageTotal: 0,
  amountPaid: 0,
  paymentDueDate: '',
  stripePaymentLink: '',
  contractSigned: false,
  contractUrl: '',
  inspirationAssets: [],
  notes: '',
  emailThreadIds: [],
  smsReminders: {
    threeDaySent: false,
    morningOfSent: false,
  },
  tags: [],
  createdAt: '',
  updatedAt: '',
};

export const emptyLocation = {
  id: '',
  name: '',
  notes: '',
  mapUrlGoogle: '',
  mapUrlApple: '',
  photos: [],
  updatedAt: '',
};

export const defaultState = {
  grossRevenue: 95000,
  bizExpenses: 25000,
  revenueTarget: 100000,
  customPerks: [],
  customChecks: [],
  profile: {},
  bookedClients: [],
  locations: [],
  sneakPeeks: [],
  socialCards: [],
  complianceChecks: {},
  totalTax: 12000,
  businessProfile: {},
  compliancePaid: {},
  workflows: [],
  smsSettings: {
    accountSid: '',
    authToken: '',
    fromNumber: '',
  },
  emailTemplates: [],
  emailSettings: { address: '', appPassword: '' },
  geminiKey: '',
  stripeSecretKey: '',
  stripePublishableKey: '',
  bankAccounts: [],
  transactions: [],
  categoryRules: [],
  financialSettings: {
    syncFrequencyMinutes: 30,
    autoCategorize: true,
    ignoredMerchants: [],
    customCategories: [],
  },
};

export const mergeState = (stored) => {
  if (!stored || Object.keys(stored).length === 0) return { ...defaultState };

  const merged = { ...defaultState, ...stored };

  // Backfill any missing keys on each client record
  if (Array.isArray(merged.bookedClients)) {
    merged.bookedClients = merged.bookedClients.map(client => ({
      ...emptyClient,
      ...client,
      location: { ...emptyClient.location, ...(client.location || {}) },
      smsReminders: { ...emptyClient.smsReminders, ...(client.smsReminders || {}) },
    }));
  }

  // Backfill location records
  if (Array.isArray(merged.locations)) {
    merged.locations = merged.locations.map(loc => ({ ...emptyLocation, ...loc }));
  } else {
    merged.locations = [];
  }

  // Backfill smsSettings
  merged.smsSettings = { ...defaultState.smsSettings, ...(stored.smsSettings || {}) };

  // Backfill financialSettings
  merged.financialSettings = { ...defaultState.financialSettings, ...(stored.financialSettings || {}) };
  if (!Array.isArray(merged.categoryRules)) merged.categoryRules = [];

  // Ensure emailTemplates is always an array
  if (!Array.isArray(merged.emailTemplates)) merged.emailTemplates = [];

  return merged;
};
