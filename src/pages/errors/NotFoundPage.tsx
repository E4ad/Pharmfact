import { useEffect } from 'react';
import { NotFoundState } from '../../components/NotFoundState';

export function NotFoundPage() {
  useEffect(() => {
    document.title = 'Page introuvable · Pharmfact';
  }, []);

  return (
    <NotFoundState
      title="Cette page n’existe pas."
      description="Le lien demandé est invalide ou la page n’a pas encore été ajoutée."
      actionLabel="Retour à l’accueil"
      actionTo="/activity"
    />
  );
}
