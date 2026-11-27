const PREFERENCE_KEY = "clearpth.ambientNoise.enabled";
const CHANGE_EVENT = "clearpth:ambient-sound-changed";
let sessionPreference: boolean | undefined;

export function getAmbientSoundEnabled() {
  if (sessionPreference !== undefined) return sessionPreference;
  try {
    return window.localStorage.getItem(PREFERENCE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setAmbientSoundEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(PREFERENCE_KEY, String(enabled));
    sessionPreference = undefined;
  } catch {
    sessionPreference = enabled;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeAmbientSound(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === PREFERENCE_KEY || event.key === null) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
