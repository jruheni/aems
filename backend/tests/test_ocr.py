import pytest
import os
from utils.ocr_extraction import extract_text_from_image, preprocess_image
import cv2
import numpy as np

def test_preprocess_image():
    """Test image preprocessing function"""
    # Create a simple test image
    test_image = np.zeros((100, 100, 3), dtype=np.uint8)
    cv2.putText(test_image, 'Test', (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    
    # Process the image
    processed = preprocess_image(test_image)
    
    # Verify the output
    assert processed is not None
    assert processed.shape[:2] == test_image.shape[:2]  # Same dimensions
    assert len(processed.shape) == 2  # Grayscale output

def test_extract_text_from_image(sample_image_path):
    """Test text extraction from an image"""
    # Skip if sample image doesn't exist
    if not os.path.exists(sample_image_path):
        pytest.skip("Sample image not found")
    
    # Extract text
    text = extract_text_from_image(sample_image_path)
    
    # Basic validation
    assert text is not None
    assert isinstance(text, str)
    assert len(text.strip()) > 0

def test_invalid_image_path():
    """Test handling of invalid image path"""
    with pytest.raises(Exception) as exc_info:
        extract_text_from_image('nonexistent.jpg')
    assert "Error in OCR processing" in str(exc_info.value)

def test_pdf_handling(sample_rubric_path):
    """Test PDF processing"""
    # Skip if sample PDF doesn't exist
    if not os.path.exists(sample_rubric_path):
        pytest.skip("Sample PDF not found")
    
    # Extract text from PDF
    text = extract_text_from_image(sample_rubric_path)
    
    # Basic validation
    assert text is not None
    assert isinstance(text, str)
    assert len(text.strip()) > 0 