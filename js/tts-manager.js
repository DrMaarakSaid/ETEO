// ============================================
// =========== TTS MANAGER ====================
// =========== Version avec détection ========
// ============================================

window.ETEO = window.ETEO || {};

window.ETEO.TTS = {
    initialized: false,
    engine: 'none',
    fallbackAudioUrl: null,

    init: function() {
        if (this.initialized) return;
        
        console.log("🔍 [ETEO TTS] Détection du moteur...");

        // 1. APK Capacitor
        if (window.Capacitor?.Plugins?.TextToSpeech) {
            this.engine = 'capacitor';
            console.log("✅ [ETEO TTS] Moteur : Capacitor (APK)");
        }
        // 2. Web Speech (Desktop)
        else if ('speechSynthesis' in window) {
            const voices = window.speechSynthesis.getVoices();
            if (voices && voices.length > 0) {
                this.engine = 'web';
                console.log(`✅ [ETEO TTS] Moteur : Web Speech (${voices.length} voix)`);
            } else {
                // Pas de voix → fallback
                this.engine = 'fallback';
                console.log("⚠️ [ETEO TTS] Aucune voix détectée → Mode fallback");
            }
        }
        // 3. Fallback
        else {
            this.engine = 'fallback';
            console.log("⚠️ [ETEO TTS] Mode fallback");
        }
        
        this.initialized = true;
        return this;
    },

    speak: async function(text, lang = 'fr-FR') {
        if (!this.initialized) this.init();

        console.log(`🔊 [ETEO TTS] Lecture: "${text}" (${this.engine})`);

        // 1. Capacitor (APK)
        if (this.engine === 'capacitor') {
            try {
                await window.Capacitor.Plugins.TextToSpeech.speak({ 
                    text, lang, rate: 1.0, pitch: 1.0, volume: 1.0
                });
                return true;
            } catch(e) {
                console.warn("Capacitor échoué, fallback");
            }
        }

        // 2. Web Speech (Desktop)
        if (this.engine === 'web') {
            try {
                return await this.webSpeak(text, lang);
            } catch(e) {
                console.warn("Web Speech échoué, fallback");
            }
        }

        // 3. Fallback : Message vocal lisible (sans son)
        console.log("📢 Mode fallback : affichage du texte");
        this.showTextFallback(text);
        
        // On retourne true pour ne pas bloquer l'application
        return true;
    },

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
                console.warn("Erreur Web Speech:", e);
                reject(e);
            };
            
            window.speechSynthesis.speak(utterance);
        });
    },

    // Fallback : affiche le texte à l'écran (pour mobile)
    showTextFallback: function(text) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = `📢 ${text}`;
            toast.classList.add('show');
            clearTimeout(toast._timeout);
            toast._timeout = setTimeout(() => {
                toast.classList.remove('show');
            }, 5000);
        } else {
            // Si pas de toast, utiliser alert
            alert(`📢 ${text}`);
        }
    },

    stop: function() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }
};

// Auto-initialisation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.ETEO.TTS.init());
} else {
    window.ETEO.TTS.init();
}

console.log("✅ [ETEO TTS] Manager chargé");
