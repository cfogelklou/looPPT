import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Portal } from '@mui/material';
import { Fullscreen as FullscreenIcon } from '@mui/icons-material';

export function KioskEntryOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const checkFullscreen = () => {
      setShow(!document.fullscreenElement);
    };

    checkFullscreen();
    window.addEventListener('fullscreenchange', checkFullscreen);
    return () => window.removeEventListener('fullscreenchange', checkFullscreen);
  }, []);

  const handleStart = () => {
    document.documentElement.requestFullscreen().catch((err) => {
      console.error(`Error attempting to enable full-screen mode: ${err.message}`);
    });
  };

  if (!show) return null;

  return (
    <Portal>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          bgcolor: 'rgba(0,0,0,0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          textAlign: 'center',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ color: 'white' }}>
          LooPPT
        </Typography>
        <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', mb: 6, maxWidth: 400 }}>
          Your presentation is ready. Enter fullscreen to begin the perpetual loop.
        </Typography>
        
        <Button
          variant="contained"
          size="large"
          startIcon={<FullscreenIcon />}
          onClick={handleStart}
          sx={{
            py: 2,
            px: 6,
            borderRadius: 4,
            fontSize: '1.25rem',
            textTransform: 'none',
            boxShadow: '0 0 40px rgba(37, 99, 235, 0.4)',
            height: 64, // R2: Touch target size
            minWidth: 200,
          }}
        >
          Start Kiosk
        </Button>

        <Typography variant="caption" sx={{ mt: 4, color: 'rgba(255,255,255,0.4)' }}>
          Tip: Press ESC at any time to exit fullscreen and access settings.
        </Typography>
      </Box>
    </Portal>
  );
}
