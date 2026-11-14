import { UAParser } from 'ua-parser-js';

export interface DeviceInfo {
  browser: string;
  os: string;
  device: string;
  type: string;
}

// Parsed from navigator.userAgent — sent on login/signup verify so the
// backend's Session row (per-device, 2-device cap) has readable device
// context. deviceId itself is server-generated via the httpOnly `dvid`
// cookie, not sent from here (see bids-api readme/flows/auth.md).
export function getDeviceInfo(): DeviceInfo {
  const result = new UAParser().getResult();
  return {
    browser: result.browser.name || 'Unknown',
    os: result.os.name || 'Unknown',
    device: result.device.model || result.os.name || 'Unknown',
    type: result.device.type || 'desktop',
  };
}
