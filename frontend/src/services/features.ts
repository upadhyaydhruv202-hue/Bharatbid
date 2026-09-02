import { apiGet } from './api';
import type { PublicFeatureState } from '../features/flags';

export function getFeatures() {
  return apiGet<PublicFeatureState>('/api/v1/features');
}
