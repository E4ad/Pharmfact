import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LocalPharmacyRoundedIcon from '@mui/icons-material/LocalPharmacyRounded';
import WorkRoundedIcon from '@mui/icons-material/WorkRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { Box, Button, CardActionArea, Stack, Typography, Stepper, Step, StepLabel, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { SurfaceCard } from '../../components/SurfaceCard';
import { updateAppState, useAppState } from '../../storage/localStore';
import { componentBorderRadius } from '../../design-system/tokens';

// Clé pour stocker la progression dans localStorage
const ONBOARDING_PROGRESS_KEY = 'onboarding_progress';

/**
 * Détermine l'étape actuelle du flux onboarding
 * 1: Créer un pharmacien (si aucun pharmacien n'existe)
 * 2: Créer une pharmacie (si pharmacien existe mais pas de pharmacie)
 * 3: Créer une mission (si pharmacien et pharmacie existent mais pas de mission)
 * 4: Tout est configuré
 */
function getCurrentOnboardingStep(state: any): number {
  const hasPharmaciens = state.pharmaciens.length > 0;
  const hasPharmacies = state.pharmacies.length > 0;
  const hasMissions = state.missions.length > 0;
  
  if (!hasPharmaciens) return 1;
  if (!hasPharmacies) return 2;
  if (!hasMissions) return 3;
  return 4; // Tout est configuré
}

/**
 * Vérifie si l'utilisateur a besoin de l'onboarding (éléments manquants)
 */
function needsOnboarding(state: any): boolean {
  return state.pharmaciens.length === 0 || 
         state.pharmacies.length === 0 || 
         state.missions.length === 0;
}

/**
 * Composant pour l'étape 1: Créer un pharmacien
 */
function Step1CreatePharmacien({ onNext }: { onNext: () => void }) {
  return (
    <SurfaceCard contentSx={{ p: 4 }} sx={{ width: "100%" }}>
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <PersonRoundedIcon color="primary" sx={{ fontSize: 60 }} />
        <Typography variant="h4">Créer votre profil pharmacien</Typography>
        <Typography variant="body1" color="text.secondary">
          Commencez par créer votre profil professionnel.
        </Typography>
        <Button 
          variant="contained" 
          size="large" 
          onClick={onNext}
          startIcon={<AddRoundedIcon />}
          sx={{ mt: 2 }}
          data-testid="onboarding-create-pharmacien"
        >
          Créer un pharmacien
        </Button>
      </Stack>
    </SurfaceCard>
  );
}

/**
 * Composant pour l'étape 2: Créer une pharmacie
 */
function Step2CreatePharmacie({ onNext }: { onNext: () => void }) {
  return (
    <SurfaceCard contentSx={{ p: 4 }} sx={{ width: "100%" }}>
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <LocalPharmacyRoundedIcon color="primary" sx={{ fontSize: 60 }} />
        <Typography variant="h4">Ajouter une pharmacie</Typography>
        <Typography variant="body1" color="text.secondary">
          Ajoutez la pharmacie où vous intervenez.
        </Typography>
        <Button 
          variant="contained" 
          size="large" 
          onClick={onNext}
          startIcon={<AddRoundedIcon />}
          sx={{ mt: 2 }}
          data-testid="onboarding-create-pharmacie"
        >
          Ajouter une pharmacie
        </Button>
      </Stack>
    </SurfaceCard>
  );
}

/**
 * Composant pour l'étape 3: Créer une mission
 */
function Step3CreateMission({ onNext }: { onNext: () => void }) {
  return (
    <SurfaceCard contentSx={{ p: 4 }} sx={{ width: "100%" }}>
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <WorkRoundedIcon color="primary" sx={{ fontSize: 60 }} />
        <Typography variant="h4">Créer votre première mission</Typography>
        <Typography variant="body1" color="text.secondary">
          Créez une mission pour commencer à facturer.
        </Typography>
        <Button 
          variant="contained" 
          size="large" 
          onClick={onNext}
          startIcon={<AddRoundedIcon />}
          sx={{ mt: 2 }}
          data-testid="onboarding-create-mission"
        >
          Créer une mission
        </Button>
      </Stack>
    </SurfaceCard>
  );
}

