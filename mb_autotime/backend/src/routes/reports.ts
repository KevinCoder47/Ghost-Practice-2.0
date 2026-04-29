import { Router } from 'express';
import { getProductivityReport, getDailyReport } from '../controllers/reportController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/productivity', asyncHandler(getProductivityReport));
router.get('/daily/:attorney_id', asyncHandler(getDailyReport));

export default router;