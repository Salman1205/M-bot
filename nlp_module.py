"""
Enhanced NLP Module for M-bot with User Profile Integration

This module provides sentiment analysis, intent classification, and RAG capabilities
with enhanced user profile integration for personalized responses.
"""

import json
import re
import os
import logging
from typing import Dict, List, Tuple, Optional, Any
from collections import Counter
from datetime import datetime
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class EmotionAnalyzer:
    """
    Enhanced analyzer that considers user profile and conversation history
    for more personalized emotional understanding.
    """
    
    # Emotion categories mapped to keywords
    EMOTION_KEYWORDS = {
        "anxiety": ["anxious", "worried", "nervous", "panic", "stress", "fear", "scared", "uneasy", "overwhelmed"],
        "sadness": ["sad", "depressed", "unhappy", "miserable", "grief", "heartbroken", "disappointed", "lonely", "down"],
        "anger": ["angry", "frustrated", "annoyed", "irritated", "mad", "upset", "furious", "resentful", "pissed"],
        "confusion": ["confused", "uncertain", "unsure", "lost", "unclear", "doubt", "puzzled", "perplexed", "mixed up"],
        "hope": ["hopeful", "optimistic", "positive", "looking forward", "excited", "eager", "anticipate", "confident"],
        "joy": ["happy", "joyful", "delighted", "pleased", "content", "cheerful", "thrilled", "grateful", "elated"],
        "fear": ["afraid", "terrified", "scared", "fearful", "dread", "horror", "panic", "phobia", "worried"],
        "shame": ["ashamed", "embarrassed", "guilty", "humiliated", "mortified", "regretful"],
        "pride": ["proud", "accomplished", "achieved", "successful", "satisfied", "fulfilled"],
        "love": ["love", "adore", "cherish", "affection", "care", "devoted", "attached"],
        "loneliness": ["lonely", "isolated", "alone", "disconnected", "abandoned", "excluded"]
    }
    
    # Enhanced intent categories
    INTENT_CATEGORIES = [
        "Identity Affirmation", 
        "Gender Affirmation", 
        "Well-Being", 
        "Spiritual Growth", 
        "Relationships",
        "Career & Goals",
        "Family Dynamics",
        "Self-Esteem",
        "Trauma Processing",
        "Daily Support"
    ]
    
    # Response tones with user profile considerations
    RESPONSE_TONES = [
        "Supportive & Reassuring",
        "Empowering & Reflective", 
        "Encouraging & Safe",
        "Affirming & Motivational",
        "Calm & Grounding",
        "Gentle & Suggestive",
        "Explorative & Reflective",
        "Guided & Meditative",
        "Compassionate & Understanding",
        "Coaching & Practical",
        "Celebrating & Validating",
        "Protective & Nurturing"
    ]
    
    # Enhanced training data with user profile variables
    TRAINING_DATA = [
        {
            "intent_category": "Identity Affirmation",
            "user_input": "I feel lost about who I am.",
            "response_variations": [
                {
                    "text": "Exploring your identity is a brave journey, {name}. What aspects of yourself feel unclear right now?",
                    "emotional_tone": "Supportive & Reassuring",
                    "user_variables": ["name"]
                },
                {
                    "text": "It's completely okay to feel uncertain about identity. Given your goals around {identity_goals}, what feels most authentic to you?",
                    "emotional_tone": "Supportive & Reassuring", 
                    "user_variables": ["identity_goals"]
                }
            ],
            "context_tags": ["identity", "self-discovery", "uncertainty", "personal growth"]
        },
        {
            "intent_category": "Gender Affirmation",
            "user_input": "I want to express my true gender but I feel scared.",
            "response_variations": [
                {
                    "text": "Your feelings are completely valid, {name}. Using {pronouns} feels right to you - what's one small step you could take today to honor that?",
                    "emotional_tone": "Encouraging & Safe",
                    "user_variables": ["name", "pronouns"]
                },
                {
                    "text": "Fear around gender expression is natural. What would feel like a safe way to explore your authentic self?",
                    "emotional_tone": "Encouraging & Safe",
                    "user_variables": []
                }
            ],
            "context_tags": ["gender", "fear", "expression", "authenticity"]
        },
        {
            "intent_category": "Well-Being",
            "user_input": "I'm struggling with anxiety.",
            "response_variations": [
                {
                    "text": "Anxiety can feel overwhelming, {name}. Since you prefer {response_length} responses, let me offer a grounding technique that might help.",
                    "emotional_tone": "Calm & Grounding",
                    "user_variables": ["name", "response_length"]
                },
                {
                    "text": "I hear you. Given that you're focusing on {focus_area}, would you like to try a breathing exercise together?",
                    "emotional_tone": "Calm & Grounding",
                    "user_variables": ["focus_area"]
                }
            ],
            "context_tags": ["anxiety", "mental health", "coping", "wellness"]
        },
        {
            "intent_category": "Relationships",
            "user_input": "My relationships feel strained.",
            "response_variations": [
                {
                    "text": "Relationship challenges are tough, {name}. How do others typically respond when you express yourself authentically?",
                    "emotional_tone": "Compassionate & Understanding",
                    "user_variables": ["name"]
                },
                {
                    "text": "It sounds difficult. What aspects of communication feel most challenging for you right now?",
                    "emotional_tone": "Compassionate & Understanding",
                    "user_variables": []
                }
            ],
            "context_tags": ["relationships", "communication", "strain", "support"]
        }
    ]
    
    def __init__(self, groq_client=None):
        """Initialize the enhanced EmotionAnalyzer with GROQ integration."""
        self.groq_client = groq_client
        self._process_training_data()
        
    def _process_training_data(self):
        """Process training data for enhanced RAG retrieval."""
        self.processed_examples = []
        
        for example in self.TRAINING_DATA:
            self.processed_examples.append({
                "intent": example["intent_category"],
                "user_input": example["user_input"],
                "responses": [v["text"] for v in example["response_variations"]],
                "tones": [v["emotional_tone"] for v in example["response_variations"]],
                "user_variables": [v.get("user_variables", []) for v in example["response_variations"]],
                "tags": example.get("context_tags", [])
            })
    
    def analyze_message_with_context(self, text: str, user_profile: Dict = None, conversation_history: List = None) -> Dict[str, Any]:
        """
        Enhanced message analysis that considers user profile and conversation context.
        """
        # Basic emotion and intent analysis
        emotions = self.detect_emotion(text)
        intent, intent_confidence = self.classify_intent(text)
        
        # Enhanced analysis with user context
        if user_profile:
            # Adjust analysis based on user's stated goals and focus areas
            emotions = self._adjust_emotions_for_user_context(emotions, user_profile)
            intent = self._refine_intent_with_user_profile(intent, text, user_profile)
        
        # Conversation history analysis
        emotional_trajectory = self._analyze_emotional_trajectory(conversation_history) if conversation_history else {}
        
        # Get dominant emotion
        dominant_emotion = max(emotions.items(), key=lambda x: x[1]) if emotions else ("neutral", 0.5)
        
        # Suggest appropriate response tone considering user preferences
        tone = self.suggest_response_tone_enhanced(intent, emotions, user_profile)
        
        # Retrieve similar examples with user context
        examples = self.retrieve_similar_examples_enhanced(text, intent, user_profile)
        
        return {
            "intent": intent,
            "intent_confidence": intent_confidence,
            "emotions": emotions,
            "dominant_emotion": dominant_emotion[0],
            "emotion_intensity": dominant_emotion[1],
            "suggested_tone": tone,
            "similar_examples": examples,
            "emotional_trajectory": emotional_trajectory,
            "user_context_applied": bool(user_profile)
        }
    
    def _adjust_emotions_for_user_context(self, emotions: Dict[str, float], user_profile: Dict) -> Dict[str, float]:
        """Adjust emotion detection based on user's profile and stated challenges."""
        focus_areas = user_profile.get('focus_area', '').lower()
        identity_goals = user_profile.get('identity_goals', '').lower()
        
        # Boost certain emotions if they align with user's stated focus areas
        if 'anxiety' in focus_areas and 'anxiety' in emotions:
            emotions['anxiety'] = min(emotions['anxiety'] * 1.2, 1.0)
        
        if 'identity' in identity_goals or 'self-discovery' in identity_goals:
            if 'confusion' in emotions:
                emotions['confusion'] = min(emotions['confusion'] * 1.1, 1.0)
        
        if 'confidence' in focus_areas and 'shame' in emotions:
            emotions['shame'] = min(emotions['shame'] * 1.1, 1.0)
        
        return emotions
    
    def _refine_intent_with_user_profile(self, intent: str, text: str, user_profile: Dict) -> str:
        """Refine intent classification based on user's profile."""
        focus_areas = user_profile.get('focus_area', '').lower()
        identity_goals = user_profile.get('identity_goals', '').lower()
        
        # If the detected intent is generic but user has specific focus areas, refine it
        if intent == "Well-Being":
            if 'identity' in focus_areas or 'gender' in focus_areas:
                if any(word in text.lower() for word in ['who am i', 'myself', 'identity', 'authentic']):
                    return "Identity Affirmation"
            if 'relationship' in focus_areas:
                if any(word in text.lower() for word in ['people', 'others', 'friends', 'family']):
                    return "Relationships"
        
        return intent
    
    def _analyze_emotional_trajectory(self, conversation_history: List) -> Dict[str, Any]:
        """Analyze emotional patterns across the conversation."""
        if not conversation_history:
            return {}
        
        # Extract emotional content from recent messages
        recent_emotions = []
        for exchange in conversation_history[-5:]:  # Last 5 exchanges
            if 'user' in exchange:
                emotions = self.detect_emotion(exchange['user'])
                if emotions:
                    dominant = max(emotions.items(), key=lambda x: x[1])
                    recent_emotions.append(dominant)
        
        if not recent_emotions:
            return {}
        
        # Analyze trajectory
        emotion_names = [e[0] for e in recent_emotions]
        emotion_intensities = [e[1] for e in recent_emotions]
        
        # Determine if emotions are improving, declining, or stable
        if len(emotion_intensities) >= 3:
            trend = "stable"
            if emotion_intensities[-1] > emotion_intensities[0]:
                trend = "improving"
            elif emotion_intensities[-1] < emotion_intensities[0]:
                trend = "declining"
        else:
            trend = "insufficient_data"
        
        return {
            "trend": trend,
            "dominant_emotions": emotion_names,
            "average_intensity": np.mean(emotion_intensities) if emotion_intensities else 0,
            "consistency": len(set(emotion_names)) / len(emotion_names) if emotion_names else 0
        }
    
    def suggest_response_tone_enhanced(self, intent: str, emotions: Dict[str, float], user_profile: Dict = None) -> str:
        """Enhanced tone suggestion considering user preferences."""
        # Base tone suggestion
        base_tone = self.suggest_response_tone(intent, emotions)
        
        if not user_profile:
            return base_tone
        
        # Adjust based on user's communication preferences
        comm_style = user_profile.get('preferred_communication_style', '').lower()
        response_length = user_profile.get('preferred_response_length', 'medium')
        
        # User preference overrides
        if 'gentle' in comm_style or 'soft' in comm_style:
            return "Gentle & Suggestive"
        elif 'direct' in comm_style or 'straightforward' in comm_style:
            return "Coaching & Practical"
        elif 'encouraging' in comm_style or 'motivational' in comm_style:
            return "Affirming & Motivational"
        elif 'spiritual' in comm_style or 'mindful' in comm_style:
            return "Guided & Meditative"
        
        return base_tone
    
    def retrieve_similar_examples_enhanced(self, text: str, intent: str = None, user_profile: Dict = None, top_k: int = 2) -> List[Dict]:
        """Enhanced example retrieval considering user profile."""
        examples = self.retrieve_similar_examples(text, intent, top_k)
        
        if not user_profile:
            return examples
        
        # Filter or prioritize examples that can use user profile variables
        enhanced_examples = []
        for example in examples:
            # Check if example can be personalized with available user data
            for i, response in enumerate(example.get('responses', [])):
                user_vars = example.get('user_variables', [])
                if i < len(user_vars):
                    available_vars = []
                    for var in user_vars[i]:
                        if var in ['name'] and user_profile.get('screen_name'):
                            available_vars.append(var)
                        elif var in ['pronouns'] and user_profile.get('pronouns'):
                            available_vars.append(var)
                        elif var in ['identity_goals'] and user_profile.get('identity_goals'):
                            available_vars.append(var)
                        elif var in ['focus_area'] and user_profile.get('focus_area'):
                            available_vars.append(var)
                        elif var in ['response_length'] and user_profile.get('preferred_response_length'):
                            available_vars.append(var)
                    
                    example['available_personalization'] = available_vars
            
            enhanced_examples.append(example)
        
        return enhanced_examples
    
    def detect_emotion(self, text: str) -> Dict[str, float]:
        """Enhanced emotion detection with improved accuracy."""
        text = text.lower()
        results = {}
        
        # Count keywords for each emotion with contextual weighting
        for emotion, keywords in self.EMOTION_KEYWORDS.items():
            count = 0
            for keyword in keywords:
                if keyword in text:
                    # Weight longer, more specific keywords higher
                    weight = len(keyword.split()) * 1.2 if len(keyword.split()) > 1 else 1.0
                    count += weight
            
            # Normalize to 0-1 score
            score = min(count / 3, 1.0)  # Adjusted threshold for better sensitivity
            if score > 0.1:  # Lower threshold to catch subtler emotions
                results[emotion] = score
        
        # If no emotions detected, check for subtle indicators
        if not results:
            subtle_indicators = {
                "uncertainty": ["maybe", "perhaps", "not sure", "i think", "might be"],
                "stress": ["busy", "tired", "exhausted", "overwhelmed", "pressure"],
                "contentment": ["okay", "fine", "alright", "good", "well"]
            }
            
            for indicator, words in subtle_indicators.items():
                if any(word in text for word in words):
                    emotion_map = {
                        "uncertainty": "confusion",
                        "stress": "anxiety", 
                        "contentment": "joy"
                    }
                    results[emotion_map[indicator]] = 0.3
        
        # Default neutral if still nothing detected
        if not results:
            results["neutral"] = 0.5
            
        return results
    
    def classify_intent(self, text: str) -> Tuple[str, float]:
        """Enhanced intent classification with better accuracy."""
        if self.groq_client:
            try:
                intent, confidence = self._classify_intent_with_llm(text)
                if intent in self.INTENT_CATEGORIES and confidence > 0.4:  # Lower threshold
                    return intent, confidence
            except Exception as e:
                logger.error(f"Error in LLM intent classification: {str(e)}")
        
        # Enhanced fallback classification
        intent_keywords = {
            "Identity Affirmation": ["identity", "who am i", "myself", "authentic", "real me", "true self"],
            "Gender Affirmation": ["gender", "pronouns", "transition", "expression", "masculine", "feminine", "non-binary"],
            "Well-Being": ["anxiety", "stress", "depression", "mental health", "wellbeing", "coping"],
            "Spiritual Growth": ["spiritual", "mindfulness", "meditation", "purpose", "meaning", "growth"],
            "Relationships": ["relationship", "friends", "family", "partner", "social", "people"],
            "Career & Goals": ["work", "job", "career", "goals", "future", "ambition"],
            "Self-Esteem": ["confidence", "self-worth", "value", "deserve", "good enough"],
            "Daily Support": ["today", "feeling", "how are", "help", "support", "listen"]
        }
        
        text_lower = text.lower()
        intent_scores = {}
        
        for intent, keywords in intent_keywords.items():
            score = sum(1 for keyword in keywords if keyword in text_lower)
            if score > 0:
                intent_scores[intent] = score / len(keywords)
        
        if intent_scores:
            best_intent = max(intent_scores.items(), key=lambda x: x[1])
            return best_intent[0], best_intent[1]
        
        return "Daily Support", 0.5  # Default fallback
    
    def _classify_intent_with_llm(self, text: str) -> Tuple[str, float]:
        """Enhanced LLM-based intent classification."""
        prompt = f"""
        Analyze this message from a therapy/counseling context and classify the intent.
        
        User message: "{text}"
        
        Available intent categories:
        {", ".join(self.INTENT_CATEGORIES)}
        
        Consider:
        - The emotional undertone
        - What kind of support the person might need
        - The specific topic area they're addressing
        
        Return JSON with:
        1. "intent": the most appropriate category
        2. "confidence": score 0.0-1.0
        3. "reasoning": brief explanation
        """
        
        completion = self.groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert at analyzing emotional and psychological content in therapeutic conversations. Be precise and empathetic."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2,
            max_tokens=150
        )
        
        content = completion.choices[0].message.content
        
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            try:
                result_json = json.loads(json_match.group(0))
                intent = result_json.get("intent")
                confidence = result_json.get("confidence", 0.7)
                
                if intent in self.INTENT_CATEGORIES:
                    return (intent, float(confidence))
            except json.JSONDecodeError:
                logger.warning("Failed to parse JSON from LLM response")
        
        return ("Daily Support", 0.5)
    
    def suggest_response_tone(self, intent: str, emotions: Dict[str, float]) -> str:
        """Suggest appropriate response tone based on intent and emotions."""
        # Intent-based tone mapping
        intent_tone_map = {
            "Identity Affirmation": ["Supportive & Reassuring", "Empowering & Reflective"],
            "Gender Affirmation": ["Encouraging & Safe", "Affirming & Motivational"],
            "Well-Being": ["Calm & Grounding", "Gentle & Suggestive"],
            "Spiritual Growth": ["Explorative & Reflective", "Guided & Meditative"],
            "Relationships": ["Compassionate & Understanding", "Coaching & Practical"],
            "Career & Goals": ["Coaching & Practical", "Affirming & Motivational"],
            "Self-Esteem": ["Celebrating & Validating", "Empowering & Reflective"],
            "Daily Support": ["Supportive & Reassuring", "Compassionate & Understanding"]
        }
        
        suitable_tones = intent_tone_map.get(intent, self.RESPONSE_TONES)
        
        if emotions:
            dominant_emotion = max(emotions.items(), key=lambda x: x[1])[0]
            
            # Emotion-specific tone adjustments
            emotion_tone_map = {
                "anxiety": ["Calm & Grounding", "Supportive & Reassuring"],
                "fear": ["Protective & Nurturing", "Calm & Grounding"],
                "sadness": ["Compassionate & Understanding", "Gentle & Suggestive"],
                "anger": ["Calm & Grounding", "Compassionate & Understanding"],
                "shame": ["Celebrating & Validating", "Protective & Nurturing"],
                "confusion": ["Gentle & Suggestive", "Explorative & Reflective"],
                "hope": ["Affirming & Motivational", "Celebrating & Validating"],
                "joy": ["Celebrating & Validating", "Affirming & Motivational"]
            }
            
            preferred_tones = emotion_tone_map.get(dominant_emotion, suitable_tones)
            matching_tones = [tone for tone in preferred_tones if tone in suitable_tones]
            
            return matching_tones[0] if matching_tones else suitable_tones[0]
        
        return suitable_tones[0]
    
    def retrieve_similar_examples(self, text: str, intent: str = None, top_k: int = 2) -> List[Dict]:
        """Retrieve similar examples from training data."""
        input_words = set(text.lower().split())
        
        examples_with_scores = []
        for example in self.processed_examples:
            if intent and example["intent"] != intent:
                continue
                
            example_words = set(example["user_input"].lower().split())
            
            # Calculate similarity
            overlap = len(input_words.intersection(example_words))
            union = len(input_words.union(example_words))
            similarity = overlap / union if union > 0 else 0
            
            examples_with_scores.append((example, similarity))
        
        examples_with_scores.sort(key=lambda x: x[1], reverse=True)
        return [ex for ex, score in examples_with_scores[:top_k]]
    
    def analyze_message(self, text: str) -> Dict[str, Any]:
        """Basic message analysis for backward compatibility."""
        return self.analyze_message_with_context(text)


