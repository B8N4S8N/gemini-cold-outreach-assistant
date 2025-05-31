
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_TEXT_MODEL, MAX_LEADS_TO_GENERATE } from '../constants';
import type { RawLeadFromAPI, LeadDetailsFromAPI, EmailContentFromAPI, UserInput, GroundingMetadata, ContactInfo } from '../types';

let ai: GoogleGenAI | null = null;
let currentApiKeyForValidation: string | null = null;

export const initializeAI = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!apiKey || apiKey.trim() === '') {
      ai = null;
      currentApiKeyForValidation = null;
      reject(new Error("API Key cannot be empty."));
      return;
    }
    try {
      const newAiInstance = new GoogleGenAI({ apiKey: apiKey });
      ai = newAiInstance;
      currentApiKeyForValidation = apiKey;
      console.log("GoogleGenAI initialized successfully.");
      resolve();
    } catch (error) {
      ai = null;
      currentApiKeyForValidation = null;
      console.error("Failed to initialize GoogleGenAI with provided key:", error);
      reject(new Error(`Failed to initialize GoogleGenAI: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
};

export const clearAIInstance = (): void => {
  ai = null;
  currentApiKeyForValidation = null;
  console.log("GoogleGenAI instance cleared.");
};

const getAIInstance = (): GoogleGenAI => {
  if (!ai) {
    console.error("AI Service not initialized. API key might be missing, invalid, or cleared.");
    throw new Error("AI Service not initialized. Please provide a valid API Key.");
  }
  return ai;
};

const parseJsonResponse = <T,>(responseText: string, context: string): T => {
  let jsonStringToParse = responseText.trim();

  // Attempt to strip markdown fences if they surround the *entire* content
  const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
  const fenceMatch = jsonStringToParse.match(fenceRegex);
  if (fenceMatch && fenceMatch[1]) {
    jsonStringToParse = fenceMatch[1].trim();
  }

  // Isolate the first complete JSON object or array.
  // This handles cases where valid JSON is followed by other text (e.g., from grounding).
  if (jsonStringToParse.startsWith('[') || jsonStringToParse.startsWith('{')) {
    let depth = 0;
    let endIndex = -1;
    let inString = false;
    let escapeNext = false;
    const openChar = jsonStringToParse[0];
    const closeChar = openChar === '[' ? ']' : '}';

    for (let i = 0; i < jsonStringToParse.length; i++) {
      const char = jsonStringToParse[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      if (char === '"') {
        // Only toggle inString if this quote is not escaped
        if (!escapeNext) {
          inString = !inString;
        }
      }

      if (!inString) {
        if (char === openChar) {
          depth++;
        } else if (char === closeChar) {
          depth--;
          if (depth === 0) {
            endIndex = i;
            break; // Found the end of the first top-level JSON structure
          }
        }
      }
    }

    if (endIndex !== -1) {
      jsonStringToParse = jsonStringToParse.substring(0, endIndex + 1);
    } else {
      // If no clear end was found (e.g., malformed JSON), log and proceed.
      // JSON.parse will likely throw an error, which is caught below.
      console.warn(`Could not reliably determine the end of the primary JSON structure for ${context}. Attempting to parse potentially partial or malformed string.`);
    }
  }

  try {
    return JSON.parse(jsonStringToParse) as T;
  } catch (e) {
    console.error(`Failed to parse JSON response for ${context}:`, e);
    console.error("Original response text (first 500 chars):", responseText.substring(0, 500));
    console.error("Attempted to parse (first 500 chars):", jsonStringToParse.substring(0,500));
    throw new Error(`Invalid JSON response received from AI for ${context}. Review console for details. Parse attempted on: ${jsonStringToParse.substring(0,100)}...`);
  }
};


export const fetchInitialLeads = async (userInput: UserInput): Promise<RawLeadFromAPI[]> => {
  const aiInstance = getAIInstance();
  const { targetArea, targetAudience, serviceDescription, serviceUrl } = userInput;

  let prompt = `
    My business offers services described as: "${serviceDescription}".
    ${serviceUrl ? `My business website for additional context, tone, and style is: ${serviceUrl}` : ''}

    Using Google Search, find a list of up to ${MAX_LEADS_TO_GENERATE} REAL business names that fit the description of "${targetAudience}" located in or primarily serving the "${targetArea}" area.
    These businesses should be potential leads for my company.
    Consider various types of businesses that would match the audience description.
    Return the list as a JSON array of objects, where each object has a "name" key. For example: [{"name": "Real Example Corp"}, {"name": "Local Actual Biz"}].
    Do not include any other text, comments, or explanations outside the JSON array. Ensure the output is a valid JSON array. If no plausible leads can be generated, return an empty array [].
  `;

  try {
    const response: GenerateContentResponse = await aiInstance.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: { 
        tools: [{googleSearch: {}}],
      },
    });
    const leads = parseJsonResponse<RawLeadFromAPI[]>(response.text, "initial leads");
    if (!Array.isArray(leads)) {
        console.warn("Parsed leads is not an array:", leads);
        return []; 
    }
    return leads.slice(0, MAX_LEADS_TO_GENERATE);
  } catch (error) {
    console.error('Error in fetchInitialLeads:', error);
    if (error instanceof Error && (error.message.toLowerCase().includes("api key not valid") || error.message.includes("permission denied") || error.message.includes("authentication required") || error.message.includes("api_key_invalid"))) {
        throw new Error(`Gemini API Key Error (Initial Leads): ${error.message}. Please check your API key and its permissions.`);
    }
    throw error;
  }
};

export const fetchLeadDetails = async (leadName: string, userInput: UserInput): Promise<LeadDetailsFromAPI> => {
  const aiInstance = getAIInstance();
  const { serviceDescription, targetAudience, serviceUrl } = userInput;

  let prompt = `
    My business offers services described as: "${serviceDescription}".
    ${serviceUrl ? `My business website for additional context, tone, and style is: ${serviceUrl}` : ''}

    For the REAL company named "${leadName}", which is a potential lead fitting the description "${targetAudience}" and could benefit from my services:
    1. Use Google Search to find 2-3 distinct, VERIFIABLE pieces of "personalized information" or recent news/updates. This information should be specific enough for a personalized cold outreach email. Examples: recent company announcements, publicly known challenges in their sector, or growth areas relevant to my services.
    2. Also using Google Search, try to find publicly available contact information for 1-3 key individuals at "${leadName}" who would be relevant to my services (e.g., CEO, Founder, Head of [Relevant Department], Marketing Manager). For each contact, try to find:
        - Full Name (if available)
        - Job Title/Role (if available)
        - Business Email Address (if publicly listed)
        - Business Phone Number (if publicly listed)
    3. Designate one of these contacts as the 'primary' contact (set 'isPrimary': true for that contact). This should be the person most likely to be a decision-maker for my services. If multiple relevant contacts are found, choose the one that seems most appropriate. If only one is found, they are primary.
    
    Return this information as a JSON object with two keys: "details" (an array of strings for personalized information) and "contacts" (an array of objects, where each object contains 'name', 'role', 'email', 'phone', and 'isPrimary' keys).
    Example:
    {
      "details": ["Announced expansion into the European market.", "Currently hiring for several marketing roles."],
      "contacts": [
        {"name": "Jane Doe", "role": "CEO", "email": "jane.doe@example.com", "phone": "555-123-4567", "isPrimary": true},
        {"name": "John Smith", "role": "Marketing Director", "email": "john.smith@example.com", "isPrimary": false}
      ]
    }
    If no specific contact information can be found, return an empty array for "contacts" or omit fields like email/phone if not found.
    Do not include any other text, comments, or explanations outside the JSON object. Ensure the output is a valid JSON object.
  `;
 try {
    const response: GenerateContentResponse = await aiInstance.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: prompt,
        config: { 
            tools: [{googleSearch: {}}],
        },
    });
    const parsedResponse = parseJsonResponse<LeadDetailsFromAPI>(response.text, `details and contacts for ${leadName}`);
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata as GroundingMetadata | undefined;
    
    return {
        details: parsedResponse.details || [],
        contacts: parsedResponse.contacts || [],
        groundingMetadata: groundingMetadata
    };

 } catch (error) {
    console.error(`Error in fetchLeadDetails for ${leadName}:`, error);
    if (error instanceof Error && (error.message.toLowerCase().includes("api key not valid") || error.message.includes("permission denied") || error.message.includes("authentication required") || error.message.includes("api_key_invalid"))) {
        throw new Error(`Gemini API Key Error (Lead Details for ${leadName}): ${error.message}. Please check your API key and its permissions.`);
    }
    throw error;
  }
};

export const fetchEmailDraft = async (leadName: string, personalizedInfo: string[], contacts: ContactInfo[] | undefined, userInput: UserInput): Promise<EmailContentFromAPI> => {
  const aiInstance = getAIInstance();
  const { serviceDescription, targetAudience, serviceUrl } = userInput;

  const primaryContact = contacts?.find(c => c.isPrimary && c.name);
  const salutationName = primaryContact?.name || `${leadName} Team`;

  let contactsContext = "No specific contact persons were identified.";
  if (contacts && contacts.length > 0) {
    contactsContext = "The following contact(s) were identified at the company:\n" +
      contacts.map(c => {
        let info = `- ${c.name || 'N/A'} (${c.role || 'N/A'})`;
        if (c.email) info += ` - Email: ${c.email}`;
        if (c.isPrimary) info += " (Suggested Primary Contact)";
        return info;
      }).join('\n');
  }

  let prompt = `
    My business offers services like: "${serviceDescription}".
    ${serviceUrl ? `My business website for additional context, tone, and style is: ${serviceUrl}. Please try to emulate this style if appropriate.` : ''}
    
    I am trying to create an outreach email for "${leadName}", a company fitting the description "${targetAudience}".
    
    Here is some personalized information I have gathered about them (this information was found using web search):
    - ${personalizedInfo.join('\n- ')}

    ${contactsContext}

    Craft a highly personalized cold outreach email. The email should:
    1. Have a compelling and relevant subject line.
    2. Start with a personalized opening that references one or more pieces of the provided personalized information to show genuine research.
    3. Address the email to "${salutationName}". If using a specific name, the salutation should be "Dear ${primaryContact?.name || 'Valued Contact'},". If using the company name, use "Dear ${leadName} Team,".
    4. Clearly and concisely explain how my services ("${serviceDescription}") can specifically benefit "${leadName}", directly connecting to their potential needs or opportunities implied by the personalized info.
    5. Maintain a professional, respectful, and engaging tone. If a service URL was provided, try to subtly reflect its style and tone.
    6. Include a clear and polite call to action (e.g., suggest a brief introductory call to explore mutual fit, or offer to share more specific information).
    7. Do NOT use placeholders like "[Your Name]" or "[Your Company Name]". Assume the email is from a single individual representing their service.
    
    Return the email as a JSON object with "subject" and "body" keys.
    For example:
    {
      "subject": "Tailored Solutions for ${leadName}",
      "body": "Dear ${salutationName},\\n\\nI came across your recent news about ${personalizedInfo[0]}...\\n\\nGiven this, our expertise in ${serviceDescription} could directly help you...\\n\\nWould you be open to a brief conversation next week?\\n\\nBest regards,"
    }
    Ensure the output is a valid JSON object with only "subject" and "body" keys. No other text or comments.
  `;
  try {
    const response: GenerateContentResponse = await aiInstance.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json" }, // This is fine here as it's not using search grounding
    });
    return parseJsonResponse<EmailContentFromAPI>(response.text, `email draft for ${leadName}`);
  } catch (error) {
    console.error(`Error in fetchEmailDraft for ${leadName}:`, error);
     if (error instanceof Error && (error.message.toLowerCase().includes("api key not valid") || error.message.includes("permission denied") || error.message.includes("authentication required") || error.message.includes("api_key_invalid"))) {
        throw new Error(`Gemini API Key Error (Email Draft for ${leadName}): ${error.message}. Please check your API key and its permissions.`);
    }
    throw error;
  }
};
