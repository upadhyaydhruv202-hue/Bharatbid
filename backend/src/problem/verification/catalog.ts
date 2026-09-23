import type { AppConfig } from '../../types/config';
import { AuthorizedHttpAdapter } from './http-adapter';
import {
  createDefaultVerificationAdapters,
  VerificationAdapterRegistry,
} from './registry';
import type { VerificationAdapter, VerificationSourceName } from './types';

export type ProviderHealthStatus =
  | 'LIVE'
  | 'SANDBOX'
  | 'DEMO'
  | 'READY_FOR_CREDENTIALS'
  | 'PROVIDER_REQUIRED'
  | 'MANUAL_VERIFICATION';

export interface ProviderCatalogEntry {
  source: VerificationSourceName;
  module: string;
  authority: string;
  selectedProvider: string;
  classification: 'OFFICIAL' | 'AUTHORIZED_PROVIDER' | 'COMMERCIAL_PROVIDER' | 'MANUAL_ONLY' | 'UNKNOWN';
  status: ProviderHealthStatus;
  configured: boolean;
  realTime: boolean;
  sandbox: boolean;
  mode: 'demo' | 'sandbox' | 'live' | 'manual';
  advisory: string;
}

const MODULES: Array<{
  source: VerificationSourceName;
  module: string;
  authority: string;
  selectedProvider: string;
  classification: ProviderCatalogEntry['classification'];
  fallback: Exclude<ProviderHealthStatus, 'LIVE' | 'SANDBOX' | 'DEMO'>;
}> = [
  {
    source: 'gst',
    module: 'GST',
    authority: 'GSTN via authorized provider (Setu Data Gateway). Not API Setu (apisetu.gov.in).',
    selectedProvider: 'Setu GSTIN Verification',
    classification: 'AUTHORIZED_PROVIDER',
    fallback: 'READY_FOR_CREDENTIALS',
  },
  {
    source: 'pan',
    module: 'PAN',
    authority: 'NSDL/UTIITSL via authorized KYC providers',
    selectedProvider: 'Setu PAN Verification',
    classification: 'AUTHORIZED_PROVIDER',
    fallback: 'READY_FOR_CREDENTIALS',
  },
  {
    source: 'mca',
    module: 'MCA',
    authority: 'Ministry of Corporate Affairs (portal + OGD dumps). No public MCA21 API for this product.',
    selectedProvider: 'Manual MCA master-data check',
    classification: 'MANUAL_ONLY',
    fallback: 'MANUAL_VERIFICATION',
  },
  {
    source: 'udyam',
    module: 'UDYAM',
    authority: 'Ministry of MSME (udyamregistration.gov.in verify page)',
    selectedProvider: 'Manual Udyam portal verification',
    classification: 'MANUAL_ONLY',
    fallback: 'MANUAL_VERIFICATION',
  },
  {
    source: 'dpiit',
    module: 'DPIIT',
    authority: 'DPIIT / Startup India',
    selectedProvider: 'Manual recognition certificate',
    classification: 'MANUAL_ONLY',
    fallback: 'MANUAL_VERIFICATION',
  },
  {
    source: 'income_tax',
    module: 'Income Tax',
    authority: 'Income Tax Department',
    selectedProvider: 'Manual / authorized PAN-IT status',
    classification: 'MANUAL_ONLY',
    fallback: 'MANUAL_VERIFICATION',
  },
  {
    source: 'epfo',
    module: 'EPFO',
    authority: 'EPFO',
    selectedProvider: 'Manual establishment check',
    classification: 'MANUAL_ONLY',
    fallback: 'MANUAL_VERIFICATION',
  },
  {
    source: 'esic',
    module: 'ESIC',
    authority: 'ESIC',
    selectedProvider: 'Manual registration check',
    classification: 'MANUAL_ONLY',
    fallback: 'MANUAL_VERIFICATION',
  },
  {
    source: 'gem',
    module: 'GeM',
    authority: 'Government e-Marketplace',
    selectedProvider: 'Manual seller profile evidence',
    classification: 'MANUAL_ONLY',
    fallback: 'PROVIDER_REQUIRED',
  },
  {
    source: 'nsic',
    module: 'NSIC',
    authority: 'NSIC',
    selectedProvider: 'Manual certificate evidence',
    classification: 'MANUAL_ONLY',
    fallback: 'MANUAL_VERIFICATION',
  },
  {
    source: 'debarment',
    module: 'DEBARMENT',
    authority: 'Procuring entity / GeM restriction lists',
    selectedProvider: 'Manual debarment order evidence',
    classification: 'MANUAL_ONLY',
    fallback: 'MANUAL_VERIFICATION',
  },
  {
    source: 'bis',
    module: 'BIS / OEM / Make in India',
    authority: 'BIS / DPIIT / OEM letters',
    selectedProvider: 'Evidence-based (certificate upload)',
    classification: 'MANUAL_ONLY',
    fallback: 'MANUAL_VERIFICATION',
  },
];

export function gstHttpConfig(config: AppConfig): ConstructorParameters<typeof AuthorizedHttpAdapter>[0] | null {
  const baseUrl = config.verification?.gst.baseUrl;
  const clientId = config.verification?.gst.clientId;
  const clientSecret = config.verification?.gst.clientSecret;
  const productInstanceId = config.verification?.gst.productInstanceId;
  if (!baseUrl || !clientId || !clientSecret) {
    return null;
  }
  const mode = config.verification?.gst.mode === 'live' ? 'live' : 'sandbox';
  return {
    source: 'gst',
    authority: 'GSTN via Setu Data Gateway',
    providerName: 'Setu GSTIN Verification',
    mode,
    baseUrl,
    pathTemplate: config.verification?.gst.pathTemplate ?? '/api/gstin/{identifier}',
    method: (config.verification?.gst.method as 'GET' | 'POST') ?? 'GET',
    headers: {
      'x-client-id': clientId,
      'x-client-secret': clientSecret,
      ...(productInstanceId ? { 'x-product-instance-id': productInstanceId } : {}),
    },
    timeoutMs: config.verification?.timeoutMs,
  };
}

