import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Initialize the Google GenAI SDK using your environment variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const context = body.context || '';

    if (!context.trim()) {
      return NextResponse.json({ reply: 'No discussion content available to analyze yet.' }, { status: 400 });
    }

    // Professional prompt instructing the AI host to analyze the actual user transcript
    const systemInstruction = `You are an empathetic, expert AI moderator and facilitator named Hiba. Analyze the following live peer discussion transcript carefully. 

Provide a structured, insightful response based strictly on what the participants actually discussed. Format your response cleanly using Markdown with these sections:
1. **Discussion Summary**: Briefly summarize what the participants discussed.
2. **Key Insights**: Highlight core themes, agreements, or perspectives shared.
3. **Actionable Recommendations**: Provide specific next steps tailored to their dialogue.
4. **Possible Solutions**: Offer practical solutions to help them progress in their goals.`;

    // Call current stable model for rapid, intelligent text analysis
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemInstruction}\n\nHere is the active discussion transcript:\n${context}` }
          ]
        }
      ],
    });

    const aiReply = response.text || 'Here are the synthesized insights and recommendations based on your discussion.';

    return NextResponse.json({ reply: aiReply }, { status: 200 });
  } catch (error) {
    console.error('API route generation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', reply: 'Failed to generate tailored AI insights at the moment.' }, 
      { status: 500 }
    );
  }
}