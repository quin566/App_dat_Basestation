// Transaction auto-categorizer — pure functions, no side effects

export const CATEGORIES = [
  'Income',
  'Equipment',
  'Software',
  'Marketing',
  'Travel',
  'Education',
  'Insurance',
  'Studio / Rent',
  'Taxes',
  'Contractors',
  'Meals',
  'Other',
];

// Keyword → category rules. First match wins. Income handled separately by amount sign.
const RULES = [
  {
    category: 'Equipment',
    keywords: [
      'adorama', "b&h", 'b & h', 'bhphoto', 'nikon', 'canon', 'sony', 'fujifilm',
      'lens', 'camera', 'tripod', 'godox', 'profoto', 'westcott', 'manfrotto',
      'peak design', 'thinktank', 'lowepro', 'sandisk', 'lexar', 'cfexpress',
      'blackmagic', 'dji', 'rode', 'sennheiser',
    ],
  },
  {
    category: 'Software',
    keywords: [
      'adobe', 'lightroom', 'photoshop', 'capture one', 'luminar', 'skylum',
      'dropbox', 'google drive', 'google one', 'icloud', 'backblaze',
      'cloudflare', 'squarespace', 'wix', 'showit', 'pixieset', 'pic-time',
      'honeybook', 'dubsado', 'studio ninja', '17hats', 'quickbooks',
      'notion', 'slack', 'zoom', 'calendly', 'acuity',
    ],
  },
  {
    category: 'Marketing',
    keywords: [
      'facebook ads', 'meta ads', 'instagram ads', 'google ads', 'pinterest ads',
      'moo.com', 'vistaprint', 'canva', 'envato', 'shutterstock', 'getty',
      'the knot', 'wedding wire', 'zola', 'thumbtack', 'yelp advertising',
    ],
  },
  {
    category: 'Travel',
    keywords: [
      'uber', 'lyft', 'waymo', 'delta', 'american airlines', 'southwest',
      'united airlines', 'jetblue', 'spirit airlines', 'frontier',
      'marriott', 'hilton', 'hyatt', 'ihg', 'airbnb', 'vrbo',
      'shell', 'chevron', 'bp', 'exxon', 'mobil', 'arco', 'circle k',
      'enterprise', 'hertz', 'avis', 'budget rental',
    ],
  },
  {
    category: 'Taxes',
    keywords: [
      'irs ', 'internal revenue', 'arizona dept of revenue', 'azdor',
      'estimated tax', 'tax payment', 'tax prep', 'turbotax', 'h&r block',
    ],
  },
  {
    category: 'Insurance',
    keywords: [
      'insurance', 'hiscox', 'state farm', 'progressive', 'allstate',
      'nationwide', 'usaa', 'travelers', 'liability policy',
    ],
  },
  {
    category: 'Education',
    keywords: [
      'fstoppers', 'creativelive', 'skillshare', 'udemy', 'lynda', 'linkedin learning',
      'workshop', 'masterclass', 'coursera', 'kelbyone', 'kelby',
    ],
  },
  {
    category: 'Studio / Rent',
    keywords: [
      'studio rental', 'coworking', 'wework', 'regus', 'industrial studios',
      'the pod', 'photo studio', 'set rental',
    ],
  },
  {
    category: 'Contractors',
    keywords: [
      'second shooter', 'photo editor', 'retoucher', 'virtual assistant',
      'va payment', 'contractor payment', 'freelance',
    ],
  },
  {
    category: 'Meals',
    keywords: [
      'doordash', 'ubereats', 'grubhub', 'instacart', 'postmates',
      'starbucks', 'chipotle', 'panera', 'subway', 'mcdonald',
      'restaurant', 'cafe', 'coffee', 'lunch', 'dinner',
    ],
  },
];

/**
 * Categorize a single transaction using only built-in keyword rules.
 */
export const categorize = (txn) => {
  if (txn.amount > 0) return 'Income';
  const desc = (txn.description || '').toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => desc.includes(kw))) return rule.category;
  }
  return 'Other';
};

/**
 * Categorize with user-defined rules taking priority over built-ins.
 * @param {{ description: string, amount: number }} txn
 * @param {Array<{ pattern: string, category: string }>} userRules
 */
export const categorizeWithRules = (txn, userRules = []) => {
  if (txn.amount > 0) return 'Income';
  const desc = (txn.description || '').toLowerCase();
  for (const rule of userRules) {
    if (rule.pattern && desc.includes(rule.pattern.toLowerCase())) return rule.category;
  }
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => desc.includes(kw))) return rule.category;
  }
  return 'Other';
};
