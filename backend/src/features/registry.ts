export const FEATURE_NAMES = [
  'ai',
  'notifications',
  'otp',
  'sms',
  's3',
  'pdf',
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];

export type FeatureMap = Record<FeatureName, boolean>;

export interface FeatureDefinition {
  name: FeatureName;
  envVar: string;
  aliases: string[];
  default: boolean;
  dependencies: FeatureName[];
  purpose: string;
}

export const FEATURE_REGISTRY: Record<FeatureName, FeatureDefinition> = {
  ai: {
    name: 'ai',
    envVar: 'FEATURE_AI',
    aliases: ['AI_ENABLED'],
    default: false,
    dependencies: [],
    purpose: 'LLM toolkit, document intelligence, and mock or Gemini providers',
  },
  notifications: {
    name: 'notifications',
    envVar: 'FEATURE_NOTIFICATIONS',
    aliases: [],
    default: false,
    dependencies: [],
    purpose: 'Extra notification side effects (for example document-analysis alerts). Inbox HTTP stays available when the database is configured',
  },
  otp: {
    name: 'otp',
    envVar: 'FEATURE_OTP',
    aliases: [],
    default: false,
    dependencies: [],
    purpose: 'Hashed one-time passcodes, OTP HTTP, and password reset',
  },
  sms: {
    name: 'sms',
    envVar: 'FEATURE_SMS',
    aliases: ['SMS_ENABLED'],
    default: false,
    dependencies: [],
    purpose: 'Transactional SMS channel and SmsService',
  },
  s3: {
    name: 's3',
    envVar: 'FEATURE_S3',
    aliases: ['STORAGE_PROVIDER=s3'],
    default: false,
    dependencies: [],
    purpose: 'Require AWS S3 secrets; STORAGE_PROVIDER=s3 also enables this flag',
  },
  pdf: {
    name: 'pdf',
    envVar: 'FEATURE_PDF',
    aliases: [],
    default: true,
    dependencies: [],
    purpose: 'PDF generate and report HTTP APIs. Defaults on so existing apps keep those routes; set FEATURE_PDF=false to disable',
  },
};

export const DISABLED_FEATURES: FeatureMap = {
  ai: false,
  notifications: false,
  otp: false,
  sms: false,
  s3: false,
  pdf: false,
};

export function isFeatureName(value: string): value is FeatureName {
  return (FEATURE_NAMES as readonly string[]).includes(value);
}

export function listFeatureRegistry(): FeatureDefinition[] {
  return FEATURE_NAMES.map((name) => FEATURE_REGISTRY[name]);
}
