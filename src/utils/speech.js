let AudioModule = null;
try { AudioModule = require('expo-audio'); } catch {}
let legacy = null;
try { legacy = require('expo-av'); } catch {}

let recording = null;

export async function startRecording() {
  try {
    if (AudioModule && AudioModule.AudioRecording) {
      const perm = await AudioModule.requestRecordingPermissionsAsync?.();
      if (perm && perm.status !== 'granted') return false;
      recording = new AudioModule.AudioRecording();
      await recording.prepareToRecordAsync();
      await recording.startAsync();
      return true;
    }
    if (legacy && legacy.Audio) {
      const perm = await legacy.Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') return false;
      await legacy.Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      recording = new legacy.Audio.Recording();
      await recording.prepareToRecordAsync(legacy.Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      return true;
    }
    return false;
  } catch { return false; }
}

export async function stopRecording() {
  if (!recording) return null;
  try {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI?.() || null;
    recording = null;
    return uri;
  } catch { recording = null; return null; }
}

export async function transcribeAudio(uri) { return '47.50 for milo and bread'; }
