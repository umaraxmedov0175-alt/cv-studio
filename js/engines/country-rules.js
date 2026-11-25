/**
 * European Country Compliance Rules & Standards
 * Defines localized recruitment laws, anti-bias regulations, and layout conventions.
 */

export const COUNTRY_STANDARDS = {
  DE: {
    code: 'DE',
    name: 'Germany / DACH (DIN 5008)',
    flag: 'DE',
    allowPhoto: true,
    recommendPhoto: true,
    allowBirthDate: true,
    allowNationality: true,
    allowSignatureBlock: true,
    recommendSignatureBlock: true,
    compactMode: false,
    languageCode: 'de',
    templateDefault: 'german-din-5008',
    complianceNote: 'DIN 5008 Standard: Candidate photo, birth date, and formal closing signature block are customary in Germany & Austria.'
  },
  UK: {
    code: 'UK',
    name: 'United Kingdom & Ireland',
    flag: 'UK',
    allowPhoto: false,
    recommendPhoto: false,
    allowBirthDate: false,
    allowNationality: false,
    allowSignatureBlock: false,
    recommendSignatureBlock: false,
    compactMode: false,
    languageCode: 'en',
    templateDefault: 'modern-european',
    complianceNote: 'UK Equality Act 2010: Candidate photo, birth date, and nationality are strictly omitted to guarantee anti-bias recruitment.'
  },
  FR: {
    code: 'FR',
    name: 'France (1-Page Executive)',
    flag: 'FR',
    allowPhoto: true,
    recommendPhoto: false,
    allowBirthDate: false,
    allowNationality: false,
    allowSignatureBlock: false,
    recommendSignatureBlock: false,
    compactMode: true,
    languageCode: 'fr',
    templateDefault: 'modern-european',
    complianceNote: 'French Standard: Single-page executive format prioritizing career progression and key skills.'
  },
  NL: {
    code: 'NL',
    name: 'Netherlands / Benelux',
    flag: 'NL',
    allowPhoto: true,
    recommendPhoto: false,
    allowBirthDate: true,
    allowNationality: false,
    allowSignatureBlock: false,
    recommendSignatureBlock: false,
    compactMode: false,
    languageCode: 'en',
    templateDefault: 'minimal-swiss',
    complianceNote: 'Dutch Standard: Pragmatic, direct layout highlighting measurable achievements and technical depth.'
  }
};

/**
 * Adapts CV configuration and flags according to the target European country's norms.
 */
export function adaptCVForCountry(cv, countryCode = 'DE') {
  const standard = COUNTRY_STANDARDS[countryCode] || COUNTRY_STANDARDS.DE;

  const adapted = JSON.parse(JSON.stringify(cv));

  adapted.meta = adapted.meta || {};
  adapted.meta.targetCountry = countryCode;

  // Apply photo compliance
  if (!standard.allowPhoto) {
    adapted.meta.showPhoto = false;
  }

  // Apply signature block compliance
  if (!standard.allowSignatureBlock) {
    adapted.meta.includeSignatureBlock = false;
  }

  adapted.rules = {
    allowPhoto: standard.allowPhoto,
    allowBirthDate: standard.allowBirthDate,
    allowNationality: standard.allowNationality,
    allowSignatureBlock: standard.allowSignatureBlock,
    compactMode: standard.compactMode,
    languageCode: standard.languageCode,
    complianceNote: standard.complianceNote
  };

  return adapted;
}
