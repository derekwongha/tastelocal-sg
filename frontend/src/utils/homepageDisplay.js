const DEMO_PREFIXES = [
  /^\s*\[Demo(?: review)?\]\s*/i,
  /^\s*TasteLocal Demo\s*[\u2014\u2013-]\s*/i,
  /^\s*Demo area\s*[\u2014\u2013-]\s*/i,
  /^\s*Demo profile\s*[\u2014\u2013-]\s*/i,
  /^\s*Demo Vendor\s*[\u2014\u2013-]?\s*/i,
  /^\s*Demo Tourist\s*[\u2014\u2013-]?\s*/i,
];

const CATEGORY_COPY = {
  'Heritage Food': 'Traditional flavours, family-table recipes and cultural food stories.',
  'Local Desserts': 'Colourful kueh, pandan, coconut and nostalgic local sweets.',
  'Modern Singapore Food': 'Contemporary plates inspired by familiar Singapore flavours.',
  'Culinary Workshops': 'Hands-on sessions with local ingredients, techniques and guidance.',
};

export const cleanPublicLabel = (value = '') => DEMO_PREFIXES.reduce(
  (result, pattern) => result.replace(pattern, ''),
  String(value),
).trim();

export const cleanPublicDescription = (value = '') => String(value)
  .replace(/\bFictional demo profile for capstone testing;\s*not a real business\.\s*/gi, '')
  .replace(/\bThis profile presents\b/gi, 'This local host presents')
  .replace(/\bA fictional introduction\b/gi, 'An introduction')
  .replace(/\bA fictional\b/gi, 'A')
  .replace(/\bclearly fictional\b/gi, 'curated')
  .replace(/\bfictional\b/gi, '')
  .replace(/\bclearly labelled demonstration accompaniments\b/gi, 'classic accompaniments')
  .replace(/\blabelled demonstration ingredients\b/gi, 'carefully selected ingredients')
  .replace(/\bcapstone demonstration\b/gi, 'curious food lovers')
  .replace(/\bhigh-price filter demonstration\b/gi, 'refined contemporary dining')
  .replace(/\bA presentation-led menu created solely for refined contemporary dining\b/gi, 'A refined tasting menu showcasing contemporary Singapore flavours')
  .replace(/\bdemo availability only\b/gi, 'seasonal availability')
  .replace(/\bused to demonstrate\b/gi, 'for')
  .replace(/\bdemo-only\b/gi, 'limited')
  .replace(/\bcapstone\b/gi, '')
  .replace(/\bdemo\b/gi, '')
  .replace(/\bdemonstration\b/gi, 'guided')
  .replace(/\s{2,}/g, ' ')
  .replace(/\s+([,.;:])/g, '$1')
  .trim();

export const cleanPublicNarrative = (value = '') => cleanPublicDescription(String(value)
  .replace(/\[Demo(?: review)?\]\s*/gi, '')
  .replace(/\bExperience ID \d+,\s*/gi, '')
  .replace(/\s*\(ID \d+\)/gi, '')
  .replace(/TasteLocal Demo\s*[\u2014\u2013-]\s*/gi, '')
  .replace(/Demo area\s*[\u2014\u2013-]\s*/gi, '')
  .replace(/Demo profile\s*[\u2014\u2013-]\s*/gi, '')
  .replace(/Demo Vendor\s*[\u2014\u2013-]?\s*/gi, '')
  .replace(/Demo Tourist\s*[\u2014\u2013-]?\s*/gi, ''));

export const cleanPublicCategory = (category) => {
  const categoryName = cleanPublicLabel(category?.category_name || '');
  return {
    ...category,
    category_name: categoryName,
    description: CATEGORY_COPY[categoryName]
      || cleanPublicDescription(category?.description || 'Authentic Singapore food experiences.'),
  };
};

export const cleanPublicLocation = (location) => ({
  ...location,
  address: cleanPublicLabel(location?.address || ''),
});

export const cleanPublicReview = (review) => ({
  ...review,
  full_name: cleanPublicLabel(review?.full_name || ''),
  comment: cleanPublicDescription(cleanPublicLabel(review?.comment || '')),
});

export const toPublicExperience = (experience) => ({
  ...experience,
  title: cleanPublicLabel(experience?.title),
  description: cleanPublicDescription(experience?.description),
  category: experience?.category ? cleanPublicCategory(experience.category) : experience?.category,
  location: experience?.location ? cleanPublicLocation(experience.location) : experience?.location,
  vendor_profile: experience?.vendor_profile ? {
    ...experience.vendor_profile,
    business_name: cleanPublicLabel(experience.vendor_profile.business_name),
    description: cleanPublicDescription(experience.vendor_profile.description || ''),
  } : experience?.vendor_profile,
  reviews: Array.isArray(experience?.reviews) ? experience.reviews.map(cleanPublicReview) : experience?.reviews,
});

// Backward-compatible aliases keep existing Homepage imports stable while the
// narrow, render-only cleaners are reused by selected public catalogue views.
export const cleanHomepageLabel = cleanPublicLabel;
export const cleanHomepageDescription = cleanPublicDescription;
export const cleanHomepageCategory = cleanPublicCategory;
export const cleanHomepageLocation = cleanPublicLocation;
export const toHomepageExperience = toPublicExperience;

export const HOMEPAGE_CATEGORY_VISUALS = {
  'Heritage Food': '/demo-images/experiences/peranakan_stories.webp',
  'Local Desserts': '/demo-images/experiences/kueh_colours.webp',
  'Modern Singapore Food': '/demo-images/experiences/modern_flavours.webp',
  'Culinary Workshops': '/demo-images/experiences/dumpling_workshop.webp',
};

export const HOMEPAGE_CATEGORY_ORDER = Object.keys(HOMEPAGE_CATEGORY_VISUALS);
