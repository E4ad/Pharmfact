import { describe, expect, test, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { Button, Typography, Card, Table, TableBody, TableCell, TableRow, Drawer, Paper, TextField } from '@mui/material';
import { lightTheme, darkTheme, getSystemMode, getTheme } from '../../app/theme';

describe('Theme', () => {
  describe('getSystemMode', () => {
    test('retourne dark quand prefers-color-scheme est dark', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: true,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      expect(getSystemMode()).toBe('dark');
    });

    test('retourne light quand prefers-color-scheme est light', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      expect(getSystemMode()).toBe('light');
    });
  });

  describe('getTheme', () => {
    test('retourne darkTheme pour mode dark', () => {
      const theme = getTheme('dark');
      expect(theme).toBe(darkTheme);
    });

    test('retourne lightTheme pour mode light', () => {
      const theme = getTheme('light');
      expect(theme).toBe(lightTheme);
    });

    test('retourne darkTheme pour mode system quand système est dark', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: true,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const theme = getTheme('system');
      expect(theme).toBe(darkTheme);
    });

    test('retourne lightTheme pour mode system quand système est light', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const theme = getTheme('system');
      expect(theme).toBe(lightTheme);
    });
  });

  describe('darkTheme', () => {
    test('a les bonnes couleurs de base', () => {
      expect(darkTheme.palette.background.default).toBe('#0f1115');
      expect(darkTheme.palette.background.paper).toBe('#171a21');
      expect(darkTheme.palette.text.primary).toBe('#f5f5f5');
      expect(darkTheme.palette.text.secondary).toBe('#a0aec0');
      expect(darkTheme.palette.divider).toBe('rgba(255, 255, 255, 0.08)');
    });

    test('a les bonnes couleurs pour les composants', () => {
      const components = darkTheme.components;
      
      // Card
      expect(components?.MuiCard?.styleOverrides?.root?.borderColor).toBe('rgba(255, 255, 255, 0.08)');
      
      // Paper
      expect(components?.MuiPaper?.styleOverrides?.root?.backgroundColor).toBe('#171a21');
      
      // InputBase
      expect(components?.MuiInputBase?.styleOverrides?.root?.backgroundColor).toBe('rgba(255, 255, 255, 0.04)');
      
      // TableCell
      expect(components?.MuiTableCell?.styleOverrides?.root?.borderBottom).toBe('1px solid rgba(255, 255, 255, 0.08)');
      expect(components?.MuiTableCell?.styleOverrides?.head?.backgroundColor).toBe('rgba(255, 255, 255, 0.04)');
      expect(components?.MuiTableCell?.styleOverrides?.head?.color).toBe('#f5f5f5');
      expect(components?.MuiTableCell?.styleOverrides?.body?.color).toBe('#f5f5f5');
      
      // Drawer
      expect(components?.MuiDrawer?.styleOverrides?.paper?.backgroundColor).toBe('#0f1115');
      expect(components?.MuiDrawer?.styleOverrides?.paper?.borderRight).toBe('1px solid rgba(255, 255, 255, 0.08)');
    });
  });

  describe('lightTheme', () => {
    test('a les bonnes couleurs de base', () => {
      expect(lightTheme.palette.background.default).toBe('#f7f7f8');
      expect(lightTheme.palette.background.paper).toBe('#ffffff');
      expect(lightTheme.palette.text.primary).toBe('#202124');
      expect(lightTheme.palette.text.secondary).toBe('#686b70');
    });
  });
});

// Tests pour vérifier que les composants sont lisibles en dark mode
describe('Composants en dark mode', () => {
  test('Typography est lisible en dark mode', () => {
    render(
      <MuiThemeProvider theme={darkTheme}>
        <Typography variant="body1">Test</Typography>
      </MuiThemeProvider>
    );

    const typography = screen.getByText('Test');
    expect(typography).toHaveStyle({
      color: '#f5f5f5',
    });
  });

  test('Button outlined est lisible en dark mode', () => {
    render(
      <MuiThemeProvider theme={darkTheme}>
        <Button variant="outlined">Test</Button>
      </MuiThemeProvider>
    );

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  test('Card est lisible en dark mode', () => {
    render(
      <MuiThemeProvider theme={darkTheme}>
        <Card>
          <Typography>Contenu</Typography>
        </Card>
      </MuiThemeProvider>
    );

    expect(screen.getByText('Contenu')).toBeInTheDocument();
  });

  test('Table est lisible en dark mode', () => {
    render(
      <MuiThemeProvider theme={darkTheme}>
        <Paper>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Test</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
      </MuiThemeProvider>
    );

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  test('TextField est lisible en dark mode', () => {
    render(
      <MuiThemeProvider theme={darkTheme}>
        <TextField label="Test" />
      </MuiThemeProvider>
    );

    expect(screen.getByLabelText('Test')).toBeInTheDocument();
  });
});
