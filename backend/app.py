from flask import Flask, request, jsonify, redirect, url_for, session
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
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
import numpy as np
from flask_session import Session

# Import models
from models import db, User, ChatMessage, TrainingData, UserProfile, UserPreferences, ChatSession, Feedback, ChatSummary

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
app.config['SESSION_COOKIE_SECURE'] = False  # Only send cookies over HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent JavaScript access to session cookie
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # Protect against CSRF
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_FILE_DIR'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'flask_session')
Session(app)

# Configure CORS with credentials
CORS(app, 
     supports_credentials=True,
     origins="*",
     allow_headers=["Content-Type", "Authorization"],
     methods="*"
)

# Configure database
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    DATABASE_URL = 'mysql+pymysql://root:Jawadkhan222-@localhost/mbot_db'  # Update with your credentials

USE_DATABASE = False
IS_VERCEL = os.getenv('VERCEL_ENV') == 'production'

if not IS_VERCEL:
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
            'echo': app.debug
        }
        db.init_app(app)
        with app.app_context():
            # Test database connection
            db.engine.connect()
            # Create tables if they don't exist
            db.create_all()
            USE_DATABASE = True
            logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        logger.warning("Falling back to in-memory storage")
else:
    logger.info("Running in Vercel environment - using in-memory storage")

# In-memory storage fallback
users = {}
messages = []
chat_sessions = {}
chat_summaries = {}  # NEW: user_id -> list of summaries

# Configure OAuth
oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile',
        'prompt': 'select_account'
    }
)

if not os.getenv('GOOGLE_CLIENT_ID') or not os.getenv('GOOGLE_CLIENT_SECRET'):
    logger.error("Google OAuth credentials are not properly configured")
    logger.error(f"GOOGLE_CLIENT_ID: {'Set' if os.getenv('GOOGLE_CLIENT_ID') else 'Not Set'}")
    logger.error(f"GOOGLE_CLIENT_SECRET: {'Set' if os.getenv('GOOGLE_CLIENT_SECRET') else 'Not Set'}")

# Groq Configuration
GROQ_API_KEY = os.getenv('GROQ_API_KEY', 'your_groq_api_key_here')
if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY environment variable is not set")
    raise ValueError("GROQ_API_KEY environment variable is not set")

MODEL_NAME = "llama-3.3-70b-versatile"

try:
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    logger.info("Successfully initialized Groq client")
except Exception as e:
    logger.error(f"Failed to initialize Groq client: {str(e)}")
    # Fallback for demo purposes
    client = None

# Initialize NLP components
emotion_analyzer = EmotionAnalyzer(client) if client else None
response_generator = ResponseGenerator(client, emotion_analyzer) if client and emotion_analyzer else None

def initialize_training_data():
    if not USE_DATABASE:
        logger.info("Skipping training data initialization - no database available")
        return
    try:
        with app.app_context():
            if db.session.query(TrainingData).count() > 0:
                logger.info("Training data already exists in database")
                return
            
            # Initialize with emotion analyzer's training data if available
            if emotion_analyzer:
                for example in emotion_analyzer.TRAINING_DATA:
                    intent = example["intent_category"]
                    user_input = example["user_input"]
                    for variation in example["response_variations"]:
                        response_text = variation["text"]
                        emotional_tone = variation["emotional_tone"]
                        context_tags = json.dumps(example.get("context_tags", []))
                        training_entry = TrainingData(
                            intent_category=intent,
                            user_input=user_input,
                            response_text=response_text,
                            emotional_tone=emotional_tone,
                            context_tags=context_tags
                        )
                        db.session.add(training_entry)
                db.session.commit()
                logger.info("Successfully initialized training data")
    except Exception as e:
        logger.error(f"Error initializing training data: {str(e)}")

if USE_DATABASE:
    initialize_training_data()

def generate_uuid():
    return str(uuid.uuid4())

def get_user_data(user_id):
    """Get user data with improved error handling and fallback"""
    if not user_id:
        logger.error("No user_id provided to get_user_data")
        return None

    if USE_DATABASE:
        try:
            with app.app_context():
                # First try to get user from User table
                user = User.query.filter_by(user_id=user_id).first()
                if not user:
                    logger.warning(f"User not found in database: {user_id}")
                    return None

                # Get profile data
                profile = UserProfile.query.filter_by(user_id=user_id).first()
                if not profile:
                    logger.warning(f"Profile not found for user: {user_id}")
                    # Create basic profile if missing
                    profile = UserProfile(
                        profile_id=generate_uuid(),
                        user_id=user_id,
                        screen_name=user.email.split('@')[0]
                    )
                    db.session.add(profile)
                    db.session.commit()

                # Get preferences
                preferences = UserPreferences.query.filter_by(user_id=user_id).first()
                if not preferences:
                    logger.warning(f"Preferences not found for user: {user_id}")
                    # Create default preferences if missing
                    preferences = UserPreferences(
                        user_id=user_id,
                        preferred_response_length='medium',
                        preferred_communication_style='empathetic'
                    )
                    db.session.add(preferences)
                    db.session.commit()

                # Combine all user data
                user_data = user.to_dict()
                user_data.update(profile.to_dict())
                user_data.update(preferences.to_dict())
                
                # Add session data if available
                user_data['session'] = session.get('user_data', {})
                
                return user_data

        except Exception as e:
            logger.error(f"Database error getting user data: {str(e)}")
            # Fallback to in-memory storage
            return users.get(user_id)
    
    # In-memory fallback
    user_data = users.get(user_id)
    if not user_data:
        # Create basic user data if not found
        user_data = {
            'user_id': user_id,
            'name': session.get('user_name', 'User'),
            'email': session.get('user_email', ''),
            'profile_picture': session.get('profile_picture', ''),
            'screen_name': session.get('user_name', 'User'),
            'preferred_response_length': 'medium',
            'preferred_communication_style': 'empathetic'
        }
        users[user_id] = user_data
    
    return user_data

