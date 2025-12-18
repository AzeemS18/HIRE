import { config } from 'dotenv';
config();

import '@/ai/flows/generate-role-based-screening-questions.ts';
import '@/ai/flows/recommend-personalized-learning.ts';
import '@/ai/flows/summarize-interview-feedback.ts';
import '@/ai/flows/parse-resume-flow.ts';
import '@/ai/flows/xyro-chat-flow.ts';
