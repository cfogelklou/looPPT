import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  IconButton,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from '@mui/material';
import { Settings as SettingsIcon, Close as CloseIcon, Info as InfoIcon } from '@mui/icons-material';
import { usePlayback } from '../store/PlaybackContext';
import { useAnimation } from '../store/AnimationContext';
import type { OverlayPreset } from '../store/db';

export function SettingsOverlay() {
  const [open, setOpen] = useState(false);
  const { state, dispatch, clearPresentation } = usePlayback();
  const { state: animState, dispatch: animDispatch } = useAnimation();
  const [storageUsage, setStorageUsage] = useState<{ used: string; quota: string; percent: number } | null>(null);

  useEffect(() => {
    if (open && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        if (estimate.usage !== undefined && estimate.quota !== undefined) {
          const used = (estimate.usage / (1024 * 1024)).toFixed(1);
          const quota = (estimate.quota / (1024 * 1024)).toFixed(0);
          const percent = Math.round((estimate.usage / estimate.quota) * 100);
          setStorageUsage({ used, quota, percent });
        }
      });
    }
  }, [open]);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  const isFullscreen = !!document.fullscreenElement;

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            bgcolor: 'rgba(0,0,0,0.5)',
            color: 'white',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            width: 48, // R2: Min touch target 44x44
            height: 48,
          }}
          aria-label="Open Settings"
        >
          <SettingsIcon />
        </IconButton>
      </div>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 350 }, p: 3, bgcolor: '#121212', color: 'white' }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5" fontWeight="bold">Settings</Typography>
          <IconButton onClick={() => setOpen(false)} sx={{ color: 'white', width: 48, height: 48 }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Loop Interval: <strong>{state.interval}s</strong>
          </Typography>
          <Slider
            value={state.interval}
            min={1}
            max={60}
            step={1}
            onChange={(_, val) => dispatch({ type: 'SET_INTERVAL', seconds: val as number })}
            sx={{ mt: 1 }}
            aria-label="Loop Interval"
          />
        </Box>

        <Box sx={{ mb: 4 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isFullscreen}
                onChange={handleToggleFullscreen}
                sx={{ '& .MuiSwitch-thumb': { width: 24, height: 24 } }}
              />
            }
            label="Fullscreen Mode"
            sx={{ '.MuiTypography-root': { fontSize: '1.1rem' } }}
          />
        </Box>

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

        <Box sx={{ mb: 4, opacity: 0.5 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Slide Transitions
          </Typography>
          <Typography variant="caption" color="rgba(255,255,255,0.4)" sx={{ display: 'block', mb: 1 }}>
            (coming in next update)
          </Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.5)">
            Type: {animState.transitionType} &middot; Duration: {animState.transitionDuration}ms
          </Typography>
        </Box>

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

        <Box sx={{ mb: 4 }}>
          <FormControlLabel
            control={
              <Switch
                checked={animState.overlayEnabled}
                onChange={(_, val) => animDispatch({ type: 'SET_OVERLAY_ENABLED', enabled: val })}
                aria-label="Animation Overlay"
              />
            }
            label="Animation Overlay"
            sx={{ '.MuiTypography-root': { fontSize: '1.1rem' } }}
          />

          {animState.overlayEnabled && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'rgba(255,255,255,0.6)' }}>Overlay Preset</InputLabel>
                <Select
                  value={animState.overlayPreset}
                  label="Overlay Preset"
                  onChange={(e) => animDispatch({ type: 'SET_OVERLAY_PRESET', preset: e.target.value as OverlayPreset })}
                  aria-label="Overlay Preset"
                  sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
                >
                  <MenuItem value="none">None</MenuItem>
                  <MenuItem value="bounce">Bounce</MenuItem>
                  <MenuItem value="fly-across">Fly Across</MenuItem>
                  <MenuItem value="pulse">Pulse</MenuItem>
                </Select>
              </FormControl>

              <Box>
                <Typography gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Overlay Size: <strong>{animState.overlaySize}px</strong>
                </Typography>
                <Slider
                  value={animState.overlaySize}
                  min={32}
                  max={256}
                  step={8}
                  onChange={(_, val) => animDispatch({ type: 'SET_OVERLAY_SIZE', size: val as number })}
                  aria-label="Overlay Size"
                />
              </Box>

              <Box>
                <Typography gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Overlay Opacity: <strong>{Math.round(animState.overlayOpacity * 100)}%</strong>
                </Typography>
                <Slider
                  value={animState.overlayOpacity}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  onChange={(_, val) => animDispatch({ type: 'SET_OVERLAY_OPACITY', opacity: val as number })}
                  aria-label="Overlay Opacity"
                />
              </Box>
            </Box>
          )}
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" color="rgba(255,255,255,0.6)" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <InfoIcon fontSize="small" /> Storage Usage
          </Typography>
          {storageUsage ? (
            <>
              <Typography variant="body2">
                {storageUsage.used} MB of {storageUsage.quota} MB used
              </Typography>
              <Box sx={{ width: '100%', height: 4, bgcolor: 'rgba(255,255,255,0.1)', mt: 1, borderRadius: 2 }}>
                <Box sx={{ width: `${storageUsage.percent}%`, height: '100%', bgcolor: 'primary.main', borderRadius: 2 }} />
              </Box>
            </>
          ) : (
            <Typography variant="body2" color="rgba(255,255,255,0.4)">Loading storage info...</Typography>
          )}
        </Box>

        <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            onClick={async () => {
              if (document.fullscreenElement) {
                await document.exitFullscreen();
              }
              await clearPresentation();
              setOpen(false);
            }}
            sx={{ height: 48 }}
          >
            Load New Presentation
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => {
              dispatch({ type: 'SET_ERROR', message: 'User requested reset' });
              window.location.reload();
            }}
            sx={{ 
              borderColor: 'rgba(255,255,255,0.2)', 
              color: 'rgba(255,255,255,0.6)',
              height: 48 
            }}
          >
            Reload Player
          </Button>
        </Box>
      </Drawer>
    </>
  );
}