class ResponseGenerator:
    """
    Enhanced response generator with sophisticated user profile integration
    and GROQ-powered personalization.
    """
    
    def __init__(self, groq_client, emotion_analyzer):
        """Initialize the enhanced ResponseGenerator."""
        self.groq_client = groq_client
        self.emotion_analyzer = emotion_analyzer
    
    def generate_response(self, user_message: str, user_profile: Dict, conversation_history: List[Dict]) -> Dict[str, Any]:
        """
        Generate a highly personalized response using user profile and conversation context.
        """
        # Enhanced analysis with user context
        analysis = self.emotion_analyzer.analyze_message_with_context(
            user_message, user_profile, conversation_history
        )
        
        # Build comprehensive prompt with user context
        prompt = self._build_enhanced_prompt(user_message, user_profile, conversation_history, analysis)
        
        try:
            completion = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": prompt["system"]
                    },
                    {
                        "role": "user",
                        "content": prompt["user"]
                    }
                ],
                temperature=0.7,
                max_tokens=self._get_response_length(user_profile.get('preferred_response_length', 'medium'))
            )
            
            response_text = completion.choices[0].message.content
            
            # Apply final personalization
            response_text = self._apply_personalization_variables(response_text, user_profile)
            
            return {
                "response": response_text,
                "intent": analysis["intent"],
                "emotional_tone": analysis["suggested_tone"],
                "dominant_emotion": analysis["dominant_emotion"],
                "emotion_intensity": analysis["emotion_intensity"],
                "personalization_applied": True,
                "analysis": analysis
            }
            
        except Exception as e:
            logger.error(f"Error generating enhanced response: {str(e)}")
            return self._generate_fallback_response(user_message, user_profile, analysis)
    
    def _build_enhanced_prompt(self, user_message: str, user_profile: Dict, conversation_history: List[Dict], analysis: Dict) -> Dict[str, str]:
        """Build comprehensive prompt with user profile integration."""
        
        # Extract user information
        name = user_profile.get('screen_name', user_profile.get('name', 'friend'))
        pronouns = user_profile.get('pronouns', '')
        identity_goals = user_profile.get('identity_goals', '')
        focus_area = user_profile.get('focus_area', '')
        comm_style = user_profile.get('preferred_communication_style', '')
        response_length = user_profile.get('preferred_response_length', 'medium')
        
        # Build system prompt with comprehensive context
        system_prompt = f"""
        You are M, a highly empathetic and skilled identity mentor and therapeutic AI assistant. You are having a conversation with {name}.

        USER PROFILE:
        - Name: {name}
        - Pronouns: {pronouns if pronouns else 'not specified'}
        - Identity Goals: {identity_goals if identity_goals else 'general personal growth'}
        - Focus Areas: {focus_area if focus_area else 'general wellbeing'}
        - Communication Preference: {comm_style if comm_style else 'warm and supportive'}
        - Response Length Preference: {response_length}

        CONVERSATION CONTEXT:
        - Current Intent: {analysis['intent']}
        - Emotional State: {analysis['dominant_emotion']} (intensity: {analysis['emotion_intensity']:.2f})
        - Suggested Tone: {analysis['suggested_tone']}
        
        INSTRUCTIONS:
        1. Address {name} by name naturally in your response
        2. Use appropriate pronouns if provided: {pronouns if pronouns else 'use gender-neutral language'}
        3. Reference their goals/focus areas when relevant: {identity_goals or focus_area}
        4. Match the {analysis['suggested_tone']} tone
        5. Keep response length {response_length}
        6. Be warm, professional, and genuinely supportive
        7. Ask thoughtful follow-up questions when appropriate
        8. Validate their emotions and experiences
        
        Remember: You are creating a safe, non-judgmental space for personal growth and self-discovery.
        """
        
        # Build user context with conversation history
        conversation_context = ""
        if conversation_history:
            conversation_context = "\nRECENT CONVERSATION:\n"
            for exchange in conversation_history[-3:]:  # Last 3 exchanges
                if 'user' in exchange:
                    conversation_context += f"{name}: {exchange['user']}\n"
                if 'bot' in exchange:
                    conversation_context += f"M: {exchange['bot']}\n"
        
        # Emotional trajectory context
        emotional_context = ""
        if analysis.get('emotional_trajectory'):
            trajectory = analysis['emotional_trajectory']
            emotional_context = f"\nEMOTIONAL PATTERN: {trajectory.get('trend', 'stable')} trend observed in recent conversation."
        
        user_prompt = f"""
        {conversation_context}
        {emotional_context}
        
        Current message from {name}: "{user_message}"
        
        Please respond as M, keeping in mind {name}'s profile, emotional state, and conversation history.
        """
        
        return {
            "system": system_prompt,
            "user": user_prompt
        }
    
    def _get_response_length(self, preference: str) -> int:
        """Get token limit based on user preference."""
        length_map = {
            "short": 100,
            "medium": 300,
            "detailed": 500
        }
        return length_map.get(preference, 300)
    
    def _apply_personalization_variables(self, response: str, user_profile: Dict) -> str:
        """Apply final personalization touches to the response."""
        name = user_profile.get('screen_name', user_profile.get('name', ''))
        pronouns = user_profile.get('pronouns', '')
        
        # Ensure name is used appropriately
        if name and name.lower() not in response.lower():
            # Add name in a natural way if it's missing
            if response.startswith("I "):
                response = f"I hear you, {name}. " + response[2:]
            elif not any(greeting in response.lower() for greeting in [name.lower(), 'you']):
                response = f"{name}, " + response
        
        # Apply pronoun consistency if specified
        if pronouns:
            pronoun_map = self._get_pronoun_replacements(pronouns)
            for generic, specific in pronoun_map.items():
                response = re.sub(r'\b' + generic + r'\b', specific, response, flags=re.IGNORECASE)
        
        return response
    
    def _get_pronoun_replacements(self, pronouns: str) -> Dict[str, str]:
        """Get pronoun replacement mappings."""
        pronouns_lower = pronouns.lower().strip()
        
        if 'she/her' in pronouns_lower:
            return {'they': 'she', 'them': 'her', 'their': 'her', 'theirs': 'hers'}
        elif 'he/him' in pronouns_lower:
            return {'they': 'he', 'them': 'him', 'their': 'his', 'theirs': 'his'}
        elif 'they/them' in pronouns_lower:
            return {}  # Already using correct pronouns
        
        return {}
    
    def _generate_fallback_response(self, user_message: str, user_profile: Dict, analysis: Dict) -> Dict[str, Any]:
        """Generate a fallback response when GROQ fails."""
        name = user_profile.get('screen_name', user_profile.get('name', 'friend'))
        
        fallback_responses = {
            "Identity Affirmation": f"Thank you for sharing that with me, {name}. Exploring identity takes courage. What feels most important to you right now?",
            "Gender Affirmation": f"I hear you, {name}. Your feelings about your gender identity are valid. What would feel supportive to you today?",
            "Well-Being": f"I understand, {name}. Taking care of your mental health is important. How have you been coping lately?",
            "Relationships": f"Relationships can be complex, {name}. What aspect of this situation feels most challenging for you?",
            "Daily Support": f"Thanks for sharing, {name}. I'm here to listen. How are you feeling about everything right now?"
        }
        
        intent = analysis.get('intent', 'Daily Support')
        response = fallback_responses.get(intent, fallback_responses['Daily Support'])
        
        return {
            "response": response,
            "intent": intent,
            "emotional_tone": analysis.get('suggested_tone', 'Supportive & Reassuring'),
            "dominant_emotion": analysis.get('dominant_emotion', 'neutral'),
            "emotion_intensity": analysis.get('emotion_intensity', 0.5),
            "personalization_applied": True,
            "fallback_used": True
        }