/**
 * Composant pour l'étape 4: Configuration complète
 */
function Step4Complete({ onComplete }: { onComplete: () => void }) {
  return (
    <SurfaceCard contentSx={{ p: 4 }} sx={{ width: "100%" }}>
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <CheckCircleRoundedIcon color="success" sx={{ fontSize: 60 }} />
        <Typography variant="h4">Félicitations !</Typography>
        <Typography variant="body1" color="text.secondary">
          Votre configuration est complète. Vous pouvez maintenant gérer vos missions.
        </Typography>
        <Button 
          variant="contained" 
          size="large" 
          onClick={onComplete}
          sx={{ mt: 2 }}
          data-testid="onboarding-complete"
        >
          Commencer à gérer mes missions
        </Button>
      </Stack>
    </SurfaceCard>
  );
}

/**
 * Composant pour la sélection de profil existant
 */
function ProfileSelection() {
  const state = useAppState();
  const navigate = useNavigate();

  function selectProfile(id: string) {
    updateAppState((current) => ({ ...current, activePharmacienId: id }));
    navigate('/activity');
  }

  return (
    <Box sx={{ minHeight: '72vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
      <Stack spacing={4} sx={{ width: 'min(980px, 100%)', alignItems: 'center' }}>
        <Typography className="welcome-hello" variant="h1">Bonjour</Typography>
        <Stack className="welcome-picker" spacing={4} sx={{ width: '100%', alignItems: 'center' }}>
          <Stack spacing={1} sx={{ textAlign: 'center' }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>Sélection du profil</Typography>
            <Typography variant="h2">Qui êtes-vous ?</Typography>
            <Typography color="text.secondary">Choisissez un profil pour commencer.</Typography>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, width: '100%' }}>
            {state.pharmaciens.map((pharmacien) => (
              <SurfaceCard key={pharmacien.id}>
                <CardActionArea data-testid="user-card" onClick={() => selectProfile(pharmacien.id)} sx={{ p: 3, minHeight: 160 }}>
                  <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
                    <PersonRoundedIcon fontSize="large" />
                    <Typography variant="h5">{pharmacien.nom}</Typography>
                    <Typography color="text.secondary">Entrer avec ce profil</Typography>
                  </Stack>
                </CardActionArea>
              </SurfaceCard>
            ))}
            <SurfaceCard>
              <CardActionArea onClick={() => navigate('/pharmacien/new')} sx={{ p: 3, minHeight: 160 }}>
                <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
                  <AddRoundedIcon fontSize="large" />
                  <Typography variant="h5">Nouveau pharmacien</Typography>
                  <Typography color="text.secondary">Créer un profil et commencer</Typography>
                </Stack>
              </CardActionArea>
            </SurfaceCard>
          </Box>
          {!state.pharmaciens.length ? (
            <Button variant="contained" size="large" onClick={() => navigate('/pharmacien/new')} data-testid="create-pharmacien-cta">
              Créer mon profil pharmacien
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}

export function OnboardingPage() {
  const state = useAppState();
  const navigate = useNavigate();
  
  // Vérifier si on est explicitement dans le flux onboarding (via localStorage)
  const onboardingFlag = localStorage.getItem('in_onboarding_flow');
  const inOnboardingFlow = onboardingFlag === 'true';
  
  // Démarrer le flag d'onboarding si on a des éléments manquants et pas de flag
  // Cela permet d'activer automatiquement l'onboarding pour les nouveaux utilisateurs
  if (needsOnboarding(state) && !inOnboardingFlow) {
    localStorage.setItem('in_onboarding_flow', 'true');
    console.log('[Onboarding] Flag d\'onboarding activé');
    // Recharger pour prendre en compte le nouveau flag
    window.location.reload();
    return null;
  }
  
  // Si on n'est PAS dans le flux onboarding et qu'on a des pharmaciens,
  // afficher la sélection de profil
  if (!inOnboardingFlow && state.pharmaciens.length > 0) {
    return <ProfileSelection />;
  }
  
  // Si on n'est PAS dans le flux onboarding et qu'on n'a PAS de pharmaciens,
  // démarrer le flux onboarding
  if (!inOnboardingFlow && state.pharmaciens.length === 0) {
    localStorage.setItem('in_onboarding_flow', 'true');
    console.log('[Onboarding] Démarrage du flux onboarding');
    window.location.reload();
    return null;
  }
  
  // On est dans le flux onboarding
  const currentStep = getCurrentOnboardingStep(state);
  
  // Si on n'est plus dans le flux onboarding (flags supprimés mais page toujours ouverte),
  // rediriger vers activity
  if (!inOnboardingFlow && !needsOnboarding(state) && state.pharmaciens.length > 0) {
    navigate('/activity');
    return null;
  }
  
  // Gestion de la progression
  const handleStepComplete = (step: number) => {
    localStorage.setItem(ONBOARDING_PROGRESS_KEY, String(step));
    
    switch (step) {
      case 1:
        navigate('/pharmacien/new?from=onboarding');
        break;
      case 2:
        navigate('/pharmacy/add?from=onboarding');
        break;
      case 3:
        navigate('/mission/new?from=onboarding');
        break;
      case 4:
      default:
        // Configuration complète, rediriger vers l'accueil avec Bonjour
        localStorage.removeItem(ONBOARDING_PROGRESS_KEY);
        localStorage.removeItem('in_onboarding_flow');
        console.log('[Onboarding] Flag d\'onboarding désactivé - redirection vers /');
        navigate('/');
        break;
    }
  };
  
  // Fonction pour sauter le guide
  const handleSkip = () => {
    localStorage.removeItem(ONBOARDING_PROGRESS_KEY);
    localStorage.removeItem('in_onboarding_flow');
    navigate('/activity');
  };

  return (
    <Box sx={{ minHeight: '72vh', display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'background.default', p: 4 }}>
      <Stack spacing={4} sx={{ width: 'min(980px, 100%)', alignItems: 'center' }}>
        {/* En-tête */}
        <Typography className="welcome-hello" variant="h1">Bonjour</Typography>
        
        {/* Indicateur de progression (seulement pour le flux onboarding) */}
        <Paper sx={{ width: '100%', p: 3, borderRadius: componentBorderRadius.paper }}>
          <Stepper activeStep={currentStep - 1} alternativeLabel sx={{ width: '100%' }}>
            <Step completed={currentStep > 1} active={currentStep === 1}>
              <StepLabel>Pharmacien</StepLabel>
            </Step>
            <Step completed={currentStep > 2} active={currentStep === 2}>
              <StepLabel>Pharmacie</StepLabel>
            </Step>
            <Step completed={currentStep > 3} active={currentStep === 3}>
              <StepLabel>Mission</StepLabel>
            </Step>
            <Step completed={currentStep === 4} active={currentStep === 4}>
              <StepLabel>Suivi</StepLabel>
            </Step>
          </Stepper>
        </Paper>
        
        {/* Contenu de l'étape actuelle */}
        <Box sx={{ width: '100%', maxWidth: '600px' }}>
          {currentStep === 1 && (
            <Step1CreatePharmacien onNext={() => handleStepComplete(1)} />
          )}
          {currentStep === 2 && (
            <Step2CreatePharmacie onNext={() => handleStepComplete(2)} />
          )}
          {currentStep === 3 && (
            <Step3CreateMission onNext={() => handleStepComplete(3)} />
          )}
          {currentStep === 4 && (
            <Step4Complete onComplete={() => handleStepComplete(4)} />
          )}
        </Box>
        
        {/* Bouton Sauter (seulement pour les étapes 1-3) */}
        {currentStep > 0 && currentStep < 4 && (
          <Button 
            variant="text" 
            color="inherit" 
            onClick={handleSkip}
            data-testid="onboarding-skip"
          >
            Sauter le guide
          </Button>
        )}
      </Stack>
    </Box>
  );
}
