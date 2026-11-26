/**
 * Unit Tests for European Country Compliance Rules
 */

import { COUNTRY_STANDARDS, adaptCVForCountry, getCountryFieldRules } from '../js/engines/country-rules.js';
import { createSampleGermanCV } from '../js/model/cv-schema.js';

export function runCountryRulesTests(assert) {
  assert.suite('European Country Compliance Rules Tests');

  assert.test('COUNTRY_STANDARDS contains Germany, UK, France, Netherlands', () => {
    assert.ok(COUNTRY_STANDARDS.DE, 'contains Germany');
    assert.ok(COUNTRY_STANDARDS.UK, 'contains United Kingdom');
    assert.ok(COUNTRY_STANDARDS.FR, 'contains France');
    assert.ok(COUNTRY_STANDARDS.NL, 'contains Netherlands');
  });

  assert.test('Germany standard allows photo, signature block, and birth date', () => {
    const cv = createSampleGermanCV();
    const adapted = adaptCVForCountry(cv, 'DE');
    assert.ok(adapted.meta.showPhoto, 'photo enabled in Germany');
    assert.ok(adapted.meta.includeSignatureBlock, 'signature enabled in Germany');
    assert.ok(adapted.rules.allowBirthDate, 'birth date allowed');
  });

  assert.test('UK standard strictly disables photo, birth date, and signature block', () => {
    const cv = createSampleGermanCV();
    const adapted = adaptCVForCountry(cv, 'UK');
    assert.notOk(adapted.meta.showPhoto, 'photo disabled in UK (anti-bias)');
    assert.notOk(adapted.meta.includeSignatureBlock, 'signature block disabled in UK');
    assert.notOk(adapted.rules.allowBirthDate, 'birth date suppressed in UK');
    assert.notOk(adapted.rules.allowNationality, 'nationality suppressed in UK');
  });

  assert.test('France standard configures French nomenclature and CEFR format', () => {
    const cv = createSampleGermanCV();
    const adapted = adaptCVForCountry(cv, 'FR');
    assert.equal(adapted.rules.languageCode, 'fr', 'french language code');
    assert.ok(adapted.rules.compactMode, 'france prefers compact 1-page mode');
    assert.notOk(adapted.rules.allowBirthDate, 'birth date suppressed in FR');
    assert.notOk(adapted.rules.allowNationality, 'nationality suppressed in FR');
    assert.notOk(adapted.meta.includeSignatureBlock, 'signature block disabled in FR');
  });

  assert.test('Netherlands standard allows photo and birthDate while suppressing nationality and signature', () => {
    const cv = createSampleGermanCV();
    const adapted = adaptCVForCountry(cv, 'NL');
    assert.equal(adapted.meta.targetCountry, 'NL', 'targetCountry set to NL');
    assert.equal(adapted.rules.languageCode, 'en', 'NL defaults to EN');
    assert.ok(adapted.rules.allowPhoto, 'photo allowed in NL');
    assert.ok(adapted.rules.allowBirthDate, 'birthDate allowed in NL');
    assert.notOk(adapted.rules.allowNationality, 'nationality suppressed in NL');
    assert.notOk(adapted.rules.allowSignatureBlock, 'signature block suppressed in NL');
    assert.notOk(adapted.meta.includeSignatureBlock, 'includeSignatureBlock turned off for NL');
  });

  assert.test('getCountryFieldRules returns accurate visibility flags for DE, UK, FR, NL, and unknown fallback', () => {
    const de = getCountryFieldRules('DE');
    assert.ok(de.allowPhoto && de.allowBirthDate && de.allowNationality && de.allowSignatureBlock && !de.compactMode, 'DE flags accurate');

    const uk = getCountryFieldRules('uk');
    assert.ok(!uk.allowPhoto && !uk.allowBirthDate && !uk.allowNationality && !uk.allowSignatureBlock, 'UK flags accurate (case-insensitive)');

    const fr = getCountryFieldRules('FR');
    assert.ok(fr.allowPhoto && !fr.allowBirthDate && !fr.allowNationality && !fr.allowSignatureBlock && fr.compactMode, 'FR flags accurate');

    const nl = getCountryFieldRules('NL');
    assert.ok(nl.allowPhoto && nl.allowBirthDate && !nl.allowNationality && !nl.allowSignatureBlock && !nl.compactMode, 'NL flags accurate');

    const fallback = getCountryFieldRules('ZZ');
    assert.equal(JSON.stringify(fallback), JSON.stringify(de), 'unknown country falls back to DE');
  });

  assert.test('adaptCVForCountry handles null/invalid inputs safely and never mutates original CV', () => {
    const fromNull = adaptCVForCountry(null, 'UK');
    assert.equal(fromNull.meta.targetCountry, 'UK', 'null CV initializes cleanly for UK');
    assert.notOk(fromNull.meta.showPhoto, 'applies UK rules to initialized CV');

    const original = createSampleGermanCV();
    original.meta.targetCountry = 'DE';
    original.meta.showPhoto = true;
    original.meta.includeSignatureBlock = true;

    const adapted = adaptCVForCountry(original, 'UK');
    assert.notOk(adapted.meta.showPhoto, 'adapted CV disables photo');
    assert.equal(original.meta.targetCountry, 'DE', 'original targetCountry untouched');
    assert.equal(original.meta.showPhoto, true, 'original showPhoto untouched');
    assert.equal(original.meta.includeSignatureBlock, true, 'original includeSignatureBlock untouched');
  });

  assert.test('RU and UZ market presets have expected defaults and allow any heading language', () => {
    const ru = getCountryFieldRules('RU');
    assert.ok(ru.allowPhoto, 'RU allows photo');
    assert.ok(ru.allowBirthDate, 'RU allows birthDate');
    assert.ok(ru.allowNationality, 'RU allows citizenship');
    assert.ok(ru.allowTelegram, 'RU allows telegram');
    assert.notOk(ru.allowSignatureBlock, 'RU disables signature block');
    assert.ok(ru.compactMode, 'RU defaults to 1-page compact mode');

    const uz = getCountryFieldRules('UZ');
    assert.ok(uz.allowPhoto, 'UZ allows photo');
    assert.ok(uz.allowWorkPermission, 'UZ enables workPermission by default');
    assert.ok(uz.allowTelegram, 'UZ allows telegram');
    assert.notOk(uz.allowSignatureBlock, 'UZ disables signature block');
  });
}