export function panHttpConfig(config: AppConfig): ConstructorParameters<typeof AuthorizedHttpAdapter>[0] | null {
  const baseUrl = config.verification?.pan.baseUrl;
  const clientId = config.verification?.pan.clientId;
  const clientSecret = config.verification?.pan.clientSecret;
  if (!baseUrl || !clientId || !clientSecret) {
    return null;
  }
  const mode = config.verification?.pan.mode === 'live' ? 'live' : 'sandbox';
  return {
    source: 'pan',
    authority: 'NSDL/UTIITSL via authorized KYC provider',
    providerName: 'Setu PAN Verification',
    mode,
    baseUrl,
    pathTemplate: config.verification?.pan.pathTemplate ?? '/api/pan/{identifier}',
    method: (config.verification?.pan.method as 'GET' | 'POST') ?? 'GET',
    headers: {
      'x-client-id': clientId,
      'x-client-secret': clientSecret,
    },
    timeoutMs: config.verification?.timeoutMs,
  };
}

export function buildVerificationRegistry(config: AppConfig): VerificationAdapterRegistry {
  let adapters: VerificationAdapter[] = [...createDefaultVerificationAdapters()];
  const wrap = (http: NonNullable<ReturnType<typeof gstHttpConfig>>) => {
    const live = new AuthorizedHttpAdapter(http);
    const demo = adapters.find((item) => item.source === http.source);
    adapters = [
      new OrchestratedAdapter(live, demo, config.demoMode),
      ...adapters.filter((item) => item.source !== http.source),
    ];
  };
  const gst = gstHttpConfig(config);
  if (gst) {
    wrap(gst);
  }
  const pan = panHttpConfig(config);
  if (pan) {
    wrap(pan);
  }
  return new VerificationAdapterRegistry(adapters);
}

export class OrchestratedAdapter implements VerificationAdapter {
  readonly source: VerificationSourceName;
  readonly displayName: string;
  readonly mode: VerificationAdapter['mode'];
  readonly supportedIdentifierTypes: VerificationAdapter['supportedIdentifierTypes'];

  constructor(
    private readonly primary: VerificationAdapter & { isConfigured?: () => boolean },
    private readonly fallback: VerificationAdapter | undefined,
    private readonly allowDemo: boolean,
  ) {
    this.source = primary.source;
    const usePrimary = primary.availability() === 'available';
    this.displayName = usePrimary ? primary.displayName : (fallback?.displayName ?? primary.displayName);
    this.mode = usePrimary ? primary.mode : (fallback?.mode ?? 'demo');
    this.supportedIdentifierTypes = primary.supportedIdentifierTypes;
  }

  availability() {
    if (this.primary.availability() === 'available') {
      return 'available';
    }
    if (this.allowDemo && this.fallback) {
      return this.fallback.availability();
    }
    return 'unavailable';
  }

  async lookup(input: Parameters<VerificationAdapter['lookup']>[0]) {
    if (this.primary.availability() === 'available') {
      return this.primary.lookup(input);
    }
    if (this.allowDemo && this.fallback) {
      return this.fallback.lookup(input);
    }
    return {
      ok: false as const,
      code: 'SOURCE_UNAVAILABLE' as const,
      message: 'MANUAL_VERIFICATION_REQUIRED — no authorized provider is configured',
    };
  }
}

export function listProviderCatalog(config: AppConfig, registry: VerificationAdapterRegistry): ProviderCatalogEntry[] {
  const httpBySource: Partial<Record<VerificationSourceName, ReturnType<typeof gstHttpConfig>>> = {
    gst: gstHttpConfig(config),
    pan: panHttpConfig(config),
  };
  return MODULES.map((module) => {
    const adapter = registry.get(module.source);
    const http = httpBySource[module.source];
    const configured = Boolean(http);
    let status: ProviderHealthStatus;
    let mode: ProviderCatalogEntry['mode'] = config.demoMode ? 'demo' : 'manual';
    if (configured && http) {
      if (http.mode === 'sandbox') {
        status = 'SANDBOX';
        mode = 'sandbox';
      } else {
        status = 'READY_FOR_CREDENTIALS';
        mode = 'manual';
      }
    } else if (config.demoMode) {
      status = 'DEMO';
      mode = 'demo';
    } else {
      status = module.fallback;
      mode = 'manual';
    }
    return {
      source: module.source,
      module: module.module,
      authority: module.authority,
      selectedProvider: configured && http ? http.providerName : module.selectedProvider,
      classification: module.classification,
      status,
      configured: configured || (config.demoMode && adapter?.availability() === 'available'),
      realTime: false,
      sandbox: configured && http?.mode === 'sandbox',
      mode,
      advisory: configured
        ? http?.mode === 'sandbox'
          ? 'SANDBOX credentials are configured. Catalog is not LIVE. A successful authorized HTTPS lookup is required before any LIVE badge.'
          : 'Production-mode credentials are present. Catalog remains READY_FOR_CREDENTIALS until a successful authorized HTTPS lookup is stored. This is not LIVE.'
        : config.demoMode
          ? 'DEMO — SYNTHETIC DATA. Not an official government response.'
          : 'Manual officer verification against the official source is required.',
    };
  });
}
