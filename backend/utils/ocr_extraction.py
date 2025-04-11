import cv2
import pytesseract
import numpy as np
from PIL import Image
import pdf2image
import os
import logging
import platform

logger = logging.getLogger(__name__)

def configure_tesseract():
    """Configure Tesseract path based on the environment"""
    logger.info(f"Configuring Tesseract for platform: {platform.system()}")
    logger.info(f"Current PATH: {os.environ.get('PATH', 'Not set')}")
    logger.info(f"TESSDATA_PREFIX: {os.environ.get('TESSDATA_PREFIX', 'Not set')}")
    
    if platform.system() == 'Windows':
        windows_paths = [
            r'C:\Program Files\Tesseract-OCR\tesseract.exe',
            r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe'
        ]
        for path in windows_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                logger.info(f"Using Tesseract from: {path}")
                return True
    else:
        # For Linux/Unix systems, check common locations
        unix_paths = [
            '/usr/bin/tesseract',
            '/usr/local/bin/tesseract',
            '/opt/local/bin/tesseract',
            '/usr/share/tesseract-ocr/tesseract'
        ]
        
        # First try which command
        try:
            import subprocess
            tesseract_path = subprocess.check_output(['which', 'tesseract']).decode().strip()
            logger.info(f"Found Tesseract using 'which' command: {tesseract_path}")
            if os.path.exists(tesseract_path):
                pytesseract.pytesseract.tesseract_cmd = tesseract_path
                # Verify it works
                version = subprocess.check_output([tesseract_path, '--version']).decode()
                logger.info(f"Tesseract version: {version}")
                return True
        except Exception as e:
            logger.warning(f"Could not find Tesseract using 'which' command: {str(e)}")
        
        # Try common paths
        for path in unix_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                logger.info(f"Using Tesseract from: {path}")
                try:
                    # Verify it works
                    import subprocess
                    version = subprocess.check_output([path, '--version']).decode()
                    logger.info(f"Tesseract version: {version}")
                    return True
                except Exception as e:
                    logger.warning(f"Found Tesseract at {path} but failed to verify: {str(e)}")
                    continue
    
    logger.error("Tesseract not found in any common locations")
    return False

# Configure Tesseract when module is loaded
configure_tesseract()

def preprocess_image(image):
    """
    Preprocess the image for better OCR results
    """
    # Convert to grayscale if image is in color
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image

    # Apply adaptive thresholding
    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11, 2
    )

    # Denoise
    denoised = cv2.fastNlMeansDenoising(binary)

    # Dilation to connect text components
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    dilated = cv2.dilate(denoised, kernel, iterations=1)

    return dilated

def handle_pdf(pdf_path):
    """
    Convert PDF to images and extract text from all pages
    """
    try:
        pages = pdf2image.convert_from_path(pdf_path)
        text = []

        for page in pages:
            open_cv_image = cv2.cvtColor(np.array(page), cv2.COLOR_RGB2BGR)
            processed_image = preprocess_image(open_cv_image)
            page_text = pytesseract.image_to_string(processed_image, lang='swa')
            text.append(page_text)

        full_text = '\n'.join(text)
        logger.debug(f"Extracted text from PDF: {len(full_text)} characters")
        return full_text.strip()

    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        return None

def extract_text_from_image(file_path):
    """
    Extract text from an image or PDF file using OCR
    """
    try:
        logger.debug(f"Starting OCR extraction for file: {file_path}")

        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return None

        if file_path.lower().endswith('.pdf'):
            logger.debug("Delegating to handle_pdf()")
            return handle_pdf(file_path)

        # Handle image files
        try:
            logger.debug("Opening image file")
            image = Image.open(file_path)
            logger.debug(f"Image opened: {image.format}, {image.size}, {image.mode}")

            if image.mode != 'RGB':
                logger.debug(f"Converting image from {image.mode} to RGB")
                image = image.convert('RGB')

            open_cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            processed = preprocess_image(open_cv_image)

            logger.debug("Running OCR on preprocessed image")
            text = pytesseract.image_to_string(processed, lang='swa')
            logger.debug(f"OCR complete: {len(text)} characters extracted")

            if not text.strip():
                logger.warning("No text extracted from image")
                return None

            return text.strip()

        except Exception as e:
            logger.error(f"Error processing image: {str(e)}")
            return None

    except Exception as e:
        logger.error(f"Unexpected error in extract_text_from_image: {str(e)}", exc_info=True)
        return None
