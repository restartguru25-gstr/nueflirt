'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating AI avatars from user-uploaded photos.
 *
 * It includes:
 * - `generateAiAvatar`:  A function that takes a user's photo as input and returns a data URI of the AI-generated avatar.
 * - `AiAvatarInput`: The input type for the `generateAiAvatar` function.
 * - `AiAvatarOutput`: The output type for the `generateAiAvatar` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiAvatarInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      'A photo of the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type AiAvatarInput = z.infer<typeof AiAvatarInputSchema>;

const AiAvatarOutputSchema = z.object({
  avatarDataUri: z
    .string()
    .describe(
      'The AI-generated avatar, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type AiAvatarOutput = z.infer<typeof AiAvatarOutputSchema>;

export async function generateAiAvatar(input: AiAvatarInput): Promise<AiAvatarOutput> {
  return aiAvatarFlow(input);
}

const aiAvatarPrompt = ai.definePrompt({
  name: 'aiAvatarPrompt',
  input: {schema: AiAvatarInputSchema},
  output: {schema: AiAvatarOutputSchema},
  prompt: `You are an AI avatar generator.  Take the user's photo and generate a profile picture avatar of them. Make it stylish and appropriate for a dating app.  Do not show anything explicit.

User photo: {{media url=photoDataUri}}`,
});

const aiAvatarFlow = ai.defineFlow(
  {
    name: 'aiAvatarFlow',
    inputSchema: AiAvatarInputSchema,
    outputSchema: AiAvatarOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      prompt: [
        {media: {url: input.photoDataUri}},
        {text: 'generate an image of this character in a modern dating app style'},
      ],
      model: 'googleai/gemini-1.5-flash',
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE, IMAGE only won't work
      },
    });
    return {avatarDataUri: media!.url!};
  }
);
