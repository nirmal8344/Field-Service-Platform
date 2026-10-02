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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: '#09090b', fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
        Loading FieldHub Platform...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Derive default tab for role
  const getDefaultTabForRole = () => {
    if (isCustomer) return 'customer-home';
    if (isDispatcher) return 'dispatcher-dashboard';
    if (isTechnician) return 'tech-dashboard';
    if (isAdmin) return 'admin-overview';
    return 'customer-home';
  };

  // Derive activeTab strictly validated against current authenticated role
  const isCustomerTab = activeTabState?.startsWith('customer-');
  const isDispatcherTab = activeTabState?.startsWith('dispatcher-');
  const isTechnicianTab = activeTabState?.startsWith('tech-');
  const isAdminTab = activeTabState?.startsWith('admin-');

  let activeTab = activeTabState;
  if (!activeTab ||
      (isCustomer && !isCustomerTab) ||
      (isDispatcher && !isDispatcherTab) ||
      (isTechnician && !isTechnicianTab) ||
      (isAdmin && !isAdminTab)) {
    activeTab = getDefaultTabForRole();
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
        <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', maxHeight: 'calc(100vh - 64px)', background: '#f4f4f6' }}>
          
          {/* CUSTOMER VIEWS */}
          {isCustomer && (
            <>
              {(activeTab === 'customer-home' || activeTab === 'customer-new-request') && (
                <CustomerHomeView
                  onOpenBookModal={handleOpenBookModal}
                  onSelectCategory={(cat) => handleOpenBookModal(cat.id)}
                  onNavigateToRequests={() => setActiveTabState('customer-requests')}
                />
              )}

              {activeTab === 'customer-requests' && (
                <CustomerRequestsView
                  viewMode="MY_REQUESTS"
                  onOpenBookModal={() => handleOpenBookModal()}
                />
              )}

              {activeTab === 'customer-active-services' && (
                <CustomerRequestsView
                  viewMode="ACTIVE_SERVICES"
                  onOpenBookModal={() => handleOpenBookModal()}
                />
              )}

              {activeTab === 'customer-history' && (
                <CustomerRequestsView
                  viewMode="SERVICE_HISTORY"
                  onOpenBookModal={() => handleOpenBookModal()}
                />
              )}

              {activeTab === 'customer-notifications' && (
                <CustomerRequestsView
                  viewMode="NOTIFICATIONS"
                  onOpenBookModal={() => handleOpenBookModal()}
                />
              )}

              {(activeTab === 'customer-locations' || activeTab === 'customer-profile') && (
                <CustomerLocationsView />
              )}
            </>
          )}

          {/* DISPATCHER VIEWS */}
          {isDispatcher && (
            <DispatcherDashboardView 
              currentTab={activeTab}
              onTabChange={setActiveTabState}
            />
          )}

          {/* TECHNICIAN VIEWS */}
          {isTechnician && (
            <TechnicianDashboardView 
              currentTab={activeTab}
              onTabChange={setActiveTabState}
            />
          )}

          {/* ADMIN VIEWS */}
          {isAdmin && (
            <AdminDashboardView 
              currentTab={activeTab}
              onTabChange={setActiveTabState}
            />
          )}

        </main>
      </div>

      {/* Real Customer Service Booking Modal */}
      {(isBookModalOpen || (isCustomer && activeTab === 'customer-new-request')) && (
        <CreateServiceRequestModal
          isOpen={isBookModalOpen || (isCustomer && activeTab === 'customer-new-request')}
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