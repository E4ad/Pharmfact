import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Box, CardActionArea, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { componentBorderRadius, borderRadiusScale, borderWidth, iconSize, spacingScale, spacingFractional, cardBackgrounds, brandColors, homePageTokens } from '../../design-system/tokens';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAppState } from '../../storage/localStore';
import { activePharmacien } from '../../storage/selectors';

export function ActivityPage() {
  const state = useAppState();
  const navigate = useNavigate();
  const pharmacien = activePharmacien(state);

  return (
    <Stack spacing={spacingScale.lg} sx={{ 
      width: 'min(1120px, 100%)', 
      mx: 'auto', 
      px: { xs: spacingScale.md, md: spacingScale.xl },
      py: { xs: spacingScale.md, md: spacingScale.xl },
    }}>
      {/* Hero Header - Compact with gradient, no pill effect */}
      <Box
        component="header"
        sx={(theme) => ({
          position: 'relative',
          overflow: 'hidden',
          borderRadius: borderRadiusScale.xl,
          height: { xs: homePageTokens.heroHeight.mobile, md: homePageTokens.heroHeight.desktop },
          px: spacingScale.lg,
          py: spacingScale.lg,
          color: 'common.white',
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${brandColors.primary[950]} 0%, ${brandColors.primary[800]} 100%)`
            : `linear-gradient(135deg, ${brandColors.primary[600]} 0%, ${brandColors.primary[800]} 100%)`,
          boxShadow: theme.palette.mode === 'dark'
            ? `0 16px 48px rgba(0, 0, 0, 0.4)`
            : `0 16px 48px rgba(37, 99, 235, 0.22)`,
        })}
        data-testid="activity-hero-header"
      >
        <Stack spacing={spacingScale.sm} sx={{ height: '100%', justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Stack spacing={spacingFractional['0.5']}>
              <Typography
                variant="overline"
                sx={(theme) => ({
                  color: theme.palette.common.white,
                  opacity: 0.78,
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                })}
              >
                Accueil
              </Typography>
              <Typography 
                variant="h1" 
                sx={{ 
                  color: 'inherit', 
                  fontWeight: 850, 
                  letterSpacing: '-0.04em',
                  fontSize: { xs: '1.75rem', md: '2.25rem' },
                }}
              >
                {pharmacien ? `Bonjour ${pharmacien.nom.split(' ')[0]}` : 'Bonjour'}
              </Typography>
              <Typography 
                variant="body1"
                sx={(theme) => ({
                  color: theme.palette.common.white,
                  opacity: 0.86,
                  maxWidth: 560,
                  fontSize: { xs: '0.875rem', md: '1rem' },
                })}
              >
                Préparez vos missions, factures et suivis financiers.
              </Typography>
            </Stack>
            <Tooltip title="Options">
              <IconButton
                color="inherit"
                size="medium"
                aria-label="Options"
                data-testid="activity-options-icon"
                onClick={() => navigate('/options')}
                sx={(theme) => ({
                  border: `${borderWidth.thin}px solid`,
                  borderColor: theme.palette.common.white,
                  opacity: 0.8,
                  bgcolor: 'transparent',
                  '&:hover': { 
                    bgcolor: theme.palette.common.white,
                    opacity: 0.12,
                    color: brandColors.primary[600],
                  },
                })}
              >
                <SettingsRoundedIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Stack>
      </Box>

      {/* Work Section */}
      <Stack spacing={spacingScale.sm}>
        <Typography variant="h2" sx={{ fontWeight: 600, letterSpacing: '-0.03em' }}>
          Travailler
        </Typography>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, 
          gap: spacingScale.md 
        }}>
          <HomeActionCard
            data-testid="activity-card-new-mission"
            title="Créer une mission"
            description="Saisir les heures, frais et paramètres de facturation."
            icon={<AssignmentRoundedIcon />}
            onClick={() => navigate('/mission/new')}
            emphasized
          />
          <HomeActionCard
            data-testid="activity-card-missions"
            title="Suivi des missions"
            description="Consulter les missions, ouvrir le détail, générer une facture ou télécharger le PDF."
            icon={<FactCheckRoundedIcon />}
            badge={`${state.missions.length} au total`}
            onClick={() => navigate('/missions')}
          />
        </Box>
      </Stack>

      {/* Manage Section */}
      <Stack spacing={spacingScale.sm}>
        <Typography variant="h2" sx={{ fontWeight: 600, letterSpacing: '-0.03em' }}>
          Gérer
        </Typography>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, 
          gap: spacingScale.md 
        }}>
          <HomeActionCard
            data-testid="activity-card-financial"
            title="État financier"
            description="Lire les revenus, taxes, acomptes et dépenses déductibles."
            icon={<QueryStatsRoundedIcon />}
            badge="Synthèse"
            onClick={() => navigate('/financial')}
          />
          <HomeActionCard
            data-testid="activity-card-pharmacy"
            title="Ajouter une pharmacie"
            description="Créer une fiche lieu pour accélérer les prochaines missions."
            icon={<LocalHospitalRoundedIcon />}
            onClick={() => navigate('/pharmacy/add')}
          />
        </Box>
      </Stack>
    </Stack>
  );
}

function HomeActionCard({
  title,
  description,
  icon,
  badge,
  emphasized = false,
  onClick,
  'data-testid': testId,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  badge?: string;
  emphasized?: boolean;
  onClick: () => void;
  'data-testid'?: string;
}) {
  return (
    <SurfaceCard 
      data-testid={testId} 
      sx={{ height: '100%' }}
    >
      <CardActionArea 
        onClick={onClick} 
        sx={{
          height: '100%',
          p: { xs: spacingScale.md, md: spacingScale.lg },
          // Ensure full clickable area
          '&:focus': {
            outline: `${borderWidth.thin}px solid`,
            outlineColor: emphasized ? 'primary.main' : 'divider',
            outlineOffset: 2,
          },
        }}
      >
        <Stack spacing={spacingScale.md} sx={{ 
          height: '100%',
          minHeight: { xs: homePageTokens.actionCardHeight.mobile, md: homePageTokens.actionCardHeight.desktop },
          alignItems: 'flex-start',
        }}>
          {/* Header: Icon + Badge + Arrow */}
          <Stack 
            direction="row" 
            spacing={spacingScale.sm}
            sx={{ 
              width: '100%',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <Stack
              aria-hidden="true"
              sx={{
                width: iconSize.md,
                height: iconSize.md,
                borderRadius: componentBorderRadius.card,
                bgcolor: emphasized 
                  ? (theme) => theme.palette.primary.main 
                  : cardBackgrounds.secondary,
                color: emphasized 
                  ? (theme) => theme.palette.primary.contrastText 
                  : 'text.primary',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </Stack>
            
            {badge ? (
              <Chip 
                label={badge} 
                size="small" 
                sx={{
                  bgcolor: emphasized 
                    ? (theme) => theme.palette.primary.main 
                    : cardBackgrounds.secondary,
                  color: emphasized 
                    ? (theme) => theme.palette.primary.contrastText 
                    : 'text.secondary',
                }}
              />
            ) : null}
            
            {/* Affordance visual - arrow icon */}
            <ArrowForwardRoundedIcon 
              sx={{
                color: 'text.disabled',
                fontSize: iconSize.sm,
                opacity: 0.6,
              }}
            />
          </Stack>
          
          {/* Content: Title + Description */}
          <Stack spacing={spacingScale.sm} sx={{ 
            alignItems: 'flex-start',
            width: '100%',
          }}>
            <Typography 
              variant="h5"
              sx={{
                fontWeight: 600,
                letterSpacing: '-0.02em',
                // Ensure text doesn't wrap awkwardly
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="body2"
              color="text.secondary"
              sx={{
                maxWidth: 340,
                lineHeight: 1.5,
                // Prevent word-by-word wrapping
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
              }}
            >
              {description}
            </Typography>
          </Stack>
        </Stack>
      </CardActionArea>
    </SurfaceCard>
  );
}
