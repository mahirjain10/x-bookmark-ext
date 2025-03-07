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
router.post("/folders", createFolder);
router.delete("/folders/:id", deleteFolder);
router.put("/folders/:id", renameFolder);
router.put("/folders/:id/move", moveFolder);
router.get("/folders/:userId", getUserFolders);
router.post("/folders/:id/copy", copyFolder);

export default router;
