import React from 'react';

type Props = {
  name: string;
  size?: number;
  className?: string;
};

export function Icon({ name, size = 20, className }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'dumbbell':
      return (
        <svg {...common} className={className}>
          <path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11" />
        </svg>
      );
    case 'scale':
      return (
        <svg {...common} className={className}>
          <path d="M12 3v18M5 7h14M6 7l-3 7a3.5 3.5 0 0 0 7 0L7 7M18 7l-3 7a3.5 3.5 0 0 0 7 0l-3-7M4 21h16" />
        </svg>
      );
    case 'history':
      return (
        <svg {...common} className={className}>
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5M12 7v5l3 2" />
        </svg>
      );
    case 'back':
      return (
        <svg {...common} className={className}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...common} className={className}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common} className={className}>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common} className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...common} className={className}>
          <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.4-4.1-1L3 20l1-5.4A8.5 8.5 0 1 1 21 11.5z" />
        </svg>
      );
    case 'pen':
      return (
        <svg {...common} className={className}>
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common} className={className}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
        </svg>
      );
    case 'target':
      return (
        <svg {...common} className={className}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      );
    case 'gear':
      return (
        <svg {...common} className={className}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
    case 'chevron':
      return (
        <svg {...common} className={className}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...common} className={className}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common} className={className}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'bolt':
      return (
        <svg {...common} className={className}>
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case 'food':
      return (
        <svg {...common} className={className}>
          <path d="M4 3v7a2 2 0 0 0 2 2v9M9 3v7a2 2 0 0 1-2 2M4 3h5M4 12h5M16 3c-1 3 2 4 2 7 0 1.5-1 2-1 2v9M17 3c1 3-2 4-2 7" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common} className={className}>
          <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
        </svg>
      );
    default:
      return null;
  }
}