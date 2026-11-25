/**
 * Unit Tests for High-Fidelity Vector PDF Exporter
 */

import { exportCVToPDF } from '../js/engines/pdf-exporter.js';
import { createSampleEuropeanCV } from '../js/model/cv-schema.js';

export function runPDFExporterTests(assert) {
  assert.suite('PDF Exporter Tests');

  assert.test('exportCVToPDF sets A4 filename document.title and restores original title on afterprint', () => {
    const origTitle = document.title;
    const origPrint = window.print;
    let printCalls = 0;

    try {
      document.title = 'Original Studio Title';
      window.print = () => {
        printCalls++;
        // Verify title is formatted cleanly right when print dialog triggers
        assert.equal(document.title, 'CV_Wright_Alexander', 'sets CV_LastName_FirstName during print');
      };

      const cv = createSampleEuropeanCV();
      exportCVToPDF(cv);

      assert.equal(printCalls, 1, 'calls window.print once');
      assert.equal(document.title, 'CV_Wright_Alexander', 'keeps formatted title until afterprint fires');

      window.dispatchEvent(new Event('afterprint'));
      assert.equal(document.title, 'Original Studio Title', 'restores original document.title after afterprint');
    } finally {
      window.print = origPrint;
      document.title = origTitle;
    }
  });

  assert.test('exportCVToPDF falls back to Candidate/CV when names are blank and restores on afterprint', () => {
    const origTitle = document.title;
    const origPrint = window.print;

    try {
      document.title = 'Before Export';
      window.print = () => {};

      exportCVToPDF({ personal: { firstName: '   ', lastName: '' } });
      assert.equal(document.title, 'CV_CV_Candidate', 'uses Candidate and CV fallbacks when names blank');

      window.dispatchEvent(new Event('afterprint'));
      assert.equal(document.title, 'Before Export', 'restores original title on afterprint');
    } finally {
      window.print = origPrint;
      document.title = origTitle;
    }
  });

  assert.test('exportCVToPDF alerts and aborts cleanly when cv or personal is missing', () => {
    const origPrint = window.print;
    const origAlert = window.alert;
    let alerted = false;
    let printed = false;

    try {
      window.alert = () => { alerted = true; };
      window.print = () => { printed = true; };

      exportCVToPDF(null);
      assert.ok(alerted, 'shows alert when cv is null');
      assert.notOk(printed, 'does not call window.print when cv is null');
    } finally {
      window.print = origPrint;
      window.alert = origAlert;
    }
  });
}
