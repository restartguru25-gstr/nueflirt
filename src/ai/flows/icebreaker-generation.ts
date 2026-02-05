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

const IcebreakerInputSchema = z.object({
  currentUserProfile: z.object({
    name: z.string(),
    bio: z.string().optional(),
    interests: z.array(z.string()).optional(),
  }),
  otherUserProfile: z.object({
    name: z.string(),
    bio: z.string().optional(),
    interests: z.array(z.string()).optional(),
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

- {{otherUserProfile.name}}'s bio: {{otherUserProfile.bio}}
- {{otherUserProfile.name}}'s interests: {{#if otherUserProfile.interests}}{{#each otherUserProfile.interests}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not specified{{/if}}

Based on their profiles, generate 3-4 unique, engaging, and slightly playful icebreaker questions that {{currentUserProfile.name}} could send to {{otherUserProfile.name}}. The questions should be open-ended and reference their shared interests or something intriguing in their bios. Avoid generic questions.`,
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
