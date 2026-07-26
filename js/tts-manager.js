// ============================================
// =========== TTS MANAGER ====================
// =========== Version avec diagnostic =======
// ============================================

window.ETEO = window.ETEO || {};

window.ETEO.TTS = {
    initialized: false,
    engine: 'none',
    isMobile: false,
    diagnosticDiv: null,

    init: function() {
        if (this.initialized) return;
        
        console.log("🔍 [ETEO TTS] Initialisation...");
        
        // Créer le div de diagnostic
        this.createDiagnosticDiv();

        // Détection mobile
        this.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent);
        if (this.isMobile) {
            this.updateDiagnostic("📱 Mobile détecté");
        }

        // 1. APK Capacitor
        if (window.Capacitor?.Plugins?.TextToSpeech) {
            this.engine = 'capacitor';
            this.updateDiagnostic("✅ Moteur: Capacitor (APK)");
            console.log("✅ [ETEO TTS] Moteur : Capacitor (APK)");
            this.initialized = true;
            this.updateIndicator();
            return this;
        }

        // 2. Vérifier Web Speech
        if ('speechSynthesis' in window) {
            this.updateDiagnostic("✅ speechSynthesis disponible");
            
            // Compter les voix
            const voices = window.speechSynthesis.getVoices();
            const count = voices ? voices.length : 0;
            
            this.updateDiagnostic(`🗣️ Voix détectées: ${count}`);
            
            if (count > 0) {
                this.engine = 'web';
                this.updateDiagnostic(`✅ Moteur: Web Speech (${count} voix)`);
                // Afficher les noms des voix
                const voiceNames = voices.map(v => v.name).join(', ');
                this.updateDiagnostic(`📢 Voix: ${voiceNames.substring(0, 50)}...`);
                console.log(`✅ [ETEO TTS] Moteur : Web Speech (${count} voix)`);
            } else {
                this.engine = 'fallback';
                this.updateDiagnostic("⚠️ Aucune voix pour l'instant - Attente...");
                console.log("⚠️ [ETEO TTS] Aucune voix immédiate, attente de chargement");
                
                // ⭐ NOUVEAU : Écouter l'événement voiceschanged
                this.waitForVoices();
            }
        } else {
            this.engine = 'fallback';
            this.updateDiagnostic("❌ speechSynthesis NON disponible");
            console.error("❌ [ETEO TTS] speechSynthesis non disponible");
        }
        
        this.initialized = true;
        this.updateIndicator();
        
        // ⭐ Démarrer le monitoring des voix
        this.startVoiceMonitoring();
        
        return this;
    },

    // ============================================
    // =========== ATTENDRE LES VOIX =============
    // ============================================
    waitForVoices: function() {
        if (!('speechSynthesis' in window)) return;
        
        let attempts = 0;
        const maxAttempts = 10;
        
        const checkVoices = () => {
            attempts++;
            const voices = window.speechSynthesis.getVoices();
            const count = voices ? voices.length : 0;
            
            this.updateDiagnostic(`🔄 Tentative ${attempts}: ${count} voix`);
            
            if (count > 0) {
                this.engine = 'web';
                this.updateDiagnostic(`✅ Moteur: Web Speech (${count} voix)`);
                const voiceNames = voices.map(v => v.name).join(', ');
                this.updateDiagnostic(`📢 Voix: ${voiceNames.substring(0, 50)}...`);
                console.log(`✅ [ETEO TTS] Voix chargées : ${count}`);
                this.updateIndicator();
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(checkVoices, 500);
            } else {
                this.updateDiagnostic("❌ Aucune voix après 10 tentatives");
                this.engine = 'fallback';
                this.updateIndicator();
            }
        };
        
        // Premier check immédiat
        setTimeout(checkVoices, 100);
        
        // Écouter l'événement voiceschanged
        window.speechSynthesis.addEventListener('voiceschanged', () => {
            const voices = window.speechSynthesis.getVoices();
            const count = voices ? voices.length : 0;
            this.updateDiagnostic(`🔄 voiceschanged: ${count} voix`);
            if (count > 0) {
                this.engine = 'web';
                this.updateDiagnostic(`✅ Moteur: Web Speech (${count} voix)`);
                this.updateIndicator();
            }
        });
    },

    // ============================================
    // =========== MONITORING DES VOIX ============
    // ============================================
    startVoiceMonitoring: function() {
        let count = 0;
        const interval = setInterval(() => {
            count++;
            if (count > 15) {
                clearInterval(interval);
                this.updateDiagnostic("⏹️ Monitoring terminé");
                return;
            }
            
            if ('speechSynthesis' in window) {
                const voices = window.speechSynthesis.getVoices();
                const c = voices ? voices.length : 0;
                if (c > 0 && this.engine === 'fallback') {
                    this.engine = 'web';
                    this.updateDiagnostic(`✅ VOIX TROUVÉES ! (${c} voix)`);
                    this.updateIndicator();
                    clearInterval(interval);
                }
            }
        }, 2000);
    },

    // ============================================
    // =========== CRÉER LE DIV DIAGNOSTIC =======
    // ============================================
    createDiagnosticDiv: function() {
        // Supprimer l'ancien si existant
        const old = document.getElementById('ttsDiagnostic');
        if (old) old.remove();
        
        this.diagnosticDiv = document.createElement('div');
        this.diagnosticDiv.id = 'ttsDiagnostic';
        this.diagnosticDiv.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.85);
            color: #00ff00;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 11px;
            font-family: monospace;
            z-index: 99999;
            max-width: 90%;
            text-align: left;
            line-height: 1.6;
            border: 2px solid #00ff00;
            box-shadow: 0 4px 20px rgba(0,0,0,0.8);
            pointer-events: none;
            min-width: 200px;
            transition: opacity 0.3s ease;
        `;
        this.diagnosticDiv.innerHTML = `
            <b>🔬 ETEO TTS DIAGNOSTIC</b><br>
            <span id="diagStatus">⏳ Initialisation...</span><br>
            <span id="diagVoices">🔄 Chargement...</span>
        `;
        document.body.appendChild(this.diagnosticDiv);
        
        // Afficher pendant 30 secondes puis le cacher
        setTimeout(() => {
            if (this.diagnosticDiv) {
                this.diagnosticDiv.style.opacity = '0.3';
                this.diagnosticDiv.style.fontSize = '9px';
                this.diagnosticDiv.style.padding = '6px 10px';
            }
        }, 30000);
        
        // Le cacher complètement après 60 secondes
        setTimeout(() => {
            if (this.diagnosticDiv) {
                this.diagnosticDiv.style.display = 'none';
            }
        }, 60000);
    },

    // ============================================
    // =========== METTRE À JOUR DIAGNOSTIC ======
    // ============================================
    updateDiagnostic: function(message) {
        console.log("📢 [DIAG]", message);
        
        const status = document.getElementById('diagStatus');
        if (status) {
            status.innerHTML = message;
        }
    },

    updateVoiceCount: function(count) {
        const voices = document.getElementById('diagVoices');
        if (voices) {
            voices.innerHTML = `🗣️ Voix disponibles: ${count}`;
        }
    },

    // ============================================
    // =========== SPEAK =========================
    // ============================================
    speak: function(text, lang = 'fr-FR') {
        if (!this.initialized) this.init();

        console.log(`🔊 [ETEO TTS] Lecture: "${text}" (${this.engine})`);

        // 1. Capacitor (APK)
        if (this.engine === 'capacitor') {
            return this.capacitorSpeak(text, lang);
        }

        // 2. Web Speech (Desktop)
        if (this.engine === 'web') {
            return this.webSpeak(text, lang);
        }

        // 3. Fallback visuel (Mobile Telegram)
        return this.visualFallback(text);
    },

    // ============================================
    // =========== CAPACITOR SPEAK ===============
    // ============================================
    capacitorSpeak: function(text, lang) {
        return new Promise((resolve, reject) => {
            try {
                if (!window.Capacitor?.Plugins?.TextToSpeech) {
                    reject(new Error('Capacitor non disponible'));
                    return;
                }
                window.Capacitor.Plugins.TextToSpeech.speak({ 
                    text, lang, rate: 1.0, pitch: 1.0, volume: 1.0
                }).then(resolve).catch(reject);
            } catch (error) {
                console.error("❌ Capacitor:", error);
                this.visualFallback(text);
                resolve(true);
            }
        });
    },

    // ============================================
    // =========== WEB SPEECH ====================
    // ============================================
    webSpeak: function(text, lang) {
        return new Promise((resolve, reject) => {
            if (!('speechSynthesis' in window)) {
                reject(new Error('Web Speech non disponible'));
                return;
            }

            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            utterance.onend = () => {
                console.log("✅ Web Speech terminé");
                resolve(true);
            };
            
            utterance.onerror = (e) => {
                console.warn("❌ Erreur Web Speech:", e);
                this.visualFallback(text);
                resolve(true);
            };
            
            window.speechSynthesis.speak(utterance);
        });
    },

    // ============================================
    // =========== FALLBACK VISUEL ===============
    // ============================================
    visualFallback: function(text) {
        console.log(`📢 [TTS] Fallback visuel: "${text}"`);
        
        const toast = document.getElementById('toast');
        if (toast) {
            if (toast._timeout) clearTimeout(toast._timeout);
            toast.textContent = `📢 ${text}`;
            toast.classList.add('show');
            toast._timeout = setTimeout(() => {
                toast.classList.remove('show');
            }, 5000);
            return Promise.resolve(true);
        }
        
        // Créer un toast temporaire
        const newToast = document.createElement('div');
        newToast.style.cssText = `
            position: fixed;
            bottom: 150px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 16px 24px;
            border-radius: 16px;
            font-size: 1rem;
            z-index: 99998;
            max-width: 90%;
            text-align: center;
            box-shadow: 0 8px 30px rgba(0,0,0,0.4);
        `;
        newToast.textContent = `📢 ${text}`;
        document.body.appendChild(newToast);
        
        setTimeout(() => {
            newToast.style.opacity = '0';
            newToast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => newToast.remove(), 300);
        }, 5000);
        
        return Promise.resolve(true);
    },

    // ============================================
    // =========== MISE À JOUR INDICATEUR ========
    // ============================================
    updateIndicator: function() {
        const indicator = document.getElementById('voiceIndicator');
        if (!indicator) return;

        if (this.engine === 'capacitor') {
            indicator.textContent = '🎙️ Capacitor';
            indicator.className = 'voice-indicator capacitor';
        } else if (this.engine === 'web') {
            const voices = window.speechSynthesis?.getVoices?.() || [];
            indicator.textContent = `🎙️ Web Speech (${voices.length})`;
            indicator.className = 'voice-indicator web';
        } else {
            indicator.textContent = '📢 Mode texte';
            indicator.className = 'voice-indicator';
            indicator.style.background = '#FF9800';
        }
    },

    // ============================================
    // =========== STOP ==========================
    // ============================================
    stop: function() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }
};

// ============================================
// =========== AUTO-INITIALISATION ============
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ETEO.TTS.init();
    });
} else {
    window.ETEO.TTS.init();
}

console.log("✅ [ETEO TTS] Manager chargé - Mode diagnostic actif");
