# M-bot - AI Therapy Bot

<div align="center">
  <img src="public/newlogo.jpg" alt="M-bot Logo" width="150" height="150">
  
  **AI-powered therapy bot for mental health support and emotional well-being**
  
  [![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/Salman1205/M-bot)
  [![Live Demo](https://img.shields.io/badge/Live-Demo-green)](https://salman1205.github.io/M-bot/)
</div>

## Demo Video

See M-bot therapy sessions in action with this complete walkthrough:

![M-bot Demo](M-bot.gif)

*Demo showing the workflow from patient registration to AI therapeutic conversation*

## Overview

M-bot is an AI-powered therapy bot designed to provide accessible mental health support and emotional guidance. The application combines advanced natural language processing with an intuitive user interface to offer personalized therapeutic conversations and mental wellness support.

## Key Features

- **AI-Powered Therapy Sessions**: Advanced NLP for empathetic, therapeutic conversations
- **Patient Profile Management**: Personalized mental health tracking and session history
- **Real-time Chat Interface**: Instant therapeutic support with conversation continuity
- **Progressive Web App**: 24/7 accessibility across all devices with offline support
- **Secure & Confidential**: HIPAA-compliant data handling for patient privacy
- **Responsive Design**: Optimized user experience for therapy sessions on any device

## Technology Stack

### Backend
- **Python 3.8+** with Flask framework
- **SQLite** database with SQLAlchemy ORM
- **Custom NLP Module** for therapeutic AI responses
- **Flask-Session** for secure patient session management

### Frontend
- **React.js** for dynamic user interface
- **Progressive Web App (PWA)** capabilities
- **Responsive CSS** for cross-device compatibility
- **Modern JavaScript (ES6+)**

## Architecture

```
M-bot/
├── Backend/
│   ├── app.py              # Main Flask application
│   ├── models.py           # Database models and schemas
│   ├── nlp_module.py       # AI processing engine
│   ├── reqs.txt           # Python dependencies
│   └── chat_data.db       # SQLite database
│
├── Frontend/
│   ├── public/            # Static assets and PWA configuration
│   ├── src/               # React components and application logic
│   ├── package.json       # Node.js dependencies
│   └── build/             # Production build files
│
└── Documentation/
    └── README.md          # Project documentation
```

## Installation and Setup

### Prerequisites
- Python 3.8 or higher
- Node.js 14.0 or higher
- npm package manager

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Salman1205/M-bot.git
   cd M-bot
   ```

2. Create and activate virtual environment:
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r reqs.txt
   ```

4. **Configure Environment Variables:**
   ```bash
   # Create .env file
   touch .env
   
   # Add your API keys to .env file:
   echo "GROQ_API_KEY=your_actual_groq_api_key" >> .env
   echo "SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')" >> .env
   echo "JWT_SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')" >> .env
   echo "FLASK_ENV=development" >> .env
   echo "FLASK_APP=app.py" >> .env
   ```

5. Initialize database:
   ```bash
   python models.py
   ```

6. Start Flask server:
   ```bash
   python app.py
   ```

### Frontend Setup

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000` with the backend API running on `http://localhost:5000`.

## Deployment

### Frontend Deployment
The frontend is configured for deployment on GitHub Pages:

```bash
npm run build
npm run deploy
```

### Backend Deployment
For production deployment, consider platforms like Render, Heroku, or AWS:

1. Install production WSGI server:
   ```bash
   pip install gunicorn
   ```

2. Create Procfile for deployment:
   ```
   web: gunicorn app:app
   ```

## Usage

1. **Patient Registration**: Create a secure patient account
2. **Profile Setup**: Configure therapeutic preferences and mental health goals
3. **Therapy Sessions**: Begin therapeutic conversations with the AI bot
4. **Session Management**: Access therapy history and mental wellness progress tracking

## API Documentation

### Authentication Endpoints
- `POST /register` - Patient registration
- `POST /login` - Patient authentication
- `POST /logout` - Session termination

### Therapy Endpoints
- `POST /chat` - Send message to therapy bot
- `GET /history` - Retrieve therapy session history
- `DELETE /history` - Clear therapy conversation data

### Patient Profile Endpoints
- `GET /profile` - Retrieve patient profile
- `PUT /profile` - Update patient information and preferences

## Development

### Code Structure
- Follow PEP 8 standards for Python code
- Use ESLint configuration for JavaScript
- Implement proper error handling and logging
- Maintain comprehensive test coverage

### Contributing
1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Submit pull request

## Security Considerations

- Patient data encryption and HIPAA-compliant secure storage
- Input validation and sanitization for therapeutic content
- CSRF protection implementation
- Secure patient session management
- Regular security audits and healthcare compliance updates

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

For technical support, bug reports, or feature requests:
- GitHub Issues: [Report Issues](https://github.com/Salman1205/M-bot/issues)
- Documentation: [Project Wiki](https://github.com/Salman1205/M-bot/wiki)

---

**M-bot AI Therapy Bot** - Professional AI-powered mental health support platform 