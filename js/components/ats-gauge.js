/**
 * Real-Time ATS Score Gauge & Feedback Drawer Component
 */

import { analyzeCVForATS } from '../engines/ats-scorer.js';

export function updateATSGauge(cv, badgeElement, drawerElement) {
  if (!badgeElement || !cv) return;

  const analysis = analyzeCVForATS(cv);

  // Determine badge color
  let color = '#10b981'; // Green (85-100)
  if (analysis.score < 50) {
    color = '#ef4444'; // Red (<50)
  } else if (analysis.score < 80) {
    color = '#f59e0b'; // Amber (50-79)
  }

  // Update Badge
  badgeElement.innerHTML = `
    <div class="ats-score-circle" style="background-color: ${color};">
      ${analysis.score}
    </div>
    <div class="ats-score-label">
      ATS Score: ${analysis.grade} (${analysis.score}/100)
    </div>
  `;

  // Update Drawer
  if (drawerElement) {
    drawerElement.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #334155; padding-bottom: 8px;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: #f8fafc;">
          ATS-Analyse & Optimierung
        </h3>
        <span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; background-color: ${color}20; color: ${color}; border: 1px solid ${color}40;">
          ${analysis.status}
        </span>
      </div>

      <!-- Checklist -->
      <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px;">
        ${analysis.checks.map(c => `
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: ${c.passed ? '#94a3b8' : '#f87171'};">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span>${c.passed ? '✓' : '✗'}</span>
              <span>${c.category}</span>
            </span>
            <span style="font-weight: 600; font-size: 11px;">${c.points}/${c.maxPoints} Pkt.</span>
          </div>
        `).join('')}
      </div>

      <!-- Actionable Suggestions -->
      ${analysis.suggestions.length > 0 ? `
        <div style="font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px;">Empfohlene Verbesserungen:</div>
        <ul class="ats-suggestion-list">
          ${analysis.suggestions.map(s => `<li>${s}</li>`).join('')}
        </ul>
      ` : `
        <div style="font-size: 12px; color: #10b981; padding: 8px; background-color: rgba(16, 185, 129, 0.1); border-radius: 4px; text-align: center;">
          ✓ Ihr Lebenslauf erfüllt alle gängigen ATS- & DIN 5008-Kriterien optimal!
        </div>
      `}
    `;
  }
}