def get_conversation_history(user_id, session_id=None):
    if USE_DATABASE:
        try:
            with app.app_context():
                if session_id:
                    db_messages = ChatMessage.query.filter_by(
                        session_id=session_id
                    ).order_by(ChatMessage.timestamp.asc()).all()
                else:
                    # Get active session
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
            return [msg for msg in messages if msg['user_id'] == user_id]
    return [msg for msg in messages if msg['user_id'] == user_id]

def store_message(message_data):
    global messages
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

def get_empathy_response(message_text, user_id):
    try:
        user = get_user_data(user_id)
        if not user:
            return "I apologize, but I'm having trouble accessing your profile information."
        
        # Use advanced NLP response generation if available
        if response_generator and user:
            conversation_history = get_conversation_history(user_id)
            response_data = response_generator.generate_response(
                message_text, 
                user, 
                conversation_history
            )
            return response_data['response']
        
        # Fallback to simple responses
        return generate_simple_response(message_text, user)
    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        return "I apologize, but I'm having trouble generating a response at the moment. Please try again."

def generate_simple_response(message_text, user):
    """Simple response generator as fallback"""
    responses = {
        'anxiety': [
            "I understand you're feeling anxious. That's completely valid. Would you like to try a breathing exercise together?",
            "Anxiety can feel overwhelming, but you're not alone. What's been on your mind lately?",
        ],
        'identity': [
            f"Exploring identity is a profound journey, {user.get('screen_name', user.get('name', 'friend'))}. What aspects of yourself are you discovering?",
            "Your identity is uniquely yours. What feels most authentic to you right now?",
        ],
        'general': [
            f"Thank you for sharing that with me, {user.get('screen_name', user.get('name', 'friend'))}. How are you feeling about everything right now?",
            "I'm here to support you. What would be most helpful to talk about today?",
        ]
    }
    
    message_lower = message_text.lower()
    
    if any(word in message_lower for word in ['anxious', 'worried', 'nervous', 'panic', 'fear']):
        response_category = 'anxiety'
    elif any(word in message_lower for word in ['identity', 'who am i', 'myself', 'authentic']):
        response_category = 'identity'
    else:
        response_category = 'general'
    
    import random
    return random.choice(responses[response_category])

def create_chat_summary_with_groq(session_id):
    """Create a comprehensive chat summary using GROQ API analysis"""
    if not USE_DATABASE or not client:
        return None
    
    try:
        with app.app_context():
            session_obj = ChatSession.query.filter_by(session_id=session_id).first()
            if not session_obj:
                return None
            
            # Get all messages from the session
            session_messages = ChatMessage.query.filter_by(
                session_id=session_id
            ).order_by(ChatMessage.timestamp.asc()).all()
            
            if not session_messages:
                return None
            
            user_messages = [msg for msg in session_messages if msg.sender == 'user']
            bot_messages = [msg for msg in session_messages if msg.sender == 'M']
            
            # Prepare conversation text for analysis
            conversation_text = ""
            for msg in session_messages:
                speaker = "User" if msg.sender == 'user' else "M"
                conversation_text += f"{speaker}: {msg.message_text}\n"
            
            # Use GROQ to analyze the conversation
            analysis_prompt = f"""
            Analyze this therapy/mentoring conversation and provide insights in JSON format:

            Conversation:
            {conversation_text}

            Please analyze and return a JSON with these fields:
            1. "title": A brief, descriptive title for this session (max 50 chars)
            2. "summary": A concise summary of what was discussed (2-3 sentences)
            3. "key_topics": List of main topics discussed (max 5)
            4. "emotional_journey": Description of user's emotional state progression
            5. "insights": Key insights or breakthroughs from the session
            6. "mood": Overall mood assessment (positive/neutral/negative)
            7. "action_items": Any suggested next steps or practices mentioned
            8. "session_quality": Assessment of session effectiveness (1-10)
            """
            
            # Call GROQ API
            completion = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert therapy session analyst. Provide detailed, empathetic analysis of conversations while maintaining confidentiality and professional insight."
                    },
                    {
                        "role": "user",
                        "content": analysis_prompt
                    }
                ],
                temperature=0.3,
                max_tokens=800
            )
            
            # Parse the response
            analysis_text = completion.choices[0].message.content
            
            # Extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', analysis_text, re.DOTALL)
            if json_match:
                try:
                    analysis_data = json.loads(json_match.group(0))
                    
                    # Create summary record
                    chat_summary = ChatSummary(
                        session_id=session_id,
                        user_id=session_obj.user_id,
                        title=analysis_data.get('title', 'Chat Session'),
                        summary=analysis_data.get('summary', 'Conversation summary'),
                        mood=analysis_data.get('mood', 'neutral'),
                        tags=json.dumps(analysis_data.get('key_topics', [])),
                        date=datetime.now().strftime('%Y-%m-%d'),
                        analysis_data=json.dumps(analysis_data)  # Store full analysis
                    )
                    
                    db.session.add(chat_summary)
                    db.session.commit()
                    
                    logger.info(f"Created chat summary for session {session_id}")
                    return chat_summary.to_dict()
                    
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse GROQ analysis JSON: {str(e)}")
            
            # Fallback summary if GROQ analysis fails
            fallback_summary = create_fallback_summary(session_obj, user_messages, bot_messages)
            return fallback_summary
            
    except Exception as e:
        logger.error(f"Error creating chat summary with GROQ: {str(e)}")
        return None

