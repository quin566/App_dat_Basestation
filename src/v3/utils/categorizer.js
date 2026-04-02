// Transaction auto-categorizer — pure functions, no side effects

export const CATEGORIES = [
  'Income',
  'Transfer',
  'Refund',
  'Interest',
  'Tax Refund',
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

// Keywords that indicate a positive-amount transaction is NOT actual business income.
// Checked before the 'Income' fallback; first match wins.
const DEPOSIT_EXCLUSION_RULES = [
  {
    category: 'Tax Refund',
    keywords: [
      'tax refund', 'irs refund', 'irs treas', 'state refund', 'az tax refund',
      'federal refund', 'azdor refund',
    ],
  },
  {
    category: 'Refund',
    keywords: [
      'refund', 'return credit', 'chargeback', 'reversal', 'dispute credit',
      'credit adjustment', 'billing credit',
    ],
  },
  {
    category: 'Interest',
    keywords: [
      'interest paid', 'interest earned', 'savings interest', 'interest credit',
      'dividend', 'apy credit', 'yield',
    ],
  },
  {
    category: 'Transfer',
    keywords: [
      'transfer from', 'transfer to', 'ach transfer', 'wire transfer',
      'online transfer', 'mobile transfer', 'account transfer', 'bank transfer',
      'from savings', 'from checking', 'zelle transfer', 'internal transfer',
    ],
  },
];

// Keyword → category rules. First match wins. Income handled separately by amount sign.
const RULES = [
  {
    category: 'Equipment',
    keywords: [
      'adorama', "b&h", 'b & h', 'bhphoto', 'nikon', 'canon', 'sony', 'fujifilm',
      'lens', 'camera', 'tripod', 'godox', 'profoto', 'westcott', 'manfrotto',
      'peak design', 'thinktank', 'lowepro', 'sandisk', 'lexar', 'cfexpress',
      'blackmagic', 'dji', 'rode', 'sennheiser', 'atomos', 'smallrig', 'joby',
      'benro', 'gitzo', 'arca-swiss', 'color checker', 'x-rite', 'datacolor',
      'spyder', 'calibrite', 'acratech', 'really right stuff', 'rrs',
    ],
  },
  {
    category: 'Software',
    keywords: [
      'adobe', 'lightroom', 'photoshop', 'capture one', 'luminar', 'skylum',
      'dropbox', 'google drive', 'google one', 'icloud', 'backblaze',
      'cloudflare', 'squarespace', 'wix', 'showit', 'pixieset', 'pic-time',
      'cloudspot', 'shootproof', 'smugmug', 'zenfolio', 'pass gallery',
      'honeybook', 'dubsado', 'studio ninja', '17hats', 'quickbooks',
      'notion', 'slack', 'zoom', 'calendly', 'acuity', 'táve',
      'iris works', 'sprout studio', 'táve studio manager',
      'aftershoot', 'imagen', 'topaz', 'dxo', 'nik collection',
      'narrative', 'auto-retouch', 'photomechanic', 'photo mechanic',
    ],
  },
  {
    category: 'Marketing',
    keywords: [
      'facebook ads', 'meta ads', 'instagram ads', 'google ads', 'pinterest ads',
      'moo.com', 'vistaprint', 'canva', 'envato', 'shutterstock', 'getty',
      'the knot', 'wedding wire', 'weddingwire', 'zola', 'thumbtack', 'yelp advertising',
      'junebug weddings', 'style me pretty', 'green wedding shoes', 'magnolia rouge',
      'borrowed & blue', 'wed society', 'mailchimp', 'flodesk', 'convertkit',
    ],
  },
  {
    category: 'Travel',
    keywords: [
      'uber', 'lyft', 'waymo', 'delta', 'american airlines', 'southwest',
      'united airlines', 'jetblue', 'spirit airlines', 'frontier',
      'marriott', 'hilton', 'hyatt', 'ihg', 'airbnb', 'vrbo',
      'shell', 'chevron', 'bp', 'exxon', 'mobil', 'arco', 'circle k',
      'enterprise', 'hertz', 'avis', 'budget rental', 'turo',
      'parking', 'toll ', 'expressway', 'google maps',
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
      'foreverguard', 'hill & usher', 'ppa insurance',
    ],
  },
  {
    category: 'Education',
    keywords: [
      'fstoppers', 'creativelive', 'skillshare', 'udemy', 'lynda', 'linkedin learning',
      'workshop', 'masterclass', 'coursera', 'kelbyone', 'kelby',
      'sue bryce', 'the photo mindset', 'click magazine', 'jasper james',
      'photography life', 'ppa ', 'professional photographers',
    ],
  },
  {
    category: 'Studio / Rent',
    keywords: [
      'studio rental', 'coworking', 'wework', 'regus', 'industrial studios',
      'the pod', 'photo studio', 'set rental', 'location fee', 'venue rental',
    ],
  },
  {
    category: 'Contractors',
    keywords: [
      'second shooter', 'photo editor', 'retoucher', 'virtual assistant',
      'va payment', 'contractor payment', 'freelance', 'photo editing service',
      'editing team', 'outsource editing', 'image editing',
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
  const desc = (txn.description || '').toLowerCase();
  if (txn.amount > 0) {
    for (const rule of DEPOSIT_EXCLUSION_RULES) {
      if (rule.keywords.some((kw) => desc.includes(kw))) return rule.category;
    }
    return 'Income';
  }
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
  const desc = (txn.description || '').toLowerCase();
  if (txn.amount > 0) {
    // User rules can override even for deposits
    for (const rule of userRules) {
      if (rule.pattern && desc.includes(rule.pattern.toLowerCase())) return rule.category;
    }
    for (const rule of DEPOSIT_EXCLUSION_RULES) {
      if (rule.keywords.some((kw) => desc.includes(kw))) return rule.category;
    }
    return 'Income';
  }
  for (const rule of userRules) {
    if (rule.pattern && desc.includes(rule.pattern.toLowerCase())) return rule.category;
  }
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => desc.includes(kw))) return rule.category;
  }
  return 'Other';
};
