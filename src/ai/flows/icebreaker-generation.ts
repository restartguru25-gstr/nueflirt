'use server';
/**
 * @fileOverview A flow for generating conversation starters (icebreakers).
 *
 * - generateIcebreakers - A function that generates icebreakers based on user profiles.
 * - IcebreakerInput - The input type for the generateIcebreakers function.
 * - IcebreakerOutput - The return type for the generateIcebreakers function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PromptAnswerSchema = z.object({ prompt: z.string(), answer: z.string() });

const IcebreakerInputSchema = z.object({
  currentUserProfile: z.object({
    name: z.string(),
    bio: z.string().optional(),
    interests: z.array(z.string()).optional(),
    promptAnswers: z.array(PromptAnswerSchema).optional(),
  }),
  otherUserProfile: z.object({
    name: z.string(),
    bio: z.string().optional(),
    interests: z.array(z.string()).optional(),
    promptAnswers: z.array(PromptAnswerSchema).optional(),
  }),
});
export type IcebreakerInput = z.infer<typeof IcebreakerInputSchema>;

const IcebreakerOutputSchema = z.object({
  icebreakers: z.array(z.string()).describe('An array of 3-4 creative and fun conversation starters.'),
});
export type IcebreakerOutput = z.infer<typeof IcebreakerOutputSchema>;

export async function generateIcebreakers(input: IcebreakerInput): Promise<IcebreakerOutput> {
  return icebreakerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'icebreakerPrompt',
  input: {schema: IcebreakerInputSchema},
  output: {schema: IcebreakerOutputSchema},
  prompt: `You are a witty and charming dating assistant. Your goal is to help a user, {{currentUserProfile.name}}, start a fun conversation with {{otherUserProfile.name}}.

Here is some information about them:
- {{currentUserProfile.name}}'s bio: {{currentUserProfile.bio}}
- {{currentUserProfile.name}}'s interests: {{#if currentUserProfile.interests}}{{#each currentUserProfile.interests}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not specified{{/if}}
- {{currentUserProfile.name}}'s prompt answers: {{#if currentUserProfile.promptAnswers}}{{#each currentUserProfile.promptAnswers}}{{this.prompt}}: {{this.answer}}{{#unless @last}}; {{/unless}}{{/each}}{{else}}None{{/if}}

- {{otherUserProfile.name}}'s bio: {{otherUserProfile.bio}}
- {{otherUserProfile.name}}'s interests: {{#if otherUserProfile.interests}}{{#each otherUserProfile.interests}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not specified{{/if}}
- {{otherUserProfile.name}}'s prompt answers: {{#if otherUserProfile.promptAnswers}}{{#each otherUserProfile.promptAnswers}}{{this.prompt}}: {{this.answer}}{{#unless @last}}; {{/unless}}{{/each}}{{else}}None{{/if}}

Based on their profiles and prompt answers, generate 3-4 unique, engaging, and slightly playful icebreaker questions that {{currentUserProfile.name}} could send to {{otherUserProfile.name}}. Reference shared interests, bios, or their prompt answers (e.g. "My perfect weekend...", "Red flag for me...") to personalize. Avoid generic questions.`,
});

const icebreakerFlow = ai.defineFlow(
  {
    name: 'icebreakerFlow',
    inputSchema: IcebreakerInputSchema,
    outputSchema: IcebreakerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
