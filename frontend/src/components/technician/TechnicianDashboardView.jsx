import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  MapPin, 
  Clock, 
  X, 
  AlertTriangle,
  User, 
  Camera, 
  Calendar,
  ChevronRight,
  Search,
  Eye,
  Navigation,
  ClipboardList,
  Bell,
  Plus,
  Trash2,
  RefreshCw,
  PhoneCall,
  History,
  Star
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/useAuth';
import { useNotifications } from '../../context/useNotifications';

const PHOTO_CATEGORIES = [
  { id: 'BEFORE', label: 'Before Service' },
  { id: 'DURING', label: 'During Service' },
  { id: 'AFTER', label: 'After Service' },
  { id: 'EQUIPMENT', label: 'Equipment / Serial' },
  { id: 'DAMAGE', label: 'Damage / Issue' },
  { id: 'INSTALLATION', label: 'Installation' },
  { id: 'OTHER', label: 'Other' }
];

export default function TechnicianDashboardView({ currentTab = 'tech-dashboard', onTabChange }) {
  const { currentUser } = useAuth();
  const { addToast, notifications: globalNotifications, markAllNotificationsRead } = useNotifications();

  // Normalize sub-tab (e.g. 'tech-jobs' -> 'jobs', 'tech-dashboard' -> 'dashboard')
  const getSubTab = (tab) => {
    if (!tab) return 'dashboard';
    if (tab.startsWith('tech-')) return tab.replace('tech-', '');
    return tab;
  };

  const activeSubTab = getSubTab(currentTab);
  const setActiveSubTab = (tabId) => {
    if (onTabChange) {
      onTabChange(`tech-${tabId}`);
    }
  };

  // State
  const [myJobs, setMyJobs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [techProfile, setTechProfile] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState('ALL'); // 'TODAY', 'TOMORROW', 'UPCOMING', 'ALL'

  // Modals & Action States
  // 1. Detailed Job Modal / Work Dossier
  const [selectedJobForDetails, setSelectedJobForDetails] = useState(null);

  // Active Job Work Notes & Parts State (for in-progress recording)
  const [workDiagnosis, setWorkDiagnosis] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [workResolution, setWorkResolution] = useState('');
  const [workAdditionalNotes, setWorkAdditionalNotes] = useState('');
  
  // Parts used for current job
  const [partsUsedList, setPartsUsedList] = useState([]); // [{ partId, partName, quantity, unit, sku }]
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQtyInput, setPartQtyInput] = useState(1);
  const [partNotesInput, setPartNotesInput] = useState('');

  // Photos state for active job / completion
  const [selectedPhotoCategory, setSelectedPhotoCategory] = useState('DURING');
  const [jobPhotos, setJobPhotos] = useState([]); // [{ dataUrl, category, caption, timestamp }]

  // 2. Reject Job Modal
  const [rejectJob, setRejectJob] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // 3. Put On Hold Modal
  const [holdJob, setHoldJob] = useState(null);
  const [holdReason, setHoldReason] = useState('');
  const [holdLoading, setHoldLoading] = useState(false);

  // 4. Complete Job Modal
  const [completeJob, setCompleteJob] = useState(null);
  const [customerSigned, setCustomerSigned] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);

  // Helpers - Local timezone YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const humanizeText = (text) => {
    if (!text) return '';
    if (typeof text !== 'string') return String(text);
    const acronyms = { 'AC': 'AC', 'CCTV': 'CCTV', 'MCB': 'MCB', 'HVAC': 'HVAC', 'IP': 'IP', 'WO': 'WO', 'SLA': 'SLA', 'ID': 'ID' };
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

  // Load live data for this logged-in technician
  const loadTechnicianData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [jobs, inv, profile] = await Promise.all([
        api.getMyTechnicianWorkOrders().catch(() => []),
        api.getInventory().catch(() => []),
        api.getMyTechnicianProfile().catch(() => null)
      ]);
      setMyJobs(jobs || []);
      setInventory(inv || []);
      if (profile) setTechProfile(profile);

      // Keep selected job in sync if modal is open
      if (selectedJobForDetails) {
        const updated = (jobs || []).find(j => j.id === selectedJobForDetails.id);
        if (updated) setSelectedJobForDetails(updated);
      }
    } catch (err) {
      console.error('Failed to load technician data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [selectedJobForDetails]);

  const fetchRef = useRef(null);
  useLayoutEffect(() => {
    fetchRef.current = loadTechnicianData;
  });

  useEffect(() => {
    let active = true;
    const run = async () => { if (active && fetchRef.current) await fetchRef.current(); };
    run();
    const interval = setInterval(() => { if (active && fetchRef.current) fetchRef.current(); }, 12000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // Filtered Technician Metrics (5 real calculated metrics)
  const todayJobs = useMemo(() => {
    return myJobs.filter(j => {
      if (j.status === 'CANCELLED' || j.status === 'REJECTED') return false;
      if (j.scheduledDate === todayStr) return true;
      if (!j.scheduledDate && (j.status === 'ASSIGNED' || j.status === 'ACCEPTED' || j.status === 'IN_PROGRESS')) return true;
      return false;
    });
  }, [myJobs, todayStr]);

  const pendingJobs = useMemo(() => {
    return myJobs.filter(j => j.status === 'ASSIGNED' || j.status === 'ACCEPTED' || j.status === 'SCHEDULED');
  }, [myJobs]);

  const inProgressJobs = useMemo(() => {
    return myJobs.filter(j => j.status === 'IN_PROGRESS');
  }, [myJobs]);

  const completedJobs = useMemo(() => {
    return myJobs.filter(j => j.status === 'COMPLETED' || j.status === 'CUSTOMER_VERIFIED' || j.status === 'CLOSED');
  }, [myJobs]);

  const delayedJobs = useMemo(() => {
    return myJobs.filter(j => {
      if (j.status === 'COMPLETED' || j.status === 'CUSTOMER_VERIFIED' || j.status === 'CLOSED' || j.status === 'CANCELLED' || j.status === 'REJECTED') {
        return false;
      }
      if (j.slaStatus === 'BREACHED') return true;
      if (j.scheduledDate && j.scheduledDate < todayStr) return true;
      return false;
    });
  }, [myJobs, todayStr]);

  // Open Details Modal and populate initial state
  const handleOpenDetails = (job) => {
    setSelectedJobForDetails(job);
    setWorkDiagnosis(job.diagnosis || '');
    setWorkPerformed(job.workPerformed || '');
    setWorkResolution(job.resolution || '');
    setWorkAdditionalNotes(job.completionNotes || job.notes || '');
    setPartsUsedList(job.partsUsed || []);
    
    // Load existing photos from job if present
    const existingPhotos = (job.photos || []).map(p => ({
      dataUrl: p.photoUrl,
      category: p.category || 'DURING',
      caption: p.caption || ''
    }));
    setJobPhotos(existingPhotos);

    setSelectedPartId('');
    setPartQtyInput(1);
    setPartNotesInput('');
  };

  // Operational Job Action Handlers
  const handleAcceptJob = async (jobId, woNumber) => {
    try {
      await api.acceptWorkOrder(jobId);
      addToast(`Accepted job ${woNumber}. Ready for field execution.`, 'success', 'Job Accepted');
      await loadTechnicianData();
    } catch (err) {
      addToast(err.message || 'Failed to accept job', 'danger', 'Error');
    }
  };

  const handleOpenRejectModal = (job) => {
    setRejectJob(job);
    setRejectionReason('');
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectJob || !rejectionReason.trim()) {
      addToast('Please provide a reason for rejecting the job assignment.', 'warning', 'Reason Required');
      return;
    }
    setRejectLoading(true);
    try {
      await api.rejectWorkOrder(rejectJob.id, rejectionReason.trim());
      addToast(`Job ${rejectJob.workOrderNumber} has been rejected and returned to Dispatcher queue.`, 'info', 'Job Assignment Rejected');
      setRejectJob(null);
      if (selectedJobForDetails?.id === rejectJob.id) {
        setSelectedJobForDetails(null);
      }
      await loadTechnicianData();
    } catch (err) {
      addToast(err.message || 'Failed to reject job', 'danger', 'Error');
    } finally {
      setRejectLoading(false);
    }
  };

  const handleStartJob = async (jobId, woNumber) => {
    try {
      await api.startWorkOrder(jobId);
      addToast(`Work started on ${woNumber}. Start timestamp recorded. Status set to In Progress.`, 'success', 'Work Started');
      await loadTechnicianData();
    } catch (err) {
      addToast(err.message || 'Failed to start job', 'danger', 'Error');
    }
  };

  const openHoldModal = (job) => {
    setHoldJob(job);
    setHoldReason('');
  };

  const handleConfirmHold = async (e) => {
    e.preventDefault();
    if (!holdJob || !holdReason.trim()) {
      addToast('Please provide a reason for pausing the job.', 'warning', 'Reason Required');
      return;
    }
    setHoldLoading(true);
    try {
      await api.holdWorkOrder(holdJob.id, holdReason.trim());
      addToast(`Job ${holdJob.workOrderNumber} placed on hold. Reason logged for Dispatcher.`, 'warning', 'Job Paused');
      setHoldJob(null);
      await loadTechnicianData();
    } catch (err) {
      addToast(err.message || 'Failed to put job on hold', 'danger', 'Error');
    } finally {
      setHoldLoading(false);
    }
  };

  const openCompleteModal = (job) => {
    setCompleteJob(job);
    if (!workPerformed) {
      setWorkPerformed(job.workPerformed || '');
    }
    setCustomerSigned(false);
  };

  const handleAddPartToUsage = () => {
    if (!selectedPartId) {
      addToast('Please select a part from inventory.', 'warning', 'Part Required');
      return;
    }
    const partObj = inventory.find(i => String(i.id) === String(selectedPartId));
    if (!partObj) return;

    const qty = Number(partQtyInput);
    if (qty <= 0) {
      addToast('Quantity must be greater than zero.', 'warning', 'Invalid Quantity');
      return;
    }
    if (partObj.quantity < qty) {
      addToast(`Only ${partObj.quantity} units of ${partObj.partName} available in stock.`, 'warning', 'Stock Limit');
      return;
    }

    const existingIndex = partsUsedList.findIndex(p => p.partId === partObj.id);
    if (existingIndex >= 0) {
      const updated = [...partsUsedList];
      updated[existingIndex].quantity += qty;
      setPartsUsedList(updated);
    } else {
      setPartsUsedList([...partsUsedList, {
        partId: partObj.id,
        partName: partObj.partName,
        sku: partObj.sku,
        quantity: qty,
        unit: partObj.unit || 'pcs',
        notes: partNotesInput.trim() || undefined
      }]);
    }

    setSelectedPartId('');
    setPartQtyInput(1);
    setPartNotesInput('');
    addToast(`Recorded ${qty}x ${partObj.partName} for this job.`, 'info', 'Part Recorded');
  };

  const handleRemovePartFromUsage = (index) => {
    const updated = partsUsedList.filter((_, idx) => idx !== index);
    setPartsUsedList(updated);
  };

  // Photo Upload Handler with StorageService multipart upload
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files || files.length === 0) return;

    let successCount = 0;
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        addToast(`File ${file.name} is not a valid image format.`, 'warning', 'Invalid File');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        addToast(`File ${file.name} exceeds 10MB limit.`, 'warning', 'File Too Large');
        continue;
      }

      try {
        const uploadRes = await api.uploadPhoto(file);
        if (uploadRes && uploadRes.url) {
          const newPhoto = {
            url: uploadRes.url,
            category: selectedPhotoCategory,
            filename: file.name,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setJobPhotos(prev => [...prev, newPhoto]);
          successCount++;
        }
      } catch (err) {
        addToast(`Failed to upload ${file.name}: ${err.message}`, 'danger', 'Upload Error');
      }
    }

    if (successCount > 0) {
      addToast(`${successCount} photo(s) uploaded to storage under "${PHOTO_CATEGORIES.find(c => c.id === selectedPhotoCategory)?.label || selectedPhotoCategory}".`, 'success', 'Photo Uploaded');
    }
  };

  const handleRemovePhoto = (index) => {
    setJobPhotos(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleConfirmCompleteJob = async (e) => {
    e.preventDefault();
    if (!completeJob) return;

    const fullSummary = [
      workDiagnosis ? `Diagnosis: ${workDiagnosis}` : '',
      workPerformed ? `Work Performed: ${workPerformed}` : '',
      workResolution ? `Resolution: ${workResolution}` : '',
      workAdditionalNotes ? `Notes: ${workAdditionalNotes}` : ''
    ].filter(Boolean).join('\n\n') || workPerformed.trim();

    if (!fullSummary.trim()) {
      addToast('Please enter the work performed before completing.', 'warning', 'Work Notes Required');
      return;
    }

    setCompleteLoading(true);
    try {
      // 1. First ensure all photos are attached to work order with categories
      for (const p of jobPhotos) {
        if (p.url) {
          await api.uploadWorkOrderPhoto(completeJob.id, p.url, p.category, p.caption || '');
        }
      }

      // 2. Finalize completion payload with stored photo URLs and parts
      const payload = {
        workPerformed: fullSummary,
        notes: workAdditionalNotes.trim() || undefined,
        partsUsed: partsUsedList.map(p => ({
          partId: p.partId,
          quantity: p.quantity,
          notes: p.notes || `Used for job ${completeJob.workOrderNumber}`
        })),
        photoUrls: jobPhotos.map(p => p.url).filter(Boolean)
      };

      await api.completeWorkOrder(completeJob.id, payload);

      addToast(`Work Order ${completeJob.workOrderNumber} successfully completed and logged!`, 'success', 'Job Completed');
      setCompleteJob(null);
      if (selectedJobForDetails?.id === completeJob.id) {
        setSelectedJobForDetails(null);
      }
      await loadTechnicianData();
    } catch (err) {
      addToast(err.message || 'Failed to complete work order', 'danger', 'Error');
    } finally {
      setCompleteLoading(false);
    }
  };

  // Filtered Job Lists for "My Assigned Jobs"
  const filteredAssignedJobs = useMemo(() => {
    return myJobs.filter(job => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        !search ||
        job.workOrderNumber?.toLowerCase().includes(search) ||
        job.customerName?.toLowerCase().includes(search) ||
        job.serviceLocationAddress?.toLowerCase().includes(search) ||
        job.serviceLocationCity?.toLowerCase().includes(search) ||
        job.categoryName?.toLowerCase().includes(search) ||
        job.serviceCategory?.toLowerCase().includes(search) ||
        job.title?.toLowerCase().includes(search) ||
        job.problemDescription?.toLowerCase().includes(search);

      const matchesStatus = (statusFilter === 'ALL') ? true :
        (statusFilter === 'PENDING') ? (job.status === 'ASSIGNED' || job.status === 'ACCEPTED') :
        (statusFilter === 'COMPLETED') ? (job.status === 'COMPLETED' || job.status === 'CUSTOMER_VERIFIED' || job.status === 'CLOSED') :
        (job.status === statusFilter);

      const matchesPriority = priorityFilter === 'ALL' || job.priority === priorityFilter;
      const matchesDate = !dateFilter || job.scheduledDate === dateFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesDate;
    });
  }, [myJobs, searchTerm, statusFilter, priorityFilter, dateFilter]);

  // Previous Service History for selected customer
  const customerPreviousHistory = useMemo(() => {
    if (!selectedJobForDetails) return [];
    return myJobs.filter(j => 
      j.customerId === selectedJobForDetails.customerId && 
      j.id !== selectedJobForDetails.id
    );
  }, [myJobs, selectedJobForDetails]);

  // Schedule Items
  const scheduledJobs = useMemo(() => {
    return myJobs.filter(j => j.status !== 'CANCELLED' && j.status !== 'REJECTED');
  }, [myJobs]);

  const filteredScheduleJobs = useMemo(() => {
    return scheduledJobs.filter(j => {
      if (scheduleFilter === 'TODAY') return j.scheduledDate === todayStr;
      if (scheduleFilter === 'TOMORROW') return j.scheduledDate === tomorrowStr;
      if (scheduleFilter === 'UPCOMING') return !j.scheduledDate || j.scheduledDate >= todayStr;
      if (dateFilter) return j.scheduledDate === dateFilter;
      return true;
    });
  }, [scheduledJobs, scheduleFilter, dateFilter, todayStr, tomorrowStr]);

  // Completed Service History
  const serviceHistoryList = useMemo(() => {
    return myJobs.filter(j => j.status === 'COMPLETED' || j.status === 'CUSTOMER_VERIFIED' || j.status === 'CLOSED');
  }, [myJobs]);

  // Technician Specific Notifications (Excludes Admin alerts)
  const technicianNotifications = useMemo(() => {
    return globalNotifications.filter(n => {
      const title = n.title?.toLowerCase() || '';
      if (title.includes('low inventory') || title.includes('audit')) return false;
      return true;
    });
  }, [globalNotifications]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1240px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      
      {/* ========================================================================= */}
      {/* 1. TECHNICIAN DASHBOARD TAB                                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', margin: 0, letterSpacing: '-0.02em' }}>
                Technician Dashboard
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#71717a', margin: '3px 0 0 0' }}>
                Overview of your daily assignments, schedule, and field work.
              </p>
            </div>

            <button
              onClick={() => loadTechnicianData()}
              disabled={loadingData}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid #e4e4e7',
                background: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#09090b',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} />
              <span>{loadingData ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>

          {/* 5 Real Calculated Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            
            {/* Card 1: Today's Jobs */}
            <div 
              onClick={() => {
                setDateFilter(todayStr);
                setActiveSubTab('jobs');
              }}
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #e4e4e7',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#71717a' }}>Today's Jobs</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={16} color="#4338ca" />
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.03em' }}>
                {todayJobs.length}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Scheduled for today</span>
                <ChevronRight size={12} />
              </div>
            </div>

            {/* Card 2: Pending / Assigned */}
            <div 
              onClick={() => {
                setStatusFilter('ASSIGNED');
                setActiveSubTab('jobs');
              }}
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #e4e4e7',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#71717a' }}>Pending / Assigned</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={16} color="#b45309" />
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.03em' }}>
                {pendingJobs.length}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Awaiting action</span>
                <ChevronRight size={12} />
              </div>
            </div>

            {/* Card 3: In Progress */}
            <div 
              onClick={() => {
                setStatusFilter('IN_PROGRESS');
                setActiveSubTab('jobs');
              }}
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #e4e4e7',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#71717a' }}>In Progress</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={16} color="#1e40af" />
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.03em' }}>
                {inProgressJobs.length}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Currently active</span>
                <ChevronRight size={12} />
              </div>
            </div>

            {/* Card 4: Completed */}
            <div 
              onClick={() => {
                setStatusFilter('COMPLETED');
                setActiveSubTab('jobs');
              }}
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #e4e4e7',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#71717a' }}>Completed</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={16} color="#15803d" />
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.03em' }}>
                {completedJobs.length}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Completed jobs</span>
                <ChevronRight size={12} />
              </div>
            </div>

            {/* Card 5: Delayed / SLA Alert */}
            <div 
              onClick={() => {
                setStatusFilter('ALL');
                setActiveSubTab('jobs');
              }}
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #e4e4e7',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#71717a' }}>Delayed Jobs</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: delayedJobs.length > 0 ? '#fee2e2' : '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={16} color={delayedJobs.length > 0 ? '#dc2626' : '#71717a'} />
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: delayedJobs.length > 0 ? '#dc2626' : '#09090b', letterSpacing: '-0.03em' }}>
                {delayedJobs.length}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>{delayedJobs.length > 0 ? 'Requires attention' : 'All within SLA'}</span>
                <ChevronRight size={12} />
              </div>
            </div>

          </div>

          {/* Today's Assigned Appointments Section */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  Today's Appointments & Tasks
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#71717a', margin: '2px 0 0 0' }}>
                  {todayJobs.length} job{todayJobs.length === 1 ? '' : 's'} assigned for {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <button
                onClick={() => {
                  setDateFilter(todayStr);
                  setActiveSubTab('jobs');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#09090b',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>View Full Queue</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {todayJobs.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: '#f8fafc',
                borderRadius: '14px',
                border: '1px dashed #cbd5e1'
              }}>
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px auto' }} />
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#09090b' }}>
                  No jobs scheduled for today
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', maxWidth: '380px', margin: '4px auto 0 auto' }}>
                  You have no pending appointments for today. Any work orders assigned by the Dispatcher will appear here automatically.
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                {todayJobs.map(job => (
                  <div
                    key={job.id}
                    onClick={() => handleOpenDetails(job)}
                    style={{
                      border: '1px solid #e4e4e7',
                      borderRadius: '14px',
                      padding: '16px',
                      background: '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#09090b';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e4e4e7';
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#09090b' }}>
                          {job.workOrderNumber || `WO-${job.id}`}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: job.priority === 'CRITICAL' ? '#fee2e2' : job.priority === 'HIGH' ? '#fef3c7' : '#f1f5f9',
                            color: job.priority === 'CRITICAL' ? '#b91c1c' : job.priority === 'HIGH' ? '#b45309' : '#475569'
                          }}>
                            {job.priority || 'MEDIUM'}
                          </span>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: job.status === 'COMPLETED' ? '#dcfce7' : job.status === 'IN_PROGRESS' ? '#dbeafe' : job.status === 'ON_HOLD' ? '#fef3c7' : '#f4f4f5',
                            color: job.status === 'COMPLETED' ? '#15803d' : job.status === 'IN_PROGRESS' ? '#1e40af' : job.status === 'ON_HOLD' ? '#b45309' : '#52525b'
                          }}>
                            {humanizeText(job.status)}
                          </span>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#09090b', marginBottom: '4px', lineHeight: 1.3 }}>
                        {job.title || job.problemDescription || 'Service Appointment'}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.76rem', color: '#71717a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={13} />
                          <span>{job.customerName || 'Customer'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={13} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {job.serviceLocationAddress || 'Address on file'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={13} />
                          <span>{job.scheduledStartTime ? `${job.scheduledStartTime.slice(0, 5)} - ${job.scheduledEndTime?.slice(0, 5) || ''}` : 'Standard Window'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '10px',
                      borderTop: '1px solid #f4f4f5'
                    }}>
                      <span style={{ fontSize: '0.72rem', color: '#71717a' }}>
                        Category: {job.categoryName || job.serviceCategory || 'Field Service'}
                      </span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#09090b', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        Open Job <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MY ASSIGNED JOBS TAB                                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'jobs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', margin: 0, letterSpacing: '-0.02em' }}>
                My Assigned Work Orders
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#71717a', margin: '3px 0 0 0' }}>
                Manage all field assignments, review customer requirements, and record execution notes.
              </p>
            </div>

            <button
              onClick={() => loadTechnicianData()}
              disabled={loadingData}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid #e4e4e7',
                background: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#09090b',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} />
              <span>{loadingData ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '16px 20px',
            border: '1px solid #e4e4e7',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            {/* Search Input */}
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <Search size={16} color="#a1a1aa" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search by WO#, customer, location, or problem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px 0 36px',
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
                height: '40px',
                padding: '0 12px',
                borderRadius: '10px',
                border: '1px solid #e4e4e7',
                fontSize: '0.82rem',
                background: '#ffffff',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending (Assigned & Accepted)</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed / Closed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{
                height: '40px',
                padding: '0 12px',
                borderRadius: '10px',
                border: '1px solid #e4e4e7',
                fontSize: '0.82rem',
                background: '#ffffff',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                height: '40px',
                padding: '0 12px',
                borderRadius: '10px',
                border: '1px solid #e4e4e7',
                fontSize: '0.82rem',
                background: '#ffffff',
                outline: 'none'
              }}
            />

            {(searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || dateFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setPriorityFilter('ALL');
                  setDateFilter('');
                }}
                style={{
                  height: '40px',
                  padding: '0 14px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  background: '#f4f4f5',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#52525b',
                  cursor: 'pointer'
                }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Work Orders Table / Responsive List */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e4e4e7',
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            {filteredAssignedJobs.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <ClipboardList size={36} color="#a1a1aa" style={{ margin: '0 auto 12px auto' }} />
                <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#09090b' }}>
                  No work orders found
                </div>
                <div style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '4px' }}>
                  {searchTerm || statusFilter !== 'ALL' || dateFilter ? 'Try adjusting your search filters.' : 'You have no assigned work orders currently.'}
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7' }}>
                      <th style={{ padding: '14px 18px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', fontSize: '0.72rem' }}>Work Order</th>
                      <th style={{ padding: '14px 18px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', fontSize: '0.72rem' }}>Customer & Location</th>
                      <th style={{ padding: '14px 18px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', fontSize: '0.72rem' }}>Category & Scope</th>
                      <th style={{ padding: '14px 18px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', fontSize: '0.72rem' }}>Scheduled Time</th>
                      <th style={{ padding: '14px 18px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', fontSize: '0.72rem' }}>Priority</th>
                      <th style={{ padding: '14px 18px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', fontSize: '0.72rem' }}>Status</th>
                      <th style={{ padding: '14px 18px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', fontSize: '0.72rem', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignedJobs.map((job, idx) => (
                      <tr 
                        key={job.id}
                        style={{ 
                          borderBottom: idx === filteredAssignedJobs.length - 1 ? 'none' : '1px solid #f4f4f5',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#fcfcfd'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* WO ID */}
                        <td style={{ padding: '14px 18px', fontWeight: 800, color: '#09090b' }}>
                          <div>{job.workOrderNumber || `WO-${job.id}`}</div>
                          {job.slaStatus === 'BREACHED' && (
                            <span style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 700 }}>SLA Breached</span>
                          )}
                        </td>

                        {/* Customer & Location */}
                        <td style={{ padding: '14px 18px', color: '#09090b' }}>
                          <div style={{ fontWeight: 700 }}>{job.customerName || 'Customer'}</div>
                          <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={11} />
                            <span>{job.serviceLocationAddress || 'Address on file'}</span>
                          </div>
                          {job.customerPhone && (
                            <div style={{ fontSize: '0.74rem', color: '#71717a', marginTop: '1px' }}>
                              {job.customerPhone}
                            </div>
                          )}
                        </td>

                        {/* Category & Scope */}
                        <td style={{ padding: '14px 18px', color: '#52525b', maxWidth: '240px' }}>
                          <div style={{ fontWeight: 700, color: '#09090b' }}>
                            {job.categoryName || job.serviceCategory || 'General Service'}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                            {job.title || job.problemDescription || 'Field inspection'}
                          </div>
                        </td>

                        {/* Scheduled Time */}
                        <td style={{ padding: '14px 18px', color: '#52525b' }}>
                          <div style={{ fontWeight: 600, color: '#09090b' }}>
                            {job.scheduledDate || 'Flexible'}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#71717a' }}>
                            {job.scheduledStartTime ? `${job.scheduledStartTime.slice(0, 5)} - ${job.scheduledEndTime?.slice(0, 5) || ''}` : 'Standard'}
                          </div>
                        </td>

                        {/* Priority */}
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: job.priority === 'CRITICAL' ? '#fee2e2' : job.priority === 'HIGH' ? '#fef3c7' : '#f1f5f9',
                            color: job.priority === 'CRITICAL' ? '#b91c1c' : job.priority === 'HIGH' ? '#b45309' : '#475569'
                          }}>
                            {job.priority || 'MEDIUM'}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            padding: '3px 9px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: job.status === 'COMPLETED' ? '#dcfce7' : job.status === 'IN_PROGRESS' ? '#dbeafe' : job.status === 'ON_HOLD' ? '#fef3c7' : '#f4f4f5',
                            color: job.status === 'COMPLETED' ? '#15803d' : job.status === 'IN_PROGRESS' ? '#1e40af' : job.status === 'ON_HOLD' ? '#b45309' : '#52525b'
                          }}>
                            {humanizeText(job.status)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenDetails(job)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              border: '1px solid #09090b',
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
                            <Eye size={12} />
                            <span>Open Job</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MY SCHEDULE TAB                                                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', margin: 0, letterSpacing: '-0.02em' }}>
                My Personal Schedule
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#71717a', margin: '3px 0 0 0' }}>
                Calendar & daily chronological view of your assigned appointments.
              </p>
            </div>

            <button
              onClick={() => loadTechnicianData()}
              disabled={loadingData}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid #e4e4e7',
                background: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#09090b',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} />
              <span>{loadingData ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Quick Schedule Filter Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { id: 'ALL', label: 'All Scheduled' },
              { id: 'TODAY', label: `Today (${todayStr})` },
              { id: 'TOMORROW', label: 'Tomorrow' },
              { id: 'UPCOMING', label: 'All Upcoming' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => {
                  setScheduleFilter(f.id);
                  setDateFilter('');
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: scheduleFilter === f.id ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                  background: scheduleFilter === f.id ? '#09090b' : '#ffffff',
                  color: scheduleFilter === f.id ? '#ffffff' : '#52525b'
                }}
              >
                {f.label}
              </button>
            ))}

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.76rem', color: '#71717a' }}>Filter Date:</span>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setScheduleFilter('CUSTOM');
                }}
                style={{
                  height: '34px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.78rem',
                  background: '#ffffff',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Schedule List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredScheduleJobs.length === 0 ? (
              <div style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '48px 24px',
                border: '1px solid #e4e4e7',
                textAlign: 'center'
              }}>
                <Calendar size={36} color="#a1a1aa" style={{ margin: '0 auto 12px auto' }} />
                <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#09090b' }}>
                  No scheduled appointments for this period
                </div>
                <div style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '4px' }}>
                  Select another filter or check your queue for flexible appointments.
                </div>
              </div>
            ) : (
              filteredScheduleJobs.map(job => (
                <div
                  key={job.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '18px 22px',
                    border: '1px solid #e4e4e7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '240px' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: job.scheduledDate === todayStr ? '#dcfce7' : '#f1f5f9',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Calendar size={18} color={job.scheduledDate === todayStr ? '#166534' : '#475569'} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, color: '#09090b', fontSize: '0.88rem' }}>
                          {job.workOrderNumber || `WO-${job.id}`}
                        </span>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '9999px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: job.status === 'COMPLETED' ? '#dcfce7' : job.status === 'IN_PROGRESS' ? '#dbeafe' : '#f4f4f5',
                          color: job.status === 'COMPLETED' ? '#15803d' : job.status === 'IN_PROGRESS' ? '#1e40af' : '#52525b'
                        }}>
                          {humanizeText(job.status)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#09090b', marginTop: '2px' }}>
                        {job.title || job.categoryName || 'Service Visit'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.78rem', color: '#52525b' }}>
                    <div><strong>Customer:</strong> {job.customerName || 'Customer'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} />
                      <span>{job.serviceLocationAddress || 'Address on file'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.78rem', color: '#52525b' }}>
                    <div><strong>Date:</strong> {job.scheduledDate || 'Flexible'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      <span>{job.scheduledStartTime ? `${job.scheduledStartTime.slice(0, 5)} - ${job.scheduledEndTime?.slice(0, 5) || ''}` : 'Standard Window'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenDetails(job)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: '1px solid #09090b',
                      background: '#09090b',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Eye size={13} />
                    <span>View Details</span>
                  </button>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. NOTIFICATIONS TAB                                                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', margin: 0, letterSpacing: '-0.02em' }}>
                Technician Notifications
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#71717a', margin: '3px 0 0 0' }}>
                Operational alerts, assignment updates, and Dispatcher communications.
              </p>
            </div>

            {technicianNotifications.length > 0 && (
              <button
                onClick={markAllNotificationsRead}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  background: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#09090b',
                  cursor: 'pointer'
                }}
              >
                Mark All Read
              </button>
            )}
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e4e4e7',
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            {technicianNotifications.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <Bell size={36} color="#a1a1aa" style={{ margin: '0 auto 12px auto' }} />
                <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#09090b' }}>
                  No notifications
                </div>
                <div style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '4px' }}>
                  You are all caught up on your assignments and updates.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {technicianNotifications.map((notif, idx) => (
                  <div
                    key={notif.id || idx}
                    style={{
                      padding: '16px 20px',
                      borderBottom: idx === technicianNotifications.length - 1 ? 'none' : '1px solid #f4f4f5',
                      background: notif.isRead ? '#ffffff' : '#f8fafc',
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: notif.isRead ? '#f1f5f9' : '#e0e7ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Bell size={16} color={notif.isRead ? '#71717a' : '#4338ca'} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#09090b' }}>
                          {notif.title || 'Work Order Update'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#71717a' }}>
                          {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#52525b', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                        {notif.message || notif.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PROFILE TAB                                                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', margin: 0, letterSpacing: '-0.02em' }}>
              Technician Profile & Fleet Record
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#71717a', margin: '3px 0 0 0' }}>
              Your credentials, fleet certifications, and operational performance metrics.
            </p>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '28px',
            border: '1px solid #e4e4e7',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            {/* Top Identity Block */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '18px',
                background: '#09090b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: 800
              }}>
                {(currentUser?.fullName || techProfile?.technicianName || 'T').charAt(0)}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    {currentUser?.fullName || techProfile?.technicianName || 'Technician'}
                  </h3>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: '#dcfce7',
                    color: '#15803d'
                  }}>
                    {techProfile?.status || 'ACTIVE'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '3px' }}>
                  {currentUser?.email} • {techProfile?.department || 'Field Services'}
                </div>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#09090b', marginTop: '2px' }}>
                  Employee Code: {techProfile?.employeeCode || 'TECH-682'}
                </div>
              </div>
            </div>

            {/* Stats Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#71717a' }}>Customer Rating</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#09090b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{techProfile?.averageRating ? Number(techProfile.averageRating).toFixed(1) : '5.0'}</span>
                  <Star size={18} fill="#f59e0b" color="#f59e0b" />
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#71717a' }}>Completed Jobs</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#09090b', marginTop: '4px' }}>
                  {completedJobs.length || techProfile?.completedJobsCount || 0}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#71717a' }}>Active Field Jobs</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#09090b', marginTop: '4px' }}>
                  {inProgressJobs.length}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#71717a' }}>Availability Status</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', marginTop: '8px' }}>
                  {techProfile?.availability || 'AVAILABLE'}
                </div>
              </div>
            </div>

            {/* Profile Field Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', fontSize: '0.84rem' }}>
              <div>
                <span style={{ color: '#71717a', display: 'block', fontSize: '0.76rem', fontWeight: 600 }}>Phone Number</span>
                <span style={{ fontWeight: 700, color: '#09090b' }}>{currentUser?.phoneNumber || techProfile?.phone || '+91 98406 77889'}</span>
              </div>

              <div>
                <span style={{ color: '#71717a', display: 'block', fontSize: '0.76rem', fontWeight: 600 }}>Role & Permissions</span>
                <span style={{ fontWeight: 700, color: '#09090b' }}>Field Technician (Field Service Fleet)</span>
              </div>

              <div>
                <span style={{ color: '#71717a', display: 'block', fontSize: '0.76rem', fontWeight: 600 }}>Experience Level</span>
                <span style={{ fontWeight: 700, color: '#09090b' }}>{techProfile?.experienceYears || 4} Years Field Service</span>
              </div>
            </div>

            {/* Skills & Certifications */}
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#09090b', marginBottom: '8px' }}>
                Skills & Fleet Certifications
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {getTechnicianSkillNames(techProfile?.skills).length > 0 ? (
                  getTechnicianSkillNames(techProfile?.skills).map((s, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: '#f1f5f9',
                        color: '#334155',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <>
                    <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#334155', fontSize: '0.76rem', fontWeight: 700 }}>Electrical Diagnostics</span>
                    <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#334155', fontSize: '0.76rem', fontWeight: 700 }}>HVAC & Refrigeration</span>
                    <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#334155', fontSize: '0.76rem', fontWeight: 700 }}>Distribution Board Calibration</span>
                  </>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SERVICE HISTORY TAB                                                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', margin: 0, letterSpacing: '-0.02em' }}>
              Completed Service History & Ratings ({serviceHistoryList.length})
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#71717a', margin: '3px 0 0 0' }}>
              Historical archive of completed, verified, and closed jobs with customer ratings and work notes.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {serviceHistoryList.length === 0 ? (
              <div style={{ background: '#ffffff', borderRadius: '20px', padding: '48px', border: '1px solid #e4e4e7', textAlign: 'center' }}>
                <History size={40} style={{ color: '#a1a1aa', margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#09090b', margin: 0 }}>No completed jobs recorded yet</h3>
                <p style={{ fontSize: '0.82rem', color: '#71717a', marginTop: '4px' }}>Once you complete assigned jobs, they will appear here with customer verification notes.</p>
              </div>
            ) : (
              serviceHistoryList.map(job => (
                <div key={job.id} style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid #e4e4e7',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.96rem', color: '#09090b' }}>{job.workOrderNumber}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, background: '#dcfce7', color: '#166534' }}>
                          {humanizeText(job.status)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#09090b', marginTop: '2px' }}>{job.title}</div>
                      <div style={{ fontSize: '0.78rem', color: '#71717a', marginTop: '2px' }}>
                        Customer: {job.customerName} • {job.serviceLocationAddress}, {job.serviceLocationCity}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedJobForDetails(job)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        background: '#09090b',
                        color: '#fff',
                        border: 'none',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      View Details
                    </button>
                  </div>

                  {job.workPerformed && (
                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8rem', color: '#334155' }}>
                      <span style={{ fontWeight: 700 }}>Work Performed: </span>{job.workPerformed}
                    </div>
                  )}

                  {job.feedback && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#09090b' }}>
                      <span style={{ fontWeight: 700 }}>Customer Rating:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} fill={i < (job.feedback.rating || 5) ? '#f59e0b' : '#e4e4e7'} color={i < (job.feedback.rating || 5) ? '#f59e0b' : '#e4e4e7'} />
                        ))}
                      </div>
                      {job.feedback.feedbackText && <span style={{ color: '#71717a' }}>— "{job.feedback.feedbackText}"</span>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. PARTS & INVENTORY LOOKUP TAB                                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', margin: 0, letterSpacing: '-0.02em' }}>
              Service Parts & Truck Inventory ({inventory.length})
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#71717a', margin: '3px 0 0 0' }}>
              Check available parts, SKUs, storage aisles, and stock levels before heading to field sites.
            </p>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Part Name / SKU</th>
                    <th style={{ padding: '12px 16px' }}>Category</th>
                    <th style={{ padding: '12px 16px' }}>Available Quantity</th>
                    <th style={{ padding: '12px 16px' }}>Storage Location</th>
                    <th style={{ padding: '12px 16px' }}>Stock Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(part => {
                    const isLow = (part.quantity || 0) <= (part.minimumStock || 0);
                    return (
                      <tr key={part.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#09090b' }}>{part.name}</div>
                          <div style={{ fontSize: '0.74rem', color: '#71717a', fontFamily: 'monospace' }}>{part.sku}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#52525b' }}>
                          {part.category || 'GENERAL'}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: isLow ? '#dc2626' : '#16a34a' }}>
                          {part.quantity} {part.unit || 'pcs'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#52525b' }}>
                          {part.storageLocation || 'Main Warehouse'}
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
                            {isLow ? 'LOW STOCK' : 'AVAILABLE'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {inventory.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#71717a' }}>
                        No inventory parts registered.
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
      {/* WORK ORDER DETAILS MODAL / DOSSIER (OPEN JOB)                             */}
      {/* ========================================================================= */}
      {selectedJobForDetails && (
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
            maxWidth: '740px',
            padding: '26px',
            border: '1px solid #e4e4e7',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                    Work Order Dossier
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: selectedJobForDetails.status === 'COMPLETED' ? '#dcfce7' : selectedJobForDetails.status === 'IN_PROGRESS' ? '#dbeafe' : selectedJobForDetails.status === 'ON_HOLD' ? '#fef3c7' : '#f1f5f9',
                    color: selectedJobForDetails.status === 'COMPLETED' ? '#166534' : selectedJobForDetails.status === 'IN_PROGRESS' ? '#1e40af' : selectedJobForDetails.status === 'ON_HOLD' ? '#b45309' : '#334155'
                  }}>
                    {humanizeText(selectedJobForDetails.status)}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#09090b', margin: '2px 0 0 0' }}>
                  {selectedJobForDetails.workOrderNumber || `WO-${selectedJobForDetails.id}`}
                </h3>
              </div>
              <button
                onClick={() => setSelectedJobForDetails(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#71717a' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.84rem' }}>
              
              {/* 1. Customer Information Block */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 800, color: '#09090b', fontSize: '0.92rem' }}>Customer Information</div>
                  
                  {/* Action Buttons: Call Customer & View Location */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {selectedJobForDetails.customerPhone && (
                      <a
                        href={`tel:${selectedJobForDetails.customerPhone}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          border: '1px solid #09090b',
                          background: '#ffffff',
                          color: '#09090b',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          textDecoration: 'none'
                        }}
                      >
                        <PhoneCall size={12} />
                        <span>Call Customer</span>
                      </a>
                    )}

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedJobForDetails.serviceLocationAddress || selectedJobForDetails.serviceLocationCity || 'Customer Address')}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '8px',
                        border: '1px solid #09090b',
                        background: '#09090b',
                        color: '#ffffff',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        textDecoration: 'none'
                      }}
                    >
                      <Navigation size={12} />
                      <span>View Location</span>
                    </a>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', color: '#52525b' }}>
                  <div><strong>Name:</strong> {selectedJobForDetails.customerName || 'Customer'}</div>
                  <div><strong>Phone:</strong> {selectedJobForDetails.customerPhone || 'On record'}</div>
                  <div><strong>Email:</strong> {selectedJobForDetails.customerEmail || '—'}</div>
                  <div><strong>Service Address:</strong> {selectedJobForDetails.serviceLocationAddress || 'On file'} {selectedJobForDetails.serviceLocationCity ? `(${selectedJobForDetails.serviceLocationCity})` : ''}</div>
                </div>
              </div>

              {/* 2. Job Information Block */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: 800, color: '#09090b', fontSize: '0.92rem', marginBottom: '8px' }}>Job Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', color: '#52525b', marginBottom: '8px' }}>
                  <div><strong>Category:</strong> {selectedJobForDetails.categoryName || selectedJobForDetails.serviceCategory || 'Field Service'}</div>
                  <div><strong>Priority:</strong> <span style={{ fontWeight: 700, color: '#09090b' }}>{selectedJobForDetails.priority || 'MEDIUM'}</span></div>
                  <div><strong>Scheduled Date:</strong> {selectedJobForDetails.scheduledDate || 'Flexible'}</div>
                  <div>
                    <strong>Scheduled Window: </strong>
                    {selectedJobForDetails.scheduledStartTime ? `${selectedJobForDetails.scheduledStartTime.slice(0, 5)} - ${selectedJobForDetails.scheduledEndTime?.slice(0, 5) || ''}` : 'Standard'}
                  </div>
                </div>
                <div style={{ color: '#334155', lineHeight: 1.5, marginTop: '6px', background: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ color: '#09090b' }}>Problem Description / Scope:</strong><br />
                  {selectedJobForDetails.problemDescription || selectedJobForDetails.description || 'General maintenance & service inspection.'}
                </div>
              </div>

              {/* 3. Customer Previous Service History (Requirement 3D) */}
              {customerPreviousHistory.length > 0 && (
                <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#09090b', fontSize: '0.86rem', marginBottom: '8px' }}>
                    <History size={14} />
                    <span>Previous Service Visits for this Customer</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {customerPreviousHistory.slice(0, 3).map(hist => (
                      <div key={hist.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                        <div>
                          <strong style={{ color: '#09090b' }}>{hist.workOrderNumber}</strong> — {hist.categoryName || 'Service'} ({hist.scheduledDate || 'Past date'})
                          <div style={{ fontSize: '0.72rem', color: '#71717a' }}>{hist.workPerformed || hist.title || 'Completed visit'}</div>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.7rem', color: '#15803d' }}>{humanizeText(hist.status)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Work Execution & Diagnostics (In Progress / Completed) */}
              {(selectedJobForDetails.status === 'IN_PROGRESS' || selectedJobForDetails.status === 'COMPLETED') && (
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontWeight: 800, color: '#09090b', fontSize: '0.92rem' }}>
                    {selectedJobForDetails.status === 'COMPLETED' ? 'Completed Work Record' : 'Record Field Work & Diagnostics'}
                  </div>

                  {selectedJobForDetails.status === 'COMPLETED' ? (
                    <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334155', lineHeight: 1.5 }}>
                      <strong>Work Summary:</strong><br />
                      {selectedJobForDetails.workPerformed || 'Work marked completed.'}
                      {selectedJobForDetails.completedAt && (
                        <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '8px' }}>
                          Completed on: {new Date(selectedJobForDetails.completedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>
                          Diagnosis / Root Cause
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Capacitor leakage, loose terminal connection, thermal fuse blown"
                          value={workDiagnosis}
                          onChange={(e) => setWorkDiagnosis(e.target.value)}
                          style={{
                            width: '100%',
                            height: '36px',
                            padding: '0 10px',
                            borderRadius: '8px',
                            border: '1px solid #e4e4e7',
                            fontSize: '0.82rem',
                            outline: 'none',
                            background: '#ffffff',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>
                          Work Performed / Action Taken *
                        </label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Tested electrical continuity, replaced faulty part, vacuum cleaned filters and calibrated."
                          value={workPerformed}
                          onChange={(e) => setWorkPerformed(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid #e4e4e7',
                            fontSize: '0.82rem',
                            outline: 'none',
                            background: '#ffffff',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>
                          Resolution Notes & Verification
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. System tested under full load for 20 mins, normal amp draw verified."
                          value={workResolution}
                          onChange={(e) => setWorkResolution(e.target.value)}
                          style={{
                            width: '100%',
                            height: '36px',
                            padding: '0 10px',
                            borderRadius: '8px',
                            border: '1px solid #e4e4e7',
                            fontSize: '0.82rem',
                            outline: 'none',
                            background: '#ffffff',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. Parts / Materials Used Section */}
              {(selectedJobForDetails.status === 'IN_PROGRESS' || selectedJobForDetails.status === 'COMPLETED') && (
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 800, color: '#09090b', fontSize: '0.92rem' }}>Parts / Materials Used</div>
                    {selectedJobForDetails.status === 'IN_PROGRESS' && (
                      <span style={{ fontSize: '0.72rem', color: '#71717a' }}>Auto-deducts inventory upon completion</span>
                    )}
                  </div>

                  {selectedJobForDetails.status === 'IN_PROGRESS' && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <select
                        value={selectedPartId}
                        onChange={(e) => setSelectedPartId(e.target.value)}
                        style={{
                          flex: 2,
                          height: '38px',
                          padding: '0 10px',
                          borderRadius: '8px',
                          border: '1px solid #e4e4e7',
                          fontSize: '0.8rem',
                          background: '#ffffff',
                          outline: 'none'
                        }}
                      >
                        <option value="">Select part from inventory...</option>
                        {inventory.map(p => (
                          <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                            {p.partName} ({p.sku}) — Stock: {p.quantity} {p.unit || 'pcs'}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        value={partQtyInput}
                        onChange={(e) => setPartQtyInput(e.target.value)}
                        placeholder="Qty"
                        style={{
                          width: '70px',
                          height: '38px',
                          padding: '0 10px',
                          borderRadius: '8px',
                          border: '1px solid #e4e4e7',
                          fontSize: '0.82rem',
                          outline: 'none',
                          background: '#ffffff'
                        }}
                      />

                      <button
                        type="button"
                        onClick={handleAddPartToUsage}
                        style={{
                          padding: '0 14px',
                          borderRadius: '8px',
                          border: '1px solid #09090b',
                          background: '#09090b',
                          color: '#ffffff',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={13} />
                        <span>Add Part</span>
                      </button>
                    </div>
                  )}

                  {partsUsedList.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: '#71717a', fontStyle: 'italic', padding: '4px 0' }}>
                      No replacement parts recorded for this work order.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {partsUsedList.map((p, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 10px',
                            background: '#ffffff',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.78rem'
                          }}
                        >
                          <div>
                            <strong style={{ color: '#09090b' }}>{p.partName || p.part?.partName}</strong>
                            {p.sku && <span style={{ color: '#71717a', marginLeft: '6px' }}>({p.sku})</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: 700, color: '#09090b' }}>Qty: {p.quantity} {p.unit || 'pcs'}</span>
                            {selectedJobForDetails.status === 'IN_PROGRESS' && (
                              <button
                                type="button"
                                onClick={() => handleRemovePartFromUsage(idx)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 6. Categorized Field Photos (Requirement 6) */}
              {(selectedJobForDetails.status === 'IN_PROGRESS' || selectedJobForDetails.status === 'COMPLETED') && (
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 800, color: '#09090b', fontSize: '0.92rem' }}>Field Photographs</div>
                    {selectedJobForDetails.status === 'IN_PROGRESS' && (
                      <span style={{ fontSize: '0.72rem', color: '#71717a' }}>Select photo category before uploading</span>
                    )}
                  </div>

                  {selectedJobForDetails.status === 'IN_PROGRESS' && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <select
                        value={selectedPhotoCategory}
                        onChange={(e) => setSelectedPhotoCategory(e.target.value)}
                        style={{
                          height: '36px',
                          padding: '0 10px',
                          borderRadius: '8px',
                          border: '1px solid #e4e4e7',
                          fontSize: '0.78rem',
                          background: '#ffffff',
                          outline: 'none'
                        }}
                      >
                        {PHOTO_CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                      </select>

                      <label style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0 14px',
                        height: '36px',
                        borderRadius: '8px',
                        border: '1px solid #09090b',
                        background: '#09090b',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}>
                        <Camera size={13} />
                        <span>Take / Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  )}

                  {jobPhotos.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: '#71717a', fontStyle: 'italic', padding: '4px 0' }}>
                      No field photos attached yet.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
                      {jobPhotos.map((photo, idx) => (
                        <div key={idx} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                          <img
                            src={photo.url || photo.dataUrl}
                            alt="Field photo"
                            style={{ width: '100%', height: '80px', objectFit: 'cover' }}
                          />
                          <div style={{
                            padding: '3px 6px',
                            background: '#09090b',
                            color: '#ffffff',
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            textAlign: 'center',
                            textTransform: 'uppercase'
                          }}>
                            {PHOTO_CATEGORIES.find(c => c.id === photo.category)?.label || photo.category || 'Photo'}
                          </div>
                          {selectedJobForDetails.status === 'IN_PROGRESS' && (
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: 'rgba(0,0,0,0.6)',
                                border: 'none',
                                color: '#ffffff',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Customer Initial Attachments */}
              {parseAttachments(selectedJobForDetails.attachmentsJson).length > 0 && (
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontWeight: 700, color: '#09090b', marginBottom: '8px' }}>Customer Booking Photos</div>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                    {parseAttachments(selectedJobForDetails.attachmentsJson).map((p, idx) => (
                      <img
                        key={idx}
                        src={p.dataUrl}
                        alt="Customer Photo"
                        style={{ width: '70px', height: '70px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e4e4e7' }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Operational Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedJobForDetails(null)}
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
                  Close
                </button>

                {selectedJobForDetails.status === 'ASSIGNED' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        const job = selectedJobForDetails;
                        handleOpenRejectModal(job);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: '1px solid #ef4444',
                        background: '#ffffff',
                        color: '#ef4444',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Reject Job
                    </button>

                    <button
                      onClick={() => {
                        handleAcceptJob(selectedJobForDetails.id, selectedJobForDetails.workOrderNumber);
                        setSelectedJobForDetails(null);
                      }}
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
                      Accept Job
                    </button>
                  </div>
                )}

                {(selectedJobForDetails.status === 'ACCEPTED' || selectedJobForDetails.status === 'SCHEDULED') && (
                  <button
                    onClick={() => {
                      handleStartJob(selectedJobForDetails.id, selectedJobForDetails.workOrderNumber);
                      setSelectedJobForDetails(null);
                    }}
                    style={{
                      padding: '8px 22px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#09090b',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Play size={14} />
                    <span>Start Work</span>
                  </button>
                )}

                {selectedJobForDetails.status === 'ON_HOLD' && (
                  <button
                    onClick={() => {
                      handleStartJob(selectedJobForDetails.id, selectedJobForDetails.workOrderNumber);
                      setSelectedJobForDetails(null);
                    }}
                    style={{
                      padding: '8px 22px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#09090b',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Play size={14} />
                    <span>Resume Work</span>
                  </button>
                )}

                {selectedJobForDetails.status === 'IN_PROGRESS' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        const job = selectedJobForDetails;
                        setSelectedJobForDetails(null);
                        openHoldModal(job);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: '1px solid #e4e4e7',
                        background: '#ffffff',
                        color: '#d97706',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Pause size={13} />
                      <span>Pause Job</span>
                    </button>

                    <button
                      onClick={() => {
                        const job = selectedJobForDetails;
                        openCompleteModal(job);
                      }}
                      style={{
                        padding: '8px 22px',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#16a34a',
                        color: '#ffffff',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={14} />
                      <span>Complete Job</span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REJECT JOB ASSIGNMENT MODAL (REQUIREMENT 4)                                */}
      {/* ========================================================================= */}
      {rejectJob && (
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
          zIndex: 1050,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '460px',
            padding: '24px',
            border: '1px solid #e4e4e7',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
                  Decline Assignment
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: '2px 0 0 0' }}>
                  Reject Job {rejectJob.workOrderNumber}
                </h3>
              </div>
              <button
                onClick={() => setRejectJob(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#71717a' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Schedule conflict with high-priority commercial job / Outside geographical service radius / Tool equipment unavailable..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setRejectJob(null)}
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
                  disabled={rejectLoading}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {rejectLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PUT JOB ON HOLD / PAUSE MODAL                                             */}
      {/* ========================================================================= */}
      {holdJob && (
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
          zIndex: 1050,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '460px',
            padding: '24px',
            border: '1px solid #e4e4e7',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                  Pause Work
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: '2px 0 0 0' }}>
                  Pause Job {holdJob.workOrderNumber}
                </h3>
              </div>
              <button
                onClick={() => setHoldJob(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#71717a' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmHold} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>
                  Reason for Pausing Job *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Awaiting spare compressor part from warehouse, or customer stepped out temporarily..."
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setHoldJob(null)}
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
                  disabled={holdLoading}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#d97706',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {holdLoading ? 'Pausing...' : 'Confirm Pause'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* COMPLETE JOB MODAL (COMPREHENSIVE MULTI-FIELD FORM - REQUIREMENT 7)       */}
      {/* ========================================================================= */}
      {completeJob && (
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
          zIndex: 1050,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '560px',
            padding: '26px',
            border: '1px solid #e4e4e7',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            maxHeight: '88vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>
                  Field Sign-off
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: '2px 0 0 0' }}>
                  Complete Job {completeJob.workOrderNumber}
                </h3>
              </div>
              <button
                onClick={() => setCompleteJob(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#71717a' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmCompleteJob} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>
                  Work Performed Summary *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the exact diagnosis, repairs made, parts replaced, and validation tests performed..."
                  value={workPerformed}
                  onChange={(e) => setWorkPerformed(e.target.value)}
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

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>
                  Technician Remarks / Additional Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Advised customer on quarterly filter cleanups"
                  value={workAdditionalNotes}
                  onChange={(e) => setWorkAdditionalNotes(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #e4e4e7',
                    fontSize: '0.82rem',
                    outline: 'none',
                    background: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Summary of parts used */}
              {partsUsedList.length > 0 && (
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.76rem' }}>
                  <strong style={{ color: '#09090b' }}>Parts to be deducted from Inventory:</strong>
                  <div style={{ marginTop: '4px' }}>
                    {partsUsedList.map((p, idx) => (
                      <span key={idx} style={{ display: 'inline-block', marginRight: '8px', color: '#52525b' }}>
                        • {p.partName} ({p.quantity} {p.unit || 'pcs'})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos Attached Count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#52525b' }}>
                <Camera size={14} />
                <span>{jobPhotos.length} photo(s) attached for this job record</span>
              </div>

              {/* Customer Confirmation Checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#09090b', cursor: 'pointer', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  checked={customerSigned}
                  onChange={(e) => setCustomerSigned(e.target.checked)}
                />
                <span>Customer has verified the work on-site and confirmed resolution.</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCompleteJob(null)}
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
                  disabled={completeLoading}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {completeLoading ? 'Finalizing...' : 'Submit & Complete Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
