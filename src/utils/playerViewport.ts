export const KIOSK_MODE_CLASS = 'looppt-kiosk-mode';
export const PLAYER_VIEWPORT_CHANGE_EVENT = 'looppt-player-viewport-change';

export const getPresentationViewport = () => {
  return {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  };
};
