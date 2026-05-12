import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { db } from '../store/db';
import * as pptxRenderer from '@kandiforge/pptx-renderer';

// Mock Dexie
vi.mock('../store/db', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    db: {
      presentations: {
        add: vi.fn().mockResolvedValue(1),
        get: vi.fn().mockResolvedValue({
          id: 1,
          name: 'test.pptx',
          blob: new Blob(['dummy content'], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }),
          updatedAt: Date.now()
        }),
      },
      settings: {
        get: vi.fn().mockResolvedValue(null), // Force initial setup
        add: vi.fn(),
        update: vi.fn().mockResolvedValue(1),
      },
    },
    ensureSettings: vi.fn().mockResolvedValue({ id: 'current', currentSlide: 0, interval: 5, fitMode: 'contain' }),
  };
});

// Mock @kandiforge/pptx-renderer
vi.mock('@kandiforge/pptx-renderer', () => ({
  parsePPTX: vi.fn().mockResolvedValue({
    slides: [{}, {}, {}],
    size: { width: 100, height: 100 }
  }),
  SlideView: ({ slide }: any) => <div data-testid="slide-view">Slide</div>,
}));

// Mock navigator.storage
Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: vi.fn().mockResolvedValue({ quota: 1000000, usage: 0 })
  },
  configurable: true
});

describe('LooPPT Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes the full flow from upload to playback', async () => {
    render(<App />);
    
    // 1. Initial State: Uploader is shown
    const uploadTitle = await screen.findByText('Upload Presentation');
    expect(uploadTitle).toBeInTheDocument();

    // 2. Upload a file
    const input = screen.getByLabelText(/Upload Presentation/i);
    const file = new File(['dummy content'], 'test.pptx', { 
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
    });
    
    fireEvent.change(input, { target: { files: [file] } });

    // 3. Verify DB call
    await waitFor(() => {
      expect(db.presentations.add).toHaveBeenCalled();
    });

    // 4. Verify Player is rendered
    // The App should switch from Uploader to Player once presentationId is set in context
    const slideViews = await screen.findAllByTestId('slide-view');
    expect(slideViews.length).toBeGreaterThan(0);
    
    // 5. Verify Slide Count
    const slideCount = screen.getByText('1 / 3');
    expect(slideCount).toBeInTheDocument();
    
    // 6. Test manual navigation
    const nextButton = screen.getByLabelText('Next Slide');
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });
  });

  it('handles storage quota errors during upload', async () => {
    // Mock insufficient storage
    (navigator.storage.estimate as any).mockResolvedValueOnce({ quota: 1000, usage: 900 });
    
    render(<App />);
    
    const input = await screen.findByLabelText(/Upload Presentation/i);
    const bigFile = new File(['a'.repeat(200)], 'big.pptx', { 
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
    });
    
    fireEvent.change(input, { target: { files: [bigFile] } });

    const errorMsg = await screen.findByText('Insufficient storage space.');
    expect(errorMsg).toBeInTheDocument();
  });
});
