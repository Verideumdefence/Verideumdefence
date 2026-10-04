// =========================================
// DATA MODELS FOR VERIDEUMDEFENCE
// =========================================
// Types aligned with backend API structure

// =========================================
// USER & AUTH TYPES
// =========================================

export type UserRole = 'admin';

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface UserUpdate {
  full_name?: string;
  password?: string;
}

// =========================================
// SCAN TYPES (Backend)
// =========================================

export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';
export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface Scan {
  id: number;
  target: string;
  scan_type: string;
  status: ScanStatus;
  error: string | null;
  owner_id: number;
  created_at: string;
  finished_at: string | null;
}

export interface ScanCreate {
  target: string;
  scan_type?: string;
}

export interface ScanDetail extends Scan {
  findings: Finding[];
}

export interface Finding {
  id: number;
  scan_id: number;
  title: string;
  description: string;
  severity: Severity;
  recommendation: string;
  resolved: boolean;
  created_at: string;
}

export interface FindingUpdate {
  resolved: boolean;
}

// =========================================
// REQUEST TYPES
// =========================================

export type RequestStatus = 'new' | 'reviewing' | 'in_progress' | 'completed' | 'rejected';
export type RequestPriority = 'low' | 'medium' | 'high' | 'critical';
export type RequestService = 'security_assessment' | 'vulnerability_assessment' | 'digital_forensics' | 'incident_response' | 'network_protection' | 'cybersecurity_training' | 'general_consultation';

export interface Request {
  id: number;
  requester_id: number;
  requester_name: string;
  requester_email: string;
  company: string | null;
  service: RequestService;
  priority: RequestPriority;
  status: RequestStatus;
  description: string;
  contact_info: string | null;
  created_at: string;
  updated_at: string;
  assigned_to: number | null;
  internal_notes: string | null;
}

// =========================================
// CLIENT TYPES
// =========================================

export type ClientStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface Client {
  id: number;
  user_id: number | null;
  name: string;
  email: string;
  company: string;
  services: string;
  status: ClientStatus;
  created_at: string;
  contact_info: string | null;
}

// =========================================
// PROJECT TYPES
// =========================================

export type ProjectStatus = 'planning' | 'assessment' | 'investigation' | 'testing' | 'reporting' | 'completed' | 'on_hold';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Project {
  id: number;
  name: string;
  client_id: number;
  client_name: string;
  service: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date: string;
  expected_completion: string | null;
  actual_completion: string | null;
  assigned_team: string;
  progress: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  assignedTo?: number;
  dueDate?: string;
  createdAt: string;
}

// =========================================
// TICKET TYPES
// =========================================

export type TicketStatus = 'open' | 'in_progress' | 'waiting_for_client' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketCategory = 'technical' | 'billing' | 'service_request' | 'incident' | 'other';

export interface Ticket {
  id: number;
  subject: string;
  client_id: number;
  client_name: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: number | null;
  description: string;
  created_at: string;
  updated_at: string;
  last_updated_by: number | null;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

// =========================================
// MESSAGE TYPES
// =========================================

export interface Message {
  id: number;
  from_id: number;
  from_name: string;
  to_id: number;
  to_name: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

// =========================================
// DOCUMENT TYPES
// =========================================

export type DocumentType = 'security_report' | 'assessment_report' | 'incident_report' | 'invoice' | 'contract' | 'other';

export interface Document {
  id: number;
  title: string;
  type: DocumentType;
  project_id: number | null;
  client_id: number;
  client_name: string;
  uploaded_by: number | null;
  uploaded_by_name: string;
  file_size: number;
  file_url: string | null;
  created_at: string;
  description: string | null;
}

// =========================================
// AUDIT LOG TYPES (To be added to backend)
// =========================================

export type AuditAction = 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'export' | 'assign' | 'change_status';
export type AuditStatus = 'success' | 'failed';

export interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string;
  user_role: string;
  action: AuditAction;
  resource: string;
  resource_id: number | null;
  ip_address: string | null;
  user_agent: string | null;
  status: AuditStatus;
  timestamp: string;
  details: string | null;
}

// =========================================
// NOTIFICATION TYPES (To be added to backend)
// =========================================

export type NotificationType = 'Request' | 'Project' | 'Ticket' | 'Message' | 'Document' | 'System';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

// =========================================
// SETTINGS TYPES (To be added to backend)
// =========================================

export interface UserSettings {
  userId: number;
  email: string;
  timezone: string;
  language: string;
  notifications: {
    email: boolean;
    inApp: boolean;
    requests: boolean;
    projects: boolean;
    tickets: boolean;
    messages: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange?: string;
    activeSessions: Session[];
  };
}

export interface Session {
  id: number;
  device: string;
  browser: string;
  ipAddress: string;
  lastActive: string;
  current: boolean;
}

// =========================================
// TEAM MEMBER TYPES (To be added to backend)
// =========================================

export type TeamRole = 'Administrator' | 'Security Analyst' | 'Incident Responder' | 'Forensic Specialist' | 'Project Manager' | 'Support';

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: TeamRole;
  status: 'Active' | 'Inactive';
  assignedProjects: number[];
  assignedTickets: number[];
  lastActivity: string;
  createdAt: string;
}

// =========================================
// FORM TYPES
// =========================================

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface CreateRequestFormData {
  name: string;
  email: string;
  company?: string;
  service: RequestService;
  description: string;
}

export interface CreateTicketFormData {
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  description: string;
}

export interface UpdateProfileFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}
