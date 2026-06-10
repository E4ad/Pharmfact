import { Card, CardContent, Typography, Box, IconButton } from '@mui/material';
import { type ReactNode } from 'react';

interface OptionsTileProps {
  /** Icône à afficher (composant MUI Icon) */
  icon: ReactNode;
  /** Titre de la tuile */
  title: string;
  /** Description courte */
  description: string;
  /** Valeur résumée optionnelle (ex: "Clair") */
  value?: string | number;
  /** Callback au clic */
  onClick: () => void;
  /** Désactivé ? */
  disabled?: boolean;
  /** Test ID pour les tests */
  'data-testid'?: string;
}

/**
 * Tuile de configuration pour la page Options
 * 
 * @example
 * ```tsx
 * <OptionsTile
 *   icon={<SettingsRoundedIcon />}
 *   title="Financier & fiscalité"
 *   description="Réserve fiscale, acomptes et seuils."
 *   value="Configuré"
 *   onClick={() => setOpenDrawer('financial')}
 *   data-testid="options-tile-financial"
 * />
 * ```
 */
export function OptionsTile({
  icon,
  title,
  description,
  value,
  onClick,
  disabled = false,
  'data-testid': testId,
}: OptionsTileProps) {
  return (
    <Card
      onClick={!disabled ? onClick : undefined}
      sx={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
        opacity: disabled ? 0.6 : 1,
        '&:hover': {
          transform: disabled ? 'none' : 'translateY(-2px)',
          boxShadow: disabled ? 'none' : '0 12px 32px rgba(0, 0, 0, 0.12)',
        },
      }}
      data-testid={testId}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: 'action.selected',
            flexShrink: 0,
          }}>
            {icon}
          </Box>
          
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography 
              variant="subtitle1" 
              component="h3"
              sx={{ 
                fontWeight: 600, 
                mb: 0.5,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </Typography>
            
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                mb: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {description}
            </Typography>
            
            {value && (
              <Typography 
                variant="body2" 
                color="primary"
                sx={{ 
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {value}
              </Typography>
            )}
          </Box>
          
          {!disabled && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              sx={{ 
                p: 0.5,
                ml: 1,
                opacity: 0.7,
                transition: 'opacity 0.2s',
                '&:hover': { opacity: 1 },
              }}
              size="small"
              aria-label={`Ouvrir ${title}`}
            >
              →
            </IconButton>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
