import hashlib
import secrets
import logging
from db import get_db_connection

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def hash_password(password, salt=None):
    """Hash a password with a salt for secure storage"""
    if salt is None:
        salt = secrets.token_hex(16)
    
    # Combine password and salt, then hash
    pwdhash = hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode('utf-8'), 
        salt.encode('utf-8'), 
        100000
    ).hex()
    
    # Return both the salt and the hashed password
    return f"{salt}${pwdhash}"

def verify_password(stored_password, provided_password):
    """Verify a password against its stored hash"""
    # Split the stored password into salt and hash
    salt, stored_hash = stored_password.split('$')
    
    # Hash the provided password with the same salt
    pwdhash = hashlib.pbkdf2_hmac(
        'sha256', 
        provided_password.encode('utf-8'), 
        salt.encode('utf-8'), 
        100000
    ).hex()
    
    # Compare the hashes
    return pwdhash == stored_hash

def register_user(username, password):
    """Register a new user with a hashed password"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if username already exists
        cur.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            raise ValueError("Username already exists")
        
        # Hash the password
        hashed_password = hash_password(password)
        
        # Insert the new user
        cur.execute(
            "INSERT INTO users (username, password) VALUES (%s, %s) RETURNING id, username",
            (username, hashed_password)
        )
        user = cur.fetchone()
        conn.commit()
        
        logger.info(f"User registered: {username}")
        return user
    except Exception as e:
        conn.rollback()
        logger.error(f"Registration error: {e}")
        raise
    finally:
        cur.close()
        conn.close()

def authenticate_user(username, password):
    """Authenticate a user with username and password"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get the user by username
        cur.execute("SELECT id, username, password FROM users WHERE username = %s", (username,))
        user = cur.fetchone()
        
        if not user:
            logger.warning(f"Authentication failed: User not found - {username}")
            return None
        
        # Verify the password
        if verify_password(user['password'], password):
            logger.info(f"User authenticated: {username}")
            return {
                'id': user['id'],
                'username': user['username']
            }
        
        logger.warning(f"Authentication failed: Invalid password for {username}")
        return None
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        return None
    finally:
        cur.close()
        conn.close() 