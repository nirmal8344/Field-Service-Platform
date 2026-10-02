import { 
  ClipboardList, 
  MapPin, 
  Wrench, 
  Users, 
  UserCheck,
  FileText,
  Boxes,
  FileSpreadsheet,
  ShieldCheck,
  Settings,
  LayoutDashboard,
  Calendar,
  Bell,
  User,
  LogOut,
  PlusCircle,
  Clock,
  History,
  Package
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export default function Sidebar({ activeTab, setActiveTab, isMobileOpen, onCloseMobile }) {
  const { isCustomer, isDispatcher, isTechnician, isAdmin, logout } = useAuth();

  let navItems = [];

  if (isCustomer) {
    navItems = [
      { id: 'customer-home', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'customer-new-request', label: 'New Service Request', icon: PlusCircle },
      { id: 'customer-requests', label: 'My Requests', icon: FileText },
      { id: 'customer-active-services', label: 'Active Services', icon: Clock },
      { id: 'customer-history', label: 'Service History', icon: History },
      { id: 'customer-notifications', label: 'Notifications', icon: Bell },
      { id: 'customer-profile', label: 'Profile & Locations', icon: MapPin }
    ];
  } else if (isDispatcher) {
    navItems = [
      { id: 'dispatcher-dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'dispatcher-requests', label: 'Service Requests', icon: FileText },
      { id: 'dispatcher-workorders', label: 'Work Orders', icon: ClipboardList },
      { id: 'dispatcher-schedule', label: 'Schedule', icon: Calendar },
      { id: 'dispatcher-technicians', label: 'Technicians', icon: Wrench },
      { id: 'dispatcher-customers', label: 'Customers', icon: UserCheck },
      { id: 'dispatcher-inventory', label: 'Inventory', icon: Boxes },
      { id: 'dispatcher-reports', label: 'Reports', icon: FileSpreadsheet },
      { id: 'dispatcher-notifications', label: 'Notifications', icon: Bell },
      { id: 'dispatcher-profile', label: 'Profile', icon: User }
    ];
  } else if (isTechnician) {
    navItems = [
      { id: 'tech-dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'tech-today', label: "Today's Jobs", icon: Clock },
      { id: 'tech-upcoming', label: 'Upcoming Jobs', icon: Calendar },
      { id: 'tech-jobs', label: 'Work Orders', icon: ClipboardList },
      { id: 'tech-history', label: 'Service History', icon: History },
      { id: 'tech-inventory', label: 'Parts / Inventory', icon: Package },
      { id: 'tech-notifications', label: 'Notifications', icon: Bell },
      { id: 'tech-profile', label: 'Profile', icon: User }
    ];
  } else if (isAdmin) {
    navItems = [
      { id: 'admin-overview', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'admin-workorders', label: 'Work Orders', icon: ClipboardList },
      { id: 'admin-requests', label: 'Service Requests', icon: FileText },
      { id: 'admin-customers', label: 'Customers', icon: UserCheck },
      { id: 'admin-technicians', label: 'Technicians', icon: Wrench },
      { id: 'admin-catalog', label: 'Service Catalog', icon: FileText },
      { id: 'admin-inventory', label: 'Inventory & Parts', icon: Boxes },
      { id: 'admin-reports', label: 'Reports & CSV', icon: FileSpreadsheet },
      { id: 'admin-users', label: 'Users & Roles', icon: Users },
      { id: 'admin-audit', label: 'Audit Logs', icon: ShieldCheck },
      { id: 'admin-settings', label: 'Settings', icon: Settings }
    ];
  }

  const handleTabClick = (id) => {
    setActiveTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          className="sidebar-overlay-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside 
        className={`app-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}
        style={{
          width: '240px',
          background: '#ffffff',
          borderRight: '1px solid #e4e4e7',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 16px',
          minHeight: 'calc(100vh - 64px)',
          fontFamily: "'Inter', sans-serif",
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#71717a',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '0 12px 10px 12px'
          }}>
            Menu
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: isActive ? '#09090b' : 'transparent',
                  border: 'none',
                  color: isActive ? '#ffffff' : '#52525b',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: "'Inter', sans-serif",
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#f4f4f5';
                    e.currentTarget.style.color = '#09090b';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#52525b';
                  }
                }}
              >
                <Icon size={17} color={isActive ? '#ffffff' : '#71717a'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Logout Action */}
        <button
          onClick={() => {
            if (onCloseMobile) onCloseMobile();
            logout();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '11px 14px',
            borderRadius: '12px',
            background: 'transparent',
            border: '1.5px solid #e4e4e7',
            color: '#09090b',
            fontWeight: 600,
            fontSize: '0.86rem',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: "'Inter', sans-serif",
            transition: 'all 0.15s ease',
            marginTop: '16px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#fef2f2';
            e.currentTarget.style.borderColor = '#fca5a5';
            e.currentTarget.style.color = '#dc2626';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#e4e4e7';
            e.currentTarget.style.color = '#09090b';
          }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </aside>

      <style>{`
        @media (max-width: 1024px) {
          .app-sidebar {
            position: fixed !important;
            top: 64px !important;
            left: 0 !important;
            bottom: 0 !important;
            height: calc(100vh - 64px) !important;
            z-index: 999 !important;
            transform: translateX(-100%);
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2) !important;
          }
          .app-sidebar.mobile-open {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </>
  );
}

