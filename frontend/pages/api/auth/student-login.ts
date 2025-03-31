import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../api/utils/supabaseClient';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { student_id, password } = req.body;
    
    // Find student by student_id
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', student_id)
      .single();
      
    if (error || !student) {
      return res.status(401).json({ message: 'Invalid student ID or password' });
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, student.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid student ID or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: student.id, student_id: student.student_id, role: 'student' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );
    
    // Set cookie with token
    res.setHeader('Set-Cookie', `auth-token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24}`);
    
    return res.status(200).json({ 
      message: 'Login successful',
      user: { 
        id: student.id, 
        name: student.name, 
        username: student.student_id,
        student_id: student.student_id
      }
    });
  } catch (error) {
    console.error('Error logging in student:', error);
    return res.status(500).json({ message: 'Failed to login', error });
  }
} 