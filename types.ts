export interface EmailMessage {
  id: string;
  sender: string;
  senderAddress: string;
  subject: string;
  preview: string;
  body: string; // HTML or Text
  receivedAt: Date;
  isRead: boolean;
  type: 'normal' | 'spam' | 'promo' | 'system';
  hasFullDetails?: boolean; // Flag to check if we fetched the full HTML body
}

export interface UserSession {
  emailAddress: string;
  createdAt: Date;
  expiresAt: Date | null; // Null means unlimited
  isPremium: boolean;     // Flag for premium status
  isMock?: boolean;       // Flag to indicate simulation mode due to API blocks
  // Auth details for Mail.tm
  token?: string;
  accountId?: string;
  password?: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SAFE = 'SAFE',
  SUSPICIOUS = 'SUSPICIOUS',
  ERROR = 'ERROR'
}

export interface AIAnalysisResult {
  summary: string;
  safetyScore: number; // 0-100
  isPhishing: boolean;
  actionRequired: string;
}

export interface Domain {
  domain: string;
  isActive: boolean;
  isPrivate: boolean;
}