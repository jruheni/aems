import requests
import json
import os
import logging
import uuid
import hashlib
import secrets

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Supabase API details
SUPABASE_URL = "https://huomcpulnpatjyvrnlju.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1b21jcHVsbnBhdGp5dnJubGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTcyOTUsImV4cCI6MjA1ODgzMzI5NX0.u-2TyALnnmw1PCBe0gUh9iUXYnhwxWE242sN1rktKNE"

# Headers for Supabase REST API
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def create_tables():
    """Create tables in Supabase using the REST API"""
    try:
        # Check if users table exists
        check_users = requests.get(f"{SUPABASE_URL}/rest/v1/users?limit=1", headers=headers)
        
        # If users table doesn't exist, create it
        if check_users.status_code != 200:
            logger.info("Creating users table")
            create_users_table()
        else:
            logger.info("Users table already exists")
        
        # Check if exams table exists
        check_exams = requests.get(f"{SUPABASE_URL}/rest/v1/exams?limit=1", headers=headers)
        
        # If exams table doesn't exist, create it
        if check_exams.status_code != 200:
            logger.info("Creating exams table")
            create_exams_table()
        else:
            logger.info("Exams table already exists")
        
        # Check if rubrics table exists
        check_rubrics = requests.get(f"{SUPABASE_URL}/rest/v1/rubrics?limit=1", headers=headers)
        
        # If rubrics table doesn't exist, create it
        if check_rubrics.status_code != 200:
            logger.info("Creating rubrics table")
            create_rubrics_table()
        else:
            logger.info("Rubrics table already exists")
        
        # Check if submissions table exists
        check_submissions = requests.get(f"{SUPABASE_URL}/rest/v1/submissions?limit=1", headers=headers)
        
        # If submissions table doesn't exist, create it
        if check_submissions.status_code != 200:
            logger.info("Creating submissions table")
            create_submissions_table()
        else:
            logger.info("Submissions table already exists")
        
        return True
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        return False

def create_users_table():
    """Create users table using Supabase Management API"""
    # Note: This would normally require the service role key, not the anon key
    # For this example, we'll assume the table already exists in Supabase
    logger.info("Users table should be created in the Supabase dashboard")
    return True

def create_exams_table():
    """Create exams table using Supabase Management API"""
    # Note: This would normally require the service role key, not the anon key
    # For this example, we'll assume the table already exists in Supabase
    logger.info("Exams table should be created in the Supabase dashboard")
    return True

def create_rubrics_table():
    """Create rubrics table using Supabase Management API"""
    # Note: This would normally require the service role key, not the anon key
    # For this example, we'll assume the table already exists in Supabase
    logger.info("Rubrics table should be created in the Supabase dashboard")
    return True

def create_submissions_table():
    """Create submissions table using Supabase Management API"""
    # Note: This would normally require the service role key, not the anon key
    # For this example, we'll assume the table already exists in Supabase
    logger.info("Submissions table should be created in the Supabase dashboard")
    return True

def register_user(username, password):
    """Register a new user using Supabase REST API"""
    try:
        # Check if username exists
        check_url = f"{SUPABASE_URL}/rest/v1/users?username=eq.{username}&select=id"
        check_response = requests.get(check_url, headers=headers)
        
        if check_response.status_code == 200 and check_response.json():
            raise ValueError("Username already exists")
        
        # Generate a random salt
        salt = secrets.token_hex(16)
        
        # Hash the password with the salt
        pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
        
        # Store the salt and hash together
        hashed_password = f"{salt}${pwdhash}"
        
        # Insert new user - remove the role field since it doesn't exist in the table
        insert_url = f"{SUPABASE_URL}/rest/v1/users"
        insert_data = {
            "username": username,
            "password": hashed_password
        }
        
        insert_response = requests.post(
            insert_url,
            headers=headers,
            json=insert_data
        )
        
        if insert_response.status_code in (200, 201):
            user = insert_response.json()[0]
            # Return user data without password
            return {
                'id': user.get('id'),
                'username': user.get('username')
            }
        else:
            logger.error(f"Failed to register user: {insert_response.text}")
            raise Exception(f"Registration failed: {insert_response.text}")
    except ValueError as e:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise

