import { createHash } from 'node:crypto';

import type { AiProvider } from '../ai.provider';
import type { AiEmbedInput, AiEmbedResult, AiProviderGenerateInput, AiProviderGenerateResult } from '../ai.types';

export const MOCK_EMBEDDING_DIMENSIONS = 8;

export interface MockAiProviderOptions {
  model?: string;
}

export class MockAiProvider implements AiProvider {
  readonly name = 'mock';
  private readonly model: string;
  private readonly queue: Array<string | Error> = [];

  constructor(options: MockAiProviderOptions = {}) {
    this.model = options.model ?? 'mock';
  }

  enqueue(response: string | Error): void {
    this.queue.push(response);
  }

  async ping(): Promise<void> {
    return undefined;
  }

  async embed(input: AiEmbedInput): Promise<AiEmbedResult> {
    return {
      embedding: mockEmbedding(input.text),
      model: input.model ?? this.model,
      provider: this.name,
    };
  }

  async generateText(input: AiProviderGenerateInput): Promise<AiProviderGenerateResult> {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next instanceof Error) {
        throw next;
      }

      return {
        text: next ?? '',
        model: this.model,
        finishReason: 'STOP',
      };
    }

    return {
      text: input.json ? JSON.stringify(this.defaultStructured(input)) : this.defaultText(),
      model: this.model,
      finishReason: 'STOP',
    };
  }

  private defaultText(): string {
    return 'Mock AI response for local testing, CI, and demo mode.';
  }

  private defaultStructured(input: AiProviderGenerateInput): unknown {
    switch (input.operation) {
      case 'summarize':
        return {
          summary: 'Mock summary of the provided text.',
          keyPoints: ['Mock key point from the source content.'],
          actions: [],
        };
      case 'classify': {
        const category = input.metadata?.labels?.[0] ?? 'general';
        return {
          category,
          priority: 'medium',
          sentiment: 'neutral',
          confidence: 0.9,
          reason: 'Mock classification for local testing.',
        };
      }
      case 'extract':
        return defaultExtract(input.metadata?.schemaName, input.metadata?.fields);
      case 'analyze':
        return {
          summary: 'Mock analysis of the provided text.',
          findings: ['The mock provider returned a deterministic analysis.'],
          risks:
            input.metadata?.focus === 'risk'
              ? [
                  {
                    risk: 'Mock risk identified for local testing.',
                    severity: 'low',
                    likelihood: 'low',
                    mitigation: 'Review the source content with a human.',
                  },
                ]
              : [],
          sentiment: 'neutral',
          priority: 'medium',
          confidence: 0.9,
          requiresReview: false,
        };
      case 'recommend':
        return {
          recommendations: [
            {
              recommendation: 'Review the current process',
              reason: 'Mock recommendation for local testing.',
              evidence: 'The provided context described a process issue.',
              confidence: 0.8,
            },
          ],
        };
      case 'draft':
        return {
          draft: 'Mock draft response for a human to review before sending.',
          subject: 'Following up',
          alternatives: [],
          warnings: ['Review this draft before sending.'],
          confidence: 0.85,
          requiresReview: true,
        };
        default:
        if (input.metadata?.schemaName === 'decision') {
          return {
            result: { status: 'ok' },
            confidence: 0.9,
            evidence: ['Mock decision evidence for local testing.'],
            requiresReview: false,
          };
        }
        if (input.metadata?.schemaName === 'emailContent') {
          return {
            subject: 'Update about {{topic}}',
            preview: 'Hello {{displayName}}',
            body: 'This message uses only verified application facts for {{topic}}.',
            warnings: ['Review this draft before sending.'],
            confidence: 0.85,
            requiresReview: true,
          };
        }
        return {
          category: 'general',
          priority: 'medium',
          reason: 'Mock structured result for local testing.',
        };
    }
  }
}

function defaultExtract(schemaName?: string, fields: string[] = []): unknown {
  if (schemaName === 'entities') {
    return {
      fields: {
        people: [],
        organizations: [],
        locations: [],
        dates: [],
        amounts: [],
        identifiers: [],
      },
      missingFields: [],
      confidence: 0.9,
      warnings: [],
      requiresReview: false,
    };
  }

  if (schemaName === 'actionItems') {
    return {
      fields: {
        actionItems: [
          {
            action: 'Follow up with the customer',
            owner: null,
            due: null,
            priority: 'medium',
          },
        ],
      },
      missingFields: ['owner', 'due'],
      confidence: 0.8,
      warnings: ['Owner and due date were not stated.'],
      requiresReview: true,
    };
  }

  return {
    fields: Object.fromEntries(fields.map((field) => [field, `sample ${field}`])),
    missingFields: [],
    confidence: 0.9,
    warnings: [],
    requiresReview: false,
  };
}

export function mockEmbedding(text: string, dimensions = MOCK_EMBEDDING_DIMENSIONS): number[] {
  const digest = createHash('sha256').update(text).digest();
  const values: number[] = [];
  for (let index = 0; index < dimensions; index += 1) {
    const byte = digest[index % digest.length] ?? 0;
    values.push(Number((byte / 127.5 - 1).toFixed(6)));
  }
  return values;
}
