import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Mock Dexie and other browser APIs
vi.mock('../store/db', () => ({
  db: {
    presentations: {
      add: vi.fn().mockResolvedValue(1),
      get: vi.fn(),
    },
    settings: {
      get: vi.fn().mockResolvedValue({ id: 'current', currentSlide: 0, interval: 5 }),
      add: vi.fn(),
      update: vi.fn().mockResolvedValue(1),
    },
  },
  ensureSettings: vi.fn().mockResolvedValue({ id: 'current', currentSlide: 0, interval: 5 }),
}));

// Mock @kandiforge/pptx-renderer
vi.mock('@kandiforge/pptx-renderer', () => ({
  parsePPTX: vi.fn(),
  SlideView: () => <div data-testid="slide-view">Slide View</div>,
}));

describe('LooPPT Smoke Test', () => {
  it('renders the uploader when no presentation is selected', async () => {
    render(<App />);

    // Wait for initial loading
    const title = await screen.findByText('LooPPT');
    expect(title).toBeInTheDocument();

    const uploadText = screen.getByText('Upload Presentation');
    expect(uploadText).toBeInTheDocument();
  });

  it('shows an error when an unsupported file type is selected', async () => {
    render(<App />);

    await screen.findByText('LooPPT');
    const input = screen.getByLabelText(/Upload Presentation/i);

    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });

    const errorMsg = await screen.findByText(/Please upload a \.pdf or \.pptx file\./i);
    expect(errorMsg).toBeInTheDocument();
  });
});
