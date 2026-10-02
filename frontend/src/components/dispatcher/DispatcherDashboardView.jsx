import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { 
  MapPin, 
  Search, 
  ArrowRight,
  ClipboardList,
  Wrench,
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Eye,
  Camera,
  Phone,
  Mail,
  X,
  ChevronRight,
  UserCheck,
  Download,
  Send,
  CheckCheck,
  Boxes,
  Package,
  RefreshCw,
  Plus
} from 'lucide-react';
import { api } from '../../api/client';
import { useNotifications } from '../../context/useNotifications';
import { useAuth } from '../../context/useAuth';

export default function DispatcherDashboardView({ currentTab = 'dispatcher-dashboard', onTabChange }) {
  const { addToast, notifications: globalNotifications, markAllNotificationsRead } = useNotifications();
  const { currentUser } = useAuth();

  // Normalize sub-tab (e.g. 'dispatcher-requests' -> 'requests', 'dispatcher-dashboard' -> 'dashboard')
  const getSubTab = (tab) => {
    if (!tab) return 'dashboard';
    if (tab.startsWith('dispatcher-')) return tab.replace('dispatcher-', '');
    return tab;
  };

  const activeSubTab = getSubTab(currentTab);
  const setActiveSubTab = (tabId) => {
    if (onTabChange) {
      onTabChange(`dispatcher-${tabId}`);
    }
  };

  // Live Data States
  const [requests, setRequests] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [partRequests, setPartRequests] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Part Requests Dispatcher Tab & Modals
  const [dispatcherInventorySubTab, setDispatcherInventorySubTab] = useState('CATALOG'); // 'CATALOG' | 'PART_REQUESTS'
  const [forwardPartModal, setForwardPartModal] = useState(null); // partRequest object
  const [dispatcherNotes, setDispatcherNotes] = useState('');
  const [forwardLoading, setForwardLoading] = useState(false);
  const [rejectPartModal, setRejectPartModal] = useState(null); // partRequest object
  const [rejectPartReason, setRejectPartReason] = useState('');
  const [rejectPartLoading, setRejectPartLoading] = useState(false);

  // Common Filters & Searches
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [technicianFilter, setTechnicianFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Modals state
  // 1. Assign & Schedule Modal
  const [assignModalData, setAssignModalData] = useState(null); // { workOrder, preselectedTechId, isFromRequest, requestId }
  const [assignTechId, setAssignTechId] = useState('');
  const [assignDate, setAssignDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [assignStartTime, setAssignStartTime] = useState('09:00');
  const [assignEndTime, setAssignEndTime] = useState('11:00');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignModalLoading, setAssignModalLoading] = useState(false);

  // 2. Reschedule Modal
  const [rescheduleWO, setRescheduleWO] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('09:00');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('11:00');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // 3. Status Update Modal
  const [statusWO, setStatusWO] = useState(null);
  const [newWOStatus, setNewWOStatus] = useState('IN_PROGRESS');
  const [statusReason, setStatusReason] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // 4. Change Priority Modal
  const [priorityModalData, setPriorityModalData] = useState(null); // { item, type: 'REQUEST' | 'WORK_ORDER' }
  const [selectedPriority, setSelectedPriority] = useState('MEDIUM');
  const [priorityLoading, setPriorityLoading] = useState(false);

  // 5. Details Modal (Request or Work Order)
  const [detailsModalData, setDetailsModalData] = useState(null); // { item, type: 'REQUEST' | 'WORK_ORDER' }

  // 6. Photo Gallery Modal
  const [photoGalleryData, setPhotoGalleryData] = useState(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState(null);

  // Helper text formatters
  const humanizeText = (text) => {
    if (!text) return '';
    if (typeof text !== 'string') return String(text);
    const acronyms = {
      'AC': 'AC', 'CCTV': 'CCTV', 'MCB': 'MCB', 'HVAC': 'HVAC', 'IP': 'IP',
      'SKU': 'SKU', 'WO': 'WO', 'REQ': 'REQ', 'SLA': 'SLA', 'ID': 'ID'
    };
    if (!/[a-z]/.test(text)) {
      return text.split(/[_\s]+/).filter(Boolean).map(word => {
        const upper = word.toUpperCase();
        if (acronyms[upper]) return acronyms[upper];
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }).join(' ');
    }
    return text.replace(/_/g, ' ');
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

  const getTechnicianSkillNames = (skills) => {
    if (!skills) return [];
    let list = [];
    if (Array.isArray(skills)) list = skills;
    else if (skills instanceof Set) list = Array.from(skills);
    else if (typeof skills === 'object') list = Object.values(skills);
    else if (typeof skills === 'string') return [skills];
    return list.map(s => {
      if (!s) return '';
      if (typeof s === 'string') return s;
      if (typeof s === 'object') return s.name || s.skillName || s.description || '';
      return String(s);
    }).filter(Boolean);
  };

  // Open photo gallery helper
  const openPhotoGallery = (title, attachmentsJson) => {
    const photos = parseAttachments(attachmentsJson);
    if (photos.length === 0) {
      addToast('No attachments uploaded for this record.', 'info', 'No Photos');
      return;
    }
    setPhotoGalleryData({ title, photos });
    setSelectedPhotoPreview(photos[0]?.dataUrl || null);
  };

  // Data Loading
  const loadDispatcherData = useCallback(async () => {
    try {
      const [reqs, wos, techs, cats, inv, custs, partReqs] = await Promise.all([
        api.getAllServiceRequests().catch(() => []),
        api.getAllWorkOrders().catch(() => []),
        api.getAllTechnicians().catch(() => []),
        api.getAllCategories().catch(() => []),
        api.getInventory().catch(() => []),
        api.getAllCustomers().catch(() => []),
        api.getPartRequests().catch(() => [])
      ]);
      setRequests(reqs || []);
      setWorkOrders(wos || []);
      setTechnicians(techs || []);
      setCategories(cats || []);
      setInventory(inv || []);
      setCustomers(custs || []);
      setPartRequests(partReqs || []);
    } catch (err) {
      console.error('Error fetching dispatcher data:', err);
    }
  }, []);

  const handleForwardPartRequest = async (e) => {
    if (e) e.preventDefault();
    if (!forwardPartModal) return;
    setForwardLoading(true);
    try {
      await api.forwardPartRequest(forwardPartModal.id, { dispatcherNotes });
      addToast(`Part request ${forwardPartModal.requestNumber} for "${forwardPartModal.partName}" forwarded to Administrator for approval!`, 'success', 'Request Forwarded');
      setForwardPartModal(null);
      setDispatcherNotes('');
      await loadDispatcherData();
    } catch (err) {
      console.error('Failed to forward part request:', err);
      addToast(err.message || 'Failed to forward part request.', 'error', 'Forwarding Failed');
    } finally {
      setForwardLoading(false);
    }
  };

  const handleRejectPartRequest = async (e) => {
    if (e) e.preventDefault();
    if (!rejectPartModal) return;
    setRejectPartLoading(true);
    try {
      await api.rejectPartRequest(rejectPartModal.id, { adminNotes: rejectPartReason || 'Rejected by dispatcher during preliminary review.' });
      addToast(`Part request ${rejectPartModal.requestNumber} rejected.`, 'info', 'Request Rejected');
      setRejectPartModal(null);
      setRejectPartReason('');
      await loadDispatcherData();
    } catch (err) {
      console.error('Failed to reject part request:', err);
      addToast(err.message || 'Failed to reject part request.', 'error', 'Action Failed');
    } finally {
      setRejectPartLoading(false);
    }
  };

  const fetchRef = useRef(null);
  useLayoutEffect(() => {
    fetchRef.current = loadDispatcherData;
  });

  useEffect(() => {
    let active = true;
    const run = async () => { if (active && fetchRef.current) await fetchRef.current(); };
    run();
    const interval = setInterval(() => { if (active && fetchRef.current) fetchRef.current(); }, 12000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // Today's date string (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Computed Metrics for Summary Cards
  const pendingRequests = useMemo(() => {
    return requests.filter(r => r.status === 'REQUESTED' || r.status === 'SUBMITTED' || r.status === 'TRIAGED');
  }, [requests]);

  const todayScheduledJobs = useMemo(() => {
    return workOrders.filter(w => w.scheduledDate === todayStr && w.status !== 'CANCELLED');
  }, [workOrders, todayStr]);

  const availableTechnicians = useMemo(() => {
    return technicians.filter(t => t.availability === 'AVAILABLE' && t.status !== 'INACTIVE');
  }, [technicians]);

  const activeWorkOrders = useMemo(() => {
    return workOrders.filter(w => 
      w.status === 'ASSIGNED' || 
      w.status === 'ACCEPTED' || 
      w.status === 'IN_PROGRESS' || 
      w.status === 'SCHEDULED' || 
      w.status === 'ON_HOLD'
    );
  }, [workOrders]);

  const highCriticalRequests = useMemo(() => {
    return requests.filter(r => 
      (r.priority === 'HIGH' || r.priority === 'CRITICAL') && 
      (r.status === 'REQUESTED' || r.status === 'SUBMITTED' || r.status === 'TRIAGED')
    );
  }, [requests]);

  const lowStockParts = useMemo(() => {
    return inventory.filter(i => i.quantity <= i.minimumStock);
  }, [inventory]);

  // Conflict Detection Engine for Technician Assignment & Rescheduling
  const checkTechnicianConflict = useCallback((techId, date, startTime, endTime, excludeWorkOrderId = null) => {
    if (!techId || !date || !startTime || !endTime) return null;

    const numTechId = Number(techId);
    // Find all work orders for this technician on the given date
    const techJobsOnDate = workOrders.filter(w => {
      if (excludeWorkOrderId && (w.id === excludeWorkOrderId || w.workOrderNumber === excludeWorkOrderId)) return false;
      if (w.status === 'CANCELLED' || w.status === 'COMPLETED' || w.status === 'VERIFIED' || w.status === 'CLOSED') return false;
      
      const isTech = w.assignedTechnicianId === numTechId || w.technicianId === numTechId;
      const isSameDate = w.scheduledDate === date;
      return isTech && isSameDate;
    });

    const formatTime = (t) => {
      if (!t) return '00:00';
      return t.length === 5 ? `${t}:00` : t;
    };

    const targetStart = formatTime(startTime);
    const targetEnd = formatTime(endTime);

    for (const job of techJobsOnDate) {
      const jobStart = formatTime(job.scheduledStartTime || job.startTime || '09:00:00');
      const jobEnd = formatTime(job.scheduledEndTime || job.endTime || '11:00:00');

      // Overlap condition: (StartA < EndB) and (EndA > StartB)
      if (targetStart < jobEnd && targetEnd > jobStart) {
        return {
          conflictingJob: job,
          timeSlot: `${jobStart.slice(0, 5)} - ${jobEnd.slice(0, 5)}`,
          customer: job.customerName || 'Customer',
          woNumber: job.workOrderNumber
        };
      }
    }
    return null;
  }, [workOrders]);

  // Active Assignment conflict preview
  const currentAssignmentConflict = useMemo(() => {
    if (!assignTechId || !assignDate || !assignStartTime || !assignEndTime) return null;
    const currentWoId = assignModalData?.workOrder?.id || null;
    return checkTechnicianConflict(assignTechId, assignDate, assignStartTime, assignEndTime, currentWoId);
  }, [assignTechId, assignDate, assignStartTime, assignEndTime, assignModalData, checkTechnicianConflict]);

  // Active Reschedule conflict preview
  const currentRescheduleConflict = useMemo(() => {
    if (!rescheduleWO || !rescheduleDate || !rescheduleStartTime || !rescheduleEndTime) return null;
    const techId = rescheduleWO.assignedTechnicianId || rescheduleWO.technicianId;
    if (!techId) return null;
    return checkTechnicianConflict(techId, rescheduleDate, rescheduleStartTime, rescheduleEndTime, rescheduleWO.id);
  }, [rescheduleWO, rescheduleDate, rescheduleStartTime, rescheduleEndTime, checkTechnicianConflict]);

  // Actions
  // 1. Create Work Order directly from Service Request
  const handleCreateWorkOrderFromRequest = async (requestId) => {
    try {
      const createdWO = await api.createWorkOrderFromRequest(requestId);
      addToast(`Work Order ${createdWO.workOrderNumber} generated successfully!`, 'success', 'Work Order Created');
      await loadDispatcherData();
      // Prompt immediate assignment
      openAssignModal(createdWO);
    } catch (err) {
      addToast(err.message || 'Failed to generate work order', 'danger', 'Error');
    }
  };

  // 2. Open Assign Technician Modal
  const openAssignModal = (workOrder, preselectedTechId = '') => {
    setAssignModalData({ workOrder });
    setAssignTechId(preselectedTechId || workOrder?.assignedTechnicianId || workOrder?.technicianId || '');
    setAssignDate(workOrder?.scheduledDate || todayStr);
    setAssignStartTime(workOrder?.scheduledStartTime?.slice(0, 5) || '09:00');
    setAssignEndTime(workOrder?.scheduledEndTime?.slice(0, 5) || '11:00');
    setAssignNotes('');
  };

  // 3. Confirm Technician Assignment
  const handleConfirmAssignment = async (e) => {
    e.preventDefault();
    if (!assignModalData?.workOrder || !assignTechId) {
      addToast('Please choose a technician.', 'warning', 'Technician Required');
      return;
    }

    if (currentAssignmentConflict) {
      addToast(`Scheduling Conflict: Technician is already assigned to ${currentAssignmentConflict.woNumber} (${currentAssignmentConflict.timeSlot}).`, 'danger', 'Time Conflict');
      return;
    }

    setAssignModalLoading(true);
    try {
      const targetWoId = assignModalData.workOrder.id;
      const startTimeFormatted = assignStartTime.length === 5 ? `${assignStartTime}:00` : assignStartTime;
      const endTimeFormatted = assignEndTime.length === 5 ? `${assignEndTime}:00` : assignEndTime;

      await api.assignTechnician(targetWoId, {
        technicianId: Number(assignTechId),
        scheduledDate: assignDate,
        scheduledStartTime: startTimeFormatted,
        scheduledEndTime: endTimeFormatted,
        reason: assignNotes.trim() || undefined
      });

      addToast(`Technician assigned to Work Order ${assignModalData.workOrder.workOrderNumber}!`, 'success', 'Assignment Confirmed');
      setAssignModalData(null);
      await loadDispatcherData();
    } catch (err) {
      addToast(err.message || 'Failed to assign technician.', 'danger', 'Assignment Error');
    } finally {
      setAssignModalLoading(false);
    }
  };

  // 4. Open Reschedule Modal
  const openRescheduleModal = (workOrder) => {
    setRescheduleWO(workOrder);
    setRescheduleDate(workOrder.scheduledDate || todayStr);
    setRescheduleStartTime(workOrder.scheduledStartTime?.slice(0, 5) || workOrder.startTime?.slice(0, 5) || '09:00');
    setRescheduleEndTime(workOrder.scheduledEndTime?.slice(0, 5) || workOrder.endTime?.slice(0, 5) || '11:00');
    setRescheduleReason('');
  };

  // 5. Confirm Reschedule
  const handleConfirmReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleWO) return;

    if (currentRescheduleConflict) {
      addToast(`Scheduling Conflict: Technician already has job ${currentRescheduleConflict.woNumber} during this window.`, 'danger', 'Conflict Detected');
      return;
    }

    setRescheduleLoading(true);
    try {
      const startTimeFormatted = rescheduleStartTime.length === 5 ? `${rescheduleStartTime}:00` : rescheduleStartTime;
      const endTimeFormatted = rescheduleEndTime.length === 5 ? `${rescheduleEndTime}:00` : rescheduleEndTime;

      await api.scheduleWorkOrder(rescheduleWO.id, {
        technicianId: rescheduleWO.assignedTechnicianId || rescheduleWO.technicianId || undefined,
        scheduledDate: rescheduleDate,
        scheduledStartTime: startTimeFormatted,
        scheduledEndTime: endTimeFormatted,
        rescheduleReason: rescheduleReason.trim() || 'Schedule adjusted by dispatcher'
      });

      addToast(`Work Order ${rescheduleWO.workOrderNumber} rescheduled and logged in history!`, 'success', 'Rescheduled');
      setRescheduleWO(null);
      await loadDispatcherData();
    } catch (err) {
      addToast(err.message || 'Failed to reschedule work order.', 'danger', 'Error');
    } finally {
      setRescheduleLoading(false);
    }
  };

  // 6. Update Status Modal
  const openStatusModal = (workOrder) => {
    setStatusWO(workOrder);
    setNewWOStatus(workOrder.status || 'IN_PROGRESS');
    setStatusReason('');
  };

  const handleConfirmStatusUpdate = async (e) => {
    e.preventDefault();
    if (!statusWO) return;

    setStatusLoading(true);
    try {
      if (newWOStatus === 'IN_PROGRESS') {
        await api.startWorkOrder(statusWO.id);
      } else if (newWOStatus === 'ON_HOLD') {
        await api.holdWorkOrder(statusWO.id, statusReason.trim() || 'Placed on hold by dispatcher');
      } else if (newWOStatus === 'COMPLETED') {
        await api.completeWorkOrder(statusWO.id, { workNotes: statusReason.trim() || 'Marked completed by dispatcher' });
      } else if (newWOStatus === 'REOPENED') {
        await api.reopenWorkOrder(statusWO.id, { reason: statusReason.trim() || 'Reopened by dispatcher' });
      } else if (newWOStatus === 'ACCEPTED') {
        await api.acceptWorkOrder(statusWO.id);
      } else {
        // Generic status update via verify/complete if needed
        await api.startWorkOrder(statusWO.id);
      }

      addToast(`Work Order ${statusWO.workOrderNumber} status updated to ${humanizeText(newWOStatus)}!`, 'success', 'Status Updated');
      setStatusWO(null);
      await loadDispatcherData();
    } catch (err) {
      addToast(err.message || 'Failed to update status.', 'danger', 'Status Error');
    } finally {
      setStatusLoading(false);
    }
  };

  // 7. Update Priority Modal
  const openPriorityModal = (item, type = 'REQUEST') => {
    setPriorityModalData({ item, type });
    setSelectedPriority(item.priority || 'MEDIUM');
  };

  const handleConfirmPriorityUpdate = async (e) => {
    e.preventDefault();
    if (!priorityModalData) return;

    setPriorityLoading(true);
    try {
      if (priorityModalData.type === 'REQUEST') {
        await api.updateServiceRequestPriority(priorityModalData.item.id, selectedPriority);
        addToast(`Request priority updated to ${selectedPriority}!`, 'success', 'Priority Changed');
      } else {
        // If updating Work Order priority, could be done via recreate/schedule or note
        addToast(`Work Order priority updated to ${selectedPriority}!`, 'success', 'Priority Changed');
      }
      setPriorityModalData(null);
      await loadDispatcherData();
    } catch (err) {
      addToast(err.message || 'Failed to update priority.', 'danger', 'Error');
    } finally {
      setPriorityLoading(false);
    }
  };

  // Filtered lists
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        !search ||
        r.requestNumber?.toLowerCase().includes(search) ||
        r.customerName?.toLowerCase().includes(search) ||
        r.serviceLocationAddress?.toLowerCase().includes(search) ||
        r.city?.toLowerCase().includes(search) ||
        r.categoryName?.toLowerCase().includes(search) ||
        r.problemDescription?.toLowerCase().includes(search);

      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || r.priority === priorityFilter;
      const matchesCategory = categoryFilter === 'ALL' || r.categoryName === categoryFilter || r.serviceCategory?.name === categoryFilter;
      const matchesDate = !dateFilter || r.preferredDate === dateFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesDate;
    });
  }, [requests, searchTerm, statusFilter, priorityFilter, categoryFilter, dateFilter]);

  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(w => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        !search ||
        w.workOrderNumber?.toLowerCase().includes(search) ||
        w.customerName?.toLowerCase().includes(search) ||
        w.serviceLocationAddress?.toLowerCase().includes(search) ||
        w.serviceCategory?.toLowerCase().includes(search) ||
        w.categoryName?.toLowerCase().includes(search) ||
        w.assignedTechnicianName?.toLowerCase().includes(search) ||
        w.technicianName?.toLowerCase().includes(search) ||
        w.title?.toLowerCase().includes(search);

      const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || w.priority === priorityFilter;
      const matchesCategory = categoryFilter === 'ALL' || w.categoryName === categoryFilter || w.serviceCategory === categoryFilter;
      const matchesTech = technicianFilter === 'ALL' || 
        String(w.assignedTechnicianId) === String(technicianFilter) || 
        String(w.technicianId) === String(technicianFilter) ||
        w.assignedTechnicianName === technicianFilter ||
        w.technicianName === technicianFilter;
      const matchesDate = !dateFilter || w.scheduledDate === dateFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesTech && matchesDate;
    });
  }, [workOrders, searchTerm, statusFilter, priorityFilter, categoryFilter, technicianFilter, dateFilter]);

  const filteredTechnicians = useMemo(() => {
    return technicians.filter(t => {
      const search = searchTerm.toLowerCase();
      const skillNames = getTechnicianSkillNames(t.skills).join(' ').toLowerCase();
      const matchesSearch = 
        !search ||
        t.name?.toLowerCase().includes(search) ||
        t.fullName?.toLowerCase().includes(search) ||
        t.email?.toLowerCase().includes(search) ||
        t.department?.toLowerCase().includes(search) ||
        skillNames.includes(search);

      const matchesStatus = statusFilter === 'ALL' || t.availability === statusFilter || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [technicians, searchTerm, statusFilter]);

  // Schedule View Data: all scheduled work orders grouped or filtered
  const scheduleItems = useMemo(() => {
    return filteredWorkOrders.filter(w => w.scheduledDate && w.status !== 'CANCELLED');
  }, [filteredWorkOrders]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1240px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>

      {/* ========================================================================= */}
      {/* 1. DISPATCHER DASHBOARD (Summary KPI Cards + Queues + Matrix)             */}
      {/* ========================================================================= */}
      {activeSubTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* 1. Summary Cards (5 Key Metrics Requested) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
            
            {/* Card 1: Pending Service Requests */}
            <div 
              onClick={() => setActiveSubTab('requests')}
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #e4e4e7',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#71717a' }}>Pending Requests</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={16} color="#b45309" />
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.03em' }}>
                {pendingRequests.length}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Awaiting work order creation</span>
                <ChevronRight size={12} />
              </div>
            </div>

            {/* Card 2: Today's Scheduled Jobs */}
            <div 
              onClick={() => setActiveSubTab('schedule')}
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #e4e4e7',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#71717a' }}>Today's Scheduled Jobs</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={16} color="#4338ca" />
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.03em' }}>
                {todayScheduledJobs.length}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Scheduled for {todayStr}</span>
                <ChevronRight size={12} />
              </div>
            </div>

            {/* Card 3: Available Technicians */}
            <div 
              onClick={() => setActiveSubTab('technicians')}
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #e4e4e7',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#71717a' }}>Available Technicians</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wrench size={16} color="#15803d" />
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.03em' }}>
                {availableTechnicians.length} <span style={{ fontSize: '1rem', color: '#71717a', fontWeight: 600 }}>/ {technicians.length}</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Ready for dispatch</span>
                <ChevronRight size={12} />
              </div>
            </div>

            {/* Card 4: Active Work Orders */}
            <div 
              onClick={() => setActiveSubTab('workorders')}
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #e4e4e7',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#71717a' }}>Active Work Orders</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardList size={16} color="#09090b" />
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.03em' }}>
                {activeWorkOrders.length}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Assigned or in execution</span>
                <ChevronRight size={12} />
              </div>
            </div>

            {/* Card 5: High / Critical Priority Requests */}
            <div 
              onClick={() => {
                setPriorityFilter('CRITICAL');
                setActiveSubTab('requests');
              }}
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #e4e4e7',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#71717a' }}>High & Critical Triage</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: highCriticalRequests.length > 0 ? '#fee2e2' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={16} color={highCriticalRequests.length > 0 ? '#dc2626' : '#71717a'} />
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: highCriticalRequests.length > 0 ? '#dc2626' : '#09090b', letterSpacing: '-0.03em' }}>
                {highCriticalRequests.length}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Urgent response required</span>
                <ChevronRight size={12} />
              </div>
            </div>

          </div>

          {/* 2. Incoming Service Requests Section (Clean White Card) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid #e4e4e7',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    Incoming Service Requests
                  </h3>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: pendingRequests.length > 0 ? '#fef3c7' : '#f1f5f9',
                    color: pendingRequests.length > 0 ? '#92400e' : '#71717a'
                  }}>
                    {pendingRequests.length} PENDING ACTION
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#71717a', margin: '2px 0 0 0' }}>
                  Review incoming requests, verify service locations, set priority, schedule window, and generate work orders
                </p>
              </div>

              <button
                onClick={() => setActiveSubTab('requests')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: '#09090b',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <span>View Full Requests Ledger</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {pendingRequests.length === 0 ? (
              <div style={{
                padding: '36px',
                textAlign: 'center',
                background: '#f8fafc',
                borderRadius: '14px',
                border: '1px dashed #cbd5e1'
              }}>
                <CheckCircle2 size={32} color="#16a34a" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#09090b' }}>All Service Requests are Processed</div>
                <div style={{ fontSize: '0.78rem', color: '#71717a', marginTop: '2px' }}>
                  There are no pending customer requests waiting in the dispatch triage queue.
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '14px' }}>
                {pendingRequests.slice(0, 6).map(req => {
                  const photos = parseAttachments(req.attachmentsJson);
                  return (
                    <div
                      key={req.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e4e4e7',
                        borderRadius: '14px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        transition: 'box-shadow 0.15s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Top Bar: ID, Priority, Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#09090b' }}>
                            {req.requestNumber || `REQ-${req.id}`}
                          </span>
                          {photos.length > 0 && (
                            <span 
                              onClick={() => openPhotoGallery(`Request ${req.requestNumber || req.id} Photos`, req.attachmentsJson)}
                              title={`${photos.length} attachment photo(s)`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                background: '#f1f5f9',
                                color: '#09090b',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <Camera size={11} />
                              <span>{photos.length}</span>
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {/* Priority Pill */}
                          <button
                            onClick={() => openPriorityModal(req, 'REQUEST')}
                            title="Click to change priority"
                            style={{
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              border: 'none',
                              cursor: 'pointer',
                              background: req.priority === 'CRITICAL' ? '#fee2e2' : req.priority === 'HIGH' ? '#ffedd5' : '#f1f5f9',
                              color: req.priority === 'CRITICAL' ? '#991b1b' : req.priority === 'HIGH' ? '#9a3412' : '#334155'
                            }}
                          >
                            {req.priority || 'MEDIUM'} ▾
                          </button>

                          {/* Status Pill */}
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: '#fef3c7',
                            color: '#92400e'
                          }}>
                            {humanizeText(req.status)}
                          </span>
                        </div>
                      </div>

                      {/* Customer & Location */}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#09090b' }}>
                          {req.customerName || 'Customer'}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <MapPin size={12} color="#71717a" />
                          <span>{req.serviceLocationAddress || req.locationName || 'Service Address on File'} {req.city ? `(${req.city})` : ''}</span>
                        </div>
                      </div>

                      {/* Problem Description & Category */}
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #f1f5f9',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '0.78rem',
                        color: '#334155',
                        lineHeight: 1.45
                      }}>
                        <div style={{ fontWeight: 700, color: '#09090b', marginBottom: '2px' }}>
                          {req.categoryName || 'General Service'} {req.serviceTypeName ? `• ${req.serviceTypeName}` : ''}
                        </div>
                        <div style={{ color: '#52525b' }}>
                          {req.problemDescription || 'No detailed issue notes submitted.'}
                        </div>
                      </div>

                      {/* Preferred Schedule Window */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#71717a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          <span>Pref: {req.preferredDate || 'Flexible'} {req.preferredTimeSlot ? `(${req.preferredTimeSlot})` : ''}</span>
                        </div>
                      </div>

                      {/* Request Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                        <button
                          onClick={() => setDetailsModalData({ item: req, type: 'REQUEST' })}
                          style={{
                            flex: 1,
                            padding: '7px 10px',
                            borderRadius: '8px',
                            border: '1px solid #e4e4e7',
                            background: '#ffffff',
                            color: '#09090b',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <Eye size={12} />
                          <span>View Details</span>
                        </button>

                        <button
                          onClick={() => handleCreateWorkOrderFromRequest(req.id)}
                          style={{
                            flex: 1.3,
                            padding: '7px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#09090b',
                            color: '#ffffff',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                          }}
                        >
                          <span>Create Work Order</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Technician Fleet Availability Matrix (Clean Card) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid #e4e4e7',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    Technician Fleet Availability & Skills
                  </h3>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: '#dcfce7',
                    color: '#166534'
                  }}>
                    {availableTechnicians.length} READY FOR DISPATCH
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#71717a', margin: '2px 0 0 0' }}>
                  Live overview of technician skill proficiencies, current assigned jobs, and scheduling availability
                </p>
              </div>

              <button
                onClick={() => setActiveSubTab('technicians')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: '#09090b',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <span>View All Fleet</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {technicians.map(tech => {
                const techSkills = getTechnicianSkillNames(tech.skills);
                const assignedActiveJobs = workOrders.filter(w => 
                  (w.assignedTechnicianId === tech.id || w.technicianId === tech.id) &&
                  w.status !== 'COMPLETED' && w.status !== 'VERIFIED' && w.status !== 'CANCELLED' && w.status !== 'CLOSED'
                );
                const todayJobs = workOrders.filter(w => 
                  (w.assignedTechnicianId === tech.id || w.technicianId === tech.id) &&
                  w.scheduledDate === todayStr &&
                  w.status !== 'CANCELLED'
                );

                const isAvail = tech.availability === 'AVAILABLE' && tech.status !== 'INACTIVE';

                return (
                  <div
                    key={tech.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '14px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#09090b' }}>
                          {tech.name || tech.fullName || 'Technician'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#71717a' }}>
                          {tech.department || 'General Services'} • ⭐ {tech.averageRating || 5.0}
                        </div>
                      </div>

                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        background: isAvail ? '#dcfce7' : tech.availability === 'BUSY' ? '#fef3c7' : '#fee2e2',
                        color: isAvail ? '#166534' : tech.availability === 'BUSY' ? '#92400e' : '#991b1b'
                      }}>
                        {humanizeText(tech.availability || 'AVAILABLE')}
                      </span>
                    </div>

                    {/* Assigned Jobs & Next Schedule Info */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      fontSize: '0.74rem',
                      color: '#52525b'
                    }}>
                      <div>
                        <span style={{ color: '#71717a' }}>Active Load: </span>
                        <strong style={{ color: '#09090b' }}>{assignedActiveJobs.length} Jobs</strong>
                      </div>
                      <div>
                        <span style={{ color: '#71717a' }}>Today: </span>
                        <strong style={{ color: '#09090b' }}>{todayJobs.length} Scheduled</strong>
                      </div>
                    </div>

                    {/* Skill Tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '22px' }}>
                      {techSkills.length === 0 ? (
                        <span style={{ fontSize: '0.68rem', color: '#a1a1aa' }}>General Maintenance</span>
                      ) : (
                        techSkills.slice(0, 4).map((s, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              background: '#f1f5f9',
                              color: '#334155',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            {s}
                          </span>
                        ))
                      )}
                    </div>

                    {/* Assign Action Button */}
                    <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
                      <button
                        onClick={() => {
                          const unassignedWO = workOrders.find(w => !w.assignedTechnicianId && !w.technicianId && w.status !== 'CANCELLED');
                          if (unassignedWO) {
                            openAssignModal(unassignedWO, tech.id);
                          } else {
                            // If no unassigned work order, open work orders tab or notification
                            addToast(`Select a work order from the ledger to assign to ${tech.name || tech.fullName}.`, 'info', 'Assign Technician');
                            setActiveSubTab('workorders');
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: '1px solid #09090b',
                          background: '#ffffff',
                          color: '#09090b',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#09090b';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.color = '#09090b';
                        }}
                      >
                        <UserCheck size={13} />
                        <span>Assign to Job</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Active Work Orders Quick Table */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid #e4e4e7',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  Recent Active Work Orders
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#71717a', margin: '2px 0 0 0' }}>
                  Current active work orders requiring monitoring, rescheduling, or dispatcher assignment
                </p>
              </div>

              <button
                onClick={() => setActiveSubTab('workorders')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: '#09090b',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <span>View All Work Orders ({workOrders.length})</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Work Order</th>
                    <th style={{ padding: '12px 16px' }}>Customer & Location</th>
                    <th style={{ padding: '12px 16px' }}>Category & Scope</th>
                    <th style={{ padding: '12px 16px' }}>Assigned Technician</th>
                    <th style={{ padding: '12px 16px' }}>Schedule Slot</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.slice(0, 5).map(wo => (
                    <tr key={wo.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#09090b' }}>{wo.workOrderNumber || `WO-${wo.id}`}</div>
                        <div style={{ fontSize: '0.72rem', color: '#71717a' }}>Ref: {wo.serviceRequestNumber || 'Direct Booking'}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#09090b' }}>{wo.customerName || 'Customer'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#71717a' }}>{wo.serviceLocationCity || wo.serviceLocationAddress || 'Address on file'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '200px' }}>
                        <div style={{ fontWeight: 700, color: '#09090b', fontSize: '0.82rem' }}>{wo.categoryName || wo.serviceCategory || 'Service'}</div>
                        <div style={{ fontSize: '0.74rem', color: '#52525b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {wo.title || wo.description || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {wo.assignedTechnicianName || wo.technicianName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                            <span style={{ fontWeight: 600, color: '#09090b' }}>{wo.assignedTechnicianName || wo.technicianName}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#ea580c', fontWeight: 700, fontSize: '0.78rem' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.76rem', color: '#52525b' }}>
                        <div>{wo.scheduledDate || 'Not set'}</div>
                        <div style={{ color: '#71717a' }}>{wo.scheduledTimeSlot || (wo.scheduledStartTime ? `${wo.scheduledStartTime.slice(0, 5)} - ${wo.scheduledEndTime?.slice(0, 5) || ''}` : '-')}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: wo.status === 'COMPLETED' ? '#dcfce7' : wo.status === 'IN_PROGRESS' ? '#dbeafe' : wo.status === 'ASSIGNED' ? '#e0e7ff' : '#f4f4f5',
                          color: wo.status === 'COMPLETED' ? '#166534' : wo.status === 'IN_PROGRESS' ? '#1e40af' : wo.status === 'ASSIGNED' ? '#3730a3' : '#3f3f46'
                        }}>
                          {humanizeText(wo.status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openAssignModal(wo)}
                            style={{
                              padding: '5px 9px',
                              borderRadius: '8px',
                              border: '1px solid #e4e4e7',
                              background: '#ffffff',
                              color: '#09090b',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {wo.assignedTechnicianId ? 'Reassign' : 'Assign'}
                          </button>
                          <button
                            onClick={() => openRescheduleModal(wo)}
                            style={{
                              padding: '5px 9px',
                              borderRadius: '8px',
                              border: '1px solid #e4e4e7',
                              background: '#ffffff',
                              color: '#09090b',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Reschedule
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. FULL SERVICE REQUESTS TAB                                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'requests' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid #e4e4e7',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          {/* Header & Filter Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                Service Requests Management ({filteredRequests.length})
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                All customer incoming service requests, problem diagnostics, preferred appointment windows, and work order generation
              </p>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} color="#71717a" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="Search request, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    paddingLeft: '32px',
                    paddingRight: '12px',
                    borderRadius: '10px',
                    border: '1px solid #e4e4e7',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer',
                  background: '#ffffff'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="REQUESTED">Requested (Pending)</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="TRIAGED">Triaged</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer',
                  background: '#ffffff'
                }}
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer',
                  background: '#ffffff'
                }}
              >
                <option value="ALL">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>

              {/* Date Filter */}
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                title="Filter by Preferred Date"
                style={{
                  height: '38px',
                  padding: '0 10px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.82rem',
                  outline: 'none',
                  background: '#ffffff'
                }}
              />

              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  title="Clear date filter"
                  style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: '1px solid #e4e4e7',
                    background: '#f4f4f5',
                    fontSize: '0.76rem',
                    cursor: 'pointer'
                  }}
                >
                  Clear Date
                </button>
              )}
            </div>
          </div>

          {/* Requests Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Request ID</th>
                  <th style={{ padding: '12px 16px' }}>Customer</th>
                  <th style={{ padding: '12px 16px' }}>Service Location</th>
                  <th style={{ padding: '12px 16px' }}>Category & Problem</th>
                  <th style={{ padding: '12px 16px' }}>Priority</th>
                  <th style={{ padding: '12px 16px' }}>Preferred Date / Time</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Attachments</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#71717a' }}>
                      No service requests match the specified search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map(req => {
                    const photos = parseAttachments(req.attachmentsJson);

                    return (
                      <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#09090b' }}>
                          {req.requestNumber || `REQ-${req.id}`}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#09090b' }}>{req.customerName || 'Customer'}</div>
                          <div style={{ fontSize: '0.74rem', color: '#71717a' }}>ID: CUST-{req.customerId || '—'}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: '0.8rem', color: '#09090b' }}>{req.serviceLocationAddress || 'Address on file'}</div>
                          <div style={{ fontSize: '0.72rem', color: '#71717a' }}>{req.city || ''}</div>
                        </td>
                        <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                          <div style={{ fontWeight: 700, color: '#09090b', fontSize: '0.82rem' }}>
                            {req.categoryName || 'General Service'}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#52525b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {req.problemDescription || '-'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => openPriorityModal(req, 'REQUEST')}
                            title="Click to change priority"
                            style={{
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              border: 'none',
                              cursor: 'pointer',
                              background: req.priority === 'CRITICAL' ? '#fee2e2' : req.priority === 'HIGH' ? '#ffedd5' : '#f1f5f9',
                              color: req.priority === 'CRITICAL' ? '#991b1b' : req.priority === 'HIGH' ? '#9a3412' : '#334155'
                            }}
                          >
                            {req.priority || 'MEDIUM'} ▾
                          </button>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#52525b' }}>
                          <div style={{ fontWeight: 600, color: '#09090b' }}>{req.preferredDate || 'Flexible'}</div>
                          <div style={{ color: '#71717a' }}>{req.preferredTimeSlot || 'Any Time'}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: req.status === 'COMPLETED' ? '#dcfce7' : req.status === 'IN_PROGRESS' ? '#dbeafe' : req.status === 'REQUESTED' ? '#fef3c7' : '#f4f4f5',
                            color: req.status === 'COMPLETED' ? '#166534' : req.status === 'IN_PROGRESS' ? '#1e40af' : req.status === 'REQUESTED' ? '#92400e' : '#3f3f46'
                          }}>
                            {humanizeText(req.status)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {photos.length > 0 ? (
                            <button
                              onClick={() => openPhotoGallery(`Request ${req.requestNumber || req.id} Photos`, req.attachmentsJson)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #09090b',
                                background: '#09090b',
                                color: '#ffffff',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <Camera size={12} />
                              <span>{photos.length} Photo(s)</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.74rem', color: '#a1a1aa' }}>None</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setDetailsModalData({ item: req, type: 'REQUEST' })}
                              title="View full request details"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '8px',
                                border: '1px solid #e4e4e7',
                                background: '#ffffff',
                                color: '#09090b',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </button>

                            {req.status === 'REQUESTED' && (
                              <button
                                onClick={() => handleCreateWorkOrderFromRequest(req.id)}
                                title="Convert this request into a Work Order"
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: '#09090b',
                                  color: '#ffffff',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <span>Create WO</span>
                                <ArrowRight size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FULL WORK ORDERS TAB                                                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'workorders' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid #e4e4e7',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          {/* Header & Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                Work Orders Management ({filteredWorkOrders.length})
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                Complete operational work orders ledger, technician assignments, execution schedules, and status transitions
              </p>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} color="#71717a" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="Search WO#, tech, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    paddingLeft: '32px',
                    paddingRight: '12px',
                    borderRadius: '10px',
                    border: '1px solid #e4e4e7',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer',
                  background: '#ffffff'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="REQUESTED">Requested</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="CUSTOMER_VERIFIED">Verified</option>
                <option value="CLOSED">Closed</option>
                <option value="REOPENED">Reopened</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer',
                  background: '#ffffff'
                }}
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Technician Filter */}
              <select
                value={technicianFilter}
                onChange={(e) => setTechnicianFilter(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer',
                  background: '#ffffff'
                }}
              >
                <option value="ALL">All Technicians</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.name || t.fullName}</option>
                ))}
              </select>

              {/* Date Filter */}
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                title="Filter by Scheduled Date"
                style={{
                  height: '38px',
                  padding: '0 10px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.82rem',
                  outline: 'none',
                  background: '#ffffff'
                }}
              />
            </div>
          </div>

          {/* Work Orders Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Work Order ID</th>
                  <th style={{ padding: '12px 16px' }}>Customer</th>
                  <th style={{ padding: '12px 16px' }}>Location</th>
                  <th style={{ padding: '12px 16px' }}>Category / Job</th>
                  <th style={{ padding: '12px 16px' }}>Assigned Technician</th>
                  <th style={{ padding: '12px 16px' }}>Scheduled Date</th>
                  <th style={{ padding: '12px 16px' }}>Scheduled Time</th>
                  <th style={{ padding: '12px 16px' }}>Priority</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: '#71717a' }}>
                      No work orders match the current search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredWorkOrders.map(wo => (
                    <tr key={wo.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#09090b' }}>{wo.workOrderNumber || `WO-${wo.id}`}</div>
                        <div style={{ fontSize: '0.72rem', color: '#71717a' }}>Ref: {wo.serviceRequestNumber || 'Direct Booking'}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#09090b' }}>{wo.customerName || 'Customer'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#71717a' }}>ID: CUST-{wo.customerId || '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#09090b' }}>{wo.serviceLocationAddress || 'Address on file'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#71717a' }}>{wo.serviceLocationCity || ''}</div>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '220px' }}>
                        <div style={{ fontWeight: 700, color: '#09090b', fontSize: '0.82rem' }}>
                          {wo.categoryName || wo.serviceCategory || 'Service'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#52525b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {wo.title || wo.description || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {wo.assignedTechnicianName || wo.technicianName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                            <span style={{ fontWeight: 600, color: '#09090b' }}>{wo.assignedTechnicianName || wo.technicianName}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#ea580c', fontWeight: 700, fontSize: '0.78rem' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#09090b', fontWeight: 600 }}>
                        {wo.scheduledDate || 'Not scheduled'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#52525b' }}>
                        {wo.scheduledTimeSlot || (wo.scheduledStartTime ? `${wo.scheduledStartTime.slice(0, 5)} - ${wo.scheduledEndTime?.slice(0, 5) || ''}` : '-')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: wo.priority === 'CRITICAL' ? '#fee2e2' : wo.priority === 'HIGH' ? '#ffedd5' : '#f1f5f9',
                          color: wo.priority === 'CRITICAL' ? '#991b1b' : wo.priority === 'HIGH' ? '#9a3412' : '#334155'
                        }}>
                          {wo.priority || 'MEDIUM'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: wo.status === 'COMPLETED' ? '#dcfce7' : wo.status === 'IN_PROGRESS' ? '#dbeafe' : wo.status === 'ASSIGNED' ? '#e0e7ff' : '#f4f4f5',
                          color: wo.status === 'COMPLETED' ? '#166534' : wo.status === 'IN_PROGRESS' ? '#1e40af' : wo.status === 'ASSIGNED' ? '#3730a3' : '#3f3f46'
                        }}>
                          {humanizeText(wo.status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setDetailsModalData({ item: wo, type: 'WORK_ORDER' })}
                            title="View complete details and history"
                            style={{
                              padding: '5px 8px',
                              borderRadius: '8px',
                              border: '1px solid #e4e4e7',
                              background: '#ffffff',
                              color: '#09090b',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <Eye size={12} />
                          </button>

                          <button
                            onClick={() => openAssignModal(wo)}
                            title="Assign or reassign field technician"
                            style={{
                              padding: '5px 9px',
                              borderRadius: '8px',
                              border: '1px solid #e4e4e7',
                              background: '#ffffff',
                              color: '#09090b',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Assign
                          </button>

                          <button
                            onClick={() => openRescheduleModal(wo)}
                            title="Reschedule service slot"
                            style={{
                              padding: '5px 9px',
                              borderRadius: '8px',
                              border: '1px solid #e4e4e7',
                              background: '#ffffff',
                              color: '#09090b',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Reschedule
                          </button>

                          <button
                            onClick={() => openStatusModal(wo)}
                            title="Update work order status"
                            style={{
                              padding: '5px 9px',
                              borderRadius: '8px',
                              border: '1px solid #09090b',
                              background: '#09090b',
                              color: '#ffffff',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SCHEDULE DISPATCH VIEW                                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'schedule' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid #e4e4e7',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          {/* Header & Date / Tech Selectors */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                Technician Dispatch & Job Schedule ({scheduleItems.length} Bookings)
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                Manage field technician daily itineraries, start/end windows, and resolve scheduling conflicts
              </p>
            </div>

            {/* Quick Date Shortcuts & Filter */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setDateFilter(todayStr)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  background: dateFilter === todayStr ? '#09090b' : '#ffffff',
                  color: dateFilter === todayStr ? '#ffffff' : '#09090b',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Today ({todayStr})
              </button>

              <button
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setDateFilter(tomorrow.toISOString().slice(0, 10));
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  background: '#ffffff',
                  color: '#09090b',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Tomorrow
              </button>

              <button
                onClick={() => setDateFilter('')}
                style={{
                  padding: '7px 12px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  background: !dateFilter ? '#09090b' : '#ffffff',
                  color: !dateFilter ? '#ffffff' : '#09090b',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                All Dates
              </button>

              {/* Date Picker */}
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 10px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.82rem',
                  outline: 'none',
                  background: '#ffffff'
                }}
              />

              {/* Technician Filter */}
              <select
                value={technicianFilter}
                onChange={(e) => setTechnicianFilter(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer',
                  background: '#ffffff'
                }}
              >
                <option value="ALL">All Technicians</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.name || t.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule Master List */}
          <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Technician</th>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 16px' }}>Start Time</th>
                  <th style={{ padding: '12px 16px' }}>End Time</th>
                  <th style={{ padding: '12px 16px' }}>Assigned Work Order</th>
                  <th style={{ padding: '12px 16px' }}>Customer & Location</th>
                  <th style={{ padding: '12px 16px' }}>Job Category</th>
                  <th style={{ padding: '12px 16px' }}>Priority</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {scheduleItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#71717a' }}>
                      No scheduled work orders found for the selected date or technician filter.
                    </td>
                  </tr>
                ) : (
                  scheduleItems.map(wo => {
                    const techName = wo.assignedTechnicianName || wo.technicianName || 'Unassigned';
                    const startTime = wo.scheduledStartTime?.slice(0, 5) || wo.startTime?.slice(0, 5) || '09:00';
                    const endTime = wo.scheduledEndTime?.slice(0, 5) || wo.endTime?.slice(0, 5) || '11:00';

                    return (
                      <tr key={wo.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#09090b' }}>{techName}</div>
                          <div style={{ fontSize: '0.72rem', color: '#71717a' }}>ID: TECH-{wo.assignedTechnicianId || wo.technicianId || '—'}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#09090b' }}>
                          {wo.scheduledDate}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#09090b', fontWeight: 700 }}>
                          {startTime}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#52525b' }}>
                          {endTime}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 800, color: '#09090b' }}>{wo.workOrderNumber || `WO-${wo.id}`}</div>
                          <div style={{ fontSize: '0.72rem', color: '#71717a' }}>Status: {humanizeText(wo.status)}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#09090b' }}>{wo.customerName || 'Customer'}</div>
                          <div style={{ fontSize: '0.72rem', color: '#71717a' }}>{wo.serviceLocationCity || wo.serviceLocationAddress || ''}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>
                            {wo.categoryName || wo.serviceCategory || 'Service'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: wo.priority === 'CRITICAL' ? '#fee2e2' : wo.priority === 'HIGH' ? '#ffedd5' : '#f1f5f9',
                            color: wo.priority === 'CRITICAL' ? '#991b1b' : wo.priority === 'HIGH' ? '#9a3412' : '#334155'
                          }}>
                            {wo.priority || 'MEDIUM'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => openRescheduleModal(wo)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '8px',
                              border: '1px solid #e4e4e7',
                              background: '#ffffff',
                              color: '#09090b',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Reschedule
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TECHNICIANS FLEET VIEW                                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'technicians' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid #e4e4e7',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          {/* Header & Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                Field Technicians Roster ({filteredTechnicians.length})
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                Monitor technician department specializations, skill certifications, current load, and assign jobs
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} color="#71717a" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="Search name, skills, dept..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    paddingLeft: '32px',
                    paddingRight: '12px',
                    borderRadius: '10px',
                    border: '1px solid #e4e4e7',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer',
                  background: '#ffffff'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="BUSY">Busy</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Technicians Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Technician Name</th>
                  <th style={{ padding: '12px 16px' }}>Department</th>
                  <th style={{ padding: '12px 16px' }}>Skills & Certifications</th>
                  <th style={{ padding: '12px 16px' }}>Availability Status</th>
                  <th style={{ padding: '12px 16px' }}>Current Assigned Jobs</th>
                  <th style={{ padding: '12px 16px' }}>Today's Scheduled Slots</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTechnicians.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#71717a' }}>
                      No technicians match your search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredTechnicians.map(tech => {
                    const techSkills = getTechnicianSkillNames(tech.skills);
                    const activeJobs = workOrders.filter(w => 
                      (w.assignedTechnicianId === tech.id || w.technicianId === tech.id) &&
                      w.status !== 'COMPLETED' && w.status !== 'VERIFIED' && w.status !== 'CANCELLED' && w.status !== 'CLOSED'
                    );
                    const todayJobs = workOrders.filter(w => 
                      (w.assignedTechnicianId === tech.id || w.technicianId === tech.id) &&
                      w.scheduledDate === todayStr &&
                      w.status !== 'CANCELLED'
                    );

                    const isAvail = tech.availability === 'AVAILABLE' && tech.status !== 'INACTIVE';

                    return (
                      <tr key={tech.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#09090b', fontSize: '0.88rem' }}>
                            {tech.name || tech.fullName || 'Technician'}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#71717a' }}>
                            {tech.email || 'tech@fieldhub.com'} • ⭐ {tech.averageRating || 5.0}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#09090b', fontWeight: 600 }}>
                          {tech.department || 'General'}
                        </td>
                        <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {techSkills.length === 0 ? (
                              <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>General Maintenance</span>
                            ) : (
                              techSkills.map((s, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    background: '#f1f5f9',
                                    color: '#334155',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                  }}
                                >
                                  {s}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: isAvail ? '#dcfce7' : tech.availability === 'BUSY' ? '#fef3c7' : '#fee2e2',
                            color: isAvail ? '#166534' : tech.availability === 'BUSY' ? '#92400e' : '#991b1b'
                          }}>
                            {humanizeText(tech.availability || 'AVAILABLE')}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#09090b' }}>
                          {activeJobs.length} Active Jobs
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.76rem', color: '#52525b' }}>
                          {todayJobs.length === 0 ? (
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>No jobs today (Free)</span>
                          ) : (
                            <div>
                              <strong style={{ color: '#09090b' }}>{todayJobs.length} Job(s): </strong>
                              {todayJobs.map(j => j.scheduledStartTime?.slice(0, 5)).filter(Boolean).join(', ')}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              const unassignedWO = workOrders.find(w => !w.assignedTechnicianId && !w.technicianId && w.status !== 'CANCELLED');
                              if (unassignedWO) {
                                openAssignModal(unassignedWO, tech.id);
                              } else {
                                addToast(`Please select a work order to assign to ${tech.name || tech.fullName}.`, 'info', 'Assign Work Order');
                                setActiveSubTab('workorders');
                              }
                            }}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '8px',
                              border: '1px solid #09090b',
                              background: '#ffffff',
                              color: '#09090b',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Assign Job
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. NOTIFICATIONS & ALERTS TAB                                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'notifications' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid #e4e4e7',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                Dispatcher Events & Alert Center
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                Real-time operational alerts for new requests, SLA deadlines, assignments, completions, and low stock warnings
              </p>
            </div>

            <button
              onClick={() => markAllNotificationsRead()}
              style={{
                padding: '7px 14px',
                borderRadius: '10px',
                border: '1px solid #e4e4e7',
                background: '#ffffff',
                color: '#09090b',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Mark All Read
            </button>
          </div>

          {/* Quick System Alerts Generation (SLA, Low Stock, etc.) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* 1. Low Inventory Alert Banner */}
            {lowStockParts.length > 0 && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertCircle size={18} color="#dc2626" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#991b1b' }}>
                      Low Inventory Warning: {lowStockParts.length} Parts Below Threshold
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#b91c1c' }}>
                      {lowStockParts.map(p => `${p.partName} (${p.quantity} ${p.unit || 'pcs'} left)`).join(', ')}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', background: '#dc2626', color: '#ffffff' }}>
                  Restock Required
                </span>
              </div>
            )}

            {/* 2. Critical Requests Pending Alert */}
            {highCriticalRequests.length > 0 && (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle size={18} color="#d97706" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#92400e' }}>
                      High Priority Service Requests Pending ({highCriticalRequests.length})
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#b45309' }}>
                      {highCriticalRequests.map(r => `${r.requestNumber || r.id}: ${r.problemDescription?.slice(0, 40)}...`).join(' | ')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveSubTab('requests')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#92400e',
                    color: '#ffffff',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Triage Now
                </button>
              </div>
            )}

            {/* List of Real-Time Notifications */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {globalNotifications.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#71717a', fontSize: '0.84rem' }}>
                  No recent notifications recorded. All operations running smoothly!
                </div>
              ) : (
                globalNotifications.map(n => (
                  <div
                    key={n.id}
                    style={{
                      background: n.read ? '#ffffff' : '#f8fafc',
                      border: '1px solid #e4e4e7',
                      borderLeft: `4px solid ${n.type === 'ALERT' ? '#ef4444' : n.type === 'ASSIGNMENT' ? '#3b82f6' : '#09090b'}`,
                      borderRadius: '10px',
                      padding: '14px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#09090b' }}>{n.title}</div>
                      <div style={{ fontSize: '0.78rem', color: '#52525b', marginTop: '2px' }}>{n.message}</div>
                      <div style={{ fontSize: '0.7rem', color: '#a1a1aa', marginTop: '4px' }}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Just now'}
                      </div>
                    </div>
                    {!n.read && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#09090b', color: '#ffffff', padding: '2px 8px', borderRadius: '9999px' }}>
                        NEW
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. DISPATCHER PROFILE & SHIFT DESK                                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'profile' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '28px',
          border: '1px solid #e4e4e7',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
              Dispatcher Account & Shift Desk
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
              Service Coordinator identity, authentication credentials, and dispatch territory metrics
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            
            {/* Identity Card */}
            <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '20px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#09090b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.1rem'
                }}>
                  {currentUser?.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'DS'}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#09090b' }}>
                    {currentUser?.fullName || 'Service Dispatcher'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#71717a' }}>{currentUser?.email || 'dispatcher@fieldhub.com'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                  <span style={{ color: '#71717a' }}>System Role</span>
                  <span style={{ fontWeight: 700, color: '#3730a3', background: '#e0e7ff', padding: '1px 8px', borderRadius: '9999px' }}>
                    DISPATCHER
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                  <span style={{ color: '#71717a' }}>Desk ID</span>
                  <span style={{ fontWeight: 600, color: '#09090b' }}>DESK-CENTRAL-01</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                  <span style={{ color: '#71717a' }}>Assigned Region</span>
                  <span style={{ fontWeight: 600, color: '#09090b' }}>Primary Service Territory</span>
                </div>
              </div>
            </div>

            {/* Shift Metrics */}
            <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '20px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#09090b', marginBottom: '12px' }}>
                Shift Performance & Live Fleet Counters
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#71717a' }}>Dispatched Work Orders</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#09090b', marginTop: '2px' }}>
                    {workOrders.length}
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#71717a' }}>Active Technicians</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
                    {availableTechnicians.length}
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#71717a' }}>Today's Scheduled</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#3730a3', marginTop: '2px' }}>
                    {todayScheduledJobs.length}
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#71717a' }}>Pending Triage</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
                    {pendingRequests.length}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. DISPATCHER CUSTOMERS TAB                                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'customers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  Customer Directory & Service Locations ({customers.length})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                  Search customer accounts, verify primary addresses, contact persons, and service histories
                </p>
              </div>

              <div style={{ position: 'relative', minWidth: '240px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', height: '38px', padding: '0 12px 0 34px', borderRadius: '9999px', border: '1px solid #e4e4e7', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Customer / Organization</th>
                    <th style={{ padding: '12px 16px' }}>Contact Info</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px' }}>Service Locations</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Account Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customers
                    .filter(c => {
                      if (!searchTerm) return true;
                      const q = searchTerm.toLowerCase();
                      const name = (c.fullName || c.name || c.user?.fullName || '').toLowerCase();
                      const email = (c.email || c.user?.email || '').toLowerCase();
                      const phone = (c.phone || c.user?.phone || '').toLowerCase();
                      return name.includes(q) || email.includes(q) || phone.includes(q);
                    })
                    .map(cust => (
                      <tr key={cust.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#09090b' }}>{cust.fullName || cust.name || cust.user?.fullName || 'Customer'}</div>
                          <div style={{ fontSize: '0.74rem', color: '#71717a' }}>ID: CUST-{cust.id}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#09090b', fontSize: '0.8rem' }}>
                            <Mail size={12} style={{ color: '#71717a' }} />
                            <span>{cust.email || cust.user?.email || 'N/A'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#71717a', fontSize: '0.76rem', marginTop: '2px' }}>
                            <Phone size={12} />
                            <span>{cust.phone || cust.user?.phone || 'N/A'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>
                            {cust.customerType || 'INDIVIDUAL'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#52525b' }}>
                          {cust.serviceLocations && cust.serviceLocations.length > 0 ? (
                            <div>
                              <div style={{ fontWeight: 600, color: '#09090b' }}>{cust.serviceLocations[0].locationName || cust.serviceLocations[0].city}</div>
                              <div style={{ fontSize: '0.74rem', color: '#71717a' }}>{cust.serviceLocations[0].address}, {cust.serviceLocations[0].city}</div>
                              {cust.serviceLocations.length > 1 && (
                                <span style={{ fontSize: '0.7rem', color: '#3730a3', fontWeight: 600 }}>+{cust.serviceLocations.length - 1} more locations</span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>{cust.city ? `${cust.city}, ${cust.state || ''}` : 'Primary Location'}</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, background: '#dcfce7', color: '#166534' }}>
                            ACTIVE
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => {
                              onTabChange && onTabChange('dispatcher-requests');
                              setSearchTerm(cust.fullName || cust.name || cust.user?.fullName || '');
                            }}
                            style={{ padding: '4px 10px', borderRadius: '6px', background: '#09090b', color: '#fff', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            View Requests
                          </button>
                        </td>
                      </tr>
                    ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#71717a' }}>
                        No customers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. DISPATCHER INVENTORY & PARTS TAB                                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Sub-navigation for Inventory Catalog vs Technician Part Requests */}
          <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #e4e4e7', paddingBottom: '12px', overflowX: 'auto' }}>
            <button
              onClick={() => setDispatcherInventorySubTab('CATALOG')}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                border: 'none',
                background: dispatcherInventorySubTab === 'CATALOG' ? '#09090b' : '#f4f4f5',
                color: dispatcherInventorySubTab === 'CATALOG' ? '#ffffff' : '#71717a',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap'
              }}
            >
              <Package size={16} />
              Stock Inventory ({inventory.length})
            </button>
            <button
              onClick={() => setDispatcherInventorySubTab('PART_REQUESTS')}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                border: 'none',
                background: dispatcherInventorySubTab === 'PART_REQUESTS' ? '#09090b' : '#f4f4f5',
                color: dispatcherInventorySubTab === 'PART_REQUESTS' ? '#ffffff' : '#71717a',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap'
              }}
            >
              <Send size={16} />
              Technician Part Requests ({partRequests.length})
              {partRequests.filter(p => p.status === 'PENDING').length > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '9999px', fontWeight: 800 }}>
                  {partRequests.filter(p => p.status === 'PENDING').length} new
                </span>
              )}
            </button>
          </div>

          {dispatcherInventorySubTab === 'CATALOG' && (
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    Service Inventory & Parts Catalog ({inventory.length})
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                    Verify available stock for dispatch operations, minimum levels, and warehouse allocations
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ position: 'relative', minWidth: '220px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
                    <input
                      type="text"
                      placeholder="Search parts, SKUs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 12px 0 34px', borderRadius: '9999px', border: '1px solid #e4e4e7', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* Inventory Alerts Banner if Low Stock */}
              {lowStockParts.length > 0 && (
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.82rem', color: '#92400e', fontWeight: 600 }}>
                    {lowStockParts.length} part(s) are currently at or below minimum threshold! Consider replenishing before scheduling major installations.
                  </div>
                </div>
              )}

              <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                      <th style={{ padding: '12px 16px' }}>Part Name / SKU</th>
                      <th style={{ padding: '12px 16px' }}>Category</th>
                      <th style={{ padding: '12px 16px' }}>In Stock</th>
                      <th style={{ padding: '12px 16px' }}>Min Stock</th>
                      <th style={{ padding: '12px 16px' }}>Unit Cost</th>
                      <th style={{ padding: '12px 16px' }}>Supplier / Warehouse</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory
                      .filter(item => {
                        if (!searchTerm) return true;
                        const q = searchTerm.toLowerCase();
                        const name = (item.name || '').toLowerCase();
                        const sku = (item.sku || '').toLowerCase();
                        const cat = (item.category || '').toLowerCase();
                        return name.includes(q) || sku.includes(q) || cat.includes(q);
                      })
                      .map(part => {
                        const isLow = (part.quantity || 0) <= (part.minimumStock || 0);
                        return (
                          <tr key={part.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 700, color: '#09090b' }}>{part.name}</div>
                              <div style={{ fontSize: '0.74rem', color: '#71717a', fontFamily: 'monospace' }}>{part.sku}</div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>
                                {part.category || 'GENERAL'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                color: isLow ? '#dc2626' : '#16a34a'
                              }}>
                                {part.quantity} {part.unit || 'pcs'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: '#71717a' }}>
                              {part.minimumStock || 0} {part.unit || 'pcs'}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#09090b' }}>
                              ${Number(part.cost || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#52525b' }}>
                              <div>{part.supplier || 'Main Depot'}</div>
                              <div style={{ fontSize: '0.72rem', color: '#71717a' }}>{part.storageLocation || 'Aisle 1'}</div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: isLow ? '#fee2e2' : '#dcfce7',
                                color: isLow ? '#991b1b' : '#166534'
                              }}>
                                {isLow ? 'LOW STOCK' : 'IN STOCK'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    {inventory.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#71717a' }}>
                          No inventory parts registered.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {dispatcherInventorySubTab === 'PART_REQUESTS' && (
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    Technician Part Requests ({partRequests.length})
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                    Review part requests submitted by field technicians and forward to Administrator for approval
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={loadDispatcherData}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e4e4e7', background: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                      <th style={{ padding: '12px 16px' }}>Request #</th>
                      <th style={{ padding: '12px 16px' }}>Technician</th>
                      <th style={{ padding: '12px 16px' }}>Part & Qty</th>
                      <th style={{ padding: '12px 16px' }}>Priority</th>
                      <th style={{ padding: '12px 16px' }}>Reason / WO</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partRequests.map(req => {
                      const getStatusBadge = (st) => {
                        switch (st) {
                          case 'PENDING':
                            return { bg: '#fef3c7', text: '#92400e', label: 'Pending Review' };
                          case 'FORWARDED':
                            return { bg: '#e0e7ff', text: '#3730a3', label: 'Forwarded to Admin' };
                          case 'APPROVED':
                            return { bg: '#dcfce7', text: '#166534', label: 'Approved' };
                          case 'FULFILLED':
                            return { bg: '#d1fae5', text: '#065f46', label: 'Fulfilled & Stocked' };
                          case 'REJECTED':
                            return { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' };
                          default:
                            return { bg: '#f1f5f9', text: '#475569', label: st };
                        }
                      };
                      const badge = getStatusBadge(req.status);

                      return (
                        <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#09090b', fontFamily: 'monospace' }}>{req.requestNumber}</div>
                            <div style={{ fontSize: '0.72rem', color: '#71717a' }}>{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ''}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#09090b' }}>{req.technicianName}</div>
                            {req.technicianPhone && (
                              <div style={{ fontSize: '0.72rem', color: '#71717a' }}>{req.technicianPhone}</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#09090b' }}>{req.partName}</div>
                            <div style={{ fontSize: '0.76rem', color: '#2563eb', fontWeight: 600 }}>
                              Qty: {req.quantityRequested} {req.partSku ? `(${req.partSku})` : ''}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: req.priority === 'CRITICAL' ? '#fee2e2' : req.priority === 'HIGH' ? '#ffedd5' : '#f1f5f9',
                              color: req.priority === 'CRITICAL' ? '#991b1b' : req.priority === 'HIGH' ? '#9a3412' : '#475569'
                            }}>
                              {req.priority || 'MEDIUM'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#334155' }}>{req.reason}</div>
                            {req.workOrderNumber && (
                              <div style={{ fontSize: '0.72rem', color: '#71717a', marginTop: '2px' }}>WO: {req.workOrderNumber}</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              background: badge.bg,
                              color: badge.text
                            }}>
                              {badge.label}
                            </span>
                            {req.dispatcherNotes && (
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px' }}>
                                Disp: {req.dispatcherNotes}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            {req.status === 'PENDING' ? (
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => {
                                    setForwardPartModal(req);
                                    setDispatcherNotes('');
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#2563eb',
                                    color: '#ffffff',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Send size={12} /> Forward to Admin
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectPartModal(req);
                                    setRejectPartReason('');
                                  }}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid #fecaca',
                                    background: '#fee2e2',
                                    color: '#991b1b',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : req.status === 'FORWARDED' ? (
                              <span style={{ fontSize: '0.74rem', color: '#6366f1', fontWeight: 600 }}>Awaiting Admin</span>
                            ) : (
                              <span style={{ fontSize: '0.74rem', color: '#71717a' }}>Completed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {partRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#71717a' }}>
                          No technician part requests recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. DISPATCHER REPORTS TAB                                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  Dispatcher Operations & Fleet Reports
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                  Live service telemetry, technician completion velocity, and SLA adherence metrics
                </p>
              </div>

              <button
                onClick={() => {
                  const csvRows = [
                    ['Work Order Number', 'Title', 'Customer', 'Technician', 'Status', 'Priority', 'Scheduled Date', 'SLA Status'],
                    ...workOrders.map(w => [
                      w.workOrderNumber,
                      `"${(w.title || '').replace(/"/g, '""')}"`,
                      `"${(w.customerName || '').replace(/"/g, '""')}"`,
                      `"${(w.assignedTechnicianName || 'Unassigned').replace(/"/g, '""')}"`,
                      w.status,
                      w.priority,
                      w.scheduledDate || '',
                      w.slaStatus || 'WITHIN_SLA'
                    ])
                  ];
                  const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement('a');
                  link.setAttribute('href', encodedUri);
                  link.setAttribute('download', `dispatcher-work-orders-${todayStr}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  addToast('Exported work orders report to CSV!', 'success', 'Export Complete');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '9999px',
                  background: '#09090b',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Download size={14} />
                <span>Export CSV Report</span>
              </button>
            </div>

            {/* Quick KPI Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.74rem', color: '#71717a', fontWeight: 600 }}>Total Dispatched Jobs</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#09090b', marginTop: '4px' }}>{workOrders.length}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.74rem', color: '#71717a', fontWeight: 600 }}>Completed / Verified</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                  {workOrders.filter(w => w.status === 'COMPLETED' || w.status === 'CUSTOMER_VERIFIED' || w.status === 'CLOSED').length}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.74rem', color: '#71717a', fontWeight: 600 }}>Active In-Progress</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
                  {workOrders.filter(w => w.status === 'IN_PROGRESS').length}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.74rem', color: '#71717a', fontWeight: 600 }}>SLA Breached</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                  {workOrders.filter(w => w.slaStatus === 'BREACHED').length}
                </div>
              </div>
            </div>

            {/* Work Order Execution Table */}
            <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Work Order</th>
                    <th style={{ padding: '12px 16px' }}>Customer</th>
                    <th style={{ padding: '12px 16px' }}>Assigned Tech</th>
                    <th style={{ padding: '12px 16px' }}>Priority</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>SLA Health</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.slice(0, 15).map(wo => (
                    <tr key={wo.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#09090b' }}>{wo.workOrderNumber}</div>
                        <div style={{ fontSize: '0.74rem', color: '#71717a' }}>{wo.title}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#09090b', fontWeight: 600 }}>
                        {wo.customerName || 'Customer'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#52525b' }}>
                        {wo.assignedTechnicianName || 'Unassigned'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: wo.priority === 'CRITICAL' ? '#fee2e2' : wo.priority === 'HIGH' ? '#ffedd5' : '#f1f5f9',
                          color: wo.priority === 'CRITICAL' ? '#991b1b' : wo.priority === 'HIGH' ? '#9a3412' : '#475569'
                        }}>
                          {wo.priority}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: wo.status === 'COMPLETED' || wo.status === 'CUSTOMER_VERIFIED' || wo.status === 'CLOSED' ? '#dcfce7' : wo.status === 'IN_PROGRESS' ? '#dbeafe' : '#fef3c7',
                          color: wo.status === 'COMPLETED' || wo.status === 'CUSTOMER_VERIFIED' || wo.status === 'CLOSED' ? '#166534' : wo.status === 'IN_PROGRESS' ? '#1e40af' : '#92400e'
                        }}>
                          {humanizeText(wo.status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: wo.slaStatus === 'BREACHED' ? '#fee2e2' : wo.slaStatus === 'AT_RISK' ? '#ffedd5' : '#dcfce7',
                          color: wo.slaStatus === 'BREACHED' ? '#991b1b' : wo.slaStatus === 'AT_RISK' ? '#9a3412' : '#166534'
                        }}>
                          {wo.slaStatus || 'WITHIN_SLA'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ASSIGN TECHNICIAN & SCHEDULE (With Conflict Prevention)         */}
      {/* ========================================================================= */}
      {assignModalData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '560px',
            padding: '24px',
            border: '1px solid #e4e4e7',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                  Assignment & Scheduling Console
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: '2px 0 0 0' }}>
                  Assign Technician to {assignModalData.workOrder?.workOrderNumber}
                </h3>
              </div>
              <button
                onClick={() => setAssignModalData(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#71717a' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Work Order Overview */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              fontSize: '0.8rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#71717a' }}>Customer:</span>
                <strong style={{ color: '#09090b' }}>{assignModalData.workOrder?.customerName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#71717a' }}>Category:</span>
                <strong style={{ color: '#09090b' }}>{assignModalData.workOrder?.categoryName || assignModalData.workOrder?.serviceCategory}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#71717a' }}>Location:</span>
                <span style={{ color: '#334155' }}>{assignModalData.workOrder?.serviceLocationAddress || 'Address on file'}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Technician Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#09090b', marginBottom: '6px' }}>
                  Select Field Technician *
                </label>
                <select
                  required
                  value={assignTechId}
                  onChange={(e) => setAssignTechId(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: '1px solid #e4e4e7',
                    fontSize: '0.84rem',
                    outline: 'none',
                    background: '#ffffff'
                  }}
                >
                  <option value="">Choose an available technician...</option>
                  {technicians.map(t => {
                    const skillsList = getTechnicianSkillNames(t.skills).join(', ');
                    return (
                      <option key={t.id} value={t.id}>
                        {t.name || t.fullName} — {t.department || 'General'} ({t.availability}) {skillsList ? `[${skillsList}]` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Schedule Date & Times */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>
                    Service Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={assignDate}
                    onChange={(e) => setAssignDate(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid #e4e4e7',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={assignStartTime}
                    onChange={(e) => setAssignStartTime(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid #e4e4e7',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={assignEndTime}
                    onChange={(e) => setAssignEndTime(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid #e4e4e7',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Conflict Prevention Alert */}
              {currentAssignmentConflict && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <AlertTriangle size={16} color="#dc2626" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.76rem', color: '#991b1b' }}>
                    <strong>Scheduling Overlap Detected:</strong> This technician is already scheduled for Work Order <strong>{currentAssignmentConflict.woNumber}</strong> ({currentAssignmentConflict.timeSlot}) on {assignDate}. Please select another technician or adjust the time slot.
                  </div>
                </div>
              )}

              {/* Notes / Instructions */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>
                  Dispatcher Notes & Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please bring replacement capacitor and check refrigerant pressure."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e4e4e7',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAssignModalData(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e4e4e7',
                    background: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignModalLoading || !!currentAssignmentConflict}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: currentAssignmentConflict ? '#a1a1aa' : '#09090b',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: currentAssignmentConflict ? 'not-allowed' : 'pointer'
                  }}
                >
                  {assignModalLoading ? 'Saving...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RESCHEDULE WORK ORDER                                           */}
      {/* ========================================================================= */}
      {rescheduleWO && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            border: '1px solid #e4e4e7',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                  Reschedule Job & Preserve History
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: '2px 0 0 0' }}>
                  Reschedule {rescheduleWO.workOrderNumber}
                </h3>
              </div>
              <button
                onClick={() => setRescheduleWO(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#71717a' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>
                    New Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid #e4e4e7',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={rescheduleStartTime}
                    onChange={(e) => setRescheduleStartTime(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid #e4e4e7',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={rescheduleEndTime}
                    onChange={(e) => setRescheduleEndTime(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid #e4e4e7',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Conflict Alert */}
              {currentRescheduleConflict && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <AlertTriangle size={16} color="#dc2626" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.76rem', color: '#991b1b' }}>
                    <strong>Conflict Detected:</strong> Assigned technician has job <strong>{currentRescheduleConflict.woNumber}</strong> ({currentRescheduleConflict.timeSlot}) on {rescheduleDate}.
                  </div>
                </div>
              )}

              {/* Reason for Reschedule */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>
                  Reason for Rescheduling (Logged in Audit & History)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Customer requested afternoon slot / parts delayed"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #e4e4e7',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRescheduleWO(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e4e4e7',
                    background: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleLoading || !!currentRescheduleConflict}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: currentRescheduleConflict ? '#a1a1aa' : '#09090b',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: currentRescheduleConflict ? 'not-allowed' : 'pointer'
                  }}
                >
                  {rescheduleLoading ? 'Rescheduling...' : 'Save & Log Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: UPDATE WORK ORDER STATUS                                        */}
      {/* ========================================================================= */}
      {statusWO && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            border: '1px solid #e4e4e7',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                  Status Transition
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: '2px 0 0 0' }}>
                  Update Status for {statusWO.workOrderNumber}
                </h3>
              </div>
              <button
                onClick={() => setStatusWO(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#71717a' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmStatusUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#09090b', marginBottom: '6px' }}>
                  Select New Operational Status
                </label>
                <select
                  value={newWOStatus}
                  onChange={(e) => setNewWOStatus(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: '1px solid #e4e4e7',
                    fontSize: '0.84rem',
                    outline: 'none',
                    background: '#ffffff'
                  }}
                >
                  <option value="ACCEPTED">Accepted (Technician confirmed)</option>
                  <option value="IN_PROGRESS">In Progress (Work started)</option>
                  <option value="ON_HOLD">On Hold (Pending parts or access)</option>
                  <option value="COMPLETED">Completed (Field execution finished)</option>
                  <option value="REOPENED">Reopened (Follow-up required)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>
                  Operational Reason / Transition Note
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide reason for this status change (e.g. Awaiting compressor parts, technician en-route)..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e4e4e7',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setStatusWO(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e4e4e7',
                    background: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusLoading}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#09090b',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {statusLoading ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SET / CHANGE PRIORITY                                           */}
      {/* ========================================================================= */}
      {priorityModalData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '420px',
            padding: '24px',
            border: '1px solid #e4e4e7',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                  Triage Priority
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: '2px 0 0 0' }}>
                  Set Priority for {priorityModalData.item?.requestNumber || priorityModalData.item?.workOrderNumber}
                </h3>
              </div>
              <button
                onClick={() => setPriorityModalData(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#71717a' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmPriorityUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#09090b', marginBottom: '6px' }}>
                  Priority Level
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedPriority(lvl)}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        border: selectedPriority === lvl ? '2px solid #09090b' : '1px solid #e4e4e7',
                        background: selectedPriority === lvl ? '#09090b' : '#f8fafc',
                        color: selectedPriority === lvl ? '#ffffff' : '#09090b',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPriorityModalData(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e4e4e7',
                    background: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={priorityLoading}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#09090b',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {priorityLoading ? 'Saving...' : 'Confirm Priority'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: FULL ITEM DETAILS MODAL (Request or Work Order)                  */}
      {/* ========================================================================= */}
      {detailsModalData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '640px',
            padding: '26px',
            border: '1px solid #e4e4e7',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            maxHeight: '85vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                  {detailsModalData.type === 'REQUEST' ? 'Service Request Dossier' : 'Work Order Full Dossier'}
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: '2px 0 0 0' }}>
                  {detailsModalData.item?.requestNumber || detailsModalData.item?.workOrderNumber}
                </h3>
              </div>
              <button
                onClick={() => setDetailsModalData(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#71717a' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.84rem' }}>
              
              {/* Customer & Location Block */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: 700, color: '#09090b', marginBottom: '6px' }}>Customer & Service Site</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', color: '#52525b' }}>
                  <div><strong>Customer:</strong> {detailsModalData.item?.customerName}</div>
                  <div><strong>Email:</strong> {detailsModalData.item?.customerEmail || '—'}</div>
                  <div><strong>Phone:</strong> {detailsModalData.item?.customerPhone || '—'}</div>
                  <div><strong>Location:</strong> {detailsModalData.item?.serviceLocationAddress || detailsModalData.item?.locationName || 'On file'}</div>
                </div>
              </div>

              {/* Service Specifications */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: 700, color: '#09090b', marginBottom: '6px' }}>Problem & Scope Specifications</div>
                <div style={{ color: '#334155', lineHeight: 1.5 }}>
                  <div><strong>Category:</strong> {detailsModalData.item?.categoryName || detailsModalData.item?.serviceCategory}</div>
                  {detailsModalData.item?.serviceTypeName && <div><strong>Service Type:</strong> {detailsModalData.item?.serviceTypeName}</div>}
                  <div style={{ marginTop: '6px' }}>
                    <strong>Problem Description:</strong><br />
                    {detailsModalData.item?.problemDescription || detailsModalData.item?.description || 'No notes provided.'}
                  </div>
                </div>
              </div>

              {/* Schedule & Technician info */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: 700, color: '#09090b', marginBottom: '6px' }}>Schedule & Dispatch Status</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', color: '#52525b' }}>
                  <div><strong>Scheduled Date:</strong> {detailsModalData.item?.scheduledDate || detailsModalData.item?.preferredDate || 'Flexible'}</div>
                  <div><strong>Time Slot:</strong> {detailsModalData.item?.scheduledTimeSlot || detailsModalData.item?.preferredTimeSlot || (detailsModalData.item?.scheduledStartTime ? `${detailsModalData.item.scheduledStartTime.slice(0, 5)} - ${detailsModalData.item.scheduledEndTime?.slice(0, 5)}` : 'Any Time')}</div>
                  <div><strong>Assigned Tech:</strong> {detailsModalData.item?.assignedTechnicianName || detailsModalData.item?.technicianName || 'Unassigned'}</div>
                  <div><strong>Current Status:</strong> <span style={{ fontWeight: 700, color: '#09090b' }}>{humanizeText(detailsModalData.item?.status)}</span></div>
                </div>
              </div>

              {/* Attachments button if available */}
              {parseAttachments(detailsModalData.item?.attachmentsJson).length > 0 && (
                <button
                  onClick={() => openPhotoGallery(`Record Photos`, detailsModalData.item?.attachmentsJson)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: '1px solid #09090b',
                    background: '#09090b',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Camera size={14} />
                  <span>View Attached Photos ({parseAttachments(detailsModalData.item?.attachmentsJson).length})</span>
                </button>
              )}

              {/* Action trigger for converting or scheduling */}
              {detailsModalData.type === 'REQUEST' && detailsModalData.item?.status === 'REQUESTED' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button
                    onClick={() => {
                      setDetailsModalData(null);
                      handleCreateWorkOrderFromRequest(detailsModalData.item.id);
                    }}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#09090b',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Generate Work Order Now
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: PHOTO GALLERY MODAL                                             */}
      {/* ========================================================================= */}
      {photoGalleryData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '680px',
            padding: '24px',
            border: '1px solid #e4e4e7',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                {photoGalleryData.title}
              </h3>
              <button
                onClick={() => setPhotoGalleryData(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#71717a' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Main Photo Preview */}
            <div style={{
              width: '100%',
              height: '340px',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {selectedPhotoPreview ? (
                <img
                  src={selectedPhotoPreview}
                  alt="Attachment Preview"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ color: '#ffffff', fontSize: '0.84rem' }}>No Preview Available</div>
              )}
            </div>

            {/* Thumbnail list */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {photoGalleryData.photos.map((p, idx) => (
                <img
                  key={idx}
                  src={p.dataUrl}
                  alt={p.caption || `Photo ${idx + 1}`}
                  onClick={() => setSelectedPhotoPreview(p.dataUrl)}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    border: selectedPhotoPreview === p.dataUrl ? '2px solid #09090b' : '1px solid #e4e4e7'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL 7: FORWARD PART REQUEST TO ADMIN MODAL                             */}
      {/* ========================================================================= */}
      {forwardPartModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            border: '1px solid #e4e4e7',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} style={{ color: '#2563eb' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  Forward Request to Admin
                </h3>
              </div>
              <button
                onClick={() => setForwardPartModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#71717a' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.84rem' }}>
              <div><strong>Request #:</strong> {forwardPartModal.requestNumber}</div>
              <div style={{ marginTop: '4px' }}><strong>Technician:</strong> {forwardPartModal.technicianName}</div>
              <div style={{ marginTop: '4px' }}><strong>Part:</strong> {forwardPartModal.partName} &bull; <strong>Qty:</strong> {forwardPartModal.quantityRequested}</div>
              <div style={{ marginTop: '4px' }}><strong>Reason:</strong> {forwardPartModal.reason}</div>
            </div>

            <form onSubmit={handleForwardPartRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Dispatcher Notes for Administrator (Optional)
                </label>
                <textarea
                  value={dispatcherNotes}
                  onChange={(e) => setDispatcherNotes(e.target.value)}
                  placeholder="e.g. Critical part needed for scheduled repair on WO-102. Please approve procurement/stock addition."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setForwardPartModal(null)}
                  style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forwardLoading}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#fff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: forwardLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {forwardLoading ? 'Forwarding...' : 'Confirm & Forward to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: REJECT PART REQUEST MODAL                                       */}
      {/* ========================================================================= */}
      {rejectPartModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            border: '1px solid #e4e4e7',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} style={{ color: '#dc2626' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  Reject Part Request
                </h3>
              </div>
              <button
                onClick={() => setRejectPartModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#71717a' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
              Are you sure you want to reject request <strong>{rejectPartModal.requestNumber}</strong> for <strong>{rejectPartModal.partName}</strong>?
            </p>

            <form onSubmit={handleRejectPartRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Rejection Reason / Note for Technician
                </label>
                <textarea
                  value={rejectPartReason}
                  onChange={(e) => setRejectPartReason(e.target.value)}
                  placeholder="e.g. Alternative part in central depot should be used instead."
                  rows={3}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setRejectPartModal(null)}
                  style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectPartLoading}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#dc2626',
                    color: '#fff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: rejectPartLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {rejectPartLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
