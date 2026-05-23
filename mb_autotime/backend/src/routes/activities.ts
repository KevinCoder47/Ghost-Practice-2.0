import { Router } from 'express';
import {
  getActivities,
  suggestEntry,
  createActivity,
  simulateEntries,
} from '../controllers/activityController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// /suggest and /simulate must be registered before any /:id routes
router.post('/suggest', asyncHandler(suggestEntry));
router.post('/simulate', asyncHandler(simulateEntries));
router.get('/', asyncHandler(getActivities));
router.post('/', asyncHandler(createActivity));

export default router;