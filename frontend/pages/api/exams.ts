import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface ExamData {
  id: string;
  title: string;
  description?: string;
  language?: string;
  created_at?: string;
  created_by: string;
  questions?: any[];
}

interface UserExams {
  userId: string;
  examData: ExamData[];
}

interface ExamsFile {
  users: { [userId: string]: ExamData[] };
}

const readExamsFile = (filePath: string): ExamsFile => {
  if (!fs.existsSync(filePath)) {
    return { users: {} };
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!data.users) {
      return { users: {} };
    }
    return data;
  } catch (error) {
    console.error("Error reading or parsing exams.json:", error);
    return { users: {} };
  }
};

const writeExamsFile = (filePath: string, data: ExamsFile): void => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("--- API /api/exams handler started (Simplified Test v2) ---", req.method);

  console.log("[API - Simplified v2] Request Headers:", req.headers);
  console.log("[API - Simplified v2] Request Body:", req.body);

  if (req.method === 'POST') {
    const receivedLanguage = req.body?.language;
    console.log("[API - Simplified v2] Extracted language from body:", receivedLanguage);

    const dummyResponse: ExamData = {
      id: uuidv4(),
      title: req.body?.title || "Test Title",
      description: req.body?.description || "Test Desc",
      language: "Swahili",
      created_at: new Date().toISOString(),
      created_by: req.body?.created_by || "test-user",
      questions: []
    };
    console.log("[API - Simplified v2] Returning dummy Swahili response:", dummyResponse);
    return res.status(201).json(dummyResponse);

  } else if (req.method === 'GET') {
    console.log("[API - Simplified v2] Handling GET request.");
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "User ID required"});
    return res.status(200).json([]);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
} 