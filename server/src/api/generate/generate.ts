import { Request, Response } from "express";
import rateLimit from 'express-rate-limit';
import { config } from "../../config/config";
import OpenAI from "openai";
import { AuthRequest } from "../../middlewares/authenticate";
import UserSettings from "../user/userSettingModel";
import { decrypt } from "../../utils/encryption";

// const openai = new OpenAI({
//     apiKey: config.openAIApiKey,
//     baseURL: config.openAIApiBaseUrl || "https://api.openai.com/v1",
//   });

const limiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 50, // Limit each IP to 50 requests per windowMs
    message: 'You have reached your request limit for the day.',
  });

  export const generateCompletion = async (req: AuthRequest, res: Response) => {
    try {
      const { prompt, option, command } = req.body;
      const userId = req.userId;
  

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch user settings from the database
    const settings = await UserSettings.findOne({ user: userId });
    if (!settings || !settings.openaiApiKey) {
        return res.status(410).json({ error: 'Missing OpenAI API key' });
    }

     // Decrypt the OpenAI API key before using it
     const decryptedApiKey = decrypt(settings.openaiApiKey);
     
     // Check if decryption was successful
     if (!decryptedApiKey) {
       // Fallback to environment variable if decryption fails
       if (process.env.OPENAI_API_KEY) {
         console.log('Using fallback OpenAI API key from environment');
       } else {
         return res.status(400).json({ error: 'Could not decrypt API key and no fallback available' });
       }
     }

     // Initialize OpenAI client with the decrypted API key or fallback
     const openai = new OpenAI({
      apiKey: decryptedApiKey,
      baseURL: config.openAIApiBaseUrl || "https://api.openai.com/v1",
  });
  
      // Define messages based on the option
      let messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>;
      switch (option) {
        case 'continue':
          messages = [
            {
              role: 'system',
              content: 'You are an AI writing assistant that continues existing text...',
            },
            {
              role: 'user',
              content: prompt,
            },
          ];
          break;
        case 'improve':
          messages = [
            {
              role: 'system',
              content: 'You are an AI writing assistant that improves existing text...',
            },
            {
              role: 'user',
              content: `The existing text is: ${prompt}`,
            },
          ];
          break;
        case 'shorter':
          messages = [
            {
              role: 'system',
              content: 'You are an AI writing assistant that shortens existing text...',
            },
            {
              role: 'user',
              content: `The existing text is: ${prompt}`,
            },
          ];
          break;
        case 'longer':
          messages = [
            {
              role: 'system',
              content: 'You are an AI writing assistant that lengthens existing text...',
            },
            {
              role: 'user',
              content: `The existing text is: ${prompt}`,
            },
          ];
          break;
        case 'fix':
          messages = [
            {
              role: 'system',
              content: 'You are an AI writing assistant that fixes grammar and spelling errors...',
            },
            {
              role: 'user',
              content: `The existing text is: ${prompt}`,
            },
          ];
          break;
        case 'zap':
          messages = [
            {
              role: 'system',
              content: 'You are an AI writing assistant that generates text based on a prompt...',
            },
            {
              role: 'user',
              content: `For this text: ${prompt}. You have to respect the command: ${command}`,
            },
          ];
          break;
        default:
          return res.status(400).json({ error: 'Invalid option' });
      }
  
      // Call the OpenAI API
      const completionResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        n: 1,
      });
  
      const completion = completionResponse.choices[0]?.message?.content || '';
  
      res.json({ completion });
    } catch (error: any) {
        console.error('Error in generateCompletion:', error);
    
        if (error.response) {
          if (error.response.status === 429) {
            // Rate limit error
            res.status(429).json({ error: 'You have exceeded your current quota. Please check your plan and billing details.' });
          } else {
            // Other API errors
            res.status(error.response.status || 500).json({ error: error.response.data.message || 'Internal Server Error' });
          }
        } else {
          // Non-API errors
          res.status(500).json({ error: error.message || 'An unexpected error occurred.' });
        }
      }
    };
  
  // Middleware to use rate limiting
  export const applyRateLimiting = limiter;