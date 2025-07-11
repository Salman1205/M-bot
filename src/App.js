import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { 
  FiMessageCircle, 
  FiBarChart, 
  FiUser, 
  FiMenu,
  FiX,
  FiSend,
  FiPlus,
  FiLogOut,
  FiStar,
  FiTrendingUp,
  FiClock,
  FiHeart,
  FiTrash2,
  FiCopy,
  FiThumbsUp
} from 'react-icons/fi';
import { 
  SparklesIcon, 
  ChatBubbleLeftRightIcon, 
  ChartBarIcon,
  UserCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import Particles from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import CountUp from 'react-countup';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import './App.css';
import EnhancedProfile from './EnhancedProfile';


// 🎨 Animation Variants
const pageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  in: { opacity: 1, y: 0, scale: 1 },
  out: { opacity: 0, y: -20, scale: 1.05 }
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.5
};

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const slideInVariant = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.3, ease: "easeOut" }
};

// 🌟 Particle Configuration
const particlesConfig = {
  background: {
    color: {
      value: "transparent",
    },
  },
  fpsLimit: 120,
  interactivity: {
    events: {
      onClick: {
        enable: true,
        mode: "push",
      },
      onHover: {
        enable: true,
        mode: "repulse",
      },
      resize: true,
    },
    modes: {
      push: {
        quantity: 4,
      },
      repulse: {
        distance: 100,
        duration: 0.4,
      },
    },
  },
  particles: {
    color: {
      value: "#8EE6A3",
    },
    links: {
      color: "#8EE6A3",
      distance: 150,
      enable: true,
      opacity: 0.2,
      width: 1,
    },
    move: {
      direction: "none",
      enable: true,
      outModes: {
        default: "bounce",
      },
      random: false,
      speed: 1,
      straight: false,
    },
    number: {
      density: {
        enable: true,
        area: 800,
      },
      value: 50,
    },
    opacity: {
      value: 0.3,
    },
    shape: {
      type: "circle",
    },
    size: {
      value: { min: 1, max: 3 },
    },
  },
  detectRetina: true,
};

// 🛠️ Error Handler for ResizeObserver
const suppressResizeObserverError = () => {
  const resizeObserverErr = /ResizeObserver loop completed with undelivered notifications/;
  const originalError = window.onerror;
  
  window.onerror = function(message, source, lineno, colno, error) {
    if (resizeObserverErr.test(message)) {
      return true; // Suppress this specific error
    }
    if (originalError) {
      return originalError.apply(this, arguments);
    }
    return false;
  };
  
  // Also handle promise rejections
  const originalUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = function(event) {
    if (resizeObserverErr.test(event.reason)) {
      event.preventDefault();
      return true;
    }
    if (originalUnhandledRejection) {
      return originalUnhandledRejection.apply(this, arguments);
    }
    return false;
  };
};

// 💎 Glassmorphism Login Component
const StunningLogin = ({ onLogin, isLoading }) => {
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (authMode === 'signup') {
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match!', {
          icon: '⚠️',
          style: {
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            color: '#fff',
          },
        });
        return;
      }
      
      try {
        const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            username: formData.name || formData.email.split('@')[0]
        })
      });

        if (response.ok) {
          toast.success('Account created successfully! Redirecting to login...', {
            icon: '🎉',
            style: {
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff',
            },
          });
          
          // Switch to login after signup
          setTimeout(() => {
            setAuthMode('login');
            setFormData({ email: formData.email, password: '', confirmPassword: '', name: '' });
          }, 2000);
      } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Signup failed');
      }
    } catch (error) {
        console.error('Signup error:', error);
        toast.error(error.message || 'Signup failed. Please try again.', {
          icon: '❌',
          style: {
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            color: '#fff',
          },
        });
      }
      return;
    }

    // Handle login
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Store the JWT token
        localStorage.setItem('token', data.access_token);
        
        // Call onLogin with user data
        onLogin(data.user || {
          user_id: data.user_id || 'demo_user_123',
          username: formData.email.split('@')[0] || 'User',
          email: formData.email,
          profile_picture: null
        });

        toast.success('Login successful! Welcome back! 🚀', {
          icon: '✅',
          style: {
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#fff',
          },
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please try again.', {
        icon: '❌',
        style: {
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #EF4444, #DC2626)',
          color: '#fff',
        },
      });
    }
  };

  const handleGoogleLogin = () => {
    // For now, redirect to backend Google OAuth endpoint
    window.location.href = '/api/google-login';
  };

    return (
    <motion.div 
      className="login-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div 
        className="login-card"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
        whileHover={{ scale: 1.02 }}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ textAlign: 'center' }}
        >
          <motion.img 
            src="/newlogo.jpg" 
            alt="M - Identity Mentor" 
            className="login-logo"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
                style={{ 
              maxWidth: '200px',
              width: '100%',
              height: 'auto',
              maxHeight: '80px',
              marginBottom: 'var(--spacing-lg)',
              borderRadius: 'var(--radius-lg)',
              filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))',
              objectFit: 'contain'
            }}
          />
          <p className="subtitle">Your AI-powered identity mentor for personal growth and self-discovery</p>
        </motion.div>

        <motion.button
          className="btn-google"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </motion.button>

        <motion.div 
          className="divider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <span>or</span>
        </motion.div>

        <motion.form 
          onSubmit={handleSubmit}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {authMode === 'signup' && (
            <motion.div 
              className="form-group"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
            </motion.div>
          )}
          
              <div className="form-group">
            <label>Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
          
              <div className="form-group">
            <label>Password</label>
                <input
                  type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
          
          {authMode === 'signup' && (
            <motion.div 
              className="form-group"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <label>Confirm Password</label>
                <input
                  type="password"
                  placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  required
              />
            </motion.div>
          )}
          
          <motion.button
              type="submit" 
            className="btn-primary"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? <div className="loading-spinner" /> : (authMode === 'login' ? 'Sign In' : 'Create Account')}
          </motion.button>
        </motion.form>

        <motion.div 
          style={{ marginTop: '1.5rem', textAlign: 'center' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>
            {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
          </span>
            <button 
              type="button"
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-brand-primary)',
                cursor: 'pointer',
              marginLeft: '0.5rem',
              textDecoration: 'underline'
              }}
            >
            {authMode === 'login' ? 'Create New Account' : 'Sign In'}
            </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// 🎛️ Enhanced Sidebar Navigation
