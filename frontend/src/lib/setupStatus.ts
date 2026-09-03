const SETUP_STATUS_EVENT = 'setup-status-changed';

export function notifySetupStatusChanged() {
  window.dispatchEvent(new Event(SETUP_STATUS_EVENT));
}

export function onSetupStatusChanged(listener: () => void) {
  window.addEventListener(SETUP_STATUS_EVENT, listener);
  return () => window.removeEventListener(SETUP_STATUS_EVENT, listener);
}
