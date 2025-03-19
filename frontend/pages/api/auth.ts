import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { username, password, action } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Missing credentials' });
  }

  const usersFilePath = path.join(process.cwd(), 'users.json');
  const examsFilePath = path.join(process.cwd(), 'exams.json');

  try {
    const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));

    if (action === 'login') {
      const user = usersData.users.find(
        (u: { username: string; password: string }) =>
          u.username === username && u.password === password
      );

      if (!user) {
        return res.status(401).json({ success: false, message: 'User does not exist or invalid credentials' });
      }

      return res.status(200).json({ success: true, message: 'Login successful' });
    } else if (action === 'signup') {
      // Check if username already exists
      const existingUser = usersData.users.find(
        (u: { username: string }) => u.username === username
      );

      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Username already exists' });
      }

      // Add new user
      usersData.users.push({ username, password });
      fs.writeFileSync(usersFilePath, JSON.stringify(usersData, null, 2));

      // Create empty exam data for new user
      const examsData = JSON.parse(fs.readFileSync(examsFilePath, 'utf8'));
      examsData.exams.push({
        username,
        examData: []
      });
      fs.writeFileSync(examsFilePath, JSON.stringify(examsData, null, 2));

      return res.status(200).json({ success: true, message: 'Signup successful' });
    }

    return res.status(400).json({ success: false, message: 'Invalid action' });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
} 