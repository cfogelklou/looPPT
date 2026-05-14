import React from 'react';

interface EmbedSlideProps {
  url: string;
  active: boolean;
}

function toEmbedUrl(raw: string): string {
  // YouTube watch URL → embed URL
  const ytMatch = raw.match(/^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1`;

  // YouTube short URL → embed URL
  const shortsMatch = raw.match(/^https:\/\/youtu\.be\/([\w-]+)/);
  if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=1&mute=1`;

  // Already an embed URL — add autoplay if missing
  if (raw.includes('youtube.com/embed/')) {
    const sep = raw.includes('?') ? '&' : '?';
    if (!raw.includes('autoplay')) return `${raw}${sep}autoplay=1&mute=1`;
  }

  return raw;
}

export function EmbedSlide({ url, active }: EmbedSlideProps) {
  const embedUrl = toEmbedUrl(url);
  return (
    <iframe
      src={active ? embedUrl : ''}
      className="border-0"
      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
      allow="autoplay; fullscreen"
      title="Embedded content"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        ...(!active ? { visibility: 'hidden' } : {}),
      }}
    />
  );
}
