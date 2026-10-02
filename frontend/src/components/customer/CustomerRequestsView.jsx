import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { 
  ClipboardList, 
  MapPin, 
  Calendar,
  AlertCircle,
  Star,
  X,
  Camera,
  Ban,
  Bell,
  CheckCheck
} from 'lucide-react';
import { api } from '../../api/client';
import { useNotifications } from '../../context/useNotifications';

export default function CustomerRequestsView({ viewMode = 'MY_REQUESTS', initialTab, onOpenBookModal }) {
  const { addToast } = useNotifications();

  // Determine effective mode (supports direct viewMode or legacy initialTab)
  const effectiveMode = viewMode === 'NOTIFICATIONS' ? 'NOTIFICATIONS' :
    viewMode === 'ACTIVE_SERVICES' || initialTab === 'IN_PROGRESS' ? 'ACTIVE_SERVICES' :
    viewMode === 'SERVICE_HISTORY' || initialTab === 'COMPLETED' ? 'SERVICE_HISTORY' : 'MY_REQUESTS';

  const [requests, setRequests] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [customerNotifications, setCustomerNotifications] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);
  const [photoGallery, setPhotoGallery] = useState(null); // { title: '', photos: [] }
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Verification & Reopen State
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Cancellation state
  const [cancelTargetRequest, setCancelTargetRequest] = useState(null);
  const [cancelReason, setCancelReason] = useState('Customer requested cancellation');

  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      if (effectiveMode === 'NOTIFICATIONS') {
        const notifs = await api.getNotifications();
        setCustomerNotifications(notifs || []);
      } else {
        const [reqs, wos] = await Promise.all([
          api.getMyServiceRequests(),
          api.getAllWorkOrders()
        ]);
        setRequests(reqs || []);
        setWorkOrders(wos || []);
      }
    } catch (err) {
      console.error('Error fetching customer data:', err);
      setApiError(err.message || 'Unable to connect to service platform. Please check connection.');
    } finally {
      setLoading(false);
    }
  }, [effectiveMode]);

  const fetchRef = useRef(null);
  useLayoutEffect(() => {
    fetchRef.current = loadData;
  });

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active && fetchRef.current) await fetchRef.current();
    };
    run();
    return () => { active = false; };
  }, [effectiveMode]);

  const handleVerify = async (orderId) => {
    setActionLoading(true);
    try {
      await api.verifyWorkOrder(orderId, {
        rating,
        feedbackText: feedbackText.trim() || 'Work verified and approved by customer.'
      });
      addToast('Thank you! Work order confirmed & verified.', 'success', 'Verification Complete');
      setSelectedOrder(null);
      loadData();
    } catch (err) {
      addToast(err.message || 'Verification failed', 'danger', 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async (orderId) => {
    if (!reopenReason.trim()) {
      addToast('Please provide a reason for reopening the ticket.', 'warning', 'Reason Required');
      return;
    }

    setActionLoading(true);
    try {
      await api.reopenWorkOrder(orderId, {
        reason: reopenReason.trim()
      });
      addToast('Work order reopened. Dispatcher alerted.', 'warning', 'Ticket Reopened');
      setSelectedOrder(null);
      setShowReopenForm(false);
      loadData();
    } catch (err) {
      addToast(err.message || 'Reopen failed', 'danger', 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async (e) => {
    e.preventDefault();
    if (!cancelTargetRequest) return;
    setActionLoading(true);
    try {
      await api.cancelServiceRequest(cancelTargetRequest.id, cancelReason);
      addToast(`Service request ${cancelTargetRequest.requestNumber} cancelled.`, 'info', 'Request Cancelled');
      setCancelTargetRequest(null);
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to cancel request', 'danger', 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkNotificationRead = async (notifId) => {
    try {
      await api.markNotificationRead(notifId);
      setCustomerNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setCustomerNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      addToast('All notifications marked as read.', 'success', 'Notifications Updated');
    } catch (err) {
      addToast(err.message || 'Failed to mark all read', 'danger', 'Error');
    }
  };

  const parseAttachments = (attachmentsJson) => {
    if (!attachmentsJson) return [];
    try {
      const parsed = JSON.parse(attachmentsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const get5StepProgress = (status) => {
    const steps = [
      { key: 'REQUEST_PLACED', label: '1. Request Placed', desc: 'Logged in system' },
      { key: 'SCHEDULED', label: '2. Assigned / Scheduled', desc: 'Technician assigned' },
      { key: 'DISPATCHED', label: '3. Dispatched', desc: 'Technician en route' },
      { key: 'IN_PROGRESS', label: '4. Work In Progress', desc: 'On-site diagnostics' },
      { key: 'COMPLETED', label: '5. Completed & Verified', desc: 'Customer sign-off' }
    ];

    let currentStepIndex = 0;
    if (status === 'SCHEDULED' || status === 'ASSIGNED' || status === 'ACCEPTED') currentStepIndex = 1;
    else if (status === 'DISPATCHED' || status === 'EN_ROUTE') currentStepIndex = 2;
    else if (status === 'IN_PROGRESS' || status === 'ON_HOLD') currentStepIndex = 3;
    else if (status === 'COMPLETED' || status === 'CUSTOMER_VERIFIED' || status === 'CLOSED') currentStepIndex = 4;

    return { steps, currentStepIndex };
  };

  // Mode Specific Filtering
  let displayedItems = [];
  if (effectiveMode === 'MY_REQUESTS') {
    displayedItems = requests.filter(r => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'PENDING') return r.status === 'PENDING';
      if (statusFilter === 'ASSIGNED') return r.status === 'ASSIGNED' || r.status === 'SCHEDULED' || r.status === 'IN_PROGRESS';
      if (statusFilter === 'COMPLETED') return r.status === 'COMPLETED' || r.status === 'CLOSED';
      if (statusFilter === 'CANCELLED') return r.status === 'CANCELLED';
      return r.status === statusFilter;
    });
  } else if (effectiveMode === 'ACTIVE_SERVICES') {
    displayedItems = workOrders.filter(wo => {
      const activeStatuses = ['ASSIGNED', 'ACCEPTED', 'DISPATCHED', 'IN_PROGRESS', 'ON_HOLD', 'SCHEDULED'];
      if (!activeStatuses.includes(wo.status)) return false;
      if (statusFilter === 'ALL') return true;
      return wo.status === statusFilter;
    });
  } else if (effectiveMode === 'SERVICE_HISTORY') {
    displayedItems = workOrders.filter(wo => {
      const historyStatuses = ['COMPLETED', 'CUSTOMER_VERIFIED', 'CLOSED', 'REOPENED', 'CANCELLED'];
      if (!historyStatuses.includes(wo.status)) return false;
      if (statusFilter === 'ALL') return true;
      return wo.status === statusFilter;
    });
  }

  // Titles and Subtitles based on Mode
  const pageMeta = {
    MY_REQUESTS: {
      title: 'My Service Requests',
      subtitle: 'Track your submitted service tickets, categories, locations, and dispatcher assignment status',
      emptyTitle: 'No Service Requests Found',
      emptyDesc: 'You have not submitted any service requests yet. Book a certified technician for your home or business.',
      buttonText: '+ Book a Service'
    },
    ACTIVE_SERVICES: {
      title: 'Active Field Services',
      subtitle: 'Live tracking of assigned technicians, real-time stage progression, and active on-site work',
      emptyTitle: 'No Active Services In Progress',
      emptyDesc: 'There are currently no active jobs scheduled or in progress for your service address.',
      buttonText: '+ Book a Service'
    },
    SERVICE_HISTORY: {
      title: 'Service History & Completed Work',
      subtitle: 'Review work performed, technician diagnostics, parts consumed, and submit completion verification & ratings',
      emptyTitle: 'No Past Service Records Found',
      emptyDesc: 'You do not have any completed or past service history on record.',
      buttonText: '+ Book a Service'
    },
    NOTIFICATIONS: {
      title: 'Service Notifications',
      subtitle: 'Real-time updates regarding service bookings, technician dispatch, work progress, and completion alerts',
      emptyTitle: 'No Notifications',
      emptyDesc: 'You have no new alerts or notifications at this time.',
      buttonText: '+ Book a Service'
    }
  }[effectiveMode];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1080px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Header Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e4e4e7',
        borderRadius: '20px',
        padding: '20px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.025em', margin: 0 }}>
            {pageMeta.title}
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#71717a', margin: '4px 0 0 0' }}>
            {pageMeta.subtitle}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {effectiveMode === 'NOTIFICATIONS' ? (
            <button
              onClick={handleMarkAllRead}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '38px',
                padding: '0 16px',
                borderRadius: '9999px',
                border: '1.5px solid #e4e4e7',
                background: '#f4f4f5',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#09090b',
                cursor: 'pointer'
              }}
            >
              <CheckCheck size={16} />
              <span>Mark All Read</span>
            </button>
          ) : (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                height: '38px',
                padding: '0 12px',
                borderRadius: '9999px',
                border: '1.5px solid #e4e4e7',
                background: '#f4f4f5',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#09090b',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              {effectiveMode === 'MY_REQUESTS' && (
                <>
                  <option value="ALL">All Requests</option>
                  <option value="PENDING">Pending Review</option>
                  <option value="ASSIGNED">Assigned / In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </>
              )}
              {effectiveMode === 'ACTIVE_SERVICES' && (
                <>
                  <option value="ALL">All Active Services</option>
                  <option value="ASSIGNED">Assigned / Scheduled</option>
                  <option value="DISPATCHED">Dispatched / En Route</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ON_HOLD">On Hold</option>
                </>
              )}
              {effectiveMode === 'SERVICE_HISTORY' && (
                <>
                  <option value="ALL">All Past Work</option>
                  <option value="COMPLETED">Completed (Action Required)</option>
                  <option value="CUSTOMER_VERIFIED">Verified & Rated</option>
                  <option value="CLOSED">Closed</option>
                  <option value="REOPENED">Reopened</option>
                </>
              )}
            </select>
          )}

          <button
            onClick={onOpenBookModal}
            style={{
              padding: '8px 18px',
              borderRadius: '9999px',
              border: 'none',
              background: '#09090b',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = '#27272a'}
            onMouseLeave={(e) => e.target.style.background = '#09090b'}
          >
            {pageMeta.buttonText}
          </button>
        </div>
      </div>

      {/* Real API Error Banner */}
      {apiError && (
        <div style={{
          background: '#fef2f2',
          border: '1.5px solid #fecaca',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#991b1b' }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{apiError}</span>
          </div>
          <button
            onClick={loadData}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              border: '1px solid #f87171',
              background: '#ffffff',
              color: '#991b1b',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#71717a', fontSize: '0.9rem' }}>
            Loading {pageMeta.title.toLowerCase()}...
          </div>
        ) : effectiveMode === 'NOTIFICATIONS' ? (
          /* NOTIFICATIONS LIST */
          customerNotifications.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: '20px',
              padding: '48px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Bell size={36} color="#a1a1aa" />
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#09090b' }}>{pageMeta.emptyTitle}</div>
              <p style={{ fontSize: '0.84rem', color: '#71717a', margin: 0, maxWidth: '380px' }}>
                {pageMeta.emptyDesc}
              </p>
            </div>
          ) : (
            customerNotifications.map(n => (
              <div
                key={n.id}
                style={{
                  background: n.isRead ? '#ffffff' : '#fafafa',
                  border: n.isRead ? '1px solid #e4e4e7' : '1.5px solid #09090b',
                  borderRadius: '16px',
                  padding: '18px 22px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: n.isRead ? '#f4f4f5' : '#09090b',
                    color: n.isRead ? '#71717a' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Bell size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#09090b' }}>{n.title}</div>
                    <div style={{ fontSize: '0.84rem', color: '#52525b', marginTop: '3px' }}>{n.message}</div>
                    <div style={{ fontSize: '0.72rem', color: '#a1a1aa', marginTop: '6px' }}>
                      {n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recent'}
                    </div>
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    onClick={() => handleMarkNotificationRead(n.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      border: '1px solid #e4e4e7',
                      background: '#ffffff',
                      color: '#09090b',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            ))
          )
        ) : displayedItems.length === 0 ? (
          /* EMPTY STATE */
          <div style={{
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '20px',
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <ClipboardList size={36} color="#a1a1aa" />
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#09090b' }}>{pageMeta.emptyTitle}</div>
            <p style={{ fontSize: '0.84rem', color: '#71717a', margin: 0, maxWidth: '400px' }}>
              {pageMeta.emptyDesc}
            </p>
            <button
              onClick={onOpenBookModal}
              style={{
                marginTop: '8px',
                padding: '10px 22px',
                borderRadius: '9999px',
                border: 'none',
                background: '#09090b',
                color: '#ffffff',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              + Book a Service Now
            </button>
          </div>
        ) : (
          /* RECORD CARDS */
          displayedItems.map(item => {
            const isWorkOrder = !!item.workOrderNumber || !!item.assignedTechnicianName;
            const req = isWorkOrder ? requests.find(r => r.id === item.serviceRequestId) || item : item;
            const matchedWorkOrder = isWorkOrder ? item : workOrders.find(wo => wo.serviceRequestId === item.id);
            const activeStatus = matchedWorkOrder ? matchedWorkOrder.status : req.status;
            const isCompletedPendingVerification = activeStatus === 'COMPLETED';

            const { steps, currentStepIndex } = get5StepProgress(activeStatus);
            const attachments = parseAttachments(req.attachmentsJson || item.attachmentsJson);

            return (
              <div
                key={item.id}
                style={{
                  background: '#ffffff',
                  border: isCompletedPendingVerification ? '2px solid #09090b' : '1px solid #e4e4e7',
                  borderRadius: '20px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Top Row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#09090b', letterSpacing: '-0.02em' }}>
                        {isWorkOrder ? `WO #${item.workOrderNumber}` : req.requestNumber}
                      </span>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: '#09090b',
                        color: '#ffffff'
                      }}>
                        {item.categoryName || req.categoryName || 'Service'}
                      </span>
                      {(item.serviceTypeName || req.serviceTypeName) && (
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          background: '#f4f4f5',
                          color: '#52525b',
                          border: '1px solid #e4e4e7'
                        }}>
                          {item.serviceTypeName || req.serviceTypeName}
                        </span>
                      )}
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: activeStatus === 'COMPLETED' ? '#dcfce7' : activeStatus === 'IN_PROGRESS' ? '#dbeafe' : activeStatus === 'CANCELLED' ? '#fee2e2' : '#f4f4f5',
                        color: activeStatus === 'COMPLETED' ? '#166534' : activeStatus === 'IN_PROGRESS' ? '#1e40af' : activeStatus === 'CANCELLED' ? '#991b1b' : '#18181b',
                        border: '1px solid #e4e4e7'
                      }}>
                        {activeStatus === 'COMPLETED' ? 'COMPLETED (PENDING YOUR CONFIRMATION)' : activeStatus}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#18181b', marginTop: '8px' }}>
                      {item.problemDescription || req.problemDescription || item.description}
                    </div>

                    {(item.locationName || req.locationName || item.city || req.city) && (
                      <div style={{ fontSize: '0.78rem', color: '#71717a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} />
                        <span>{item.locationName || req.locationName || 'Service Address'} ({item.city || req.city || 'Primary'})</span>
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', color: '#71717a', fontWeight: 500 }}>
                      <Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                      Scheduled: {item.scheduledDate || req.preferredDate} ({item.scheduledTimeSlot || req.preferredTimeSlot || 'Standard Slot'})
                    </div>
                    {matchedWorkOrder?.assignedTechnicianName && (
                      <div style={{ fontSize: '0.82rem', color: '#09090b', fontWeight: 700, marginTop: '4px' }}>
                        👨‍🔧 Technician: {matchedWorkOrder.assignedTechnicianName}
                      </div>
                    )}
                  </div>
                </div>

                {/* 5-Step Progress Bar for Active & Request views */}
                {(effectiveMode === 'ACTIVE_SERVICES' || effectiveMode === 'MY_REQUESTS') && (
                  <div style={{
                    background: '#f9fafb',
                    border: '1px solid #e4e4e7',
                    borderRadius: '14px',
                    padding: '16px 20px'
                  }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: '12px' }}>
                      Live Service Progression (Stage {currentStepIndex + 1} of 5)
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                      {steps.map((st, idx) => {
                        const isPast = idx < currentStepIndex;
                        const isCurrent = idx === currentStepIndex;

                        return (
                          <div key={st.key} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            borderTop: `3px solid ${isPast || isCurrent ? '#09090b' : '#e4e4e7'}`,
                            paddingTop: '8px'
                          }}>
                            <div style={{
                              fontSize: '0.76rem',
                              fontWeight: isCurrent ? 800 : 600,
                              color: isCurrent ? '#09090b' : isPast ? '#52525b' : '#a1a1aa'
                            }}>
                              {st.label}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#71717a' }}>
                              {st.desc}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Work Summary for History View */}
                {effectiveMode === 'SERVICE_HISTORY' && (
                  <div style={{ background: '#f9fafb', border: '1px solid #e4e4e7', borderRadius: '14px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                      Service Resolution Summary
                    </div>
                    {item.workPerformedNotes ? (
                      <div style={{ fontSize: '0.86rem', color: '#09090b' }}>{item.workPerformedNotes}</div>
                    ) : (
                      <div style={{ fontSize: '0.82rem', color: '#71717a' }}>Technician completed inspection and servicing.</div>
                    )}
                    {item.rating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#09090b' }}>Customer Rating:</span>
                        <div style={{ display: 'flex' }}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={14} color={s <= item.rating ? '#eab308' : '#d4d4d8'} fill={s <= item.rating ? '#eab308' : 'none'} />
                          ))}
                        </div>
                        {item.customerFeedback && <span style={{ fontSize: '0.78rem', color: '#52525b' }}>— "{item.customerFeedback}"</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Action Bar */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', paddingTop: '10px', borderTop: '1px solid #f4f4f5' }}>
                  {isCompletedPendingVerification ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534' }}>
                        ✓ Work finished. Please verify and confirm to sign off.
                      </span>
                      <button
                        onClick={() => {
                          setSelectedOrder(matchedWorkOrder || item);
                          setShowReopenForm(false);
                        }}
                        style={{
                          padding: '6px 18px',
                          borderRadius: '9999px',
                          border: 'none',
                          background: '#09090b',
                          color: '#ffffff',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Confirm & Verify
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: '#71717a' }}>
                      Priority: <strong style={{ color: item.priority === 'CRITICAL' || req.priority === 'CRITICAL' ? '#dc2626' : '#09090b' }}>{item.priority || req.priority}</strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {attachments.length > 0 && (
                      <button
                        onClick={() => setPhotoGallery({ title: `Photos - ${item.requestNumber || item.workOrderNumber}`, photos: attachments })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '9999px',
                          border: '1.5px solid #e4e4e7',
                          background: '#ffffff',
                          color: '#09090b',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Camera size={14} />
                        <span>{attachments.length} Photo{attachments.length > 1 ? 's' : ''}</span>
                      </button>
                    )}

                    {/* Cancel Request CTA for Pending requests */}
                    {!isWorkOrder && req.status === 'PENDING' && (
                      <button
                        onClick={() => setCancelTargetRequest(req)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          borderRadius: '9999px',
                          border: '1px solid #fecaca',
                          background: '#fef2f2',
                          color: '#dc2626',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Ban size={13} />
                        <span>Cancel Request</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (matchedWorkOrder) setSelectedOrder(matchedWorkOrder);
                        else setSelectedRequestDetails(req);
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        border: '1.5px solid #e4e4e7',
                        background: '#ffffff',
                        color: '#09090b',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* VERIFICATION & WORK ORDER MODAL */}
      {selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '560px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  Work Order #{selectedOrder.workOrderNumber || selectedOrder.id}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '2px' }}>
                  Status: <strong style={{ color: '#09090b' }}>{selectedOrder.status}</strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} color="#71717a" />
              </button>
            </div>

            {/* Technician info */}
            {selectedOrder.assignedTechnicianName && (
              <div style={{ background: '#f9fafb', border: '1px solid #e4e4e7', borderRadius: '14px', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                  Assigned Technician
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b', marginTop: '2px' }}>
                  👨‍🔧 {selectedOrder.assignedTechnicianName}
                </div>
                {selectedOrder.technicianPhone && (
                  <div style={{ fontSize: '0.8rem', color: '#52525b', marginTop: '2px' }}>
                    Phone: {selectedOrder.technicianPhone}
                  </div>
                )}
              </div>
            )}

            {/* Work Performed notes */}
            {selectedOrder.workPerformedNotes && (
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                  Work Performed Notes
                </label>
                <div style={{ fontSize: '0.88rem', color: '#09090b', background: '#f4f4f5', padding: '12px', borderRadius: '10px', marginTop: '4px' }}>
                  {selectedOrder.workPerformedNotes}
                </div>
              </div>
            )}

            {/* VERIFICATION FORM */}
            {selectedOrder.status === 'COMPLETED' && !showReopenForm && (
              <div style={{
                background: '#fcfcfc',
                border: '1.5px solid #09090b',
                borderRadius: '16px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#09090b' }}>
                  Job Verification & Rating
                </div>
                <p style={{ fontSize: '0.8rem', color: '#71717a', margin: 0 }}>
                  Please rate your satisfaction with the completed work order to confirm completion.
                </p>

                {/* 1-5 Star Rating */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '6px' }}>
                    Rating (1 to 5 Stars)
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px'
                        }}
                      >
                        <Star
                          size={24}
                          color={star <= rating ? '#eab308' : '#d4d4d8'}
                          fill={star <= rating ? '#eab308' : 'none'}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                    Customer Feedback / Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Work quality was great, completed on time..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #e4e4e7',
                      fontSize: '0.86rem',
                      fontFamily: "'Inter', sans-serif",
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowReopenForm(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#dc2626',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Report an Issue / Reopen Ticket
                  </button>

                  <button
                    onClick={() => handleVerify(selectedOrder.id)}
                    disabled={actionLoading}
                    style={{
                      padding: '10px 22px',
                      borderRadius: '9999px',
                      border: 'none',
                      background: '#09090b',
                      color: '#ffffff',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {actionLoading ? 'Confirming...' : 'Confirm & Sign Off'}
                  </button>
                </div>
              </div>
            )}

            {/* REOPEN ISSUE FORM */}
            {showReopenForm && (
              <div style={{
                background: '#fef2f2',
                border: '1.5px solid #f87171',
                borderRadius: '16px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#991b1b' }}>
                  Report Problem / Reopen Ticket
                </div>
                <p style={{ fontSize: '0.8rem', color: '#7f1d1d', margin: 0 }}>
                  If the work was not satisfactory or the issue persists, please describe the problem for the dispatch team.
                </p>

                <textarea
                  required
                  rows={3}
                  placeholder="Describe what is still not working..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #fca5a5',
                    fontSize: '0.86rem',
                    fontFamily: "'Inter', sans-serif",
                    boxSizing: 'border-box'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowReopenForm(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '9999px',
                      border: '1px solid #d4d4d8',
                      background: '#ffffff',
                      color: '#09090b',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReopen(selectedOrder.id)}
                    disabled={actionLoading}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '9999px',
                      border: 'none',
                      background: '#dc2626',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {actionLoading ? 'Submitting...' : 'Submit Issue & Reopen'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REQUEST DETAILS MODAL */}
      {selectedRequestDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '520px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  Service Ticket #{selectedRequestDetails.requestNumber}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '2px' }}>
                  Status: <strong style={{ color: '#09090b' }}>{selectedRequestDetails.status}</strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedRequestDetails(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} color="#71717a" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.86rem' }}>
              <div>
                <span style={{ color: '#71717a', fontWeight: 600 }}>Category: </span>
                <strong style={{ color: '#09090b' }}>{selectedRequestDetails.categoryName}</strong>
              </div>
              {selectedRequestDetails.serviceTypeName && (
                <div>
                  <span style={{ color: '#71717a', fontWeight: 600 }}>Service Type: </span>
                  <strong style={{ color: '#09090b' }}>{selectedRequestDetails.serviceTypeName}</strong>
                </div>
              )}
              <div>
                <span style={{ color: '#71717a', fontWeight: 600 }}>Priority: </span>
                <strong style={{ color: '#09090b' }}>{selectedRequestDetails.priority}</strong>
              </div>
              <div>
                <span style={{ color: '#71717a', fontWeight: 600 }}>Preferred Date & Slot: </span>
                <span style={{ color: '#09090b' }}>{selectedRequestDetails.preferredDate} ({selectedRequestDetails.preferredTimeSlot})</span>
              </div>
              <div>
                <span style={{ color: '#71717a', fontWeight: 600 }}>Service Address: </span>
                <span style={{ color: '#09090b' }}>{selectedRequestDetails.locationName} - {selectedRequestDetails.address}, {selectedRequestDetails.city}</span>
              </div>
              <div style={{ background: '#f4f4f5', padding: '12px', borderRadius: '12px', marginTop: '4px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: '4px' }}>Problem Description</div>
                <div style={{ color: '#09090b', lineHeight: 1.4 }}>{selectedRequestDetails.problemDescription}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                onClick={() => setSelectedRequestDetails(null)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: '#09090b',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL SERVICE REQUEST MODAL */}
      {cancelTargetRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <form onSubmit={handleCancelRequest} style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '460px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#991b1b', margin: 0 }}>
              Cancel Service Request #{cancelTargetRequest.requestNumber}
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#71717a', margin: 0 }}>
              Are you sure you want to cancel this booking? Please let us know the reason.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                Cancellation Reason
              </label>
              <textarea
                required
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #e4e4e7',
                  fontSize: '0.86rem',
                  fontFamily: "'Inter', sans-serif",
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setCancelTargetRequest(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  border: '1px solid #d4d4d8',
                  background: '#ffffff',
                  color: '#09090b',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Keep Request
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                style={{
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PHOTO GALLERY MODAL */}
      {photoGallery && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '24px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '680px',
            padding: '24px',
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                {photoGallery.title}
              </h3>
              <button
                onClick={() => setPhotoGallery(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} color="#71717a" />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {photoGallery.photos.map((p, idx) => (
                <div key={idx} style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e4e4e7' }}>
                  <img
                    src={p.url || p.dataUrl}
                    alt={p.name || `Photo ${idx + 1}`}
                    style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{ padding: '8px', fontSize: '0.74rem', color: '#52525b', background: '#f9fafb' }}>
                    {p.name || `Photo ${idx + 1}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
