from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
import uuid

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    user_id = db.Column(db.CHAR(36), primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    is_verified = db.Column(db.Boolean, default=False)
    auth_method = db.Column(db.Enum('email', 'oauth', name='auth_method_enum'), default='email')
    
    # Relationships
    profile = db.relationship('UserProfile', backref='user', uselist=False)
    preferences = db.relationship('UserPreferences', backref='user', uselist=False)
    chat_sessions = db.relationship('ChatSession', backref='user', lazy=True)
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'email': self.email,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'is_verified': self.is_verified,
            'auth_method': self.auth_method
        }

class UserProfile(db.Model):
    __tablename__ = 'user_profiles'
    
    profile_id = db.Column(db.CHAR(36), primary_key=True)
    user_id = db.Column(db.CHAR(36), db.ForeignKey('users.user_id', ondelete='CASCADE'), unique=True)
    screen_name = db.Column(db.String(100))
    pronouns = db.Column(db.String(50))
    identity_goals = db.Column(db.Text)
    focus_area = db.Column(db.Text)
    profile_created_at = db.Column(db.DateTime, default=datetime.utcnow)
    profile_updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'profile_id': self.profile_id,
            'user_id': self.user_id,
            'screen_name': self.screen_name,
            'pronouns': self.pronouns,
            'identity_goals': self.identity_goals,
            'focus_area': self.focus_area,
            'profile_created_at': self.profile_created_at.isoformat(),
            'profile_updated_at': self.profile_updated_at.isoformat()
        }

class ChatSession(db.Model):
    __tablename__ = 'chat_sessions'
    
    session_id = db.Column(db.CHAR(36), primary_key=True)
    user_id = db.Column(db.CHAR(36), db.ForeignKey('users.user_id', ondelete='CASCADE'))
    chat_mode = db.Column(db.Enum('mentor', 'best_friend', 'challenge', name='chat_mode_enum'), default='mentor')
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime)
    status = db.Column(db.Enum('active', 'completed', 'abandoned', name='session_status_enum'), default='active')
    title = db.Column(db.String(200), nullable=True)
    
    # Relationships
    messages = db.relationship('ChatMessage', backref='session', lazy=True)
    feedback = db.relationship('Feedback', backref='session', uselist=False)
    summary = db.relationship('ChatSummary', backref='session', uselist=False)
    
    def to_dict(self):
        return {
            'session_id': self.session_id,
            'user_id': self.user_id,
            'chat_mode': self.chat_mode,
            'started_at': self.started_at.isoformat(),
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'status': self.status,
            'title': self.title
        }

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    message_id = db.Column(db.CHAR(36), primary_key=True)
    session_id = db.Column(db.CHAR(36), db.ForeignKey('chat_sessions.session_id', ondelete='CASCADE'))
    user_id = db.Column(db.CHAR(36), db.ForeignKey('users.user_id', ondelete='CASCADE'))
    sender = db.Column(db.Enum('user', 'M', name='sender_enum'), nullable=False)
    message_text = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    sentiment_score = db.Column(db.Float)
    response_quality = db.Column(db.Enum('good', 'neutral', 'needs_improvement', name='response_quality_enum'))
    
    def to_dict(self):
        return {
            'message_id': self.message_id,
            'session_id': self.session_id,
            'user_id': self.user_id,
            'sender': self.sender,
            'message_text': self.message_text,
            'timestamp': self.timestamp.isoformat(),
            'sentiment_score': self.sentiment_score,
            'response_quality': self.response_quality
        }

class Feedback(db.Model):
    __tablename__ = 'feedback'
    
    feedback_id = db.Column(db.CHAR(36), primary_key=True)
    user_id = db.Column(db.CHAR(36), db.ForeignKey('users.user_id', ondelete='CASCADE'))
    session_id = db.Column(db.CHAR(36), db.ForeignKey('chat_sessions.session_id', ondelete='SET NULL'))
    rating = db.Column(db.Integer)
    comments = db.Column(db.Text)
    suggestions = db.Column(db.Text)
    category = db.Column(db.String(100))
    feedback_time = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'feedback_id': self.feedback_id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'rating': self.rating,
            'comments': self.comments,
            'suggestions': self.suggestions,
            'category': self.category,
            'feedback_time': self.feedback_time.isoformat()
        }

class UserPreferences(db.Model):
    __tablename__ = 'user_preferences'
    
    preference_id = db.Column(db.CHAR(36), primary_key=True)
    user_id = db.Column(db.CHAR(36), db.ForeignKey('users.user_id', ondelete='CASCADE'))
    preferred_response_length = db.Column(db.Enum('short', 'medium', 'detailed', name='response_length_enum'), default='medium')
    preferred_communication_style = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'preference_id': self.preference_id,
            'user_id': self.user_id,
            'preferred_response_length': self.preferred_response_length,
            'preferred_communication_style': self.preferred_communication_style,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class TrainingData(db.Model):
    """Model to store processed training examples for RAG"""
    __tablename__ = 'training_data'
    
    id = db.Column(db.Integer, primary_key=True)
    intent_category = db.Column(db.String(50), nullable=False)
    user_input = db.Column(db.Text, nullable=False)
    response_text = db.Column(db.Text, nullable=False)
    emotional_tone = db.Column(db.String(50), nullable=False)
    context_tags = db.Column(db.Text, nullable=True)  # Stored as JSON
    embedding = db.Column(db.Text, nullable=True)  # Stored as JSON

