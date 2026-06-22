import React from 'react';
import {
  Box,
  Button,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  Stack,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useTheme,
  type SxProps,
  type Theme,
} from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { useEffect, useMemo, useState } from 'react';
import { defaultRuntimeDesignTokenOverrides, normalizeRuntimeDesignTokenOverrides, type RuntimeDesignTokenOverrides, type RuntimeShadowIntensity } from '../design-system/runtimeTokens';
import { spacingScale } from '../design-system/tokens';
import { useNotifications } from './NotificationSystem';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAppState, setAppState } from '../storage/localStore';
import { selectUiOptions } from '../storage/selectors';
import type { ThemeMode } from '../types/common';

const radiusLimits = {
  surfaceRadius: { min: 0, max: 24 },
  controlRadius: { min: 0, max: 12 },
  iconRadius: { min: 0, max: 12 },
};

const tokenLimits = {
  borderWidth: { min: 0, max: 2 },
  primaryHue: { min: 0, max: 359 },
};

type RuntimeRadiusKey = 'surfaceRadius' | 'controlRadius' | 'iconRadius';

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampRadius(value: number, key: RuntimeRadiusKey) {
  const limit = radiusLimits[key];
  return clampNumber(value, limit.min, limit.max);
}

function getDraftTokens(uiSettings: ReturnType<typeof selectUiOptions>) {
  return normalizeRuntimeDesignTokenOverrides(uiSettings.designTokenOverrides);
}

function getDraftMode(uiSettings: ReturnType<typeof selectUiOptions>) {
  return uiSettings.themeMode ?? 'system';
}

function RadiusSlider({
  label,
  value,
  limit,
  onChange,
}: {
  label: string;
  value: number;
  limit: { min: number; max: number };
  onChange: (value: number) => void;
}) {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {value}px
        </Typography>
      </Stack>
      <Slider
        value={value}
        min={limit.min}
        max={limit.max}
        step={1}
        valueLabelDisplay="auto"
        onChange={(_, nextValue) => onChange(Number(Array.isArray(nextValue) ? nextValue[0] : nextValue))}
      />
    </Stack>
  );
}

function BorderWidthSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const theme = useTheme();

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Épaisseur des bordures
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {value}px
        </Typography>
      </Stack>
      <Slider
        value={value}
        min={tokenLimits.borderWidth.min}
        max={tokenLimits.borderWidth.max}
        step={0.5}
        valueLabelDisplay="auto"
        onChange={(_, nextValue) => onChange(Number(Array.isArray(nextValue) ? nextValue[0] : nextValue))}
        sx={{
          '& .MuiSlider-thumb': {
            width: 18,
            height: 18,
            border: `${theme.runtimeTokens.borderWidth}px solid ${theme.palette.background.paper}`,
          },
        }}
      />
      <Typography variant="caption" color="text.secondary">
        Inputs, boutons, cartes et tiroirs. Limité de 0 à 2px.
      </Typography>
    </Stack>
  );
}

function PrimaryHueSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Teinte de la couleur primaire
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {value}°
        </Typography>
      </Stack>
      <Slider
        value={value}
        min={tokenLimits.primaryHue.min}
        max={tokenLimits.primaryHue.max}
        step={1}
        valueLabelDisplay="auto"
        valueLabelFormat={(nextValue) => `${nextValue}°`}
        onChange={(_, nextValue) => onChange(Number(Array.isArray(nextValue) ? nextValue[0] : nextValue))}
      />
      <Typography variant="caption" color="text.secondary">
        Change l’accent de l’application sans toucher aux factures ou au PDF.
      </Typography>
    </Stack>
  );
}

function TokenMetric({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <Typography
      variant="caption"
      sx={{
        borderRadius: theme.runtimeTokens.controlRadius,
        bgcolor: alpha(theme.palette.divider, 0.14),
        px: spacingScale.xs,
        py: spacingScale.xs,
        fontWeight: 700,
      }}
    >
      {label}: {value}
    </Typography>
  );
}