const Navigation = ({ 
  user, 
  setCurrentPage, 
  currentPage, 
  onLogout, 
  isSidebarOpen, 
  setIsSidebarOpen,
  onSelectSession,
  selectedSessionId,
  onStartNewChat,
  refreshTrigger 
}) => {
  const [chatSessions, setChatSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const navItems = [
    { id: 'chat', label: 'Chat', icon: FiMessageCircle },
    { id: 'dashboard', label: 'Dashboard', icon: FiBarChart },
    { id: 'using-m', label: 'Using M', icon: FiStar },
    { id: 'feedback', label: 'Feedback', icon: FiHeart },
    { id: 'profile', label: 'Profile', icon: FiUser }
  ];

  const handleNavigation = (pageId) => {
    // End current chat session and store it when navigating away from chat
    if (currentPage === 'chat' && pageId !== 'chat' && selectedSessionId) {
      // Session is automatically saved when messages are sent, so just clear selection
      onSelectSession(null);
    }
    setCurrentPage(pageId);
    
    // Show appropriate feedback
    if (pageId === 'dashboard') {
      toast.success('Welcome to your Dashboard! 📊', {
        icon: '📊',
        style: {
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #8EE6A3, #7DD87F)',
          color: '#fff',
        },
      });
    } else if (pageId === 'chat') {
      toast.success('Let\'s continue chatting! 💬', {
        icon: '💬',
        style: {
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #E4CDF7, #BDA2E0)',
          color: '#fff',
        },
      });
    }
  };

  useEffect(() => {
    if (user && user.user_id) {
      fetchChatSessions();
    } else {
      // Ensure chatSessions is always an array, even when no user
      setChatSessions([]);
      setIsLoading(false);
    }
  }, [user, refreshTrigger]);

  const fetchChatSessions = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sessions/${user.user_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const sessions = await response.json();
        // Ensure sessions is always an array
        setChatSessions(Array.isArray(sessions) ? sessions : []);
      } else {
        // If response is not ok, set empty array
        setChatSessions([]);
      }
    } catch (error) {
      console.error('Failed to fetch chat sessions:', error);
      // On error, ensure chatSessions is still an array
      setChatSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewChat = () => {
    // If there was a previous session, it's already saved in the database
    // Clear current selection to start fresh
    onStartNewChat();
    
    // Navigate to chat page if not already there
    if (currentPage !== 'chat') {
      setCurrentPage('chat');
    }
    
    toast.success('New conversation started! 🚀', {
      icon: '💬',
      style: {
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #8EE6A3, #7DD87F)',
        color: '#fff',
      },
    });
  };

  const handleChatSessionSelect = (sessionId) => {
    // Switch to the selected chat session
    onSelectSession(sessionId);
    
    // Navigate to chat page
    if (currentPage !== 'chat') {
      setCurrentPage('chat');
    }
    
    toast.success('Chat session loaded! 📖', {
      icon: '📖',
      style: {
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #E4CDF7, #BDA2E0)',
        color: '#fff',
      },
    });
  };

  return (
    <>
      <motion.aside 
        className={`sidebar ${isSidebarOpen ? 'open' : ''}`}
        initial={{ x: -280 }}
        animate={{ x: isSidebarOpen ? 0 : -280 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <motion.div 
          className="sidebar-header"
          variants={slideInVariant}
          initial="initial"
          animate="animate"
        >
          <img 
            src="/newlogo.jpg" 
            alt="M - Identity Mentor Logo" 
            className="main-logo"
            onError={(e) => e.target.style.display = 'none'} 
          />
        </motion.div>

        <motion.nav 
          className="sidebar-nav"
          variants={staggerChildren}
          initial="initial"
          animate="animate"
        >
          {navItems.map((item) => (
            <motion.button
                  key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                  onClick={() => handleNavigation(item.id)}
              variants={slideInVariant}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <item.icon className="nav-icon" />
              <span>{item.label}</span>
            </motion.button>
          ))}
        </motion.nav>

        <motion.div 
          className="chat-history"
          variants={slideInVariant}
          initial="initial"
          animate="animate"
        >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Chat History</h3>
            <motion.button
              className="new-chat-btn"
              onClick={handleStartNewChat}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiPlus size={16} style={{ marginRight: '0.5rem' }} />
              New
            </motion.button>
              </div>
              
          {isLoading ? (
            <div>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} height={40} style={{ marginBottom: '0.5rem', borderRadius: '8px' }} />
              ))}
                </div>
          ) : !chatSessions || chatSessions.length === 0 ? (
            <motion.div 
                        style={{
                textAlign: 'center', 
                color: 'var(--text-muted)', 
                fontStyle: 'italic',
                padding: '2rem 0'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <FiMessageCircle size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>No conversations yet.</p>
              <p>Start your first chat!</p>
            </motion.div>
          ) : (
            <motion.div variants={staggerChildren}>
              {(chatSessions || []).map((session) => (
                <motion.button
                  key={session.session_id}
                  className={`nav-item ${selectedSessionId === session.session_id ? 'active' : ''}`}
                  onClick={() => handleChatSessionSelect(session.session_id)}
                  variants={slideInVariant}
                  whileHover={{ x: 4 }}
                  data-session={session.session_id}
                  style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}
                >
                  <FiMessageCircle className="nav-icon" style={{ fontSize: '1rem' }} />
                  <span style={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '150px'
                  }}>
                    {session.title || `Chat ${session.session_id.slice(-6)}`}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    opacity: 0.7,
                    display: 'block',
                    marginTop: '2px'
                  }}>
                    {session.created_at ? new Date(session.created_at).toLocaleDateString() : 'Recent'}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </motion.div>

        <motion.div 
          style={{ marginTop: 'auto' }}
          variants={slideInVariant}
          initial="initial"
          animate="animate"
        >
          <motion.div 
                  style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              marginBottom: '1rem',
              textAlign: 'center'
            }}
            whileHover={{ scale: 1.02 }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))',
                    display: 'flex',
                    alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.5rem',
              color: 'white',
              fontWeight: '600',
              fontSize: '1.2rem'
            }}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
              {user?.username || 'User'}
            </div>
          </motion.div>

          <motion.button
            className="nav-item"
            onClick={onLogout}
            whileHover={{ x: 4, background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
            whileTap={{ scale: 0.98 }}
            style={{ color: 'var(--color-error)' }}
          >
            <FiLogOut className="nav-icon" />
            <span>Logout</span>
          </motion.button>
        </motion.div>
      </motion.aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// 💬 Enhanced Chat Interface with Message Actions
const ChatInterface = ({ user, selectedSessionId, onSessionUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const chatMessagesRef = useRef(null);

  useEffect(() => {
    if (selectedSessionId) {
      fetchMessages();
    } else {
          setMessages([]);
    }
  }, [selectedSessionId]);

  // Smart scrollbar detection - hide initially, show when overflow
  useEffect(() => {
    const checkOverflow = () => {
      if (chatMessagesRef.current) {
        const element = chatMessagesRef.current;
        const hasOverflow = element.scrollHeight > element.clientHeight;
        
        if (hasOverflow) {
          element.classList.add('has-overflow');
        } else {
          element.classList.remove('has-overflow');
        }
      }
    };

    // Check overflow on mount and when messages change
    checkOverflow();
    
    // Check overflow on window resize
    window.addEventListener('resize', checkOverflow);
    
    // Set up ResizeObserver for more accurate detection
    let resizeObserver;
    if (chatMessagesRef.current) {
      resizeObserver = new ResizeObserver(checkOverflow);
      resizeObserver.observe(chatMessagesRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', checkOverflow);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [messages]); // Re-run when messages change

  const fetchMessages = async () => {
    if (!selectedSessionId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/session/${selectedSessionId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const fetchedMessages = await response.json();
        setMessages(fetchedMessages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: user.user_id,
          message: inputMessage,
          session_id: selectedSessionId
        })
      });

      if (response.ok) {
      const data = await response.json();
        setIsTyping(false);
        
        const assistantMessage = {
          id: Date.now() + 1,
          content: data.response,
          sender: 'assistant',
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // If this was a new chat (no selectedSessionId), show success message
        if (!selectedSessionId && data.session_id) {
          toast.success('New conversation saved! 💾', {
            icon: '💾',
            style: {
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8EE6A3, #7DD87F)',
              color: '#fff',
            },
          });
        }
        
        onSessionUpdate();
      } else if (response.status === 401) {
        // Handle authentication error
        toast.error('Please log in again to continue chatting', {
          icon: '🔐',
          duration: 5000
        });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      
      // Add a more helpful error message for users
      const errorMessage = {
        id: Date.now() + 2,
        content: "I'm having trouble connecting right now. This might be because the backend server isn't running. Please make sure the Flask server is running on port 5000, or try refreshing the page.",
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to send message. Please check if the backend server is running.', {
        duration: 8000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard! 📋', {
      icon: '✅',
      duration: 3000
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-resize textarea
  const adjustTextareaHeight = (textarea) => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    adjustTextareaHeight(e.target);
    
    // Show scrollbar only when content exceeds visible area
    if (e.target.scrollHeight > e.target.clientHeight) {
      e.target.classList.add('has-scroll');
    } else {
      e.target.classList.remove('has-scroll');
    }
  };

  return (
    <motion.div 
      className="chat-container"
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      transition={pageTransition}
    >
      {/* Clean Mobile Chat Header */}
      <motion.div 
        className="chat-header-clean"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          {/* Clean M Avatar */}
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(142, 230, 163, 0.3)'
          }}>
            <span style={{ 
              fontFamily: 'var(--font-heading)', 
              fontSize: '1.4rem',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              M
            </span>
        </div>
          
                    {/* Clean Text */}
          <div style={{ flex: 1 }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '1.2rem', 
              color: 'var(--text-primary)',
              fontWeight: '600',
              letterSpacing: '0.3px'
            }}>
              {isTyping ? (
                <span style={{ color: 'var(--color-brand-primary)' }}>
                  ✨ Typing...
                </span>
              ) : (
                'Your Identity Mentor'
              )}
            </h3>
        </div>
        </div>
        
        {/* Minimal Actions */}
        <motion.button
          onClick={() => {
            setMessages([]);
            setSelectedMessageId(null);
            toast.success('Chat cleared! 🧹');
          }}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
            style={{
            background: 'transparent',
              border: 'none',
            borderRadius: '10px',
            padding: '10px',
            color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <FiTrash2 size={18} />
        </motion.button>
      </motion.div>

      <div className="chat-messages" ref={chatMessagesRef}>
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div 
              className="user-focus-buttons"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ delay: 0.3 }}
                  style={{
                padding: '20px 16px',
                marginTop: '20px'
              }}
            >
              {/* Helper Text */}
              <motion.div 
                  style={{
                  textAlign: 'left',
                  marginBottom: '16px',
                  padding: '0 4px'
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <h3 style={{
                  color: 'var(--text-primary)',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  margin: '0 0 6px 0',
                  letterSpacing: '0.3px'
                }}>
                  ✨ Quick Start Topics
                </h3>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  margin: '0',
                  opacity: '0.8',
                  fontWeight: '400'
                }}>
                  Tap any topic to start a conversation
                </p>
              </motion.div>

              <div className="focus-buttons-grid-compact">
                <motion.button
                  className="focus-button-compact"
                  onClick={() => setInputMessage("Help me affirm who I am")}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  Affirm Who I Am
                </motion.button>
                
                <motion.button
                  className="focus-button-compact"
                  onClick={() => setInputMessage("I want to explore my gender identity")}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  Explore Gender Identity
                </motion.button>
                
                <motion.button
                  className="focus-button-compact"
                  onClick={() => setInputMessage("Help me support my well-being")}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  Support My Well-Being
                </motion.button>
                
                <motion.button
                  className="focus-button-compact"
                  onClick={() => setInputMessage("I want to grow spiritually")}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  Grow Spiritually
                </motion.button>
                
                <motion.button
                  className="focus-button-compact"
                  onClick={() => setInputMessage("Help me navigate my relationships")}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  Navigate Relationships
                </motion.button>
              </div>
            </motion.div>
          )}

          {messages.map((message, index) => (
            <motion.div
              key={message.id || index}
              className={`message ${message.sender} ${message.isError ? 'error' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              onClick={() => setSelectedMessageId(selectedMessageId === message.id ? null : message.id)}
            >
              <div className="message-avatar">
                {message.sender === 'user' ? 
                  user?.username?.charAt(0).toUpperCase() || 'U' : 
                  '🤖'
                }
        </div>
              
              <div className="message-content-wrapper" style={{ flex: 1 }}>
                <motion.div 
                  className="message-content"
                  whileHover={{ scale: 1.01 }}
        style={{ 
                    ...(message.isError && {
                      background: 'linear-gradient(135deg, #FEE2E2, #FECACA)',
                      borderLeft: '4px solid #EF4444',
                      color: '#7F1D1D'
                    })
                  }}
                >
                  {message.content}
                </motion.div>
                
                {/* Message Actions */}
                <AnimatePresence>
                  {selectedMessageId === message.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                  style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '8px',
                        justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyMessage(message.content);
                        }}
                        whileTap={{ scale: 0.95 }}
        style={{ 
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '20px',
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FiCopy size={12} />
                        Copy
                      </motion.button>
                      
                      {message.sender === 'assistant' && (
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.success('Great feedback! 👍');
                          }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '20px',
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <FiThumbsUp size={12} />
                          Helpful
                        </motion.button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>
            </motion.div>
        ))}
        
        {isTyping && (
            <motion.div
              className="message assistant"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="message-avatar">🤖</div>
              <div className="message-content">
              <div className="typing-indicator">
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    style={{ display: 'inline-block', width: '8px', height: '8px', background: 'var(--color-brand-primary)', borderRadius: '50%', margin: '0 2px' }}
                  />
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    style={{ display: 'inline-block', width: '8px', height: '8px', background: 'var(--color-brand-primary)', borderRadius: '50%', margin: '0 2px' }}
                  />
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    style={{ display: 'inline-block', width: '8px', height: '8px', background: 'var(--color-brand-primary)', borderRadius: '50%', margin: '0 2px' }}
                  />
              </div>
            </div>
            </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* Enhanced Mobile Input */}
      <motion.div 
        className="chat-input-wrapper"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <textarea
            className="chat-input"
          value={inputMessage}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Share your thoughts with M... 💭"
          disabled={isLoading}
          rows={1}
        />
        <motion.button
            className="send-button"
          onClick={sendMessage}
          disabled={isLoading || !inputMessage.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isLoading ? (
            <div className="loading-spinner" style={{ width: '20px', height: '20px' }} />
          ) : (
            <FiSend size={20} />
          )}
        </motion.button>
      </motion.div>


    </motion.div>
  );
};

// 🌟 Using M - Beautiful Guide Section
const UsingM = ({ user }) => {
  const [selectedGuide, setSelectedGuide] = useState(null);

  const guides = [
    {
      id: 1,
      title: 'Getting Started with M',
      description: 'Learn the basics of your AI identity mentor',
      icon: '🚀',
      content: 'M is your personal AI companion designed to help you explore your identity, understand yourself better, and grow as a person. Start by having open conversations about who you are and what you want to become.',
      tips: ['Be honest and open in your conversations', 'Ask questions about yourself', 'Explore different aspects of your identity', 'Set personal growth goals']
    },
    {
      id: 2,
      title: 'Identity Exploration',
      description: 'Discover different aspects of yourself',
      icon: '🔍',
      content: 'Use M to explore different facets of your identity - your values, beliefs, aspirations, and relationships. M can help you understand patterns in your thoughts and behaviors.',
      tips: ['Reflect on your core values', 'Discuss your relationships', 'Explore your career aspirations', 'Understand your emotional patterns']
    },
    {
      id: 3,
      title: 'Personal Growth',
      description: 'Set and achieve meaningful goals',
      icon: '🌱',
      content: 'M can help you identify areas for growth and create actionable plans to achieve your goals. Track your progress and celebrate your victories along the way.',
      tips: ['Set SMART goals', 'Break down big goals into smaller steps', 'Track your progress regularly', 'Celebrate small wins']
    },
    {
      id: 4,
      title: 'Communication Skills',
      description: 'Improve how you express yourself',
      icon: '💬',
      content: 'Practice expressing your thoughts and feelings with M. Learn to communicate more effectively in your personal and professional relationships.',
      tips: ['Practice active listening', 'Express emotions clearly', 'Ask for feedback', 'Work on conflict resolution']
    }
  ];

  return (
    <motion.div 
      className="using-m-container"
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      transition={pageTransition}
      style={{ padding: 'var(--spacing-xl)' }}
    >
      <motion.div 
        className="page-header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="sparkle" style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '1rem' }}>
          Using M ✨
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '1.2rem', 
          textAlign: 'center',
          marginBottom: '3rem' 
        }}>
          Master your journey of self-discovery with these guides
        </p>
      </motion.div>

      <motion.div 
        className="guides-grid"
            style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-xl)'
        }}
        variants={staggerChildren}
        initial="initial"
        animate="animate"
      >
        {guides.map((guide, index) => (
          <motion.div
            key={guide.id}
            className="guide-card glass-card"
            variants={slideInVariant}
            whileHover={{ 
              scale: 1.05,
              boxShadow: 'var(--shadow-glow)'
            }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedGuide(guide)}
            style={{
              padding: 'var(--spacing-xl)',
              cursor: 'pointer',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <motion.div
              style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, delay: index * 0.5 }}
            >
              {guide.icon}
            </motion.div>
            
            <h3 style={{ 
              color: 'var(--color-brand-primary)', 
              marginBottom: 'var(--spacing-sm)',
              fontSize: '1.5rem'
            }}>
              {guide.title}
            </h3>
            
            <p style={{ color: 'var(--text-secondary)' }}>
              {guide.description}
            </p>
            
            <motion.div
                style={{ 
                position: 'absolute',
                bottom: '1rem',
                right: '1rem',
                color: 'var(--color-brand-primary)',
                fontSize: '1.5rem'
              }}
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              →
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence>
        {selectedGuide && (
          <motion.div
            className="guide-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
                style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
              zIndex: 2000,
              padding: 'var(--spacing-md)'
            }}
            onClick={() => setSelectedGuide(null)}
          >
            <motion.div
              className="guide-content glass-card"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '600px',
                width: '100%',
                padding: 'var(--spacing-2xl)',
                maxHeight: '80vh',
                overflowY: 'auto'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)' }}>
                  {selectedGuide.icon}
          </div>
                <h2 style={{ color: 'var(--color-brand-primary)', marginBottom: 'var(--spacing-sm)' }}>
                  {selectedGuide.title}
                </h2>
        </div>
        
              <p style={{ 
                color: 'var(--text-secondary)', 
                lineHeight: 1.6, 
                marginBottom: 'var(--spacing-lg)',
                fontSize: '1.1rem'
              }}>
                {selectedGuide.content}
              </p>
              
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
                  💡 Pro Tips:
                </h3>
                <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1.5rem' }}>
                  {selectedGuide.tips.map((tip, index) => (
                    <motion.li 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      style={{ marginBottom: '0.5rem' }}
                    >
                      {tip}
                    </motion.li>
                  ))}
          </ul>
    </div>

              <motion.button
                className="btn-primary"
                onClick={() => setSelectedGuide(null)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Got it! ✨
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// 💝 Feedback - Beautiful Feedback Form
const Feedback = ({ user }) => {
  const [feedback, setFeedback] = useState({
    type: 'general',
    rating: 5,
    subject: '',
    message: '',
    email: user?.email || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const feedbackTypes = [
    { value: 'general', label: '💬 General Feedback', icon: '💬' },
    { value: 'bug', label: '🐛 Bug Report', icon: '🐛' },
    { value: 'feature', label: '✨ Feature Request', icon: '✨' },
    { value: 'improvement', label: '🚀 Improvement Idea', icon: '🚀' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/feedback', {
        method: 'POST',
          headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: user.user_id,
          feedback_type: feedback.type,
          rating: feedback.rating,
          subject: feedback.subject,
          message: feedback.message,
          email: feedback.email
        })
      });
      
      if (response.ok) {
        toast.success('Thank you for your feedback! We appreciate your input! 🙏', {
          icon: '💝',
          duration: 5000,
          style: {
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))',
            color: '#fff',
          },
        });
        setIsSubmitted(true);
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div 
        className="feedback-success"
        variants={pageVariants}
        initial="initial"
        animate="in"
        exit="out"
        transition={pageTransition}
        style={{
          padding: 'var(--spacing-xl)',
          textAlign: 'center', 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh'
        }}
      >
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ fontSize: '5rem', marginBottom: 'var(--spacing-lg)' }}
        >
          🎉
        </motion.div>
        
        <h1 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-brand-primary)' }}>
          Thank You!
        </h1>
        
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '1.2rem',
          marginBottom: 'var(--spacing-lg)',
          maxWidth: '500px'
        }}>
          Your feedback helps us make M even better for everyone. We'll review your suggestions and get back to you soon!
        </p>
        
        <motion.button
            className="btn-primary"
          onClick={() => {
            setIsSubmitted(false);
            setFeedback({
              type: 'general',
              rating: 5,
              subject: '',
              message: '',
              email: user?.email || ''
            });
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ maxWidth: '200px' }}
        >
          Send More Feedback
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="feedback-container"
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      transition={pageTransition}
      style={{ padding: 'var(--spacing-xl)', maxWidth: '800px', margin: '0 auto' }}
    >
      <motion.div 
        className="page-header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="sparkle" style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '1rem' }}>
          We'd Love Your Feedback! 💝
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '1.2rem', 
          textAlign: 'center',
          marginBottom: '3rem' 
        }}>
          Help us improve M and make it even more amazing for everyone
        </p>
      </motion.div>

      <motion.div 
        className="feedback-form glass-card"
        style={{ padding: 'var(--spacing-2xl)' }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label style={{ marginBottom: 'var(--spacing-md)', display: 'block' }}>
              What type of feedback is this?
            </label>
                <div style={{
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--spacing-sm)'
            }}>
              {feedbackTypes.map((type) => (
                <motion.label
                  key={type.value}
                  className={`feedback-type-option ${feedback.type === type.value ? 'active' : ''}`}
                  style={{
                  display: 'flex',
                  alignItems: 'center',
                    padding: 'var(--spacing-md)',
                    border: feedback.type === type.value 
                      ? '2px solid var(--color-brand-primary)' 
                      : '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                    background: feedback.type === type.value 
                      ? 'var(--bg-surface)' 
                      : 'transparent',
                    transition: 'all var(--duration-normal)'
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <input
                    type="radio"
                    name="type"
                    value={type.value}
                    checked={feedback.type === type.value}
                    onChange={(e) => setFeedback({...feedback, type: e.target.value})}
                    style={{ display: 'none' }}
                  />
                  <span style={{ marginRight: '0.5rem', fontSize: '1.2rem' }}>
                    {type.icon}
                  </span>
                  {type.label.replace(/^.+?\s/, '')}
                </motion.label>
            ))}
          </div>
        </div>
        
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label>How would you rate your experience with M?</label>
            <div style={{ 
              display: 'flex', 
              gap: 'var(--spacing-sm)', 
              marginTop: 'var(--spacing-sm)',
              justifyContent: 'center'
            }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  type="button"
                  onClick={() => setFeedback({...feedback, rating: star})}
            style={{
                    background: 'none',
              border: 'none',
                    fontSize: '2rem',
                    cursor: 'pointer',
                    color: star <= feedback.rating ? '#FFD700' : 'var(--text-muted)'
                  }}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ⭐
                </motion.button>
                    ))}
                  </div>
              </div>

          <div className="form-group">
            <label>Subject</label>
            <input
              type="text"
              placeholder="Brief summary of your feedback"
              value={feedback.subject}
              onChange={(e) => setFeedback({...feedback, subject: e.target.value})}
              required
            />
      </div>

          <div className="form-group">
            <label>Your Feedback</label>
          <textarea
              placeholder="Tell us what you think! We're all ears... 👂"
              value={feedback.message}
              onChange={(e) => setFeedback({...feedback, message: e.target.value})}
              rows={6}
              required
              style={{ minHeight: '150px' }}
          />
        </div>

          <div className="form-group">
            <label>Email (optional)</label>
            <input
              type="email"
              placeholder="If you'd like us to follow up with you"
              value={feedback.email}
              onChange={(e) => setFeedback({...feedback, email: e.target.value})}
            />
        </div>

          <motion.button
          type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          style={{
              marginTop: 'var(--spacing-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-sm)'
            }}
          >
            {isSubmitting ? (
              <>
                <div className="loading-spinner" />
                Sending...
              </>
            ) : (
              <>
                Send Feedback
                <span style={{ fontSize: '1.2rem' }}>💝</span>
              </>
            )}
          </motion.button>
      </form>
      </motion.div>
    </motion.div>
  );
};

// 📊 Stunning Dashboard
const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    totalChats: 0,
    totalMessages: 0,
    currentStreak: 0,
    personalityScore: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/analytics/${user.user_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Use mock data for demo
      setTimeout(() => {
        setStats({
          totalChats: 15,
          totalMessages: 247,
          currentStreak: 7,
          personalityScore: 85
        });
      }, 1000);
    } finally {
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  const statCards = [
    {
      title: 'Total Conversations',
      value: stats.totalChats,
      icon: FiMessageCircle,
      color: '#8B5CF6',
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)',
      shadowColor: 'rgba(139, 92, 246, 0.3)'
    },
    {
      title: 'Messages Exchanged',
      value: stats.totalMessages,
      icon: FiTrendingUp,
      color: '#10B981',
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
      shadowColor: 'rgba(16, 185, 129, 0.3)'
    },
    {
      title: 'Current Streak',
      value: stats.currentStreak,
      icon: FiClock,
      color: '#F59E0B',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)',
      shadowColor: 'rgba(245, 158, 11, 0.3)'
    },
    {
      title: 'Growth Score',
      value: stats.personalityScore,
      icon: FiStar,
      color: '#EF4444',
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)',
      shadowColor: 'rgba(239, 68, 68, 0.3)'
    }
  ];

  return (
    <motion.div 
      className="dashboard"
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      transition={pageTransition}
    >
      <motion.div 
        className="dashboard-header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="sparkle">Welcome back, {user?.username}!</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '2rem' }}>
          Track your personal growth journey with AI-powered insights
        </p>
      </motion.div>

      <motion.div 
        className="dashboard-grid"
        variants={staggerChildren}
        initial="initial"
        animate="animate"
      >
                {statCards.map((card, index) => (
          <motion.div
            key={card.title}
            className="stat-card gradient-card"
            variants={slideInVariant}
            whileHover={{ 
              scale: 1.02,
              boxShadow: `0 12px 30px ${card.shadowColor}, 0 6px 15px rgba(0,0,0,0.1)`
            }}
            style={{
              background: card.gradient,
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: `0 10px 30px ${card.shadowColor}, 0 4px 16px rgba(0,0,0,0.1)`
            }}
          >
            {/* Floating Icon in top right */}
            <motion.div
            style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                opacity: 0.4,
                color: 'rgba(255, 255, 255, 0.8)'
              }}
              whileHover={{ 
                opacity: 0.7,
                rotate: 5,
                scale: 1.05
              }}
            >
              <card.icon size={28} />
            </motion.div>
            
            {/* Main Content */}
            <div style={{ 
              padding: '2rem 1.5rem 1.5rem', 
              position: 'relative', 
              zIndex: 2,
              textAlign: 'left'
            }}>
              <h3 style={{ 
                fontSize: '3rem', 
                fontWeight: '800', 
                marginBottom: '0.5rem',
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                {isLoading ? (
                  <Skeleton width={80} height={40} baseColor="rgba(255,255,255,0.2)" highlightColor="rgba(255,255,255,0.3)" />
                ) : (
                  <CountUp 
                    end={card.value} 
                    duration={2} 
                    delay={index * 0.2}
                    suffix={card.title === 'Growth Score' ? '%' : ''}
                  />
                )}
              </h3>
              <p style={{ 
                fontSize: '1.1rem',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.9)',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                lineHeight: '1.3'
              }}>
                {card.title}
              </p>
        </div>
            
            {/* Animated Shimmer Effect */}
                        <motion.div
              style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
                pointerEvents: 'none',
                zIndex: 1
              }}
              animate={{
                left: ['100%', '-100%']
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                delay: index * 2,
                ease: "linear"
              }}
            />
            
            {/* Subtle Pattern Overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
              pointerEvents: 'none',
              zIndex: 0
            }} />
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        style={{
          marginTop: '3rem',
            textAlign: 'center',
          padding: '2rem',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-backdrop)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-xl)',
        }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        whileHover={{ scale: 1.02 }}
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <FiHeart size={48} style={{ color: 'var(--color-brand-primary)', marginBottom: '1rem' }} />
        </motion.div>
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Keep Growing! 🌱
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Your journey of self-discovery is just beginning. Every conversation brings new insights!
        </p>
      </motion.div>
    </motion.div>
  );
};

// 🎮 Mobile Hamburger Button
const HamburgerButton = ({ isOpen, onClick }) => (
  <motion.button
    onClick={onClick}
    style={{
      position: 'fixed',
      top: '1rem',
      left: '1rem',
      zIndex: 1100,
      background: 'var(--glass-bg)',
      backdropFilter: 'var(--glass-backdrop)',
      border: '1px solid var(--glass-border)',
      borderRadius: '12px',
      padding: '12px',
      color: 'var(--text-primary)',
      cursor: 'pointer',
      display: window.innerWidth <= 768 ? 'block' : 'none'
    }}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    <motion.div
      animate={{ rotate: isOpen ? 45 : 0 }}
      transition={{ duration: 0.3 }}
    >
      {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
    </motion.div>
  </motion.button>
);

// 🚀 Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionUpdateTrigger, setSessionUpdateTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [particlesInit, setParticlesInit] = useState(false);

  // Initialize particles
  const particlesLoaded = useCallback(async (container) => {
    console.log("Particles loaded:", container);
  }, []);

  const initParticles = useCallback(async (engine) => {
    await loadSlim(engine);
    setParticlesInit(true);
  }, []);

  // Initialize error suppression for ResizeObserver
  useEffect(() => {
    suppressResizeObserverError();
  }, []);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Login handler
  const handleLogin = (userData) => {
    setIsLoading(true);
    
    // For demo purposes, create a fake token if none exists
    if (!localStorage.getItem('token') && userData.user_id === 'demo_user_123') {
      localStorage.setItem('token', 'demo_jwt_token_for_testing');
    }
    
    setTimeout(() => {
        setUser(userData);
      setCurrentPage('dashboard'); // Redirect to dashboard after login
      setIsLoading(false);
      toast.success(`Welcome${userData.username ? `, ${userData.username}` : ''}! 🎉`, {
        icon: '🚀',
        duration: 4000,
        style: {
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #8E66FF, #6B46C1)',
          color: '#fff',
        },
      });
    }, 1500);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/logout', {
        method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
      });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local data regardless of API call success
    localStorage.removeItem('token');
    setUser(null);
    setCurrentPage('chat');
    setSelectedSessionId(null);
      
      toast.success('Goodbye! See you soon! 👋', {
        icon: '👋',
        style: {
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #EF4444, #DC2626)',
          color: '#fff',
        },
      });
    }
  };

  // Enhanced Session handlers with proper session management
  const handleSelectSession = (sessionId) => {
    // Store reference to previous session if it exists
    const previousSession = selectedSessionId;
    
    // Switch to new session
    setSelectedSessionId(sessionId);
    
    // Ensure we're on the chat page
    if (currentPage !== 'chat') {
      setCurrentPage('chat');
    }
    
    // Log session switch for debugging
    if (previousSession && previousSession !== sessionId) {
      console.log(`Switched from session ${previousSession} to ${sessionId}`);
    }
  };

  const handleStartNewChat = () => {
    // Store reference to previous session for potential auto-save
    const previousSession = selectedSessionId;
    
    // Clear current session to start fresh
    setSelectedSessionId(null);
    
    // Ensure we're on the chat page
    if (currentPage !== 'chat') {
      setCurrentPage('chat');
    }
    
    // Log new chat start for debugging
    if (previousSession) {
      console.log(`Started new chat, previous session: ${previousSession}`);
    }
  };

  const handleSessionUpdate = () => {
    setSessionUpdateTrigger(prev => prev + 1);
  };

  // Render appropriate page
  const renderPage = () => {
    const pageProps = {
      key: currentPage,
      variants: pageVariants,
      initial: "initial",
      animate: "in",
      exit: "out",
      transition: pageTransition
    };

    switch (currentPage) {
      case 'chat':
        return (
          <ChatInterface
            user={user}
            selectedSessionId={selectedSessionId}
            onSessionUpdate={handleSessionUpdate}
          />
        );
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'using-m':
        return <UsingM user={user} />;
      case 'feedback':
        return <Feedback user={user} />;
      case 'profile':
        return (
          <motion.div {...pageProps}>
            <EnhancedProfile user={user} />
          </motion.div>
        );
      default:
        return <Dashboard user={user} />;
    }
  };

  if (!user) {
    return (
      <>
        {/* Particle Background */}
        {particlesInit && (
          <Particles
            id="tsparticles"
            init={initParticles}
            loaded={particlesLoaded}
            options={particlesConfig}
            className="particles-bg"
          />
        )}
        
        {/* Login Screen */}
        <StunningLogin onLogin={handleLogin} isLoading={isLoading} />
        
        {/* Toast Notifications */}
        <Toaster 
          position="top-center"
          reverseOrder={false}
          gutter={8}
          containerStyle={{
            top: 20,
          }}
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-backdrop)',
              border: '1px solid var(--glass-border)',
              borderRadius: '12px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: '500',
            },
          }}
        />
      </>
    );
  }

  return (
    <div className="app">
      {/* Particle Background */}
      {particlesInit && (
        <Particles
          id="tsparticles"
          init={initParticles}
          loaded={particlesLoaded}
          options={particlesConfig}
          className="particles-bg"
        />
      )}

      {/* Mobile Hamburger */}
      <HamburgerButton 
        isOpen={isSidebarOpen} 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
      />

      {/* Navigation Sidebar */}
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

      {/* Main Content Area */}
      <main className={`main-content${!isSidebarOpen ? ' full' : ''}`}>
        <AnimatePresence mode="wait">
          {renderPage()}
        </AnimatePresence>
      </main>

      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerStyle={{
          top: 20,
          right: 20,
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-backdrop)',
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: 'var(--shadow-large)',
          },
        }}
      />
    </div>
  );
}

export default App;