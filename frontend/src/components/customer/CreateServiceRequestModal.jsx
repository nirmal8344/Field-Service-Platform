import { useState, useEffect, useRef } from 'react';
import { X, UploadCloud } from 'lucide-react';
import { api } from '../../api/client';
import { useNotifications } from '../../context/useNotifications';

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CreateServiceRequestModal({ isOpen, onClose, onCreated, preselectedCategoryId }) {
  const { addToast } = useNotifications();
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [locations, setLocations] = useState([]);

  const [categoryId, setCategoryId] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [serviceLocationId, setServiceLocationId] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [photos, setPhotos] = useState([]); // [{ name, size, dataUrl }]
  const [priority, setPriority] = useState('MEDIUM');
  const [preferredDate, setPreferredDate] = useState(getTodayDateString());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!isOpen) return;

    const loadFormData = async () => {
      try {
        const [cats, locs] = await Promise.all([
          api.getCategories().catch(() => []),
          api.getServiceLocations().catch(() => [])
        ]);
        if (!isMounted) return;

        const catList = cats || [];
        const locList = locs || [];
        setCategories(catList);
        setLocations(locList);

        const targetCatId = preselectedCategoryId || (catList.length > 0 ? catList[0].id : '');
        setCategoryId(targetCatId);

        if (locList.length > 0) {
          const def = locList.find(l => l.defaultLocation) || locList[0];
          setServiceLocationId(def.id);
        }

        if (targetCatId) {
          const catFound = catList.find(c => c.id === Number(targetCatId));
          if (catFound && catFound.serviceTypes && catFound.serviceTypes.length > 0) {
            setServiceTypes(catFound.serviceTypes);
          } else {
            api.getTypesByCategory(targetCatId)
              .then(types => {
                if (isMounted) setServiceTypes(types || []);
              })
              .catch(() => {
                if (isMounted) setServiceTypes([]);
              });
          }
        }
      } catch (err) {
        console.error('Failed loading form data:', err);
      }
    };

    loadFormData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, preselectedCategoryId]);

  const handleCategoryChange = (newCatId) => {
    setCategoryId(newCatId);
    setServiceTypeId('');
    const catFound = categories.find(c => c.id === Number(newCatId));
    if (catFound && catFound.serviceTypes && catFound.serviceTypes.length > 0) {
      setServiceTypes(catFound.serviceTypes);
    } else {
      api.getTypesByCategory(newCatId)
        .then(types => setServiceTypes(types || []))
        .catch(() => setServiceTypes([]));
    }
  };

  if (!isOpen) return null;

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        addToast('Please upload valid image files (PNG, JPG, WebP).', 'warning', 'Invalid File');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        addToast(`File ${file.name} exceeds 10MB limit.`, 'warning', 'File Too Large');
        continue;
      }

      try {
        const uploadRes = await api.uploadPhoto(file);
        if (uploadRes && uploadRes.url) {
          setPhotos(prev => [
            ...prev,
            {
              name: file.name,
              size: (file.size / 1024).toFixed(1) + ' KB',
              url: uploadRes.url,
              dataUrl: uploadRes.url
            }
          ]);
        }
      } catch (err) {
        addToast(`Failed to upload ${file.name}: ${err.message}`, 'danger', 'Upload Error');
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = (index) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryId || !serviceLocationId || !problemDescription.trim()) {
      addToast('Please select category, location and provide problem details.', 'warning', 'Required Fields');
      return;
    }

    if (!startTime || !endTime) {
      addToast('Please select both start time and end time.', 'warning', 'Missing Time');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        categoryId: Number(categoryId),
        serviceTypeId: serviceTypeId ? Number(serviceTypeId) : undefined,
        serviceLocationId: Number(serviceLocationId),
        problemDescription: problemDescription.trim(),
        priority,
        preferredDate,
        preferredTimeSlot: `${startTime} - ${endTime}`,
        attachmentsJson: photos.length > 0 ? JSON.stringify(photos.map(p => ({ name: p.name, dataUrl: p.dataUrl }))) : undefined,
        notes: notes.trim() || undefined
      };

      const result = await api.createServiceRequest(payload);
      addToast(`Service request ${result.requestNumber} booked! Dispatcher notified.`, 'success', 'Booking Confirmed');
      if (onCreated) onCreated(result);
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to submit request', 'danger', 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
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
      padding: '20px',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '580px',
        padding: '28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em', margin: 0 }}>
              Book Field Technician Service
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '2px 0 0 0' }}>
              Select category, address, schedule, and problem details
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} color="#71717a" />
          </button>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* 1. Category & Package / Service Type */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                Service Category *
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 10px',
                  borderRadius: '10px',
                  border: '1.5px solid #e4e4e7',
                  background: '#ffffff',
                  fontSize: '0.84rem',
                  color: '#09090b',
                  outline: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  boxSizing: 'border-box'
                }}
              >
                <option value="" disabled>Select Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                Package / Service Type
              </label>
              <select
                value={serviceTypeId}
                onChange={(e) => setServiceTypeId(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 10px',
                  borderRadius: '10px',
                  border: '1.5px solid #e4e4e7',
                  background: '#ffffff',
                  fontSize: '0.84rem',
                  color: '#09090b',
                  outline: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  boxSizing: 'border-box'
                }}
              >
                <option value="">General Service / Diagnostic</option>
                {serviceTypes.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.estimatedHours || st.estimatedDurationHours || 1}h{st.basePrice ? ` • ₹${st.basePrice}` : ''})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Service Location Address */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
              Service Location Address *
            </label>
            <select
              required
              value={serviceLocationId}
              onChange={(e) => setServiceLocationId(e.target.value)}
              style={{
                width: '100%',
                height: '42px',
                padding: '0 10px',
                borderRadius: '10px',
                border: '1.5px solid #e4e4e7',
                background: '#ffffff',
                fontSize: '0.84rem',
                color: '#09090b',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                boxSizing: 'border-box'
              }}
            >
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.locationName} - {loc.address}, {loc.city}
                </option>
              ))}
              {locations.length === 0 && (
                <option value="">No address registered</option>
              )}
            </select>
          </div>

          {/* 3. Problem Description / Job Requirements */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
              Problem Description / Job Requirements *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Please describe the malfunction, equipment model, or specific work required..."
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1.5px solid #e4e4e7',
                fontSize: '0.86rem',
                color: '#09090b',
                outline: 'none',
                fontFamily: "'Inter', sans-serif",
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 4. Attachments / Photos (Optional) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#18181b' }}>
                Attachments / Photos (Optional)
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                multiple
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f4f4f5',
                  border: '1px solid #e4e4e7',
                  borderRadius: '9999px',
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#09090b',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#e4e4e7'}
                onMouseLeave={(e) => e.target.style.background = '#f4f4f5'}
              >
                <UploadCloud size={14} />
                <span>+ Upload Photos</span>
              </button>
            </div>

            {/* Photo Previews List */}
            {photos.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '10px',
                background: '#f9fafb',
                border: '1px solid #e4e4e7',
                borderRadius: '12px'
              }}>
                {photos.map((photo, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#ffffff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '0.76rem',
                      color: '#09090b'
                    }}
                  >
                    <img
                      src={photo.dataUrl}
                      alt={photo.name}
                      style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {photo.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '2px'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Priority | Preferred Date | Start Time | End Time */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 8px',
                  borderRadius: '10px',
                  border: '1.5px solid #e4e4e7',
                  background: '#ffffff',
                  fontSize: '0.82rem',
                  fontFamily: "'Inter', sans-serif",
                  boxSizing: 'border-box'
                }}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                Preferred Date
              </label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 8px',
                  borderRadius: '10px',
                  border: '1.5px solid #e4e4e7',
                  background: '#ffffff',
                  fontSize: '0.82rem',
                  fontFamily: "'Inter', sans-serif",
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 8px',
                  borderRadius: '10px',
                  border: '1.5px solid #e4e4e7',
                  background: '#ffffff',
                  fontSize: '0.82rem',
                  fontFamily: "'Inter', sans-serif",
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 8px',
                  borderRadius: '10px',
                  border: '1.5px solid #e4e4e7',
                  background: '#ffffff',
                  fontSize: '0.82rem',
                  fontFamily: "'Inter', sans-serif",
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* 6. Special Notes / Access Instructions */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
              Special Notes / Access Instructions (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Ring bell on 3rd floor, gate code #402"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                height: '42px',
                padding: '0 12px',
                borderRadius: '10px',
                border: '1.5px solid #e4e4e7',
                fontSize: '0.84rem',
                fontFamily: "'Inter', sans-serif",
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 7. Actions: Cancel & Confirm & Book Service */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '9999px',
                border: '1px solid #d4d4d8',
                background: '#ffffff',
                color: '#09090b',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '9px 24px',
                borderRadius: '9999px',
                border: 'none',
                background: '#09090b',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {loading ? 'Booking...' : 'Confirm & Book Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
