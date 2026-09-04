import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useUniwind } from 'uniwind';

import GoogleLogo from '@/assets/images/google-icon.svg';

/**
 * Real provider marks, not lookalikes.
 *
 * Google: the official four-colour "G" asset that already shipped in
 * assets/images/google-icon.svg. Google's brand guidelines forbid recolouring or
 * restyling it, so it is rendered as-is in both light and dark mode and never tinted.
 *
 * Apple: the official Apple logo glyph. Apple's Sign in with Apple guidelines require
 * the mark to be black on light backgrounds and white on dark ones, so it follows the
 * app theme. (The previous button used lucide's `Apple` icon, which is a picture of a
 * piece of fruit with a leaf, not Apple's logo.)
 */

export function GoogleBrandIcon({ size = 20 }: { size?: number }) {
  return <GoogleLogo width={size} height={size} />;
}

export function AppleBrandIcon({ size = 20, color }: { size?: number; color?: string }) {
  const { theme } = useUniwind();
  // Apple requires white-on-dark / black-on-light for the mark.
  const fill = color ?? (theme === 'dark' ? '#FFFFFF' : '#000000');

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={fill}
        d="M17.564 12.75c-.024-2.69 2.196-3.98 2.296-4.045-1.25-1.83-3.196-2.08-3.887-2.108-1.655-.167-3.23.974-4.07.974-.84 0-2.132-.95-3.505-.925-1.803.027-3.466 1.048-4.394 2.662-1.873 3.25-.479 8.062 1.345 10.7.891 1.29 1.953 2.74 3.345 2.688 1.343-.055 1.85-.868 3.474-.868 1.624 0 2.08.868 3.498.842 1.444-.026 2.358-1.315 3.24-2.612 1.021-1.498 1.442-2.95 1.466-3.025-.032-.014-2.81-1.079-2.838-4.283z"
      />
      <Path
        fill={fill}
        d="M14.94 4.87c.742-.9 1.243-2.15 1.106-3.395-1.07.043-2.366.712-3.133 1.61-.688.796-1.29 2.068-1.128 3.288 1.194.093 2.413-.607 3.155-1.503z"
      />
    </Svg>
  );
}
