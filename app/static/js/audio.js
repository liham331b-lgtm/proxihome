// Synthétiseur audio discret (Web Audio API) sans fichier externe, déclenché uniquement sur interaction
const ProxiAudio = (() => {
    let enabled = localStorage.getItem('proxihome_sound') !== 'off';
    let ctx = null;

    function getContext() {
        if (!ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) ctx = new AudioCtx();
        }
        if (ctx && ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function playTone(freq, duration = 0.08, volume = 0.04) {
        if (!enabled) return;
        const audioCtx = getContext();
        if (!audioCtx) return;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    return {
        click: () => playTone(520, 0.07, 0.04),
        success: () => {
            playTone(523.25, 0.12, 0.05);
            setTimeout(() => playTone(659.25, 0.18, 0.05), 110);
        },
        toggle: () => {
            enabled = !enabled;
            localStorage.setItem('proxihome_sound', enabled ? 'on' : 'off');
            if (enabled) playTone(600, 0.08, 0.04);
            return enabled;
        },
        isEnabled: () => enabled
    };
})();