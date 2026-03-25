export const SHOOT_COLORS = {
  wedding:    { bg: 'bg-rose-50',   border: 'border-rose-200',   dot: 'bg-rose-400',   text: 'text-rose-700'   },
  engagement: { bg: 'bg-[#EEF2EE]', border: 'border-[#B8C9A6]', dot: 'bg-[#7A8C6E]', text: 'text-[#5F6F65]'  },
  family:     { bg: 'bg-[#F8F4EE]', border: 'border-[#D4C4A8]', dot: 'bg-[#A08060]', text: 'text-[#7A6040]'  },
  other:      { bg: 'bg-[#F2F2F0]', border: 'border-[#D0CFC8]', dot: 'bg-[#8A8A80]', text: 'text-[#606060]'  },
};

export const getColors = (shootType) =>
  SHOOT_COLORS[shootType?.toLowerCase()] || SHOOT_COLORS.other;
