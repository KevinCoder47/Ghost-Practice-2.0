import { Router } from 'express';
import {
  getTimeEntries,
  getTimeEntryById,
  createTimeEntry,
  patchTimeEntry,
  deleteTimeEntry,
} from '../controllers/timeEntryController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/', asyncHandler(getTimeEntries));
router.get('/:id', asyncHandler(getTimeEntryById));
router.post('/', asyncHandler(createTimeEntry));
router.patch('/:id', asyncHandler(patchTimeEntry));
router.delete('/:id', asyncHandler(deleteTimeEntry));

export default router;