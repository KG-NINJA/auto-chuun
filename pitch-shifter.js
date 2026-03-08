/**
 * Pitch shifting using a granular approach (Phase-Vocoder-like or Dual Delay Line).
 * This implementation uses a dual delay line pitch shifter to allow real-time
 * pitch shifting without changing the playback speed and avoiding buffer drift.
 */

function createPitchShiftNode(audioContext, initialPitchRatio) {
    const bufferSize = 4096;
    const node = audioContext.createScriptProcessor(bufferSize, 1, 1);

    node.pitchRatio = initialPitchRatio || 1.0;

    const delayLength = 0.1; // 100ms delay buffer
    const bufferSamples = Math.floor(delayLength * audioContext.sampleRate);
    const buffer = new Float32Array(bufferSamples);
    let writeIndex = 0;

    // Two delay pointers for overlapping grains
    let readIndex1 = 0;
    let readIndex2 = bufferSamples / 2;

    node.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const output = e.outputBuffer.getChannelData(0);

        for (let i = 0; i < input.length; i++) {
            // Write input to circular buffer
            buffer[writeIndex] = input[i];

            // Calculate windows (triangular)
            const phase1 = readIndex1 / bufferSamples;
            const window1 = 1 - Math.abs(2 * phase1 - 1);

            const phase2 = readIndex2 / bufferSamples;
            const window2 = 1 - Math.abs(2 * phase2 - 1);

            // Read from buffer with interpolation
            const sample1 = interpolate(buffer, (writeIndex - readIndex1 + bufferSamples) % bufferSamples);
            const sample2 = interpolate(buffer, (writeIndex - readIndex2 + bufferSamples) % bufferSamples);

            // Mix grains
            output[i] = sample1 * window1 + sample2 * window2;

            // Update read pointers based on pitch ratio
            // The speed of the read pointer relative to the write pointer determines the pitch shift.
            // Shift = 1 - Ratio
            const shift = 1.0 - node.pitchRatio;
            readIndex1 = (readIndex1 + shift + bufferSamples) % bufferSamples;
            readIndex2 = (readIndex2 + shift + bufferSamples) % bufferSamples;

            writeIndex = (writeIndex + 1) % bufferSamples;
        }
    };

    function interpolate(buf, index) {
        const i = Math.floor(index);
        const f = index - i;
        const i2 = (i + 1) % buf.length;
        return buf[i] * (1 - f) + buf[i2] * f;
    }

    return node;
}
