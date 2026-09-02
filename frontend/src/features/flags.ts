export const FEATURE_NAMES = [
  'ai',
  'notifications',
  'otp',
  'sms',
  's3',
  'pdf',
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];

export interface PublicFeatureState {
  demoMode: boolean;
  features: Record<string, boolean>;
}

export const DISABLED_FEATURE_STATE: PublicFeatureState = {
  demoMode: false,
  features: {},
};

export function isFeatureEnabled(state: PublicFeatureState, name: string): boolean {
  return state.features[name] === true;
}

export function isDemoMode(state: PublicFeatureState): boolean {
  return state.demoMode === true;
}
