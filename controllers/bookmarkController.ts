import { Request, Response } from "express";
import Bookmark, { IBookmark } from "../models/BookmarkSchema";
import Folder, { IFolder } from "../models/FolderSchema";
import sendResponse from "../utils/sendResponse";
import mongoose, { MongooseError } from "mongoose";

// Extended Request type to include user from session
interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
  };
}

// Get all bookmarks by userId
export const getBookmarksByUserId = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    
    // Ensure user can only access their own bookmarks
    if (userId !== req.user?.userId) {
      sendResponse(res, 403, "Access denied: You can only view your own bookmarks");
      return;
    }

    const bookmarks = await Bookmark.find({ userId })
      .populate({
        path: "folder",
        model: Folder,
        select: "name userId isParentRoot parentFolder",
      })
      .sort({ createdAt: -1 });

    sendResponse(res, 200, "Bookmarks retrieved successfully", bookmarks);
  } catch (error: unknown) {
    const err = error as MongooseError;
    sendResponse(res, 500, "Error fetching bookmarks", null, err);
  }
};

// Get all bookmarks by folder
export const getBookmarksByFolder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { folderId } = req.params;
    const folder = await Folder.findById(folderId);

    if (!folder) {
      sendResponse(res, 404, "Folder not found");
      return;
    }

    // Ensure user can only access their own folders
    if (folder.userId !== req.user?.userId) {
      sendResponse(res, 403, "Access denied: You can only view your own folders");
      return;
    }

    const bookmarks = await Bookmark.find({ folder: folderId })
      .populate({
        path: "folder",
        model: Folder,
        select: "name userId isParentRoot parentFolder",
      })
      .sort({ createdAt: -1 });

    sendResponse(res, 200, "Folder bookmarks retrieved successfully", bookmarks);
  } catch (error: unknown) {
    const err = error as MongooseError;
    sendResponse(res, 500, "Error fetching folder bookmarks", null, err);
  }
};

// Create a new bookmark
export const createBookmark = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { title, url, folder } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      sendResponse(res, 401, "User not authenticated");
      return;
    }

    const bookmark = new Bookmark({
      userId,
      title,
      url,
      folder: folder || null,
    });

    const savedBookmark = await bookmark.save();
    await savedBookmark.populate({
      path: "folder",
      select: "name userId isParentRoot parentFolder"
    });

    sendResponse(res, 201, "Bookmark created successfully", savedBookmark);
  } catch (error: unknown) {
    const err = error as MongooseError;
    if (err.name === 'ValidationError') {
      sendResponse(res, 400, err.message, null, err);
      return;
    }
    sendResponse(res, 500, "Error creating bookmark", null, err);
  }
};

// Move bookmark to another folder
export const moveBookmark = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookmarkId } = req.params;
    const { newFolderId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      sendResponse(res, 401, "User not authenticated");
      return;
    }

    const bookmark = await Bookmark.findById(bookmarkId);
    if (!bookmark) {
      sendResponse(res, 404, "Bookmark not found");
      return;
    }

    // Ensure user owns the bookmark
    if (bookmark.userId !== userId) {
      sendResponse(res, 403, "Access denied: You can only modify your own bookmarks");
      return;
    }

    bookmark.folder = newFolderId || null;
    const updatedBookmark = await bookmark.save();
    await updatedBookmark.populate({
      path: "folder",
      select: "name userId isParentRoot parentFolder"
    });

    sendResponse(res, 200, "Bookmark moved successfully", updatedBookmark);
  } catch (error: unknown) {
    const err = error as MongooseError;
    if (err.name === 'ValidationError') {
      sendResponse(res, 400, err.message, null, err);
      return;
    }
    sendResponse(res, 500, "Error moving bookmark", null, err);
  }
};

// Copy bookmark to another folder
export const copyBookmark = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookmarkId } = req.params;
    const { targetFolderId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      sendResponse(res, 401, "User not authenticated");
      return;
    }

    const originalBookmark = await Bookmark.findById(bookmarkId);
    if (!originalBookmark) {
      sendResponse(res, 404, "Bookmark not found");
      return;
    }

    // Ensure user owns the bookmark
    if (originalBookmark.userId !== userId) {
      sendResponse(res, 403, "Access denied: You can only copy your own bookmarks");
      return;
    }

    const newBookmark = new Bookmark({
      userId,
      title: originalBookmark.title,
      url: originalBookmark.url,
      folder: targetFolderId || null,
    });

    const savedBookmark = await newBookmark.save();
    await savedBookmark.populate({
      path: "folder",
      select: "name userId isParentRoot parentFolder"
    });

    sendResponse(res, 201, "Bookmark copied successfully", savedBookmark);
  } catch (error: unknown) {
    const err = error as MongooseError;
    if (err.name === 'ValidationError') {
      sendResponse(res, 400, err.message, null, err);
      return;
    }
    sendResponse(res, 500, "Error copying bookmark", null, err);
  }
};

// Delete a bookmark
export const deleteBookmark = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookmarkId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendResponse(res, 401, "User not authenticated");
      return;
    }

    const bookmark = await Bookmark.findById(bookmarkId);
    if (!bookmark) {
      sendResponse(res, 404, "Bookmark not found");
      return;
    }

    // Ensure user owns the bookmark
    if (bookmark.userId !== userId) {
      sendResponse(res, 403, "Access denied: You can only delete your own bookmarks");
      return;
    }

    await bookmark.deleteOne();
    sendResponse(res, 200, "Bookmark deleted successfully");
  } catch (error: unknown) {
    const err = error as MongooseError;
    sendResponse(res, 500, "Error deleting bookmark", null, err);
  }
};

// Rename a bookmark
export const renameBookmark = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookmarkId } = req.params;
    const { title } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      sendResponse(res, 401, "User not authenticated");
      return;
    }

    const bookmark = await Bookmark.findById(bookmarkId);
    if (!bookmark) {
      sendResponse(res, 404, "Bookmark not found");
      return;
    }

    // Ensure user owns the bookmark
    if (bookmark.userId !== userId) {
      sendResponse(res, 403, "Access denied: You can only rename your own bookmarks");
      return;
    }

    bookmark.title = title;
    const updatedBookmark = await bookmark.save();
    await updatedBookmark.populate({
      path: "folder",
      select: "name userId isParentRoot parentFolder"
    });

    sendResponse(res, 200, "Bookmark renamed successfully", updatedBookmark);
  } catch (error: unknown) {
    const err = error as MongooseError;
    if (err.name === 'ValidationError') {
      sendResponse(res, 400, err.message, null, err);
      return;
    }
    sendResponse(res, 500, "Error renaming bookmark", null, err);
  }
};

// Get bookmark by ID
export const getBookmarkById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookmarkId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendResponse(res, 401, "User not authenticated");
      return;
    }

    const bookmark = await Bookmark.findById(bookmarkId).populate({
      path: "folder",
      select: "name userId isParentRoot parentFolder"
    });

    if (!bookmark) {
      sendResponse(res, 404, "Bookmark not found");
      return;
    }

    // Ensure user owns the bookmark
    if (bookmark.userId !== userId) {
      sendResponse(res, 403, "Access denied: You can only view your own bookmarks");
      return;
    }

    sendResponse(res, 200, "Bookmark retrieved successfully", bookmark);
  } catch (error: unknown) {
    const err = error as MongooseError;
    sendResponse(res, 500, "Error fetching bookmark", null, err);
  }
};
