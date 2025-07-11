# M-bot - Identity Mentor 🤖✨

<div align="center">
  <img src="public/newlogo.jpg" alt="M-bot Logo" width="200" height="200">
  
  **Your personal AI companion for identity exploration and emotional well-being**
  
  [![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/Salman1205/M-bot)
  [![Live Demo](https://img.shields.io/badge/Live-Demo-green)](https://salman1205.github.io/M-bot/)
</div>

## 📺 Demo Video

Watch M-bot in action! This video showcases the key features and user experience:

https://github.com/Salman1205/M-bot/assets/your-username/M-bot%20-%20Made%20with%20Clipchamp.mp4

*Note: If the video doesn't play above, you can [download it directly](./M-bot%20-%20Made%20with%20Clipchamp.mp4) or view it in the repository files.*

## 🌟 About M-bot

M-bot is an innovative AI-powered identity mentor designed to provide a safe, supportive space for personal growth and emotional well-being. Built with cutting-edge natural language processing and a user-friendly interface, M-bot offers personalized guidance for identity exploration anytime, anywhere.

### ✨ Key Features

- 🧠 **AI-Powered Conversations**: Advanced NLP for meaningful, context-aware interactions
- 🔒 **Safe Space**: Confidential environment for personal exploration and growth
- 📱 **Progressive Web App**: Works seamlessly across desktop and mobile devices
- 👤 **User Profiles**: Personalized experience with profile management
- 💬 **Real-time Chat**: Instant responses with conversation history
- 🎨 **Modern UI/UX**: Beautiful, intuitive interface with responsive design
- 📊 **Wellness Dashboard**: Track your personal growth journey
- 🔄 **Offline Support**: PWA capabilities for offline functionality

## 🛠️ Technology Stack

### Backend
- **Python 3.8+** - Core backend language
- **Flask** - Web framework for REST API
- **SQLite** - Database for user data and conversations
- **SQLAlchemy** - ORM for database operations
- **Natural Language Processing** - Custom NLP module for AI responses
- **Session Management** - Secure user session handling

### Frontend
- **React.js** - Modern UI library
- **JavaScript (ES6+)** - Frontend logic
- **CSS3** - Styling and animations
- **PWA** - Progressive Web App capabilities
- **Responsive Design** - Mobile-first approach

### Deployment & Tools
- **Git** - Version control
- **GitHub Pages** - Frontend deployment
- **Render/Heroku** - Backend deployment options
- **npm** - Package management

## 📁 Project Structure

```
M-bot/
├── 📁 Backend (Flask)
│   ├── app.py              # Main Flask application
│   ├── models.py           # Database models & schemas
│   ├── nlp_module.py       # AI/NLP processing engine
│   ├── reqs.txt           # Python dependencies
│   ├── chat_data.db       # SQLite database
│   └── local_users.json   # User configuration
│
├── 📁 Frontend (React)
│   ├── public/            # Static assets
│   │   ├── index.html     # Main HTML template
│   │   ├── manifest.json  # PWA configuration
│   │   ├── newlogo.jpg    # App logo
│   │   └── logo.png       # Alternate logo
│   ├── src/               # React source code
│   │   ├── App.js         # Main App component
│   │   ├── App.css        # Application styles
│   │   ├── EnhancedProfile.js # Profile management
│   │   └── index.js       # React entry point
│   ├── package.json       # Node.js dependencies
│   └── package-lock.json  # Locked dependency versions
│
├── 📁 Additional
│   ├── uploads/           # File upload storage
│   ├── flask_session/     # Session data storage
│   ├── venv/             # Python virtual environment
│   └── M-bot - Made with Clipchamp.mp4  # Demo video
└── README.md             # This file
```

## 🚀 Getting Started

### Prerequisites

Before running M-bot, make sure you have:

- **Python 3.8+** installed
- **Node.js 14+** and npm installed
- **Git** for version control

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Salman1205/M-bot.git
   cd M-bot
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv venv
   
   # On Windows:
   venv\Scripts\activate
   
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r reqs.txt
   ```

4. **Initialize the database**
   ```bash
   python models.py
   ```

5. **Run the Flask server**
   ```bash
   python app.py
   ```
   
   The backend will be available at `http://localhost:5000`

### Frontend Setup

1. **Install Node.js dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm start
   ```
   
   The frontend will be available at `http://localhost:3000`

### Quick Development Setup

For development, run both servers simultaneously:

```bash
# Terminal 1 - Backend
python app.py

# Terminal 2 - Frontend  
npm start
```

## 📱 Progressive Web App Features

M-bot is built as a PWA with the following capabilities:

- **📱 App-like Experience**: Install on mobile/desktop
- **🔄 Offline Functionality**: Works without internet connection
- **⚡ Fast Loading**: Optimized performance
- **🔔 Push Notifications**: Stay engaged with your wellness journey
- **🎯 Responsive Design**: Perfect on any device size

### PWA Installation

1. Visit the live demo URL
2. Look for "Add to Home Screen" prompt
3. Follow browser-specific installation steps
4. Launch M-bot like a native app!

## 🌐 Deployment

### Frontend Deployment (GitHub Pages)

The frontend is automatically deployed to GitHub Pages:

1. **Configure package.json**
   ```json
   {
     "homepage": "https://salman1205.github.io/M-bot"
   }
   ```

2. **Install gh-pages**
   ```bash
   npm install --save-dev gh-pages
   ```

3. **Deploy**
   ```bash
   npm run build
   npm run deploy
   ```

### Backend Deployment Options

#### Option 1: Render
1. Connect your GitHub repository
2. Set build command: `pip install -r reqs.txt`
3. Set start command: `gunicorn app:app`
4. Configure environment variables

#### Option 2: Heroku
1. Install Heroku CLI
2. Create Procfile: `web: gunicorn app:app`
3. Deploy: `git push heroku main`

## 🎯 Usage Guide

### First Time Setup
1. **Create Account**: Register with email and create your profile
2. **Personalize**: Set your preferences and goals
3. **Start Chatting**: Begin your identity exploration journey

### Key Features Walkthrough
- **💬 Chat Interface**: Natural conversation with AI mentor
- **👤 Profile Management**: Update personal information and preferences  
- **📊 Dashboard**: View progress and insights
- **🔄 Session History**: Access previous conversations
- **⚙️ Settings**: Customize your experience

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit changes** (`git commit -m 'Add AmazingFeature'`)
4. **Push to branch** (`git push origin feature/AmazingFeature`)
5. **Open Pull Request**

### Development Guidelines
- Follow PEP 8 for Python code
- Use ESLint for JavaScript code
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** - For inspiring AI conversation capabilities
- **React Community** - For excellent frontend framework
- **Flask Community** - For robust backend framework
- **Contributors** - Thank you to all who helped build M-bot

## 📞 Support & Contact

- **GitHub Issues**: [Report bugs or request features](https://github.com/Salman1205/M-bot/issues)
- **Email**: [Contact for support](mailto:your-email@example.com)
- **Documentation**: [Visit our docs](https://github.com/Salman1205/M-bot/wiki)

---

<div align="center">
  <p><strong>Made with ❤️ for personal growth and well-being</strong></p>
  <p>© 2024 M-bot - Identity Mentor. All rights reserved.</p>
</div> 