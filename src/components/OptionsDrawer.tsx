import { Drawer, Box, Typography, IconButton, Divider, Stack } from '@mui/material';
import { CloseRounded } from '@mui/icons-material';
import { type ReactNode } from 'react';

interface OptionsDrawerProps {
  /** Ouvert ? */
  open: boolean;
  /** Callback à la fermeture */
  onClose: () => void;
  /** Titre du drawer */
  title: string;
  /** Contenu du drawer */
  children: ReactNode;
  /** Largeur du drawer (default: 400px sur desktop, 100% sur mobile) */
  width?: number | string;
  /** Boutons d'action (ex: [Annuler, Enregistrer]) */
  actions?: ReactNode;
  /** Test ID */
  'data-testid'?: string;
}

/**
 * Drawer de configuration pour la page Options
 * 
 * @example
 * ```tsx
 * <OptionsDrawer
 *   open={openDrawer === 'financial'}
 *   onClose={() => setOpenDrawer(null)}
 *   title="Financier & fiscalité"
 *   actions={
 *     <>
 *       <Button variant="outlined" onClick={handleCancel}>Annuler</Button>
 *       <Button variant="contained" onClick={handleSave}>Enregistrer</Button>
 *     </>
 *   }
 * >
 *   <FinancialSettingsForm />
 * </OptionsDrawer>
 * ```
 */
export function OptionsDrawer({
  open,
  onClose,
  title,
  children,
  width = { sm: 400, md: 500 },
  actions,
  'data-testid': testId,
}: OptionsDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: width,
          maxWidth: '100vw',
        },
        'data-testid': testId,
      }}
      ModalProps={{
        keepMounted: true, // Évite le démontage/remontage
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
      }}>
        {/* En-tête */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <IconButton 
            onClick={onClose}
            aria-label="Fermer"
            sx={{ p: 0.5 }}
            size="small"
          >
            <CloseRounded fontSize="small" />
          </IconButton>
        </Box>
        
        {/* Contenu */}
        <Box sx={{ 
          p: 2,
          flexGrow: 1,
          overflow: 'auto',
        }}>
          {children}
        </Box>
        
        {/* Actions */}
        {actions && (
          <>
            <Divider />
            <Box sx={{ 
              p: 2,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1,
            }}>
              <Stack direction="row" spacing={1}>
                {actions}
              </Stack>
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}
