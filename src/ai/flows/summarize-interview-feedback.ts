'use server';

/**
 * @fileOverview Summarizes interview feedback using AI to provide a quick overview of the candidate's performance.
 *
 * - summarizeInterviewFeedback - A function that takes interview feedback as input and returns a summary.
 * - SummarizeInterviewFeedbackInput - The input type for the summarizeInterviewFeedback function.
 * - SummarizeInterviewFeedbackOutput - The return type for the summarizeInterviewFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeInterviewFeedbackInputSchema = z.object({
  feedback: z.string().describe('The interview feedback to summarize.'),
});

export type SummarizeInterviewFeedbackInput = z.infer<typeof SummarizeInterviewFeedbackInputSchema>;

const SummarizeInterviewFeedbackOutputSchema = z.object({
  summary: z.string().describe('A summary of the interview feedback.'),
});

export type SummarizeInterviewFeedbackOutput = z.infer<typeof SummarizeInterviewFeedbackOutputSchema>;

export async function summarizeInterviewFeedback(input: SummarizeInterviewFeedbackInput): Promise<SummarizeInterviewFeedbackOutput> {
  return summarizeInterviewFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeInterviewFeedbackPrompt',
  input: {schema: SummarizeInterviewFeedbackInputSchema},
  output: {schema: SummarizeInterviewFeedbackOutputSchema},
  prompt: `You are an AI assistant helping recruiters by summarizing interview feedback.

  Summarize the following interview feedback:
  {{{feedback}}}
  `,
});

const summarizeInterviewFeedbackFlow = ai.defineFlow(
  {
    name: 'summarizeInterviewFeedbackFlow',
    inputSchema: SummarizeInterviewFeedbackInputSchema,
    outputSchema: SummarizeInterviewFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
