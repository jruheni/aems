import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';

export async function verifyToken(req: NextApiRequest) {
  try {
    // Get token from cookies or Authorization header
    const token = req.cookies['auth-token'] || 
                 (req.headers.authorization?.startsWith('Bearer ') 
                  ? req.headers.authorization.substring(7) 
                  : null);
    
    if (!token) {
      return null;
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return decoded as { id: number; student_id?: string; email?: string; role: string };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
} 