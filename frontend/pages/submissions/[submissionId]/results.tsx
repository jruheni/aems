import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    Heading,
    Text,
    Spinner,
    Alert,
    AlertIcon,
    VStack,
    Divider,
    Card,
    CardHeader,
    CardBody,
    SimpleGrid,
    Tag,
} from '@chakra-ui/react';
import { supabase } from '@/src/services/supabaseClient'; // Adjust path as needed

// Define the structure for detailed results (matching backend)
interface QuestionResult {
    question_number: number | string; // Allow flexibility (e.g., "Q1", "Section A")
    score: number;
    feedback: string;
    // Add other potential fields like criteria_met: string[]
}

interface DetailedGradingResults {
    overall_score: number;
    overall_feedback: string;
    question_results: QuestionResult[];
}

interface SubmissionDetails {
    id: string;
    student_name: string; // Assuming this comes with submission data
    exam_title: string; // Assuming this comes with submission data
    submitted_at: string;
    file_url: string; // URL to the submitted file
    // Add other relevant submission fields
    detailed_results: DetailedGradingResults | null; // Holds the new structured results
    score: number | null; // Keep for backward compatibility
    feedback: string | null; // Keep for backward compatibility
}

const GradingResultsPage: React.FC = () => {
    const router = useRouter();
    const { submissionId } = router.query;
    const [submission, setSubmission] = useState<SubmissionDetails | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSubmissionDetails = async () => {
            if (!submissionId || typeof submissionId !== 'string') {
                setError('Invalid Submission ID.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // TODO: Replace with your actual API call or Supabase query
                // Example using Supabase client directly (adjust table/column names)
                const { data, error: dbError } = await supabase
                    .from('submissions') // Replace 'submissions' with your actual table name
                    .select(`
                        *,
                        exam:exams ( title ),
                        student:profiles ( name ) 
                    `) // Adjust related tables/columns
                    .eq('id', submissionId)
                    .single();

                if (dbError) {
                    throw dbError;
                }

                if (!data) {
                    throw new Error('Submission not found.');
                }
                
                // Basic transformation (adapt as needed based on your actual data)
                 const transformedData: SubmissionDetails = {
                    id: data.id,
                    student_name: data.student?.name || 'Unknown Student',
                    exam_title: data.exam?.title || 'Unknown Exam',
                    submitted_at: data.created_at, // Assuming created_at is submission time
                    file_url: data.file_url,
                    detailed_results: data.detailed_results, // Assuming column name
                    score: data.score,
                    feedback: data.feedback,
                 };


                setSubmission(transformedData);

            } catch (err: any) {
                console.error("Error fetching submission details:", err);
                setError(err.message || 'Failed to fetch submission details.');
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissionDetails();
    }, [submissionId]);

    const renderResults = () => {
        if (!submission) return null;

        // Prefer detailed results if available
        if (submission.detailed_results) {
            const results = submission.detailed_results;
            return (
                <VStack spacing={6} align="stretch">
                    <Card variant="outline">
                        <CardHeader>
                            <Heading size="md">Overall Summary</Heading>
                        </CardHeader>
                        <CardBody>
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                <Text><strong>Overall Score:</strong> {results.overall_score}</Text>
                            </SimpleGrid>
                            <Text mt={4}><strong>Overall Feedback:</strong></Text>
                            <Text whiteSpace="pre-wrap">{results.overall_feedback || 'No overall feedback provided.'}</Text>
                        </CardBody>
                    </Card>

                    <Heading size="lg" mt={6}>Per-Question Breakdown</Heading>
                    {results.question_results?.length > 0 ? (
                        results.question_results.map((qResult, index) => (
                            <Card key={index} variant="outline">
                                <CardHeader>
                                    <Heading size="sm">Question {qResult.question_number}</Heading>
                                </CardHeader>
                                <CardBody>
                                     <Text><strong>Score:</strong> {qResult.score}</Text>
                                     <Text mt={2}><strong>Feedback:</strong></Text>
                                     <Text whiteSpace="pre-wrap">{qResult.feedback || 'No feedback for this question.'}</Text>
                                     {/* Add display for criteria met if needed */}
                                </CardBody>
                            </Card>
                        ))
                    ) : (
                         <Text>No per-question breakdown available.</Text>
                    )}
                </VStack>
            );
        } 
        // Fallback for older submissions without detailed results
        else if (submission.score !== null || submission.feedback) {
             return (
                <Card variant="outline">
                    <CardHeader><Heading size="md">Grading Results</Heading></CardHeader>
                    <CardBody>
                         <Text><strong>Score:</strong> {submission.score ?? 'Not scored'}</Text>
                         <Text mt={4}><strong>Feedback:</strong></Text>
                         <Text whiteSpace="pre-wrap">{submission.feedback || 'No feedback provided.'}</Text>
                         <Text mt={4} fontStyle="italic">(Detailed breakdown not available for this submission)</Text>
                    </CardBody>
                </Card>
             );
        } else {
            return <Text>This submission has not been graded yet.</Text>
        }
    };


    return (
        <Box p={6}>
            <Heading mb={6}>Grading Results</Heading>

            {loading && <Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" color="blue.500" size="xl" />}

            {error && (
                <Alert status="error" mb={4}>
                    <AlertIcon />
                    {error}
                </Alert>
            )}

            {submission && !loading && (
                <VStack spacing={4} align="stretch">
                     <Card variant="outline">
                         <CardHeader><Heading size="md">Submission Details</Heading></CardHeader>
                         <CardBody>
                             <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                                 <Text><strong>Student:</strong> {submission.student_name}</Text>
                                 <Text><strong>Exam:</strong> {submission.exam_title}</Text>
                                 <Text><strong>Submitted At:</strong> {new Date(submission.submitted_at).toLocaleString()}</Text>
                                 <Text><strong>Submission ID:</strong> {submission.id}</Text>
                             </SimpleGrid>
                             {/* Add a link/button to view the actual submission file */}
                              <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
                                 <Tag mt={4} colorScheme="blue">View Submitted File</Tag>
                             </a>
                         </CardBody>
                     </Card>
                     
                     <Divider my={6} />

                     {renderResults()}
                     
                </VStack>
            )}
        </Box>
    );
};

export default GradingResultsPage; 