from flask import Flask, request, jsonify, redirect, url_for, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
import logging
from authlib.integrations.flask_client import OAuth
import json
import requests
import uuid
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
import numpy as np
from flask_session import Session
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import hashlib
import secrets
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import time
import ipaddress
from functools import wraps
from sqlalchemy import func

# Import models
from models import db, User, ChatMessage, TrainingData, UserProfile, UserPreferences, ChatSession, Feedback, ChatSummary, UserAnalytics

# Import NLP module
from nlp_module import EmotionAnalyzer, ResponseGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables in development
if os.getenv('FLASK_ENV') != 'production':
    load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', '9fd7f05d817e0bfe6a1662f004f0cbd0')
app.config['SESSION_COOKIE_SECURE'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_FILE_DIR'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'flask_session')
Session(app)

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'super-secret-key')
jwt = JWTManager(app)

# Configure CORS with credentials
CORS(app, 
     supports_credentials=True,
     origins=["https://salman1205.github.io", "http://localhost:3000"],
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)

# Configure database - Always try to use database first
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    DATABASE_URL = 'sqlite:///mbot.db'  # Use SQLite as fallback

USE_DATABASE = True
IS_VERCEL = os.getenv('VERCEL_ENV') == 'production'

try:
    if DATABASE_URL.startswith('mysql://'):
        DATABASE_URL = DATABASE_URL.replace('mysql://', 'mysql+pymysql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'pool_size': 5,
        'max_overflow': 10,
        'pool_timeout': 30,
        'echo': False
    }
    db.init_app(app)
    with app.app_context():
        db.create_all()
        USE_DATABASE = True
        logger.info("Database initialized successfully")
except Exception as e:
    logger.error(f"Database initialization failed: {str(e)}")
    USE_DATABASE = False

# In-memory storage fallback (only if database fails)
users = {}
messages = []
chat_sessions = {}
chat_summaries = {}

# Configure OAuth
oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID', 'dummy-client-id'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET', 'dummy-client-secret'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile',
        'prompt': 'select_account'
    }
)

# Groq Configuration - Fixed initialization
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
if not GROQ_API_KEY:
    logger.warning("GROQ_API_KEY not found, using fallback responses")

MODEL_NAME = "llama-3.3-70b-versatile"
client = None
emotion_analyzer = None
response_generator = None

# Initialize Groq client with better error handling
try:
    if GROQ_API_KEY:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        logger.info("Successfully initialized Groq client")
        
        # Initialize NLP components
        emotion_analyzer = EmotionAnalyzer(client)
        response_generator = ResponseGenerator(client, emotion_analyzer)
        logger.info("Successfully initialized NLP components")
    else:
        logger.warning("GROQ_API_KEY not set, using fallback responses")
except Exception as e:
    logger.error(f"Failed to initialize Groq client: {str(e)}")
    client = None

def hash_password(password):
    """Hash password with salt"""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return salt + pwd_hash.hex()

