import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../api/utils/supabaseClient';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, student_id, email, password } = req.body;
    
    // Validate student_id format
    if (!student_id || !/^\d{6}$/.test(student_id)) {
      return res.status(400).json({ message: 'Valid 6-digit student ID is required' });
    }
    
    // Check if student_id already exists
    const { data: existingStudent } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', student_id)
      .single();
      
    if (existingStudent) {
      return res.status(400).json({ message: 'Student ID already registered' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    // Create student record
    const { data, error } = await supabase
      .from('students')
      .insert([
        { name, student_id, email, password_hash }
      ])
      .select();
      
    if (error) throw error;
    
    return res.status(200).json({ 
      message: 'Student registered successfully',
      student: { id: data[0].id, name, student_id, email }
    });
  } catch (error) {
    console.error('Error registering student:', error);
    return res.status(500).json({ message: 'Failed to register student', error });
  }
} 