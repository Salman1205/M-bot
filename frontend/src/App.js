import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import './App.css';
import { FiMenu, FiChevronLeft, FiMessageSquare, FiClock, FiUser, FiPlus, FiX, FiArrowRight } from 'react-icons/fi';

const LOGO_SRC = process.env.PUBLIC_URL + '/newlogo.jpg';
const API_URL = process.env.REACT_APP_API_URL;

// Login Component with OAuth
const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      
      if (response.ok) {
        const userData = await response.json();
        onLogin(userData);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className="page-container">
      <div className="login-container">
        <div className="login-card">
          <img src={LOGO_SRC} alt="M Logo" style={{ height: 64, width: 'auto', marginBottom: 16, display: 'block', objectFit: 'contain', marginLeft: 'auto', marginRight: 'auto' }} />
          <h1 style={{ display: 'none' }}>Welcome to M</h1>
          <p className="subtitle">Your safe space for personal growth and emotional well-being</p>
          
          {error && (
            <div className="error-message" style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary">
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Enhanced Navigation Component with Chat History
const Navigation = ({ user, setCurrentPage, currentPage, onLogout, isSidebarOpen, setIsSidebarOpen, onSelectSession, selectedSessionId, onStartNewChat, refreshTrigger }) => {
  const [chatSessions, setChatSessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const navRef = useRef();
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (user && user.user_id) {
      fetchChatHistory();
    }
  }, [user, refreshTrigger]);

  const fetchChatHistory = async () => {
    try {
      setLoadingHistory(true);
      const userId = user.user_id || user.id;
      const response = await fetch(`${API_URL}/api/sessions/${userId}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setChatSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
    return date.toLocaleDateString();
  };

  const getMoodIcon = (mood) => {
    switch(mood) {
      case 'positive': return '😊';
      case 'negative': return '😔';
      case 'neutral':
      default: return '😐';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return '🟢';
      case 'completed': return '✅';
      default: return '⚪';
    }
  };

  const navItems = [
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'about', label: 'Using M', icon: 'ℹ️' },
    { id: 'feedback', label: 'Feedback', icon: '📝' }
  ];

  return (
    <>
      {/* Sidebar */}
      <div
        className={`sidebar${isSidebarOpen ? ' open' : ' collapsed'}`}
        id="sidebar-nav"
        ref={navRef}
        role="navigation"
        aria-label="Sidebar Navigation"
        tabIndex={-1}
      >
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'flex-start' }}>
          <button
            className="hamburger sidebar-toggle"
            aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={isSidebarOpen}
            aria-controls="sidebar-nav"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ background: 'none', border: 'none', padding: 0, margin: 0, display: 'flex', alignItems: 'center' }}
          >
            <FiMenu size={28} color="var(--color-text-primary)" />
          </button>
          <img src={LOGO_SRC} alt="M Logo" style={{ height: 40, width: 'auto', display: 'block', objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 8 }}>
            <h1 style={{ font: 'var(--font-h2)', color: 'var(--color-text-primary)', margin: 0, padding: 0, lineHeight: 1 }}>Identity Mentor</h1>
          </div>
        </div>
        {isSidebarOpen && (
          <>
            <nav className="sidebar-nav" aria-label="Main Navigation">
              {navItems.map(item => (
                <button
                  key={item.id}
                  className={`nav-item${currentPage === item.id ? ' active' : ''}`}
                  onClick={() => setCurrentPage(item.id)}
                  tabIndex={0}
                  aria-current={currentPage === item.id ? 'page' : undefined}
                  role="menuitem"
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setCurrentPage(item.id);
                    }
                  }}
                >
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
            
            {/* Enhanced Chat History Section */}
            <div className="chat-history-section" style={{ flex: 1, overflowY: 'auto', marginTop: '1rem', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="chat-history-title">Chat History</h3>
                <button
                  onClick={() => {
                    onStartNewChat();
                    setCurrentPage('chat');
                  }}
                  style={{
                    background: 'var(--color-brand-primary)',
                    color: 'var(--color-bg-primary)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: '500'
                  }}
                  title="Start a new chat session"
                >
                  <FiPlus size={12} />
                  New
                </button>
              </div>
              
              {loadingHistory ? (
                <div style={{ textAlign: 'center', color: '#888', padding: '1rem' }}>
                  <div className="loading-spinner" style={{ width: '20px', height: '20px', margin: '0 auto 8px' }}></div>
                  Loading...
                </div>
              ) : (
                <div className="chat-history-list">
                  {chatSessions.length === 0 ? (
                    <div style={{ color: '#888', fontSize: '14px', textAlign: 'center', padding: '1rem', fontStyle: 'italic' }}>
                      No conversations yet.<br />
                      Start your first chat!
                    </div>
                  ) : (
                    chatSessions.map((session) => (
                      <div
                        key={session.session_id}
                        className={`chat-history-item${selectedSessionId === session.session_id ? ' active' : ''}`}
                        onClick={() => {
                          onSelectSession(session.session_id);
                          setCurrentPage('chat');
                        }}
                        style={{
                          background: selectedSessionId === session.session_id 
                            ? 'var(--color-brand-primary)' 
                            : 'rgba(255,255,255,0.05)',
                          border: selectedSessionId === session.session_id 
                            ? '2px solid var(--color-brand-primary)' 
                            : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          padding: '12px',
                          marginBottom: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedSessionId !== session.session_id) {
                            e.target.style.background = 'rgba(255,255,255,0.08)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedSessionId !== session.session_id) {
                            e.target.style.background = 'rgba(255,255,255,0.05)';
                          }
                        }}
                      >
                        <div className="chat-history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span className="chat-history-date" style={{ fontSize: '11px', color: selectedSessionId === session.session_id ? 'rgba(32,1,37,0.7)' : '#aaa' }}>
                            {formatDate(session.started_at)}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {session.mood && (
                              <span style={{ fontSize: '14px' }}>{getMoodIcon(session.mood)}</span>
                            )}
                            <span style={{ fontSize: '12px' }}>{getStatusIcon(session.status)}</span>
                          </div>
                        </div>
                        <div className="chat-history-title" style={{ 
                          fontWeight: '500', 
                          fontSize: '14px', 
                          marginBottom: '4px', 
                          color: selectedSessionId === session.session_id ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                          lineHeight: '1.3'
                        }}>
                          {session.title || 'Chat Session'}
                        </div>
                        <div className="chat-history-preview" style={{ 
                          fontSize: '12px', 
                          color: selectedSessionId === session.session_id ? 'rgba(32,1,37,0.8)' : '#aaa', 
                          lineHeight: '1.3',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {session.summary || session.preview || 'No preview available'}
                        </div>
                        {session.status === 'active' && (
                          <div style={{ 
                            fontSize: '10px', 
                            color: selectedSessionId === session.session_id ? 'var(--color-bg-primary)' : 'var(--color-brand-primary)', 
                            marginTop: '6px', 
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            ● Active Session
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="sidebar-footer">
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', position: 'relative', color: '#2d0036', background: '#fff', boxShadow: '0 2px 8px rgba(32,1,37,0.08)', minHeight: 56, padding: '0 16px' }}
                className="user-info"
                onClick={() => setShowUserMenu(v => !v)}
                tabIndex={0}
                onBlur={() => setTimeout(() => setShowUserMenu(false), 200)}
              >
                {user.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt="Profile Picture"
                    className="user-avatar"
                    style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', background: '#eee', display: 'block' }}
                  />
                ) : (
                  <div className="user-avatar" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-brand-primary)', display: 'inline-block', fontWeight: 700, fontSize: 20, color: '#222', lineHeight: '40px', textAlign: 'center', padding: 0, margin: 0 }}>
                    {user.screen_name ? user.screen_name[0].toUpperCase() : (user.name ? user.name[0].toUpperCase() : '?')}
                  </div>
                )}
                <span style={{ fontWeight: 600, fontSize: 15, color: '#2d0036', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{user.screen_name || user.name}</span>
                {showUserMenu && (
                  <div style={{
                    position: 'absolute',
                    bottom: 56,
                    left: 0,
                    background: '#fff',
                    color: '#222',
                    borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(32,1,37,0.18)',
                    border: '1px solid #eee',
                    padding: '0.5rem 0',
                    zIndex: 1000,
                    minWidth: 180,
                    textAlign: 'left',
                  }}>
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        width: '100%',
                        padding: '0.7rem 1.2rem',
                        fontSize: 15,
                        color: '#222',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontWeight: 500,
                        borderBottom: '1px solid #eee',
                        outline: 'none',
                      }}
                      onClick={() => { setCurrentPage('profile'); setShowUserMenu(false); }}
                    >
                      Profile
                    </button>
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        width: '100%',
                        padding: '0.7rem 1.2rem',
                        fontSize: 15,
                        color: '#e63946',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontWeight: 500,
                        outline: 'none',
                      }}
                      onClick={() => { onLogout(); setShowUserMenu(false); }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Floating toggle icon when sidebar is collapsed */}
      {!isSidebarOpen && (
        <button
          className="hamburger sidebar-toggle floating-toggle"
          aria-label="Expand sidebar"
          aria-expanded={isSidebarOpen}
          aria-controls="sidebar-nav"
          onClick={() => setIsSidebarOpen(true)}
          style={{ position: 'fixed', top: 16, left: 16, zIndex: 3000, background: 'var(--color-bg-primary)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
        >
          <FiMenu size={24} color="var(--color-text-primary)" />
        </button>
      )}
    </>
  );
};

// Enhanced Chat Component with Session Management and Personalization
const Chat = ({ user, selectedSessionId, activeSessionId, setActiveSessionId, onEndSession, onStartNewSession, userProfile, onSessionUpdate }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const messagesEndRef = useRef(null);

  // User message background color (same as your user message bubble)
  const userMsgBg = '#6ee7b7'; // Adjust if your user message color is different

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Handle session selection from sidebar
  useEffect(() => {
    if (selectedSessionId) {
      loadSessionMessages(selectedSessionId);
      setIsHistoryView(true);
      setCurrentSessionId(selectedSessionId);
      setShowWelcome(false);
    } else if (activeSessionId) {
      loadSessionMessages(activeSessionId);
      setIsHistoryView(false);
      setCurrentSessionId(activeSessionId);
      setShowWelcome(false);
    } else {
      // No session selected, load active session or start fresh
      loadActiveSession();
    }
  }, [selectedSessionId, activeSessionId]);

  const loadActiveSession = async () => {
    try {
      const userId = user.user_id || user.id;
      const response = await fetch(`${API_URL}/api/conversation/${userId}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        if (data.sessionId) {
          setActiveSessionId(data.sessionId);
          setCurrentSessionId(data.sessionId);
          setIsHistoryView(false);
          setShowWelcome(false);
        } else {
          // No active session - show welcome
          setMessages([]);
          setCurrentSessionId(null);
          setIsHistoryView(false);
          setShowWelcome(true);
        }
      }
    } catch (err) {
      console.error('Error loading active session:', err);
      setShowWelcome(true);
    }
  };

  const loadSessionMessages = async (sessionId) => {
    try {
      const response = await fetch(`${API_URL}/api/session/${sessionId}/messages`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error loading session messages:', err);
    }
  };

  const handleStartNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setActiveSessionId(null);
    setIsHistoryView(false);
    setError(null);
    setSuccess(null);
    setShowWelcome(true);
    onStartNewSession();
  };

  const handleEndChat = async () => {
    setShowConfirmEnd(false);
    setError(null);
    setSuccess(null);
    
    if (!currentSessionId || isHistoryView) {
      setError('No active session to end');
      return;
    }

    try {
      const endResponse = await fetch(`${API_URL}/api/end_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId: currentSessionId })
      });

      if (!endResponse.ok) {
        setError('Failed to end session (server error)');
        throw new Error('Failed to end session');
      }

      const result = await endResponse.json();
      
      // Clear chat state
      setMessages([]);
      setCurrentSessionId(null);
      setActiveSessionId(null);
      setIsHistoryView(false);
      setShowWelcome(true);
      setSuccess('Chat session ended successfully. Check your dashboard for insights!');
      
      // Notify parent components
      if (onEndSession) onEndSession(currentSessionId);
      if (onSessionUpdate) onSessionUpdate();

      // Show summary if available
      if (result.summary) {
        setTimeout(() => {
          setSuccess(`Session ended. Summary: "${result.summary.title}"`);
        }, 1500);
      }

    } catch (err) {
      console.error('Error ending chat session:', err);
      setError('Failed to end chat session');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || isHistoryView) return;

    const userMessage = message.trim();
    setMessage('');
    setError(null);
    setSuccess(null);
    setShowWelcome(false);

    // Add user message immediately
    const newUserMessage = {
      id: Date.now(),
      message_text: userMessage,
      sender: 'user',
      timestamp: new Date().toISOString(),
      sentiment_score: null
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsTyping(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: userMessage,
          userId: user.user_id || user.id,
          profile: {
            name: userProfile.screen_name || userProfile.name,
            pronouns: userProfile.pronouns,
            identity_goals: userProfile.identity_goals,
            focus_area: userProfile.focus_area,
          },
          sessionId: currentSessionId || undefined
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.response || data.response.trim() === '') {
        throw new Error('Empty response from server');
      }

      // Add bot message with delay for natural feel
      setTimeout(() => {
        const botMessage = {
          id: Date.now() + 1,
          message_text: data.response,
          sender: 'M',
          timestamp: new Date().toISOString(),
          sentiment_score: data.sentiment || null
        };

        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
        
        // Update session ID if we got one
        if (data.sessionId && !currentSessionId) {
          setCurrentSessionId(data.sessionId);
          setActiveSessionId(data.sessionId);
          if (onSessionUpdate) onSessionUpdate();
        }
      }, Math.random() * 1000 + 1000); // Random delay between 1-2 seconds

    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      
      const errorMessage = {
        id: Date.now() + 1,
        message_text: "I apologize, but I'm having trouble responding right now. Please try again in a moment.",
        sender: 'M',
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      setError('Failed to send message. Please try again.');
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (!isHistoryView) {
      setMessage(suggestion);
    }
  };

  const suggestions = [
    "Affirm Who I Am",
    "Explore My Gender Identity",
    "Support My Well-Being",
    "Grow Spiritually",
    "Navigate Relationships"
  ];

  const getPersonalizedGreeting = () => {
    const name = userProfile.screen_name || userProfile.name || 'friend';
    const hour = new Date().getHours();
    let timeGreeting = 'Hello';
    
    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 17) timeGreeting = 'Good afternoon';
    else timeGreeting = 'Good evening';
    
    const greetings = [
      `${timeGreeting}, ${name}! I'm M, your identity mentor. I'm here to create a safe space for you to explore your thoughts, feelings, and identity.`,
      `${timeGreeting}, ${name}! I'm so glad you're here. This is your safe space to share whatever is on your mind.`,
      `${timeGreeting}, ${name}! I'm M, and I'm here to listen and support you on your journey of self-discovery.`
    ];
    
    const baseGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    let personalizedPart = '';
    if (userProfile.identity_goals) {
      personalizedPart = ` I understand you're working on ${userProfile.identity_goals.toLowerCase()}.`;
    } else if (userProfile.focus_area) {
      personalizedPart = ` I see you'd like to focus on ${userProfile.focus_area.toLowerCase()}.`;
    }
    
    const closingParts = [
      ' How are you feeling today?',
      ' What would you like to talk about?',
      ' What\'s on your mind right now?',
      ' How can I support you today?'
    ];
    
    return baseGreeting + personalizedPart + closingParts[Math.floor(Math.random() * closingParts.length)];
  };

  const formatSentimentDisplay = (score) => {
    if (score === null || score === undefined) return null;
    if (score > 0.2) return { emoji: '😊', label: 'Positive' };
    if (score < -0.2) return { emoji: '😔', label: 'Struggling' };
    return { emoji: '😐', label: 'Neutral' };
  };

  return (
    <div className="chat-container" style={{ margin: '0 0.5in', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* End Chat Button */}
      {currentSessionId && !isHistoryView && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', position: 'relative', zIndex: 10 }}>
          <button
            className="end-chat-button"
            onClick={() => setShowConfirmEnd(true)}
            style={{
              background: 'linear-gradient(90deg, #ff5858 0%, #f857a6 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '2rem',
              padding: '0.7rem 2.2rem',
              fontSize: '1.1rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(248,87,166,0.10)',
              transition: 'background 0.2s, box-shadow 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.7rem',
              outline: 'none',
              position: 'relative',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(90deg, #e63946 0%, #f857a6 100%)'}
            onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(90deg, #ff5858 0%, #f857a6 100%)'}
          >
            <FiX size={20} style={{ marginRight: 2 }} />
            End Chat
          </button>
          {/* Confirmation Dialog */}
          {showConfirmEnd && (
            <div style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              background: '#fff',
              color: '#222',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              padding: '1.2rem 1.5rem',
              zIndex: 100,
              minWidth: 260,
              textAlign: 'center',
              fontSize: '1rem',
              fontWeight: 500
            }}>
              <div style={{ marginBottom: 16 }}>
                Are you sure you want to end this chat session?
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                <button
                  onClick={handleEndChat}
                  style={{
                    background: 'linear-gradient(90deg, #ff5858 0%, #f857a6 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '1.2rem',
                    padding: '0.5rem 1.2rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(248,87,166,0.10)',
                    transition: 'background 0.2s',
                  }}
                >
                  Yes, End
                </button>
                <button
                  onClick={() => setShowConfirmEnd(false)}
                  style={{
                    background: '#eee',
                    color: '#222',
                    border: 'none',
                    borderRadius: '1.2rem',
                    padding: '0.5rem 1.2rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Chat Messages */}
      <div className="chat-messages" ref={messagesEndRef} style={{ flex: 1, minHeight: 0 }}>
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.sender}`}>  
            {/* Responder icon/label above message */}
            <div style={{
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 2,
              color: message.sender === 'user' ? userMsgBg : '#a78bfa',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginLeft: 2
            }}>
              {message.sender === 'user'
                ? (userProfile.screen_name || userProfile.name || 'You')
                : (<><span style={{ background: '#a78bfa', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>M</span> <span style={{fontWeight:600}}>M</span></>)}
            </div>
            <div className="message-content" style={{ fontSize: 16, lineHeight: 1.6 }}>
              {message.message_text}
            </div>
            <div className="message-time">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input-container">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage(e)}
          placeholder="Ask M"
          className="chat-input"
        />
        <button
          onClick={sendMessage}
          className="send-button"
          style={{ backgroundColor: userMsgBg, color: '#222' }}
        >
          <FiArrowRight />
        </button>
      </div>
      <div className="suggestions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, width: '100%' }}>
          {suggestions.slice(0, 3).map((suggestion, index) => (
            <button
              key={index}
              className="suggestion-chip"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, width: '100%' }}>
          {suggestions.slice(3).map((suggestion, index) => (
            <button
              key={index + 3}
              className="suggestion-chip"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Enhanced Dashboard Component with GROQ-powered insights
const Dashboard = ({ user, refresh }) => {
  const [dashboardData, setDashboardData] = useState({
    totalSessions: 0,
    averageMood: null,
    streak: 0,
    topicsCount: 0,
    insights: {},
    moodTracking: [],
    recentSummaries: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [user.id, refresh]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = user.user_id || user.id;
      
      // Fetch analytics and insights
      const [analyticsRes, moodRes, summariesRes] = await Promise.all([
        fetch(`${API_URL}/api/analytics/${userId}`, { credentials: 'include' }),
        fetch(`${API_URL}/api/mood-data/${userId}`, { credentials: 'include' }),
        fetch(`${API_URL}/api/chat-summaries/${userId}`, { credentials: 'include' })
      ]);
      
      const analytics = await analyticsRes.json();
      const moodData = await moodRes.json();
      const summaries = await summariesRes.json();
      
      setDashboardData({
        totalSessions: analytics.totalSessions || 0,
        averageMood: analytics.averageMood || 'N/A',
        streak: analytics.streak || 0,
        topicsCount: analytics.topicsCount || 0,
        insights: analytics.insights || {},
        moodTracking: Array.isArray(moodData) ? moodData : [],
        recentSummaries: summaries || []
      });
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="loading-spinner" style={{ width: '40px', height: '40px', marginBottom: '16px' }}></div>
        <p style={{ color: 'var(--color-text-primary)' }}>Loading your insights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>Unable to Load Dashboard</h2>
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  const getPersonalizedGreeting = () => {
    const name = user.screen_name || user.name;
    const hour = new Date().getHours();
    let timeGreeting = 'Welcome back';
    
    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 17) timeGreeting = 'Good afternoon'; 
    else timeGreeting = 'Good evening';
    
    return `${timeGreeting}, ${name}!`;
  };

  return (
    <div className="dashboard-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
      <div className="dashboard-header">
        <h1 style={{ background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-bg-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
          {getPersonalizedGreeting()}
        </h1>
        <p style={{ color: 'var(--color-text-primary)', opacity: 0.8, marginBottom: '2rem' }}>
          Your wellness journey insights powered by AI
        </p>
      </div>

      {/* Key Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, marginBottom: 32 }}>
        <div className="stat-card card-hover" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-bg-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Sessions</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-bg-primary)', margin: '8px 0' }}>{dashboardData.totalSessions}</div>
          <div style={{ color: 'var(--color-bg-secondary)', fontSize: 14 }}>All time conversations</div>
        </div>
        
        <div className="stat-card card-hover" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>😊</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-bg-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Average Mood</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-bg-primary)', margin: '8px 0' }}>
            {dashboardData.averageMood}
          </div>
          <div style={{ color: 'var(--color-bg-secondary)', fontSize: 14 }}>Last 7 days</div>
        </div>
        
        <div className="stat-card card-hover" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔥</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-bg-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Streak</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-bg-primary)', margin: '8px 0' }}>{dashboardData.streak}</div>
          <div style={{ color: 'var(--color-bg-secondary)', fontSize: 14 }}>Consecutive days</div>
        </div>
        
        <div className="stat-card card-hover" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-bg-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Growth Areas</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-bg-primary)', margin: '8px 0' }}>{dashboardData.topicsCount}</div>
          <div style={{ color: 'var(--color-bg-secondary)', fontSize: 14 }}>Topics explored</div>
        </div>
      </div>

      {/* AI Insights Section */}
      {dashboardData.insights && Object.keys(dashboardData.insights).length > 0 && (
        <div className="stat-card card-hover" style={{ marginBottom: 32, background: 'linear-gradient(135deg, var(--color-highlight) 0%, rgba(189, 162, 224, 0.8) 100%)' }}>
          <h3 style={{ color: 'var(--color-bg-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px' }}>
            <span style={{ fontSize: '32px' }}>🧠</span>
            AI-Powered Insights
          </h3>
          
          {dashboardData.insights.key_insights && (
            <div style={{ marginBottom: '1.5rem', padding: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
              <h4 style={{ color: 'var(--color-bg-primary)', fontSize: '18px', marginBottom: '8px', fontWeight: '600' }}>💡 Key Insights</h4>
              <p style={{ color: 'var(--color-bg-primary)', lineHeight: 1.6, fontSize: '16px', margin: 0 }}>
                {dashboardData.insights.key_insights}
              </p>
            </div>
          )}
          
          {dashboardData.insights.progress_trends && dashboardData.insights.progress_trends.length > 0 && (
            <div style={{ marginBottom: '1.5rem', padding: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
              <h4 style={{ color: 'var(--color-bg-primary)', fontSize: '18px', marginBottom: '8px', fontWeight: '600' }}>📈 Progress Trends</h4>
              <ul style={{ color: 'var(--color-bg-primary)', paddingLeft: '1.5rem', margin: 0 }}>
                {dashboardData.insights.progress_trends.map((trend, idx) => (
                  <li key={idx} style={{ marginBottom: '4px', lineHeight: 1.4 }}>{trend}</li>
                ))}
              </ul>
            </div>
          )}
          
          {dashboardData.insights.recommended_focus_areas && dashboardData.insights.recommended_focus_areas.length > 0 && (
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
              <h4 style={{ color: 'var(--color-bg-primary)', fontSize: '18px', marginBottom: '12px', fontWeight: '600' }}>🎯 Recommended Focus Areas</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {dashboardData.insights.recommended_focus_areas.map((area, idx) => (
                  <span key={idx} style={{
                    background: 'var(--color-brand-primary)',
                    color: 'var(--color-bg-primary)',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 2fr) minmax(250px, 1fr)', gap: 24, marginBottom: 32 }}>
        <div className="chart-card card-hover">
          <h3 style={{ color: 'var(--color-bg-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📊 Mood Tracking - Last 7 Days
          </h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 140, padding: '0 8px' }}>
            {dashboardData.moodTracking.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  background: item.value > 7 ? 'var(--color-brand-primary)' : item.value > 4 ? '#8EE6A3' : '#F18884',
                  width: '100%',
                  height: item.value ? Math.max(20, item.value * 12) : 20,
                  borderRadius: '8px 8px 4px 4px',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-bg-primary)',
                  fontWeight: 700,
                  fontSize: 14,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                title={`Mood: ${item.value || 'No data'}`}
                >
                  {item.value || ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-bg-secondary)', fontWeight: '500' }}>{item.date}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--color-bg-secondary)', textAlign: 'center' }}>
            Scale: 1-10 (Higher is better mood)
          </div>
        </div>
        
        <div className="topics-card card-hover">
          <h3 style={{ color: 'var(--color-bg-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎯 Activity Status
          </h3>
          <div style={{ color: 'var(--color-bg-primary)', textAlign: 'center', padding: '2rem 1rem' }}>
            {dashboardData.totalSessions > 0 ? (
              <div>
                <div style={{ fontSize: 48, marginBottom: 16, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}>📈</div>
                <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Great Progress!</h4>
                <p style={{ lineHeight: 1.5, opacity: 0.9 }}>You're building a consistent habit of self-reflection and growth.</p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
                <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Ready to Start?</h4>
                <p style={{ lineHeight: 1.5, opacity: 0.9 }}>Begin your first conversation to see personalized insights here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Session Summaries */}
      <div>
        <h3 style={{ color: 'var(--color-bg-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px' }}>
          <span style={{ fontSize: '28px' }}>📚</span>
          Recent Session Summaries
        </h3>
        {dashboardData.recentSummaries.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {dashboardData.recentSummaries.map((summary, idx) => (
              <div key={idx} className="summary-card card-hover" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h4 style={{ color: 'var(--color-bg-primary)', fontSize: '16px', margin: 0, fontWeight: '600', lineHeight: 1.3, flex: 1 }}>
                    {summary.title}
                  </h4>
                  {summary.mood && (
                    <span className={`summary-mood ${summary.mood}`} style={{ marginLeft: '8px', flexShrink: 0 }}>
                      {summary.mood}
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--color-bg-primary)', fontSize: '14px', lineHeight: 1.5, marginBottom: '12px', opacity: 0.9 }}>
                  {summary.summary}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-bg-secondary)', fontWeight: '500' }}>
                    {summary.date}
                  </div>
                  {summary.session_quality_score && (
                    <div style={{ fontSize: '12px', color: 'var(--color-brand-primary)', fontWeight: '600' }}>
                      Quality: {summary.session_quality_score}/10
                    </div>
                  )}
                </div>
                {summary.tags && summary.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {summary.tags.slice(0, 3).map((tag, tagIdx) => (
                      <span key={tagIdx} style={{
                        background: 'rgba(142, 230, 163, 0.15)',
                        color: 'var(--color-bg-primary)',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '500',
                        border: '1px solid rgba(142, 230, 163, 0.3)'
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-large">
            <div className="empty-icon" style={{ fontSize: '64px', marginBottom: '16px' }}>💭</div>
            <h4 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>No sessions yet</h4>
            <p style={{ fontSize: '16px', lineHeight: 1.5, opacity: 0.8 }}>
              Start a conversation with M to see your personalized session summaries and insights here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Profile Component
const Profile = ({ user, onUpdateProfile }) => {
  const [profile, setProfile] = useState({
    screen_name: user.screen_name || '',
    pronouns: user.pronouns || '',
    goals: user.goals || '',
    focus_areas: user.focus_areas || []
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: user.id,
          ...profile
        })
      });
      if (response.ok) {
        onUpdateProfile(profile);
        alert('Profile updated successfully!');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header-card">
          <div className="profile-avatar">
            {user.screen_name ? user.screen_name[0].toUpperCase() : (user.name ? user.name[0].toUpperCase() : 'M')}
          </div>
          <div className="profile-header-info">
            <span className="profile-name">{user.screen_name || user.name || 'Your Name'}</span>
            <span className="profile-email">{user.email || ''}</span>
          </div>
        </div>
        <form className="profile-form profile-form-card" onSubmit={handleSubmit}>
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
          <button type="submit" className="btn-primary">
            Save Profile
          </button>
        </form>
      </div>
    </div>
  );
};

// About Component
const About = () => {
  return (
    <div className="about-page">
      <div className="about-header">
        <h1>How to use M</h1>
        <p>Your guide to getting the most out of your AI-powered identity mentor</p>
      </div>

      <div className="about-content">
        <div className="feature-card">
          <div className="feature-icon">💬</div>
          <h3>Personalized Conversations</h3>
          <p>M addresses you by name, uses your pronouns, and references your goals for truly personalized support. Every conversation is tailored to your unique journey.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>AI-Powered Insights</h3>
          <p>Advanced AI analyzes your conversations to provide meaningful insights, mood trends, and personalized recommendations for your growth journey.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🧠</div>
          <h3>GROQ-Enhanced Understanding</h3>
          <p>M uses cutting-edge GROQ technology to deeply understand context, emotion, and provide therapeutic-quality responses based on your profile.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📚</div>
          <h3>Comprehensive History</h3>
          <p>Access all your previous conversations, see detailed summaries, and track your emotional journey over time with AI-generated insights.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3>Goal-Oriented Support</h3>
          <p>M remembers your identity goals and focus areas, weaving them into conversations to keep you aligned with your personal growth objectives.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h3>Privacy & Security</h3>
          <p>Your conversations are private and secure. Chat histories help M understand your journey better while maintaining complete confidentiality.</p>
        </div>

        <div className="tips-section">
          <h3>✨ Tips for Better Conversations</h3>
          <ul>
            <li><strong>Complete your profile</strong> - The more M knows about you, the better support it can provide</li>
            <li><strong>Be authentic</strong> - Share your real feelings and experiences for genuine support</li>
            <li><strong>Use specific examples</strong> - Concrete situations help M provide more targeted advice</li>
            <li><strong>Reference your goals</strong> - M will connect conversations back to your stated objectives</li>
            <li><strong>End sessions mindfully</strong> - Ending sessions generates AI insights and summaries</li>
            <li><strong>Review your dashboard</strong> - Track patterns and progress over time</li>
            <li><strong>Update preferences</strong> - Adjust response length and communication style as needed</li>
          </ul>
        </div>

        <div className="getting-started">
          <h3>🚀 Getting Started</h3>
          <ol>
            <li><strong>Set up your profile</strong> - Add your name, pronouns, and goals for personalized responses</li>
            <li><strong>Start with a greeting</strong> - M will address you by name and reference your goals</li>
            <li><strong>Share authentically</strong> - The more honest you are, the better support you'll receive</li>
            <li><strong>Use suggestions</strong> - Try the suggestion chips if you're not sure what to discuss</li>
            <li><strong>End sessions</strong> - Complete conversations to generate insights and track progress</li>
            <li><strong>Check your dashboard</strong> - Review AI-powered insights and mood trends regularly</li>
            <li><strong>Browse chat history</strong> - Revisit previous conversations to see your growth</li>
          </ol>
        </div>

        <div className="tips-section">
          <h3>🎭 Understanding M's Responses</h3>
          <ul>
            <li><strong>Personalized addressing</strong> - M uses your preferred name and pronouns</li>
            <li><strong>Goal integration</strong> - Responses reference your identity goals and focus areas</li>
            <li><strong>Adaptive tone</strong> - Communication style matches your preferences</li>
            <li><strong>Context awareness</strong> - M remembers previous conversations and builds on them</li>
            <li><strong>Emotional intelligence</strong> - Responses adapt to your current emotional state</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Enhanced Feedback Component
const Feedback = ({ user }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [recentSession, setRecentSession] = useState(null);
  const [category, setCategory] = useState('General');

  useEffect(() => {
    fetchRecentSession();
  }, []);

  const fetchRecentSession = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sessions/${user.id}/recent`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setRecentSession(data.session);
      }
    } catch (err) {
      console.error('Error fetching recent session:', err);
    }
  };

  const handleRatingClick = (value) => {
    setRating(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: user.id,
          session_id: recentSession?.session_id,
          rating,
          feedback,
          category
        })
      });
      if (response.ok) {
        alert('Thank you for your feedback!');
        setRating(0);
        setFeedback('');
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  return (
    <div className="feedback-container">
      <h2 className="feedback-title">How would you rate your experience with M?</h2>
      
      <div className="rating-container">
        <div className="stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className={`star ${rating >= star ? 'active' : ''}`}
              onClick={() => handleRatingClick(star)}
            >
              ★
            </button>
          ))}
        </div>
        <div className="rating-labels">
          <span>Disappointed</span>
          <span>Okay</span>
          <span>Inspired</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 400, margin: '0 auto' }}>
        <div className="form-group" style={{ width: '100%', marginBottom: '1.5rem' }}>
          <label htmlFor="category" style={{ marginBottom: 8, color: '#fff', fontWeight: 600, fontSize: '1.1rem' }}>Category</label>
          <select
            id="category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              borderRadius: '1.2rem',
              padding: '0.8rem 1.2rem',
              fontSize: '1.1rem',
              background: '#fff',
              color: '#2d0036',
              marginBottom: 0,
            }}
          >
            <option value="General">General</option>
            <option value="Support">Support</option>
            <option value="Technical">Technical</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-group" style={{ width: '100%', marginBottom: '2rem' }}>
          <label htmlFor="feedback" style={{ marginBottom: 8, color: '#fff', fontWeight: 600, fontSize: '1.1rem' }}>Additional Comments (Optional)</label>
          <textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your thoughts about your experience..."
            rows={5}
            style={{
              width: '100%',
              minHeight: 120,
              border: 'none',
              borderRadius: '1.5rem',
              padding: '1.2rem 1.5rem',
              fontSize: '1.15rem',
              background: '#fff',
              color: '#2d0036',
              boxShadow: '0 2px 12px rgba(32,1,37,0.10)',
              outline: 'none',
              display: 'block',
              transition: 'box-shadow 0.2s',
              textAlign: 'left',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </div>
        <button
          type="submit"
          className="btn-primary"
          disabled={rating === 0}
          style={{
            width: '100%',
            padding: '1.1rem 0',
            border: 'none',
            borderRadius: '1.5rem',
            background: rating === 0 ? '#7fa88a' : 'var(--color-brand-primary)',
            color: '#fff',
            fontSize: '1.2rem',
            fontWeight: 600,
            cursor: rating === 0 ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(32,1,37,0.08)',
            transition: 'background 0.2s, color 0.2s',
            marginTop: '0.5rem',
            display: 'block',
            textAlign: 'center',
          }}
        >
          Submit Feedback
        </button>
      </form>
    </div>
  );
};

// Main App Component
const App = () => {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('chat');
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  
  // Enhanced state management for chat sessions
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionUpdateTrigger, setSessionUpdateTrigger] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/user`, {
        credentials: 'include'
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    setCurrentPage('chat');
    setSelectedSessionId(null);
    setActiveSessionId(null);
  };

  const handleUpdateProfile = (profileData) => {
    setUser(prev => ({ ...prev, ...profileData }));
    triggerSessionUpdate(); // Refresh to show updated personalization
  };

  const handleSelectSession = (sessionId) => {
    setSelectedSessionId(sessionId);
    setActiveSessionId(null);
  };

  const handleStartNewChat = () => {
    setSelectedSessionId(null);
    setActiveSessionId(null);
    triggerSessionUpdate();
  };

  const handleEndSession = (sessionId) => {
    setActiveSessionId(null);
    setSelectedSessionId(null);
    triggerSessionUpdate();
  };

  const triggerSessionUpdate = () => {
    setSessionUpdateTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading M...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'chat':
        return (
          <Chat
            user={user}
            selectedSessionId={selectedSessionId}
            activeSessionId={activeSessionId}
            setActiveSessionId={setActiveSessionId}
            onEndSession={handleEndSession}
            onStartNewSession={handleStartNewChat}
            userProfile={user}
            onSessionUpdate={triggerSessionUpdate}
          />
        );
      case 'dashboard':
        return <Dashboard user={user} refresh={sessionUpdateTrigger} />;
      case 'profile':
        return <Profile user={user} onUpdateProfile={handleUpdateProfile} />;
      case 'about':
        return <About />;
      case 'feedback':
        return <Feedback user={user} />;
      default:
        return <Navigate to="/chat" replace />;
    }
  };

  return (
    <div className="app">
      <Navigation 
        user={user} 
        setCurrentPage={setCurrentPage}
        currentPage={currentPage}
        onLogout={handleLogout}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onSelectSession={handleSelectSession}
        selectedSessionId={selectedSessionId}
        onStartNewChat={handleStartNewChat}
        refreshTrigger={sessionUpdateTrigger}
      />
      <main className={`main-content${isSidebarOpen ? '' : ' full'}`}>
        <div style={{ marginLeft: !isSidebarOpen ? 56 : 0, transition: 'margin-left 0.3s' }}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
};

export default App;
