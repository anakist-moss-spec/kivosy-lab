// ============================================================
// KIVOSY AI - PDF Export Module
// ============================================================

import { uiManager } from './ui.js';

export const pdfService = {
    /**
     * Save full model card as PDF
     */
    saveFull(modelId) {
        const element = document.getElementById(`${modelId}-card`);
        if (!element) return;

        const resultContent = element.querySelector('.result-content');
        if (!resultContent) return;

        const originalMaxHeight = resultContent.style.maxHeight;
        resultContent.style.maxHeight = 'none';
        resultContent.style.overflow = 'visible';

        const options = {
            margin: [10, 10, 10, 10],
            filename: `KIVOSY_Report_${modelId}_${new Date().toISOString().slice(0,10)}.pdf`,
            html2canvas: { 
                scale: 2, 
                useCORS: true,
                scrollY: 0,
                windowHeight: element.scrollHeight
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(options).from(element).save().then(() => {
            resultContent.style.maxHeight = originalMaxHeight;
            resultContent.style.overflow = 'auto';
            uiManager.showToast('PDF saved!', null, 'success');
        });
    },

    /**
     * Save individual chat message as PDF
     */
    saveIndividual(btnElement) {
        const container = btnElement.closest('.past-view-container') || btnElement.closest('.ai-bubble');
        const bubbleText = container?.querySelector('.bubble-text');
        
        if (!bubbleText) {
            uiManager.showToast('Content not found', null, 'error');
            return;
        }

        const modelName = container.classList.contains('gemini') ? 'GEMINI' : 
                         container.classList.contains('groq') ? 'GROQ' : 'HF';

        uiManager.showToast('Generating PDF...', null, 'info');

        // Create clean container for PDF
        const worker = document.createElement('div');
        worker.style.width = '700px';
        worker.style.padding = '40px';
        worker.style.background = '#ffffff';
        
        worker.innerHTML = `
            <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #343a40;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0d6efd; padding-bottom: 15px; margin-bottom: 20px;">
                    <div>
                        <h1 style="margin: 0; color: #0d6efd; font-size: 24px;">KIVOSY AI</h1>
                        <p style="margin: 5px 0 0 0; font-size: 12px; color: #606770;">Intelligence Archive</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="background: #eef4ff; color: #0d6efd; padding: 4px 10px; border-radius: 20px; font-size: 11px;">
                            ${modelName} Engine
                        </span>
                    </div>
                </div>

                <div style="background: #f8fafd; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                    <div style="font-size: 13px;">
                        <strong>Generated:</strong> ${new Date().toLocaleString()}
                    </div>
                </div>

                <div style="line-height: 1.7; font-size: 14px;">
                    ${bubbleText.innerHTML}
                </div>

                <div style="margin-top: 50px; border-top: 1px solid #dee1e6; padding-top: 10px; text-align: center; font-size: 11px; color: #dddfe2;">
                    © 2026 KIVOSY AI Command Center
                </div>
            </div>
        `;

        const options = {
            margin: [15, 15, 15, 15],
            filename: `KIVOSY_${modelName}_${Date.now()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4' }
        };

        html2pdf().set(options).from(worker).save()
            .then(() => uiManager.showToast('Download Complete!', null, 'success'))
            .catch(err => {
                console.error('PDF Error:', err);
                uiManager.showToast('Switching to print view...', null, 'info');
                window.print();
            });
    },

    /**
     * Copy text to clipboard
     */
    copyToClipboard(modelId) {
        const text = document.getElementById(`${modelId}-text`)?.innerText;
        if (!text) return;

        navigator.clipboard.writeText(text).then(() => {
            uiManager.showToast(`✅ ${modelId.toUpperCase()} copied!`, null, 'success');
        });
    },

    /**
     * Save as text file
     */
    saveAsFile(modelId) {
        const text = document.getElementById(`${modelId}-text`)?.innerText;
        if (!text) return;

        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `KIVOSY_${modelId}_${new Date().toLocaleDateString()}.txt`;
        a.click();
        URL.revokeObjectURL(a.href);
        uiManager.showToast(`📄 TXT saved!`, null, 'success');
    }
};

// Expose for onclick handlers
window.pdfService = pdfService;