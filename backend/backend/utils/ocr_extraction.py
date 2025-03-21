import cv2
import pytesseract
import numpy as np
from PIL import Image
import pdf2image
import os
import logging

logger = logging.getLogger(__name__)

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
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2,2))
    dilated = cv2.dilate(denoised, kernel, iterations=1)

    return dilated

def handle_pdf(pdf_path):
    """
    Convert PDF to images and extract text from all pages
    """
    pages = pdf2image.convert_from_path(pdf_path)
    text = []
    
    for page in pages:
        # Convert PIL Image to OpenCV format
        open_cv_image = cv2.cvtColor(np.array(page), cv2.COLOR_RGB2BGR)
        processed_image = preprocess_image(open_cv_image)
        page_text = pytesseract.image_to_string(processed_image)
        text.append(page_text)
    
    return '\n'.join(text)

def extract_text_from_image(file_path):
    """Extract text from an image or PDF file using OCR"""
    try:
        logger.debug(f"Starting OCR extraction for file: {file_path}")
        
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return None

        # Check if file is PDF
        if file_path.lower().endswith('.pdf'):
            logger.debug("Converting PDF to images")
            try:
                pages = pdf2image.convert_from_path(file_path)
                text = ""
                for page in pages:
                    text += pytesseract.image_to_string(page) + "\n"
            except Exception as e:
                logger.error(f"Error converting PDF: {str(e)}")
                return None
        else:
            # Handle image files
            try:
                logger.debug("Opening image file")
                image = Image.open(file_path)
                logger.debug(f"Image opened successfully: {image.format}, {image.size}, {image.mode}")
                
                # Convert image to RGB if necessary
                if image.mode != 'RGB':
                    logger.debug(f"Converting image from {image.mode} to RGB")
                    image = image.convert('RGB')
                
                logger.debug("Starting OCR processing")
                text = pytesseract.image_to_string(image)
                logger.debug(f"OCR completed, extracted {len(text)} characters")
                
            except Exception as e:
                logger.error(f"Error processing image: {str(e)}")
                return None

        if not text.strip():
            logger.warning("No text extracted from file")
            return None

        return text.strip()

    except Exception as e:
        logger.error(f"Unexpected error in extract_text_from_image: {str(e)}", exc_info=True)
        return None 