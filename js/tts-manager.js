// ============================================
// =========== TTS MANAGER ====================
// =========== Version Mobile Telegram =======
// ============================================

window.ETEO = window.ETEO || {};

window.ETEO.TTS = {
    engine: null,
    initialized: false,
    audioUnlocked: false,

    // ============================================
    // =========== INITIALISATION ================
    // ============================================
    init: function() {
        if (this.initialized) return;
        
        console.log("--- [ETEO TTS] Début de l'audit ---");
        console.log("Capacitor global:", window.Capacitor);
        console.log("Plugins:", window.Capacitor?.Plugins);
        console.log("TextToSpeech plugin:", window.Capacitor?.Plugins?.TextToSpeech);

        if (window.Capacitor?.Plugins?.TextToSpeech) {
            this.engine = 'capacitor';
            console.log("✅ [ETEO TTS] Moteur choisi : Capacitor");
        } else if ('speechSynthesis' in window) {
            this.engine = 'web';
            console.log("⚠️ [ETEO TTS] Moteur choisi : Web Speech API (Fallback)");
            this.loadVoices();
        } else {
            console.error("❌ [ETEO TTS] Aucun moteur disponible !");
            this.engine = 'none';
        }
        
        this.initialized = true;
        this.detectMobile();
        
        return this;
    },

    // ============================================
    // =========== DÉTECTION MOBILE ==============
    // ============================================
    detectMobile: function() {
        this.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent);
        if (this.isMobile) {
            console.log("📱 [TTS] Mode mobile détecté");
        }
    },

    // ============================================
    // =========== CHARGEMENT DES VOIX ===========
    // ============================================
    loadVoices: function() {
        if (this.engine !== 'web') return;
        
        this.voices = window.speechSynthesis.getVoices();
        
        if (this.voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
                this.voices = window.speechSynthesis.getVoices();
                console.log(`🗣️ [TTS] Voix chargées : ${this.voices.length}`);
            };
        } else {
            console.log(`🗣️ [TTS] Voix disponibles : ${this.voices.length}`);
        }
    },

    // ============================================
    // =========== DÉVERROUILLAGE AUDIO ==========
    // ============================================
    unlockAudio: function() {
        if (this.audioUnlocked) return true;
        
        try {
            // Créer un contexte audio
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            // Jouer un silence pour "réveiller" l'audio
            const buffer = audioContext.createBuffer(1, 1, 22050);
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);
            
            this.audioUnlocked = true;
            console.log("🔓 [TTS] Audio débloqué pour mobile");
        } catch (e) {
            console.log("⚠️ [TTS] Audio déjà débloqué ou erreur:", e);
            this.audioUnlocked = true;
        }
        return this.audioUnlocked;
    },

    // ============================================
    // =========== MÉTHODE SPEAK PRINCIPALE ======
    // ============================================
    speak: async function(text, lang = 'fr-FR') {
        if (!this.initialized) this.init();

        console.log(`🔊 [TTS] Lecture via ${this.engine} : "${text}"`);

        if (this.engine === 'capacitor') {
            return this.capacitorSpeak(text, lang);
        } else if (this.engine === 'web') {
            // ⭐ NOUVEAU : Déverrouillage audio automatique sur mobile
            if (this.isMobile) {
                this.unlockAudio();
            }
            return this.webSpeak(text, lang);
        } else {
            console.error("❌ [TTS] Aucun moteur disponible");
            return Promise.reject(new Error('Aucun moteur TTS disponible'));
        }
    },

    // ============================================
    // =========== CAPACITOR SPEAK ===============
    // ============================================
    capacitorSpeak: async function(text, lang) {
        try {
            if (window.Capacitor?.Plugins?.TextToSpeech) {
                await window.Capacitor.Plugins.TextToSpeech.speak({ 
                    text, 
                    lang,
                    rate: 1.0,
                    pitch: 1.0,
                    volume: 1.0
                });
                console.log("✅ [TTS] Capacitor - Lecture réussie");
                return true;
            } else {
                throw new Error('Plugin Capacitor non disponible');
            }
        } catch (error) {
            console.error("❌ [TTS] Erreur Capacitor:", error);
            console.log("🔄 [TTS] Fallback vers Web Speech");
            return this.webSpeak(text, lang);
        }
    },

    // ============================================
    // =========== WEB SPEECH AMÉLIORÉE ==========
    // =========== (Gère le blocage mobile) ======
    // ============================================
    webSpeak: function(text, lang) {
        return new Promise((resolve, reject) => {
            // Vérification de l'API
            if (!('speechSynthesis' in window)) {
                reject(new Error('Web Speech API non supportée'));
                return;
            }

            // Annuler toute synthèse en cours
            window.speechSynthesis.cancel();

            // ⭐ NOUVEAU : Déverrouillage audio pour mobile
            if (this.isMobile) {
                this.unlockAudio();
            }

            const utterance = new SpeechSynthesisUtterance(text);
            
            // Sélectionner une voix appropriée
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                const langPrefix = lang.split('-')[0];
                const voice = voices.find(v => v.lang.startsWith(langPrefix)) || 
                             voices.find(v => v.lang.startsWith('fr')) ||
                             voices[0];
                if (voice) {
                    utterance.voice = voice;
                }
            }
            
            utterance.lang = lang;
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            let isResolved = false;

            utterance.onstart = function() {
                console.log("🔊 [TTS] Web Speech - Début de la lecture");
            };

            utterance.onend = function() {
                if (!isResolved) {
                    isResolved = true;
                    console.log("✅ [TTS] Web Speech - Lecture terminée");
                    resolve(true);
                }
            };

            utterance.onerror = function(event) {
                console.error("❌ [TTS] Erreur Web Speech:", event);
                
                // ⭐ NOUVEAU : Gestion de l'erreur "not-allowed" sur mobile
                if (event.error === 'not-allowed' || event.error === 'synthesis-failed') {
                    console.log("🔄 [TTS] Tentative de déverrouillage audio...");
                    
                    try {
                        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                        if (audioCtx.state === 'suspended') {
                            audioCtx.resume();
                        }
                        const buffer = audioCtx.createBuffer(1, 1, 22050);
                        const source = audioCtx.createBufferSource();
                        source.buffer = buffer;
                        source.connect(audioCtx.destination);
                        source.start(0);
                        
                        console.log("🔓 [TTS] Audio débloqué, nouvelle tentative...");
                        setTimeout(() => {
                            window.speechSynthesis.speak(utterance);
                        }, 300);
                        return;
                    } catch (e) {
                        console.error("❌ Échec du déverrouillage:", e);
                    }
                }
                
                if (!isResolved) {
                    isResolved = true;
                    reject(new Error(event.error || 'Erreur de synthèse vocale'));
                }
            };

            // Lancer la lecture
            try {
                window.speechSynthesis.speak(utterance);
                console.log("🗣️ [TTS] Web Speech - Lecture lancée");
            } catch (error) {
                if (!isResolved) {
                    isResolved = true;
                    reject(error);
                }
            }

            // Timeout de sécurité (30 secondes max)
            setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    console.warn("⏱️ [TTS] Timeout - Arrêt de la synthèse");
                    window.speechSynthesis.cancel();
                    reject(new Error('Timeout - La synthèse a pris trop de temps'));
                }
            }, 30000);
        });
    },

    // ============================================
    // =========== STOP ==========================
    // ============================================
    stop: function() {
        if (this.engine === 'capacitor') {
            try {
                if (window.Capacitor?.Plugins?.TextToSpeech) {
                    window.Capacitor.Plugins.TextToSpeech.stop();
                }
            } catch (e) {
                console.error("Erreur stop Capacitor:", e);
            }
        } else if (this.engine === 'web') {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                console.log("⏹️ [TTS] Synthèse arrêtée");
            }
        }
    },

    // ============================================
    // =========== UTILITAIRES ===================
    // ============================================
    getVoices: function() {
        if (this.engine === 'web') {
            return window.speechSynthesis.getVoices();
        }
        return [];
    },

    isSpeaking: function() {
        if (this.engine === 'web') {
            return window.speechSynthesis.speaking;
        }
        return false;
    },

    isAudioAvailable: function() {
        if (this.engine === 'capacitor') {
            return !!window.Capacitor?.Plugins?.TextToSpeech;
        } else if (this.engine === 'web') {
            return 'speechSynthesis' in window;
        }
        return false;
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

console.log("✅ [ETEO TTS] Manager chargé et prêt");
