import { normalizeIdentifier } from '../identifiers';
import {
  DEMO_BIS_RECORDS,
  DEMO_DEBARMENT_RECORDS,
  DEMO_DPIIT_RECORDS,
  DEMO_EPFO_RECORDS,
  DEMO_ESIC_RECORDS,
  DEMO_GEM_RECORDS,
  DEMO_GST_ERROR_IDENTIFIER,
  DEMO_GST_RECORDS,
  DEMO_INCOME_TAX_RECORDS,
  DEMO_MCA_RECORDS,
  DEMO_NSIC_RECORDS,
  DEMO_PAN_RECORDS,
  DEMO_UDYAM_RECORDS,
  toSourceRecord,
  type DemoRegistryRecord,
} from './fixtures';
import type {
  AdapterLookupResult,
  VerificationAdapter,
  VerificationIdentifierTypeName,
  VerificationSourceName,
} from './types';
import { SOURCE_SUPPORTED_IDENTIFIERS, VERIFICATION_SOURCE_LABELS } from './types';

class DemoRegistryAdapter implements VerificationAdapter {
  readonly mode = 'demo' as const;

  constructor(
    readonly source: VerificationSourceName,
    private readonly records: DemoRegistryRecord[],
    private readonly errorIdentifier?: string,
  ) {}

  get displayName(): string {
    return VERIFICATION_SOURCE_LABELS[this.source];
  }

  get supportedIdentifierTypes(): readonly VerificationIdentifierTypeName[] {
    return SOURCE_SUPPORTED_IDENTIFIERS[this.source];
  }

  availability(): 'available' | 'unavailable' {
    return 'available';
  }

  async lookup(input: {
    identifierType: VerificationIdentifierTypeName;
    identifier: string;
  }): Promise<AdapterLookupResult> {
    if (!this.supportedIdentifierTypes.includes(input.identifierType)) {
      return {
        ok: false,
        code: 'UNSUPPORTED_IDENTIFIER',
        message: `${this.displayName} does not support ${input.identifierType.toUpperCase()} lookups`,
      };
    }
    const identifier = normalizeIdentifier(input.identifier);
    if (!identifier) {
      return { ok: false, code: 'INVALID_IDENTIFIER', message: 'Identifier is required' };
    }
    if (this.errorIdentifier && identifier === this.errorIdentifier) {
      return {
        ok: false,
        code: 'SOURCE_UNAVAILABLE',
        message: `${this.displayName} could not complete this lookup`,
      };
    }
    const record = this.records.find((item) => item.identifier === identifier && item.identifierType === input.identifierType);
    if (!record) {
      return {
        ok: false,
        code: 'RECORD_NOT_FOUND',
        message: 'No matching record found in the selected demo source',
      };
    }
    return { ok: true, record: toSourceRecord(this.source, this.displayName, record) };
  }
}

export function createDemoGstAdapter(): VerificationAdapter {
  return new DemoRegistryAdapter('gst', DEMO_GST_RECORDS, DEMO_GST_ERROR_IDENTIFIER);
}

export function createDemoMcaAdapter(): VerificationAdapter {
  return new DemoRegistryAdapter('mca', DEMO_MCA_RECORDS);
}

export function createDemoUdyamAdapter(): VerificationAdapter {
  return new DemoRegistryAdapter('udyam', DEMO_UDYAM_RECORDS);
}

export function createDemoGemAdapter(): VerificationAdapter {
  return new DemoRegistryAdapter('gem', DEMO_GEM_RECORDS);
}

export function createDemoPanAdapter(): VerificationAdapter {
  return new DemoRegistryAdapter('pan', DEMO_PAN_RECORDS);
}

export function createDemoIncomeTaxAdapter(): VerificationAdapter {
  return new DemoRegistryAdapter('income_tax', DEMO_INCOME_TAX_RECORDS);
}

export function createDemoEpfoAdapter(): VerificationAdapter {
  return new DemoRegistryAdapter('epfo', DEMO_EPFO_RECORDS);
}

export function createDemoEsicAdapter(): VerificationAdapter {
  return new DemoRegistryAdapter('esic', DEMO_ESIC_RECORDS);
}

export function createDemoDpiitAdapter(): VerificationAdapter {
  return new DemoRegistryAdapter('dpiit', DEMO_DPIIT_RECORDS);
}

export function createDemoNsicAdapter(): VerificationAdapter {
  return new DemoRegistryAdapter('nsic', DEMO_NSIC_RECORDS);
}

export function createDemoDebarmentAdapter(): VerificationAdapter {
  return new DemoRegistryAdapter('debarment', DEMO_DEBARMENT_RECORDS);
}

export function createDemoBisAdapter(): VerificationAdapter {
  return new DemoRegistryAdapter('bis', DEMO_BIS_RECORDS);
}

export function createDefaultVerificationAdapters(): VerificationAdapter[] {
  return [
    createDemoGstAdapter(),
    createDemoMcaAdapter(),
    createDemoUdyamAdapter(),
    createDemoGemAdapter(),
    createDemoPanAdapter(),
    createDemoIncomeTaxAdapter(),
    createDemoEpfoAdapter(),
    createDemoEsicAdapter(),
    createDemoDpiitAdapter(),
    createDemoNsicAdapter(),
    createDemoDebarmentAdapter(),
    createDemoBisAdapter(),
  ];
}

export class VerificationAdapterRegistry {
  private readonly adapters: Map<VerificationSourceName, VerificationAdapter>;

  constructor(adapters: VerificationAdapter[] = createDefaultVerificationAdapters()) {
    this.adapters = new Map(adapters.map((adapter) => [adapter.source, adapter]));
  }

  list(): VerificationAdapter[] {
    return [...this.adapters.values()];
  }

  get(source: VerificationSourceName): VerificationAdapter | undefined {
    return this.adapters.get(source);
  }

  require(source: VerificationSourceName): VerificationAdapter {
    const adapter = this.get(source);
    if (!adapter) {
      throw Object.assign(new Error(`Unknown verification source: ${source}`), { code: 'INVALID_IDENTIFIER' });
    }
    return adapter;
  }
}
