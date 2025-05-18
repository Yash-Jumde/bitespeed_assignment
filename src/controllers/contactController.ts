import { Request, Response } from "express";
import { ContactService } from "../services/contactService";
import { IdentifyRequest } from "../models/Contact";

export class ContactController {
  private contactService: ContactService;

  constructor() {
    this.contactService = new ContactService();
  }

  identifyContact = async (req: Request, res: Response): Promise<void> => {
    try {
      // Parse and validate the request body
      const identifyRequest: IdentifyRequest = {
        email: req.body.email || null,
        phoneNumber: req.body.phoneNumber?.toString() || null,
      };

      // Call the service to identify the contact
      const response = await this.contactService.identifyContact(identifyRequest);

      // Return the response
      res.status(200).json(response);
    } catch (error) {
      console.error("Error in identifyContact:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred" 
      });
    }
  };
}