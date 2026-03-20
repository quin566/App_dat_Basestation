export const defaultState = {
  grossRevenue: 95000,
  bizExpenses: 25000,
  revenueTarget: 100000,
  customPerks: [],
  customChecks: [],
  profile: {},
  crmLeads: [],
  bookedClients: [],
  sneakPeeks: [],
  socialCards: [],
  complianceChecks: {},
  totalTax: 12000,
  businessProfile: {},
  revenueTarget: 100000,
  compliancePaid: {},
  workflows: [],
  emailTemplates: [
    {
      id: 'pre-loaded-1',
      name: 'What to Wear Guide (Engagement)',
      subject: 'Your Session - Style Notes!',
      body: 'Hi {{ClientName}}, I am SO excited for our {{ShootType}} session on {{Date}}! Top wardrobe tips: TONES: Think warm, earthy -- creams, sage greens, dusty roses. AVOID bright white or neon. LAYERS: A flowy dress or linen blazer adds movement. COORDINATE BUT DO NOT MATCH. COMFORT IS KEY -- wear something you feel gorgeous in! See you soon! Ariana, The Love Lens by Ariana'
    },
    {
      id: 'pre-loaded-2',
      name: 'Pre-Wedding Touch Base',
      subject: 'A Few Days Away -- Locking In the Details!',
      body: 'Hi {{ClientName}}, Your wedding day is almost here -- I am so honored to be your photographer! Here is a quick checklist: Location: {{Location}} | Arrival Time: {{ArrivalTime}} | Please send over your shot list and key family members for portraits. A reminder that your final balance of {{BalanceDue}} is due on {{BalanceDueDate}}. I will be in touch the morning of with my ETA. Cannot wait to document every magical moment! Love, Ariana, The Love Lens by Ariana'
    },
    {
      id: 'pre-loaded-3',
      name: 'Gallery Delivery (Pixieset)',
      subject: 'Your Gallery is Live! {{ClientName}}',
      body: 'Hi {{ClientName}}, Your gallery is officially live! GALLERY LINK: {{GalleryLink}} | PASSWORD: {{Password}} -- {{NumPhotos}} hand-edited images, each chosen because it captured something real, something true, something YOU. Downloading: Click any image for print-ready resolution. Gallery is available for 90 days. Thank you for trusting me with your story. With love, Ariana, The Love Lens by Ariana'
    }
  ],
  emailSettings: { address: '', appPassword: '' }
};

export const mergeState = (stored) => {
  if (!stored || Object.keys(stored).length === 0) return { ...defaultState };
  
  const merged = { ...defaultState, ...stored };
  
  // Ensure pre-loaded templates always exist
  const existingIds = (merged.emailTemplates || []).map(t => t.id);
  const missing = defaultState.emailTemplates.filter(t => !existingIds.includes(t.id));
  
  if (missing.length > 0) {
    merged.emailTemplates = [...missing, ...(merged.emailTemplates || [])];
  }
  
  return merged;
};
