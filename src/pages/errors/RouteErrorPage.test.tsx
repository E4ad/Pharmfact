import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { RouteErrorPage } from './RouteErrorPage';
import { lightTheme } from '../../app/theme';

describe('RouteErrorPage', () => {
  it('renders a visible recovery path without a reload action', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          loader: () => {
            throw new Response('Missing', { status: 404, statusText: 'Not Found' });
          },
          element: <div>home</div>,
          errorElement: <RouteErrorPage />,
        },
      ],
      { initialEntries: ['/'] },
    );

    render(
      <ThemeProvider theme={lightTheme}>
        <RouterProvider router={router} />
      </ThemeProvider>,
    );

    expect(await screen.findByRole('heading', { name: '404 Not Found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute('href', '/activity');
    expect(screen.queryByRole('button', { name: 'Recharger' })).not.toBeInTheDocument();
  });
});
