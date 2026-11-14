import * as React from 'react';

/**
 * 0 until `value` first changes, then a counter that increases on every change. Use it as a
 * React `key` (and only animate when > 0) to replay a CSS animation when a value updates.
 */
export function usePulseKey(value: unknown): number {
  const [prev, setPrev] = React.useState(value);
  const [pulse, setPulse] = React.useState(0);
  if (!Object.is(value, prev)) {
    setPrev(value);
    setPulse(pulse + 1);
  }
  return pulse;
}
