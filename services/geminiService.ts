import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_TEXT_MODEL, MAX_LEADS_TO_GENERATE } from '../constants';
import type { RawLeadFromAPI, LeadDetailsFromAPI, EmailContentFromAPI } from '../types';

let ai: GoogleGenAI | null = null;
let currentApiKeyForValidation: string | null = null; // Renamed to avoid confusion

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
      // To truly validate, we might need to make a light test call,
      // but constructor itself can throw for some basic malformations.
      // For now, assume construction implies basic validity. More robust checks occur on first actual API call.
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
  if (!ai) { // Simpler check now, relies on initializeAI being called successfully.
    console.error("AI Service not initialized. API key might be missing, invalid, or cleared.");
    throw new Error("AI Service not initialized. Please provide a valid API Key.");
  }
  return ai;
};

const parseJsonResponse = <T,>(responseText: string, context: string): T => {
  let jsonStr = responseText.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = match[2].trim();
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error(`Failed to parse JSON response for ${context}:`, e);
    console.error("Original response text:", responseText);
    throw new Error(`Invalid JSON response received from AI for ${context}. Raw: ${responseText.substring(0,100)}...`);
  }
};


export const fetchInitialLeads = async (targetArea: string, targetAudience: string, userServiceDescription: string): Promise<RawLeadFromAPI[]> => {
  const aiInstance = getAIInstance();
  const prompt = `
    Generate a list of up to ${MAX_LEADS_TO_GENERATE} fictional yet plausible business names that fit the description of "${targetAudience}" located in or primarily serving the "${targetArea}" area.
    These businesses should be potential leads for a company offering services like: "${userServiceDescription}".
    Consider various types of businesses that would match the audience description.
    Return the list as a JSON array of objects, where each object has a "name" key. For example: [{"name": "Innovative Tech Solutions"}, {"name": "Local Gourmet Catering"}].
    Do not include any other text, comments, or explanations outside the JSON array. Ensure the output is a valid JSON array. If no plausible leads can be generated, return an empty array [].
  `;

  try {
    const response: GenerateContentResponse = await aiInstance.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" },
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

export const fetchLeadDetails = async (leadName: string, userServiceDescription: string, targetAudience: string): Promise<LeadDetailsFromAPI> => {
  const aiInstance = getAIInstance();
  const prompt = `
    For the company named "${leadName}", which is a potential lead fitting the description "${targetAudience}" and could benefit from services like "${userServiceDescription}", generate 2-3 distinct, fictional but plausible pieces of "personalized information".
    This information should be specific enough to be used effectively in a personalized cold outreach email.
    Examples could include a recent (fictional) company announcement, a common challenge for businesses like "${leadName}" in their sector, or a potential growth area relevant to your services.
    Focus on creating unique insights for "${leadName}".
    Return this information as a JSON object with a "details" key, which holds an array of strings.
    For example: {"details": ["Reportedly expanding their marketing team.", "Might be looking for solutions to improve customer engagement.", "Recently mentioned interest in AI-driven analytics."]}
    Do not include any other text, comments, or explanations outside the JSON object. Ensure the output is a valid JSON object.
  `;
 try {
    const response: GenerateContentResponse = await aiInstance.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json" },
    });
    return parseJsonResponse<LeadDetailsFromAPI>(response.text, `details for ${leadName}`);
 } catch (error) {
    console.error(`Error in fetchLeadDetails for ${leadName}:`, error);
    if (error instanceof Error && (error.message.toLowerCase().includes("api key not valid") || error.message.includes("permission denied") || error.message.includes("authentication required") || error.message.includes("api_key_invalid"))) {
        throw new Error(`Gemini API Key Error (Lead Details for ${leadName}): ${error.message}. Please check your API key and its permissions.`);
    }
    throw error;
  }
};

export const fetchEmailDraft = async (leadName: string, personalizedInfo: string[], userServiceDescription: string, targetAudience: string): Promise<EmailContentFromAPI> => {
  const aiInstance = getAIInstance();
  const prompt = `
    My business offers services like: "${userServiceDescription}".
    I am trying to create an outreach email for "${leadName}", a company fitting the description "${targetAudience}".
    Here is some personalized information I have gathered about them:
    - ${personalizedInfo.join('\n- ')}

    Craft a highly personalized cold outreach email to "${leadName}". The email should:
    1. Have a compelling and relevant subject line.
    2. Start with a personalized opening that references one or more pieces of the provided personalized information to show genuine research.
    3. Clearly and concisely explain how my services ("${userServiceDescription}") can specifically benefit "${leadName}", directly connecting to their potential needs or opportunities implied by the personalized info.
    4. Maintain a professional, respectful, and engaging tone.
    5. Include a clear and polite call to action (e.g., suggest a brief introductory call to explore mutual fit, or offer to share more specific information).
    6. Do NOT use placeholders like "[Your Name]", "[Your Company Name]", or "[Contact Person at ${leadName}]". Assume the email is from a single individual representing their service. The salutation should be general if a specific contact name isn't implied (e.g., "Dear ${leadName} Team," or "Hello ${leadName},").

    Return the email as a JSON object with "subject" and "body" keys.
    For example:
    {
      "subject": "Tailored Solutions to Elevate ${leadName}'s Marketing Efforts",
      "body": "Dear ${leadName} Team,\\n\\nI came across your recent news about ${personalizedInfo[0]} and was particularly interested in how it aligns with your goals in the ${targetAudience} space.\\n\\nGiven your focus on [another detail from personalizedInfo], our expertise in ${userServiceDescription} could directly help you achieve [specific benefit related to the detail and service] by [briefly explain how]. We've helped similar companies [mention a general positive outcome]...\\n\\nWould you be open to a brief 15-minute conversation next week to explore if our services could be a valuable asset to ${leadName}?\\n\\nBest regards,"
    }
    Ensure the output is a valid JSON object with only "subject" and "body" keys. No other text or comments.
  `;
  try {
    const response: GenerateContentResponse = await aiInstance.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json" },
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