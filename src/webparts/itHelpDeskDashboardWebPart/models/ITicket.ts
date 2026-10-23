export type TicketPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type TicketStatus = 'Open' | 'In Progress' | 'Pending User' | 'Resolved' | 'Closed';
export type TicketCategory = 'Hardware' | 'Software' | 'Network & VPN' | 'Access & Security' | 'Email & M365' | 'Cloud & Server';

export interface ITicket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  requester: string;
  requesterEmail: string;
  department: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  slaDue: string;
  slaStatus: 'on-track' | 'warning' | 'breached';
  commentsCount: number;
}

export interface IDeskStats {
  total: number;
  open: number;
  inProgress: number;
  critical: number;
  resolvedToday: number;
  avgResolutionHours: number;
  slaComplianceRate: number;
}