export function ThemeToolbar() {
  if (!import.meta.env.DEV) return null;
  const {
    previewDesignTokenOverrides,
    setPreviewDesignTokenOverrides,
    setPreviewThemeMode,
    setRuntimeDesignTokenOverrides,
    setMode,
    clearPreviewTheme,
  } = useThemeContext();
  const state = useAppState();
  const uiSettings = selectUiOptions(state);
  const theme = useTheme();
  const { notify } = useNotifications();
  const [open, setOpen] = useState(false);

  const initialDraft = useMemo(
    () => ({
      mode: getDraftMode(uiSettings),
      tokens: getDraftTokens(uiSettings),
    }),
    [uiSettings],
  );

  const [draftMode, setDraftMode] = useState<ThemeMode>(initialDraft.mode);
  const [draftTokens, setDraftTokens] = useState<RuntimeDesignTokenOverrides>(initialDraft.tokens);

  useEffect(() => {
    if (open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftMode(initialDraft.mode);
    setDraftTokens(initialDraft.tokens);
  }, [initialDraft, open]);

  const previewTokens = useMemo(
    () => normalizeRuntimeDesignTokenOverrides(previewDesignTokenOverrides ?? uiSettings.designTokenOverrides),
    [previewDesignTokenOverrides, uiSettings],
  );

  const persistedTokens = useMemo(() => getDraftTokens(uiSettings), [uiSettings]);
  const hasChanges = draftMode !== initialDraft.mode || JSON.stringify(normalizeRuntimeDesignTokenOverrides(draftTokens)) !== JSON.stringify(persistedTokens);
  const previewPrimary = previewTokens.primary[theme.palette.mode];

  const syncPreview = (tokens: RuntimeDesignTokenOverrides = draftTokens, mode: ThemeMode = draftMode) => {
    setPreviewThemeMode(mode);
    setPreviewDesignTokenOverrides(tokens);
  };

  const updateRadius = (key: RuntimeRadiusKey, value: string) => {
    const parsed = Number(value);
    setDraftTokens((current) => {
      const next = normalizeRuntimeDesignTokenOverrides({
        ...current,
        [key]: Number.isFinite(parsed) ? clampRadius(parsed, key) : current[key],
      });
      syncPreview(next, draftMode);
      return next;
    });
  };

  const updateBorderWidth = (value: string) => {
    const parsed = Number(value);
    setDraftTokens((current) => {
      const next = normalizeRuntimeDesignTokenOverrides({
        ...current,
        borderWidth: Number.isFinite(parsed) ? clampNumber(parsed, tokenLimits.borderWidth.min, tokenLimits.borderWidth.max) : current.borderWidth,
      });
      syncPreview(next, draftMode);
      return next;
    });
  };

  const updatePrimaryHue = (value: string) => {
    const parsed = Number(value);
    setDraftTokens((current) => {
      const next = normalizeRuntimeDesignTokenOverrides({
        ...current,
        primaryHue: Number.isFinite(parsed) ? clampNumber(parsed, tokenLimits.primaryHue.min, tokenLimits.primaryHue.max) : current.primaryHue,
      });
      syncPreview(next, draftMode);
      return next;
    });
  };

  const updateShadowIntensity = (value: RuntimeShadowIntensity | null) => {
    if (!value) return;
    setDraftTokens((current) => {
      const next = normalizeRuntimeDesignTokenOverrides({
        ...current,
        shadowIntensity: value,
      });
      syncPreview(next, draftMode);
      return next;
    });
  };

  const applyPreview = () => {
    const tokens = normalizeRuntimeDesignTokenOverrides(draftTokens);
    // Update both tokens and mode in a single state update to avoid race conditions
    setAppState({
      ...state,
      uiSettings: {
        ...uiSettings,
        themeMode: draftMode,
        designTokenOverrides: tokens,
      },
      ui: {
        ...state.ui,
        lastVisitedAt: new Date().toISOString(),
      },
    });
    clearPreviewTheme();
    setOpen(false);
    notify({ severity: 'success', message: 'Thème UX appliqué.' });
  };

  const cancelPreview = () => {
    clearPreviewTheme();
    setOpen(false);
    setDraftMode(initialDraft.mode);
    setDraftTokens(initialDraft.tokens);
  };

  const resetDraft = () => {
    setDraftMode('system');
    setDraftTokens(defaultRuntimeDesignTokenOverrides);
    syncPreview(defaultRuntimeDesignTokenOverrides, 'system');
  };

  const startPreview = () => {
    setPreviewThemeMode(draftMode);
    setPreviewDesignTokenOverrides(draftTokens);
    setOpen(true);
  };

  return (
    <Box className="theme-toolbar" sx={toolbarSx}>
      <Tooltip title={open ? 'Réduire le tiroir tokens UX' : 'Ouvrir le tiroir tokens UX'}>
        <IconButton
          aria-controls={open ? 'theme-token-drawer' : undefined}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={open ? 'Réduire le tiroir tokens UX' : 'Ouvrir le tiroir tokens UX'}
          color="primary"
          onClick={() => (open ? cancelPreview() : startPreview())}
          sx={(theme) => ({
            position: 'fixed',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 48,
            height: 96,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            borderRadius: `${theme.runtimeTokens.controlRadius}px 0 0 ${theme.runtimeTokens.controlRadius}px`,
            borderLeft: `${theme.runtimeTokens.borderWidth}px solid ${alpha(theme.palette.divider, 0.28)}`,
            boxShadow: theme.runtimeTokens.shadows.modal[theme.palette.mode === 'dark' ? 'dark' : 'light'],
            zIndex: 1402,
            '@media print': { display: 'none !important' },
          })}
        >
          {open ? <ChevronRightRoundedIcon /> : <ChevronLeftRoundedIcon />}
        </IconButton>
      </Tooltip>

      <Drawer
        id="theme-token-drawer"
        anchor="right"
        open={open}
        variant="temporary"
        onClose={cancelPreview}
        role="dialog"
        aria-labelledby="theme-token-drawer-title"
        slotProps={{
          paper: {
            sx: (theme) => ({
              width: { xs: 'min(420px, 100vw)', md: 420 },
              height: '100%',
              borderLeft: `${theme.runtimeTokens.borderWidth}px solid ${alpha(theme.palette.divider, 0.2)}`,
              borderTopLeftRadius: theme.runtimeTokens.surfaceRadius,
              borderBottomLeftRadius: theme.runtimeTokens.surfaceRadius,
              boxShadow: theme.runtimeTokens.shadows.modal[theme.palette.mode === 'dark' ? 'dark' : 'light'],
              p: spacingScale.md,
              overflowY: 'auto',
              '@media print': { display: 'none !important' },
            }),
          },
        }}
      >
        <Stack spacing={spacingScale.md}>
          <Stack direction="row" spacing={spacingScale.sm} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack spacing={0.25}>
              <Typography id="theme-token-drawer-title" variant="overline" sx={{ fontWeight: 800, letterSpacing: '0.12em' }}>
                Tokens UX
              </Typography>
              <Typography variant="h6" sx={{ fontSize: '1rem', lineHeight: 1.2 }}>
                Tiroir d’apparence live
              </Typography>
            </Stack>
            <IconButton aria-label="Fermer le tiroir tokens UX" onClick={cancelPreview} size="small">
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>

          <FormControl fullWidth>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Mode
            </Typography>
            <ToggleButtonGroup
              value={draftMode}
              exclusive
              fullWidth
              size="small"
              onChange={(_, value: ThemeMode | null) => {
                if (!value) return;
                setDraftMode(value);
                syncPreview(draftTokens, value);
              }}
              sx={{ '& .MuiToggleButton-root': { textTransform: 'none' } }}
            >
              <ToggleButton value="system">Système</ToggleButton>
              <ToggleButton value="light">Clair</ToggleButton>
              <ToggleButton value="dark">Sombre</ToggleButton>
            </ToggleButtonGroup>
          </FormControl>

          <Stack spacing={spacingScale.md}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Rayons à glisser
            </Typography>
            <RadiusSlider
              label="Surfaces"
              value={draftTokens.surfaceRadius ?? defaultRuntimeDesignTokenOverrides.surfaceRadius}
              limit={radiusLimits.surfaceRadius}
              onChange={(value) => updateRadius('surfaceRadius', String(value))}
            />
            <RadiusSlider
              label="Contrôles"
              value={draftTokens.controlRadius ?? defaultRuntimeDesignTokenOverrides.controlRadius}
              limit={radiusLimits.controlRadius}
              onChange={(value) => updateRadius('controlRadius', String(value))}
            />
            <RadiusSlider
              label="Icônes"
              value={draftTokens.iconRadius ?? defaultRuntimeDesignTokenOverrides.iconRadius}
              limit={radiusLimits.iconRadius}
              onChange={(value) => updateRadius('iconRadius', String(value))}
            />
          </Stack>

          <Stack spacing={spacingScale.md}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Autres tokens
            </Typography>
            <BorderWidthSlider
              value={draftTokens.borderWidth ?? defaultRuntimeDesignTokenOverrides.borderWidth}
              onChange={(value) => updateBorderWidth(String(value))}
            />
            <PrimaryHueSlider
              value={draftTokens.primaryHue ?? defaultRuntimeDesignTokenOverrides.primaryHue}
              onChange={(value) => updatePrimaryHue(String(value))}
            />
          </Stack>

          <FormControl>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Ombres
            </Typography>
            <ToggleButtonGroup
              value={draftTokens.shadowIntensity ?? defaultRuntimeDesignTokenOverrides.shadowIntensity}
              exclusive
              size="small"
              onChange={(_, value: RuntimeShadowIntensity | null) => updateShadowIntensity(value)}
              sx={{ '& .MuiToggleButton-root': { textTransform: 'none' } }}
            >
              <ToggleButton value="none">Aucune</ToggleButton>
              <ToggleButton value="soft">Douce</ToggleButton>
              <ToggleButton value="elevated">Élevée</ToggleButton>
            </ToggleButtonGroup>
          </FormControl>

          <Box
            sx={{
              border: `${previewTokens.borderWidth}px solid ${alpha(theme.palette.divider, 0.24)}`,
              borderRadius: previewTokens.surfaceRadius,
              bgcolor: alpha(previewPrimary.main, theme.palette.mode === 'dark' ? 0.14 : 0.08),
              boxShadow: previewTokens.shadows.card[theme.palette.mode === 'dark' ? 'dark' : 'light'],
              p: spacingScale.md,
            }}
          >
            <Stack spacing={spacingScale.md}>
              <Stack direction="row" spacing={spacingScale.sm} sx={{ alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: previewTokens.iconRadius,
                    bgcolor: previewPrimary.main,
                    display: 'grid',
                    placeItems: 'center',
                    color: previewPrimary.contrastText,
                  }}
                >
                  <TuneRoundedIcon fontSize="small" />
                </Box>
                <Stack spacing={0.1}>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    Aperçu
                  </Typography>
                  <Typography variant="caption">
                    Les factures et PDF restent inchangés.
                  </Typography>
                </Stack>
              </Stack>

              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                <TokenMetric label="surface" value={`${previewTokens.surfaceRadius}px`} />
                <TokenMetric label="contrôle" value={`${previewTokens.controlRadius}px`} />
                <TokenMetric label="icône" value={`${previewTokens.iconRadius}px`} />
                <TokenMetric label="bordure" value={`${previewTokens.borderWidth}px`} />
                <TokenMetric label="teinte" value={`${previewTokens.primaryHue}°`} />
                <TokenMetric label="ombre" value={previewTokens.shadowIntensity} />
              </Stack>
            </Stack>
          </Box>

          <Divider />

          <Stack direction="row" spacing={spacingScale.sm} sx={{ justifyContent: 'space-between' }}>
            <Button
              color="inherit"
              onClick={resetDraft}
              startIcon={<RestartAltRoundedIcon />}
              sx={{ textTransform: 'none' }}
            >
              Réinitialiser
            </Button>
            <Stack direction="row" spacing={spacingScale.sm}>
              <Button
                color="inherit"
                onClick={cancelPreview}
                startIcon={<CloseRoundedIcon />}
                sx={{ textTransform: 'none' }}
              >
                Annuler
              </Button>
              <Button
                color="primary"
                disabled={!hasChanges}
                onClick={applyPreview}
                startIcon={<CheckRoundedIcon />}
                sx={{ textTransform: 'none' }}
              >
                Appliquer
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Drawer>


    </Box>
  );
}

const toolbarSx: SxProps<Theme> = {
  '@media print': { display: 'none !important' },
};