class ChatSummary(db.Model):
    """Enhanced model to store GROQ-generated chat summaries with detailed analysis"""
    __tablename__ = 'chat_summaries'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.CHAR(36), db.ForeignKey('chat_sessions.session_id', ondelete='CASCADE'), unique=True)
    user_id = db.Column(db.CHAR(36), db.ForeignKey('users.user_id', ondelete='CASCADE'))
    
    # Basic summary fields
    title = db.Column(db.String(200))
    summary = db.Column(db.Text)
    mood = db.Column(db.Enum('positive', 'neutral', 'negative', name='mood_enum'))
    tags = db.Column(db.Text)  # JSON string of key topics
    date = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Enhanced GROQ analysis fields
    analysis_data = db.Column(db.Text)  # Full JSON analysis from GROQ
    key_insights = db.Column(db.Text)  # Key insights extracted
    emotional_journey = db.Column(db.Text)  # User's emotional progression
    action_items = db.Column(db.Text)  # Suggested next steps
    session_quality_score = db.Column(db.Integer)  # 1-10 rating
    
    # Metrics for dashboard
    user_engagement_level = db.Column(db.String(20))  # high, medium, low
    breakthrough_moments = db.Column(db.Text)  # JSON array of significant moments
    topics_explored = db.Column(db.Text)  # JSON array of detailed topics
    
    def to_dict(self):
        analysis = {}
        if self.analysis_data:
            try:
                analysis = json.loads(self.analysis_data)
            except:
                pass
                
        return {
            'id': self.id,
            'session_id': self.session_id,
            'user_id': self.user_id,
            'title': self.title,
            'summary': self.summary,
            'mood': self.mood,
            'tags': json.loads(self.tags) if self.tags else [],
            'date': self.date,
            'created_at': self.created_at.isoformat(),
            'key_insights': self.key_insights,
            'emotional_journey': self.emotional_journey,
            'action_items': json.loads(self.action_items) if self.action_items else [],
            'session_quality_score': self.session_quality_score,
            'user_engagement_level': self.user_engagement_level,
            'breakthrough_moments': json.loads(self.breakthrough_moments) if self.breakthrough_moments else [],
            'topics_explored': json.loads(self.topics_explored) if self.topics_explored else [],
            'full_analysis': analysis
        }

class UserAnalytics(db.Model):
    """Model to store aggregated user analytics and insights"""
    __tablename__ = 'user_analytics'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.CHAR(36), db.ForeignKey('users.user_id', ondelete='CASCADE'))
    
    # Time-based metrics
    week_of = db.Column(db.Date)  # Week this analytics record represents
    total_sessions = db.Column(db.Integer, default=0)
    total_messages = db.Column(db.Integer, default=0)
    average_session_length = db.Column(db.Float)  # in minutes
    
    # Engagement metrics
    user_satisfaction_avg = db.Column(db.Float)  # from feedback
    response_quality_avg = db.Column(db.Float)
    topic_diversity_score = db.Column(db.Float)  # how many different topics explored
    
    # Emotional journey metrics
    mood_trend = db.Column(db.String(20))  # improving, stable, declining
    emotional_stability_score = db.Column(db.Float)
    breakthrough_count = db.Column(db.Integer, default=0)
    
    # Growth indicators
    goal_progress_score = db.Column(db.Float)  # progress towards stated goals
    insight_depth_score = db.Column(db.Float)  # depth of insights gained
    resilience_indicators = db.Column(db.Text)  # JSON array of resilience signs
    
    # Recommendations
    recommended_topics = db.Column(db.Text)  # JSON array
    suggested_frequency = db.Column(db.String(20))  # daily, weekly, etc.
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'week_of': self.week_of.isoformat() if self.week_of else None,
            'total_sessions': self.total_sessions,
            'total_messages': self.total_messages,
            'average_session_length': self.average_session_length,
            'user_satisfaction_avg': self.user_satisfaction_avg,
            'response_quality_avg': self.response_quality_avg,
            'topic_diversity_score': self.topic_diversity_score,
            'mood_trend': self.mood_trend,
            'emotional_stability_score': self.emotional_stability_score,
            'breakthrough_count': self.breakthrough_count,
            'goal_progress_score': self.goal_progress_score,
            'insight_depth_score': self.insight_depth_score,
            'resilience_indicators': json.loads(self.resilience_indicators) if self.resilience_indicators else [],
            'recommended_topics': json.loads(self.recommended_topics) if self.recommended_topics else [],
            'suggested_frequency': self.suggested_frequency,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class ConversationTheme(db.Model):
    """Model to track recurring themes across conversations"""
    __tablename__ = 'conversation_themes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.CHAR(36), db.ForeignKey('users.user_id', ondelete='CASCADE'))
    
    theme_name = db.Column(db.String(100))  # e.g., "Identity Exploration", "Anxiety Management"
    theme_category = db.Column(db.String(50))  # e.g., "Mental Health", "Personal Growth"
    
    # Frequency and evolution
    occurrence_count = db.Column(db.Integer, default=1)
    first_mentioned = db.Column(db.DateTime)
    last_mentioned = db.Column(db.DateTime)
    evolution_notes = db.Column(db.Text)  # How the theme has evolved
    
    # Associated sessions
    related_sessions = db.Column(db.Text)  # JSON array of session IDs
    
    # Progress indicators
    progress_level = db.Column(db.String(20))  # beginning, developing, advanced
    breakthrough_sessions = db.Column(db.Text)  # JSON array of breakthrough session IDs
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'theme_name': self.theme_name,
            'theme_category': self.theme_category,
            'occurrence_count': self.occurrence_count,
            'first_mentioned': self.first_mentioned.isoformat() if self.first_mentioned else None,
            'last_mentioned': self.last_mentioned.isoformat() if self.last_mentioned else None,
            'evolution_notes': self.evolution_notes,
            'related_sessions': json.loads(self.related_sessions) if self.related_sessions else [],
            'progress_level': self.progress_level,
            'breakthrough_sessions': json.loads(self.breakthrough_sessions) if self.breakthrough_sessions else [],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
