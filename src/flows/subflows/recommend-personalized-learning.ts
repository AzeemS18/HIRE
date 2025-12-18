'use server';

/**
 * @fileOverview Recommends personalized learning resources based on skill gaps.
 *
 * - recommendPersonalizedLearning - A function that recommends personalized learning resources.
 * - RecommendPersonalizedLearningInput - The input type for the recommendPersonalizedLearning function.
 * - RecommendPersonalizedLearningOutput - The return type for the recommendPersonalizedLearning function.
 */

import {ai} from '@/flows/genkit';
import {z} from 'genkit';

const RecommendPersonalizedLearningInputSchema = z.object({
  jobRole: z.string().describe('The job role of the new hire.'),
  skillGaps: z
    .array(z.string())
    .describe('The skill gaps identified for the new hire.'),
});
export type RecommendPersonalizedLearningInput = z.infer<
  typeof RecommendPersonalizedLearningInputSchema
>;

const RecommendPersonalizedLearningOutputSchema = z.object({
  learningRecommendations: z
    .array(z.string())
    .describe(
      'A list of personalized learning recommendations to address the skill gaps.'
    ),
});
export type RecommendPersonalizedLearningOutput = z.infer<
  typeof RecommendPersonalizedLearningOutputSchema
>;

export async function recommendPersonalizedLearning(
  input: RecommendPersonalizedLearningInput
): Promise<RecommendPersonalizedLearningOutput> {
  return recommendPersonalizedLearningFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendPersonalizedLearningPrompt',
  input: {schema: RecommendPersonalizedLearningInputSchema},
  output: {schema: RecommendPersonalizedLearningOutputSchema},
  prompt: `You are a learning recommendation system. Given the job role of a new hire and their identified skill gaps, you will provide personalized learning recommendations to address those gaps.

Job Role: {{{jobRole}}}
Skill Gaps: {{#each skillGaps}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Provide a list of learning resources (courses, tutorials, documentation, etc.) that can help the new hire improve their skills in these areas. Return a list of recommendations.
`,
});

const recommendPersonalizedLearningFlow = ai.defineFlow(
  {
    name: 'recommendPersonalizedLearningFlow',
    inputSchema: RecommendPersonalizedLearningInputSchema,
    outputSchema: RecommendPersonalizedLearningOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

    