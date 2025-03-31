import React from 'react';
import {
  SimpleGrid,
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
} from '@chakra-ui/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { customColors } from '../../src/theme/colors';
import { Analytics } from './types';

interface PerformanceChartsProps {
  analytics: Analytics;
}

const COLORS = [customColors.orange, customColors.coral, customColors.pink];

export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ analytics }) => {
  return (
    <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={8}>
      {/* Score Distribution Chart */}
      <Card>
        <CardHeader>
          <Heading size="md">Score Distribution</Heading>
        </CardHeader>
        <CardBody>
          <Box height="300px">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill={customColors.orange} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardBody>
      </Card>

      {/* Improvement Trend Chart */}
      <Card>
        <CardHeader>
          <Heading size="md">Performance Trend</Heading>
        </CardHeader>
        <CardBody>
          <Box height="300px">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.improvementTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="examNumber" />
                <YAxis />
                <RechartsTooltip />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke={customColors.coral}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardBody>
      </Card>

      {/* Strengths & Weaknesses Chart */}
      <Card>
        <CardHeader>
          <Heading size="md">Strengths & Weaknesses</Heading>
        </CardHeader>
        <CardBody>
          <Box height="300px">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={analytics.strengthsWeaknesses}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke={customColors.pink}
                  fill={customColors.pink}
                  fillOpacity={0.6}
                />
                <RechartsTooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Box>
        </CardBody>
      </Card>

      {/* Performance Overview Chart */}
      <Card>
        <CardHeader>
          <Heading size="md">Performance Overview</Heading>
        </CardHeader>
        <CardBody>
          <Box height="300px">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Average', value: analytics.averageScore },
                    { name: 'Highest', value: analytics.highestScore },
                    { name: 'Lowest', value: analytics.lowestScore }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.examPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </CardBody>
      </Card>
    </SimpleGrid>
  );
}; 