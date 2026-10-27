import { NoSuchModelError } from '@ai-sdk/provider';
import { describe, expect, it, vi } from 'vitest';
import { createCartesia } from './cartesia-provider';
import { CartesiaSpeechModel } from './cartesia-speech-model';
import { CartesiaTranscriptionModel } from './cartesia-transcription-model';

vi.mock('./version', () => ({
  VERSION: '0.0.0-test',
}));

describe('createCartesia', () => {
  it('should create speech models', () => {
    const provider = createCartesia({ apiKey: 'test-api-key' });

    expect(provider.speech('sonic-3.5')).toBeInstanceOf(CartesiaSpeechModel);
    expect(provider.speechModel?.('sonic-3.5')).toBeInstanceOf(
      CartesiaSpeechModel,
    );
    expect(provider('sonic-3.5').speech).toBeInstanceOf(CartesiaSpeechModel);
  });

  it('should create transcription models', () => {
    const provider = createCartesia({ apiKey: 'test-api-key' });

    expect(provider.transcription('ink-whisper')).toBeInstanceOf(
      CartesiaTranscriptionModel,
    );
    expect(provider.transcriptionModel?.('ink-whisper')).toBeInstanceOf(
      CartesiaTranscriptionModel,
    );
  });

  it('should expose the speech model id and provider', () => {
    const provider = createCartesia({ apiKey: 'test-api-key' });
    const model = provider.speech('sonic-3.5');

    expect(model.modelId).toBe('sonic-3.5');
    expect(model.provider).toBe('cartesia.speech');
    expect(model.specificationVersion).toBe('v4');
  });

  it('should expose the transcription model id and provider', () => {
    const provider = createCartesia({ apiKey: 'test-api-key' });
    const model = provider.transcription('ink-whisper');

    expect(model.modelId).toBe('ink-whisper');
    expect(model.provider).toBe('cartesia.transcription');
    expect(model.specificationVersion).toBe('v4');
  });

  it('should throw for unsupported model types', () => {
    const provider = createCartesia({ apiKey: 'test-api-key' });

    expect(() => provider.languageModel('sonic-3.5')).toThrow(NoSuchModelError);
    expect(() => provider.embeddingModel('sonic-3.5')).toThrow(
      NoSuchModelError,
    );
    expect(() => provider.imageModel('sonic-3.5')).toThrow(NoSuchModelError);
  });

  it('should report specification version v4', () => {
    expect(
      createCartesia({ apiKey: 'test-api-key' }).specificationVersion,
    ).toBe('v4');
  });
});
