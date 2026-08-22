// ================================================
// RINGTONE ENGINE — Web Audio API দিয়ে জেনারেট করা প্রিমিয়াম সাউন্ড
// (কোনো external mp3 ফাইল লাগবে না, তাই Spck প্রিভিউ + আসল APK দুই জায়গাতেই কাজ করে)
// ================================================

const Ringtones = (function () {

    let audioCtx = null;
    let activeOscillators = [];
    let loopTimer = null;

    function getCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    function tone(freq, startTime, duration, type = 'sine', gainVal = 0.25) {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.02);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
        activeOscillators.push(osc);
    }

    const PATTERNS = {
        classic: (t) => { tone(880, t, 0.15); tone(880, t + 0.25, 0.15); },
        gentle: (t) => { tone(523, t, 0.3, 'sine', 0.18); tone(659, t + 0.35, 0.3, 'sine', 0.18); tone(784, t + 0.7, 0.4, 'sine', 0.18); },
        urgent: (t) => { tone(1046, t, 0.1, 'square', 0.2); tone(1046, t + 0.15, 0.1, 'square', 0.2); tone(1046, t + 0.3, 0.1, 'square', 0.2); },
        digital: (t) => { tone(440, t, 0.08, 'sawtooth', 0.15); tone(554, t + 0.1, 0.08, 'sawtooth', 0.15); tone(659, t + 0.2, 0.08, 'sawtooth', 0.15); tone(880, t + 0.3, 0.15, 'sawtooth', 0.15); },
        bell: (t) => { tone(988, t, 0.6, 'triangle', 0.2); tone(1318, t + 0.05, 0.5, 'triangle', 0.12); }
    };

    const CYCLE_LENGTH = { classic: 0.9, gentle: 1.5, urgent: 0.6, digital: 0.7, bell: 1.2 };

    let currentPattern = 'classic';
    let customAudioEl = null;

    function play(patternName, customDataUrl) {
        stop();

        // ------- কাস্টম ফাইল বা ভয়েস রেকর্ডিং বাজানো -------
        if ((patternName === 'custom_file' || patternName === 'voice') && customDataUrl) {
            customAudioEl = new Audio(customDataUrl);
            customAudioEl.loop = true;
            customAudioEl.volume = 1.0;
            customAudioEl.play().catch(err => console.warn('Audio play blocked:', err));
            return;
        }

        currentPattern = PATTERNS[patternName] ? patternName : 'classic';
        const ctx = getCtx();
        if (ctx.state === 'suspended') ctx.resume();

        function loop() {
            const now = ctx.currentTime + 0.05;
            PATTERNS[currentPattern](now);
            loopTimer = setTimeout(loop, CYCLE_LENGTH[currentPattern] * 1000);
        }
        loop();
    }

    function stop() {
        if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
        activeOscillators.forEach(o => { try { o.stop(); } catch (e) {} });
        activeOscillators = [];
        if (customAudioEl) { customAudioEl.pause(); customAudioEl.currentTime = 0; customAudioEl = null; }
    }

    function previewCustom(dataUrl) {
        stop();
        if (!dataUrl) return;
        const a = new Audio(dataUrl);
        a.play().catch(err => console.warn('Preview blocked:', err));
    }

    function preview(patternName) {
        stop();
        const ctx = getCtx();
        if (ctx.state === 'suspended') ctx.resume();
        const p = PATTERNS[patternName] || PATTERNS.classic;
        p(ctx.currentTime + 0.05);
    }

    const LABELS = {
        classic: '🔔 ক্লাসিক বিপ',
        gentle: '🎐 জেন্টল চাইম',
        urgent: '🚨 আর্জেন্ট পালস',
        digital: '📟 ডিজিটাল ওয়েভ',
        bell: '🛎️ সফট বেল',
        custom_file: '📁 কাস্টম গান',
        voice: '🎙️ ভয়েস রেকর্ড'
    };

    return { play, stop, preview, previewCustom, LABELS };
})();
