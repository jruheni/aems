import React from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Box,
  Badge,
} from '@chakra-ui/react';
import { ExamPerformance } from './types';

interface ExamTableProps {
  examPerformance: ExamPerformance[];
}

export const ExamTable: React.FC<ExamTableProps> = ({ examPerformance }) => {
  const getPerformanceBadge = (percentage: number) => {
    if (percentage >= 90) return <Badge colorScheme="green">Excellent</Badge>;
    if (percentage >= 80) return <Badge colorScheme="blue">Good</Badge>;
    if (percentage >= 70) return <Badge colorScheme="yellow">Fair</Badge>;
    return <Badge colorScheme="red">Needs Improvement</Badge>;
  };

  return (
    <Box mb={8}>
      <TableContainer>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Exam Name</Th>
              <Th isNumeric>Score</Th>
              <Th isNumeric>Total Marks</Th>
              <Th isNumeric>Percentage</Th>
              <Th>Performance</Th>
            </Tr>
          </Thead>
          <Tbody>
            {examPerformance.map((exam, index) => (
              <Tr key={index}>
                <Td>{exam.examName}</Td>
                <Td isNumeric>{exam.score}</Td>
                <Td isNumeric>{exam.totalMarks}</Td>
                <Td isNumeric>{exam.percentage.toFixed(1)}%</Td>
                <Td>{getPerformanceBadge(exam.percentage)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}; 