import { Request, Response } from "express";
import mongoose from "mongoose";
import Folder from "../schema/FolderSchema"; // Adjust path if needed
import sendResponse from "../utils/sendResponse"; // Helper function

export const searchFolder = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { query, userId } = req.query; // Get search query and optional userId

    if (!query) {
      return sendResponse(res, 400, "Search query is required");
    }

    const searchFilter: any = {
      name: { $regex: query, $options: "i" }, // Case-insensitive search
    };

    if (userId) {
      searchFilter.userId = userId; // Optional: filter by user
    }

    const folders = await Folder.find(searchFilter).lean();

    return sendResponse(res, 200, "Folders fetched successfully", folders);
  } catch (error: any) {
    console.error("Error searching folders:", error);
    return sendResponse(res, 500, "Internal Server Error", null, error.message);
  }
};
