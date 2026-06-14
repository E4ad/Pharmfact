import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import { Alert, Button, IconButton, Snackbar, Stack, type AlertColor } from '@mui/material';
import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type NotificationSeverity = AlertColor;

export type NotificationAction = {
  label: string;
  onClick: () => void;
};

export type NotificationInput = {
  message: string;
  severity: NotificationSeverity;
  autoHideDuration?: number;
  action?: NotificationAction;
  onUndo?: () => void;
  persist?: boolean;
};

type Notification = NotificationInput & {
  id: string;
};

type NotificationContextValue = {
  notify: (notification: NotificationInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

function createNotificationId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `notification-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getAutoHideDuration(notification: Notification): number | null {
  if (notification.persist || notification.severity === 'error') return null;
  return notification.autoHideDuration ?? (notification.onUndo ? 6000 : 4200);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const activeNotification = notifications[0] ?? null;

  const dismiss = useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const clear = useCallback(() => {
    setNotifications([]);
  }, []);

  const notify = useCallback((notification: NotificationInput) => {
    const id = createNotificationId();
    setNotifications((current) => [...current, { ...notification, id }]);
    return id;
  }, []);

  const value = useMemo(() => ({ notify, dismiss, clear }), [notify, dismiss, clear]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={Boolean(activeNotification)}
        autoHideDuration={activeNotification ? getAutoHideDuration(activeNotification) : undefined}
        onClose={(_, reason) => {
          if (reason === 'clickaway' || !activeNotification) return;
          dismiss(activeNotification.id);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ maxWidth: { xs: 'calc(100vw - 32px)', sm: 460 } }}
      >
        {activeNotification ? (
          <Alert
            severity={activeNotification.severity}
            variant="filled"
            role={activeNotification.severity === 'error' ? 'alert' : 'status'}
            aria-live={activeNotification.severity === 'error' ? 'assertive' : 'polite'}
            onClose={() => dismiss(activeNotification.id)}
            action={
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                {activeNotification.onUndo ? (
                  <Button
                    color="inherit"
                    size="small"
                    startIcon={<UndoRoundedIcon fontSize="small" />}
                    onClick={() => {
                      activeNotification.onUndo?.();
                      dismiss(activeNotification.id);
                    }}
                  >
                    Annuler
                  </Button>
                ) : null}
                {activeNotification.action ? (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => {
                      activeNotification.action?.onClick();
                      dismiss(activeNotification.id);
                    }}
                  >
                    {activeNotification.action.label}
                  </Button>
                ) : null}
                <IconButton
                  aria-label="Fermer la notification"
                  color="inherit"
                  size="small"
                  onClick={() => dismiss(activeNotification.id)}
                >
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            }
            sx={{ width: '100%' }}
          >
            {activeNotification.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications doit être utilisé dans NotificationProvider');
  }
  return context;
}
