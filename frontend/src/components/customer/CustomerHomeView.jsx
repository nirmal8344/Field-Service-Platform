import { useState, useEffect } from 'react';
import { 
  Wind, 
  Zap, 
  Wrench, 
  Hammer, 
  Shield, 
  Sun, 
  Cpu, 
  Paintbrush, 
  MapPin, 
  ChevronRight, 
  Calendar,
  Search,
  Plus
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/useAuth';

export default function CustomerHomeView({ onOpenBookModal, onSelectCategory, onNavigateToRequests }) {
  const { currentUser } = useAuth();

  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeRequests, setActiveRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const displayName = currentUser?.fullName || 'NIRMALKUMAR R';

  useEffect(() => {
    let isMounted = true;
    const loadCustomerData = async () => {
      try {
        const [locs, cats, reqs] = await Promise.all([
          api.getServiceLocations(),
          api.getCategories(),
          api.getMyServiceRequests()
        ]);
        if (!isMounted) return;
        setLocations(locs || []);
        if (locs && locs.length > 0) {
          setSelectedLocation(locs.find(l => l.defaultLocation) || locs[0]);
        }
        setCategories(cats || []);
        setActiveRequests(reqs || []);
      } catch (err) {
        console.error('Error loading customer dashboard data:', err);
      }
    };

    loadCustomerData();
    return () => {
      isMounted = false;
    };
  }, []);

  const categoryIconMap = {
    'AC Repair': { icon: Wind, desc: 'Jet pump wash, gas recharge & maintenance' },
    'Electrical': { icon: Zap, desc: 'MCB switches, wiring, appliances & lights' },
    'Plumbing': { icon: Wrench, desc: 'Leakages, water pumps, taps & drainage' },
    'Carpentry': { icon: Hammer, desc: 'Furniture, lock fittings & woodwork' },
    'CCTV & Security': { icon: Shield, desc: 'IP security cameras & smart locks' },
    'Solar Services': { icon: Sun, desc: 'Solar arrays, inverters & cleaning' },
    'Networking': { icon: Cpu, desc: 'WiFi mesh routers & LAN cabling' },
    'Painting': { icon: Paintbrush, desc: 'Waterproofing & touch-up coats' }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1120px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      
      {/* 1. Welcome Section & Service Location Selector */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e4e4e7',
        borderRadius: '20px',
        padding: '22px 28px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}>
        <div>
          <div style={{ fontSize: '0.82rem', color: '#71717a', fontWeight: 500 }}>
            Welcome Back,
          </div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.03em', margin: '2px 0 0 0' }}>
            {displayName}
          </h1>
        </div>

        {/* Primary Service Location Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#f4f4f5',
          border: '1px solid #e4e4e7',
          borderRadius: '14px',
          padding: '8px 16px'
        }}>
          <MapPin size={18} color="#09090b" />
          <div>
            <div style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700, textTransform: 'uppercase' }}>
              Primary Service Address
            </div>
            <select
              value={selectedLocation?.id || ''}
              onChange={(e) => {
                const found = locations.find(l => l.id === Number(e.target.value));
                if (found) setSelectedLocation(found);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#09090b',
                fontWeight: 700,
                fontSize: '0.88rem',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              {locations.map(loc => (
                <option key={loc.id} value={loc.id} style={{ background: '#ffffff', color: '#09090b' }}>
                  {loc.locationName} ({loc.address}, {loc.city})
                </option>
              ))}
              {locations.length === 0 && (
                <option value="" style={{ background: '#ffffff', color: '#09090b' }}>Primary Facility</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Booking Hero CTA Card (Solid Black in Reference Style) */}
      <div style={{
        background: '#09090b',
        borderRadius: '24px',
        padding: '30px 36px',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.16)'
      }}>
        <div style={{ maxWidth: '580px' }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            lineHeight: 1.22,
            letterSpacing: '-0.03em',
            margin: '0 0 8px 0',
            color: '#ffffff'
          }}>
            Need a Technician at Your Doorstep?
          </h2>

          <p style={{
            fontSize: '0.9rem',
            lineHeight: 1.5,
            color: '#a1a1aa',
            margin: '0 0 20px 0',
            fontWeight: 400
          }}>
            Book inspections, emergency fixes, and routine servicing with certified technicians and verified digital sign-offs.
          </p>

          <button
            onClick={() => onOpenBookModal && onOpenBookModal()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 26px',
              borderRadius: '9999px',
              border: 'none',
              background: '#ffffff',
              color: '#09090b',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = '#f4f4f5'}
            onMouseLeave={(e) => e.target.style.background = '#ffffff'}
          >
            <Plus size={17} strokeWidth={2.4} />
            <span>Book a Service</span>
          </button>
        </div>

        {/* Total Bookings Summary */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#ffffff',
            color: '#09090b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.2rem'
          }}>
            {activeRequests.length}
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>Active Requests</div>
            <div style={{ fontSize: '0.74rem', color: '#a1a1aa' }}>In schedule & progress</div>
          </div>
        </div>
      </div>

      {/* 3. Service Categories Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em', margin: 0 }}>
              Service Categories
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '3px 0 0 0' }}>
              Select a category to schedule doorstep maintenance or repair
            </p>
          </div>

          {/* Clean Search Input */}
          <div style={{ position: 'relative', width: '230px' }}>
            <Search size={15} color="#71717a" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              placeholder="Search category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '36px',
                padding: '0 12px 0 34px',
                borderRadius: '9999px',
                border: '1.5px solid #e4e4e7',
                background: '#ffffff',
                fontSize: '0.84rem',
                color: '#09090b',
                outline: 'none',
                fontFamily: "'Inter', sans-serif",
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: '14px'
        }}>
          {filteredCategories.map((cat) => {
            const meta = categoryIconMap[cat.name] || { icon: Wrench, desc: cat.description || 'Doorstep technician service' };
            const Icon = meta.icon;

            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory ? onSelectCategory(cat) : onOpenBookModal(cat.id)}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e4e4e7',
                  borderRadius: '18px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = '#09090b';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = '#e4e4e7';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.02)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#09090b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={19} color="#ffffff" strokeWidth={2.2} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                    {cat.code || 'SERVICE'}
                  </span>
                </div>

                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#09090b', letterSpacing: '-0.015em' }}>
                    {cat.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#71717a', marginTop: '4px', lineHeight: 1.4 }}>
                    {cat.description || meta.desc}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 'auto',
                  paddingTop: '10px',
                  borderTop: '1px solid #f4f4f5'
                }}>
                  <span style={{ fontSize: '0.78rem', color: '#09090b', fontWeight: 700 }}>
                    Book Service
                  </span>
                  <ChevronRight size={15} color="#09090b" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Recent Service Requests / Bookings (from PostgreSQL) */}
      {activeRequests.length > 0 && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e4e4e7',
          borderRadius: '20px',
          padding: '22px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#09090b', letterSpacing: '-0.02em', margin: 0 }}>
                Recent Service Requests ({activeRequests.length})
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#71717a', margin: '2px 0 0 0' }}>
                Track technician assignment and real-time dispatch progress
              </p>
            </div>

            <button
              onClick={() => onNavigateToRequests && onNavigateToRequests()}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#09090b',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                textDecoration: 'underline',
                textUnderlineOffset: '3px'
              }}
            >
              View all requests →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeRequests.slice(0, 4).map(req => (
              <div
                key={req.id}
                onClick={() => onNavigateToRequests && onNavigateToRequests()}
                style={{
                  background: '#f9fafb',
                  border: '1px solid #e4e4e7',
                  borderRadius: '14px',
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#09090b'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e4e4e7'}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#09090b' }}>
                      {req.requestNumber}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: '#09090b',
                      color: '#ffffff'
                    }}>
                      {req.categoryName}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: req.status === 'COMPLETED' ? '#dcfce7' : req.status === 'IN_PROGRESS' ? '#dbeafe' : '#f4f4f5',
                      color: req.status === 'COMPLETED' ? '#166534' : req.status === 'IN_PROGRESS' ? '#1e40af' : '#18181b',
                      border: '1px solid #e4e4e7'
                    }}>
                      {req.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#3f3f46', marginTop: '4px', fontWeight: 500 }}>
                    {req.problemDescription}
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '0.76rem', color: '#71717a' }}>
                    <Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    {req.preferredDate} ({req.preferredTimeSlot})
                  </div>
                  <ChevronRight size={16} color="#71717a" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
