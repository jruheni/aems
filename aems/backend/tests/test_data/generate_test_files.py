import cv2
import numpy as np
from PIL import Image
from reportlab.pdfgen import canvas
import os

def create_sample_script():
    """Create a sample test script image with text"""
    # Create a white image
    img = np.ones((800, 600, 3), dtype=np.uint8) * 255
    
    # Add some text
    text = [
        "Question: Explain the process of photosynthesis.",
        "",
        "Answer:",
        "Photosynthesis is the process by which plants",
        "convert light energy into chemical energy.",
        "The process requires:",
        "- Chlorophyll",
        "- Carbon dioxide",
        "- Water",
        "",
        "The process produces glucose and oxygen",
        "as byproducts."
    ]
    
    y = 50
    for line in text:
        cv2.putText(img, line, (50, y), cv2.FONT_HERSHEY_SIMPLEX, 
                    0.7, (0, 0, 0), 2)
        y += 40
    
    # Save the image
    cv2.imwrite('sample_script.jpg', img)

def create_sample_rubric():
    """Create a sample rubric PDF"""
    c = canvas.Canvas('sample_rubric.pdf')
    
    # Add content
    c.drawString(50, 750, "Grading Rubric - Photosynthesis Question")
    c.drawString(50, 700, "Total Points: 10")
    c.drawString(50, 650, "Criteria:")
    c.drawString(70, 630, "- Mention of energy conversion (2 points)")
    c.drawString(70, 610, "- List of required components (4 points)")
    c.drawString(70, 590, "- Mention of products (4 points)")
    
    c.save()

if __name__ == '__main__':
    # Change to the script's directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Generate test files
    create_sample_script()
    create_sample_rubric()
    print("Test files generated successfully!") 