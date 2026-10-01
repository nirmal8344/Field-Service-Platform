import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { NotificationProvider } from './context/NotificationContext';

import AuthPage from './components/auth/AuthPage';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';

import CustomerHomeView from './components/customer/CustomerHomeView';
import CustomerRequestsView from './components/customer/CustomerRequestsView';
import CustomerLocationsView from './components/customer/CustomerLocationsView';
import CreateServiceRequestModal from './components/customer/CreateServiceRequestModal';

import DispatcherDashboardView from './components/dispatcher/DispatcherDashboardView';
import TechnicianDashboardView from './components/technician/TechnicianDashboardView';
import AdminDashboardView from './components/admin/AdminDashboardView';

function MainLayout() {
  const { isAuthenticated, isCustomer, isDispatcher, isTechnician, isAdmin, loading } = useAuth();
  
  const [activeTabState, setActiveTabState] = useState(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [preselectedCategoryId, setPreselectedCategoryId] = useState(null);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: '#38bdf8', fontWeight: 700 }}>
        Loading FieldHub Platform...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Derive activeTab if not manually set by user
  let activeTab = activeTabState;
  if (!activeTab) {
    if (isCustomer) activeTab = 'customer-home';
    else if (isDispatcher) activeTab = 'dispatcher-dashboard';
    else if (isTechnician) activeTab = 'tech-dashboard';
    else if (isAdmin) activeTab = 'admin-overview';
    else activeTab = 'customer-home';
  }

  const handleOpenBookModal = (categoryId = null) => {
    setPreselectedCategoryId(categoryId);
    setIsBookModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Real Authenticated Navbar */}
      <Navbar onOpenBookModal={() => handleOpenBookModal()} />

      {/* Main Workspace */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Scoped Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTabState} />

        {/* Center Canvas */}
        <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', maxHeight: 'calc(100vh - 64px)', background: (isCustomer || isAdmin || isDispatcher || isTechnician) ? '#f4f4f6' : 'var(--bg-primary)' }}>
          
          {/* CUSTOMER VIEWS */}
          {activeTab === 'customer-home' && (
            <CustomerHomeView
              onOpenBookModal={handleOpenBookModal}
              onSelectCategory={(cat) => handleOpenBookModal(cat.id)}
              onNavigateToRequests={() => setActiveTabState('customer-requests')}
            />
          )}

          {activeTab === 'customer-new-request' && (
            <div style={{ padding: '20px 0' }}>
              <CustomerHomeView
                onOpenBookModal={handleOpenBookModal}
                onSelectCategory={(cat) => handleOpenBookModal(cat.id)}
                onNavigateToRequests={() => setActiveTabState('customer-requests')}
              />
            </div>
          )}

          {(activeTab === 'customer-requests' || activeTab === 'customer-active-services' || activeTab === 'customer-history') && (
            <CustomerRequestsView
              initialTab={activeTab === 'customer-history' ? 'COMPLETED' : activeTab === 'customer-active-services' ? 'IN_PROGRESS' : 'ALL'}
              onOpenBookModal={() => handleOpenBookModal()}
            />
          )}

          {(activeTab === 'customer-locations' || activeTab === 'customer-profile') && (
            <CustomerLocationsView />
          )}

          {activeTab === 'customer-notifications' && (
            <CustomerRequestsView
              initialTab="ALL"
              onOpenBookModal={() => handleOpenBookModal()}
            />
          )}

          {/* DISPATCHER VIEWS (Matches all dispatcher-* tabs) */}
          {(activeTab?.startsWith('dispatcher-') || activeTab === 'dispatcher-dashboard') && (
            <DispatcherDashboardView 
              currentTab={activeTab}
              onTabChange={setActiveTabState}
            />
          )}

          {/* TECHNICIAN VIEWS (Matches all tech-* tabs) */}
          {(activeTab?.startsWith('tech-') || activeTab === 'tech-dashboard') && (
            <TechnicianDashboardView 
              currentTab={activeTab}
              onTabChange={setActiveTabState}
            />
          )}

          {/* ADMIN VIEWS (Matches all admin-* tabs) */}
          {(activeTab?.startsWith('admin-') || activeTab === 'admin-dashboard') && (
            <AdminDashboardView 
              currentTab={activeTab}
              onTabChange={setActiveTabState}
            />
          )}

        </main>
      </div>

      {/* Real Customer Service Booking Modal */}
      {(isBookModalOpen || activeTab === 'customer-new-request') && (
        <CreateServiceRequestModal
          isOpen={isBookModalOpen || activeTab === 'customer-new-request'}
          onClose={() => {
            setIsBookModalOpen(false);
            if (activeTab === 'customer-new-request') {
              setActiveTabState('customer-requests');
            }
          }}
          preselectedCategoryId={preselectedCategoryId}
          onCreated={() => {
            setIsBookModalOpen(false);
            setActiveTabState('customer-requests');
          }}
        />
      )}

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MainLayout />
      </NotificationProvider>
    </AuthProvider>
  );
}