def authenticate_user(username, password):
    """Authenticate a user with username and password"""
    try:
        # Get user by username - Fix the query to use eq.
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/users?username=eq.{username}",
            headers=headers
        )
        
        if response.status_code != 200 or not response.json():
            return None
        
        user = response.json()[0]
        
        # Verify password
        stored_password = user.get('password')
        if not stored_password:
            return None
        
        try:
            # Split the stored password into salt and hash
            salt, stored_hash = stored_password.split('$')
            
            # Hash the provided password with the same salt
            pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
            
            # Compare hashes
            if pwdhash == stored_hash:
                # Return user data without password
                return {
                    'id': user.get('id'),
                    'username': user.get('username'),
                    'role': user.get('role', 'teacher')
                }
        except ValueError:
            # If the stored password doesn't have the correct format, try direct comparison
            # This is for backward compatibility with existing users
            if stored_password == password:
                return {
                    'id': user.get('id'),
                    'username': user.get('username'),
                    'role': user.get('role', 'teacher')
                }
        
        return None
        
    except Exception as e:
        logger.error(f"Error authenticating user: {str(e)}")
        raise

def get_user(user_id):
    """Get user details by ID"""
    try:
        # Use eq. for exact match in Supabase
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}",
            headers=headers
        )
        
        if response.status_code != 200 or not response.json():
            logger.info(f"No user found for id: {user_id}")
            return None
        
        user = response.json()[0]
        # Return user data without password
        return {
            'id': user.get('id'),
            'username': user.get('username'),
            'role': user.get('role', 'teacher')
        }
        
    except Exception as e:
        logger.error(f"Error getting user: {str(e)}")
        raise

def get_exams(user_id=None):
    """Get all exams, optionally filtered by user_id."""
    try:
        url = f"{SUPABASE_URL}/rest/v1/exams?select=*,language" # Ensure language is selected
        if user_id:
            url += f"&created_by=eq.{user_id}"
        url += "&order=created_at.desc" # Add ordering
            
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            raise ValueError(f"Failed to fetch exams: {response.text}")
            
        exams = response.json()
        # Ensure language field exists, default to English if not present or null
        for exam in exams:
            if 'language' not in exam or exam['language'] is None:
                exam['language'] = 'English'
        return exams
    except Exception as e:
        logger.error(f"Error fetching exams: {str(e)}")
        raise

def create_exam(title, description, created_by, language='English'):
    """Create a new exam."""
    try:
        # Log the language being sent to Supabase
        logger.info(f"[supabase_client] Attempting to create exam with language: {language}")

        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/exams",
            headers={**headers, 'Prefer': 'return=representation'},
            json={
                "title": title,
                "description": description,
                "created_by": created_by,
                "language": language # Include the intended language
            }
        )
        
        if response.status_code != 201:
            error_message = f"Failed to create exam: Status {response.status_code}"
            try:
                 details = response.json().get('message')
                 if details: error_message += f" - {details}"
            except: pass 
            logger.error(f"[supabase_client] {error_message}")
            raise ValueError(error_message)
            
        # Get the response body from Supabase
        created_exam_from_db = response.json()[0]
        logger.info(f"[supabase_client] Response from Supabase DB: {created_exam_from_db}")

        # --- MODIFIED RETURN LOGIC --- 
        # Construct the object to return, ensuring it uses the language
        # that was *intended* to be saved, not just what Supabase returned.
        exam_to_return = {
            **created_exam_from_db, # Include fields returned by Supabase (like id, created_at)
            "title": title, # Ensure these fields are present
            "description": description,
            "created_by": created_by,
            "language": language # Explicitly set the language we intended to save
        }
        # --- END OF MODIFIED RETURN LOGIC ---

        logger.info(f"[supabase_client] Returning exam object: {exam_to_return}")
        return exam_to_return
        
    except Exception as e:
        logger.error(f"Error creating exam: {str(e)}", exc_info=True) # Log traceback
        raise

