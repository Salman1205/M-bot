# M-bot - Identity Mentor

<div align="center">
  <img src="public/newlogo.jpg" alt="M-bot Logo" width="150" height="150">
  
  **Personal AI companion for identity exploration and emotional well-being**
  
  [![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/Salman1205/M-bot)
  [![Live Demo](https://img.shields.io/badge/Live-Demo-green)](https://salman1205.github.io/M-bot/)
</div>

## Demo Video

**[🎥 Watch Demo Video](https://github.com/Salman1205/M-bot/raw/master/M-bot%20-%20Made%20with%20Clipchamp.mp4)**

[![M-bot Demo Preview](public/newlogo.jpg)](https://github.com/Salman1205/M-bot/raw/master/M-bot%20-%20Made%20with%20Clipchamp.mp4)

*Click the logo above or the link to watch the complete user workflow demonstration*

## Overview

M-bot is an AI-powered identity mentor application designed to provide a supportive environment for personal growth and emotional well-being. The application combines advanced natural language processing with an intuitive user interface to offer personalized guidance for identity exploration.

## Key Features

- **AI-Powered Conversations**: Advanced NLP for meaningful, context-aware interactions
- **User Profile Management**: Personalized experience with comprehensive profile system
- **Real-time Chat Interface**: Instant responses with conversation history
- **Progressive Web App**: Cross-platform compatibility with offline capabilities
- **Secure Session Management**: Safe and confidential user data handling
- **Responsive Design**: Optimized for desktop and mobile devices

## Technology Stack

### Backend
- **Python 3.8+** with Flask framework
- **SQLite** database with SQLAlchemy ORM
- **Custom NLP Module** for AI response generation
- **Flask-Session** for secure session management

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

4. Initialize database:
   ```bash
   python models.py
   ```

5. Start Flask server:
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

1. **Registration**: Create a new user account
2. **Profile Setup**: Configure personal preferences and goals
3. **Chat Interface**: Begin conversations with the AI mentor
4. **Session Management**: Access conversation history and progress tracking

## API Documentation

### Authentication Endpoints
- `POST /register` - User registration
- `POST /login` - User authentication
- `POST /logout` - Session termination

### Chat Endpoints
- `POST /chat` - Send message to AI mentor
- `GET /history` - Retrieve conversation history
- `DELETE /history` - Clear conversation data

### Profile Endpoints
- `GET /profile` - Retrieve user profile
- `PUT /profile` - Update profile information

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

- User data encryption and secure storage
- Input validation and sanitization
- CSRF protection implementation
- Secure session management
- Regular security audits and updates

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

For technical support, bug reports, or feature requests:
- GitHub Issues: [Report Issues](https://github.com/Salman1205/M-bot/issues)
- Documentation: [Project Wiki](https://github.com/Salman1205/M-bot/wiki)

---

**M-bot Identity Mentor** - Professional AI-powered personal development platform 