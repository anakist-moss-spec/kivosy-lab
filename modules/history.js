// ============================================================
// KIVOSY AI - History Management Module
// ============================================================

import { safeStorage } from './storage.js';
import { uiManager } from './ui.js';
import { pdfService } from './pdf.js';

export const HISTORY_KEY = 'chat_history';

class HistoryManager {
    constructor() {
        this.history = {
            gemini: [],
            groq: [],
            hf: []
        };
        this.load();
    }

    load() {
        const saved = safeStorage.load('history', this.history);
        this.history = saved;
        return this.history;
    }

    save() {
        safeStorage.save('history', this.history);
        this.render();
    }

    add(service, prompt, response, model) {
        if (!this.history[service]) {
            this.history[service] = [];
        }

        const entry = {
            prompt,
            response,
            model,
            timestamp: new Date().toISOString()
        };

        this.history[service].unshift(entry);

        // Keep last 50 messages
        if (this.history[service].length > 50) {
            this.history[service] = this.history[service].slice(0, 50);
        }

        this.save();
    }

    clear() {
        this.history = { gemini: [], groq: [], hf: [] };
        safeStorage.remove('history');
        this.render();
        uiManager.showToast('🗑️ History cleared!', null, 'info');
    }

    getAll() {
        return this.history;
    }

    getAllFlattened() {
        const all = [];
        for (const [service, messages] of Object.entries(this.history)) {
            messages.forEach((msg, idx) => {
                all.push({ ...msg, service, originalIndex: idx });
            });
        }
        return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    get(service, index) {
        return this.history[service]?.[index];
    }

    render() {
        const container = document.getElementById('history-container');
        if (!container) return;

        const allMessages = this.getAllFlattened();

        if (allMessages.length === 0) {
            container.innerHTML = '<div class="empty-history">No messages yet. Start chatting!</div>';
            return;
        }

        const serviceIcons = { gemini: '🤖', groq: '⚡', hf: '🤗' };

        container.innerHTML = allMessages.slice(0, 20).map(msg => `
            <div class="history-item" 
                onclick="window.historyManager.showPastChat('${msg.service}', ${msg.originalIndex})" 
                title="📂 Click to view this conversation">
                <small>${serviceIcons[msg.service]} ${msg.service.toUpperCase()}</small>
                <div class="history-prompt">
                    Q: ${this.escapeHtml(msg.prompt.substring(0, 50))}${msg.prompt.length > 50 ? '...' : ''}
                    <span class="quick-send-bolt">📂</span>
                </div>
            </div>
        `).join('');
    }

    showPastChat(service, index) {
        const entry = this.get(service, index);
        if (!entry) return;

        const modal = document.getElementById('history-modal');
        const modalBody = document.getElementById('modal-body');
        
        if (!modal || !modalBody) return;

        const formattedHTML = uiManager.formatResponse(entry.response);

        modalBody.innerHTML = `
            <div class="past-view-container">
                <div class="user-bubble" style="background:#f0f4f8; border-radius:8px; padding:12px;">
                    <span style="font-size:10px; font-weight:bold; color:var(--accent-primary);">👤 QUESTION</span>
                    <div id="modal-prompt-text" style="font-size:13px; margin-top:5px;">${this.escapeHtml(entry.prompt)}</div>
                </div>
                
                <div class="ai-bubble ${service}" style="margin-top:10px; border-top:2px solid var(--accent-primary); padding-top:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <span style="font-size:11px; font-weight:bold; opacity:0.7;">📜 ${service.toUpperCase()} ARCHIVE</span>
                        <button onclick="pdfService.saveIndividual(this)" class="mini-pdf-btn">📕 PDF</button>
                    </div>
                    <div class="bubble-text markdown-body" style="font-size:14px; line-height:1.6;">
                        ${formattedHTML}
                    </div>
                </div>
            </div>
        `;

        modal.style.display = 'block';
        
        setTimeout(() => {
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) modalContent.scrollTop = 0;
        }, 50);
    }

    reusePrompt() {
        const promptElement = document.getElementById('modal-prompt-text');
        if (!promptElement) {
            uiManager.showToast('No prompt found.', null, 'error');
            return;
        }

        const promptText = promptElement.textContent.trim();
        const userInput = document.getElementById('user-input') || 
                         document.querySelector('textarea') || 
                         document.querySelector('input[type="text"]');

        if (userInput) {
            userInput.value = promptText;
            uiManager.closeHistoryModal();
            
            setTimeout(() => {
                userInput.style.height = 'auto';
                userInput.style.height = userInput.scrollHeight + 'px';
                userInput.focus();
                userInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
            
            uiManager.showToast('Prompt restored!', null, 'success');
        } else {
            uiManager.showToast('Input box not found!', null, 'error');
        }
    }

    exportHistory() {
        const dataStr = JSON.stringify(this.history, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kivosy_history_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        uiManager.showToast('📥 History exported!', null, 'success');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export const historyManager = new HistoryManager();

// Expose for onclick handlers
window.historyManager = historyManager;