# M-bot

A chatbot application with a Flask backend and React frontend.

## Project Structure

```
M-bot/
├── backend/                 # Flask backend
│   ├── app.py              # Main Flask application
│   ├── models.py           # Database models
│   ├── nlp_module.py       # NLP processing
│   ├── requirements.txt    # Python dependencies
│   └── config.py           # Configuration settings
│
├── frontend/               # React frontend
│   ├── public/            # Static files
│   │   ├── index.html
│   │   └── assets/        # Images and other static assets
│   ├── src/               # React source code
│   │   ├── components/    # React components
│   │   ├── styles/        # CSS files
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json       # Node.js dependencies
│   └── README.md          # Frontend documentation
│
├── .gitignore
└── README.md              # Project documentation
```

## Setup Instructions

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the Flask server:
   ```bash
   python app.py
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Deployment

### Backend Deployment (Render)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the following:
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && gunicorn app:app`
   - Environment Variables:
     ```
     FLASK_APP=app.py
     FLASK_ENV=production
     ```

### Frontend Deployment (GitHub Pages)
1. Update package.json with homepage:
   ```json
   {
     "homepage": "https://salman1205.github.io/M-bot"
   }
   ```
2. Install gh-pages:
   ```bash
   npm install --save-dev gh-pages
   ```
3. Add deploy scripts to package.json:
   ```json
   {
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d build"
     }
   }
   ```
4. Deploy:
   ```bash
   npm run deploy
   ```

## Environment Variables
Create a `.env` file in the backend directory:
```
FLASK_APP=app.py
FLASK_ENV=development
DATABASE_URL=your_database_url
```

## License
MIT 