import { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { useNotifications } from '../../context/useNotifications';
import { AlertCircle, Wrench, ChevronDown } from 'lucide-react';

export default function AuthPage() {
  const { login, register } = useAuth();
  const { addToast } = useNotifications();

  const [isRegister, setIsRegister] = useState(false);
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Customer registration fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerType, setCustomerType] = useState('Individual');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      addToast('Welcome back! Successfully signed in.', 'success', 'Authenticated');
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    setError('');

    if (!fullName.trim() || !phoneNumber.trim() || !email.trim() || !password || !address.trim() || !city.trim() || !state.trim() || !postalCode.trim()) {
      setError('Please fill in all required fields marked with *');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        password,
        customerType,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim()
      });
      addToast('Customer account created! Welcome to FieldHub.', 'success', 'Account Registered');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="auth-viewport"
      style={{
        minHeight: '100vh',
        height: isRegister ? 'auto' : '100dvh',
        width: '100vw',
        maxWidth: '100%',
        backgroundColor: '#f4f4f6',
        backgroundImage: 'radial-gradient(at 10% 10%, rgba(228, 228, 231, 0.6) 0px, transparent 50%), radial-gradient(at 90% 90%, rgba(228, 228, 231, 0.6) 0px, transparent 50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isRegister ? '32px 20px' : '20px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        boxSizing: 'border-box',
        overflowX: 'hidden',
        overflowY: isRegister ? 'auto' : 'hidden'
      }}
    >
      <div 
        className="auth-container"
        style={{
          width: '100%',
          maxWidth: isRegister ? '1060px' : '960px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isRegister ? '40px' : '56px',
          margin: 'auto'
        }}
      >
        
        {/* Left Branding / Hero Panel */}
        <div 
          className="auth-hero-panel"
          style={{
            flex: '1 1 380px',
            color: '#09090b',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '12px 8px'
          }}
        >
          {/* Logo Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#09090b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}>
              <Wrench size={20} color="#ffffff" strokeWidth={2.4} />
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#09090b'
            }}>
              FieldHub
            </div>
          </div>

          {/* Primary Greeting */}
          <h1 style={{
            fontSize: '3.1rem',
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: '-0.035em',
            margin: '0 0 14px 0',
            color: '#09090b'
          }}>
            Hey, Hello!
          </h1>

          {/* Subheading */}
          <div style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            color: '#27272a',
            marginBottom: '14px',
            lineHeight: 1.4,
            letterSpacing: '-0.015em'
          }}>
            Enterprise Field Service & Work Order Platform
          </div>

          {/* Value Prop Description */}
          <p style={{
            fontSize: '0.92rem',
            lineHeight: 1.6,
            color: '#71717a',
            margin: 0,
            maxWidth: '430px',
            fontWeight: 400
          }}>
            Streamline service scheduling, technician dispatch, mobile diagnostics, SLA tracking, and instant customer verification.
          </p>
        </div>

        {/* Right Authentication Card */}
        <div 
          className="auth-card-panel"
          style={{
            flex: isRegister ? '1 1 540px' : '0 1 420px',
            width: '100%',
            maxWidth: isRegister ? '580px' : '430px',
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e4e4e7',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.07), 0 0 1px rgba(0, 0, 0, 0.1)',
            padding: isRegister ? '30px 32px' : '38px 34px',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            maxHeight: isRegister ? 'calc(100vh - 48px)' : 'none',
            overflowY: isRegister ? 'auto' : 'visible'
          }}
        >
          
          {/* Card Header */}
          <div style={{ textAlign: 'center', marginBottom: isRegister ? '20px' : '26px' }}>
            <h2 style={{
              fontSize: isRegister ? '1.5rem' : '1.75rem',
              fontWeight: 800,
              color: '#09090b',
              margin: '0 0 6px 0',
              letterSpacing: '-0.025em'
            }}>
              {isRegister ? 'Create Customer Account' : 'Welcome Back'}
            </h2>
            <p style={{
              fontSize: '0.86rem',
              color: '#71717a',
              margin: 0,
              lineHeight: 1.4,
              fontWeight: 400
            }}>
              {isRegister 
                ? 'Register your customer profile to book and track services' 
                : 'Sign in to access your FieldHub dashboard'}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
              fontWeight: 500
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={isRegister ? handleRegister : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* COMMON SIGN IN FIELDS */}
            {!isRegister ? (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#18181b', marginBottom: '5px' }}>
                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 16px',
                      borderRadius: '9999px',
                      border: '1.5px solid #e4e4e7',
                      background: '#ffffff',
                      fontSize: '0.9rem',
                      color: '#09090b',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: "'Inter', sans-serif",
                      transition: 'all 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#09090b';
                      e.target.style.boxShadow = '0 0 0 3px rgba(9, 9, 11, 0.08)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e4e4e7';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#18181b', marginBottom: '5px' }}>
                    Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 16px',
                      borderRadius: '9999px',
                      border: '1.5px solid #e4e4e7',
                      background: '#ffffff',
                      fontSize: '0.9rem',
                      color: '#09090b',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: "'Inter', sans-serif",
                      transition: 'all 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#09090b';
                      e.target.style.boxShadow = '0 0 0 3px rgba(9, 9, 11, 0.08)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e4e4e7';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </>
            ) : (
              /* CUSTOMER REGISTRATION FIELDS */
              <>
                {/* 1. Full Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nirmalkumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #e4e4e7',
                      background: '#ffffff',
                      fontSize: '0.86rem',
                      color: '#09090b',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: "'Inter', sans-serif",
                      transition: 'all 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#09090b';
                      e.target.style.boxShadow = '0 0 0 3px rgba(9, 9, 11, 0.08)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e4e4e7';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* 2. Phone Number | Customer Type */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                      Phone Number <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+91 9876543210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #e4e4e7',
                        background: '#ffffff',
                        fontSize: '0.86rem',
                        color: '#09090b',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: "'Inter', sans-serif",
                        transition: 'all 0.15s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#09090b';
                        e.target.style.boxShadow = '0 0 0 3px rgba(9, 9, 11, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e4e4e7';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                      Customer Type <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={customerType}
                        onChange={(e) => setCustomerType(e.target.value)}
                        style={{
                          width: '100%',
                          height: '42px',
                          padding: '0 32px 0 14px',
                          borderRadius: '10px',
                          border: '1.5px solid #e4e4e7',
                          background: '#ffffff',
                          fontSize: '0.86rem',
                          color: '#09090b',
                          outline: 'none',
                          boxSizing: 'border-box',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          cursor: 'pointer',
                          fontFamily: "'Inter', sans-serif",
                          transition: 'all 0.15s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#09090b';
                          e.target.style.boxShadow = '0 0 0 3px rgba(9, 9, 11, 0.08)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e4e4e7';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <option value="Individual">Individual</option>
                        <option value="Business">Business</option>
                        <option value="Organization">Organization</option>
                      </select>
                      <ChevronDown size={15} color="#71717a" style={{ position: 'absolute', right: '12px', top: '13px', pointerEvents: 'none' }} />
                    </div>
                  </div>
                </div>

                {/* 3. Email Address | Password */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                      Email Address <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #e4e4e7',
                        background: '#ffffff',
                        fontSize: '0.86rem',
                        color: '#09090b',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: "'Inter', sans-serif",
                        transition: 'all 0.15s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#09090b';
                        e.target.style.boxShadow = '0 0 0 3px rgba(9, 9, 11, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e4e4e7';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                      Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #e4e4e7',
                        background: '#ffffff',
                        fontSize: '0.86rem',
                        color: '#09090b',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: "'Inter', sans-serif",
                        transition: 'all 0.15s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#09090b';
                        e.target.style.boxShadow = '0 0 0 3px rgba(9, 9, 11, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e4e4e7';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                {/* 4. Primary Service Address */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                    Primary Service Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Street Address, Flat / Building No"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #e4e4e7',
                      background: '#ffffff',
                      fontSize: '0.86rem',
                      color: '#09090b',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: "'Inter', sans-serif",
                      transition: 'all 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#09090b';
                      e.target.style.boxShadow = '0 0 0 3px rgba(9, 9, 11, 0.08)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e4e4e7';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* 5. City | District / State | Postal Code */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                      City <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1.5px solid #e4e4e7',
                        background: '#ffffff',
                        fontSize: '0.84rem',
                        color: '#09090b',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: "'Inter', sans-serif",
                        transition: 'all 0.15s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#09090b';
                        e.target.style.boxShadow = '0 0 0 3px rgba(9, 9, 11, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e4e4e7';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                      District / State <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="District / State"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1.5px solid #e4e4e7',
                        background: '#ffffff',
                        fontSize: '0.84rem',
                        color: '#09090b',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: "'Inter', sans-serif",
                        transition: 'all 0.15s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#09090b';
                        e.target.style.boxShadow = '0 0 0 3px rgba(9, 9, 11, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e4e4e7';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#18181b', marginBottom: '4px' }}>
                      Postal Code <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Postal Code"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1.5px solid #e4e4e7',
                        background: '#ffffff',
                        fontSize: '0.84rem',
                        color: '#09090b',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: "'Inter', sans-serif",
                        transition: 'all 0.15s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#09090b';
                        e.target.style.boxShadow = '0 0 0 3px rgba(9, 9, 11, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e4e4e7';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* High Contrast Primary CTA Button (Pitch Black) */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '9999px',
                border: 'none',
                background: '#09090b',
                color: '#ffffff',
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '6px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                fontFamily: "'Inter', sans-serif",
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = '#27272a'}
              onMouseLeave={(e) => e.target.style.background = '#09090b'}
            >
              {loading 
                ? (isRegister ? 'Creating Account...' : 'Signing In...') 
                : (isRegister ? 'Create Customer Account' : 'Sign In')}
            </button>
          </form>

          {/* Toggle between Login and Registration */}
          <div style={{
            textAlign: 'center',
            marginTop: '18px',
            fontSize: '0.86rem',
            color: '#71717a',
            fontWeight: 400
          }}>
            {isRegister ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setError(''); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#09090b',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.86rem',
                    fontFamily: "'Inter', sans-serif",
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px'
                  }}
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setError(''); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#09090b',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.86rem',
                    fontFamily: "'Inter', sans-serif",
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px'
                  }}
                >
                  Create Customer Account
                </button>
              </span>
            )}
          </div>

        </div>

      </div>

      {/* Embedded CSS for clean responsiveness without horizontal scroll */}
      <style>{`
        @media (max-width: 860px) {
          .auth-viewport {
            height: auto !important;
            min-height: 100vh !important;
            overflow-y: auto !important;
            padding: 24px 16px !important;
          }
          .auth-container {
            flex-direction: column !important;
            gap: 24px !important;
          }
          .auth-hero-panel {
            flex: none !important;
            width: 100% !important;
            text-align: center !important;
            align-items: center !important;
            padding: 8px 0 !important;
          }
          .auth-hero-panel h1 {
            font-size: 2.2rem !important;
          }
          .auth-hero-panel p {
            max-width: 100% !important;
          }
          .auth-card-panel {
            max-width: 100% !important;
            padding: 28px 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
