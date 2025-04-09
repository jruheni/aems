import os
import logging
import pytesseract
import shutil
import platform

logger = logging.getLogger(__name__)

def verify_tesseract_installation():
    """
    Verify Tesseract OCR installation and language data.
    Returns True if everything is properly configured, False otherwise.
    """
    try:
        # Check Tesseract installation
        version = pytesseract.get_tesseract_version()
        logger.info(f"Tesseract version: {version}")

        # Get and set TESSDATA_PREFIX using absolute path
        project_root = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        tessdata_dir = os.path.join(project_root, 'tessdata')
        tessdata_dir = os.path.abspath(tessdata_dir)  # Ensure absolute path
        
        # Ensure tessdata directory exists and is accessible
        if not os.path.exists(tessdata_dir):
            try:
                os.makedirs(tessdata_dir, mode=0o755)
                logger.info(f"Created tessdata directory at {tessdata_dir}")
            except Exception as e:
                logger.error(f"Failed to create tessdata directory: {str(e)}")
                return False
        
        # Set environment variable after verifying directory
        os.environ['TESSDATA_PREFIX'] = tessdata_dir
        logger.info(f"Using tessdata directory: {tessdata_dir}")

        # Check for Swahili language data with detailed error reporting
        swa_traineddata = os.path.join(tessdata_dir, 'swa.traineddata')
        if not os.path.exists(swa_traineddata):
            logger.error(f"Swahili language data not found at {swa_traineddata}")
            # List contents of tessdata directory for debugging
            try:
                dir_contents = os.listdir(tessdata_dir)
                logger.info(f"Contents of tessdata directory: {dir_contents}")
            except Exception as e:
                logger.error(f"Could not list tessdata directory contents: {str(e)}")
            return False
        
        # Verify file permissions and readability
        try:
            with open(swa_traineddata, 'rb') as f:
                # Just read a small portion to verify access
                f.read(1024)
            logger.info("Successfully verified Swahili language data file is readable")
        except PermissionError:
            logger.error("Permission denied when trying to read Swahili language data file")
            return False
        except Exception as e:
            logger.error(f"Cannot read Swahili language data file: {str(e)}")
            return False

        # Test Swahili OCR capability
        test_result = test_swahili_ocr()
        if not test_result:
            logger.error("Swahili OCR test failed")
            return False

        logger.info("Tesseract OCR is properly configured with Swahili support")
        return True

    except Exception as e:
        logger.error(f"Error verifying Tesseract installation: {str(e)}")
        return False

def test_swahili_ocr():
    """
    Test Tesseract's ability to process Swahili text.
    Returns True if successful, False otherwise.
    """
    try:
        # Create a simple test image with Swahili text
        from PIL import Image, ImageDraw, ImageFont
        import numpy as np
        
        # Create a white image
        img = Image.new('RGB', (400, 100), color='white')
        d = ImageDraw.Draw(img)
        
        # Use a basic font
        font = ImageFont.load_default()
        
        # Draw Swahili text
        test_text = "Jambo, Dunia!"  # "Hello, World!" in Swahili
        d.text((10, 10), test_text, font=font, fill='black')
        
        # Convert to numpy array
        img_array = np.array(img)
        
        # Try OCR with Swahili
        result = pytesseract.image_to_string(
            img_array,
            lang='swa',
            config=f'--tessdata-dir "{os.environ["TESSDATA_PREFIX"]}"'  # Add quotes for path with spaces
        )
        
        # Check if any text was extracted
        if not result.strip():
            logger.warning("No text extracted in Swahili OCR test")
            return False
            
        logger.info(f"Successfully tested Swahili OCR capability. Extracted text: {result.strip()}")
        return True
        
    except Exception as e:
        logger.error(f"Error testing Swahili OCR: {str(e)}")
        return False

def configure_tesseract():
    """
    Configure Tesseract OCR settings and paths.
    """
    try:
        # Set Tesseract executable path for Windows
        if platform.system() == 'Windows':
            tesseract_paths = [
                r'C:\Program Files\Tesseract-OCR\tesseract.exe',
                r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe'
            ]
            
            tesseract_cmd = None
            for path in tesseract_paths:
                if os.path.exists(path):
                    tesseract_cmd = path
                    break
            
            if tesseract_cmd:
                pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
                logger.info(f"Set Tesseract executable path to: {tesseract_cmd}")
            else:
                logger.error("Tesseract executable not found in standard Windows locations")
                return False

        # Set and verify TESSDATA_PREFIX
        project_root = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        tessdata_dir = os.path.join(project_root, 'tessdata')
        tessdata_dir = os.path.abspath(tessdata_dir)  # Ensure absolute path
        os.environ['TESSDATA_PREFIX'] = tessdata_dir
        logger.info(f"Set TESSDATA_PREFIX to: {tessdata_dir}")

        # Verify installation
        if not verify_tesseract_installation():
            logger.error("Tesseract verification failed")
            return False

        return True

    except Exception as e:
        logger.error(f"Error configuring Tesseract: {str(e)}")
        return False 