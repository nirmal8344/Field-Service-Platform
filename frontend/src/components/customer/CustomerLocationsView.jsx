import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { 
  MapPin, 
  Plus, 
  Trash2, 
  User, 
  Edit3,
  X
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/useAuth';
import { useNotifications } from '../../context/useNotifications';

export default function CustomerLocationsView() {
  const { currentUser } = useAuth();
  const { addToast } = useNotifications();

  const [locations, setLocations] = useState([]);
  const [profile, setProfile] = useState(null);

  // Modal & Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);
  const [locName, setLocName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Noida');
  const [state, setState] = useState('Uttar Pradesh');
  const [postalCode, setPostalCode] = useState('201301');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [profileNotes, setProfileNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [locs, prof] = await Promise.all([
        api.getServiceLocations(),
        api.getMyCustomerProfile().catch(() => null)
      ]);
      setLocations(locs || []);
      if (prof) {
        setProfile(prof);
        setCompanyName(prof.companyName || '');
        setAltPhone(prof.secondaryPhone || prof.alternatePhone || '');
        setProfileNotes(prof.notes || '');
      }
    } catch (err) {
      console.error('Error loading locations & profile:', err);
    }
  }, []);

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
  }, []);

  const handleOpenAdd = () => {
    setEditingLoc(null);
    setLocName('');
    setAddress('');
    setCity('Noida');
    setState('Uttar Pradesh');
    setPostalCode('201301');
    setContactPerson(currentUser?.fullName || '');
    setContactPhone(currentUser?.phoneNumber || '');
    setIsDefault(locations.length === 0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (loc) => {
    setEditingLoc(loc);
    setLocName(loc.locationName || '');
    setAddress(loc.address || '');
    setCity(loc.city || '');
    setState(loc.state || '');
    setPostalCode(loc.postalCode || '');
    setContactPerson(loc.contactPerson || '');
    setContactPhone(loc.contactPhone || '');
    setIsDefault(loc.defaultLocation || false);
    setIsModalOpen(true);
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!locName.trim() || !address.trim() || !city.trim()) {
      addToast('Please fill in required location fields.', 'warning', 'Missing Details');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        locationName: locName.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        contactPerson: contactPerson.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        defaultLocation: isDefault
      };

      if (editingLoc) {
        await api.updateServiceLocation(editingLoc.id, payload);
        addToast('Service location updated successfully!', 'success', 'Location Saved');
      } else {
        await api.createServiceLocation(payload);
        addToast('New service location added!', 'success', 'Location Created');
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to save location', 'danger', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!confirm('Are you sure you want to remove this service address?')) return;
    try {
      await api.deleteServiceLocation(id);
      addToast('Service location removed.', 'success', 'Deleted');
      loadData();
    } catch (err) {
      addToast(err.message || 'Cannot delete active location', 'danger', 'Error');
    }
  };

  const handleSetDefault = async (loc) => {
    try {
      await api.updateServiceLocation(loc.id, {
        ...loc,
        defaultLocation: true
      });
      addToast(`Set "${loc.locationName}" as primary default location.`, 'success', 'Default Updated');
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to set default location', 'danger', 'Error');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.updateMyCustomerProfile({
        companyName: companyName.trim() || undefined,
        secondaryPhone: altPhone.trim() || undefined,
        notes: profileNotes.trim() || undefined
      });
      addToast('Customer profile details updated successfully!', 'success', 'Profile Saved');
      setIsEditingProfile(false);
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'danger', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1080px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      
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
            Service Locations & Customer Profile
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#71717a', margin: '4px 0 0 0' }}>
            Manage addresses for doorstep technician dispatches and review account contact details
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '9999px',
            border: 'none',
            background: '#09090b',
            color: '#ffffff',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => e.target.style.background = '#27272a'}
          onMouseLeave={(e) => e.target.style.background = '#09090b'}
        >
          <Plus size={16} />
          <span>Add New Location</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Service Locations List Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e4e4e7',
          borderRadius: '20px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#09090b', letterSpacing: '-0.02em' }}>
              Service Addresses ({locations.length})
            </div>
            <span style={{ fontSize: '0.78rem', color: '#71717a' }}>
              Technician dispatch destination
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {locations.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '0.86rem' }}>
                No addresses added yet. Click "+ Add New Location" above.
              </div>
            ) : (
              locations.map((loc) => (
                <div
                  key={loc.id}
                  style={{
                    background: '#f9fafb',
                    border: loc.defaultLocation ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={18} color="#09090b" />
                      <span style={{ fontWeight: 800, fontSize: '0.96rem', color: '#09090b' }}>
                        {loc.locationName}
                      </span>
                      {loc.defaultLocation && (
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          background: '#09090b',
                          color: '#ffffff'
                        }}>
                          PRIMARY DEFAULT
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenEdit(loc)}
                        title="Edit Location"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                      >
                        <Edit3 size={15} color="#52525b" />
                      </button>
                      {locations.length > 1 && (
                        <button
                          onClick={() => handleDeleteLocation(loc.id)}
                          title="Delete Location"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={15} color="#ef4444" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.84rem', color: '#3f3f46', lineHeight: 1.45 }}>
                    {loc.address}, {loc.city}, {loc.state} - {loc.postalCode}
                  </div>

                  {loc.contactPerson && (
                    <div style={{ fontSize: '0.78rem', color: '#71717a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={13} />
                      <span>Contact: {loc.contactPerson} ({loc.contactPhone || 'No phone'})</span>
                    </div>
                  )}

                  {!loc.defaultLocation && (
                    <div style={{ marginTop: '4px' }}>
                      <button
                        onClick={() => handleSetDefault(loc)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#09090b',
                          fontWeight: 700,
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0
                        }}
                      >
                        Set as Primary Default
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Customer Profile Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e4e4e7',
          borderRadius: '20px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#09090b', letterSpacing: '-0.02em' }}>
              Customer Profile
            </div>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: '#09090b',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                <Edit3 size={14} />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          {!isEditingProfile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                background: '#f9fafb',
                border: '1px solid #e4e4e7',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                    Full Name
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#09090b', marginTop: '2px' }}>
                    {currentUser?.fullName || 'Customer'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                      Email Address
                    </div>
                    <div style={{ fontSize: '0.86rem', color: '#09090b', fontWeight: 600, marginTop: '2px' }}>
                      {currentUser?.email}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                      Primary Phone
                    </div>
                    <div style={{ fontSize: '0.86rem', color: '#09090b', fontWeight: 600, marginTop: '2px' }}>
                      {currentUser?.phoneNumber || 'Not provided'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                      Customer Type
                    </div>
                    <div style={{ fontSize: '0.86rem', color: '#09090b', fontWeight: 600, marginTop: '2px' }}>
                      {profile?.customerType || 'Individual'}
                    </div>
                  </div>

                  {companyName && (
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                        Company / Entity
                      </div>
                      <div style={{ fontSize: '0.86rem', color: '#09090b', fontWeight: 600, marginTop: '2px' }}>
                        {companyName}
                      </div>
                    </div>
                  )}
                </div>

                {altPhone && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                      Alternate Phone
                    </div>
                    <div style={{ fontSize: '0.86rem', color: '#09090b', fontWeight: 600, marginTop: '2px' }}>
                      {altPhone}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                  Company / Entity Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Enterprises"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #e4e4e7',
                    fontSize: '0.86rem',
                    fontFamily: "'Inter', sans-serif",
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                  Secondary / Alternate Phone
                </label>
                <input
                  type="text"
                  placeholder="+91 9123456780"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #e4e4e7',
                    fontSize: '0.86rem',
                    fontFamily: "'Inter', sans-serif",
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                  Account Notes / Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="Special instructions for visiting field technicians..."
                  value={profileNotes}
                  onChange={(e) => setProfileNotes(e.target.value)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
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
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: '#09090b',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Add / Edit Location Modal */}
      {isModalOpen && (
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
            gap: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                {editingLoc ? 'Edit Service Location' : 'Add New Service Location'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} color="#71717a" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                  Location Label (e.g. Home, Office, Branch 2) *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Primary Residence"
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #e4e4e7',
                    fontSize: '0.86rem',
                    fontFamily: "'Inter', sans-serif",
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                  Full Street Address *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Flat / Floor, Building Name, Street"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #e4e4e7',
                    fontSize: '0.86rem',
                    fontFamily: "'Inter', sans-serif",
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                    City *
                  </label>
                  <input
                    required
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 10px',
                      borderRadius: '10px',
                      border: '1.5px solid #e4e4e7',
                      fontSize: '0.84rem',
                      fontFamily: "'Inter', sans-serif",
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                    State *
                  </label>
                  <input
                    required
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 10px',
                      borderRadius: '10px',
                      border: '1.5px solid #e4e4e7',
                      fontSize: '0.84rem',
                      fontFamily: "'Inter', sans-serif",
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                    Postal Code *
                  </label>
                  <input
                    required
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 10px',
                      borderRadius: '10px',
                      border: '1.5px solid #e4e4e7',
                      fontSize: '0.84rem',
                      fontFamily: "'Inter', sans-serif",
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                    On-Site Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="Contact name"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
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

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
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
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="defLocCheckbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="defLocCheckbox" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#18181b', cursor: 'pointer' }}>
                  Set as primary default service address
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  disabled={submitting}
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
                  {submitting ? 'Saving...' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
