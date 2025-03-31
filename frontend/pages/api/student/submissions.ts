import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../api/utils/supabaseClient';
import { verifyToken } from '../../../utils/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify student is authenticated
    const user = await verifyToken(req);
    if (!user || user.role !== 'student') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get submissions for this student
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        exams:exam_id (
          id,
          name,
          subject,
          created_at,
          created_by
        )
      `)
      .eq('student_id', user.student_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ submissions: data });
  } catch (error) {
    console.error('Error fetching student submissions:', error);
    return res.status(500).json({ message: 'Failed to fetch submissions', error });
  }
} 