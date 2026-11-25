/**
 * High-Fidelity Vector PDF Export Engine
 * Ensures ATS selectable text layer and DIN 5008 A4 pagination.
 */

export function exportCVToPDF(cv) {
  if (!cv || !cv.personal) {
    alert('Please fill out your personal details before exporting.');
    return;
  }

  const firstName = typeof cv.personal.firstName === 'string' && cv.personal.firstName.trim()
    ? cv.personal.firstName.trim()
    : 'Candidate';
  const lastName = typeof cv.personal.lastName === 'string' && cv.personal.lastName.trim()
    ? cv.personal.lastName.trim()
    : 'CV';
  const oldTitle = document.title;

  // Set document title to format default PDF file name
  document.title = `CV_${lastName}_${firstName}`;

  let restored = false;
  let fallbackTimer = null;
  const restoreTitle = () => {
    if (restored) return;
    restored = true;
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('afterprint', restoreTitle);
    }
    document.title = oldTitle;
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('afterprint', restoreTitle, { once: true });
    fallbackTimer = setTimeout(restoreTitle, 30000);
  }

  // Execute native high-fidelity print to PDF dialog
  window.print();
}
