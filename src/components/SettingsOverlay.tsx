import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Alert,
  Snackbar,
} from '@mui/material';
import { Settings as SettingsIcon, Close as CloseIcon, Info as InfoIcon, Upload as UploadIcon, Delete as DeleteIcon, Monitor as MonitorIcon } from '@mui/icons-material';
import { usePlayback } from '../store/PlaybackContext';
import { useAnimation } from '../store/AnimationContext';
import { db, type OverlayPreset, type TransitionType, type CustomOverlay } from '../store/db';
import { PRESET_META } from './overlays';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

interface SettingsOverlayProps {
  onEnterKiosk?: () => void;
}

export function SettingsOverlay({ onEnterKiosk }: SettingsOverlayProps) {
  const [open, setOpen] = useState(false);
  const { state, dispatch, clearPresentation } = usePlayback();
  const { state: animState, dispatch: animDispatch } = useAnimation();
  const [storageUsage, setStorageUsage] = useState<{ used: string; quota: string; percent: number } | null>(null);
  const [customOverlays, setCustomOverlays] = useState<CustomOverlay[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const loadCustomOverlays = useCallback(() => {
    db.overlays.toArray().then(setCustomOverlays).catch(console.error);
  }, []);

  useEffect(() => {
    if (open) loadCustomOverlays();
  }, [open, loadCustomOverlays]);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  const isFullscreen = !!document.fullscreenElement;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File too large. Maximum size is 2MB.');
      e.target.value = '';
      return;
    }

    try {
      const estimate = await navigator.storage.estimate();
      const available = (estimate.quota ?? 0) - (estimate.usage ?? 0);
      if (available < file.size) {
        setUploadError('Insufficient storage space.');
        e.target.value = '';
        return;
      }
    } catch {
      // If estimate fails, proceed with upload
    }

    const mimeType = file.type || 'application/octet-stream';
    const blob = new Blob([await file.arrayBuffer()], { type: mimeType });

    await db.overlays.add({
      name: file.name,
      blob,
      mimeType,
      createdAt: Date.now(),
    });

    loadCustomOverlays();
    e.target.value = '';
  };

  const handleDeleteOverlay = async (id: number) => {
    const presetStr = `custom:${id}` as OverlayPreset;
    if (animState.overlayPreset === presetStr) {
      animDispatch({ type: 'SET_OVERLAY_PRESET', preset: 'none' });
    }
    await db.overlays.delete(id);
    loadCustomOverlays();
  };

  const truncateName = (name: string, maxLen = 20) =>
    name.length > maxLen ? name.slice(0, maxLen - 1) + '…' : name;

  const activePresetKey = (preset: OverlayPreset): string => {
    if (preset === 'none') return 'none';
    if (preset.startsWith('custom:')) return preset;
    return preset;
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            bgcolor: 'rgba(0,0,0,0.5)',
            color: 'white',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            width: 48,
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

        {onEnterKiosk && (
          <Box sx={{ mb: 4 }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              onClick={() => { setOpen(false); onEnterKiosk(); }}
              startIcon={<MonitorIcon />}
              sx={{ height: 56 }}
            >
              Enter Kiosk Mode
            </Button>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'rgba(255,255,255,0.5)', lineHeight: 1.3 }}>
              Hides all controls. Exit via Escape key or 3 taps in top-right corner.
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

        {/* Transition Settings — D1: R1-R4 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Slide Transitions
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.6)' }}>Transition Type</InputLabel>
            <Select
              value={animState.transitionType}
              label="Transition Type"
              onChange={(e) => animDispatch({ type: 'SET_TRANSITION_TYPE', transitionType: e.target.value as TransitionType })}
              aria-label="Transition Type"
              sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="crossfade">Crossfade</MenuItem>
              <MenuItem value="slide">Slide</MenuItem>
              <MenuItem value="wipe">Wipe</MenuItem>
              <MenuItem value="dissolve">Dissolve</MenuItem>
            </Select>
          </FormControl>

          <Box>
            <Typography gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              Duration: <strong>{animState.transitionDuration}ms</strong>
            </Typography>
            <Slider
              value={animState.transitionDuration}
              min={200}
              max={2000}
              step={100}
              onChange={(_, val) => animDispatch({ type: 'SET_TRANSITION_DURATION', transitionDuration: val as number })}
              aria-label="Transition Duration"
            />
          </Box>
        </Box>

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

        {/* Overlay Section — D2/D3/D5: R5-R18 */}
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
              {/* Preset Grid — D2: R5-R8 */}
              <Box
                role="group"
                aria-label="Overlay Presets"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                  gap: 1,
                }}
              >
                {/* None card */}
                <button
                  onClick={() => animDispatch({ type: 'SET_OVERLAY_PRESET', preset: 'none' })}
                  aria-label="None preset"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 44,
                    minHeight: 44,
                    padding: 8,
                    border: activePresetKey(animState.overlayPreset) === 'none'
                      ? '2px solid #90caf9'
                      : '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    background: activePresetKey(animState.overlayPreset) === 'none'
                      ? 'rgba(144,202,249,0.1)'
                      : 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 24 }}>⊘</span>
                  <span style={{ fontSize: 11, marginTop: 4 }}>None</span>
                </button>

                {/* Built-in presets */}
                {(Object.keys(PRESET_META) as Array<keyof typeof PRESET_META>).map((key) => {
                  const meta = PRESET_META[key];
                  const SvgComp = meta.component;
                  const isActive = activePresetKey(animState.overlayPreset) === key;
                  return (
                    <button
                      key={key}
                      onClick={() => animDispatch({ type: 'SET_OVERLAY_PRESET', preset: key })}
                      aria-label={`${meta.label} preset`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 44,
                        minHeight: 44,
                        padding: 8,
                        border: isActive ? '2px solid #90caf9' : '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 8,
                        background: isActive ? 'rgba(144,202,249,0.1)' : 'transparent',
                        color: 'white',
                        cursor: 'pointer',
                      }}
                    >
                      <SvgComp style={{ width: 32, height: 32 }} />
                      <span style={{ fontSize: 11, marginTop: 4 }}>{meta.label}</span>
                    </button>
                  );
                })}

                {/* Custom overlays — D3: R9-R16 */}
                {customOverlays.map((overlay) => {
                  const presetStr = `custom:${overlay.id}` as OverlayPreset;
                  const isActive = animState.overlayPreset === presetStr;
                  return (
                    <CustomOverlayCard
                      key={overlay.id}
                      overlay={overlay}
                      isActive={isActive}
                      onSelect={() => animDispatch({ type: 'SET_OVERLAY_PRESET', preset: presetStr })}
                      onDelete={() => handleDeleteOverlay(overlay.id!)}
                      truncatedName={truncateName(overlay.name)}
                    />
                  );
                })}
              </Box>

              {/* Upload button — D3: R9 */}
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ minWidth: 44, minHeight: 44, borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}
              >
                Upload Overlay
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.gif,.svg"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                aria-label="Upload overlay file"
              />

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

              {/* Speed slider — D5: R17-R18 */}
              <Box>
                <Typography gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Speed: <strong>{animState.overlaySpeed}x</strong>
                </Typography>
                <Slider
                  value={animState.overlaySpeed}
                  min={0.5}
                  max={3.0}
                  step={0.25}
                  onChange={(_, val) => animDispatch({ type: 'SET_OVERLAY_SPEED', speed: val as number })}
                  aria-label="Overlay Speed"
                />
              </Box>

              {/* Frequency slider */}
              <Box sx={{ mt: 2 }}>
                <Typography gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Frequency: <strong>{animState.overlayFrequency} min</strong>
                </Typography>
                <Slider
                  value={animState.overlayFrequency}
                  min={0.5}
                  max={60}
                  step={0.5}
                  onChange={(_, val) => animDispatch({ type: 'SET_OVERLAY_FREQUENCY', frequency: val as number })}
                  aria-label="Overlay Frequency"
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
              height: 48,
            }}
          >
            Reload Player
          </Button>
        </Box>
      </Drawer>

      <Snackbar
        open={!!uploadError}
        autoHideDuration={4000}
        onClose={() => setUploadError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setUploadError(null)}>{uploadError}</Alert>
      </Snackbar>
    </>
  );
}