def create_fallback_summary(session_obj, user_messages, bot_messages):
    """Create a basic summary when GROQ analysis fails"""
    try:
        # Basic analysis
        total_messages = len(user_messages) + len(bot_messages)
        session_duration = (session_obj.ended_at - session_obj.started_at).total_seconds() / 60 if session_obj.ended_at else 0
        
        # Simple keyword analysis for topics
        all_user_text = ' '.join([msg.message_text for msg in user_messages]).lower()
        topic_keywords = {
            'anxiety': ['anxious', 'worried', 'stress', 'nervous'],
            'identity': ['identity', 'who am i', 'myself', 'authentic'],
            'relationships': ['relationship', 'friend', 'family', 'partner'],
            'growth': ['growth', 'improve', 'better', 'change'],
            'emotions': ['feel', 'emotion', 'sad', 'happy', 'angry']
        }
        
        detected_topics = []
        for topic, keywords in topic_keywords.items():
            if any(keyword in all_user_text for keyword in keywords):
                detected_topics.append(topic)
        
        # Create basic summary
        chat_summary = ChatSummary(
            session_id=session_obj.session_id,
            user_id=session_obj.user_id,
            title=f"Session - {session_obj.started_at.strftime('%m/%d %H:%M')}",
            summary=f"Conversation with {total_messages} exchanges lasting {session_duration:.0f} minutes.",
            mood='neutral',
            tags=json.dumps(detected_topics),
            date=datetime.now().strftime('%Y-%m-%d')
        )
        
        db.session.add(chat_summary)
        db.session.commit()
        
        return chat_summary.to_dict()
        
    except Exception as e:
        logger.error(f"Error creating fallback summary: {str(e)}")
        return None

def generate_dashboard_insights(user_id):
    """Generate dashboard insights using GROQ API from chat histories"""
    if not USE_DATABASE or not client:
        return {}
    
    try:
        with app.app_context():
            # Get recent chat summaries for the user
            recent_summaries = ChatSummary.query.filter_by(
                user_id=user_id
            ).order_by(ChatSummary.created_at.desc()).limit(10).all()
            
            if not recent_summaries:
                return {
                    'key_insights': 'No chat history available yet. Start a conversation to see insights!',
                    'progress_trends': [],
                    'recommended_focus_areas': [],
                    'emotional_patterns': {}
                }
            
            # Prepare data for GROQ analysis
            summaries_text = ""
            for summary in recent_summaries:
                summaries_text += f"Session: {summary.title}\n"
                summaries_text += f"Summary: {summary.summary}\n"
                summaries_text += f"Topics: {summary.tags}\n"
                summaries_text += f"Mood: {summary.mood}\n"
                summaries_text += f"Date: {summary.date}\n\n"
            
            # Create GROQ prompt for dashboard insights
            insights_prompt = f"""
            Based on this user's chat history summaries, provide comprehensive insights in JSON format:

            Chat History:
            {summaries_text}

            Please analyze and return a JSON with these fields:
            1. "key_insights": 2-3 key insights about the user's journey and progress
            2. "progress_trends": List of positive trends or improvements observed
            3. "emotional_patterns": Analysis of emotional patterns and mood trends
            4. "recommended_focus_areas": Suggested areas for future sessions
            5. "growth_indicators": Signs of personal growth and development
            6. "session_quality_trend": How session engagement/quality has evolved
            7. "summary_overview": Overall assessment of the user's therapeutic journey
            """
            
            # Call GROQ API
            completion = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a therapeutic insights analyst. Analyze chat patterns to provide meaningful, encouraging insights about a user's mental health and personal growth journey."
                    },
                    {
                        "role": "user",
                        "content": insights_prompt
                    }
                ],
                temperature=0.4,
                max_tokens=1000
            )
            
            # Parse the response
            insights_text = completion.choices[0].message.content
            
            # Extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', insights_text, re.DOTALL)
            if json_match:
                try:
                    insights_data = json.loads(json_match.group(0))
                    return insights_data
                except json.JSONDecodeError:
                    logger.error("Failed to parse GROQ insights JSON")
            
            # Fallback insights
            return {
                'key_insights': f'Based on {len(recent_summaries)} recent sessions, you\'ve been exploring various aspects of personal growth.',
                'progress_trends': ['Regular engagement with self-reflection', 'Consistent conversation patterns'],
                'recommended_focus_areas': ['Continue current exploration topics'],
                'emotional_patterns': {'overall_trend': 'Stable engagement with personal development'}
            }
            
    except Exception as e:
        logger.error(f"Error generating dashboard insights: {str(e)}")
        return {}

# API Routes

