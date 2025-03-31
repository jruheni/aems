import React from 'react';
import {
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  StatGroup,
  Box,
} from '@chakra-ui/react';
import { FaGraduationCap, FaTrophy, FaChartLine } from 'react-icons/fa';
import { customColors } from '../../src/theme/colors';
import { Analytics } from './types';

interface PerformanceStatsProps {
  analytics: Analytics;
}

export const PerformanceStats: React.FC<PerformanceStatsProps> = ({ analytics }) => {
  const isImproving = analytics.improvementTrend.length > 1 &&
    analytics.improvementTrend[analytics.improvementTrend.length - 1].percentage >
    analytics.improvementTrend[0].percentage;

  return (
    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
      <StatGroup
        bg="white"
        p={6}
        borderRadius="lg"
        boxShadow="sm"
        border="1px"
        borderColor="gray.200"
        _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
        transition="all 0.2s"
      >
        <Stat>
          <StatLabel color="gray.600">Average Score</StatLabel>
          <StatNumber color={customColors.orange}>
            {analytics.averageScore.toFixed(1)}%
          </StatNumber>
          <StatHelpText>
            <StatArrow type={isImproving ? 'increase' : 'decrease'} />
            {isImproving ? 'Improving' : 'Needs Improvement'}
          </StatHelpText>
        </Stat>
      </StatGroup>

      <StatGroup
        bg="white"
        p={6}
        borderRadius="lg"
        boxShadow="sm"
        border="1px"
        borderColor="gray.200"
        _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
        transition="all 0.2s"
      >
        <Stat>
          <StatLabel color="gray.600">Highest Score</StatLabel>
          <StatNumber color={customColors.coral}>
            {analytics.highestScore.toFixed(1)}%
          </StatNumber>
          <StatHelpText>Best Performance</StatHelpText>
        </Stat>
      </StatGroup>

      <StatGroup
        bg="white"
        p={6}
        borderRadius="lg"
        boxShadow="sm"
        border="1px"
        borderColor="gray.200"
        _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
        transition="all 0.2s"
      >
        <Stat>
          <StatLabel color="gray.600">Total Exams</StatLabel>
          <StatNumber color={customColors.pink}>
            {analytics.totalExams}
          </StatNumber>
          <StatHelpText>Completed Assessments</StatHelpText>
        </Stat>
      </StatGroup>
    </SimpleGrid>
  );
}; 