'use server';
/**
 * @fileOverview This file contains the Genkit flow for the Xyro chatbot.
 *
 * - xyroChat - A function that takes a message and returns a response from the AI.
 * - XyroChatInput - The input type for the xyroChat function.
 * - XyroChatOutput - The return type for the xyroChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const XyroChatInputSchema = z.object({
  message: z.string().describe("The user's message to the chatbot."),
});
export type XyroChatInput = z.infer<typeof XyroChatInputSchema>;

const XyroChatOutputSchema = z.object({
  response: z.string().describe("The chatbot's response."),
});
export type XyroChatOutput = z.infer<typeof XyroChatOutputSchema>;

export async function xyroChat(input: XyroChatInput): Promise<XyroChatOutput> {
  return xyroChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'xyroChatPrompt',
  input: {schema: XyroChatInputSchema},
  output: {schema: XyroChatOutputSchema},
  prompt: `You are Xyro, a powerful, helpful, and friendly AI assistant, similar to Gemini, designed for the HireGenius AI platform. Your goal is to provide intelligent and helpful responses to a wide variety of user questions.

While your primary focus is assisting users of the HireGenius platform, you have a vast general knowledge and can answer questions on almost any topic. Be conversational, clear, and helpful.

User message: {{{message}}}
  `,
});

const xyroChatFlow = ai.defineFlow(
  {
    name: 'xyroChatFlow',
    inputSchema: XyroChatInputSchema,
    outputSchema: XyroChatOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      return output!;
    } catch (error: any) {
      console.error('Error in xyroChatFlow:', error);
      if (error.message.includes('503 Service Unavailable') || error.message.includes('overloaded')) {
        return { response: "The AI is currently experiencing high demand, which may cause it to be temporarily unavailable. Please try again in a few moments." };
      }
      // Re-throw other errors to be caught by the client-side handler
      throw new Error("An unexpected error occurred while communicating with the AI.");
    }
  }
);
