'use server';
/**
 * @fileOverview This file contains the Genkit flow for generating role-based screening questions.
 *
 * generateRoleBasedScreeningQuestions - A function that generates screening questions for a given role.
 * GenerateRoleBasedScreeningQuestionsInput - The input type for the generateRoleBasedScreeningQuestions function.
 * GenerateRoleBasedScreeningQuestionsOutput - The return type for the generateRoleBasedScreeningQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRoleBasedScreeningQuestionsInputSchema = z.object({
  jobRole: z.string().describe('The job role for which to generate screening questions.'),
  jobDescription: z.string().describe('The job description for the role.'),
  candidateSkills: z.string().describe('The skills of the candidate.'),
});
export type GenerateRoleBasedScreeningQuestionsInput = z.infer<typeof GenerateRoleBasedScreeningQuestionsInputSchema>;

const GenerateRoleBasedScreeningQuestionsOutputSchema = z.object({
  screeningQuestions: z.array(
    z.string().describe('A screening question relevant to the job role.')
  ).describe('A list of exactly 5 screening questions for the job role.'),
});
export type GenerateRoleBasedScreeningQuestionsOutput = z.infer<typeof GenerateRoleBasedScreeningQuestionsOutputSchema>;

export async function generateRoleBasedScreeningQuestions(
  input: GenerateRoleBasedScreeningQuestionsInput
): Promise<GenerateRoleBasedScreeningQuestionsOutput> {
  return generateRoleBasedScreeningQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRoleBasedScreeningQuestionsPrompt',
  input: {schema: GenerateRoleBasedScreeningQuestionsInputSchema},
  output: {schema: GenerateRoleBasedScreeningQuestionsOutputSchema},
  prompt: `You are an AI assistant designed to generate screening questions for recruiters.

  Given the job role, job description, and the candidate's skills, generate a list of exactly 5 screening questions to assess the candidate's suitability for the role.
  Return the questions in an array.

  Job Role: {{{jobRole}}}
  Job Description: {{{jobDescription}}}
  Candidate Skills: {{{candidateSkills}}}
  `,
});

const generateRoleBasedScreeningQuestionsFlow = ai.defineFlow(
  {
    name: 'generateRoleBasedScreeningQuestionsFlow',
    inputSchema: GenerateRoleBasedScreeningQuestionsInputSchema,
    outputSchema: GenerateRoleBasedScreeningQuestionsOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      return output!;
    } catch (error: any) {
      console.error('Error in generateRoleBasedScreeningQuestionsFlow:', error);
      if (error.message.includes('503 Service Unavailable') || error.message.includes('overloaded')) {
        // Re-throw a more user-friendly error to be caught by the client
        throw new Error("The AI service is currently overloaded. Please try again in a few moments.");
      }
      // Re-throw other errors to be caught by the client-side handler
      throw new Error("An unexpected error occurred while communicating with the AI.");
    }
  }
);
