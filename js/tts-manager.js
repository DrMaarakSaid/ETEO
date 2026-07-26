window.ETEO = window.ETEO || {};

window.ETEO.TTS = {
    engine: null, // Sera 'capacitor', 'web', ou null

    init: function() {
        console.log("--- [ETEO TTS] Début de l'audit ---");
        console.log("Capacitor global:", window.Capacitor);
        console.log("Plugins:", window.Capacitor?.Plugins);
        console.log("TextToSpeech plugin:", window.Capacitor?.Plugins?.TextToSpeech);

        // Détection intelligente et paresseuse
        if (window.Capacitor?.Plugins?.TextToSpeech) {
            this.engine = 'capacitor';
            console.log("✅ [ETEO TTS] Moteur choisi : Capacitor");
        } else if ('speechSynthesis' in window) {
            this.engine = 'web';
            console.log("⚠️ [ETEO TTS] Moteur choisi : Web Speech API (Fallback)");
        } else {
            console.error("❌ [ETEO TTS] Aucun moteur disponible !");
        }
    },

    speak: async function(text, lang = 'fr-FR') {
        // Initialisation à la demande (Lazy loading)
        if (!this.engine) this.init();

        console.log(`🔊 [TTS] Lecture via ${this.engine} : "${text}"`);

        if (this.engine === 'capacitor') {
            try {
                await window.Capacitor.Plugins.TextToSpeech.speak({ text, lang });
            } catch (e) { console.error("Erreur Capacitor :", e); }
        } else if (this.engine === 'web') {
            const u = new SpeechSynthesisUtterance(text);
            u.lang = lang;
            window.speechSynthesis.speak(u);
        }
    }
};