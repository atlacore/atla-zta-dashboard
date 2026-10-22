// Matches support.Ticket / support.Message / support.Article JSON from /ui/support/*.

export type TicketStatus = "open" | "pending" | "resolved" | "snoozed";

export type TicketCategory = "bug" | "question" | "suggestion";

export interface SupportStatus {
  enabled: boolean;
}

export interface Ticket {
  id: number;
  status: TicketStatus;
  category?: TicketCategory;
  subject?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  id: number;
  content: string;
  fromStaff: boolean;
  sender?: string;
  createdAt: string;
}

export interface TicketThread {
  ticket: Ticket;
  messages: TicketMessage[];
}

export interface SupportArticle {
  id: number;
  slug: string;
  title: string;
  description?: string;
  content: string;
  category?: string;
}

export interface NewTicket {
  category: TicketCategory;
  subject: string;
  description: string;
  page?: string;
}
