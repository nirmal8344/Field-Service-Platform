import { useState } from 'react';
import { 
  Bell, 
  Wrench,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useNotifications } from '../../context/useNotifications';

export default function Navbar({ onOpenBookModal, isMobileMenuOpen, onToggleMobileMenu }) {
  const { currentUser, isCustomer } = useAuth();
  const { notifications, unreadCount, markAllNotificationsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  const displayName = currentUser?.fullName || 'NIRMALKUMAR R';
  const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NR';

  return (
    <header style={{
      height: '64px',
      borderBottom: '1px solid #e4e4e7',
      background: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Brand & Mobile Hamburger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={onToggleMobileMenu}
          className="mobile-nav-toggle"
          aria-label="Toggle Navigation Menu"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#09090b',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease'
          }}
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          background: '#09090b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
        }}>
          <Wrench size={17} color="#ffffff" strokeWidth={2.4} />
        </div>
        <div style={{
          fontWeight: 800,
          fontSize: '1.15rem',
          letterSpacing: '-0.03em',
          color: '#09090b'
        }}>
          FieldHub
        </div>
      </div>


      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        
        {isCustomer && (
          <button
            onClick={onOpenBookModal}
            style={{
              background: '#09090b',
              color: '#ffffff',
              fontWeight: 700,
              border: 'none',
              borderRadius: '9999px',
              padding: '8px 18px',
              fontSize: '0.84rem',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = '#27272a'}
            onMouseLeave={(e) => e.target.style.background = '#09090b'}
          >
            + Book a Service
          </button>
        )}

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) markAllNotificationsRead();
            }}
            style={{
              background: '#f4f4f5',
              border: '1px solid #e4e4e7',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#09090b',
              position: 'relative'
            }}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                background: '#09090b',
                color: '#ffffff',
                borderRadius: '50%',
                fontSize: '0.62rem',
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '48px',
              width: '320px',
              background: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: '16px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
              padding: '14px',
              zIndex: 1000
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #f4f4f5', paddingBottom: '6px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#09090b' }}>Notifications</span>
                <span style={{ fontSize: '0.72rem', color: '#71717a' }}>Real-time updates</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#71717a', fontSize: '0.82rem' }}>
                    No new notifications
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{
                      padding: '10px',
                      borderRadius: '10px',
                      background: '#f9fafb',
                      borderLeft: `3px solid #09090b`
                    }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#09090b' }}>{n.title}</div>
                      <div style={{ fontSize: '0.76rem', color: '#52525b', marginTop: '2px' }}>{n.message}</div>
                      <div style={{ fontSize: '0.68rem', color: '#a1a1aa', marginTop: '4px' }}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Identity & Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px', borderLeft: '1px solid #e4e4e7' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#09090b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.82rem',
            fontWeight: 800,
            letterSpacing: '0.02em',
            flexShrink: 0
          }}>
            {initials}
          </div>

          <div className="navbar-user-info" style={{ lineHeight: 1.2, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#09090b' }}>
              {displayName}
            </div>
            <div className="navbar-user-email" style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 500 }}>
              {currentUser?.email || 'customer@fieldhub.com'}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .mobile-nav-toggle {
          display: none;
        }
        @media (max-width: 1024px) {
          .mobile-nav-toggle {
            display: flex !important;
          }
        }
        @media (max-width: 640px) {
          .navbar-user-email {
            display: none !important;
          }
          .navbar-user-info {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}

