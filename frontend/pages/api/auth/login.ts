import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../api/utils/supabaseClient';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;
    
    console.log('Login attempt for username:', username);
    
    // For testing - hardcoded credentials
    // REMOVE THIS IN PRODUCTION
    if (username === 'admin' && password === 'password') {
      console.log('Using hardcoded admin credentials');
      // Generate JWT token
      const token = jwt.sign(
        { 
          id: '1', 
          username: username,
          name: 'Admin User',
          role: 'teacher'
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1d' }
      );
      
      // Set cookie with token
      res.setHeader(
        'Set-Cookie', 
        `auth-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24}`
      );
      
      return res.status(200).json({ 
        message: 'Login successful',
        user: { 
          id: '1', 
          name: 'Admin User', 
          username: username 
        },
        token: token
      });
    }
    
    // Try to find user by username
    console.log('Querying Supabase for user with username:', username);
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ 
        message: 'Database error', 
        error: error.message,
        details: 'Error querying the database'
      });
    }
    
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ 
        message: 'Invalid username or password',
        details: 'No user found with that username'
      });
    }
    
    console.log('User found, verifying password');
    
    // Verify password - check if it's stored as a hash
    let isPasswordValid = false;
    
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) {
      // Password is hashed with bcrypt
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      // Password might be stored in plaintext (not recommended)
      isPasswordValid = (password === user.password);
    }
    
    if (!isPasswordValid) {
      console.log('Password invalid');
      return res.status(401).json({ 
        message: 'Invalid username or password',
        details: 'Password does not match'
      });
    }
    
    console.log('Password valid, generating token');
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        name: user.name,
        role: 'teacher'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );
    
    // Set cookie with token
    res.setHeader(
      'Set-Cookie', 
      `auth-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24}`
    );
    
    console.log('Login successful');
    return res.status(200).json({ 
      message: 'Login successful',
      user: { 
        id: user.id, 
        name: user.name, 
        username: user.username 
      },
      token: token
    });
  } catch (error) {
    console.error('Unexpected error during login:', error);
    return res.status(500).json({ 
      message: 'Failed to login', 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
} 