// ============================================================
// KIVOSY AI - UI Management Module
// ============================================================

import { configManager } from './config.js';
import { historyManager } from './history.js';
import { statsManager } from './stats.js';

class UIManager {
    constructor() {
        this.toastTimeout = null;
        this.modalOpen = false;
    }

    /**
     * Show toast notification
     */
    showToast(message, targetElement = null, type = 'success') {
        console.log(`[${type.toUpperCase()}] ${message}`);

        const toast = document.getElementById('toast');
        
        if (toast && targetElement) {
            // Positioned toast
            toast.innerText = message;
            toast.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
            
            const rect = targetElement.getBoundingClientRect();
            toast.style.left = rect.left + rect.width/2 + window.scrollX + 'px';
            toast.style.top = rect.top - 35 + window.scrollY + 'px';
            toast.style.transform = 'translateX(-50%)';
            
            toast.classList.add('show');
            
            setTimeout(() => toast.classList.remove('show'), 2000);
        } else {
            // Floating toast
            const notification = document.createElement('div');
            notification.className = `notification-bubble ${type}`;
            notification.innerText = message;
            document.body.appendChild(notification);
            
            if (targetElement) {
                const rect = targetElement.getBoundingClientRect();
                notification.style.left = rect.left + rect.width/2 + 'px';
                notification.style.top = rect.top - 20 + window.scrollY + 'px';
            } else {
                notification.style.left = '50%';
                notification.style.bottom = '30px';
            }
            
            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 500);
            }, 2000);
        }
    }

    /**
     * Format response with Markdown
     */
    formatResponse(text) {
        if (!text) return '';
        marked.setOptions({ breaks: true, gfm: true });
        return marked.parse(text);
    }

    /**
     * Create result card HTML
     */
    createResultCard(modelId, content) {
        const icons = { gemini: '🤖', groq: '⚡', hf: '🤗', llama: '🦙' };
        const icon = icons[modelId.toLowerCase()] || '✨';

        return `
            <div class="result-card" id="${modelId}-card" data-model="${modelId}">
                <div class="card-header">
                    <span class="model-name">${icon} ${modelId.toUpperCase()}</span>
                    <div class="card-actions">
                        <button onclick="pdfService.copyToClipboard('${modelId}')" title="Copy">📋 Copy</button>
                        <button onclick="pdfService.saveAsFile('${modelId}')" title="Save TXT">📄 TXT</button>
                        <button onclick="pdfService.saveFull('${modelId}')" title="Save PDF">📕 PDF</button>
                    </div>
                </div>
                <div class="result-content" id="${modelId}-text">${content}</div>
            </div>
        `;
    }

    /**
     * Initialize result cards
     */
    initializeResultCards() {
        const resultsDiv = document.getElementById('unified-results');
        if (!resultsDiv) return;

        resultsDiv.innerHTML = `
            ${this.createResultCard('gemini', '<div class="spinner"></div> Thinking...')}
            ${this.createResultCard('groq', '<div class="spinner"></div> Thinking...')}
            ${this.createResultCard('hf', '<div class="spinner"></div> Thinking...')}
        `;
    }

    /**
     * Update model result
     */
    updateModelResult(modelId, result, prompt) {
        const formattedHTML = this.formatResponse(result);

        // Update unified card
        const card = document.getElementById(`${modelId}-card`);
        if (card) {
            const contentDiv = card.querySelector('.result-content');
            if (contentDiv) contentDiv.innerHTML = formattedHTML;
        }

        // Update individual tab
        const tab = document.getElementById(`${modelId}-tab`);
        if (tab) {
            tab.innerHTML += `
                <div class="chat-entry">
                    <div class="user-bubble">
                        <span class="bubble-label">👤 MY QUESTION</span>
                        <div class="bubble-text">${this.escapeHtml(prompt)}</div>
                    </div>
                    <div class="ai-bubble ${modelId}" id="${modelId}-msg-${Date.now()}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span class="bubble-label">✨ ${modelId.toUpperCase()}</span>
                            <button onclick="pdfService.saveIndividual(this)" class="mini-pdf-btn">📕 PDF</button>
                        </div>
                        <div class="bubble-text">${formattedHTML}</div>
                    </div>
                </div>
                <div class="chat-spacer"></div>
            `;
            
            setTimeout(() => tab.scrollTop = tab.scrollHeight, 100);
        }

        this.showToast(`${modelId.toUpperCase()} response ready!`, null, 'success');
    }

    /**
     * Show model error
     */
    showModelError(modelId, error, prompt) {
        const errorHtml = `
            <div style="color: #d93025; background: #feefee; padding: 10px; border-radius: 8px;">
                <strong>⚠️ Error:</strong> ${error.message}
            </div>
        `;

        // Update card
        const card = document.getElementById(`${modelId}-card`);
        if (card) {
            const contentDiv = card.querySelector('.result-content');
            if (contentDiv) contentDiv.innerHTML = errorHtml;
        }

        // Update tab
        const tab = document.getElementById(`${modelId}-tab`);
        if (tab) {
            tab.innerHTML += `
                <div class="chat-entry">
                    <div class="user-bubble">
                        <span class="bubble-label">👤 MY QUESTION</span>
                        <div class="bubble-text">${this.escapeHtml(prompt)}</div>
                    </div>
                    <div class="ai-bubble" style="border: 1px solid #fad2cf; background: #feefee;">
                        <div style="color: #d93025; font-weight: bold;">🚫 Connection Failed (${modelId.toUpperCase()})</div>
                        <p style="font-size: 13px;">${error.message}</p>
                    </div>
                </div>
            `;
        }

        this.showToast(`${modelId.toUpperCase()} error!`, null, 'error');
    }

    /**
     * Show "no key" message
     */
    showNoKeyMessage(modelId) {
        const card = document.getElementById(`${modelId}-card`);
        if (card) {
            const contentDiv = card.querySelector('.result-content');
            if (contentDiv) {
                contentDiv.innerHTML = '<span style="color: #9aa0a6; font-style: italic;">Waiting for API Key...</span>';
            }
        }

        const tab = document.getElementById(`${modelId}-tab`);
        if (tab && tab.innerHTML.trim() === '') {
            tab.innerHTML = `<div style="text-align:center; padding:40px; color:#9aa0a6;">⚠️ ${modelId.toUpperCase()} API Key required</div>`;
        }
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Modal management
     */
    openModal(modalId = 'guideModal') {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            this.modalOpen = true;
        }
    }

    closeModal(modalId = 'guideModal') {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            this.modalOpen = false;
        }
    }

    closeHistoryModal() {
        const modal = document.getElementById('history-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.modalOpen = false;
        }
    }

    /**
     * Switch tab
     */
    switchTab(mode, isAuto = false) {
        console.log('🚀 Switching to Mode:', mode);

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-tab') === mode) {
                btn.classList.add('active');
            }
        });

        // Switch content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const targetTab = document.getElementById(`${mode}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
            setTimeout(() => targetTab.scrollTop = targetTab.scrollHeight, 100);
        }

        // Update badges
        document.querySelectorAll('.model-badge').forEach(badge => {
            badge.classList.remove('active');
            if (badge.getAttribute('onclick')?.includes(`'${mode}'`)) {
                badge.classList.add('active');
            }
        });

        if (!isAuto) {
            const mainChat = document.getElementById('chatContainer');
            if (mainChat) {
                mainChat.scrollTo({ top: 0, behavior: 'smooth' });
            }
            document.querySelectorAll('.history-container').forEach(c => c.scrollTop = 0);
        }
    }

    /**
     * Show guide popup
     */
    showGuide() {
        const target = document.getElementById('gemini-key');
        const popup = document.getElementById('guide-popup');
        if (!target || !popup) return;

        const parentDetails = target.closest('details');
        if (parentDetails) parentDetails.open = true;

        target.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTimeout(() => {
            target.focus();
            target.classList.add('highlight-input');
            
            const rect = target.getBoundingClientRect();
            popup.style.display = 'block';
            popup.style.top = rect.top - 10 + window.scrollY + 'px';
            popup.style.left = rect.right + 15 + 'px';

            setTimeout(() => {
                target.classList.remove('highlight-input');
                popup.style.display = 'none';
            }, 3000);
        }, 500);
    }

    /**
     * Toggle password visibility
     */
    togglePassword(inputId, button) {
        const input = document.getElementById(inputId);
        const icon = button.querySelector('.material-icons');
        
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) icon.innerText = 'visibility_off';
        } else {
            input.type = 'password';
            if (icon) icon.innerText = 'visibility';
        }
    }

    /**
     * Scroll to model
     */
    scrollToModel(modelId) {
        this.switchTab('unified');

        const element = document.getElementById(`${modelId}-card`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.style.boxShadow = '0 0 20px var(--accent-primary)';
            setTimeout(() => element.style.boxShadow = '', 1500);
        } else {
            alert('Response not ready yet!');
        }
    }

    /**
     * Open feedback form
     */
    openFeedback() {
        window.open('https://docs.google.com/forms/d/e/1FAIpQLSeTSDIioJ_AewFfH1S1aAIqKCRt3iROqbyPULl-9S6gsBpjxw/viewform', '_blank');
    }
}

export const uiManager = new UIManager();
window.uiManager = uiManager;

// [KIVOSY 전역 함수 연결 브릿지]
// HTML의 onclick이 uiManager의 메서드를 직접 찾을 수 있게 연결합니다.
window.showGuide = () => uiManager.showGuide();
window.openModal = (id) => uiManager.openModal(id);
window.closeModal = (id) => uiManager.closeModal(id);
window.switchTab = (mode, isAuto) => uiManager.switchTab(mode, isAuto);
window.togglePassword = (id, btn) => uiManager.togglePassword(id, btn);
window.scrollToModel = (id) => uiManager.scrollToModel(id);
window.openFeedback = () => uiManager.openFeedback();
window.closeHistoryModal = () => uiManager.closeHistoryModal();