/**
 * Unit Tests for European Country Compliance Rules
 */

import { COUNTRY_STANDARDS, adaptCVForCountry } from '../js/engines/country-rules.js';
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
  });
}