def verify_password(stored_password, provided_password):
    """Verify password against hash"""
    salt = stored_password[:32]
    stored_hash = stored_password[32:]
    pwd_hash = hashlib.pbkdf2_hmac('sha256', provided_password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return pwd_hash.hex() == stored_hash

def generate_uuid():
    return str(uuid.uuid4())

def get_user_data(user_id):
    if not user_id:
        return None

    if USE_DATABASE:
        try:
            with app.app_context():
                user = User.query.filter_by(user_id=user_id).first()
                if not user:
                    return None
                profile = UserProfile.query.filter_by(user_id=user_id).first()
                if not profile:
                    profile = UserProfile()
                    profile.profile_id = generate_uuid()
                    profile.user_id = user_id
                    profile.screen_name = user.email.split('@')[0] if user.email else 'User'
                    db.session.add(profile)
                    db.session.commit()
                preferences = UserPreferences.query.filter_by(user_id=user_id).first()
                if not preferences:
                    preferences = UserPreferences()
                    preferences.preference_id = generate_uuid()
                    preferences.user_id = user_id
                    preferences.preferred_response_length = 'medium'
                    preferences.preferred_communication_style = 'empathetic'
                    db.session.add(preferences)
                    db.session.commit()
                user_data = user.to_dict()
                user_data.update(profile.to_dict())
                user_data.update(preferences.to_dict())
                return user_data
        except Exception as e:
            logger.error(f"Database error getting user data: {str(e)}")
            # Fallback to file-based users if DB fails
    # Fallback: read from local_users.json
    users = read_local_users()
    for user in users.values():
        if user.get('user_id') == user_id:
            return user
    return None

def get_conversation_history(user_id, session_id=None):
    """Get conversation history"""
    if USE_DATABASE:
        try:
            with app.app_context():
                if session_id:
                    db_messages = ChatMessage.query.filter_by(
                        session_id=session_id
                    ).order_by(ChatMessage.timestamp.asc()).all()
                else:
                    active_session = ChatSession.query.filter_by(
                        user_id=user_id, status='active'
                    ).first()
                    if active_session:
                        db_messages = ChatMessage.query.filter_by(
                            session_id=active_session.session_id
                        ).order_by(ChatMessage.timestamp.asc()).all()
                    else:
                        return []
                return [msg.to_dict() for msg in db_messages]
        except Exception as e:
            logger.error(f"Database error getting conversation history: {str(e)}")
            return [msg for msg in messages if msg.get('user_id') == user_id]
    return [msg for msg in messages if msg.get('user_id') == user_id]

def store_message(message_data):
    """Store message in database or memory"""
    if USE_DATABASE:
        try:
            with app.app_context():
                new_message = ChatMessage(**message_data)
                db.session.add(new_message)
                db.session.commit()
                return new_message.to_dict()
        except Exception as e:
            logger.error(f"Database error storing message: {str(e)}")
            messages.append(message_data)
            return message_data
    else:
        messages.append(message_data)
        return message_data

def get_ai_response(message_text, user_data, conversation_history=[]):
    """Enhanced AI response generation with better fallbacks"""
    try:
        name = user_data.get('screen_name', user_data.get('name', 'friend'))
        
        # Use GROQ if available
        if client and response_generator:
            try:
                # Convert history to proper format for response generator
                formatted_history = []
                for i in range(0, len(conversation_history), 2):
                    if i + 1 < len(conversation_history):
                        formatted_history.append({
                            'user': conversation_history[i].get('message_text', ''),
                            'bot': conversation_history[i + 1].get('message_text', '')
                        })
                
                response_data = response_generator.generate_response(
                    message_text,
                    user_data,
                    formatted_history
                )
                return response_data['response']
                
            except Exception as e:
                logger.error(f"GROQ response generation failed: {str(e)}")
                # Fall through to simple responses
        
        # Enhanced fallback responses with personalization
        return generate_enhanced_fallback_response(message_text, user_data)
        
    except Exception as e:
        logger.error(f"Error generating AI response: {str(e)}")
        return f"I hear you, {user_data.get('screen_name', 'friend')}. I'm here to support you. Could you tell me more about how you're feeling?"

def generate_enhanced_fallback_response(message_text, user_data):
    """Generate enhanced fallback responses with personalization"""
    name = user_data.get('screen_name', user_data.get('name', 'friend'))
    pronouns = user_data.get('pronouns', '')
    identity_goals = user_data.get('identity_goals', '')
    focus_area = user_data.get('focus_area', '')
    
    message_lower = message_text.lower()
    
    # Personalized responses based on content
    if any(word in message_lower for word in ['hello', 'hi', 'hey']):
        responses = [
            f"Hello {name}! I'm M, your identity mentor. How are you feeling today?",
            f"Hi {name}! I'm so glad you're here. What would you like to explore today?",
            f"Hey {name}! This is your safe space. What's on your mind?"
        ]
    elif any(word in message_lower for word in ['affirm who i am', 'identity', 'who am i']):
        responses = [
            f"Exploring your identity is such a brave journey, {name}. What aspects of yourself feel most authentic to you right now?",
            f"Identity exploration takes courage, {name}. {f'Given your focus on {focus_area}, ' if focus_area else ''}what feels true about who you are?",
            f"Your authentic self matters, {name}. What part of your identity would you like to affirm today?"
        ]
    elif any(word in message_lower for word in ['sad', 'depressed', 'down', 'feeling sad']):
        responses = [
            f"I hear that you're feeling sad, {name}. Those feelings are completely valid. What's been weighing on your heart?",
            f"Thank you for sharing that with me, {name}. Sadness can feel heavy. Would you like to talk about what's contributing to these feelings?",
            f"I'm here with you in this difficult moment, {name}. What would feel most supportive right now?"
        ]
    elif any(word in message_lower for word in ['anxious', 'worried', 'anxiety', 'stress']):
        responses = [
            f"Anxiety can feel overwhelming, {name}. You're not alone in this. What's been causing you the most worry lately?",
            f"I understand you're feeling anxious, {name}. Would you like to try a grounding technique together, or would you prefer to talk about what's on your mind?",
            f"Thank you for trusting me with your anxiety, {name}. What thoughts have been racing through your mind?"
        ]
    elif any(word in message_lower for word in ['gender', 'pronouns', 'expression']):
        pronoun_text = f" I see you use {pronouns} pronouns" if pronouns else ""
        responses = [
            f"Gender expression is such a personal journey, {name}.{pronoun_text}. How would you like to explore this today?",
            f"Your gender identity is valid, {name}. What feels most authentic about your gender expression?",
            f"Thank you for trusting me with this part of your identity, {name}. What aspects of gender feel most important to you?"
        ]
    elif any(word in message_lower for word in ['support', 'well-being', 'help']):
        responses = [
            f"I'm here to support you, {name}. {f'I know {focus_area} is important to you. ' if focus_area else ''}What kind of support would be most helpful today?",
            f"Your well-being matters deeply, {name}. What area of your life would you like to focus on?",
            f"You deserve support and care, {name}. How can I best help you right now?"
        ]
    elif any(word in message_lower for word in ['spiritual', 'growth', 'meaning']):
        responses = [
            f"Spiritual growth is a beautiful part of the human experience, {name}. What's calling to your spirit lately?",
            f"The search for meaning is so important, {name}. What gives your life a sense of purpose?",
            f"Your spiritual journey is uniquely yours, {name}. What practices or beliefs bring you peace?"
        ]
    elif any(word in message_lower for word in ['relationship', 'family', 'friends']):
        responses = [
            f"Relationships can be complex, {name}. What's been on your mind about your connections with others?",
            f"Thank you for sharing about your relationships, {name}. How do others respond when you express your authentic self?",
            f"The people in our lives shape our journey, {name}. What relationship dynamics would you like to explore?"
        ]
    else:
        # General supportive responses
        responses = [
            f"Thank you for sharing that with me, {name}. I'm here to listen and support you. What feels most important to talk about right now?",
            f"I hear you, {name}. {f'Given your focus on {focus_area}, ' if focus_area else ''}how are you feeling about everything?",
            f"Your thoughts and feelings matter, {name}. What would be most helpful to explore together today?",
            f"I'm glad you're here, {name}. This is your safe space to share whatever is on your mind."
        ]
    
    import random
    return random.choice(responses)

# Rate limiting storage (in production, use Redis)
rate_limit_storage = {}
failed_login_attempts = {}

# Security Configuration
RATE_LIMIT_REQUESTS = 100  # requests per window
RATE_LIMIT_WINDOW = 3600   # 1 hour in seconds
MAX_LOGIN_ATTEMPTS = 5     # max failed attempts
LOGIN_LOCKOUT_TIME = 900   # 15 minutes in seconds

def get_client_ip():
    """Get the real client IP address"""
    if request.headers.getlist("X-Forwarded-For"):
        ip = request.headers.getlist("X-Forwarded-For")[0]
    else:
        ip = request.remote_addr
    return ip

def is_valid_ip(ip):
    """Validate IP address format"""
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False

def rate_limit_decorator(f):
    """Rate limiting decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        client_ip = get_client_ip()
        if not is_valid_ip(client_ip):
            client_ip = "unknown"
        current_time = time.time()
        # Clean old entries
        if client_ip in rate_limit_storage:
            rate_limit_storage[client_ip] = [
                timestamp for timestamp in rate_limit_storage[client_ip]
                if current_time - timestamp < RATE_LIMIT_WINDOW
            ]
        else:
            rate_limit_storage[client_ip] = []
        # Check rate limit
        if len(rate_limit_storage[client_ip]) >= RATE_LIMIT_REQUESTS:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return jsonify({
                'error': 'Rate limit exceeded. Please try again later.',
                'retry_after': RATE_LIMIT_WINDOW
            }), 429
        # Add current request
        rate_limit_storage[client_ip].append(current_time)
        return f(*args, **kwargs)
    return decorated_function

def check_login_attempts(email, client_ip):
    """Check if login attempts are within limits"""
    current_time = time.time()
    key = f"{email}:{client_ip}"
    if key in failed_login_attempts:
        attempts = failed_login_attempts[key]
        # Remove old attempts
        attempts['timestamps'] = [
            timestamp for timestamp in attempts['timestamps']
            if current_time - timestamp < LOGIN_LOCKOUT_TIME
        ]
        if len(attempts['timestamps']) >= MAX_LOGIN_ATTEMPTS:
            return False, LOGIN_LOCKOUT_TIME - (current_time - min(attempts['timestamps']))
    return True, 0

def record_failed_login(email, client_ip):
    """Record a failed login attempt"""
    current_time = time.time()
    key = f"{email}:{client_ip}"
    if key not in failed_login_attempts:
        failed_login_attempts[key] = {'timestamps': []}
    failed_login_attempts[key]['timestamps'].append(current_time)

def clear_failed_login_attempts(email, client_ip):
    """Clear failed login attempts after successful login"""
    key = f"{email}:{client_ip}"
    if key in failed_login_attempts:
        del failed_login_attempts[key]

# Enhanced JWT token validation
def enhanced_jwt_required(f):
    """Enhanced JWT validation with additional security checks"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Get token from header
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Token missing or invalid format'}), 401
            token = auth_header.split(' ')[1]
            # Validate token format
            if not token or len(token) < 10:
                return jsonify({'error': 'Invalid token format'}), 401
            # Check if token is blacklisted (in production, use Redis)
            # For now, we'll skip this but it's important for production
            # Verify JWT token
            from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
            verify_jwt_in_request()
            # Get JWT claims
            claims = get_jwt()
            # Check token expiration
            if claims.get('exp', 0) < time.time():
                return jsonify({'error': 'Token has expired'}), 401
            # Additional security checks
            client_ip = get_client_ip()
            user_agent = request.headers.get('User-Agent', '')
            # Log security event
            logger.info(f"API access: user_id={get_jwt_identity()}, ip={client_ip}, endpoint={request.endpoint}")
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"JWT validation error: {str(e)}")
            return jsonify({'error': 'Invalid or expired token'}), 401
    return decorated_function

