'use server';
/**
 * @fileOverview Flow for generating a personalized 6-8 second video from uploaded photos.
 *
 * - generateProfileVideo - A function that handles the video generation process.
 * - GenerateProfileVideoInput - The input type for the generateProfileVideo function.
 * - GenerateProfileVideoOutput - The return type for the generateProfileVideo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProfileVideoInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  style: z
    .string()
    .describe("The desired style of the video, e.g., 'traditional Indian' or 'modern'."),
});
export type GenerateProfileVideoInput = z.infer<typeof GenerateProfileVideoInputSchema>;

const GenerateProfileVideoOutputSchema = z.object({
  videoDataUri: z
    .string()
    .describe('The generated video as a data URI (video/mp4) with base64 encoding.'),
});
export type GenerateProfileVideoOutput = z.infer<typeof GenerateProfileVideoOutputSchema>;

export async function generateProfileVideo(input: GenerateProfileVideoInput): Promise<GenerateProfileVideoOutput> {
  return generateProfileVideoFlow(input);
}

const generateProfileVideoFlow = ai.defineFlow(
  {
    name: 'generateProfileVideoFlow',
    inputSchema: GenerateProfileVideoInputSchema,
    outputSchema: GenerateProfileVideoOutputSchema,
  },
  async input => {
    let { operation } = await ai.generate({
      model: 'veo-3.0-generate-preview',
      prompt: [
        {
          text: `Generate a short, SFW (safe for work) video in the style of ${input.style} based on the following photo. The video should be suitable for use as a dating profile teaser. Do not include any explicit or suggestive content.`,
        },
        {
          media: {
            url: input.photoDataUri,
          },
        },
      ],
      config: {
        aspectRatio: '16:9',
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

    // Wait until the operation completes. Note that this may take some time, maybe even up to a minute. Design the UI accordingly.
    while (!operation.done) {
      operation = await ai.checkOperation(operation);
      // Sleep for 5 seconds before checking again.
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    if (operation.error) {
      throw new Error('failed to generate video: ' + operation.error.message);
    }

    const video = operation.output?.message?.content.find((p) => !!p.media);
    if (!video) {
      throw new Error('Failed to find the generated video');
    }

    return { videoDataUri: video.media!.url };
  }
);

    