
import { Router } from "express";
import { ContactController } from "../controllers/contactController";

const router = Router();
const contactController = new ContactController();

// POST /identify endpoint
router.post("/identify", contactController.identifyContact);

export default router;