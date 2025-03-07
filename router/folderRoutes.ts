// routes.ts
import express from "express";
import {
  createFolder,
  deleteFolder,
  renameFolder,
  moveFolder,
  getUserFolders,
  copyFolder,
} from "../controllers/folderController";

const router = express.Router();

// Folder Routes
router.post("/", createFolder);
router.delete("/:id", deleteFolder);
router.put("/:id", renameFolder);
router.put("/:id/move", moveFolder);
router.get("/:userId", getUserFolders);
router.post("/:id/copy", copyFolder);

export default router;
