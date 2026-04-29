import { Router } from 'express';
import {
  getActivities,
  suggestEntry,
  createActivity,
} from '../controllers/activityController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// /suggest must be registered before any /:id routes
router.post('/suggest', asyncHandler(suggestEntry));
router.get('/', asyncHandler(getActivities));
router.post('/', asyncHandler(createActivity));

export default router;