import { GoogleGenAI, Type } from "@google/genai";
import { ImageData } from '../types';
import { incrementApiCount } from './apiCounterService';
import { getApiKey } from './apiKeyService';

export class ApiKeyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ApiKeyError';
    }
}

const checkAndThrowApiKeyError = (error: any) => {
    const errorMessage = (error?.message || '').toLowerCase();
    // Heuristic check for common API key error messages
    if (errorMessage.includes('api key') || errorMessage.includes('400')) {
        throw new ApiKeyError(
            "API Key not valid or missing. Please ensure it is correctly configured. See Preferences > API Key for instructions."
        );
    }
};

// FIX: Added missing helper function to convert base64 image data to a Gemini API Part.
const base64ToGenerativePart = (data: string, mimeType: string): { inlineData: { data: string; mimeType: string; } } => {
  return {
    inlineData: {
      data,
      mimeType,
    },
  };
};


export const extractTextsFromImage = async (
  imageBase64: string, 
  mimeType: string, 
  boxes: {id: number, x: number, y: number, width: number, height: number}[]
): Promise<{ id: number; text: string; fontSizePercentage: number; }[]> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new ApiKeyError(
        "API Key not found. Please set it in Preferences > API Key or in your .env.local file."
      );
    }
    const ai = new GoogleGenAI({ apiKey });

    const imagePart = base64ToGenerativePart(imageBase64, mimeType);
    const boxesJson = JSON.stringify(boxes);

    const textPart = { 
      text: `Perform Optical Character Recognition (OCR) on the provided image, extracting text from within the specified bounding boxes. The text can be in any language, but pay special attention to English and Japanese, as they are common in comics.

For each box, provide:
1. The accurately extracted 'text'. If no text is found, return an empty string.
2. An estimated 'fontSizePercentage' relative to the full image's height.

The bounding boxes are provided as a JSON array with normalized coordinates (0 to 1).

Input Boxes:
${boxesJson}

Return a JSON array where each object corresponds to an input box and contains the 'id', 'text', and 'fontSizePercentage'.
Example for a box with Japanese text: [{"id": 1, "text": "こんにちは", "fontSizePercentage": 5}]`
    };

    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: { parts: [imagePart, textPart] },
      config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.ARRAY,
              items: {
                  type: Type.OBJECT,
                  properties: {
                      id: {
                          type: Type.NUMBER,
                          description: 'The ID of the box, matching the input.'
                      },
                      text: {
                          type: Type.STRING,
                          description: 'The extracted text from the box.'
                      },
                      fontSizePercentage: {
                          type: Type.NUMBER,
                          description: "The estimated font size as a percentage of the full image's height. For example, if the image is 1000px tall and the font is 50px, this should be 5."
                      }
                  },
                  required: ['id', 'text', 'fontSizePercentage']
              }
          }
      }
    });
    
    incrementApiCount();
    
    let jsonStr = response.text.trim();
    if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
    }
    const results = JSON.parse(jsonStr);

    if (!Array.isArray(results)) {
        throw new Error("Invalid response format from Gemini. Expected an array.");
    }

    return results.map(r => ({
        id: r.id,
        text: (r.text || "").trim(),
        fontSizePercentage: r.fontSizePercentage || 5 // Fallback to 5%
    }));

  } catch (error) {
    checkAndThrowApiKeyError(error);
    console.error("Error extracting text from multiple boxes:", error);
    throw new Error("Failed to perform OCR on the image. The AI model might have returned an invalid response.");
  }
};