@app.route('/api/user')
def get_current_user():
    """Get current logged-in user"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_data = get_user_data(session['user_id'])
    if not user_data:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(user_data)

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
            
        if USE_DATABASE:
            user = User.query.filter_by(email=email).first()
            if not user:
                # Create new user for demo
                user = User(
                    user_id=str(uuid.uuid4()),
                    email=email,
                    password_hash='',  # In production, use proper password hashing
                    auth_method='email',
                    is_verified=True
                )
                db.session.add(user)
                
                profile = UserProfile(
                    profile_id=generate_uuid(),
                    user_id=user.user_id,
                    screen_name=email.split('@')[0]
                )
                db.session.add(profile)
                
                preferences = UserPreferences(
                    preference_id=generate_uuid(),
                    user_id=user.user_id,
                    preferred_response_length='medium'
                )
                db.session.add(preferences)
                
                db.session.commit()
        else:
            # In-memory storage fallback
            user_id = str(uuid.uuid4())
            if email not in users:
                users[user_id] = {
                    'user_id': user_id,
                    'email': email,
                    'name': email.split('@')[0],
                    'screen_name': email.split('@')[0],
                    'created_at': datetime.utcnow(),
                    'last_login': datetime.utcnow(),
                    'is_verified': True,
                    'auth_method': 'email'
                }
            else:
                users[user_id]['last_login'] = datetime.utcnow()
        
        # Set session
        session['user_id'] = user.user_id if USE_DATABASE else user_id
        session['user_email'] = email
        
        return jsonify({
            'id': user.user_id if USE_DATABASE else user_id,
            'email': email,
            'name': email.split('@')[0]
        })
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'An error occurred during login'}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/conversation/<user_id>')
def get_conversation(user_id):
    global messages
    """Get conversation history and active session with better error handling"""
    try:
        logger.info(f"Fetching conversation for user: {user_id}")
        
        if USE_DATABASE:
            with app.app_context():
                # Get active session ID first
                active_session = ChatSession.query.filter_by(
                    user_id=user_id, status='active'
                ).first()
                
                session_id = active_session.session_id if active_session else None
                
                # Get messages from active session or all sessions
                if session_id:
                    db_messages = ChatMessage.query.filter_by(
                        session_id=session_id
                    ).order_by(ChatMessage.timestamp.asc()).all()
                else:
                    # Get messages from all sessions for this user
                    db_messages = ChatMessage.query.join(ChatSession).filter(
                        ChatSession.user_id == user_id
                    ).order_by(ChatMessage.timestamp.asc()).limit(50).all()
                
                # Convert to proper format
                messages = []
                for msg in db_messages:
                    message_data = {
                        'id': msg.message_id,
                        'message_text': msg.message_text,
                        'sender': msg.sender,
                        'timestamp': msg.timestamp.isoformat(),
                        'sentiment_score': msg.sentiment_score
                    }
                    messages.append(message_data)
                
                logger.info(f"Returning {len(messages)} messages")
                return jsonify({
                    'messages': messages,
                    'sessionId': session_id
                })
        else:
            # Fixed in-memory fallback
            # Find active session for user
            active_session_id = None
            for s_id, s_data in chat_sessions.items():
                if s_data.get('user_id') == user_id and s_data.get('status') == 'active':
                    active_session_id = s_id
                    break
            # Get messages for active session or recent messages for user
            if active_session_id:
                user_messages = [msg for msg in messages if msg.get('session_id') == active_session_id]
            else:
                user_messages = [msg for msg in messages if msg.get('user_id') == user_id][-20:]  # Last 20
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
        logger.error(f"Full traceback: ", exc_info=True)
        return jsonify({
            'messages': [],
            'sessionId': None,
            'error': 'Failed to load conversation'
        }), 500

@app.route("/api/chat", methods=["POST"])
def api_chat():
    if 'user_id' not in session:
        return jsonify({"error": "Not authenticated"}), 401
    
    user_id = session['user_id']
    data = request.get_json() if request.is_json else request.form
    message_text = data.get("message")
    
    if not message_text:
        return jsonify({"error": "Message is required"}), 400
    
    logger.info(f"Received message from user {user_id}: {message_text}")
    
    try:
        # Get user data first to ensure it exists
        user_data = get_user_data(user_id)
        if not user_data:
            logger.error(f"Could not retrieve user data for user_id: {user_id}")
            return jsonify({
                "error": "User data not found",
                "response": "I apologize, but I'm having trouble accessing your profile information. Please try logging out and back in."
            }), 404

        if USE_DATABASE:
            with app.app_context():
                # Get or create active session
                active_session = ChatSession.query.filter_by(
                    user_id=user_id, status='active'
                ).first()
                
                if not active_session:
                    active_session = ChatSession(
                        session_id=generate_uuid(),
                        user_id=user_id,
                        chat_mode='mentor'
                    )
                    db.session.add(active_session)
                    db.session.commit()
                    logger.info(f"Created new session: {active_session.session_id}")
                
                # Analyze sentiment if available
                sentiment_score = 0.0
                if emotion_analyzer:
                    try:
                        analysis = emotion_analyzer.analyze_message(message_text)
                        sentiment_score = analysis.get('emotion_intensity', 0.0)
                        logger.info(f"Sentiment analysis: {sentiment_score}")
                    except Exception as e:
                        logger.error(f"Error in sentiment analysis: {str(e)}")
                
                # Store user message
                user_message = ChatMessage(
                    message_id=generate_uuid(),
                    session_id=active_session.session_id,
                    user_id=user_id,  # Add user_id to message
                    sender='user',
                    message_text=message_text,
                    sentiment_score=sentiment_score
                )
                db.session.add(user_message)
                
                # Generate AI response with user context
                logger.info("Generating AI response with user context...")
                
                # Enhanced response generation with user profile integration
                if response_generator:
                    conversation_history = get_conversation_history(user_id)
                    # Convert conversation history to proper format
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
                    response_text = response_data['response']
                else:
                    response_text = get_empathy_response(message_text, user_id)
                
                # Personalize response with user's name/pronouns
                response_text = personalize_response(response_text, user_data)
                
                if not response_text or response_text.strip() == "":
                    logger.warning("Empty response generated, using fallback")
                    screen_name = user_data.get('screen_name', user_data.get('name', 'friend'))
                    response_text = f"I hear you, {screen_name}. Could you tell me more about how you're feeling right now?"
                
                logger.info(f"Generated response: {response_text[:100]}...")
                
                # Store bot message
                bot_message = ChatMessage(
                    message_id=generate_uuid(),
                    session_id=active_session.session_id,
                    user_id=user_id,  # Add user_id to message
                    sender='M',
                    message_text=response_text,
                    sentiment_score=0.0
                )
                db.session.add(bot_message)
                db.session.commit()
                
                return jsonify({
                    "response": response_text,
                    "time": datetime.utcnow().strftime("%I:%M %p"),
                    "sentiment": sentiment_score,
                    "sessionId": active_session.session_id
                }), 200
        else:
            # Enhanced in-memory handling
            # Find or create active session
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
                logger.info(f"Created new in-memory session: {active_session_id}")
            
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
            response_text = get_empathy_response(message_text, user_id)
            response_text = personalize_response(response_text, user_data)
            
            if not response_text or response_text.strip() == "":
                screen_name = user_data.get('screen_name', user_data.get('name', 'friend'))
                response_text = f"I hear you, {screen_name}. Could you tell me more about how you're feeling right now?"
            
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
        logger.error(f"Full traceback: ", exc_info=True)
        return jsonify({
            "error": "Internal server error",
            "response": "I apologize, but I'm having trouble processing your message right now. Please try again."
        }), 500

def personalize_response(response_text, user_data):
    """Personalize the response with user's name and pronouns"""
    try:
        screen_name = user_data.get('screen_name', user_data.get('name', ''))
        pronouns = user_data.get('pronouns', '')
        
        # Add name if not already present and we have one
        if screen_name and screen_name.lower() not in response_text.lower():
            # Insert name naturally into the response
            if response_text.startswith("I "):
                response_text = f"I hear you, {screen_name}. " + response_text[2:]
            elif "you" in response_text.lower()[:20]:
                response_text = response_text.replace("you", f"you, {screen_name}", 1)
        
        # Handle pronoun integration if available
        if pronouns:
            # This is a simple implementation - could be enhanced with more sophisticated NLP
            pronoun_pairs = {
                'they/them': {'they': 'they', 'them': 'them', 'their': 'their', 'theirs': 'theirs'},
                'she/her': {'they': 'she', 'them': 'her', 'their': 'her', 'theirs': 'hers'},
                'he/him': {'they': 'he', 'them': 'him', 'their': 'his', 'theirs': 'his'}
            }
            
            # Apply pronoun corrections if we have a matching set
            for pronoun_set, replacements in pronoun_pairs.items():
                if pronoun_set.lower() in pronouns.lower():
                    for generic, specific in replacements.items():
                        response_text = response_text.replace(f" {generic} ", f" {specific} ")
                    break
        
        return response_text
        
    except Exception as e:
        logger.error(f"Error personalizing response: {str(e)}")
        return response_text