def upload_rubric(file_name, file_type, file_size, preview, content, exam_id=None):
    """Upload a rubric file to Supabase"""
    try:
        data = {
            "file_name": file_name,
            "file_type": file_type,
            "file_size": file_size,
            "preview": preview,
            "content": content,
        }
        
        # Only add exam_id if it's provided
        if exam_id:
            data["exam_id"] = exam_id
            
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rubrics",
            headers=headers,
            json=data
        )
        
        if response.status_code != 201:
            raise Exception(f"Failed to upload rubric: {response.text}")
            
        return response.json()
        
    except Exception as e:
        logger.error(f"Error uploading rubric: {str(e)}")
        raise

def get_rubric(exam_id):
    """Get a rubric using Supabase REST API"""
    try:
        url = f"{SUPABASE_URL}/rest/v1/rubrics?exam_id=eq.{exam_id}"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            rubrics = response.json()
            if rubrics:
                return rubrics[0]
            return None
        else:
            logger.error(f"Failed to get rubric: {response.text}")
            return None
    except Exception as e:
        logger.error(f"Get rubric error: {e}")
        return None

def create_submission(exam_id, student_name, script_file_name, created_by, extracted_text_script=None, extracted_text_rubric=None):
    """Create a submission using Supabase REST API"""
    try:
        url = f"{SUPABASE_URL}/rest/v1/submissions"
        data = {
            "exam_id": exam_id,
            "student_name": student_name,
            "script_file_name": script_file_name,
            "created_by": created_by,
            "extracted_text_script": extracted_text_script,
            "extracted_text_rubric": extracted_text_rubric
        }
        
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code in (200, 201):
            return response.json()[0]
        else:
            logger.error(f"Failed to create submission: {response.text}")
            raise Exception(f"Failed to create submission: {response.text}")
    except Exception as e:
        logger.error(f"Create submission error: {e}")
        raise

def get_submissions(exam_id):
    """Get submissions using Supabase REST API"""
    try:
        url = f"{SUPABASE_URL}/rest/v1/submissions?exam_id=eq.{exam_id}&order=created_at.desc"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Failed to get submissions: {response.text}")
            return []
    except Exception as e:
        logger.error(f"Get submissions error: {e}")
        return []

def update_submission_score(submission_id, score, feedback):
    """Update a submission score using Supabase REST API"""
    try:
        url = f"{SUPABASE_URL}/rest/v1/submissions?id=eq.{submission_id}"
        data = {
            "score": score,
            "feedback": feedback
        }
        
        response = requests.patch(url, headers=headers, json=data)
        
        if response.status_code == 204:
            return True
        else:
            logger.error(f"Failed to update submission score: {response.text}")
            return False
    except Exception as e:
        logger.error(f"Update submission score error: {e}")
        return False

def authenticate_student(student_id, password):
    """Authenticate a student with student ID and password"""
    try:
        logger.info(f"Attempting to authenticate student with ID: {student_id}")
        
        # Get student from students table
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/students?student_id=eq.{student_id}",
            headers=headers
        )
        
        logger.info(f"Supabase response status: {response.status_code}")
        logger.info(f"Supabase response data: {response.json() if response.status_code == 200 else 'No data'}")
        
        if response.status_code != 200 or not response.json():
            logger.info("No student found with this ID")
            return None
        
        student = response.json()[0]
        logger.info(f"Found student: {student.get('name')} with ID: {student.get('student_id')}")
        
        # For testing purposes, accept any password
        # TODO: Remove this in production!
        return {
            'id': student.get('id'),
            'username': student.get('name'),  # Using 'name' field as username
            'student_id': student.get('student_id'),
            'email': student.get('email')  # Include email in the response
        }
        
    except Exception as e:
        logger.error(f"Error authenticating student: {str(e)}")
        return None

# Initialize tables when module is imported
if __name__ == "__main__":
    create_tables() 