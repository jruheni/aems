import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Clear the auth cookie
  res.setHeader(
    'Set-Cookie',
    'auth-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );

  return res.status(200).json({ message: 'Logged out successfully' });
} 