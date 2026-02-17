'use client';

import Image from 'next/image';
import React from 'react';

const LOGO_LIGHT = '/images/logo/onyango-logo-light.png';
const LOGO_DARK = '/images/logo/onyango-logo-dark.png';

export type CompanyLogoVariant = 'light' | 'dark' | 'auto';

interface CompanyLogoProps {
  /** Use "light" on light backgrounds, "dark" on dark backgrounds, "auto" to follow theme */
  variant?: CompanyLogoVariant;
  /** Size in pixels (width and height) */
  size?: number;
  /** Optional custom class (e.g. for responsive sizes). Overrides size when both present. */
  className?: string;
  /** Round crop (circle). Default true */
  rounded?: boolean;
}

export default function CompanyLogo({
  variant = 'auto',
  size = 40,
  className,
  rounded = true,
}: CompanyLogoProps) {
  const sizeClass = !className ? { width: size, height: size } : undefined;
  const roundClass = rounded ? 'rounded-full object-cover' : 'rounded-xl object-contain';

  if (variant === 'auto') {
    return (
      <span
        className={`relative inline-block shrink-0 overflow-hidden ${rounded ? 'rounded-full' : 'rounded-xl'} ${className || ''}`}
        style={{ width: size, height: size, ...(className ? {} : {}) }}
      >
        <Image
          src={LOGO_LIGHT}
          alt="Onyango Company Limited"
          width={size}
          height={size}
          className={`h-full w-full object-cover dark:hidden ${rounded ? 'rounded-full' : 'rounded-xl'}`}
        />
        <Image
          src={LOGO_DARK}
          alt="Onyango Company Limited"
          width={size}
          height={size}
          className={`hidden h-full w-full object-cover dark:block ${rounded ? 'rounded-full' : 'rounded-xl'}`}
        />
      </span>
    );
  }

  const src = variant === 'dark' ? LOGO_DARK : LOGO_LIGHT;
  return (
    <Image
      src={src}
      alt="Onyango Company Limited"
      width={size}
      height={size}
      className={`${roundClass} ${className || ''}`}
      style={sizeClass}
    />
  );
}
