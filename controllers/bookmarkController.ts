import Bookmark, { IBookmark } from "../models/BookmarkSchema"; // Adjust path as needed
import Folder, { IFolder } from "../models/FolderSchema"; // Adjust path as needed
import { Request, Response } from "express";
import sendResponse from "../utils/sendResponse"; // Adjust path as needed

// Get all bookmarks by userId
export const getBookmarksByUserId = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { userId } = req.params;
    const bookmarks = await Bookmark.find({ userId }).populate({
      path: "folder",
      model: Folder,
      select: "name userId isParentRoot parentFolder",
    });
    return sendResponse(
      res,
      200,
      "Bookmarks retrieved successfully",
      bookmarks
    );
  } catch (error) {
    return sendResponse(res, 500, "Error fetching bookmarks", null, error);
  }
};

// Get all bookmarks by folder
export const getBookmarksByFolder = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { folderId } = req.params;
    const folder = await Folder.findById(folderId);

    if (!folder) {
      return sendResponse(res, 404, "Folder not found");
    }

    const bookmarks = await Bookmark.find({ folder: folderId }).populate({
      path: "folder",
      model: Folder,
      select: "name userId isParentRoot parentFolder",
    });
    return sendResponse(
      res,
      200,
      "Folder bookmarks retrieved successfully",
      bookmarks
    );
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Error fetching folder bookmarks",
      null,
      error
    );
  }
};

// Create a new bookmark
export const createBookmark = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { userId, title, url, folder } = req.body;

    // Validate folder if provided
    if (folder) {
      const folderDoc = await Folder.findById(folder);
      if (!folderDoc) {
        return sendResponse(res, 404, "Folder not found");
      }
      if (folderDoc.userId !== userId) {
        return sendResponse(res, 403, "Folder belongs to different user");
      }
    }

    const bookmark = new Bookmark({
      userId,
      title,
      url,
      folder: folder || null,
    });

    const savedBookmark = await bookmark.save();
    return sendResponse(
      res,
      201,
      "Bookmark created successfully",
      savedBookmark
    );
  } catch (error) {
    return sendResponse(res, 500, "Error creating bookmark", null, error);
  }
};

// Move bookmark to another folder
export const moveBookmark = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { bookmarkId } = req.params;
    const { newFolderId } = req.body;

    const bookmark = await Bookmark.findById(bookmarkId);
    if (!bookmark) {
      return sendResponse(res, 404, "Bookmark not found");
    }

    // Validate new folder if provided
    if (newFolderId) {
      const newFolder = await Folder.findById(newFolderId);
      if (!newFolder) {
        return sendResponse(res, 404, "Target folder not found");
      }
      if (newFolder.userId !== bookmark.userId) {
        return sendResponse(
          res,
          403,
          "Target folder belongs to different user"
        );
      }
      if (bookmark.folder?.toString() === newFolderId) {
        return sendResponse(res, 400, "Cannot move to same folder");
      }
    }

    bookmark.folder = newFolderId || null;
    const updatedBookmark = await bookmark.save();
    return sendResponse(
      res,
      200,
      "Bookmark moved successfully",
      updatedBookmark
    );
  } catch (error) {
    return sendResponse(res, 500, "Error moving bookmark", null, error);
  }
};

// Copy bookmark to another folder
export const copyBookmark = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { bookmarkId } = req.params;
    const { targetFolderId } = req.body;

    const originalBookmark = await Bookmark.findById(bookmarkId);
    if (!originalBookmark) {
      return sendResponse(res, 404, "Bookmark not found");
    }

    // Validate target folder if provided
    if (targetFolderId) {
      const targetFolder = await Folder.findById(targetFolderId);
      if (!targetFolder) {
        return sendResponse(res, 404, "Target folder not found");
      }
      if (targetFolder.userId !== originalBookmark.userId) {
        return sendResponse(
          res,
          403,
          "Target folder belongs to different user"
        );
      }
    }

    const newBookmark = new Bookmark({
      userId: originalBookmark.userId,
      title: originalBookmark.title,
      url: originalBookmark.url,
      folder: targetFolderId || null,
    });

    const savedBookmark = await newBookmark.save();
    return sendResponse(
      res,
      201,
      "Bookmark copied successfully",
      savedBookmark
    );
  } catch (error) {
    return sendResponse(res, 500, "Error copying bookmark", null, error);
  }
};

// Delete a bookmark
export const deleteBookmark = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { bookmarkId } = req.params;
    const bookmark = await Bookmark.findByIdAndDelete(bookmarkId);

    if (!bookmark) {
      return sendResponse(res, 404, "Bookmark not found");
    }

    return sendResponse(res, 200, "Bookmark deleted successfully");
  } catch (error) {
    return sendResponse(res, 500, "Error deleting bookmark", null, error);
  }
};

// Rename a bookmark
export const renameBookmark = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { bookmarkId } = req.params;
    const { newTitle } = req.body;

    if (!newTitle || typeof newTitle !== "string" || newTitle.trim() === "") {
      return sendResponse(res, 400, "Valid new title is required");
    }

    const bookmark = await Bookmark.findById(bookmarkId);
    if (!bookmark) {
      return sendResponse(res, 404, "Bookmark not found");
    }

    bookmark.title = newTitle.trim();
    const updatedBookmark = await bookmark.save();
    return sendResponse(
      res,
      200,
      "Bookmark renamed successfully",
      updatedBookmark
    );
  } catch (error) {
    return sendResponse(res, 500, "Error renaming bookmark", null, error);
  }
};

// Get bookmark by ID
export const getBookmarkById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { bookmarkId } = req.params;
    const bookmark = await Bookmark.findById(bookmarkId).populate({
      path: "folder",
      model: Folder,
      select: "name userId isParentRoot parentFolder",
    });

    if (!bookmark) {
      return sendResponse(res, 404, "Bookmark not found");
    }

    return sendResponse(res, 200, "Bookmark retrieved successfully", bookmark);
  } catch (error) {
    return sendResponse(res, 500, "Error fetching bookmark", null, error);
  }
};
