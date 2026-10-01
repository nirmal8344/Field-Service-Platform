import { useState, useEffect, useCallback, useRef } from 'react';
import { NotificationContext } from './notificationContextDef';
import { api } from '../api/client';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const toastIdRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', title = '') => {
    toastIdRef.current += 1;
    const id = `${toastIdRef.current}-${Date.now()}`;
    
    setToasts(prev => [...prev, { id, message, type, title }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch {
      // ignore when not authenticated
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await api.getNotifications();
        if (isMounted && Array.isArray(data)) {
          setNotifications(data);
        }
      } catch {
        // ignore
      }
    };

    load();
    const interval = setInterval(load, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const markAllNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      toasts,
      addToast,
      removeToast,
      notifications,
      unreadCount,
      fetchNotifications,
      markNotificationRead,
      markAllNotificationsRead
    }}>
      {children}
      
      {/* Clean FieldHub Floating Toast Notifications */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '380px',
        fontFamily: "'Inter', sans-serif"
      }}>
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isDanger = toast.type === 'danger';
          const isWarning = toast.type === 'warning';

          const IconComponent = isSuccess ? CheckCircle2 : isDanger ? AlertCircle : isWarning ? AlertTriangle : Info;

          return (
            <div
              key={toast.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '16px',
                padding: '14px 18px',
                boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.05)',
                color: '#09090b',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: isDanger ? '#fef2f2' : isWarning ? '#fefce8' : '#f4f4f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px'
                }}>
                  <IconComponent
                    size={16}
                    color={isDanger ? '#dc2626' : isWarning ? '#ca8a04' : '#09090b'}
                    strokeWidth={2.4}
                  />
                </div>

                <div>
                  {toast.title && (
                    <div style={{
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      color: '#09090b',
                      letterSpacing: '-0.015em',
                      marginBottom: '2px'
                    }}>
                      {toast.title}
                    </div>
                  )}
                  <div style={{
                    fontSize: '0.82rem',
                    color: '#52525b',
                    lineHeight: 1.45,
                    fontWeight: 400
                  }}>
                    {toast.message}
                  </div>
                </div>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#a1a1aa',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#09090b'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#a1a1aa'}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

export default NotificationProvider;
