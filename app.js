// ============================================================
// KIVOSY AI Command Center - Main Entry Module
// ============================================================

import { safeStorage } from './modules/storage.js';
import { configManager } from './modules/config.js';
import { apiService } from './modules/api.js';
import { uiManager } from './modules/ui.js';
import { historyManager } from './modules/history.js';
import { statsManager } from './modules/stats.js';
import { pdfService } from './modules/pdf.js';

// Make services globally available for onclick handlers
window.pdfService = pdfService;
window.historyManager = historyManager;
window.uiManager = uiManager;

class KivosyApp {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 KIVOSY AI Command Center initializing...');

        // Load all data
        configManager.load();
        historyManager.load();
        
        // Sync stats with history
        statsManager.syncWithHistory(historyManager.getAll());
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Update UI
        this.updateModelDisplays();
        historyManager.render();
        statsManager.updateUI();

        // Setup global click handler for modals
        window.onclick = (event) => {
            const guideModal = document.getElementById('guideModal');
            const historyModal = document.getElementById('history-modal');

            if (event.target === guideModal) {
                uiManager.closeModal('guideModal');
            }
            if (event.target === historyModal) {
                uiManager.closeHistoryModal();
            }
        };

        // Auto switch to unified tab after load
        window.addEventListener('load', () => {
            setTimeout(() => uiManager.switchTab('unified', true), 500);
        });

        this.initialized = true;
        console.log('✅ KIVOSY AI initialized successfully');
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.currentTarget.getAttribute('data-tab');
                uiManager.switchTab(tabId, false);
            });
        });

        // Save configuration
        const saveKeysBtn = document.getElementById('save-keys');
        if (saveKeysBtn) {
            saveKeysBtn.addEventListener('click', (e) => this.saveConfig(e));
        }

        // Clear configuration
        const clearKeysBtn = document.getElementById('clear-keys');
        if (clearKeysBtn) {
            clearKeysBtn.addEventListener('click', () => this.clearConfig());
        }

        // Model selection updates
        ['gemini-model', 'groq-model', 'hf-model'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener(id === 'hf-model' ? 'input' : 'change', () => {
                    this.updateModelDisplays();
                });
            }
        });

        // Main send button
        const mainSend = document.getElementById('main-send');
        if (mainSend) {
            mainSend.addEventListener('click', async () => {
                await this.handleSend();
            });
        }

        // Enter key handling
        const mainPrompt = document.getElementById('main-prompt');
        if (mainPrompt) {
            mainPrompt.addEventListener('keydown', (e) => {
                if (e.isComposing) return;
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    document.getElementById('main-send')?.click();
                }
            });
        }

        // Sidebar toggle
        const sidebar = document.querySelector('.sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('collapsed');
                document.body.classList.toggle('sidebar-closed');
                sidebarToggle.innerText = sidebar.classList.contains('collapsed') ? '❯' : '☰';
            });
        }

        // Auto-collapse sidebar on mobile
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768 && !sidebar?.classList.contains('collapsed')) {
                sidebar?.classList.add('collapsed');
                document.body.classList.add('sidebar-closed');
                if (sidebarToggle) sidebarToggle.innerText = '❯';
            }
        });

        // Mobile outside click
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && sidebar && !sidebar.classList.contains('collapsed')) {
                if (!sidebar.contains(e.target) && !sidebarToggle?.contains(e.target)) {
                    sidebar.classList.add('collapsed');
                    document.body.classList.add('sidebar-closed');
                    if (sidebarToggle) sidebarToggle.innerText = '❯';
                }
            }
        });

        // Export history
        const exportBtn = document.getElementById('export-history');
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                historyManager.exportHistory();
            });
        }

        // Clear history
        const clearHistoryBtn = document.querySelector('[onclick="clearHistory()"]');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Clear all history?')) {
                    historyManager.clear();
                    statsManager.syncWithHistory(historyManager.getAll());
                }
            });
        }

        // Feedback button
        const feedbackBtn = document.getElementById('sendFeedback');
        if (feedbackBtn) {
            feedbackBtn.addEventListener('click', () => {
                uiManager.openFeedback();
            });
        }

        // Auto-close input groups on enter
        ['gemini-key', 'groq-key', 'hf-key'].forEach((id, index, array) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', (e) => {
                    if (e.target.value.trim()) {
                        const currentDetails = e.target.closest('.config-group');
                        if (currentDetails) currentDetails.removeAttribute('open');

                        const nextId = array[index + 1];
                        if (nextId) {
                            const nextEl = document.getElementById(nextId);
                            const nextDetails = nextEl?.closest('.config-group');
                            if (nextDetails) nextDetails.setAttribute('open', '');
                        }
                    }
                });
            }
        });
    }

    /**
     * Save configuration
     */
    saveConfig(event) {
        const geminiKey = document.getElementById('gemini-key')?.value.trim() || '';
        const groqKey = document.getElementById('groq-key')?.value.trim() || '';
        const hfKey = document.getElementById('hf-key')?.value.trim() || '';

        if (!geminiKey && !groqKey && !hfKey) {
            uiManager.showToast('⚠️ Please enter an API Key!', event.target, 'error');
            return;
        }

        configManager.save({
            geminiKey,
            groqKey,
            hfKey,
            geminiModel: document.getElementById('gemini-model')?.value,
            groqModel: document.getElementById('groq-model')?.value,
            hfModel: document.getElementById('hf-model')?.value
        });

        uiManager.showToast('✅ Settings Saved!', event.currentTarget, 'success');
        this.updateModelDisplays();
    }

    /**
     * Clear configuration
     */
    clearConfig() {
        if (confirm('Delete all API keys and settings?')) {
            configManager.reset();
            
            document.getElementById('gemini-key').value = '';
            document.getElementById('groq-key').value = '';
            document.getElementById('hf-key').value = '';
            document.getElementById('gemini-model').value = configManager.get('geminiModel');
            document.getElementById('groq-model').value = configManager.get('groqModel');
            document.getElementById('hf-model').value = configManager.get('hfModel');

            uiManager.showToast('🗑️ Reset Complete!', null, 'success');
        }
    }

    /**
     * Update model displays
     */
    updateModelDisplays() {
        const displays = {
            gemini: document.getElementById('gemini-model-display'),
            groq: document.getElementById('groq-model-display'),
            hf: document.getElementById('hf-model-display')
        };

        if (displays.gemini) displays.gemini.textContent = document.getElementById('gemini-model')?.value;
        if (displays.groq) displays.groq.textContent = document.getElementById('groq-model')?.value;
        if (displays.hf) displays.hf.textContent = document.getElementById('hf-model')?.value;
    }

    /**
     * Handle send button click
     */
    async handleSend() {
        const promptInput = document.getElementById('main-prompt');
        const prompt = promptInput?.value.trim();

        if (!prompt) {
            uiManager.showToast('Please enter a prompt', promptInput, 'error');
            return;
        }

        // Check if at least one key exists
        if (!configManager.hasAnyKey()) {
            uiManager.showToast('⚠️ Please set at least one API Key!', null, 'error');
            
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.scrollIntoView({ behavior: 'smooth' });
            
            return;
        }

        await apiService.callAllModels(prompt);
        
        if (promptInput) {
            promptInput.value = '';
            promptInput.style.height = 'auto';
        }
    }
}

// Initialize the app when DOM is ready
const app = new KivosyApp();

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Export for debugging
window.kivosy = {
    app,
    config: configManager,
    history: historyManager,
    stats: statsManager,
    storage: safeStorage,
    clearAll: () => {
        safeStorage.clear();
        location.reload();
    }
};