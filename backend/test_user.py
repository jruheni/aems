import supabase_client as supabase
import secrets
import hashlib
import requests

# Create a test student
student_id = "S12345"  # Example student ID
password = "student123"

try:
    # Generate a random salt
    salt = secrets.token_hex(16)
    
    # Hash the password with the salt
    pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    
    # Store the salt and hash together
    hashed_password = f"{salt}${pwdhash}"
    
    # Insert new student directly into the students table
    insert_url = f"{supabase.SUPABASE_URL}/rest/v1/students"
    insert_data = {
        "student_id": student_id,
        "name": f"Student_{student_id}",
        "password_hash": hashed_password
    }
    
    insert_response = requests.post(
        insert_url,
        headers=supabase.headers,
        json=insert_data
    )
    
    if insert_response.status_code in (200, 201):
        print(f"Student created successfully. Use student_id: {student_id} and password: {password} to login")
    else:
        print(f"Failed to create student: {insert_response.text}")
except Exception as e:
    print(f"Error creating student: {e}")
