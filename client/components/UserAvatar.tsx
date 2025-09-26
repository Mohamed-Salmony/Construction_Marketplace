import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { User } from 'lucide-react';
import { cn } from './ui/utils';

interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
  xl: 'size-16',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5', 
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
};

export default function UserAvatar({ 
  src, 
  alt, 
  name, 
  size = 'md', 
  className 
}: UserAvatarProps) {
  // Normalize media URLs: if relative (e.g., /uploads/xyz.jpg), prefix with API base
  const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');
  const BASE_NO_API = /\/api\/?$/i.test(API_BASE) ? API_BASE.replace(/\/api\/?$/i, '') : API_BASE;
  const normalizeUrl = (u?: string | null): string | undefined => {
    if (!u) return undefined;
    // Replace Windows backslashes and trim quotes/spaces
    const s = String(u).replace(/\\/g, '/').replace(/^\s*["']|["']\s*$/g, '').trim();
    if (!s) return undefined;
    if (/^https?:\/\//i.test(s)) return s;
    try {
      const path = s.startsWith('/') ? s : `/${s}`;
      return `${BASE_NO_API}${path}`;
    } catch { return s; }
  };

  const [imgError, setImgError] = React.useState(false);
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
  const url = React.useMemo(() => normalizeUrl(src), [src, BASE_NO_API]);
  React.useEffect(() => { setImgError(false); setBlobUrl(null); }, [url]);
  // Get initials from name as fallback
  const getInitials = (name?: string) => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0][0]?.toUpperCase() || '';
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {blobUrl ? (
        <AvatarImage 
          src={blobUrl}
          alt={alt || name || 'User avatar'}
        />
      ) : url && !imgError ? (
        <AvatarImage 
          src={url} 
          alt={alt || name || 'User avatar'} 
          onError={async () => {
            try {
              // Attempt authenticated fetch for protected resources
              const resp = await fetch(url, { credentials: 'include' });
              if (resp.ok) {
                const ct = resp.headers.get('content-type') || '';
                if (/image\//i.test(ct)) {
                  const b = await resp.blob();
                  const obj = URL.createObjectURL(b);
                  setBlobUrl(obj);
                  return;
                }
              }
            } catch {}
            setImgError(true);
          }}
        />
      ) : null}
      <AvatarFallback className="bg-primary/10 text-primary">
        {name ? (
          <span className="text-sm font-medium">
            {getInitials(name)}
          </span>
        ) : (
          <User className={iconSizes[size]} />
        )}
      </AvatarFallback>
    </Avatar>
  );
}