# Input validation helpers
def validate_email(email):
    """Validate email format"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def sanitize_input(text, max_length=1000):
    """Sanitize text input"""
    if not text:
        return ""
    # Remove potentially dangerous characters
    import re
    text = re.sub(r'[<>"\']', '', str(text))
    # Limit length
    return text[:max_length].strip()

# Security headers middleware
@app.after_request
def add_security_headers(response):
    """Add security headers to all responses"""
    # Prevent clickjacking
    response.headers['X-Frame-Options'] = 'DENY'
    # Prevent MIME type sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'
    # XSS Protection
    response.headers['X-XSS-Protection'] = '1; mode=block'
    # Strict Transport Security (HTTPS only)
    if request.is_secure:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    # Content Security Policy
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://accounts.google.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://accounts.google.com; "
        "frame-src https://accounts.google.com"
    )
    # Referrer Policy
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response

# Error handlers for security
@app.errorhandler(429)
def rate_limit_handler(e):
    return jsonify({
        'error': 'Rate limit exceeded',
        'message': 'Too many requests. Please try again later.'
    }), 429

@app.errorhandler(401)
def unauthorized_handler(e):
    return jsonify({
        'error': 'Unauthorized',
        'message': 'Authentication required'
    }), 401

# API Routes

@app.route('/api/user')
@enhanced_jwt_required
def get_current_user_secure():
    user_id = get_jwt_identity()
    client_ip = get_client_ip()
    user_data = get_user_data(user_id)
    if not user_data:
        logger.warning(f"User data not found for user_id: {user_id} from IP: {client_ip}")
        return jsonify({'error': 'User not found'}), 404
    # Remove sensitive information
    safe_user_data = {k: v for k, v in user_data.items() if k not in ['password_hash', 'password']}
    return jsonify(safe_user_data)

LOCAL_USERS_FILE = os.path.join(os.path.dirname(__file__), 'local_users.json')

def read_local_users():
    if not os.path.exists(LOCAL_USERS_FILE):
        return {}
    with open(LOCAL_USERS_FILE, 'r') as f:
        try:
            return json.load(f)
        except Exception:
            return {}

def write_local_users(users):
    with open(LOCAL_USERS_FILE, 'w') as f:
        json.dump(users, f)

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        name = data.get('name', email.split('@')[0] if email else 'User')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        if USE_DATABASE:
            with app.app_context():
                # Check if user already exists
                existing_user = User.query.filter_by(email=email).first()
                if existing_user:
                    return jsonify({'error': 'User already exists'}), 400

                # Create new user
                user_id = generate_uuid()
                hashed_password = hash_password(password)
                
                user = User()
                user.user_id = user_id
                user.email = email
                user.password_hash = hashed_password
                user.auth_method = 'email'
                user.is_verified = True
                db.session.add(user)
                
                # Create profile
                profile = UserProfile()
                profile.profile_id = generate_uuid()
                profile.user_id = user_id
                profile.screen_name = name
                db.session.add(profile)
                
                # Create preferences
                preferences = UserPreferences()
                preferences.preference_id = generate_uuid()
                preferences.user_id = user_id
                preferences.preferred_response_length = 'medium'
                db.session.add(preferences)
                
                db.session.commit()
        else:
            # File-based fallback
            users = read_local_users()
            if email in users:
                return jsonify({'error': 'User already exists'}), 400
            user_id = generate_uuid()
            users[email] = {
                'user_id': user_id,
                'email': email,
                'password_hash': hash_password(password),
                'name': name,
                'screen_name': name,
                'created_at': datetime.utcnow().isoformat(),
                'is_verified': True,
                'auth_method': 'email'
            }
            write_local_users(users)

        access_token = create_access_token(identity=user_id)
        return jsonify({
            'access_token': access_token, 
            'user_id': user_id,
            'message': 'Account created successfully'
        })
        
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        return jsonify({'error': 'An error occurred during signup'}), 500

@app.route('/api/login', methods=['POST'])
@rate_limit_decorator
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        if USE_DATABASE:
            with app.app_context():
                user = User.query.filter_by(email=email).first()
                if not user:
                    return jsonify({'error': 'Invalid email or password'}), 401
                if not verify_password(user.password_hash, password):
                    return jsonify({'error': 'Invalid email or password'}), 401
                access_token = create_access_token(identity=user.user_id)
                return jsonify({
                    'access_token': access_token,
                    'user_id': user.user_id,
                    'email': user.email,
                    'name': user.name,
                    'screen_name': user.screen_name,
                    'message': 'Login successful'
                })
        else:
            users = read_local_users()
            user = users.get(email)
            if not user or not user.get('password_hash'):
                return jsonify({'error': 'Invalid email or password'}), 401
            if not verify_password(user['password_hash'], password):
                return jsonify({'error': 'Invalid email or password'}), 401
            access_token = create_access_token(identity=user['user_id'])
            return jsonify({
                'access_token': access_token,
                'user_id': user['user_id'],
                'email': user['email'],
                'name': user['name'],
                'screen_name': user['screen_name'],
                'message': 'Login successful'
            })
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'An error occurred during login'}), 500

@app.route('/api/google-login', methods=['POST'])
def google_login():
    try:
        data = request.get_json()
        google_token = data.get('token')
        user_info = data.get('user_info', {})
        
        if not google_token:
            return jsonify({'error': 'Google token required'}), 400
        
        # Verify token with Google (if GOOGLE_CLIENT_ID is set)
        google_client_id = os.getenv('GOOGLE_CLIENT_ID')
        verified_user_info = user_info  # Default to provided info
        
        if google_client_id:
            try:
                # Verify the token with Google
                idinfo = id_token.verify_oauth2_token(
                    google_token, 
                    google_requests.Request(), 
                    google_client_id
                )
                
                if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                    raise ValueError('Wrong issuer.')
                
                # Use verified info
                verified_user_info = {
                    'email': idinfo.get('email'),
                    'name': idinfo.get('name'),
                    'picture': idinfo.get('picture'),
                    'given_name': idinfo.get('given_name'),
                    'family_name': idinfo.get('family_name'),
                    'email_verified': idinfo.get('email_verified', False)
                }
                
            except ValueError as e:
                logger.warning(f"Google token verification failed: {str(e)}")
                # Fall back to provided user info for development
                if not google_client_id.startswith('your-'):
                    return jsonify({'error': 'Invalid Google token'}), 401
        
        email = verified_user_info.get('email')
        name = verified_user_info.get('name', email.split('@')[0] if email else 'User')
        profile_picture = verified_user_info.get('picture')
        
        if not email:
            return jsonify({'error': 'Invalid Google token - no email'}), 401

        if USE_DATABASE:
            with app.app_context():
                user = User.query.filter_by(email=email).first()
                if not user:
                    # Create new user from Google
                    user_id = generate_uuid()
                    user = User()
                    user.user_id = user_id
                    user.email = email
                    user.password_hash = ''  # No password for OAuth users
                    user.auth_method = 'oauth'
                    user.is_verified = verified_user_info.get('email_verified', True)
                    db.session.add(user)
                    
                    # Create profile with Google info
                    profile = UserProfile()
                    profile.profile_id = generate_uuid()
                    profile.user_id = user_id
                    profile.screen_name = name
                    db.session.add(profile)
                    
                    # Create preferences
                    preferences = UserPreferences()
                    preferences.preference_id = generate_uuid()
                    preferences.user_id = user_id
                    preferences.preferred_response_length = 'medium'
                    db.session.add(preferences)
                    
                    db.session.commit()
                else:
                    # Update last login and profile picture if provided
                    user.last_login = datetime.utcnow()
                    db.session.commit()
                
                user_id = user.user_id
        else:
            # In-memory storage fallback
            user_id = None
            for uid, user_data in users.items():
                if user_data.get('email') == email:
                    user_id = uid
                    break
            
            if not user_id:
                user_id = generate_uuid()
                users[user_id] = {
                    'user_id': user_id,
                    'email': email,
                    'name': name,
                    'screen_name': name,
                    'profile_picture': profile_picture,
                    'created_at': datetime.utcnow().isoformat(),
                    'is_verified': True,
                    'auth_method': 'oauth'
                }

        access_token = create_access_token(identity=user_id)
        return jsonify({
            'access_token': access_token, 
            'user_id': user_id,
            'email': email,
            'name': name,
            'profile_picture': profile_picture,
            'message': 'Google login successful'
        })
        
    except Exception as e:
        logger.error(f"Google login error: {str(e)}")
        return jsonify({'error': 'An error occurred during Google login'}), 500

@app.route('/api/logout', methods=['POST'])
@enhanced_jwt_required
def secure_logout():
    try:
        user_id = get_jwt_identity()
        client_ip = get_client_ip()
        # In production, add the token to a blacklist in Redis
        # For now, we'll just log the logout
        logger.info(f"User logout: user_id={user_id}, ip={client_ip}")
        # Clear server-side session if using
        session.clear()
        return jsonify({'message': 'Logged out successfully'})
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return jsonify({'error': 'Logout failed'}), 500

@app.route('/api/conversation/<user_id>')
@enhanced_jwt_required
def get_conversation(user_id):
    """Get conversation history and active session"""
    try:
        current_user_id = get_jwt_identity()
        if current_user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
            
        if USE_DATABASE:
            with app.app_context():
                active_session = ChatSession.query.filter_by(
                    user_id=user_id, status='active'
                ).first()
                
                session_id = active_session.session_id if active_session else None
                
                if session_id:
                    db_messages = ChatMessage.query.filter_by(
                        session_id=session_id
                    ).order_by(ChatMessage.timestamp.asc()).all()
                else:
                    db_messages = ChatMessage.query.join(ChatSession).filter(
                        ChatSession.user_id == user_id
                    ).order_by(ChatMessage.timestamp.desc()).limit(50).all()
                
                messages_data = []
                for msg in db_messages:
                    messages_data.append({
                        'id': msg.message_id,
                        'message_text': msg.message_text,
                        'sender': msg.sender,
                        'timestamp': msg.timestamp.isoformat(),
                        'sentiment_score': msg.sentiment_score
                    })
                
                return jsonify({
                    'messages': messages_data,
                    'sessionId': session_id
                })
        else:
            # In-memory fallback
            active_session_id = None
            for s_id, s_data in chat_sessions.items():
                if s_data.get('user_id') == user_id and s_data.get('status') == 'active':
                    active_session_id = s_id
                    break
            
            if active_session_id:
                user_messages = [msg for msg in messages if msg.get('session_id') == active_session_id]
            else:
                user_messages = [msg for msg in messages if msg.get('user_id') == user_id][-20:]
                
            formatted_messages = []
            for msg in user_messages:
                formatted_messages.append({
                    'id': msg.get('message_id', str(uuid.uuid4())),
                    'message_text': msg.get('message_text', ''),
                    'sender': msg.get('sender', 'user'),
                    'timestamp': msg.get('timestamp', datetime.utcnow().isoformat()),
                    'sentiment_score': msg.get('sentiment_score', 0.0)
                })
                
            return jsonify({
                'messages': formatted_messages,
                'sessionId': active_session_id
            })
            
    except Exception as e:
        logger.error(f"Error getting conversation: {str(e)}")
        return jsonify({
            'messages': [],
            'sessionId': None,
            'error': 'Failed to load conversation'
        }), 500

@app.route("/api/chat", methods=["POST"])
@enhanced_jwt_required
@rate_limit_decorator
def secure_api_chat():
    user_id = get_jwt_identity()
    data = request.get_json() if request.is_json else request.form
    message_text = data.get("message", "").strip()
    if not message_text:
        return jsonify({"error": "Message is required"}), 400
    # Sanitize input
    message_text = sanitize_input(message_text, 2000)
    if len(message_text) < 1:
        return jsonify({"error": "Message too short or contains invalid characters"}), 400
    
    try:
        user_data = get_user_data(user_id)
        if not user_data:
            return jsonify({
                "error": "User data not found",
                "response": "I apologize, but I'm having trouble accessing your profile information."
            }), 404

        if USE_DATABASE:
            with app.app_context():
                data = request.get_json()
                message_text = data.get('message')
                # Get or create active session
                active_session = ChatSession.query.filter_by(
                    user_id=user_id, status='active'
                ).first()
                
                if not active_session:
                    active_session = ChatSession()
                    active_session.session_id = generate_uuid()
                    active_session.user_id = user_id
                    active_session.chat_mode = 'mentor'
                    # Set title from request if provided, else use first message
                    active_session.title = data.get('title') or message_text[:60]
                    db.session.add(active_session)
                    db.session.commit()
                elif not active_session.title:
                    # Set title if not already set
                    active_session.title = data.get('title') or message_text[:60]
                    db.session.commit()
                
                # Analyze sentiment
                sentiment_score = 0.0
                if emotion_analyzer:
                    try:
                        analysis = emotion_analyzer.analyze_message(message_text)
                        sentiment_score = analysis.get('emotion_intensity', 0.0)
                    except Exception as e:
                        logger.error(f"Error in sentiment analysis: {str(e)}")
                
                # Store user message
                user_message = ChatMessage()
                user_message.message_id = generate_uuid()
                user_message.session_id = active_session.session_id
                user_message.user_id = user_id
                user_message.sender = 'user'
                user_message.message_text = message_text
                user_message.sentiment_score = sentiment_score
                db.session.add(user_message)
                
                # Get conversation history for context
                conversation_history = get_conversation_history(user_id, active_session.session_id)
                
                # Generate AI response
                response_text = get_ai_response(message_text, user_data, conversation_history)
                
                # Store bot message
                bot_message = ChatMessage()
                bot_message.message_id = generate_uuid()
                bot_message.session_id = active_session.session_id
                bot_message.user_id = user_id
                bot_message.sender = 'M'
                bot_message.message_text = response_text
                bot_message.sentiment_score = 0.0
                db.session.add(bot_message)
                db.session.commit()
                
                return jsonify({
                    "response": response_text,
                    "time": datetime.utcnow().strftime("%I:%M %p"),
                    "sentiment": sentiment_score,
                    "sessionId": active_session.session_id
                }), 200
        else:
            # In-memory handling
            active_session_id = None
            for s_id, s_data in chat_sessions.items():
                if s_data.get('user_id') == user_id and s_data.get('status') == 'active':
                    active_session_id = s_id
                    break
            
            if not active_session_id:
                active_session_id = generate_uuid()
                chat_sessions[active_session_id] = {
                    'session_id': active_session_id,
                    'user_id': user_id,
                    'chat_mode': 'mentor',
                    'status': 'active',
                    'started_at': datetime.utcnow().isoformat(),
                    'ended_at': None
                }
            
            # Analyze sentiment
            sentiment_score = 0.0
            if emotion_analyzer:
                try:
                    analysis = emotion_analyzer.analyze_message(message_text)
                    sentiment_score = analysis.get('emotion_intensity', 0.0)
                except Exception as e:
                    logger.error(f"Error in sentiment analysis: {str(e)}")
            
            # Store user message
            user_message_data = {
                'message_id': generate_uuid(),
                'session_id': active_session_id,
                'user_id': user_id,
                'sender': 'user',
                'message_text': message_text,
                'timestamp': datetime.utcnow().isoformat(),
                'sentiment_score': sentiment_score
            }
            messages.append(user_message_data)
            
            # Generate AI response
            conversation_history = get_conversation_history(user_id, active_session_id)
            response_text = get_ai_response(message_text, user_data, conversation_history)
            
            # Store bot message
            bot_message_data = {
                'message_id': generate_uuid(),
                'session_id': active_session_id,
                'user_id': user_id,
                'sender': 'M',
                'message_text': response_text,
                'timestamp': datetime.utcnow().isoformat(),
                'sentiment_score': 0.0
            }
            messages.append(bot_message_data)
            
            return jsonify({
                "response": response_text,
                "time": datetime.utcnow().strftime("%I:%M %p"),
                "sentiment": sentiment_score,
                "sessionId": active_session_id
            }), 200
            
    except Exception as e:
        logger.error(f"Error in chat API: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "response": "I apologize, but I'm having trouble processing your message right now. Please try again."
        }), 500

@app.route("/api/feedback", methods=["POST"])
@enhanced_jwt_required
def submit_feedback():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data or 'rating' not in data:
        return jsonify({"error": "Rating is required"}), 400
    
    try:
        if USE_DATABASE:
            with app.app_context():
                session_id = data.get('sessionId')
                if not session_id:
                    recent_session = ChatSession.query.filter(
                        ChatSession.user_id == user_id,
                        ChatSession.status == 'completed'
                    ).order_by(ChatSession.ended_at.desc()).first()
                    
                    if recent_session:
                        session_id = recent_session.session_id
                
                feedback = Feedback()
                feedback.feedback_id = generate_uuid()
                feedback.user_id = user_id
                feedback.session_id = session_id
                feedback.rating = data['rating']
                feedback.comments = data.get('feedback', '')
                feedback.suggestions = data.get('suggestions', '')
                feedback.category = data.get('category', '')
                db.session.add(feedback)
                db.session.commit()
                
                return jsonify({"message": "Thank you for your feedback!"}), 200
        else:
            return jsonify({"message": "Thank you for your feedback!"}), 200
            
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}")
        return jsonify({"error": "An error occurred while submitting feedback"}), 500

# Health check with system status
@app.route('/api/health')
def enhanced_health_check():
    try:
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '2.0.0',
            'features': {
                'database': USE_DATABASE,
                'oauth': True,
                'ai': emotion_analyzer is not None,
                'nlp': response_generator is not None,
                'groq': client is not None,
                'security': True,
                'rate_limiting': True
            },
            'environment': os.getenv('FLASK_ENV', 'development')
        }
        # Test database connection if enabled
        if USE_DATABASE:
            try:
                with app.app_context():
                    db.session.execute(text('SELECT 1'))
                health_status['database_status'] = 'connected'
            except Exception as e:
                health_status['database_status'] = 'error'
                health_status['status'] = 'degraded'
                logger.error(f"Database health check failed: {str(e)}")
        return jsonify(health_status)
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'error': 'Health check failed'
        }), 500

# File Upload Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')

# Create uploads directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/upload-profile-picture', methods=['POST'])
@enhanced_jwt_required
def upload_profile_picture():
    user_id = get_jwt_identity()
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if not file or not file.filename:
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        # Create secure filename
        filename = f"{user_id}_{int(datetime.utcnow().timestamp())}.{file.filename.rsplit('.', 1)[1].lower()}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        try:
            file.save(filepath)
            
            # Generate URL for the uploaded file
            file_url = f"/api/uploads/{filename}"
            
            # Update user profile in database
            if USE_DATABASE:
                with app.app_context():
                    profile = UserProfile.query.filter_by(user_id=user_id).first()
                    if profile:
                        db.session.commit()
                    else:
                        return jsonify({'error': 'User profile not found'}), 404
            else:
                # Update in-memory storage
                for uid, user_data in users.items():
                    if uid == user_id:
                        user_data['profile_picture'] = file_url
                        break
            
            return jsonify({
                'message': 'Profile picture uploaded successfully',
                'profile_picture': file_url
            })
            
        except Exception as e:
            logger.error(f"Error uploading file: {str(e)}")
            return jsonify({'error': 'Failed to upload file'}), 500
    
    return jsonify({'error': 'Invalid file type. Please upload PNG, JPG, JPEG, GIF, or WebP'}), 400

@app.route('/api/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/change-password', methods=['POST'])
@enhanced_jwt_required
def change_password():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({'error': 'Current password and new password are required'}), 400
    
    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters long'}), 400
    
    try:
        if USE_DATABASE:
            with app.app_context():
                user = User.query.filter_by(user_id=user_id).first()
                if not user:
                    return jsonify({'error': 'User not found'}), 404
                
                if user.auth_method == 'oauth':
                    return jsonify({'error': 'Cannot change password for OAuth accounts'}), 400
                
                # Verify current password
                if not verify_password(user.password_hash, current_password):
                    return jsonify({'error': 'Current password is incorrect'}), 400
                
                # Update password
                user.password_hash = hash_password(new_password)
                db.session.commit()
        else:
            # In-memory storage
            user_data = users.get(user_id)
            if not user_data:
                return jsonify({'error': 'User not found'}), 404
            
            if user_data.get('auth_method') == 'oauth':
                return jsonify({'error': 'Cannot change password for OAuth accounts'}), 400
            
            # Verify current password
            if not verify_password(user_data.get('password_hash', ''), current_password):
                return jsonify({'error': 'Current password is incorrect'}), 400
            
            # Update password
            user_data['password_hash'] = hash_password(new_password)
            users[user_id] = user_data
        
        return jsonify({'message': 'Password changed successfully'})
        
    except Exception as e:
        logger.error(f"Error changing password: {str(e)}")
        return jsonify({'error': 'Failed to change password'}), 500

@app.route('/api/change-email', methods=['POST'])
@enhanced_jwt_required
def change_email():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    new_email = data.get('new_email')
    password = data.get('password')
    
    if not new_email or not password:
        return jsonify({'error': 'New email and password are required'}), 400
    
    # Validate email format
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, new_email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    try:
        if USE_DATABASE:
            with app.app_context():
                # Check if email already exists
                existing_user = User.query.filter_by(email=new_email).first()
                if existing_user and existing_user.user_id != user_id:
                    return jsonify({'error': 'Email already in use'}), 400
                
                user = User.query.filter_by(user_id=user_id).first()
                if not user:
                    return jsonify({'error': 'User not found'}), 404
                
                if user.auth_method == 'oauth':
                    return jsonify({'error': 'Cannot change email for OAuth accounts'}), 400
                
                # Verify password
                if not verify_password(user.password_hash, password):
                    return jsonify({'error': 'Password is incorrect'}), 400
                
                # Update email
                user.email = new_email
                user.is_verified = False  # Require re-verification
                db.session.commit()
        else:
            # In-memory storage
            # Check if email already exists
            for uid, user_data in users.items():
                if uid != user_id and user_data.get('email') == new_email:
                    return jsonify({'error': 'Email already in use'}), 400
            
            user_data = users.get(user_id)
            if not user_data:
                return jsonify({'error': 'User not found'}), 404
            
            if user_data.get('auth_method') == 'oauth':
                return jsonify({'error': 'Cannot change email for OAuth accounts'}), 400
            
            # Verify password
            if not verify_password(user_data.get('password_hash', ''), password):
                return jsonify({'error': 'Password is incorrect'}), 400
            
            # Update email
            user_data['email'] = new_email
            user_data['is_verified'] = False
            users[user_id] = user_data
        
        return jsonify({'message': 'Email changed successfully'})
        
    except Exception as e:
        logger.error(f"Error changing email: {str(e)}")
        return jsonify({'error': 'Failed to change email'}), 500

@app.route('/api/session/<session_id>/rename', methods=['POST'])
@enhanced_jwt_required
def rename_session(session_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    new_title = data.get('title')
    if not new_title or not new_title.strip():
        return jsonify({'error': 'Title is required'}), 400
    try:
        if USE_DATABASE:
            with app.app_context():
                session_obj = ChatSession.query.filter_by(session_id=session_id, user_id=user_id).first()
                if not session_obj:
                    return jsonify({'error': 'Session not found'}), 404
                session_obj.title = new_title.strip()
                db.session.commit()
                return jsonify({'session_id': session_id, 'title': session_obj.title}), 200
        else:
            session_obj = chat_sessions.get(session_id)
            if not session_obj or session_obj.get('user_id') != user_id:
                return jsonify({'error': 'Session not found'}), 404
            session_obj['title'] = new_title.strip()
            return jsonify({'session_id': session_id, 'title': session_obj['title']}), 200
    except Exception as e:
        logger.error(f"Error renaming session: {str(e)}")
        return jsonify({'error': 'Failed to rename session'}), 500

@app.route('/api/end_session', methods=['POST'])
@enhanced_jwt_required
def end_session():
    user_id = get_jwt_identity()
    data = request.get_json()
    session_id = data.get('sessionId')
    if not session_id:
        return jsonify({'error': 'Session ID is required'}), 400
    try:
        if USE_DATABASE:
            with app.app_context():
                session_obj = ChatSession.query.filter_by(session_id=session_id, user_id=user_id).first()
                if not session_obj:
                    return jsonify({'error': 'Session not found'}), 404
                if session_obj.status != 'completed':
                    session_obj.status = 'completed'
                    session_obj.ended_at = datetime.utcnow()
                    db.session.commit()
                # --- Create ChatSummary if not exists ---
                summary_obj = ChatSummary.query.filter_by(session_id=session_id).first()
                if not summary_obj:
                    # Get all messages for this session
                    messages = ChatMessage.query.filter_by(session_id=session_id).order_by(ChatMessage.timestamp.asc()).all()
                    user_messages = [m for m in messages if m.sender == 'user']
                    bot_messages = [m for m in messages if m.sender == 'M']
                    # Title: use session title or first user message
                    title = session_obj.title or (user_messages[0].message_text[:60] if user_messages else f"Session {session_id[:8]}")
                    # Summary: concatenate first and last user message, or use all if short
                    if len(user_messages) >= 2:
                        summary_text = f"{user_messages[0].message_text} ... {user_messages[-1].message_text}"
                    elif user_messages:
                        summary_text = user_messages[0].message_text
                    else:
                        summary_text = "No user messages."
                    # Mood: average sentiment
                    sentiments = [m.sentiment_score for m in user_messages if m.sentiment_score is not None]
                    avg_sentiment = sum(sentiments) / len(sentiments) if sentiments else 0
                    if avg_sentiment > 0.3:
                        mood = 'positive'
                    elif avg_sentiment < -0.3:
                        mood = 'negative'
                    else:
                        mood = 'neutral'
                    # Tags: extract keywords (simple split for now)
                    tags = list(set([w for m in user_messages for w in m.message_text.lower().split() if len(w) > 4]))[:5]
                    # Date
                    date = session_obj.ended_at.strftime('%Y-%m-%d') if session_obj.ended_at else datetime.utcnow().strftime('%Y-%m-%d')
                    summary_obj = ChatSummary()
                    summary_obj.session_id = session_id
                    summary_obj.user_id = user_id
                    summary_obj.title = title
                    summary_obj.summary = summary_text
                    summary_obj.mood = mood
                    summary_obj.tags = json.dumps(tags)
                    summary_obj.date = date
                    db.session.add(summary_obj)
                    db.session.commit()
                return jsonify({'message': 'Session ended successfully', 'session_id': session_id}), 200
        else:
            session_obj = chat_sessions.get(session_id)
            if not session_obj or session_obj.get('user_id') != user_id:
                return jsonify({'error': 'Session not found'}), 404
            if session_obj.get('status') != 'completed':
                session_obj['status'] = 'completed'
                session_obj['ended_at'] = datetime.utcnow().isoformat()
            return jsonify({'message': 'Session ended successfully', 'session_id': session_id}), 200
    except Exception as e:
        logger.error(f"Error ending session: {str(e)}")
        return jsonify({'error': 'Failed to end session'}), 500

@app.route('/api/sessions/<user_id>')
@enhanced_jwt_required
def get_sessions(user_id):
    current_user_id = get_jwt_identity()
    if current_user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    try:
        if USE_DATABASE:
            with app.app_context():
                sessions = ChatSession.query.filter_by(user_id=user_id).order_by(ChatSession.started_at.desc()).all()
                session_ids = [s.session_id for s in sessions]
                # Get summaries for all sessions in one query
                summaries = {s.session_id: s for s in ChatSummary.query.filter(ChatSummary.session_id.in_(session_ids)).all()}
                session_list = []
                for s in sessions:
                    summary = summaries.get(s.session_id)
                    session_dict = s.to_dict()
                    session_dict['title'] = s.title or (summary.title if summary else f"Session {s.session_id[:8]}")
                    session_dict['summary'] = summary.summary if summary else None
                    session_dict['mood'] = summary.mood if summary else None
                    session_list.append(session_dict)
                return jsonify({'sessions': session_list}), 200
        else:
            user_sessions = [s for s in chat_sessions.values() if s.get('user_id') == user_id]
            # Sort by started_at descending
            user_sessions.sort(key=lambda s: s.get('started_at', ''), reverse=True)
            return jsonify({'sessions': user_sessions}), 200
    except Exception as e:
        logger.error(f"Error fetching sessions: {str(e)}")
        return jsonify({'error': 'Failed to fetch sessions'}), 500

@app.route('/api/profile', methods=['PUT'])
@enhanced_jwt_required
def update_profile():
    user_id = get_jwt_identity()
    data = request.get_json()
    try:
        if USE_DATABASE:
            with app.app_context():
                profile = UserProfile.query.filter_by(user_id=user_id).first()
                if not profile:
                    return jsonify({'error': 'User profile not found'}), 404
                profile.screen_name = data.get('screen_name', profile.screen_name)
                profile.pronouns = data.get('pronouns', profile.pronouns)
                profile.identity_goals = data.get('goals', profile.identity_goals)
                profile.focus_area = ','.join(data.get('focus_areas', [])) if isinstance(data.get('focus_areas'), list) else (data.get('focus_areas') or profile.focus_area)
                db.session.commit()
                return jsonify({'message': 'Profile updated successfully!'}), 200
        else:
            # In-memory fallback
            for uid, user_data in users.items():
                if user_data.get('user_id') == user_id:
                    user_data['screen_name'] = data.get('screen_name', user_data.get('screen_name'))
                    user_data['pronouns'] = data.get('pronouns', user_data.get('pronouns'))
                    user_data['identity_goals'] = data.get('goals', user_data.get('identity_goals'))
                    user_data['focus_areas'] = data.get('focus_areas', user_data.get('focus_areas'))
                    break
            return jsonify({'message': 'Profile updated successfully!'}), 200
    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        return jsonify({'error': 'Failed to update profile'}), 500

@app.route('/api/analytics/<user_id>')
@enhanced_jwt_required
def get_analytics(user_id):
    from sqlalchemy import func
    import json
    current_user_id = get_jwt_identity()
    if current_user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    try:
        if USE_DATABASE:
            with app.app_context():
                # Total sessions
                total_sessions = ChatSession.query.filter_by(user_id=user_id).count()

                # Average mood: use sentiment_score from user messages
                user_messages = ChatMessage.query.join(ChatSession, ChatMessage.session_id == ChatSession.session_id)
                user_messages = user_messages.filter(ChatSession.user_id == user_id, ChatMessage.sender == 'user').all()
                sentiment_scores = [msg.sentiment_score for msg in user_messages if msg.sentiment_score is not None]
                average_mood = round(sum(sentiment_scores) / len(sentiment_scores), 2) if sentiment_scores else None

                # Streak: count consecutive days with at least one message
                dates = set()
                for msg in user_messages:
                    if msg.timestamp:
                        dates.add(msg.timestamp.date())
                streak = 0
                if dates:
                    today = max(dates)
                    streak = 1
                    while (today - timedelta(days=streak)) in dates:
                        streak += 1

                # Topics count: unique tags/topics from ChatSummary
                summaries = ChatSummary.query.filter_by(user_id=user_id).all()
                topics = set()
                for s in summaries:
                    # tags is a JSON string
                    if s.tags:
                        try:
                            tags = json.loads(s.tags)
                            topics.update(tags)
                        except Exception:
                            pass
                    # topics_explored is a JSON string
                    if s.topics_explored:
                        try:
                            topics_explored = json.loads(s.topics_explored)
                            topics.update(topics_explored)
                        except Exception:
                            pass
                topics_count = len(topics)

                # Insights: can be extended, for now just return empty or basic
                insights = {}

                return jsonify({
                    'totalSessions': total_sessions,
                    'averageMood': average_mood,
                    'streak': streak,
                    'topicsCount': topics_count,
                    'insights': insights
                }), 200
        else:
            return jsonify({}), 200
    except Exception as e:
        logger.error(f"Error fetching analytics: {str(e)}")
        return jsonify({'error': 'Failed to fetch analytics'}), 500

@app.route('/api/mood-data/<user_id>')
@enhanced_jwt_required
def get_mood_data(user_id):
    current_user_id = get_jwt_identity()
    if current_user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    try:
        if USE_DATABASE:
            with app.app_context():
                # Get last 7 ChatSummaries for the user, ordered by date descending
                summaries = ChatSummary.query.filter_by(user_id=user_id).order_by(ChatSummary.created_at.desc()).limit(7).all()
                mood_data = []
                for s in reversed(summaries):  # reverse to get chronological order
                    mood_value = None
                    if s.mood == 'positive':
                        mood_value = 8
                    elif s.mood == 'neutral':
                        mood_value = 5
                    elif s.mood == 'negative':
                        mood_value = 2
                    # Optionally, use session_quality_score or sentiment analysis for more granularity
                    mood_data.append({
                        'date': s.date or (s.created_at.strftime('%Y-%m-%d') if s.created_at else ''),
                        'value': mood_value
                    })
                return jsonify(mood_data), 200
        else:
            return jsonify([]), 200
    except Exception as e:
        logger.error(f"Error fetching mood data: {str(e)}")
        return jsonify({'error': 'Failed to fetch mood data'}), 500

@app.route('/api/chat-summaries/<user_id>')
@enhanced_jwt_required
def get_chat_summaries(user_id):
    current_user_id = get_jwt_identity()
    if current_user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    try:
        if USE_DATABASE:
            with app.app_context():
                # Get last 5 ChatSummaries for the user, ordered by date descending
                summaries = ChatSummary.query.filter_by(user_id=user_id).order_by(ChatSummary.created_at.desc()).limit(5).all()
                return jsonify([s.to_dict() for s in summaries]), 200
        else:
            return jsonify([]), 200
    except Exception as e:
        logger.error(f"Error fetching chat summaries: {str(e)}")
        return jsonify({'error': 'Failed to fetch chat summaries'}), 500

@app.route('/api/session/<session_id>/messages')
@enhanced_jwt_required
def get_session_messages(session_id):
    user_id = get_jwt_identity()
    try:
        if USE_DATABASE:
            with app.app_context():
                session_obj = ChatSession.query.filter_by(session_id=session_id, user_id=user_id).first()
                if not session_obj:
                    return jsonify({'error': 'Session not found'}), 404
                messages = ChatMessage.query.filter_by(session_id=session_id).order_by(ChatMessage.timestamp.asc()).all()
                messages_data = [m.to_dict() for m in messages]
                return jsonify({'messages': messages_data}), 200
        else:
            from app import messages as global_messages
            user_messages = [m for m in global_messages if m.get('session_id') == session_id]
            return jsonify({'messages': user_messages}), 200
    except Exception as e:
        logger.error(f"Error fetching session messages: {str(e)}")
        return jsonify({'error': 'Failed to fetch session messages'}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)