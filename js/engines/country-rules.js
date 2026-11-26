/**
 * European Country Compliance Rules & Standards
 * Defines localized recruitment laws, anti-bias regulations, and layout conventions.
 */

import { createEmptyCV } from '../model/cv-schema.js';

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
  },
  RU: {
    code: 'RU',
    name: 'Russia (1-Page)',
    flag: 'RU',
    allowPhoto: true,
    recommendPhoto: true,
    allowBirthDate: true,
    allowNationality: true,
    allowWorkPermission: false,
    allowTelegram: true,
    allowPatronymic: false,
    allowMaritalStatus: false,
    allowGender: false,
    allowSalary: false,
    allowSignatureBlock: false,
    recommendSignatureBlock: false,
    compactMode: true,
    languageCode: 'ru',
    templateDefault: 'minimal-swiss',
    dateFormat: 'DD.MM.YYYY',
    phonePlaceholder: '+7 900 000-00-00',
    profileLinkLabel: 'Portfolio, hh.ru, LinkedIn or GitHub',
    complianceNote: 'Russian market practice: One A4 page is standard. Photo, date of birth, citizenship, and desired salary are optional.'
  },
  UZ: {
    code: 'UZ',
    name: 'Uzbekistan (Formal)',
    flag: 'UZ',
    allowPhoto: true,
    recommendPhoto: true,
    allowBirthDate: true,
    allowNationality: true,
    allowWorkPermission: true,
    allowTelegram: true,
    allowPatronymic: false,
    allowMaritalStatus: false,
    allowGender: false,
    allowSalary: false,
    allowSignatureBlock: false,
    recommendSignatureBlock: false,
    compactMode: false,
    languageCode: 'uz',
    templateDefault: 'german-din-5008',
    dateFormat: 'DD.MM.YYYY',
    phonePlaceholder: '+998 90 000 00 00',
    profileLinkLabel: 'Portfolio, hh.uz, LinkedIn or GitHub',
    complianceNote: 'Uzbekistan market practice: Formal personal block supports photo, citizenship, and work permission; extra personal fields are opt-in.'
  }
};

function resolveCountryStandard(countryCode = 'DE') {
  const key = typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : '';
  return COUNTRY_STANDARDS[key] || COUNTRY_STANDARDS.DE;
}

/**
 * Returns uniform UI field visibility & layout flags for the target country.
 */
export function getCountryFieldRules(countryCode = 'DE') {
  const standard = resolveCountryStandard(countryCode);
  return {
    allowPhoto: standard.allowPhoto,
    allowBirthDate: standard.allowBirthDate,
    allowNationality: standard.allowNationality,
    allowWorkPermission: Boolean(standard.allowWorkPermission),
    allowTelegram: Boolean(standard.allowTelegram),
    allowPatronymic: Boolean(standard.allowPatronymic),
    allowMaritalStatus: Boolean(standard.allowMaritalStatus),
    allowGender: Boolean(standard.allowGender),
    allowSalary: Boolean(standard.allowSalary),
    allowSignatureBlock: standard.allowSignatureBlock,
    compactMode: standard.compactMode
  };
}

/**
 * Adapts CV configuration and flags according to the target European country's norms.
 */
export function adaptCVForCountry(cv, countryCode = 'DE') {
  const standard = resolveCountryStandard(countryCode);

  let adapted;
  if (!cv || typeof cv !== 'object' || Array.isArray(cv)) {
    adapted = createEmptyCV();
  } else {
    try {
      adapted = JSON.parse(JSON.stringify(cv));
    } catch (_) {
      adapted = createEmptyCV();
    }
  }

  if (!adapted || typeof adapted !== 'object' || Array.isArray(adapted)) {
    adapted = createEmptyCV();
  }

  if (!adapted.meta || typeof adapted.meta !== 'object' || Array.isArray(adapted.meta)) {
    adapted.meta = {};
  }
  adapted.meta.targetCountry = standard.code;

  const fieldRules = getCountryFieldRules(standard.code);

  // Apply photo compliance
  if (!fieldRules.allowPhoto) {
    adapted.meta.showPhoto = false;
  }

  // Apply signature block compliance
  if (!fieldRules.allowSignatureBlock) {
    adapted.meta.includeSignatureBlock = false;
  }

  adapted.rules = {
    ...fieldRules,
    languageCode: standard.languageCode,
    complianceNote: standard.complianceNote
  };

  return adapted;
}
