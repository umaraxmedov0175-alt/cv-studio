/**
 * European Country Compliance Rules & Standards
 * Defines localized recruitment laws, anti-bias regulations, and layout conventions.
 */

export const COUNTRY_STANDARDS = {
  DE: {
    code: 'DE',
    name: 'Deutschland / DACH (DIN 5008)',
    flag: '🇩🇪',
    allowPhoto: true,
    recommendPhoto: true,
    allowBirthDate: true,
    allowNationality: true,
    allowSignatureBlock: true,
    recommendSignatureBlock: true,
    compactMode: false,
    languageCode: 'de',
    templateDefault: 'german-din-5008',
    complianceNote: 'DIN 5008 Standard: Foto & Unterschriftenblock sind in Deutschland und Österreich traditionell üblich.'
  },
  UK: {
    code: 'UK',
    name: 'United Kingdom / Ireland',
    flag: '🇬🇧',
    allowPhoto: false,
    recommendPhoto: false,
    allowBirthDate: false,
    allowNationality: false,
    allowSignatureBlock: false,
    recommendSignatureBlock: false,
    compactMode: false,
    languageCode: 'en',
    templateDefault: 'modern-european',
    complianceNote: 'UK Equality Act 2010: Fotos, Geburtsdatum und Nationalität werden zur Vermeidung von Voreingenommenheit (Anti-Bias) weggelassen.'
  },
  FR: {
    code: 'FR',
    name: 'France (CV Français)',
    flag: '🇫🇷',
    allowPhoto: true,
    recommendPhoto: false,
    allowBirthDate: false,
    allowNationality: false,
    allowSignatureBlock: false,
    recommendSignatureBlock: false,
    compactMode: true,
    languageCode: 'fr',
    templateDefault: 'modern-european',
    complianceNote: 'Standard Français: Format compact sur 1 page privilégié, pas de signature obligatoire.'
  },
  NL: {
    code: 'NL',
    name: 'Netherlands / Benelux',
    flag: '🇳🇱',
    allowPhoto: true,
    recommendPhoto: false,
    allowBirthDate: true,
    allowNationality: false,
    allowSignatureBlock: false,
    recommendSignatureBlock: false,
    compactMode: false,
    languageCode: 'en',
    templateDefault: 'minimal-swiss',
    complianceNote: 'Nederlandse Stijl: Direct, nuchter, overzichtelijk, focus op concrete prestaties en vaardigheden.'
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
