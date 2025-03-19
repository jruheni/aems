import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const examsFilePath = path.join(process.cwd(), 'exams.json');

  try {
    const examsData = JSON.parse(fs.readFileSync(examsFilePath, 'utf8'));

    if (req.method === 'GET') {
      const { username } = req.query;
      
      if (!username) {
        return res.status(400).json({ success: false, message: 'Username is required' });
      }

      const userExams = examsData.exams.find((e: any) => e.username === username);
      return res.status(200).json({ success: true, data: userExams ? userExams.examData : [] });

    } else if (req.method === 'POST') {
      const { username, action, examId, examData } = req.body;

      if (!username) {
        return res.status(400).json({ success: false, message: 'Username is required' });
      }

      const userIndex = examsData.exams.findIndex((e: any) => e.username === username);
      
      if (userIndex === -1) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      switch (action) {
        case 'create':
          if (!examData) {
            return res.status(400).json({ success: false, message: 'Exam data is required' });
          }
          const newExam = {
            id: Date.now(),
            ...examData,
            questions: []
          };
          examsData.exams[userIndex].examData.unshift(newExam);
          break;

        case 'rename':
          if (!examId || !examData.title) {
            return res.status(400).json({ success: false, message: 'Exam ID and new title are required' });
          }
          const examToRename = examsData.exams[userIndex].examData.find((e: any) => e.id === examId);
          if (!examToRename) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
          }
          examToRename.title = examData.title;
          break;

        case 'delete':
          if (!examId) {
            return res.status(400).json({ success: false, message: 'Exam ID is required' });
          }
          const examIndex = examsData.exams[userIndex].examData.findIndex((e: any) => e.id === examId);
          if (examIndex === -1) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
          }
          examsData.exams[userIndex].examData.splice(examIndex, 1);
          break;

        default:
          return res.status(400).json({ success: false, message: 'Invalid action' });
      }

      fs.writeFileSync(examsFilePath, JSON.stringify(examsData, null, 2));
      return res.status(200).json({ success: true, message: 'Operation successful' });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Exams API error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
} 