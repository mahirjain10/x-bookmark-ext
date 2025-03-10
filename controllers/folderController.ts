// controllers.ts
import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import Folder, { IFolder } from "../models/FolderSchema";
import Bookmark from "../models/BookmarkSchema";
import sendResponse from "../utils/sendResponse";

export const createFolder = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { userId, name, parentFolder, isParentRoot } = req.body;

    // Validate and convert parentFolder if provided
    let parentFolderId: Types.ObjectId | null = null;
    if (parentFolder) {
      if (!mongoose.Types.ObjectId.isValid(parentFolder)) {
        return sendResponse(
          res,
          400,
          "Invalid parentFolder ID",
          null,
          "Invalid ObjectId"
        );
      }
      parentFolderId = new mongoose.Types.ObjectId(parentFolder);
    }

    // If isParentRoot is true, parentFolder must be null
    if (isParentRoot && parentFolderId) {
      return sendResponse(
        res,
        400,
        "Root folders cannot have a parent folder",
        null,
        "Invalid parentFolder for root"
      );
    }

    // If isParentRoot is false and no parentFolder provided, error unless explicitly allowed
    if (!isParentRoot && !parentFolderId && parentFolder !== null) {
      return sendResponse(
        res,
        400,
        "Non-root folders must have a parent folder",
        null,
        "Missing parentFolder"
      );
    }

    // Check for duplicate folder name under the same parent
    const existingFolder = await Folder.findOne({
      userId,
      name,
      parentFolder: parentFolderId,
    });
    if (existingFolder) {
      return sendResponse(
        res,
        400,
        "A folder with this name already exists",
        null,
        "Duplicate folder name"
      );
    }

    // Create new folder
    const folder = new Folder({
      userId,
      name,
      parentFolder: parentFolderId,
      isParentRoot: !!isParentRoot,
    });
    await folder.save();

    return sendResponse(res, 201, "Folder created successfully", folder);
  } catch (error: any) {
    console.error("Error creating folder:", error);
    return sendResponse(res, 500, "Internal Server Error", null, error.message);
  }
};

export const deleteFolder = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const folder = (await Folder.findById(req.params.id)) as IFolder | null;
    if (!folder) return sendResponse(res, 404, "Folder not found");

    // Recursive function to delete folder and all its children
    const deleteFolderRecursively = async (folderId: string): Promise<void> => {
      // Delete all bookmarks in the current folder
      await Bookmark.deleteMany({ folder: folderId });

      // Find all child folders
      const childFolders = await Folder.find({ parentFolder: folderId });

      // Recursively delete each child folder
      for (const childFolder of childFolders) {
        const childFolderID = childFolder._id.toString();
        await deleteFolderRecursively(childFolderID);
      }

      // Delete the current folder
      await Folder.findByIdAndDelete(folderId);
    };

    // Start the recursive deletion with the target folder
    await deleteFolderRecursively(req.params.id);

    return sendResponse(
      res,
      200,
      "Folder and all its contents deleted successfully"
    );
  } catch (error: any) {
    console.error("Error deleting folder:", error);
    return sendResponse(res, 500, "Internal Server Error", null, error.message);
  }
};

export const renameFolder = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { name } = req.body;
    const folder = (await Folder.findById(req.params.id)) as IFolder | null;
    if (!folder) return sendResponse(res, 404, "Folder not found");

    // Check if a folder with the same name exists under the same parent
    const existingFolder = await Folder.findOne({
      userId: folder.userId,
      name,
      parentFolder: folder.parentFolder,
    }).lean();

    if (
      existingFolder &&
      existingFolder._id.toString() !== folder._id.toString()
    ) {
      return sendResponse(res, 400, "A folder with this name already exists");
    }

    folder.name = name;
    await folder.save();

    return sendResponse(res, 200, "Folder renamed successfully", folder);
  } catch (error: any) {
    console.error("Error renaming folder:", error);
    return sendResponse(res, 500, "Internal Server Error", null, error.message);
  }
};

export const moveFolder = async (req: Request, res: Response): Promise<any> => {
  try {
    const { newParentFolder } = req.body;
    const folder = (await Folder.findById(req.params.id)) as IFolder | null;
    if (!folder) return sendResponse(res, 404, "Folder not found");

    const parentFolderId: Types.ObjectId | null = newParentFolder
      ? new mongoose.Types.ObjectId(newParentFolder)
      : null;

    // If folder is root and moving to a parent, update isParentRoot
    if (folder.isParentRoot && parentFolderId) {
      folder.isParentRoot = false;
    }

    if (parentFolderId && folder._id.equals(parentFolderId)) {
      return sendResponse(res, 400, "A folder cannot be moved into itself");
    }

    if (parentFolderId) {
      const parentFolder = (await Folder.findById(
        parentFolderId
      )) as IFolder | null;
      if (!parentFolder)
        return sendResponse(res, 404, "Target parent folder not found");
    } else if (!folder.isParentRoot) {
      // If moving to null and not root, make it root
      folder.isParentRoot = true;
    }

    // Prevent circular reference
    let currentParent = parentFolderId;
    while (currentParent) {
      if (folder._id.equals(currentParent)) {
        return sendResponse(
          res,
          400,
          "A folder cannot be moved inside its own subfolder"
        );
      }
      const parent = (await Folder.findById(currentParent)) as IFolder | null;
      if (!parent) break; // Exit if parent not found
      currentParent = parent.parentFolder;
    }

    folder.parentFolder = parentFolderId;
    await folder.save();

    return sendResponse(res, 200, "Folder moved successfully", folder);
  } catch (error: any) {
    console.error("Error moving folder:", error);
    return sendResponse(res, 500, "Internal Server Error", null, error.message);
  }
};

export const getUserFolders = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const folders = await Folder.find({ userId: req.params.userId }).populate({
      path: "parentFolder",
      select: "name", // Specify fields you want from parentFolder
    });
    return sendResponse(res, 200, "Folders retrieved successfully", folders);
  } catch (error: any) {
    console.error("Error fetching folders:", error);
    return sendResponse(res, 500, "Internal Server Error", null, error.message);
  }
};


export const copyFolder = async (req: Request, res: Response): Promise<any> => {
  try {
    const { newName } = req.body; // User-specified name (optional)
    const folder = (await Folder.findById(req.params.id)) as IFolder | null;
    if (!folder) return sendResponse(res, 404, "Folder not found");

    const parentFolderId = folder.parentFolder;
    let finalName = newName || folder.name; // Use provided name or default to original

    // Ensure unique name within the same parent folder
    let count = 2;
    while (
      await Folder.findOne({
        userId: folder.userId,
        name: finalName,
        parentFolder: parentFolderId,
      }).lean()
    ) {
      finalName = `${newName || folder.name} ${count}`;
      count++;
    }

    // Create a new folder with the copied details
    const newFolder = new Folder({
      userId: folder.userId,
      name: finalName,
      isParentRoot: folder.isParentRoot,
      parentFolder: parentFolderId,
    });

    await newFolder.save();

    return sendResponse(res, 201, "Folder copied successfully", newFolder);
  } catch (error: any) {
    console.error("Error copying folder:", error);
    return sendResponse(res, 500, "Internal Server Error", null, error.message);
  }
};
