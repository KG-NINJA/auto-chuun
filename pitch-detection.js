/**
 * Pitch detection using the McLeod Pitch Method (MPM) or Autocorrelation.
 * For simplicity and efficiency in the browser, we'll use a modified Autocorrelation (AMDF or similar).
 */

function autoCorrelate(buffer, sampleRate) {
  // Perform a simple autocorrelation to find the fundamental frequency.
  var SIZE = buffer.length;
  var rms = 0;

  for (var i = 0; i < SIZE; i++) {
    var val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) // not enough signal
    return -1;

  var r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (var i = 0; i < SIZE / 2; i++)
    if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
  for (var i = 1; i < SIZE / 2; i++)
    if (Math.abs(buffer[SIZE - i]) < thres) { r2 = SIZE - i; break; }

  buffer = buffer.slice(r1, r2);
  SIZE = buffer.length;

  var c = new Array(SIZE).fill(0);
  for (var i = 0; i < SIZE; i++)
    for (var j = 0; j < SIZE - i; j++)
      c[i] = c[i] + buffer[j] * buffer[j + i];

  var d = 0; while (c[d] > c[d + 1]) d++;
  var maxval = -1, maxpos = -1;
  for (var i = d; i < SIZE; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  var T0 = maxpos;

  var x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  var a = (x1 + x3 - 2 * x2) / 2;
  var b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

// AMDF algorithm for pitch detection (more robust for some cases)
function detectPitchAMDF(buffer, sampleRate) {
    const minFreq = 80;
    const maxFreq = 1000;
    const maxPeriod = Math.floor(sampleRate / minFreq);
    const minPeriod = Math.floor(sampleRate / maxFreq);

    let bestPeriod = 0;
    let minDifference = Infinity;

    for (let period = minPeriod; period <= maxPeriod; period++) {
        let difference = 0;
        for (let i = 0; i < buffer.length - period; i++) {
            difference += Math.abs(buffer[i] - buffer[i + period]);
        }
        if (difference < minDifference) {
            minDifference = difference;
            bestPeriod = period;
        }
    }

    // Simple voicing check
    let rms = 0;
    for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
    rms = Math.sqrt(rms / buffer.length);
    if (rms < 0.01) return -1;

    return sampleRate / bestPeriod;
}
