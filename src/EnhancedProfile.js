// Enhanced Profile Component with Picture Upload, Email/Password Change
import React, { useState, useRef } from 'react';
import { FiCamera, FiMail, FiLock, FiUser, FiUpload, FiEye, FiEyeOff } from 'react-icons/fi';

const EnhancedProfile = ({ user, onUpdateProfile }) => {
  const [profile, setProfile] = useState({
    screen_name: user.screen_name || '',
    pronouns: user.pronouns || '',
    goals: user.goals || user.identity_goals || '',
    focus_areas: Array.isArray(user.focus_areas)
      ? user.focus_areas
      : typeof user.focus_areas === 'string' && user.focus_areas
        ? user.focus_areas.split(',').map(f => f.trim()).filter(Boolean)
        : []
  });
  
  const [security, setSecurity] = useState({
    new_email: user.email || '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  const [activeTab, setActiveTab] = useState('profile'); // profile, security, picture
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const fileInputRef = useRef(null);

  const pronounOptions = [
    { value: 'he/him', label: 'He/Him' },
    { value: 'she/her', label: 'She/Her' },
    { value: 'they/them', label: 'They/Them' },
    { value: 'he/they', label: 'He/They' },
    { value: 'she/they', label: 'She/They' },
    { value: 'other', label: 'Other' }
  ];

  const focusAreaOptions = [
    'Self-Acceptance',
    'Relationships',
    'Identity Expression',
    'Communication',
    'Emotional Well-being',
    'Personal Growth'
  ];

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          screen_name: profile.screen_name,
          pronouns: profile.pronouns,
          goals: profile.goals,
          focus_areas: profile.focus_areas
        })
      });
      
      if (response.ok) {
        onUpdateProfile(profile);
        setMessage('Profile updated successfully! ✨');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to update profile. Please try again.');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setMessage('Error updating profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage('Please upload a valid image file (PNG, JPG, JPEG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 16MB)
    if (file.size > 16 * 1024 * 1024) {
      setMessage('File size must be less than 16MB');
      return;
    }

    setUploadingPicture(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/upload-profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        onUpdateProfile({ ...user, profile_picture: data.profile_picture });
        setMessage('Profile picture updated successfully! ✨');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to upload picture. Please try again.');
      }
    } catch (err) {
      console.error('Error uploading picture:', err);
      setMessage('Error uploading picture. Please try again.');
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    if (!security.current_password) {
      setMessage('Please enter your current password to change email');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/change-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_email: security.new_email,
          password: security.current_password
        })
      });

      if (response.ok) {
        onUpdateProfile({ ...user, email: security.new_email });
        setSecurity(prev => ({ ...prev, current_password: '' }));
        setMessage('Email changed successfully! ✨');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to change email. Please try again.');
      }
    } catch (err) {
      console.error('Error changing email:', err);
      setMessage('Error changing email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (!security.current_password || !security.new_password || !security.confirm_password) {
      setMessage('Please fill in all password fields');
      return;
    }

    if (security.new_password !== security.confirm_password) {
      setMessage('New passwords do not match');
      return;
    }

    if (security.new_password.length < 6) {
      setMessage('New password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: security.current_password,
          new_password: security.new_password
        })
      });

      if (response.ok) {
        setSecurity({
          new_email: user.email || '',
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
        setMessage('Password changed successfully! ✨');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to change password. Please try again.');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setMessage('Error changing password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="profile-page-container" style={{ padding: 'var(--spacing-xl)', maxWidth: '800px', margin: '0 auto' }}>
      {/* Profile Page Header */}
      <div className="page-header" style={{ textAlign: 'center', marginBottom: 'var(--spacing-2xl)' }}>
        <h1 className="sparkle" style={{ 
          fontSize: '2.5rem', 
          textAlign: 'center', 
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Your Profile ✨
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '1.2rem', 
          textAlign: 'center',
          marginBottom: '2rem' 
        }}>
          Customize your identity and preferences
        </p>
      </div>

      {user.user_id && user.user_id.startsWith('local_user_') && (
        <div style={{
          background: 'var(--color-warning)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '12px',
          marginBottom: '1rem',
          textAlign: 'center',
          fontWeight: '600',
          fontSize: '1.1rem'
        }}>
          You are using local-only login. Please sign in with a real account to access all features (chat, sessions, profile picture, etc.).
        </div>
      )}
      <div className="profile-container">
        {/* Enhanced Profile Header with Picture */}
        <div className="profile-header-card" style={{ position: 'relative' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {user.profile_picture ? (
              <img
                src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${user.profile_picture}`}
                alt="Profile Picture"
                className="profile-picture-large"
                style={{ 
                  width: 96, 
                  height: 96, 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  background: '#eee',
                  border: '3px solid var(--color-brand-primary)'
                }}
              />
            ) : (
              <div className="profile-avatar" style={{ 
                width: 96, 
                height: 96, 
                fontSize: '2.5rem',
                background: 'var(--color-brand-primary)',
                color: 'var(--color-bg-primary)',
                border: '3px solid var(--color-brand-primary)'
              }}>
                {user.screen_name ? user.screen_name[0].toUpperCase() : (user.name ? user.name[0].toUpperCase() : 'U')}
              </div>
            )}
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPicture}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--color-brand-primary)',
                border: '2px solid white',
                color: 'var(--color-bg-primary)',
                cursor: uploadingPicture ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                opacity: uploadingPicture ? 0.6 : 1
              }}
              title="Change profile picture"
            >
              {uploadingPicture ? '⟳' : <FiCamera />}
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePictureUpload}
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              style={{ display: 'none' }}
            />
          </div>
          
          <div className="profile-header-info">
            <span className="profile-name">{user.screen_name || user.name || 'Your Name'}</span>
            <span className="profile-email">{user.email || ''}</span>
            {user.auth_method === 'oauth' && (
              <span style={{ 
                fontSize: '12px', 
                color: 'var(--color-brand-primary)', 
                fontWeight: '500',
                marginTop: '4px',
                display: 'block'
              }}>
                🌐 Connected via Google
              </span>
            )}
          </div>
        </div>
        
        {message && (
          <div style={{
            background: message.includes('successfully') ? 'var(--color-brand-primary)' : 'var(--color-warning)',
            color: message.includes('successfully') ? 'var(--color-bg-primary)' : 'white',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '1rem',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            {message}
          </div>
        )}
        
        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          marginBottom: '2rem',
          background: 'rgba(228, 205, 247, 0.3)',
          borderRadius: '12px',
          padding: '4px'
        }}>
          {[
            { id: 'profile', label: 'Profile Info', icon: <FiUser /> },
            { id: 'security', label: 'Security', icon: <FiLock /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: 'none',
                borderRadius: '8px',
                background: activeTab === tab.id ? 'var(--color-brand-primary)' : 'transparent',
                color: activeTab === tab.id ? 'var(--color-bg-primary)' : '#2d0036',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.3s ease'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="glass-card" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-lg)' }}>
            <form className="profile-form profile-form-card" onSubmit={handleProfileSubmit}>
            <div className="profile-field">
              <label htmlFor="screen_name">Screen Name</label>
              <input
                id="screen_name"
                type="text"
                value={profile.screen_name}
                onChange={(e) => setProfile(prev => ({ ...prev, screen_name: e.target.value }))}
                placeholder="Choose a name to display"
              />
            </div>
            
            <div className="profile-field">
              <label htmlFor="pronouns">Your Pronouns</label>
              <select
                id="pronouns"
                value={profile.pronouns}
                onChange={(e) => setProfile(prev => ({ ...prev, pronouns: e.target.value }))}
              >
                <option value="">Select your pronouns</option>
                {pronounOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="profile-field">
              <label htmlFor="goals">What do you hope to become or express in your life and identity?</label>
              <textarea
                id="goals"
                value={profile.goals}
                onChange={(e) => setProfile(prev => ({ ...prev, goals: e.target.value }))}
                placeholder="Share your aspirations and goals..."
                rows={4}
              />
            </div>
            
            <div className="profile-field">
              <label>What areas are most important to you right now?</label>
              <div className="focus-areas">
                {focusAreaOptions.map(area => (
                  <label key={area} className="focus-area-option">
                    <input
                      type="checkbox"
                      checked={profile.focus_areas.includes(area)}
                      onChange={(e) => {
                        const newAreas = e.target.checked
                          ? [...profile.focus_areas, area]
                          : profile.focus_areas.filter(a => a !== area);
                        setProfile(prev => ({ ...prev, focus_areas: newAreas }));
                      }}
                    />
                    {area}
                  </label>
                ))}
              </div>
            </div>
            
            <button 
              type="submit" 
              className={`btn-primary ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="glass-card" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-lg)' }}>
            <div className="profile-form-card">
            {user.auth_method === 'oauth' ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem',
                background: 'rgba(142, 230, 163, 0.1)',
                borderRadius: '12px',
                color: 'var(--color-bg-primary)'
              }}>
                <h3 style={{ marginBottom: '1rem' }}>🌐 OAuth Account</h3>
                <p>Your account is connected through Google OAuth. Email and password changes are managed through your Google account.</p>
              </div>
            ) : (
              <>
                {/* Email Change Section */}
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ 
                    color: 'var(--color-bg-primary)', 
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <FiMail /> Change Email
                  </h3>
                  <form onSubmit={handleEmailChange}>
                    <div className="profile-field">
                      <label htmlFor="new_email">New Email Address</label>
                      <input
                        id="new_email"
                        type="email"
                        value={security.new_email}
                        onChange={(e) => setSecurity(prev => ({ ...prev, new_email: e.target.value }))}
                        placeholder="Enter new email address"
                        required
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="email_password">Current Password</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          id="email_password"
                          type={showPasswords.current ? "text" : "password"}
                          value={security.current_password}
                          onChange={(e) => setSecurity(prev => ({ ...prev, current_password: e.target.value }))}
                          placeholder="Enter current password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('current')}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-bg-primary)'
                          }}
                        >
                          {showPasswords.current ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      className={`btn-primary ${loading ? 'loading' : ''}`}
                      disabled={loading}
                      style={{ marginBottom: '1rem' }}
                    >
                      {loading ? 'Changing Email...' : 'Change Email'}
                    </button>
                  </form>
                </div>

                {/* Password Change Section */}
                <div>
                  <h3 style={{ 
                    color: 'var(--color-bg-primary)', 
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <FiLock /> Change Password
                  </h3>
                  <form onSubmit={handlePasswordChange}>
                    <div className="profile-field">
                      <label htmlFor="current_password">Current Password</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          id="current_password"
                          type={showPasswords.current ? "text" : "password"}
                          value={security.current_password}
                          onChange={(e) => setSecurity(prev => ({ ...prev, current_password: e.target.value }))}
                          placeholder="Enter current password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('current')}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-bg-primary)'
                          }}
                        >
                          {showPasswords.current ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>
                    <div className="profile-field">
                      <label htmlFor="new_password">New Password</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          id="new_password"
                          type={showPasswords.new ? "text" : "password"}
                          value={security.new_password}
                          onChange={(e) => setSecurity(prev => ({ ...prev, new_password: e.target.value }))}
                          placeholder="Enter new password"
                          minLength={6}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('new')}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-bg-primary)'
                          }}
                        >
                          {showPasswords.new ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>
                    <div className="profile-field">
                      <label htmlFor="confirm_password">Confirm New Password</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          id="confirm_password"
                          type={showPasswords.confirm ? "text" : "password"}
                          value={security.confirm_password}
                          onChange={(e) => setSecurity(prev => ({ ...prev, confirm_password: e.target.value }))}
                          placeholder="Confirm new password"
                          minLength={6}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('confirm')}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-bg-primary)'
                          }}
                        >
                          {showPasswords.confirm ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      className={`btn-primary ${loading ? 'loading' : ''}`}
                      disabled={loading}
                    >
                      {loading ? 'Changing Password...' : 'Change Password'}
                    </button>
                  </form>
                </div>
              </>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedProfile;