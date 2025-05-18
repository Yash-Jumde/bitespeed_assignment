import { Repository } from "typeorm";
import { Contact, LinkPrecedence, IdentifyRequest, IdentifyResponse } from "../models/Contact";
import { AppDataSource } from "../database/database";

export class ContactService {
  private contactRepository: Repository<Contact>;

  constructor() {
    this.contactRepository = AppDataSource.getRepository(Contact);
  }

  async identifyContact(request: IdentifyRequest): Promise<IdentifyResponse> {
    const { email, phoneNumber } = request;

    // Validate that at least one of email or phoneNumber is provided
    if (!email && !phoneNumber) {
      throw new Error("At least one of email or phoneNumber must be provided");
    }

    // Find all contacts that match the provided email or phoneNumber
    const relatedContacts = await this.findRelatedContacts(email, phoneNumber);

    // If no existing contacts found, create a new primary contact
    if (relatedContacts.length === 0) {
      const newContact = await this.createPrimaryContact(email, phoneNumber);
      return this.formatResponse(newContact);
    }

    // Find the oldest primary contact among related contacts
    const oldestPrimaryContact = await this.findOldestPrimaryContact(relatedContacts);

    // Check if the incoming request contains new information
    const hasNewInformation = this.hasNewContactInfo(relatedContacts, email, phoneNumber);

    // If there's new information, create a secondary contact
    if (hasNewInformation) {
      await this.createSecondaryContact(email, phoneNumber, oldestPrimaryContact.id);
    }

    // Update any primary contacts that should be secondary
    await this.updatePrimaryToSecondary(relatedContacts, oldestPrimaryContact.id);

    // Refresh the related contacts after any changes
    const updatedRelatedContacts = await this.findRelatedContacts(email, phoneNumber);
    
    // Return the consolidated contact information
    return this.formatResponse(oldestPrimaryContact, updatedRelatedContacts);
  }

  private async findRelatedContacts(email: string | null | undefined, phoneNumber: string | null | undefined): Promise<Contact[]> {
    // Find all contacts that match the provided email or phoneNumber
    const contacts = await this.contactRepository
        .createQueryBuilder("contact")
        .where(
        "(contact.email = :email AND :email IS NOT NULL) OR (contact.phoneNumber = :phoneNumber AND :phoneNumber IS NOT NULL)",
        { email, phoneNumber }
        )
        .getMany();

    // If we found some contacts directly, also find all linked contacts
    if (contacts.length > 0) {
        const contactIds = contacts.map(contact => contact.id);
        const linkedIds = contacts
        .filter(contact => contact.linkedId !== null)
        .map(contact => contact.linkedId as number);

        let relatedByLinkedId: Contact[] = [];
        let primaryContacts: Contact[] = [];

        // Only execute if contactIds is not empty
        if (contactIds.length > 0) {
        // Find all contacts with the same linkedId as our found contacts
        relatedByLinkedId = await this.contactRepository
            .createQueryBuilder("contact")
            .where("contact.linkedId IN (:...ids)", { ids: contactIds })
            .getMany();
        }

        // Only execute if linkedIds is not empty
        if (linkedIds.length > 0) {
        // Find primary contacts for our secondary contacts
        primaryContacts = await this.contactRepository
            .createQueryBuilder("contact")
            .where("contact.id IN (:...ids)", { ids: linkedIds })
            .getMany();
        }

        // Combine all unique contacts
        const allRelatedContacts = [...contacts, ...relatedByLinkedId, ...primaryContacts];
        
        // Remove duplicates
        const uniqueContacts = allRelatedContacts.filter((contact, index, self) =>
        index === self.findIndex((c) => c.id === contact.id)
        );
        
        return uniqueContacts;
    }

    return contacts;
  }

  private async findOldestPrimaryContact(contacts: Contact[]): Promise<Contact> {
  // Find all primary contacts or get the linked primary contacts
    const primaryContactIds = new Set<number>();
    
    contacts.forEach(contact => {
        if (contact.linkPrecedence === LinkPrecedence.PRIMARY) {
        primaryContactIds.add(contact.id);
        } else if (contact.linkedId !== null) {
        primaryContactIds.add(contact.linkedId);
        }
    });

    // Check if the set is empty
    if (primaryContactIds.size === 0) {
        // Return the first contact as a fallback
        // or throw an error depending on your business logic
        return contacts[0];
    }

    // Get all primary contacts
    const primaryContacts = await this.contactRepository
        .createQueryBuilder("contact")
        .where("contact.id IN (:...ids)", { ids: Array.from(primaryContactIds) })
        .orderBy("contact.createdAt", "ASC")
        .getMany();

    // Return the oldest primary contact
    return primaryContacts[0];
}

  private hasNewContactInfo(existingContacts: Contact[], email: string | null | undefined, phoneNumber: string | null | undefined): boolean {
    if (!email && !phoneNumber) return false;

    // Check if the email exists in any of the contacts
    const emailExists = !email || existingContacts.some(contact => contact.email === email);
    
    // Check if the phone number exists in any of the contacts
    const phoneExists = !phoneNumber || existingContacts.some(contact => contact.phoneNumber === phoneNumber);

    // Return true if either email or phone number is new
    return !(emailExists && phoneExists);
  }

  private async createPrimaryContact(email: string | null | undefined, phoneNumber: string | null | undefined): Promise<Contact> {
    const newContact = this.contactRepository.create({
      email: email || null,
      phoneNumber: phoneNumber || null,
      linkedId: null,
      linkPrecedence: LinkPrecedence.PRIMARY
    });

    return this.contactRepository.save(newContact);
  }

  private async createSecondaryContact(email: string | null | undefined, phoneNumber: string | null | undefined, primaryId: number): Promise<Contact> {
    const newContact = this.contactRepository.create({
      email: email || null,
      phoneNumber: phoneNumber || null,
      linkedId: primaryId,
      linkPrecedence: LinkPrecedence.SECONDARY
    });

    return this.contactRepository.save(newContact);
  }

  private async updatePrimaryToSecondary(contacts: Contact[], oldestPrimaryId: number): Promise<void> {
    // Get all primary contacts except the oldest one
    const primaryContactsToUpdate = contacts.filter(
      contact => contact.linkPrecedence === LinkPrecedence.PRIMARY && contact.id !== oldestPrimaryId
    );

    // Update those primary contacts to secondary
    for (const contact of primaryContactsToUpdate) {
      await this.contactRepository.update(
        { id: contact.id },
        { 
          linkedId: oldestPrimaryId, 
          linkPrecedence: LinkPrecedence.SECONDARY,
          updatedAt: new Date()
        }
      );

      // Also update any contacts that were linked to this now-secondary contact
      await this.contactRepository.update(
        { linkedId: contact.id },
        { 
          linkedId: oldestPrimaryId,
          updatedAt: new Date() 
        }
      );
    }
  }

  private formatResponse(primaryContact: Contact, allContacts: Contact[] = []): IdentifyResponse {
    // If no allContacts were provided, we're dealing with a new primary contact
    if (allContacts.length === 0) {
      allContacts = [primaryContact];
    }

    // Get all emails from the contacts (primary first)
    const emails = Array.from(new Set([
      primaryContact.email,
      ...allContacts
        .filter(contact => contact.email !== null && contact.email !== primaryContact.email)
        .map(contact => contact.email)
    ].filter(Boolean))) as string[];

    // Get all phone numbers from the contacts (primary first)
    const phoneNumbers = Array.from(new Set([
      primaryContact.phoneNumber,
      ...allContacts
        .filter(contact => contact.phoneNumber !== null && contact.phoneNumber !== primaryContact.phoneNumber)
        .map(contact => contact.phoneNumber)
    ].filter(Boolean))) as string[];

    // Get all secondary contact IDs
    const secondaryContactIds = allContacts
      .filter(contact => contact.linkPrecedence === LinkPrecedence.SECONDARY)
      .map(contact => contact.id);

    return {
      contact: {
        primaryContactId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds
      }
    };
  }
}