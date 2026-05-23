import { Router } from 'express';
import { getMatters, getMatterById } from '../controllers/matterController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/', asyncHandler(getMatters));
router.get('/:id', asyncHandler(getMatterById));

export default router;