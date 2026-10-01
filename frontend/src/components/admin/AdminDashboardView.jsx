import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { 
  Boxes, 
  FileText,
  ClipboardList, 
  UserPlus,
  Plus,
  Trash2,
  Search,
  Wrench,
  X,
  Camera,
  Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../../api/client';
import { useNotifications } from '../../context/useNotifications';

export default function AdminDashboardView({ currentTab }) {
  const { addToast } = useNotifications();

  // Normalize active tab (e.g. 'admin-users' -> 'users')
  const getSubTab = (tab) => {
    if (!tab) return 'overview';
    if (tab.startsWith('admin-')) return tab.replace('admin-', '');
    return tab;
  };

  const activeSubTab = getSubTab(currentTab);

  // Real Application Data States
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Searches & Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [customerSearch, setCustomerSearch] = useState('');
  const [technicianSearch, setTechnicianSearch] = useState('');
  const [technicianStatusFilter, setTechnicianStatusFilter] = useState('ALL');
  const [requestSearch, setRequestSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('ALL');
  const [workOrderSearch, setWorkOrderSearch] = useState('');
  const [workOrderStatusFilter, setWorkOrderStatusFilter] = useState('ALL');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCatFilter, setInventoryCatFilter] = useState('ALL');
  const [auditSearch, setAuditSearch] = useState('');

  // Modals state
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Password@123');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('TECHNICIAN');
  const [newDept, setNewDept] = useState('HVAC');
  const [modalLoading, setModalLoading] = useState(false);

  // Category modal
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Inventory adjustment modal
  const [selectedPart, setSelectedPart] = useState(null);
  const [adjType, setAdjType] = useState('ADDED');
  const [adjQty, setAdjQty] = useState(10);
  const [adjReason, setAdjReason] = useState('');
  const [adjLoading, setAdjLoading] = useState(false);

  // New Part modal
  const [isAddPartModalOpen, setIsAddPartModalOpen] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [newPartCategory, setNewPartCategory] = useState('General');
  const [newPartSku, setNewPartSku] = useState('');
  const [newPartQty, setNewPartQty] = useState(20);
  const [newPartMin, setNewPartMin] = useState(5);
  const [newPartUnit] = useState('pcs');
  const [newPartCost, setNewPartCost] = useState(150);

  // Customer Details / History Modal
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState(null);

  // Service Request / Work Order Photo Gallery Modal
  const [photoGalleryData, setPhotoGalleryData] = useState(null); // { title: '', photos: [] }
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState(null);

  // Settings State
  const [slaTargetHours, setSlaTargetHours] = useState('4');
  const [serviceRadiusKm, setServiceRadiusKm] = useState('25');
  const [lowStockAlertThreshold, setLowStockAlertThreshold] = useState('5');
  const [businessHoursStart, setBusinessHoursStart] = useState('08:00');
  const [businessHoursEnd, setBusinessHoursEnd] = useState('20:00');

  // Load live data from database
  const loadAdminData = useCallback(async () => {
    try {
      const [, uList, cList, tList, reqs, wos, cats, inv, logs] = await Promise.all([
        api.getDashboardStats().catch(() => ({})),
        api.getAllUsers().catch(() => []),
        api.getAllCustomers().catch(() => []),
        api.getAllTechnicians().catch(() => []),
        api.getAllServiceRequests().catch(() => []),
        api.getAllWorkOrders().catch(() => []),
        api.getAllCategories().catch(() => []),
        api.getInventory().catch(() => []),
        api.getAuditLogs().catch(() => [])
      ]);

      setUsers(uList || []);
      setCustomers(cList || []);
      setTechnicians(tList || []);
      setServiceRequests(reqs || []);
      setWorkOrders(wos || []);
      setCategories(cats || []);
      setInventory(inv || []);
      setAuditLogs(logs || []);
    } catch (err) {
      console.error('Failed loading admin data:', err);
    }
  }, []);

  const fetchRef = useRef(null);
  useLayoutEffect(() => {
    fetchRef.current = loadAdminData;
  });

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active && fetchRef.current) await fetchRef.current();
    };
    run();
    return () => { active = false; };
  }, []);

  // Handle Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newEmail || !newPassword || !newName) {
      addToast('Please fill in required user details.', 'warning', 'Missing Details');
      return;
    }

    setModalLoading(true);
    try {
      await api.adminCreateUser({
        email: newEmail.trim(),
        password: newPassword,
        fullName: newName.trim(),
        phoneNumber: newPhone.trim() || undefined,
        role: newRole,
        department: newRole === 'TECHNICIAN' ? newDept : undefined
      });

      addToast(`User ${newName} (${newRole}) created successfully!`, 'success', 'User Created');
      setIsCreateUserModalOpen(false);
      setNewEmail('');
      setNewName('');
      setNewPhone('');
      loadAdminData();
    } catch (err) {
      addToast(err.message || 'Failed to create user', 'danger', 'Error');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete / deactivate this user?')) return;
    try {
      await api.deleteUser(userId);
      addToast('User deleted from system.', 'success', 'User Removed');
      loadAdminData();
    } catch (err) {
      addToast(err.message || 'Cannot delete user with active records.', 'danger', 'Error');
    }
  };

  // Handle Create Category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return;

    setModalLoading(true);
    try {
      await api.createCategory({
        name: newCatName.trim(),
        code: newCatCode.trim() || newCatName.toUpperCase().replace(/\s+/g, '_'),
        icon: 'Wrench',
        description: newCatDesc.trim() || undefined
      });
      addToast(`Service category "${newCatName}" created!`, 'success', 'Category Saved');
      setIsAddCatModalOpen(false);
      setNewCatName('');
      setNewCatCode('');
      setNewCatDesc('');
      loadAdminData();
    } catch (err) {
      addToast(err.message || 'Failed to create category', 'danger', 'Error');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Create Part
  const handleCreatePart = async (e) => {
    e.preventDefault();
    if (!newPartName || !newPartSku) return;

    setModalLoading(true);
    try {
      await api.createPart({
        partName: newPartName.trim(),
        category: newPartCategory.trim(),
        sku: newPartSku.trim().toUpperCase(),
        quantity: Number(newPartQty),
        minimumStock: Number(newPartMin),
        unit: newPartUnit.trim(),
        cost: Number(newPartCost)
      });
      addToast(`Part ${newPartName} added to warehouse inventory!`, 'success', 'Part Created');
      setIsAddPartModalOpen(false);
      setNewPartName('');
      setNewPartSku('');
      loadAdminData();
    } catch (err) {
      addToast(err.message || 'Failed to create part', 'danger', 'Error');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Adjust Inventory
  const handleAdjustInventory = async (e) => {
    e.preventDefault();
    if (!selectedPart) return;

    setAdjLoading(true);
    try {
      await api.adjustInventory(selectedPart.id, {
        transactionType: adjType,
        quantity: Number(adjQty),
        reason: adjReason.trim() || undefined
      });

      addToast(`Inventory adjusted for ${selectedPart.partName}`, 'success', 'Stock Updated');
      setSelectedPart(null);
      setAdjQty(10);
      setAdjReason('');
      loadAdminData();
    } catch (err) {
      addToast(err.message || 'Inventory adjustment failed', 'danger', 'Error');
    } finally {
      setAdjLoading(false);
    }
  };

  // Handle Save Settings
  const handleSaveSettings = (e) => {
    e.preventDefault();
    addToast('System configuration & SLA rules updated successfully.', 'success', 'Settings Saved');
  };

  // Helper to parse attachments JSON safely
  const parseAttachments = (attachmentsJson) => {
    if (!attachmentsJson) return [];
    try {
      const parsed = JSON.parse(attachmentsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Helper to get consistent customer display name
  const getCustomerDisplayName = (c) => {
    if (!c) return 'Customer';
    if (c.fullName && c.fullName.trim()) return c.fullName.trim();
    if (c.name && c.name.trim()) return c.name.trim();
    if (c.companyName && c.companyName.trim()) return c.companyName.trim();
    if (c.email) {
      const prefix = c.email.split('@')[0].replace(/[._-]/g, ' ');
      return prefix.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return `Customer #${c.id || ''}`;
  };

  // Helper to remove underscores and format user-facing codes into readable title case
  const humanizeText = (text) => {
    if (!text) return '';
    if (typeof text !== 'string') return String(text);

    const acronyms = {
      'AC': 'AC',
      'CCTV': 'CCTV',
      'MCB': 'MCB',
      'HVAC': 'HVAC',
      'IP': 'IP',
      'SKU': 'SKU',
      'WO': 'WO',
      'REQ': 'REQ',
      'SLA': 'SLA',
      'ID': 'ID',
      'PDF': 'PDF',
      'CSV': 'CSV',
      'INR': 'INR',
      'PCB': 'PCB'
    };

    // If text is ALL_CAPS or uppercase enum with underscores
    if (!/[a-z]/.test(text)) {
      return text
        .split(/[_\s]+/)
        .filter(Boolean)
        .map(word => {
          const upper = word.toUpperCase();
          if (acronyms[upper]) return acronyms[upper];
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
    }

    // For mixed case with underscores, replace underscores with spaces
    return text.replace(/_/g, ' ');
  };

  // Helper to extract clean skill names from technician skills (Array/Set of SkillDTO objects or strings)
  const getTechnicianSkillNames = (skills) => {
    if (!skills) return [];
    let list = [];
    if (Array.isArray(skills)) {
      list = skills;
    } else if (skills instanceof Set) {
      list = Array.from(skills);
    } else if (typeof skills === 'object') {
      list = Object.values(skills);
    } else if (typeof skills === 'string') {
      return [skills];
    }
    return list.map(s => {
      if (!s) return '';
      if (typeof s === 'string') return s;
      if (typeof s === 'object') return s.name || s.skillName || s.description || '';
      return String(s);
    }).filter(Boolean);
  };

  // Open Photos Gallery
  const openPhotoGallery = (title, attachmentsJson) => {
    const photos = parseAttachments(attachmentsJson);
    if (photos.length === 0) {
      addToast('No attachments uploaded for this record.', 'info', 'No Photos');
      return;
    }
    setPhotoGalleryData({ title, photos });
    setSelectedPhotoPreview(photos[0]?.dataUrl || null);
  };

  // --------------------------------------------------------------------------
  // EXPORT HANDLERS (CSV, Excel .xlsx, PDF)
  // --------------------------------------------------------------------------

  const exportCSVFile = (headers, rows, filename) => {
    const escapeCell = (cell) => {
      if (cell === null || cell === undefined) return '""';
      const str = String(cell).replace(/"/g, '""');
      return `"${str}"`;
    };
    const csvContent = [
      headers.map(escapeCell).join(','),
      ...rows.map(r => r.map(escapeCell).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Exported ${filename} successfully!`, 'success', 'CSV Downloaded');
  };

  const exportExcelFile = (headers, rows, filename, sheetName = 'Data') => {
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Auto-calculate column widths
    const colWidths = headers.map((h, colIndex) => {
      let maxLen = h.length;
      rows.forEach(row => {
        const val = row[colIndex] !== null && row[colIndex] !== undefined ? String(row[colIndex]) : '';
        if (val.length > maxLen) maxLen = Math.min(val.length, 45);
      });
      return { wch: Math.max(maxLen + 3, 12) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
    addToast(`Exported ${filename} successfully!`, 'success', 'Excel Downloaded');
  };

  const exportPDFFile = (title, headers, rows, filename, orientation = 'landscape') => {
    const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
    
    // Header title & metadata
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(9, 9, 11);
    doc.text(title, 36, 36);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(113, 113, 122);
    const dateStr = new Date().toLocaleString();
    doc.text(`FieldHub Field Service Platform | Generated: ${dateStr} | Total Records: ${rows.length}`, 36, 52);
    
    autoTable(doc, {
      startY: 65,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [9, 9, 11],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'left'
      },
      styles: {
        fontSize: 7,
        cellPadding: 4,
        textColor: [24, 24, 27],
        valign: 'middle',
        overflow: 'linebreak'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 30, right: 30, bottom: 35 },
      didDrawPage: () => {
        const str = `Page ${doc.internal.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.setTextColor(140);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
        doc.text(str, pageWidth - 50, pageHeight - 15);
      }
    });
    
    doc.save(filename);
    addToast(`Exported ${filename} successfully!`, 'success', 'PDF Downloaded');
  };

  // Master Export Trigger
  const handleExport = (reportType, format) => {
    const timestamp = new Date().toISOString().slice(0, 10);

    if (reportType === 'workorders') {
      const headers = [
        'Work Order', 'Request', 'Customer Name', 'Customer Email', 'Customer Phone',
        'Service Location', 'Category', 'Problem Description', 'Technician',
        'Scheduled Date', 'Time Window', 'Priority', 'Status', 'Parts Used', 'Work Notes', 'Completed At'
      ];
      const rows = workOrders.map(w => [
        w.workOrderNumber || `WO-${w.id}`,
        w.serviceRequestNumber || '-',
        w.customerName || '-',
        w.customerEmail || '-',
        w.customerPhone || '-',
        w.serviceLocationAddress || '-',
        w.serviceCategory || w.categoryName || '-',
        w.problemDescription || w.description || '-',
        w.technicianName || 'Unassigned',
        w.scheduledDate || '-',
        w.scheduledTimeSlot || (w.startTime ? `${w.startTime} - ${w.endTime || ''}` : '-'),
        humanizeText(w.priority || 'Medium'),
        humanizeText(w.status || 'Pending'),
        w.partsUsed || '-',
        w.notes || w.technicianNotes || '-',
        w.completedAt ? new Date(w.completedAt).toLocaleString() : '-'
      ]);

      if (format === 'csv') exportCSVFile(headers, rows, `work_orders_${timestamp}.csv`);
      else if (format === 'excel') exportExcelFile(headers, rows, `work_orders_${timestamp}.xlsx`, 'Work Orders');
      else if (format === 'pdf') exportPDFFile('FieldHub — Work Orders Report', headers, rows, `work_orders_${timestamp}.pdf`, 'landscape');
    }

    else if (reportType === 'technicians') {
      const headers = [
        'Technician ID', 'Full Name', 'Email', 'Phone', 'Department',
        'Skills', 'Availability Status', 'Assigned Active Jobs', 'Completed Jobs'
      ];
      const rows = technicians.map(t => {
        const assignedJobs = workOrders.filter(w => (w.technicianId === t.id || w.technicianName === t.fullName) && w.status !== 'COMPLETED' && w.status !== 'VERIFIED').length;
        const completedJobs = workOrders.filter(w => (w.technicianId === t.id || w.technicianName === t.fullName) && (w.status === 'COMPLETED' || w.status === 'VERIFIED')).length;
        return [
          t.id ? `TECH-${t.id}` : '-',
          t.fullName || '-',
          t.email || '-',
          t.phoneNumber || '-',
          t.department || 'General',
          getTechnicianSkillNames(t.skills).join(', ') || t.department || 'General',
          humanizeText(t.availability || 'Available'),
          assignedJobs,
          completedJobs
        ];
      });

      if (format === 'csv') exportCSVFile(headers, rows, `technicians_${timestamp}.csv`);
      else if (format === 'excel') exportExcelFile(headers, rows, `technicians_${timestamp}.xlsx`, 'Technicians');
      else if (format === 'pdf') exportPDFFile('FieldHub — Technicians Fleet Report', headers, rows, `technicians_${timestamp}.pdf`, 'landscape');
    }

    else if (reportType === 'inventory') {
      const headers = [
        'SKU', 'Part Name', 'Category', 'Current Stock', 'Minimum Threshold',
        'Unit', 'Unit Cost (INR)', 'Storage Location', 'Stock Status'
      ];
      const rows = inventory.map(i => [
        i.sku || '-',
        i.partName || '-',
        i.category || 'General',
        i.quantity ?? 0,
        i.minimumStock ?? 0,
        i.unit || 'pcs',
        i.cost ? `Rs. ${i.cost}` : '-',
        i.location || 'Central Warehouse',
        (i.quantity <= i.minimumStock) ? 'Low Stock' : (i.quantity === 0 ? 'Out of Stock' : 'In Stock')
      ]);

      if (format === 'csv') exportCSVFile(headers, rows, `inventory_${timestamp}.csv`);
      else if (format === 'excel') exportExcelFile(headers, rows, `inventory_${timestamp}.xlsx`, 'Inventory');
      else if (format === 'pdf') exportPDFFile('FieldHub — Parts & Inventory Report', headers, rows, `inventory_${timestamp}.pdf`, 'landscape');
    }

    else if (reportType === 'requests') {
      const headers = [
        'Request', 'Customer Name', 'Category', 'Service Type', 'Location Address',
        'Problem Description', 'Priority', 'Preferred Date', 'Time Window', 'Status', 'Assigned Technician', 'Created At'
      ];
      const rows = serviceRequests.map(r => [
        r.requestNumber || `REQ-${r.id}`,
        r.customerName || '-',
        r.categoryName || '-',
        r.serviceTypeName || '-',
        r.serviceLocationAddress || '-',
        r.problemDescription || '-',
        humanizeText(r.priority || 'Medium'),
        r.preferredDate || '-',
        r.preferredTimeSlot || '-',
        humanizeText(r.status || 'Submitted'),
        r.assignedTechnicianName || 'Unassigned',
        r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'
      ]);

      if (format === 'csv') exportCSVFile(headers, rows, `service_requests_${timestamp}.csv`);
      else if (format === 'excel') exportExcelFile(headers, rows, `service_requests_${timestamp}.xlsx`, 'Service Requests');
      else if (format === 'pdf') exportPDFFile('FieldHub — Service Requests Report', headers, rows, `service_requests_${timestamp}.pdf`, 'landscape');
    }
  };

  // --------------------------------------------------------------------------
  // FILTERED DATASETS
  // --------------------------------------------------------------------------

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.fullName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phoneNumber?.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredCustomers = customers.filter(c => {
    const name = getCustomerDisplayName(c);
    const email = c.email || '';
    const phone = c.phoneNumber || c.phone || c.alternatePhone || '';
    const type = c.customerType || '';
    const search = customerSearch.toLowerCase();
    return (
      name.toLowerCase().includes(search) ||
      email.toLowerCase().includes(search) ||
      phone.toLowerCase().includes(search) ||
      type.toLowerCase().includes(search)
    );
  });

  const filteredTechnicians = technicians.filter(t => {
    const skillNames = getTechnicianSkillNames(t.skills).join(' ').toLowerCase();
    const matchesSearch = 
      t.fullName?.toLowerCase().includes(technicianSearch.toLowerCase()) ||
      t.email?.toLowerCase().includes(technicianSearch.toLowerCase()) ||
      t.department?.toLowerCase().includes(technicianSearch.toLowerCase()) ||
      skillNames.includes(technicianSearch.toLowerCase());
    const matchesStatus = technicianStatusFilter === 'ALL' || t.availability === technicianStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredRequests = serviceRequests.filter(r => {
    const matchesSearch = 
      r.requestNumber?.toLowerCase().includes(requestSearch.toLowerCase()) ||
      r.customerName?.toLowerCase().includes(requestSearch.toLowerCase()) ||
      r.categoryName?.toLowerCase().includes(requestSearch.toLowerCase()) ||
      r.problemDescription?.toLowerCase().includes(requestSearch.toLowerCase());
    const matchesStatus = requestStatusFilter === 'ALL' || r.status === requestStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredWorkOrders = workOrders.filter(w => {
    const matchesSearch = 
      w.workOrderNumber?.toLowerCase().includes(workOrderSearch.toLowerCase()) ||
      w.customerName?.toLowerCase().includes(workOrderSearch.toLowerCase()) ||
      w.technicianName?.toLowerCase().includes(workOrderSearch.toLowerCase()) ||
      w.serviceTypeName?.toLowerCase().includes(workOrderSearch.toLowerCase());
    const matchesStatus = workOrderStatusFilter === 'ALL' || w.status === workOrderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredInventory = inventory.filter(i => {
    const matchesSearch = 
      i.partName?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      i.sku?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      i.category?.toLowerCase().includes(inventorySearch.toLowerCase());
    const matchesCat = inventoryCatFilter === 'ALL' || i.category === inventoryCatFilter;
    return matchesSearch && matchesCat;
  });

  const filteredAuditLogs = auditLogs.filter(a => {
    return (
      a.userEmail?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      a.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      a.details?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      a.entityType?.toLowerCase().includes(auditSearch.toLowerCase())
    );
  });

  // Calculate real metrics for Executive Overview
  const totalWorkOrdersCount = workOrders.length;
  const activeWorkOrdersCount = workOrders.filter(w => w.status !== 'COMPLETED' && w.status !== 'VERIFIED' && w.status !== 'CANCELLED').length;
  const availableTechsCount = technicians.filter(t => t.availability === 'AVAILABLE').length;
  const totalTechsCount = technicians.length;
  const pendingRequestsCount = serviceRequests.filter(r => r.status === 'SUBMITTED' || r.status === 'TRIAGED' || r.status === 'SCHEDULED').length;
  const lowStockPartsCount = inventory.filter(i => i.quantity <= i.minimumStock).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>

      {/* ========================================================================= */}
      {/* 1. EXECUTIVE OVERVIEW (Clean Operational Summary with Real Data Only)    */}
      {/* ========================================================================= */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Top Real KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            
            {/* Total Work Orders */}
            <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid #e4e4e7', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#71717a' }}>Total Work Orders</span>
                <ClipboardList size={18} color="#09090b" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.03em' }}>
                {totalWorkOrdersCount}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#71717a', marginTop: '4px' }}>
                {activeWorkOrdersCount} active / in-progress
              </div>
            </div>

            {/* Available Technicians */}
            <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid #e4e4e7', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#71717a' }}>Available Technicians</span>
                <Wrench size={18} color="#09090b" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.03em' }}>
                {availableTechsCount} / {totalTechsCount}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#71717a', marginTop: '4px' }}>
                Ready for immediate dispatch
              </div>
            </div>

            {/* Pending / Active Requests */}
            <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid #e4e4e7', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#71717a' }}>Pending / Active Requests</span>
                <FileText size={18} color="#09090b" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.03em' }}>
                {pendingRequestsCount}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#71717a', marginTop: '4px' }}>
                Awaiting dispatch / scheduling
              </div>
            </div>

            {/* Inventory Alerts */}
            <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid #e4e4e7', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#71717a' }}>Inventory Alerts</span>
                <Boxes size={18} color={lowStockPartsCount > 0 ? '#ef4444' : '#09090b'} />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: lowStockPartsCount > 0 ? '#dc2626' : '#09090b', letterSpacing: '-0.03em' }}>
                {lowStockPartsCount} Items
              </div>
              <div style={{ fontSize: '0.78rem', color: '#71717a', marginTop: '4px' }}>
                Below minimum stock threshold
              </div>
            </div>

          </div>

          {/* Work Orders by Category (Real Data Breakdown) */}
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '22px', border: '1px solid #e4e4e7', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  Work Orders by Category
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                  Live distribution of all field jobs across service domains
                </p>
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#71717a' }}>
                Total: {workOrders.length} Orders
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {categories.map(cat => {
                const count = workOrders.filter(w => w.categoryName === cat.name || w.serviceCategory === cat.name).length;
                const percentage = workOrders.length > 0 ? Math.round((count / workOrders.length) * 100) : 0;
                return (
                  <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px 16px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#09090b' }}>{cat.name}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '2px 8px', background: '#09090b', borderRadius: '9999px', color: '#ffffff' }}>
                        {count} Orders ({percentage}%)
                      </span>
                    </div>
                    {/* Visual bar */}
                    <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', background: '#09090b', borderRadius: '9999px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. USERS & ROLES TAB                                                     */}
      {/* ========================================================================= */}
      {activeSubTab === 'users' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                User & Role Management
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                Manage all system accounts, dispatchers, technicians, and customer profiles
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} color="#71717a" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="Search name, email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
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
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Roles</option>
                <option value="ADMINISTRATOR">Administrators</option>
                <option value="DISPATCHER">Dispatchers</option>
                <option value="TECHNICIAN">Technicians</option>
                <option value="CUSTOMER">Customers</option>
              </select>

              <button
                onClick={() => setIsCreateUserModalOpen(true)}
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
                <UserPlus size={14} />
                <span>Add User</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>User Details</th>
                  <th style={{ padding: '12px 16px' }}>Role</th>
                  <th style={{ padding: '12px 16px' }}>Phone</th>
                  <th style={{ padding: '12px 16px' }}>Linked Department</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#71717a' }}>
                      No users match the search / role criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#09090b' }}>{user.fullName}</div>
                        <div style={{ fontSize: '0.78rem', color: '#71717a' }}>{user.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: user.role === 'ADMINISTRATOR' ? '#09090b' : user.role === 'DISPATCHER' ? '#e0e7ff' : user.role === 'TECHNICIAN' ? '#fef3c7' : '#f1f5f9',
                          color: user.role === 'ADMINISTRATOR' ? '#ffffff' : user.role === 'DISPATCHER' ? '#3730a3' : user.role === 'TECHNICIAN' ? '#92400e' : '#334155'
                        }}>
                          {humanizeText(user.role)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#52525b' }}>
                        {user.phoneNumber || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#52525b' }}>
                        {user.department || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {user.role !== 'ADMINISTRATOR' && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            title="Remove user"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '6px'
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
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
      {/* 3. CUSTOMERS TAB                                                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'customers' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                Registered Customers ({customers.length})
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                All registered residential, commercial, and enterprise customer accounts
              </p>
            </div>

            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={14} color="#71717a" style={{ position: 'absolute', left: '10px', top: '12px' }} />
              <input
                type="text"
                placeholder="Search name, email, phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
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
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Customer Name</th>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px' }}>Contact Email</th>
                  <th style={{ padding: '12px 16px' }}>Phone</th>
                  <th style={{ padding: '12px 16px' }}>Service History</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#71717a' }}>
                      No customer accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(customer => {
                    const custName = getCustomerDisplayName(customer);
                    const custReqs = serviceRequests.filter(r => r.customerId === customer.id || (custName && r.customerName === custName));
                    const custWos = workOrders.filter(w => w.customerId === customer.id || (custName && w.customerName === custName));

                    return (
                      <tr key={customer.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#09090b', fontSize: '0.88rem' }}>{custName}</div>
                          <div style={{ fontSize: '0.74rem', color: '#71717a' }}>ID: CUST-{customer.id}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: '#f1f5f9',
                            color: '#334155'
                          }}>
                            {humanizeText(customer.customerType || 'Residential')}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#52525b' }}>
                          {customer.email || '-'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#52525b' }}>
                          {customer.phoneNumber || customer.phone || customer.alternatePhone || '-'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: '0.78rem', color: '#52525b' }}>
                            {custReqs.length} Requests • {custWos.length} Work Orders
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedCustomerForHistory(customer)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              border: '1px solid #e4e4e7',
                              background: '#ffffff',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              color: '#09090b'
                            }}
                          >
                            <Eye size={12} />
                            <span>View Records</span>
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
      {/* 4. TECHNICIANS TAB                                                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'technicians' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                Technician Fleet ({technicians.length})
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                On-field technicians, specialization departments, availability, and active job loads
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} color="#71717a" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="Search technician..."
                  value={technicianSearch}
                  onChange={(e) => setTechnicianSearch(e.target.value)}
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
                value={technicianStatusFilter}
                onChange={(e) => setTechnicianStatusFilter(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Availability</option>
                <option value="AVAILABLE">Available</option>
                <option value="ON_JOB">On Job / Dispatched</option>
                <option value="OFF_DUTY">Off Duty</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Technician</th>
                  <th style={{ padding: '12px 16px' }}>Department</th>
                  <th style={{ padding: '12px 16px' }}>Skills</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Active Assigned</th>
                  <th style={{ padding: '12px 16px' }}>Completed Jobs</th>
                </tr>
              </thead>
              <tbody>
                {filteredTechnicians.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#71717a' }}>
                      No technicians match criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTechnicians.map(tech => {
                    const activeAssigned = workOrders.filter(w => (w.technicianId === tech.id || w.technicianName === tech.fullName) && w.status !== 'COMPLETED' && w.status !== 'VERIFIED').length;
                    const completedJobs = workOrders.filter(w => (w.technicianId === tech.id || w.technicianName === tech.fullName) && (w.status === 'COMPLETED' || w.status === 'VERIFIED')).length;

                    return (
                      <tr key={tech.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#09090b' }}>{tech.fullName}</div>
                          <div style={{ fontSize: '0.74rem', color: '#71717a' }}>TECH-{tech.id} • {tech.phoneNumber || tech.email || ''}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#09090b' }}>
                          {tech.department || 'General HVAC'}
                        </td>
                        <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                          {(() => {
                            const skillNames = getTechnicianSkillNames(tech.skills);
                            if (skillNames.length === 0) {
                              return <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{tech.department || 'General'}</span>;
                            }
                            return (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                {skillNames.map((skill, idx) => (
                                  <span
                                    key={idx}
                                    style={{
                                      display: 'inline-block',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      background: '#f4f4f5',
                                      color: '#18181b',
                                      fontSize: '0.75rem',
                                      fontWeight: 500,
                                      border: '1px solid #e4e4e7'
                                    }}
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 9px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: tech.availability === 'AVAILABLE' ? '#dcfce7' : tech.availability === 'ON_JOB' ? '#fef3c7' : '#f1f5f9',
                            color: tech.availability === 'AVAILABLE' ? '#166534' : tech.availability === 'ON_JOB' ? '#92400e' : '#64748b'
                          }}>
                            {humanizeText(tech.availability || 'AVAILABLE')}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#09090b' }}>
                          {activeAssigned} Jobs
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#16a34a' }}>
                          {completedJobs} Done
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
      {/* 5. SERVICE REQUESTS TAB                                                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'requests' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                Service Requests ({serviceRequests.length})
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                Customer reported issues, service requests, priority, scheduled slots, and attachments
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} color="#71717a" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="Search request..."
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
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
                value={requestStatusFilter}
                onChange={(e) => setRequestStatusFilter(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="TRIAGED">Triaged</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Request</th>
                  <th style={{ padding: '12px 16px' }}>Customer</th>
                  <th style={{ padding: '12px 16px' }}>Category & Problem</th>
                  <th style={{ padding: '12px 16px' }}>Schedule Window</th>
                  <th style={{ padding: '12px 16px' }}>Priority</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Attachments</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#71717a' }}>
                      No service requests match search.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map(req => {
                    const photos = parseAttachments(req.attachmentsJson);

                    return (
                      <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#09090b' }}>
                          {req.requestNumber || `REQ-${req.id}`}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#09090b' }}>{req.customerName || 'Customer'}</div>
                          <div style={{ fontSize: '0.74rem', color: '#71717a' }}>{req.serviceLocationAddress || 'Address on file'}</div>
                        </td>
                        <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                          <div style={{ fontWeight: 700, color: '#09090b', fontSize: '0.82rem' }}>{req.categoryName || 'Service'}</div>
                          <div style={{ fontSize: '0.76rem', color: '#52525b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {req.problemDescription || '-'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#52525b' }}>
                          <div>{req.preferredDate || '-'}</div>
                          <div style={{ color: '#71717a' }}>{req.preferredTimeSlot || '-'}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: req.priority === 'CRITICAL' ? '#fee2e2' : req.priority === 'HIGH' ? '#ffedd5' : '#f1f5f9',
                            color: req.priority === 'CRITICAL' ? '#991b1b' : req.priority === 'HIGH' ? '#9a3412' : '#334155'
                          }}>
                            {humanizeText(req.priority || 'MEDIUM')}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: req.status === 'COMPLETED' ? '#dcfce7' : req.status === 'IN_PROGRESS' ? '#dbeafe' : req.status === 'SCHEDULED' ? '#e0e7ff' : '#f4f4f5',
                            color: req.status === 'COMPLETED' ? '#166534' : req.status === 'IN_PROGRESS' ? '#1e40af' : req.status === 'SCHEDULED' ? '#3730a3' : '#3f3f46'
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
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                border: '1px solid #09090b',
                                background: '#09090b',
                                color: '#ffffff',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <Camera size={12} />
                              <span>Photos ({photos.length})</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.74rem', color: '#a1a1aa' }}>None</span>
                          )}
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
      {/* 6. WORK ORDERS TAB                                                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'workorders' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                Work Orders ({workOrders.length})
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                Complete operational work orders ledger, assigned technicians, schedules, and completion details
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} color="#71717a" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="Search work order..."
                  value={workOrderSearch}
                  onChange={(e) => setWorkOrderSearch(e.target.value)}
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
                value={workOrderStatusFilter}
                onChange={(e) => setWorkOrderStatusFilter(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="UNASSIGNED">Unassigned</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="VERIFIED">Verified</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>WO / Request</th>
                  <th style={{ padding: '12px 16px' }}>Customer & Location</th>
                  <th style={{ padding: '12px 16px' }}>Category & Job</th>
                  <th style={{ padding: '12px 16px' }}>Technician</th>
                  <th style={{ padding: '12px 16px' }}>Scheduled Date</th>
                  <th style={{ padding: '12px 16px' }}>Priority</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#71717a' }}>
                      No work orders match search.
                    </td>
                  </tr>
                ) : (
                  filteredWorkOrders.map(wo => (
                    <tr key={wo.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#09090b' }}>{wo.workOrderNumber || `WO-${wo.id}`}</div>
                        <div style={{ fontSize: '0.74rem', color: '#71717a' }}>Ref: {wo.serviceRequestNumber || 'Direct'}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#09090b' }}>{wo.customerName || 'Customer'}</div>
                        <div style={{ fontSize: '0.74rem', color: '#71717a' }}>{wo.serviceLocationAddress || '-'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '220px' }}>
                        <div style={{ fontWeight: 700, color: '#09090b', fontSize: '0.82rem' }}>{wo.serviceCategory || wo.categoryName || 'Service'}</div>
                        <div style={{ fontSize: '0.76rem', color: '#52525b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {wo.problemDescription || wo.description || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#09090b' }}>
                        {wo.technicianName || <span style={{ color: '#ea580c', fontWeight: 700 }}>Unassigned</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#52525b' }}>
                        <div>{wo.scheduledDate || '-'}</div>
                        <div style={{ color: '#71717a' }}>{wo.scheduledTimeSlot || (wo.startTime ? `${wo.startTime} - ${wo.endTime || ''}` : '-')}</div>
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
                          {humanizeText(wo.priority || 'MEDIUM')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: wo.status === 'COMPLETED' || wo.status === 'VERIFIED' ? '#dcfce7' : wo.status === 'IN_PROGRESS' ? '#dbeafe' : wo.status === 'ASSIGNED' ? '#e0e7ff' : '#fef3c7',
                          color: wo.status === 'COMPLETED' || wo.status === 'VERIFIED' ? '#166534' : wo.status === 'IN_PROGRESS' ? '#1e40af' : wo.status === 'ASSIGNED' ? '#3730a3' : '#92400e'
                        }}>
                          {humanizeText(wo.status)}
                        </span>
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
      {/* 7. INVENTORY & PARTS TAB                                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'inventory' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                Inventory & Spare Parts ({inventory.length})
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                Warehouse stock levels, SKU tracking, reorder thresholds, and stock adjustment
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} color="#71717a" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="Search SKU or part name..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
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
                value={inventoryCatFilter}
                onChange={(e) => setInventoryCatFilter(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Categories</option>
                {Array.from(new Set(inventory.map(i => i.category).filter(Boolean))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <button
                onClick={() => setIsAddPartModalOpen(true)}
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
                <Plus size={14} />
                <span>Add Part</span>
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>SKU / Part Name</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Available Stock</th>
                  <th style={{ padding: '12px 16px' }}>Min Threshold</th>
                  <th style={{ padding: '12px 16px' }}>Unit Cost</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Stock Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#71717a' }}>
                      No inventory parts match criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map(item => {
                    const isLow = item.quantity <= item.minimumStock;
                    const isOut = item.quantity === 0;

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#09090b' }}>{item.partName}</div>
                          <div style={{ fontSize: '0.74rem', color: '#71717a', fontFamily: 'monospace' }}>SKU: {item.sku}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#52525b' }}>
                          {item.category || 'General'}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: isOut ? '#dc2626' : isLow ? '#d97706' : '#09090b' }}>
                          {item.quantity} {item.unit || 'pcs'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#71717a' }}>
                          {item.minimumStock} {item.unit || 'pcs'}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#09090b' }}>
                          {item.cost ? `Rs. ${item.cost}` : '-'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: isOut ? '#fee2e2' : isLow ? '#fef3c7' : '#dcfce7',
                            color: isOut ? '#991b1b' : isLow ? '#92400e' : '#166534'
                          }}>
                            {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              setSelectedPart(item);
                              setAdjQty(10);
                              setAdjType('ADDED');
                              setAdjReason('');
                            }}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '8px',
                              border: '1px solid #e4e4e7',
                              background: '#ffffff',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              color: '#09090b'
                            }}
                          >
                            Adjust Stock
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
      {/* 8. REPORTS & EXPORTS TAB (CSV, Excel .xlsx, PDF)                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'reports' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
              Operational Reports & Exports
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
              Export system datasets with accurate columns in CSV, formatted Excel (.xlsx), or professional PDF documents
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            
            {/* 1. Work Orders Export */}
            <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid #e4e4e7', background: '#fafafa', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <ClipboardList size={18} color="#09090b" />
                  <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#09090b' }}>Work Orders Report</h4>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#71717a' }}>
                  Complete work orders ledger with customer contact, technician, schedules, priority, status, parts, and notes.
                </p>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
                  {workOrders.length} records available
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleExport('workorders', 'csv')}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #e4e4e7', background: '#ffffff', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', color: '#09090b' }}
                >
                  CSV
                </button>
                <button
                  onClick={() => handleExport('workorders', 'excel')}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #e4e4e7', background: '#ffffff', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', color: '#166534' }}
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleExport('workorders', 'pdf')}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #09090b', background: '#09090b', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', color: '#ffffff' }}
                >
                  PDF
                </button>
              </div>
            </div>

            {/* 2. Technicians Fleet Export */}
            <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid #e4e4e7', background: '#fafafa', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Wrench size={18} color="#09090b" />
                  <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#09090b' }}>Technician Fleet Report</h4>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#71717a' }}>
                  Technician roster, specialization department, skills, availability status, active job count, and completed metrics.
                </p>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
                  {technicians.length} records available
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleExport('technicians', 'csv')}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #e4e4e7', background: '#ffffff', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', color: '#09090b' }}
                >
                  CSV
                </button>
                <button
                  onClick={() => handleExport('technicians', 'excel')}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #e4e4e7', background: '#ffffff', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', color: '#166534' }}
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleExport('technicians', 'pdf')}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #09090b', background: '#09090b', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', color: '#ffffff' }}
                >
                  PDF
                </button>
              </div>
            </div>

            {/* 3. Parts & Inventory Export */}
            <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid #e4e4e7', background: '#fafafa', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Boxes size={18} color="#09090b" />
                  <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#09090b' }}>Inventory Report</h4>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#71717a' }}>
                  Stock inventory, SKU codes, categories, warehouse stock quantities, minimum threshold alerts, and unit costs.
                </p>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
                  {inventory.length} records available
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleExport('inventory', 'csv')}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #e4e4e7', background: '#ffffff', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', color: '#09090b' }}
                >
                  CSV
                </button>
                <button
                  onClick={() => handleExport('inventory', 'excel')}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #e4e4e7', background: '#ffffff', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', color: '#166534' }}
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleExport('inventory', 'pdf')}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #09090b', background: '#09090b', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', color: '#ffffff' }}
                >
                  PDF
                </button>
              </div>
            </div>

            {/* 4. Service Requests Export */}
            <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid #e4e4e7', background: '#fafafa', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <FileText size={18} color="#09090b" />
                  <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#09090b' }}>Service Requests Report</h4>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#71717a' }}>
                  Customer booking requests, category, service type, location, problem description, preferred schedule, and status.
                </p>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
                  {serviceRequests.length} records available
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleExport('requests', 'csv')}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #e4e4e7', background: '#ffffff', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', color: '#09090b' }}
                >
                  CSV
                </button>
                <button
                  onClick={() => handleExport('requests', 'excel')}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #e4e4e7', background: '#ffffff', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', color: '#166534' }}
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleExport('requests', 'pdf')}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #09090b', background: '#09090b', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', color: '#ffffff' }}
                >
                  PDF
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. AUDIT TRAIL TAB                                                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'audit' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                System Audit Trail ({auditLogs.length})
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                Immutable audit log of all system activities, status transitions, inventory changes, and admin actions
              </p>
            </div>

            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={14} color="#71717a" style={{ position: 'absolute', left: '10px', top: '12px' }} />
              <input
                type="text"
                placeholder="Search audit details, user..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
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
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Timestamp</th>
                  <th style={{ padding: '12px 16px' }}>User Email</th>
                  <th style={{ padding: '12px 16px' }}>Action</th>
                  <th style={{ padding: '12px 16px' }}>Entity Type</th>
                  <th style={{ padding: '12px 16px' }}>Audit Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#71717a' }}>
                      No audit records found.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', color: '#71717a', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#09090b' }}>
                        {log.userEmail || 'System'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: '#09090b',
                          color: '#ffffff'
                        }}>
                          {humanizeText(log.action)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#52525b', fontSize: '0.8rem' }}>
                        {humanizeText(log.entityType) || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#52525b', fontSize: '0.8rem' }}>
                        {humanizeText(log.details) || '-'}
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
      {/* 10. SETTINGS & SERVICE CATEGORIES TAB                                    */}
      {/* ========================================================================= */}
      {(activeSubTab === 'settings' || activeSubTab === 'catalog') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Service Categories Section */}
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  Service Categories ({categories.length})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
                  Manage active service categories, domain codes, and descriptions
                </p>
              </div>

              <button
                onClick={() => setIsAddCatModalOpen(true)}
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
                <Plus size={14} />
                <span>Add Category</span>
              </button>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e4e7', color: '#71717a', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Category Name</th>
                    <th style={{ padding: '12px 16px' }}>System Code</th>
                    <th style={{ padding: '12px 16px' }}>Description</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#09090b' }}>
                        {cat.name}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#52525b', fontWeight: 600 }}>
                        {humanizeText(cat.code)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#71717a', fontSize: '0.8rem' }}>
                        {cat.description || 'Core service package'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: '#dcfce7',
                          color: '#166534'
                        }}>
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Operational SLA & Dispatch Configuration */}
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e4e4e7' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: '0 0 16px 0' }}>
              Platform SLA & Dispatch Configuration
            </h3>

            <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '6px' }}>
                  SLA Target Response (Hours)
                </label>
                <input
                  type="number"
                  value={slaTargetHours}
                  onChange={(e) => setSlaTargetHours(e.target.value)}
                  style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '6px' }}>
                  Maximum Dispatch Radius (km)
                </label>
                <input
                  type="number"
                  value={serviceRadiusKm}
                  onChange={(e) => setServiceRadiusKm(e.target.value)}
                  style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '6px' }}>
                  Low Inventory Warning Threshold
                </label>
                <input
                  type="number"
                  value={lowStockAlertThreshold}
                  onChange={(e) => setLowStockAlertThreshold(e.target.value)}
                  style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '6px' }}>
                  Business Operating Hours
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="time"
                    value={businessHoursStart}
                    onChange={(e) => setBusinessHoursStart(e.target.value)}
                    style={{ flex: 1, height: '38px', padding: '0 10px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.82rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#71717a' }}>to</span>
                  <input
                    type="time"
                    value={businessHoursEnd}
                    onChange={(e) => setBusinessHoursEnd(e.target.value)}
                    style={{ flex: 1, height: '38px', padding: '0 10px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                <button
                  type="submit"
                  style={{
                    padding: '10px 22px',
                    borderRadius: '9999px',
                    background: '#09090b',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Add User                                                          */}
      {/* ========================================================================= */}
      {isCreateUserModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#09090b' }}>Create System User</h3>
              <button onClick={() => setIsCreateUserModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Full Name *</label>
                <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Karthik Rajan" style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Email Address *</label>
                <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@fieldhub.com" style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Temporary Password *</label>
                <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Role</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.84rem' }}>
                    <option value="ADMINISTRATOR">Administrator</option>
                    <option value="DISPATCHER">Dispatcher</option>
                    <option value="TECHNICIAN">Technician</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Phone Number</label>
                  <input type="text" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+91 98765 43210" style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.84rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              {newRole === 'TECHNICIAN' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Department / Trade</label>
                  <select value={newDept} onChange={(e) => setNewDept(e.target.value)} style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.84rem' }}>
                    <option value="HVAC">HVAC & Air Conditioning</option>
                    <option value="Electrical">Electrical Works</option>
                    <option value="Plumbing">Plumbing Services</option>
                    <option value="Security">Security & CCTV</option>
                    <option value="Appliances">Home Appliances</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsCreateUserModalOpen(false)} style={{ padding: '9px 18px', borderRadius: '9999px', border: '1px solid #e4e4e7', background: 'transparent', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={modalLoading} style={{ padding: '9px 20px', borderRadius: '9999px', background: '#09090b', color: '#ffffff', border: 'none', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                  {modalLoading ? 'Creating...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Add Category                                                      */}
      {/* ========================================================================= */}
      {isAddCatModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#09090b' }}>Add Service Category</h3>
              <button onClick={() => setIsAddCatModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Category Name *</label>
                <input type="text" required value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="e.g. Solar Power Maintenance" style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>System Code (Optional)</label>
                <input type="text" value={newCatCode} onChange={(e) => setNewCatCode(e.target.value)} placeholder="e.g. SOLAR_MAINT" style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Description</label>
                <textarea rows={3} value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)} placeholder="Overview of services included..." style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.84rem', boxSizing: 'border-box', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsAddCatModalOpen(false)} style={{ padding: '9px 18px', borderRadius: '9999px', border: '1px solid #e4e4e7', background: 'transparent', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={modalLoading} style={{ padding: '9px 20px', borderRadius: '9999px', background: '#09090b', color: '#ffffff', border: 'none', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                  {modalLoading ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Add Part                                                          */}
      {/* ========================================================================= */}
      {isAddPartModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#09090b' }}>Add Inventory Part</h3>
              <button onClick={() => setIsAddPartModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreatePart} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Part Name *</label>
                <input type="text" required value={newPartName} onChange={(e) => setNewPartName(e.target.value)} placeholder="e.g. Copper Piping Set 1/2 inch" style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>SKU Code *</label>
                  <input type="text" required value={newPartSku} onChange={(e) => setNewPartSku(e.target.value)} placeholder="e.g. HVAC-PIPE-01" style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.84rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Category</label>
                  <input type="text" value={newPartCategory} onChange={(e) => setNewPartCategory(e.target.value)} placeholder="HVAC / Plumbing" style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.84rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Quantity</label>
                  <input type="number" min="0" value={newPartQty} onChange={(e) => setNewPartQty(e.target.value)} style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.84rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Min Alert</label>
                  <input type="number" min="0" value={newPartMin} onChange={(e) => setNewPartMin(e.target.value)} style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.84rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Unit Cost (₹)</label>
                  <input type="number" min="0" value={newPartCost} onChange={(e) => setNewPartCost(e.target.value)} style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.84rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsAddPartModalOpen(false)} style={{ padding: '9px 18px', borderRadius: '9999px', border: '1px solid #e4e4e7', background: 'transparent', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={modalLoading} style={{ padding: '9px 20px', borderRadius: '9999px', background: '#09090b', color: '#ffffff', border: 'none', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                  {modalLoading ? 'Saving...' : 'Save Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Adjust Inventory Stock                                            */}
      {/* ========================================================================= */}
      {selectedPart && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#09090b' }}>Adjust Stock Level</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#71717a' }}>{selectedPart.partName} (Current: {selectedPart.quantity})</p>
              </div>
              <button onClick={() => setSelectedPart(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleAdjustInventory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Adjustment Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setAdjType('ADDED')}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: adjType === 'ADDED' ? '2px solid #09090b' : '1px solid #e4e4e7',
                      background: adjType === 'ADDED' ? '#f4f4f5' : '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    + Restock / Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('DEDUCTED')}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: adjType === 'DEDUCTED' ? '2px solid #09090b' : '1px solid #e4e4e7',
                      background: adjType === 'DEDUCTED' ? '#f4f4f5' : '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    - Deduct / Used
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Quantity</label>
                <input type="number" min="1" required value={adjQty} onChange={(e) => setAdjQty(e.target.value)} style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Adjustment Reason (Optional)</label>
                <input type="text" value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="e.g. Shipment received / Damaged part" style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setSelectedPart(null)} style={{ padding: '9px 18px', borderRadius: '9999px', border: '1px solid #e4e4e7', background: 'transparent', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={adjLoading} style={{ padding: '9px 20px', borderRadius: '9999px', background: '#09090b', color: '#ffffff', border: 'none', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                  {adjLoading ? 'Updating...' : 'Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Customer History Records                                          */}
      {/* ========================================================================= */}
      {selectedCustomerForHistory && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#09090b' }}>
                  {getCustomerDisplayName(selectedCustomerForHistory)} — Service History
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#71717a' }}>
                  {selectedCustomerForHistory.email} • {selectedCustomerForHistory.phoneNumber || selectedCustomerForHistory.phone || 'No phone'}
                </p>
              </div>
              <button onClick={() => setSelectedCustomerForHistory(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Linked Service Requests */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#09090b', marginBottom: '8px' }}>
                  Submitted Service Requests
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {serviceRequests.filter(r => r.customerId === selectedCustomerForHistory.id || (selectedCustomerForHistory.fullName && r.customerName === selectedCustomerForHistory.fullName)).length === 0 ? (
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', fontSize: '0.8rem', color: '#71717a' }}>No service requests logged.</div>
                  ) : (
                    serviceRequests.filter(r => r.customerId === selectedCustomerForHistory.id || (selectedCustomerForHistory.fullName && r.customerName === selectedCustomerForHistory.fullName)).map(r => (
                      <div key={r.id} style={{ padding: '12px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e4e4e7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#09090b' }}>{r.requestNumber || `REQ-${r.id}`} — {r.categoryName}</div>
                          <div style={{ fontSize: '0.76rem', color: '#71717a' }}>{r.problemDescription}</div>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', background: '#e4e4e7', color: '#09090b' }}>
                          {humanizeText(r.status)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Linked Work Orders */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#09090b', marginBottom: '8px' }}>
                  Dispatched Work Orders
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {workOrders.filter(w => w.customerId === selectedCustomerForHistory.id || (selectedCustomerForHistory.fullName && w.customerName === selectedCustomerForHistory.fullName)).length === 0 ? (
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', fontSize: '0.8rem', color: '#71717a' }}>No work orders dispatched.</div>
                  ) : (
                    workOrders.filter(w => w.customerId === selectedCustomerForHistory.id || (selectedCustomerForHistory.fullName && w.customerName === selectedCustomerForHistory.fullName)).map(w => (
                      <div key={w.id} style={{ padding: '12px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e4e4e7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#09090b' }}>{w.workOrderNumber || `WO-${w.id}`} • Tech: {w.technicianName || 'Unassigned'}</div>
                          <div style={{ fontSize: '0.76rem', color: '#71717a' }}>Scheduled: {w.scheduledDate || '-'} ({w.scheduledTimeSlot || '-'})</div>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', background: '#09090b', color: '#ffffff' }}>
                          {humanizeText(w.status)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button onClick={() => setSelectedCustomerForHistory(null)} style={{ padding: '8px 18px', borderRadius: '9999px', background: '#09090b', color: '#ffffff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Customer Uploaded Photos / Attachments Gallery                    */}
      {/* ========================================================================= */}
      {photoGalleryData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '640px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#09090b' }}>{photoGalleryData.title}</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#71717a' }}>{photoGalleryData.photos.length} attachment(s) uploaded by customer</p>
              </div>
              <button onClick={() => setPhotoGalleryData(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* Main Preview */}
            {selectedPhotoPreview && (
              <div style={{ width: '100%', height: '280px', background: '#09090b', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <img src={selectedPhotoPreview} alt="Customer attachment" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            )}

            {/* Thumbnail Row */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
              {photoGalleryData.photos.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPhotoPreview(p.dataUrl)}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: selectedPhotoPreview === p.dataUrl ? '2px solid #09090b' : '1px solid #e4e4e7',
                    flexShrink: 0
                  }}
                >
                  <img src={p.dataUrl} alt={p.name || `Photo ${idx+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setPhotoGalleryData(null)} style={{ padding: '8px 18px', borderRadius: '9999px', background: '#09090b', color: '#ffffff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Close Preview</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
