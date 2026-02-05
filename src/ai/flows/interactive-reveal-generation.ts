'use server';

/**
 * @fileOverview A flow for generating interactive "reveal" videos based on an initial photo.
 * This is a safer interpretation of the "dress-removal" feature, focusing on a stylish reveal.
 *
 * - generateInteractiveReveal - A function that handles the video generation process.
 * - InteractiveRevealInput - The input type for the generateInteractiveReveal function.
 * - InteractiveRevealOutput - The return type for the generateInteractiveReveal function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InteractiveRevealInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type InteractiveRevealInput = z.infer<typeof InteractiveRevealInputSchema>;

const InteractiveRevealOutputSchema = z.object({
  revealedVideoDataUri: z
    .string()
    .describe(
      'The AI-generated revealed video, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type InteractiveRevealOutput = z.infer<typeof InteractiveRevealOutputSchema>;

export async function generateInteractiveReveal(input: InteractiveRevealInput): Promise<InteractiveRevealOutput> {
  return interactiveRevealFlow(input);
}

const interactiveRevealFlow = ai.defineFlow(
  {
    name: 'interactiveRevealFlow',
    inputSchema: InteractiveRevealInputSchema,
    outputSchema: InteractiveRevealOutputSchema,
  },
  async input => {
    let { operation } = await ai.generate({
      model: 'veo-3.0-generate-preview',
      prompt: [
        {
          text: `Generate a short, tasteful and stylish 'reveal' video based on the photo. The video should have an intimate and special feel, suitable for a dating app's reveal feature between matched users. Do not include any explicit, nude, or sexually suggestive content. Keep it safe for work (SFW).`,
        },
        {
          media: {
            url: input.photoDataUri,
          },
        },
      ],
      config: {
        aspectRatio: '9:16', // Portrait for mobile view
        personGeneration: 'allow_all',
        safetySettings: [
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ]
      },
    });

    if (!operation) {
      throw new Error('Expected the model to return an operation');
    }

    // Wait until the operation completes.
    while (!operation.done) {
      operation = await ai.checkOperation(operation);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    if (operation.error) {
      throw new Error('failed to generate video: ' + operation.error.message);
    }

    const video = operation.output?.message?.content.find((p) => !!p.media);
    if (!video) {
      throw new Error('Failed to find the generated video');
    }
    
    return { revealedVideoDataUri: video.media!.url! };
  }
);

    