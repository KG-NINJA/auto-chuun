let audioContext;
let microphone;
let pitchShifter;
let analyzer;
let animationId;

const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const pitchDisplay = document.getElementById('currentPitch');
const noteDisplay = document.getElementById('targetNote');
const scaleSelect = document.getElementById('scale');
const retuneSpeedInput = document.getElementById('retuneSpeed');

const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

let midiTargetNote = null;
let keyboardTargetNote = null;

const KEY_TO_NOTE = {
    'a': 60, // C4
    'w': 61, // C#4
    's': 62, // D4
    'e': 63, // D#4
    'd': 64, // E4
    'f': 65, // F4
    't': 66, // F#4
    'g': 67, // G4
    'y': 68, // G#4
    'h': 69, // A4
    'u': 70, // A#4
    'j': 71, // B4
    'k': 72  // C5
};

function getNote(frequency) {
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    return Math.round(noteNum) + 69;
}

function getFrequency(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
}

function getNearestNoteInScale(frequency, scale) {
    const note = getNote(frequency);
    if (scale === 'chromatic') return note;

    const scales = {
        'Cmaj': [0, 2, 4, 5, 7, 9, 11],
        'Amin': [9, 11, 0, 2, 4, 5, 7],
        'Dmaj': [2, 4, 6, 7, 9, 11, 1],
        'Gmaj': [7, 9, 11, 0, 2, 4, 6]
    };

    const allowedNotes = scales[scale];
    if (!allowedNotes) return note;

    let closestNote = note;
    let minDiff = Infinity;

    for (let i = -12; i <= 12; i++) {
        const candidate = note + i;
        const normalized = ((candidate % 12) + 12) % 12;
        if (allowedNotes.includes(normalized)) {
            const freq = getFrequency(candidate);
            const diff = Math.abs(Math.log(freq / frequency));
            if (diff < minDiff) {
                minDiff = diff;
                closestNote = candidate;
            }
        }
    }
    return closestNote;
}

async function initMIDI() {
    if (navigator.requestMIDIAccess) {
        try {
            const access = await navigator.requestMIDIAccess();
            for (let input of access.inputs.values()) {
                input.onmidimessage = (message) => {
                    const [status, note, velocity] = message.data;
                    const type = status & 0xf0;
                    if (type === 0x90 && velocity > 0) { // Note On
                        midiTargetNote = note;
                    } else if (type === 0x80 || (type === 0x90 && velocity === 0)) { // Note Off
                        if (midiTargetNote === note) midiTargetNote = null;
                    }
                };
            }
        } catch (err) {
            console.error("MIDI access denied:", err);
        }
    }
}

function initKeyboard() {
    window.onkeydown = (e) => {
        const note = KEY_TO_NOTE[e.key.toLowerCase()];
        if (note) keyboardTargetNote = note;
    };
    window.onkeyup = (e) => {
        const note = KEY_TO_NOTE[e.key.toLowerCase()];
        if (note && keyboardTargetNote === note) keyboardTargetNote = null;
    };
}

async function start() {
    if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
        return;
    }

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    initMIDI();
    initKeyboard();

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
        } });
        microphone = audioContext.createMediaStreamSource(stream);

        analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 2048;

        pitchShifter = createPitchShiftNode(audioContext, 1.0);

        microphone.connect(analyzer);
        microphone.connect(pitchShifter);
        pitchShifter.connect(audioContext.destination);

        startButton.disabled = true;
        stopButton.disabled = false;

        update();
    } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("マイクへのアクセスを許可してください。");
    }
}

function stop() {
    if (audioContext) {
        // Instead of closing, we can just disconnect to allow restart
        // but for simplicity let's close it.
        audioContext.close().then(() => {
            audioContext = null;
        });
    }
    cancelAnimationFrame(animationId);
    startButton.disabled = false;
    stopButton.disabled = true;
}

let smoothedRatio = 1.0;

function update() {
    // smoothingFactor: 0 = fast (no smoothing), 1 = slow (max smoothing)
    // retuneSpeed: 0 = slow, 100 = fast
    const smoothingFactor = 1.0 - (retuneSpeedInput.value / 100) * 0.95;
    const buffer = new Float32Array(analyzer.fftSize);
    analyzer.getFloatTimeDomainData(buffer);

    const freq = detectPitchAMDF(buffer, audioContext.sampleRate);

    if (freq !== -1 && freq > 50 && freq < 2000) {
        let nearestNote;
        const manualNote = midiTargetNote || keyboardTargetNote;

        if (manualNote) {
            nearestNote = manualNote;
        } else {
            const targetScale = scaleSelect.value;
            nearestNote = getNearestNoteInScale(freq, targetScale);
        }

        const targetFreq = getFrequency(nearestNote);
        const targetRatio = targetFreq / freq;

        // Apply smoothing to avoid artifacts
        smoothedRatio = smoothedRatio + (targetRatio - smoothedRatio) * smoothingFactor;
        pitchShifter.pitchRatio = smoothedRatio;

        pitchDisplay.innerText = `${Math.round(freq)} Hz`;
        noteDisplay.innerText = `${notes[nearestNote % 12]}${Math.floor(nearestNote / 12) - 1}`;
    } else {
        // If no pitch detected, don't shift or return to 1.0 slowly
        smoothedRatio = smoothedRatio + (1.0 - smoothedRatio) * 0.1;
        pitchShifter.pitchRatio = smoothedRatio;

        pitchDisplay.innerText = `--- Hz`;
        noteDisplay.innerText = `---`;
    }

    animationId = requestAnimationFrame(update);
}

startButton.onclick = start;
stopButton.onclick = stop;
