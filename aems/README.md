# Automated Exam Marking System (AEMS)

AEMS is a web-based application that automates the process of grading exam papers using OCR (Optical Character Recognition) technology. The system consists of a Flask backend for OCR processing and grading, and a Next.js frontend for the user interface.

## Features

- OCR-based text extraction from exam papers
- Automated grading system based on predefined criteria
- Modern and responsive web interface
- Real-time processing and feedback
- Support for multiple image formats (PNG, JPG, JPEG, PDF)

## Prerequisites

Before running the project, make sure you have the following installed:

- Python 3.8 or higher
- Node.js 14.0 or higher
- npm or yarn
- Tesseract OCR engine
- OpenCV dependencies

### Installing Tesseract OCR

#### macOS
```bash
brew install tesseract
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
```

#### Windows
Download and install from: https://github.com/UB-Mannheim/tesseract/wiki

## Project Structure

```
aems/
│── backend/   # Flask Backend
│   ├── app.py
│   ├── requirements.txt
│   ├── models.py
│   ├── routes/
│   │   ├── ocr.py
│   │   ├── grading.py
│   ├── utils/
│   │   ├── ocr_extraction.py
│   │   ├── grading_helper.py
│   ├── config.py
│   ├── .env
│
│── frontend/  # Next.js Frontend
    ├── pages/
    ├── components/
    ├── api/
    ├── public/
    ├── styles/
    ├── next.config.js
    ├── package.json
```

## Setup and Installation

### Backend Setup

1. Create and activate a virtual environment:
```bash
cd aems/backend
python -m venv env
source env/bin/activate  # On Windows: .\env\Scripts\activate
```

2. Install the required dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the backend directory with the following content:
```
FLASK_APP=app.py
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///aems.db
```

4. Create an 'uploads' directory:
```bash
mkdir uploads
```

5. Run the Flask application:
```bash
flask run
```
The backend server will start at http://localhost:5000

### Frontend Setup

1. Install dependencies:
```bash
cd aems/frontend
npm install
```

2. Run the development server:
```bash
npm run dev
```
The frontend application will be available at http://localhost:3000

## API Endpoints

### OCR Endpoints

- `POST /api/ocr/extract`
  - Accepts image file uploads
  - Returns extracted text from the image

### Grading Endpoints

- `POST /api/grading/grade`
  - Accepts JSON with extracted text
  - Returns grading results with score and feedback

## Environment Variables

### Backend (.env)
- `FLASK_APP`: Main application file
- `FLASK_ENV`: Development/Production environment
- `FLASK_DEBUG`: Debug mode toggle
- `SECRET_KEY`: Application secret key
- `DATABASE_URL`: Database connection string

### Frontend
- `BACKEND_URL`: Backend API URL (default: http://localhost:5000)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details 