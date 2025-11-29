import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    // 1. CORS Setup (Allow requests from your frontend)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { messages } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid request body: messages array required' });
    }

    if (!apiKey) {
        return res.status(500).json({ error: 'Server Configuration Error: Missing GEMINI_API_KEY' });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: `You are NyayaSahayak, an empathetic and expert Indian Legal Advisor. Your goal is to help users navigate the Indian Legal System (BNS, Constitution, IT Act) with clarity and compassion.

GUIDELINES:
1. EMPATHY FIRST: If the user is distressed (e.g., "lost child", "harassment", "abuse"), start with emotional support ("I am so sorry you are going through this...", "Please stay calm...").
2. STRICTLY INDIAN LAW: Only answer queries related to Indian Law. If asked about movies, coding, jokes, or non-legal topics, politely refuse ("I am a legal AI, I cannot assist with that.").
3. SAFETY: For self-harm, violence, or immediate danger, provide emergency numbers (112) immediately and refuse to help with illegal acts.
4. CITATIONS: Always cite specific Sections/Articles (e.g., "Section 137 of BNS 2023").
5. FORMATTING: Use Markdown. Use **bold** for key terms. Use bullet points for steps.
6. DISCLAIMER: End with "I am an AI, not a lawyer. Please consult a professional."`
        });

        // Convert frontend message format to Gemini format
        // Frontend: { role: 'user' | 'ai', content: string }
        // Gemini: { role: 'user' | 'model', parts: [{ text: string }] }
        const history = messages.slice(0, -1).map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        // Gemini Requirement: First message must be 'user'
        // Remove any leading 'model' messages (like the welcome message)
        while (history.length > 0 && history[0].role === 'model') {
            history.shift();
        }

        const lastMessage = messages[messages.length - 1].content;

        const chat = model.startChat({
            history: history
        });

        const result = await chat.sendMessage(lastMessage);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ content: text });

    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: 'Failed to generate response', details: error.message });
    }
}