@app.route("/api/end_session", methods=["POST"])
def end_chat_session():
    if 'user_id' not in session:
        return jsonify({"error": "Not authenticated"}), 401
    
    user_id = session['user_id']
    data = request.get_json()
    session_id = data.get('sessionId')
    
    try:
        if USE_DATABASE:
            with app.app_context():
                active_session = ChatSession.query.filter_by(
                    user_id=user_id, 
                    status='active',
                    session_id=session_id
                ).first()
                
                if active_session:
                    active_session.status = 'completed'
                    active_session.ended_at = datetime.utcnow()
                    db.session.commit()
                    
                    # Create chat summary using GROQ
                    summary = create_chat_summary_with_groq(session_id)
                    
                    return jsonify({
                        "message": "Session ended successfully",
                        "summary": summary
                    }), 200
                else:
                    return jsonify({"error": "No active session found"}), 404
        else:
            # In-memory: mark session as ended and generate summary
            session_obj = chat_sessions.get(session_id)
            if session_obj and session_obj.get('status') == 'active':
                session_obj['status'] = 'completed'
                session_obj['ended_at'] = datetime.utcnow().isoformat()
                
                # Create summary
                summary = create_chat_summary_with_groq(session_id)
                
                logger.info(f"Session {session_id} ended successfully")
                return jsonify({
                    "message": "Session ended successfully",
                    "summary": summary
                }), 200
            else:
                return jsonify({"error": "No active session found"}), 404
    
    except Exception as e:
        logger.error(f"Error ending session: {str(e)}")
        return jsonify({"error": "An error occurred while ending the session"}), 500

