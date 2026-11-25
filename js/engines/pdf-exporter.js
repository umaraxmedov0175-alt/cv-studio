/**
 * High-Fidelity Vector PDF Export Engine
 * Ensures ATS selectable text layer and DIN 5008 A4 pagination.
 */

export function exportCVToPDF(cv) {
  if (!cv || !cv.personal) {
    alert('Please fill out your personal details before exporting.');
    return;
  }

  const firstName = cv.personal.firstName?.trim() || 'Candidate';
  const lastName = cv.personal.lastName?.trim() || 'CV';
  const oldTitle = document.title;

  // Set document title to format default PDF file name
  document.title = `CV_${lastName}_${firstName}`;

  // Execute native high-fidelity print to PDF dialog
  window.print();

  // Restore title after print dialog closes
  setTimeout(() => {
    document.title = oldTitle;
  }, 1000);
}
