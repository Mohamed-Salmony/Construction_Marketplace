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
      {src && (
        <AvatarImage 
          src={src} 
          alt={alt || name || 'User avatar'} 
        />
      )}
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
