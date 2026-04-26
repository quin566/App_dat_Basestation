export const DEFAULT_SHOOT_FOLDER_TREE = [
  { id: 'catalog',          name: '01_Catalog',                    type: 'folder', enabled: true,  children: [] },
  { id: 'raw',              name: '02_RAW',                        type: 'folder', enabled: true,  children: [] },
  { id: 'finals',           name: '03_Finals',                     type: 'folder', enabled: true,  children: [
    { id: 'finals-full',    name: 'Full Resolution',               type: 'folder', enabled: true,  children: [] },
    { id: 'finals-web',     name: 'Web Size',                      type: 'folder', enabled: true,  children: [] },
  ]},
  { id: 'delivery',         name: '04_Delivery',                   type: 'folder', enabled: true,  children: [
    { id: 'delivery-sneak', name: 'Sneak Peeks',                   type: 'folder', enabled: true,  children: [] },
    { id: 'delivery-gallery', name: 'Final Gallery',               type: 'folder', enabled: true,  children: [] },
    { id: 'delivery-social', name: 'Social Media',                 type: 'folder', enabled: true,  children: [] },
  ]},
  { id: 'backup',           name: '05_Backup',                     type: 'folder', enabled: true,  children: [] },
  { id: 'readme',           name: 'README_Lightroom_Workflow.txt', type: 'file',   enabled: true,  children: [] },
  { id: 'checklist',        name: 'Shoot_Checklist.txt',           type: 'file',   enabled: true,  children: [] },
];

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
  galleryDeliveries: [],
  gallerySettings: {
    dueSoonDays: 5,
    urgentDays: 2,
  },
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
  shootFolderSettings: {
    parentFolderPath: '',
    autoOpen: true,
    folderTree: DEFAULT_SHOOT_FOLDER_TREE,
  },
  emailSelectedTemplateId: '',
  emailTokenValues: {},
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

  // Backfill email UI persistence
  if (!merged.emailSelectedTemplateId) merged.emailSelectedTemplateId = '';
  if (!merged.emailTokenValues || typeof merged.emailTokenValues !== 'object') merged.emailTokenValues = {};

  // Backfill shootFolderSettings
  merged.shootFolderSettings = {
    ...defaultState.shootFolderSettings,
    ...(stored.shootFolderSettings || {}),
    folderTree: stored.shootFolderSettings?.folderTree || defaultState.shootFolderSettings.folderTree,
  };

  // Ensure emailTemplates is always an array
  if (!Array.isArray(merged.emailTemplates)) merged.emailTemplates = [];

  // Ensure galleryDeliveries is always an array
  if (!Array.isArray(merged.galleryDeliveries)) merged.galleryDeliveries = [];

  // Backfill gallerySettings
  merged.gallerySettings = { ...defaultState.gallerySettings, ...(stored.gallerySettings || {}) };

  return merged;
};
