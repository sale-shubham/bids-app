'use client';
import * as React from 'react';
import { InitialsAvatar, type InitialsAvatarProps } from '@/components/common/initials-avatar';
import { assetUrl } from '@/lib/assets';
import { cn } from '@/lib/utils';

const SIZES = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12', xl: 'h-20 w-20 sm:h-24 sm:w-24' } as const;

interface MemberAvatarProps extends Omit<InitialsAvatarProps, 'size'> {
  avatarUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

// The member's photo, or a coloured initials circle when there is none (or it
// fails to load).
export function MemberAvatar({ avatarUrl, size = 'md', className, ...who }: MemberAvatarProps) {
  const src = assetUrl(avatarUrl);
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <InitialsAvatar
        {...who}
        size={size === 'xl' ? 'lg' : size}
        className={cn(SIZES[size], size === 'xl' && 'text-2xl', className)}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      onError={() => setFailedSrc(src)}
      className={cn('shrink-0 rounded-full object-cover', SIZES[size], className)}
    />
  );
}
