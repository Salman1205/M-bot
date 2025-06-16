# M-bot

A chatbot application with a Flask backend and Node.js frontend.

## Project Structure

```
M-bot/
├── app.py              # Flask backend server
├── models.py           # Database models
├── nlp_module.py       # Natural Language Processing module
├── package.json        # Node.js dependencies
├── public/            # Static files
└── src/              # Frontend source code
```

## Setup Instructions

### Backend Setup
1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install Python dependencies:
   ```bash
   pip install -r reqs.txt
   ```

3. Run the Flask server:
   ```bash
   python app.py
   ```

### Frontend Setup
1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

## Deployment

### Backend Deployment
The backend is deployed on [Render](https://render.com) (or your preferred platform).

### Frontend Deployment
The frontend is deployed using GitHub Pages.

## Environment Variables
Create a `.env` file in the root directory with the following variables:
```
FLASK_APP=app.py
FLASK_ENV=development
```

## License
MIT 