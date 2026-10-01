import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { 
  ClipboardList, 
  MapPin, 
  Calendar,
  Star,
  X
} from 'lucide-react';
import { api } from '../../api/client';
import { useNotifications } from '../../context/useNotifications';

export default function CustomerRequestsView({ onOpenBookModal }) {
  const { addToast } = useNotifications();

  const [requests, setRequests] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Verification & Reopen State
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadCustomerOrders = useCallback(async () => {
    try {
      const [reqs, wos] = await Promise.all([
        api.getMyServiceRequests(),
        api.getAllWorkOrders()
      ]);
      setRequests(reqs || []);
      setWorkOrders(wos || []);
    } catch (err) {
      console.error('Error fetching customer work orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRef = useRef(null);
  useLayoutEffect(() => {
    fetchRef.current = loadCustomerOrders;
  });

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active && fetchRef.current) await fetchRef.current();
    };
    run();
    return () => { active = false; };
  }, []);

  const handleVerify = async (orderId) => {
    setActionLoading(true);
    try {
      await api.verifyWorkOrder(orderId, {
        rating,
        feedbackText: feedbackText.trim() || 'Work verified and approved by customer.'
      });
      addToast('Thank you! Work order confirmed & verified.', 'success', 'Verification Complete');
      setSelectedOrder(null);
      loadCustomerOrders();
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
      loadCustomerOrders();
    } catch (err) {
      addToast(err.message || 'Reopen failed', 'danger', 'Error');
    } finally {
      setActionLoading(false);
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

  const filteredRequests = requests.filter(r => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') return r.status !== 'COMPLETED' && r.status !== 'CLOSED' && r.status !== 'CUSTOMER_VERIFIED';
    if (statusFilter === 'COMPLETED') return r.status === 'COMPLETED';
    if (statusFilter === 'CLOSED') return r.status === 'CLOSED' || r.status === 'CUSTOMER_VERIFIED';
    return r.status === statusFilter;
  });

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
            My Bookings & Service Requests
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#71717a', margin: '4px 0 0 0' }}>
            Live tracking, technician dispatch status, and verified job completions
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
            <option value="ALL">All Requests</option>
            <option value="ACTIVE">Active / In Progress</option>
            <option value="COMPLETED">Completed (Pending Verification)</option>
            <option value="CLOSED">Verified & Closed</option>
          </select>

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
            + Book Service
          </button>
        </div>
      </div>

      {/* Bookings List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#71717a', fontSize: '0.9rem' }}>
            Loading your service bookings...
          </div>
        ) : filteredRequests.length === 0 ? (
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
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#09090b' }}>No service bookings found</div>
            <p style={{ fontSize: '0.84rem', color: '#71717a', margin: 0, maxWidth: '380px' }}>
              You don't have any service requests matching this filter. Book a certified technician anytime.
            </p>
            <button
              onClick={onOpenBookModal}
              style={{
                marginTop: '8px',
                padding: '10px 20px',
                borderRadius: '9999px',
                border: 'none',
                background: '#09090b',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Book a Service Now
            </button>
          </div>
        ) : (
          filteredRequests.map(req => {
            const matchedWorkOrder = workOrders.find(wo => wo.serviceRequestId === req.id);
            const activeStatus = matchedWorkOrder ? matchedWorkOrder.status : req.status;
            const isCompletedPendingVerification = activeStatus === 'COMPLETED';

            const { steps, currentStepIndex } = get5StepProgress(activeStatus);

            return (
              <div
                key={req.id}
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
                {/* Top Row: Request Info + Status */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#09090b', letterSpacing: '-0.02em' }}>
                        {req.requestNumber}
                      </span>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: '#09090b',
                        color: '#ffffff'
                      }}>
                        {req.categoryName}
                      </span>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: activeStatus === 'COMPLETED' ? '#dcfce7' : activeStatus === 'IN_PROGRESS' ? '#dbeafe' : '#f4f4f5',
                        color: activeStatus === 'COMPLETED' ? '#166534' : activeStatus === 'IN_PROGRESS' ? '#1e40af' : '#18181b',
                        border: '1px solid #e4e4e7'
                      }}>
                        {activeStatus === 'COMPLETED' ? 'COMPLETED (PENDING YOUR CONFIRMATION)' : activeStatus}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#18181b', marginTop: '8px' }}>
                      {req.problemDescription}
                    </div>

                    {req.locationName && (
                      <div style={{ fontSize: '0.78rem', color: '#71717a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} />
                        <span>{req.locationName} ({req.city})</span>
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', color: '#71717a', fontWeight: 500 }}>
                      <Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                      Scheduled: {req.preferredDate} ({req.preferredTimeSlot})
                    </div>
                    {matchedWorkOrder?.assignedTechnicianName && (
                      <div style={{ fontSize: '0.8rem', color: '#09090b', fontWeight: 700, marginTop: '4px' }}>
                        👨‍🔧 Technician: {matchedWorkOrder.assignedTechnicianName}
                      </div>
                    )}
                  </div>
                </div>

                {/* 5-Step Live Tracking Progress Stepper */}
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

                {/* Bottom Actions & Verification Callout */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  {isCompletedPendingVerification ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534' }}>
                        ✓ Work finished by technician. Please verify to close.
                      </span>
                      <button
                        onClick={() => {
                          setSelectedOrder(matchedWorkOrder || { id: req.id, workOrderNumber: req.requestNumber, status: 'COMPLETED' });
                          setShowReopenForm(false);
                        }}
                        style={{
                          padding: '6px 16px',
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
                      Priority: <strong style={{ color: '#09090b' }}>{req.priority}</strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {matchedWorkOrder && (
                      <button
                        onClick={() => setSelectedOrder(matchedWorkOrder)}
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
                        View Full Details
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Verification / Work Order Details Modal */}
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

    </div>
  );
}
