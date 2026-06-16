import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { CardActionArea, Stack, Typography, Box, type SxProps, type Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { componentBorderRadius, iconSize, cardActionHeight, spacingFractional, spacingScale, typographyScale, dashboardTokens, homePageTokens } from '../design-system/tokens';
import { SurfaceCard } from './SurfaceCard';

type IconTone = 'green' | 'blue' | 'amber' | 'purple' | 'red' | 'gray';

interface OptionActionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  iconTone?: IconTone;
  onClick: () => void;
  'data-testid'?: string;
}

const toneStyles: Record<IconTone, SxProps<Theme>> = {
  green: (theme) => ({
    bgcolor: alpha(theme.palette.success.main, 0.1),
    color: theme.palette.success.main,
    borderColor: alpha(theme.palette.success.main, 0.18),
  }),
  blue: (theme) => ({
    bgcolor: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
    borderColor: alpha(theme.palette.primary.main, 0.18),
  }),
  amber: (theme) => ({
    bgcolor: alpha(theme.palette.warning.main, 0.12),
    color: theme.palette.warning.main,
    borderColor: alpha(theme.palette.warning.main, 0.2),
  }),
  purple: (theme) => ({
    bgcolor: alpha(theme.palette.info.main, 0.1),
    color: theme.palette.info.main,
    borderColor: alpha(theme.palette.info.main, 0.18),
  }),
  red: (theme) => ({
    bgcolor: alpha(theme.palette.error.main, 0.1),
    color: theme.palette.error.main,
    borderColor: alpha(theme.palette.error.main, 0.18),
  }),
  gray: (theme) => ({
    bgcolor: alpha(theme.palette.text.secondary, 0.08),
    color: theme.palette.text.secondary,
    borderColor: alpha(theme.palette.text.secondary, 0.16),
  }),
};

export function OptionActionCard({
  title,
  description,
  icon,
  iconTone = 'blue',
  onClick,
  'data-testid': testId,
}: OptionActionCardProps) {
  return (
    <SurfaceCard data-testid={testId} flush>
      <CardActionArea 
        onClick={onClick} 
        sx={{
          height: '100%', 
          p: { xs: spacingScale.md, md: spacingScale.lg },
          minHeight: { xs: dashboardTokens.card.height.sm, md: dashboardTokens.card.height.sm },
          // Focus visible for accessibility
          '&:focus': {
            outline: `${1}px solid`,
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        <Stack spacing={spacingScale.md} sx={{ 
          height: '100%',
          alignItems: 'flex-start',
        }}>
          {/* Header: Icon + Arrow */}
          <Stack 
            direction="row" 
            spacing={spacingScale.sm}
            sx={{ 
              width: '100%',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                width: iconSize.md,
                height: iconSize.md,
                borderRadius: componentBorderRadius.card,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '& svg': { fontSize: typographyScale.base },
                ...toneStyles[iconTone],
              }}
            >
              {icon}
            </Box>
            
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
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                letterSpacing: '-0.02em',
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
                maxWidth: 280,
                lineHeight: 1.5,
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
