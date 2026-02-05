'use server';
/**
 * AI-generated bio or tagline suggestion based on profile.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BioSuggestionInputSchema = z.object({
  name: z.string(),
  bio: z.string().optional(),
  interests: z.array(z.string()).optional(),
  promptAnswers: z.array(z.object({ prompt: z.string(), answer: z.string() })).optional(),
});

const BioSuggestionOutputSchema = z.object({
  suggestion: z.string().describe('A catchy bio or tagline (1-2 sentences).'),
});

export async function suggestBio(input: z.infer<typeof BioSuggestionInputSchema>): Promise<string> {
  const flow = ai.defineFlow(
    {
      name: 'bioSuggestionFlow',
      inputSchema: BioSuggestionInputSchema,
      outputSchema: BioSuggestionOutputSchema,
    },
    async input => {
      const prompt = ai.definePrompt({
        name: 'bioSuggestionPrompt',
        input: {schema: BioSuggestionInputSchema},
        output: {schema: BioSuggestionOutputSchema},
        prompt: `You are a dating profile copywriter. Generate a catchy, authentic 1-2 sentence bio or tagline for {{name}}.

Profile info:
- Current bio: {{bio}}
- Interests: {{#if interests}}{{#each interests}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not specified{{/if}}
- Prompt answers: {{#if promptAnswers}}{{#each promptAnswers}}{{prompt}}: {{answer}}{{#unless @last}}; {{/unless}}{{/each}}{{else}}None{{/if}}

Create something warm, unique, and conversational. Keep it under 150 characters.`,
      });
      const {output} = await prompt(input);
      return output!;
    }
  );
  const result = await flow(input);
  return result.suggestion;
}