export const translateText = async (text: string, targetLanguage: string = "English"): Promise<string> => {
  if (!text) return "";
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new ApiKeyError(
        "API Key not found. Please set it in Preferences > API Key or in your .env.local file."
      );
    }
    const ai = new GoogleGenAI({ apiKey });

    const containsJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text);

    const prompt = containsJapanese
        ? `The following text is a comic book dialogue in Japanese. Translate it to ${targetLanguage}. Provide a complete, natural, and contextually appropriate translation. Ensure the full meaning is conveyed without any abbreviations, truncations, or ellipses (...). Do not add any extra text or explanations, just the translation.\n\nText to translate:\n"""\n${text}\n"""`
        : `Translate the following comic book dialogue to ${targetLanguage}. Keep the translation natural and concise. Provide the full translation without any abbreviations, truncations, or ellipses (...). Do not add any extra text or explanations, just the translation.\n\nText to translate:\n"""\n${text}\n"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 1024 },
	temperature: 0.4,
      }
    });
    incrementApiCount();
    return response.text.trim();
  } catch (error) {
    checkAndThrowApiKeyError(error);
    console.error("Error translating text:", error);
    throw new Error("Failed to translate the text.");
  }
};

const TRANSLATE_CHUNK_SIZE = 18;

export const translateMultipleTexts = async (
  texts: { id: number; text: string }[],
  targetLanguage: string = "English"
): Promise<{ id: number; translatedText: string }[]> => {
  if (!texts || texts.length === 0) return [];

  // 1. Separate valid texts from empty ones, preparing their final (empty) result.
  const emptyResults = texts
    .filter(t => !t.text || t.text.trim().length === 0)
    .map(t => ({ id: t.id, translatedText: '' }));

  const validTexts = texts.filter(t => t.text && t.text.trim().length > 0);
  if (validTexts.length === 0) {
    return emptyResults;
  }

  // 2. Deduplicate texts to avoid redundant API calls.
  // Map each unique text string to the list of original box IDs that contain it.
  const uniqueTextToIds = new Map<string, number[]>();
  validTexts.forEach(t => {
    if (!uniqueTextToIds.has(t.text)) {
      uniqueTextToIds.set(t.text, []);
    }
    uniqueTextToIds.get(t.text)!.push(t.id);
  });

  // Create a payload for the API using only the unique texts.
  // We use a temporary index as an ID for API request/response mapping.
  const textsForApi = Array.from(uniqueTextToIds.keys()).map((text, index) => ({
    id: index,
    text: text,
  }));

  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new ApiKeyError(
        "API Key not found. Please set it in Preferences > API Key or in your .env.local file."
      );
    }
    const ai = new GoogleGenAI({ apiKey });

    const chunks = [];
    for (let i = 0; i < textsForApi.length; i += TRANSLATE_CHUNK_SIZE) {
      chunks.push(textsForApi.slice(i, i + TRANSLATE_CHUNK_SIZE));
    }

    const translationMap = new Map<string, string>();

    for (const chunk of chunks) {
      const containsJapanese = chunk.some(t => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(t.text));
      
      const prompt = containsJapanese
        ? `The following JSON array contains comic book dialogues in Japanese. Translate each entry to ${targetLanguage}. Provide a complete, natural, and contextually appropriate translation for each. Ensure the full meaning is conveyed without any abbreviations, truncations, or ellipses (...).
Input:
${JSON.stringify(chunk)}`
        : `Translate the comic book dialogues in the following JSON array to ${targetLanguage}. Provide a complete translation for each entry, without any abbreviations, truncations, or ellipses (...). Keep translations natural and concise.
Input:
${JSON.stringify(chunk)}`;
        
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.NUMBER, description: 'The ID of the text, matching the input.' },
                translatedText: { type: Type.STRING, description: `The full, unabbreviated translated text in ${targetLanguage}.` }
              },
              required: ['id', 'translatedText']
            }
          },
          maxOutputTokens: 16384,
          thinkingConfig: { thinkingBudget: 2048 },
	temperature: 0.4,
        },
      });

      incrementApiCount();

      let jsonStr = response.text.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
      }
      const chunkResults: { id: number; translatedText: string }[] = JSON.parse(jsonStr);

      if (!Array.isArray(chunkResults) || chunkResults.length !== chunk.length) {
        console.warn("Mismatched translation count in batch. Falling back.", { expected: chunk.length, got: chunkResults.length });
        throw new Error("Mismatched translation count or invalid JSON format.");
      }
      
      // Map translations back to the original unique text content.
      chunkResults.forEach(result => {
        const originalText = chunk.find(t => t.id === result.id)?.text;
        if (originalText) {
          translationMap.set(originalText, result.translatedText);
        }
      });
    }

    // 3. Reconstruct the full results array by mapping translations to all original text boxes.
    const translatedResults = validTexts.map(t => ({
      id: t.id,
      translatedText: translationMap.get(t.text) || ''
    }));

    return [...translatedResults, ...emptyResults];

  } catch (error) {
    checkAndThrowApiKeyError(error);
    console.error("Error translating multiple texts, falling back to individual (unique) translations:", error);
    
    const translationMap = new Map<string, string>();
    
    // Translate each unique text individually for efficiency and resilience.
    for (const uniqueText of uniqueTextToIds.keys()) {
      let translated = '';
      try {
        await new Promise(res => setTimeout(res, 200)); // Rate limit delay
        translated = await translateText(uniqueText, targetLanguage);
      } catch (individualError) {
        console.error(`Failed to translate text: "${uniqueText}"`, individualError);
        // On individual failure, assign empty string and continue.
      }
      translationMap.set(uniqueText, translated);
    }
    
    // Map the results back to all original text boxes, including duplicates.
    const results = validTexts.map(t => ({
      id: t.id,
      translatedText: translationMap.get(t.text) || ''
    }));

    return [...results, ...emptyResults];
  }
};