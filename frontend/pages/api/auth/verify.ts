import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.cookies['auth-token'];
    
    if (!token) {
      return res.status(401).json({ message: 'No token found' });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    return res.status(200).json({ 
      message: 'Token valid',
      user: decoded 
    });
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ 
      message: 'Invalid token',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 