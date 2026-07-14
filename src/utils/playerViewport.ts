export const KIOSK_MODE_CLASS = 'looppt-kiosk-mode';
export const PLAYER_VIEWPORT_CHANGE_EVENT = 'looppt-player-viewport-change';

const DESKTOP_BREAKPOINT = 1024;
const DESKTOP_AD_RAIL_WIDTH = 160;
const MOBILE_AD_HEIGHT = 90;

export const getPresentationViewport = () => {
  const isKiosk = document.body.classList.contains(KIOSK_MODE_CLASS);
  const hasDesktopRail = !isKiosk && window.innerWidth >= DESKTOP_BREAKPOINT;
  const hasMobileBanner = !isKiosk && !hasDesktopRail;

  return {
    width: document.documentElement.clientWidth - (hasDesktopRail ? DESKTOP_AD_RAIL_WIDTH : 0),
    height: document.documentElement.clientHeight - (hasMobileBanner ? MOBILE_AD_HEIGHT : 0),
  };
};
