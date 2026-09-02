import { Router, type RequestHandler } from 'express';

import type { FeaturesController } from '../controllers/features.controller';

export function createFeaturesRouter(options: {
  controller: FeaturesController;
  publicRateLimit: RequestHandler;
}): Router {
  const router = Router();
  router.get('/features', options.publicRateLimit, options.controller.getFeatures);
  return router;
}
