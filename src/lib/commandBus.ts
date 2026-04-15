import type { AssistantAction } from '../types/domain';

const EVENT_NAME = 'artist-os-command';

export function dispatchAssistantAction(action: AssistantAction) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: action }));
}

export function subscribeAssistantActions(handler: (action: AssistantAction) => void) {
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<AssistantAction>;
    if (customEvent.detail) {
      handler(customEvent.detail);
    }
  };

  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