@app.route("/api/update_profile", methods=["POST"])
def api_update_profile():
    if 'user_id' not in session:
        return jsonify({"error": "Not authenticated"}), 401
    
    user_id = session['user_id']
    data = request.get_json()
    
    pronouns = data.get("pronouns", "")
    identity_goals = data.get("identity_goals", "")
    focus_area = data.get("focus_area", "")
    screen_name = data.get("screen_name", "")
    preferred_response_length = data.get("preferred_response_length", "medium")
    preferred_communication_style = data.get("preferred_communication_style", "")
    
    if USE_DATABASE:
        try:
            with app.app_context():
                # Update profile
                profile = UserProfile.query.filter_by(user_id=user_id).first()
                if profile:
                    profile.pronouns = pronouns
                    profile.identity_goals = identity_goals
                    profile.focus_area = focus_area
                    profile.screen_name = screen_name
                    profile.profile_updated_at = datetime.utcnow()
                else:
                    profile = UserProfile(
                        profile_id=generate_uuid(),
                        user_id=user_id,
                        screen_name=screen_name,
                        pronouns=pronouns,
                        identity_goals=identity_goals,
                        focus_area=focus_area
                    )
                    db.session.add(profile)
                
                # Update preferences
                preferences = UserPreferences.query.filter_by(user_id=user_id).first()
                if preferences:
                    preferences.preferred_response_length = preferred_response_length
                    preferences.preferred_communication_style = preferred_communication_style
                    preferences.updated_at = datetime.utcnow()
                else:
                    preferences = UserPreferences(
                        preference_id=generate_uuid(),
                        user_id=user_id,
                        preferred_response_length=preferred_response_length,
                        preferred_communication_style=preferred_communication_style
                    )
                    db.session.add(preferences)
                
                db.session.commit()
                return jsonify({"message": "Profile updated successfully"}), 200
                
        except Exception as e:
            logger.error(f"Database error updating profile: {str(e)}")
            return jsonify({"error": "Failed to update profile"}), 500
    else:
        # In-memory storage fallback
        user = users.get(user_id, {})
        user.update({
            'pronouns': pronouns,
            'identity_goals': identity_goals,
            'focus_area': focus_area,
            'screen_name': screen_name,
            'preferred_response_length': preferred_response_length,
            'preferred_communication_style': preferred_communication_style
        })
        users[user_id] = user
        return jsonify({"message": "Profile updated successfully"}), 200

