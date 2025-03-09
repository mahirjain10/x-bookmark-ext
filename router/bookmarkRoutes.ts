import express from "express";
import {
  createBookmark,
  getBookmarkById,
  getBookmarksByFolder,
  getBookmarksByUserId,
  moveBookmark,
  copyBookmark,
  deleteBookmark,
  renameBookmark,
} from "../controllers/bookmarkController"; // Adjust path as needed

const router = express.Router();

// Get all bookmarks for a user
router.get("/user/:userId", getBookmarksByUserId);

// Get all bookmarks in a specific folder
router.get("/folder/:folderId", getBookmarksByFolder);

// Create a new bookmark
router.post("/", createBookmark);

// Move a bookmark to another folder
router.patch("/move/:bookmarkId", moveBookmark);

// Copy a bookmark to another folder
router.post("/copy/:bookmarkId", copyBookmark);

// Delete a bookmark
router.delete("/:bookmarkId", deleteBookmark);

// Rename a bookmark
router.patch("/rename/:bookmarkId", renameBookmark);

// Get a specific bookmark by ID
router.get("/:bookmarkId", getBookmarkById);

export default router;
