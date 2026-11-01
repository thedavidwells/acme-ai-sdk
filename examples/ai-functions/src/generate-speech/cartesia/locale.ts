import { cartesia, type CartesiaSpeechModelOptions } from '@ai-sdk/cartesia';
import { generateSpeech } from 'ai';
import { saveAudioFile } from '../../lib/save-audio';
import { run } from '../../lib/run';

run(async () => {
  const result = await generateSpeech({
    model: cartesia.speech('sonic-3.6'),
    text: 'The meeting is on 04/20/2026 at 7:00 PM.',
    voice: 'a0e99841-438c-4a64-b679-ae501e7d6091',
    providerOptions: {
      cartesia: {
        locale: 'en-GB',
        normalization: 'en-US',
      } satisfies CartesiaSpeechModelOptions,
    },
  });

  console.log('Audio:', result.audio);
  console.log('Warnings:', result.warnings);
  console.log('Responses:', result.responses);
  console.log('Provider Metadata:', result.providerMetadata);

  await saveAudioFile(result.audio);
});
