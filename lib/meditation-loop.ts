const SAMPLE_RATE = 24_000;
const LOOP_SECONDS = 24;
const TWO_PI = 2 * Math.PI;
let meditationLoop: AudioBuffer | undefined;

export function getMeditationLoop(context: BaseAudioContext) {
  if (meditationLoop) return meditationLoop;

  const buffer = context.createBuffer(1, SAMPLE_RATE * LOOP_SECONDS, SAMPLE_RATE);
  const samples = buffer.getChannelData(0);
  const edgeFrames = SAMPLE_RATE * 0.16;
  let rumble = 0;
  let wash = 0;
  let foam = 0;

  for (let frame = 0; frame < samples.length; frame += 1) {
    const seconds = frame / SAMPLE_RATE;
    const noise = Math.random() * 2 - 1;
    rumble += 0.012 * (noise - rumble);
    wash += 0.11 * (noise - wash);
    foam += 0.42 * (noise - foam);

    const variation = 0.075 * Math.sin(TWO_PI * seconds / LOOP_SECONDS);
    const tide = 0.5 + 0.5 * Math.sin(TWO_PI * (seconds / 8 + 0.13 + variation));
    const body = (0.68 * rumble + 0.74 * wash) * (0.25 + 0.75 * tide);
    const spray = (foam - wash) * (0.06 + 0.24 * tide ** 3);
    const edge = Math.min(1, frame / edgeFrames, (samples.length - 1 - frame) / edgeFrames);
    samples[frame] = (body + spray) * edge;
  }

  // One soft bowl strike per loop, with a 432 Hz fundamental and shorter overtones.
  const bowlStart = Math.round(1.2 * SAMPLE_RATE);
  const bowlDuration = 5 * SAMPLE_RATE;
  for (let frame = 0; frame < bowlDuration; frame += 1) {
    const seconds = frame / SAMPLE_RATE;
    const phase = TWO_PI * seconds;
    const attack = 1 - Math.exp(-seconds / 0.085);
    const tail = Math.min(1, (5 - seconds) / 0.45);
    const ring =
      0.22 * Math.sin(432 * phase) * Math.exp(-seconds / 1.15) +
      0.055 * Math.sin(434.6 * phase) * Math.exp(-seconds / 0.85) +
      0.033 * Math.sin(987 * phase) * Math.exp(-seconds / 0.52) +
      0.012 * Math.sin(1_645 * phase) * Math.exp(-seconds / 0.27);
    samples[bowlStart + frame] += ring * attack * tail;
  }

  meditationLoop = buffer;
  return buffer;
}
