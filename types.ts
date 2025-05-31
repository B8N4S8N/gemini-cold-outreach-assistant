export interface UserInput {
  serviceDescription: string;
  targetArea: string;
  targetAudience: string;
  serviceUrl?: string; // Added for business URL
}

// For Gemini API responses (intermediate types)
export interface RawLeadFromAPI {
  name: string;
}

export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
  // Potentially other types of chunks if the API supports them
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  // Other metadata fields
}

export interface ContactInfo {
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean; // Indicates if this is the suggested primary contact
}

export interface LeadDetailsFromAPI {
  details: string[];
  contacts?: ContactInfo[]; // Added to store contact information
  groundingMetadata?: GroundingMetadata;
}

export interface EmailContentFromAPI {
  subject: string;
  body: string;
}

// Main data structure for a lead in the application
export interface ProcessedLead {
  id: string;
  name: string;
  status: 'initial' | 'fetching_details' | 'fetching_email' | 'completed' | 'error_details' | 'error_email';
  errorMessage?: string;
  details?: string[];
  contacts?: ContactInfo[]; // Added to store contact information
  emailSubject?: string;
  emailBody?: string;
  groundingMetadata?: GroundingMetadata;
}

export enum AppPhase {
  AWAITING_API_KEY,
  DASHBOARD, // New: Shows past searches and option for new search
  IDLE, // UserInputForm is visible for a new search
  LOADING_INITIAL_LEADS,
  PROCESSING_LEAD_ENRICHMENT,
  RESULTS_DISPLAYED,
  FATAL_ERROR
}

export interface SavedSearch {
  id: string;
  timestamp: number;
  userInput: UserInput;
  leads: ProcessedLead[]; // ProcessedLead now includes contacts and groundingMetadata
  summary: string;
}