@app.route('/api/analytics/<user_id>')
def get_analytics(user_id):
    """Get user analytics with real data and GROQ-powered insights"""
    try:
        if USE_DATABASE:
            with app.app_context():
                # Get total sessions for this user
                total_sessions = ChatSession.query.filter_by(user_id=user_id).count()
                
                # Get completed sessions in last 7 days
                seven_days_ago = datetime.utcnow() - timedelta(days=7)
                recent_sessions = ChatSession.query.filter(
                    ChatSession.user_id == user_id,
                    ChatSession.started_at >= seven_days_ago
                ).count()
                
                # Get user messages from last 7 days for mood calculation
                recent_messages = ChatMessage.query.filter(
                    ChatMessage.user_id == user_id,
                    ChatMessage.sender == 'user',
                    ChatMessage.timestamp >= seven_days_ago
                ).all()
                
                # Calculate average mood
                if recent_messages:
                    sentiments = [msg.sentiment_score for msg in recent_messages if msg.sentiment_score is not None]
                    if sentiments:
                        avg_sentiment = sum(sentiments) / len(sentiments)
                        # Convert sentiment (-1 to 1) to mood (1 to 10)
                        average_mood = f"{((avg_sentiment + 1) * 5):.1f}/10"
                    else:
                        average_mood = "N/A"
                else:
                    average_mood = "N/A"
                
                # Calculate streak (consecutive days with sessions)
                streak = calculate_user_streak(user_id)
                
                # Get topic distribution using GROQ insights
                insights = generate_dashboard_insights(user_id)
                common_topics = insights.get('recommended_focus_areas', [])
                
                # Get chat summaries for additional context
                chat_summaries_data = ChatSummary.query.filter_by(
                    user_id=user_id
                ).order_by(ChatSummary.created_at.desc()).limit(5).all()
                
                summaries = [summary.to_dict() for summary in chat_summaries_data]
                
                return jsonify({
                    'totalSessions': total_sessions,
                    'streak': streak,
                    'averageMood': average_mood,
                    'topicsCount': len(common_topics),
                    'commonTopics': common_topics,
                    'insights': insights,
                    'recentSummaries': summaries
                })
        else:
            # Enhanced in-memory analytics
            user_sessions = [s for s in chat_sessions.values() if s.get('user_id') == user_id]
            user_messages_list = [m for m in messages if m.get('user_id') == user_id and m.get('sender') == 'user']
            user_summaries = chat_summaries.get(user_id, [])
            
            # Calculate basic analytics
            total_sessions = len(user_sessions)
            
            # Calculate streak (simplified)
            streak = len([s for s in user_sessions if s.get('status') == 'completed'])
            
            # Calculate average mood
            if user_messages_list:
                recent_sentiments = [m.get('sentiment_score', 0) for m in user_messages_list[-10:] if m.get('sentiment_score') is not None]
                if recent_sentiments:
                    avg_sentiment = sum(recent_sentiments) / len(recent_sentiments)
                    average_mood = f"{((avg_sentiment + 1) * 5):.1f}/10"
                else:
                    average_mood = "5.0/10"
            else:
                average_mood = "N/A"
            
            # Get insights
            insights = generate_dashboard_insights(user_id)
            common_topics = insights.get('recommended_focus_areas', [])
            
            return jsonify({
                'totalSessions': total_sessions,
                'streak': streak,
                'averageMood': average_mood,
                'topicsCount': len(common_topics),
                'commonTopics': common_topics,
                'insights': insights,
                'recentSummaries': user_summaries[:5]  # Limit to 5 most recent
            })
            
    except Exception as e:
        logger.error(f"Error in analytics endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def calculate_user_streak(user_id):
    """Calculate consecutive days of user activity"""
    try:
        with app.app_context():
            # Get all session dates for user
            sessions = ChatSession.query.filter_by(user_id=user_id)\
                .order_by(ChatSession.started_at.desc()).all()
            
            if not sessions:
                return 0
            
            # Extract unique dates
            session_dates = set()
            for session in sessions:
                date = session.started_at.date()
                session_dates.add(date)
            
            # Sort dates in descending order
            sorted_dates = sorted(session_dates, reverse=True)
            
            # Calculate streak
            today = datetime.utcnow().date()
            streak = 0
            
            for i, date in enumerate(sorted_dates):
                expected_date = today - timedelta(days=i)
                if date == expected_date:
                    streak += 1
                else:
                    break
            
            return streak
    except Exception as e:
        logger.error(f"Error calculating streak: {str(e)}")
        return 0

@app.route('/api/chat-summaries/<user_id>')
def get_chat_summaries(user_id):
    """Get chat summaries for user with GROQ-generated insights"""
    try:
        summaries = []
        if USE_DATABASE:
            with app.app_context():
                db_summaries = ChatSummary.query.filter_by(
                    user_id=user_id
                ).order_by(ChatSummary.created_at.desc()).limit(10).all()
                
                summaries = [summary.to_dict() for summary in db_summaries]
        else:
            # In-memory: return summaries for this user
            summaries = chat_summaries.get(user_id, [])
        
        return jsonify(summaries)
    except Exception as e:
        logger.error(f"Error in chat summaries endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/mood-data/<user_id>')
def get_mood_data(user_id):
    """Get user mood data for the last 7 days"""
    try:
        mood_data = []
        
        if USE_DATABASE:
            with app.app_context():
                # Get last 7 days of messages
                seven_days_ago = datetime.utcnow() - timedelta(days=7)
                
                # Group by date and calculate average sentiment
                for i in range(7):
                    date = datetime.utcnow() - timedelta(days=6-i)
                    start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
                    end_of_day = start_of_day + timedelta(days=1)
                    
                    daily_messages = ChatMessage.query.filter(
                        ChatMessage.user_id == user_id,
                        ChatMessage.sender == 'user',
                        ChatMessage.timestamp >= start_of_day,
                        ChatMessage.timestamp < end_of_day
                    ).all()
                    
                    if daily_messages:
                        sentiments = [msg.sentiment_score for msg in daily_messages if msg.sentiment_score is not None]
                        if sentiments:
                            avg_sentiment = sum(sentiments) / len(sentiments)
                            mood_value = round(((avg_sentiment + 1) * 5), 1)
                        else:
                            mood_value = 5.0  # Neutral
                    else:
                        mood_value = 5.0  # Neutral when no data
                    
                    mood_data.append({
                        'date': date.strftime('%m/%d'),
                        'value': mood_value
                    })
        else:
            # In-memory mood data - use sentiment from recent messages
            user_messages_list = [m for m in messages if m.get('user_id') == user_id and m.get('sender') == 'user']
            
            # Group messages by date
            messages_by_date = {}
            for msg in user_messages_list:
                msg_date = datetime.fromisoformat(msg.get('timestamp', datetime.utcnow().isoformat())).date()
                if msg_date not in messages_by_date:
                    messages_by_date[msg_date] = []
                messages_by_date[msg_date].append(msg.get('sentiment_score', 0))
            
            for i in range(7):
                date = datetime.utcnow() - timedelta(days=6-i)
                date_key = date.date()
                
                if date_key in messages_by_date:
                    daily_sentiments = [s for s in messages_by_date[date_key] if s is not None]
                    if daily_sentiments:
                        avg_sentiment = sum(daily_sentiments) / len(daily_sentiments)
                        mood_value = round(((avg_sentiment + 1) * 5), 1)
                    else:
                        mood_value = 5.0
                else:
                    mood_value = 5.0
                
                mood_data.append({
                    'date': date.strftime('%m/%d'),
                    'value': mood_value
                })
        
        return jsonify(mood_data)
        
    except Exception as e:
        logger.error(f"Error in mood data endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/recent-session/<user_id>')
def get_recent_session(user_id):
    """Get the most recent completed session for feedback"""
    try:
        if USE_DATABASE:
            with app.app_context():
                recent_session = ChatSession.query.filter(
                    ChatSession.user_id == user_id,
                    ChatSession.status == 'completed'
                ).order_by(ChatSession.ended_at.desc()).first()
                
                if recent_session:
                    # Get session summary info
                    messages_count = ChatMessage.query.filter_by(
                        session_id=recent_session.session_id
                    ).count()
                    
                    return jsonify({
                        'id': recent_session.session_id,
                        'title': f'Session from {recent_session.started_at.strftime("%B %d")}',
                        'date': recent_session.ended_at.strftime('%Y-%m-%d'),
                        'messages_count': messages_count
                    })
        
        return jsonify({'error': 'No recent sessions found'}), 404
        
    except Exception as e:
        logger.error(f"Error getting recent session: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route("/api/feedback", methods=["POST"])
def submit_feedback():
    if 'user_id' not in session:
        return jsonify({"error": "Not authenticated"}), 401
    
    user_id = session['user_id']
    data = request.get_json()
    
    if not data or 'rating' not in data:
        return jsonify({"error": "Rating is required"}), 400
    
    try:
        if USE_DATABASE:
            with app.app_context():
                # Get the session ID if provided
                session_id = data.get('sessionId')
                if not session_id:
                    # Get most recent completed session
                    recent_session = ChatSession.query.filter(
                        ChatSession.user_id == user_id,
                        ChatSession.status == 'completed'
                    ).order_by(ChatSession.ended_at.desc()).first()
                    
                    if recent_session:
                        session_id = recent_session.session_id
                
                feedback = Feedback(
                    feedback_id=generate_uuid(),
                    user_id=user_id,
                    session_id=session_id,
                    rating=data['rating'],
                    comments=data.get('message', ''),
                    suggestions=data.get('suggestions', ''),
                    category=data.get('category', '')
                )
                db.session.add(feedback)
                db.session.commit()
                
                return jsonify({"message": "Feedback submitted successfully"}), 200
        else:
            return jsonify({"message": "Feedback submitted successfully"}), 200
            
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}")
        return jsonify({"error": "An error occurred while submitting feedback"}), 500

# Enhanced Chat History Endpoints

@app.route('/api/sessions/<user_id>')
def get_user_sessions(user_id):
    """Return all chat sessions for a user, sorted by most recent, with session metadata and preview."""
    try:
        sessions_list = []
        if USE_DATABASE:
            with app.app_context():
                sessions = ChatSession.query.filter_by(user_id=user_id).order_by(ChatSession.started_at.desc()).all()
                for session in sessions:
                    # Get last message for preview
                    last_msg = ChatMessage.query.filter_by(session_id=session.session_id).order_by(ChatMessage.timestamp.desc()).first()
                    preview = last_msg.message_text[:60] + ('...' if last_msg and len(last_msg.message_text) > 60 else '') if last_msg else ''
                    
                    # Get summary if available
                    summary = ChatSummary.query.filter_by(session_id=session.session_id).first()
                    
                    sessions_list.append({
                        'session_id': session.session_id,
                        'status': session.status,
                        'started_at': session.started_at.isoformat() if session.started_at else None,
                        'ended_at': session.ended_at.isoformat() if session.ended_at else None,
                        'preview': preview,
                        'title': summary.title if summary else f"Session {session.started_at.strftime('%m/%d %H:%M')}",
                        'summary': summary.summary if summary else None,
                        'mood': summary.mood if summary else None
                    })
        else:
            # Enhanced in-memory session handling
            for session_id, session in chat_sessions.items():
                if session.get('user_id') == user_id:
                    session_messages = [m for m in messages if m.get('session_id') == session_id]
                    last_msg = session_messages[-1] if session_messages else None
                    preview = last_msg.get('message_text', '')[:60] + ('...' if last_msg and len(last_msg.get('message_text', '')) > 60 else '') if last_msg else ''
                    
                    # Get summary if available
                    user_summaries = chat_summaries.get(user_id, [])
                    summary = next((s for s in user_summaries if s.get('session_id') == session_id), None)
                    
                    sessions_list.append({
                        'session_id': session_id,
                        'status': session.get('status', 'active'),
                        'started_at': session.get('started_at'),
                        'ended_at': session.get('ended_at'),
                        'preview': preview,
                        'title': summary.get('title') if summary else f"Session {session_id[:8]}",
                        'summary': summary.get('summary') if summary else None,
                        'mood': summary.get('mood') if summary else None
                    })
            
            # Sort by most recent first
            sessions_list.sort(key=lambda x: x.get('started_at', ''), reverse=True)
        return jsonify({'sessions': sessions_list})
    except Exception as e:
        logger.error(f"Error fetching user sessions: {str(e)}")
        return jsonify({'sessions': [], 'error': 'Failed to fetch sessions'}), 500

@app.route('/api/session/<session_id>/messages')
def get_session_messages(session_id):
    """Get all messages for a specific session"""
    try:
        if USE_DATABASE:
            with app.app_context():
                messages_data = ChatMessage.query.filter_by(
                    session_id=session_id
                ).order_by(ChatMessage.timestamp.asc()).all()
                
                formatted_messages = []
                for msg in messages_data:
                    formatted_messages.append({
                        'id': msg.message_id,
                        'message_text': msg.message_text,
                        'sender': msg.sender,
                        'timestamp': msg.timestamp.isoformat(),
                        'sentiment_score': msg.sentiment_score
                    })
                
                return jsonify({'messages': formatted_messages})
        else:
            # In-memory fallback
            session_messages = [m for m in messages if m.get('session_id') == session_id]
            return jsonify({'messages': session_messages})
            
    except Exception as e:
        logger.error(f"Error getting session messages: {str(e)}")
        return jsonify({'messages': [], 'error': 'Failed to fetch messages'}), 500

# Health check endpoint
@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'features': {
            'database': USE_DATABASE,
            'oauth': True,
            'ai': emotion_analyzer is not None,
            'nlp': response_generator is not None,
            'groq': client is not None
        }
    })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    logger.warning(f"404 error: {request.url}")
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"500 error: {str(error)}", exc_info=True)
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(Exception)
def handle_exception(error):
    logger.error(f"Unhandled exception: {str(error)}", exc_info=True)
    return jsonify({'error': 'An unexpected error occurred'}), 500

# Add request logging middleware
@app.before_request
def log_request_info():
    logger.info(f"Request: {request.method} {request.url}")
    if request.is_json:
        logger.debug(f"Request body: {request.get_json()}")

@app.after_request
def log_response_info(response):
    logger.info(f"Response: {response.status}")
    return response

if __name__ == '__main__':
    app.run(debug=True, port=5000)
