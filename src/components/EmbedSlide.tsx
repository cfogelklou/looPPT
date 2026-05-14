import React from 'react';

interface EmbedSlideProps {
  url: string;
  active: boolean;
}

export function EmbedSlide({ url, active }: EmbedSlideProps) {
  return (
    <iframe
      src={active ? url : ''}
      className="w-full h-full border-0"
      allow="autoplay; fullscreen"
      title="Embedded content"
      style={!active ? { visibility: 'hidden' } : undefined}
    />
  );
}
