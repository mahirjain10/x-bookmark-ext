import express from "express";
import { searchFolder } from "../controllers/searchController"; // Adjust path if needed

const router = express.Router();

router.get("/search", searchFolder); // Example: /folders/search?query=work

export default router;
