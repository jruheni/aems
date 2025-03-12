import cv2
import pytesseract
import numpy as np
from PIL import Image
import pdf2image
import os

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
    """
    Extract text from an image or PDF file using OCR
    """
    try:
        if file_path.lower().endswith('.pdf'):
            return handle_pdf(file_path)

        # Read and process image
        image = cv2.imread(file_path)
        if image is None:
            raise ValueError(f"Could not read image file: {file_path}")

        # Preprocess the image
        processed_image = preprocess_image(image)

        # Extract text using different PSM modes and combine results
        text_results = []
        psm_modes = [3, 6]  # 3: Fully automatic page segmentation, 6: Uniform block of text
        
        for psm_mode in psm_modes:
            config = f'--psm {psm_mode} --oem 3'
            text = pytesseract.image_to_string(
                processed_image,
                config=config
            )
            text_results.append(text)

        # Combine and clean results
        combined_text = max(text_results, key=len)  # Use the result with most content
        cleaned_text = '\n'.join(line for line in combined_text.splitlines() if line.strip())
        
        return cleaned_text

    except Exception as e:
        raise Exception(f"Error in OCR processing: {str(e)}") 