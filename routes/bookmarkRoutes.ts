import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { validateSession } from '../middleware/authMiddleware';
import {
  getBookmarksByUserId,
  getBookmarksByFolder,
  createBookmark,
  moveBookmark,
  copyBookmark,
  deleteBookmark,
  renameBookmark,
  getBookmarkById
} from '../controllers/bookmarkController';

const router = express.Router();

// All routes are protected by validateSession middleware
router.use(validateSession as RequestHandler);

// Validate user ownership middleware
const validateUserOwnership: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const requestedUserId = req.params.userId;

    if (userId !== requestedUserId) {
      res.status(403).json({ error: 'Access denied: You can only access your own bookmarks' });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Inject user ID middleware
const injectUserId: RequestHandler = (req, res, next) => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    req.body.userId = req.user.userId;
    next();
  } catch (error) {
    next(error);
  }
};

// GET routes
router.get('/user/:userId', validateUserOwnership, getBookmarksByUserId);
router.get('/folder/:folderId', getBookmarksByFolder);
router.get('/:bookmarkId', getBookmarkById);

// POST routes
router.post('/create', injectUserId, createBookmark);

// PUT routes
router.put('/move/:bookmarkId', moveBookmark);
router.put('/copy/:bookmarkId', copyBookmark);
router.put('/rename/:bookmarkId', renameBookmark);

// DELETE routes
router.delete('/:bookmarkId', deleteBookmark);

export default router;
