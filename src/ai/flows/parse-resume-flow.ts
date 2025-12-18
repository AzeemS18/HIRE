'use server';
/**
 * @fileOverview This file contains the Genkit flow for parsing a resume and extracting candidate information.
 *
 * - parseResume - A function that parses a resume and extracts candidate details.
 * - ParseResumeInput - The input type for the parseResume function.
 * - ParseResumeOutput - The return type for the parseResume function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ParseResumeInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      "A resume file, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ParseResumeInput = z.infer<typeof ParseResumeInputSchema>;

const ParseResumeOutputSchema = z.object({
  name: z.string().describe("The full name of the candidate."),
  email: z.string().describe("The email address of the candidate."),
  skills: z.array(z.string()).describe("A list of skills identified from the resume."),
  experienceLevel: z.enum(['Entry-level', 'Mid-level', 'Senior', 'Lead']).describe("The inferred experience level of the candidate."),
});
export type ParseResumeOutput = z.infer<typeof ParseResumeOutputSchema>;


export async function parseResume(
  input: ParseResumeInput
): Promise<ParseResumeOutput> {
  return parseResumeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseResumePrompt',
  input: {schema: ParseResumeInputSchema},
  output: {schema: ParseResumeOutputSchema},
  prompt: `You are an expert resume parser for a hiring application. Your task is to extract the following information from the provided resume:
- Candidate's full name
- Candidate's email address
- A list of the candidate's skills
- The candidate's experience level (must be one of: 'Entry-level', 'Mid-level', 'Senior', 'Lead')

Analyze the content of the resume below and return the extracted data in the specified JSON format.

Resume:
{{media url=resumeDataUri}}
`,
});

const parseResumeFlow = ai.defineFlow(
  {
    name: 'parseResumeFlow',
    inputSchema: ParseResumeInputSchema,
    outputSchema: ParseResumeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