function CustomOverlayCard({ overlay, isActive, onSelect, onDelete, truncatedName }: {
  overlay: CustomOverlay;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  truncatedName: string;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(overlay.blob);
    setThumbUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [overlay.blob]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onSelect}
        aria-label={`Custom overlay: ${overlay.name}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 44,
          minHeight: 44,
          padding: 8,
          width: '100%',
          border: isActive ? '2px solid #90caf9' : '1px solid rgba(255,255,255,0.2)',
          borderRadius: 8,
          background: isActive ? 'rgba(144,202,249,0.1)' : 'transparent',
          color: 'white',
          cursor: 'pointer',
        }}
      >
        {thumbUrl && (
          <img
            src={thumbUrl}
            alt={overlay.name}
            style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }}
          />
        )}
        <span style={{ fontSize: 11, marginTop: 4 }}>{truncatedName}</span>
      </button>
      <IconButton
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label={`Delete ${overlay.name}`}
        sx={{
          position: 'absolute',
          top: -4,
          right: -4,
          width: 32,
          height: 32,
          minHeight: 32,
          minWidth: 32,
          padding: 0,
          color: 'rgba(255,255,255,0.5)',
          '&:hover': { color: '#ef5350' },
          '.MuiSvgIcon-root': { fontSize: 16 },
        }}
      >
        <DeleteIcon />
      </IconButton>
    </div>
  );
}
