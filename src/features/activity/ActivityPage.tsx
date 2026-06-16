import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { Box, CardActionArea, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { componentBorderRadius, borderWidth, iconSize, cardActionHeight, spacingScale, spacingFractional, cardBackgrounds } from '../../design-system/tokens';
import { PageHeader } from '../../components/PageHeader';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAppState } from '../../storage/localStore';
import { activePharmacien } from '../../storage/selectors';

export function ActivityPage() {
  const state = useAppState();
  const navigate = useNavigate();
  const pharmacien = activePharmacien(state);

  return (
    <Stack spacing={spacingScale.xl} sx={{ width: 'min(1160px, 100%)', mx: 'auto' }}>
      <PageHeader
        eyebrow="Accueil"
        title={pharmacien ? `Bonjour ${pharmacien.nom.split(' ')[0]}` : 'Bonjour'}
        actions={
          <Tooltip title="Options">
            <IconButton
              color="primary"
              size="large"
              aria-label="Options"
              data-testid="activity-options-icon"
              onClick={() => navigate('/options')}
              sx={{
                border: `${borderWidth.thin}px solid`,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <SettingsRoundedIcon />
            </IconButton>
          </Tooltip>
        }
      />

      <Stack spacing={spacingScale.md}>
        <Typography variant="h4">Travailler</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' }, gap: spacingScale.md }}>
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

      <Stack spacing={spacingScale.md}>
        <Typography variant="h4">Gérer</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: spacingScale.md }}>
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
    <SurfaceCard data-testid={testId} sx={{ height: '100%' }}>
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <Stack spacing={spacingFractional['2.5']} sx={{ minHeight: emphasized ? cardActionHeight.lg + 32 : cardActionHeight.md, p: { xs: spacingScale.md, md: spacingFractional['3.5'] } }}>
          <Stack direction="row" spacing={spacingScale.sm} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Stack
              sx={{
                width: iconSize.md,
                height: iconSize.md,
                borderRadius: componentBorderRadius.sm,
                bgcolor: emphasized ? 'primary.main' : cardBackgrounds.secondary,
                color: emphasized ? 'primary.contrastText' : 'text.primary',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Stack>
            {badge ? <Chip label={badge} size="small" /> : null}
          </Stack>
          <Stack spacing={spacingScale.sm}>
            <Typography variant="h5">{title}</Typography>
            <Typography color="text.secondary">{description}</Typography>
          </Stack>
        </Stack>
      </CardActionArea>
    </SurfaceCard>
  );
}
