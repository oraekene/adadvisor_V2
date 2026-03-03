import { GoogleGenAI, Type } from "@google/genai";
import { Persona } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_INSTRUCTION = `You are an expert in consumer behavior, marketing psychology, and sociological segmentation. 
You use established frameworks like VALS (Values, Attitudes, and Lifestyles), the Big Five Personality Traits (OCEAN), and behavioral economics to simulate human decision-making.

VALS Segments:
- Innovators: Leading edge, high resources, image as expression of taste.
- Thinkers: Motivated by ideals, mature, responsible, well-educated, rational.
- Believers: Motivated by ideals, low resources, conservative, brand loyal.
- Achievers: Motivated by achievement, high resources, status-oriented.
- Strivers: Motivated by achievement, low resources, style-conscious.
- Experiencers: Motivated by self-expression, high resources, young, energy-driven.
- Makers: Motivated by self-expression, low resources, practical, self-sufficient.
- Survivors: Lowest resources, brand loyal, oldest segment.

OCEAN Traits (0-1):
- Openness: Intellectual curiosity, willingness to try new things.
- Conscientiousness: Self-discipline, planned behavior.
- Extraversion: Energy from external world, social engagement.
- Agreeableness: Social harmony, trust, kindness.
- Neuroticism: Emotional instability, vulnerability to stress.

When simulating decisions, consider:
- Social Proof Sensitivity: How much they are influenced by others' actions.
- Risk Aversion: Hesitancy towards new or expensive products.
- Decision Style: Rational (data-driven), Emotional (feeling-driven), or Impulsive (quick action).
- Brand Loyalty: Resistance to switching from established brands.`;

export async function estimateBenchmarks(creatorData: any, businessData: any) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Based on a ${businessData.business_name} product in the ${businessData.niche || 'general'} niche advertising on ${creatorData.creator_name}'s channel (${creatorData.demographics}), estimate realistic industry benchmarks.
    Return JSON: { engagement_rate: number, conversion_rate: number, average_cpc: number }`,
    config: {
      systemInstruction: "You are a media buying expert. Provide conservative, realistic estimates for digital advertising benchmarks (0-1 scale).",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          engagement_rate: { type: Type.NUMBER },
          conversion_rate: { type: Type.NUMBER },
          average_cpc: { type: Type.NUMBER }
        },
        required: ["engagement_rate", "conversion_rate", "average_cpc"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
}

export async function generateAdGuide(simulation: any, personas: Persona[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a high-converting, professional ad creation guide for a creator partnership.
    
    CAMPAIGN DETAILS:
    Business: ${simulation.business_name}
    Product Description: ${simulation.product_description}
    Unique Selling Points (USPs): ${simulation.usp}
    Campaign Goal: ${simulation.campaign_goal}
    Product Price: $${simulation.product_price}
    
    TARGETING:
    Target Creator: ${simulation.creator_name}
    Target Audience: ${simulation.demographics}
    
    AUDIENCE PSYCHOGRAPHICS (Based on Simulation):
    Top Personas: ${personas.map((p: any) => `${p.vals_segment} (${p.decision_style} style)`).join(', ')}
    
    BID/BUDGET CONTEXT:
    The simulation suggests a campaign budget of $${simulation.predicted_med_price.toLocaleString()} for a balanced ROI.
    
    The guide MUST include:
    1. The "Big Hook": 3 specific opening lines tailored to the dominant VALS segments.
    2. Creative Direction: Detailed visual storyboard for a 30-60 second video.
    3. Messaging Strategy: How to weave the USPs (${simulation.usp}) into the creator's natural content style.
    4. Pricing Presentation: How to anchor the $${simulation.product_price} price point.
    5. Call to Action: A specific, trackable CTA.
    6. Media Buying Advice: Explain how the suggested bid of $${simulation.predicted_med_price.toLocaleString()} should be used (e.g., as a flat fee to the creator or as a total ad spend budget).
    
    IMPORTANT: Do NOT hallucinate unrelated products. Focus strictly on ${simulation.business_name} and its description: ${simulation.product_description}.`,
    config: {
      systemInstruction: "You are a world-class ad strategist and creative director. Write in a clear, professional, and actionable tone. Use Markdown formatting.",
    }
  });
  return response.text;
}

export async function generatePersonas(creatorData: any, businessData: any) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate EXACTLY 10 distinct synthetic customer personas for a ${businessData.business_name} product (Price: $${businessData.product_price}) advertising on ${creatorData.creator_name}'s channel. 
    Audience Demographics: ${creatorData.demographics}.
    Product Context: ${businessData.product_description}.
    
    Ensure the personas are derived from real-world sociological and marketing data. 
    Each persona must be a unique combination of VALS segments and OCEAN traits that would realistically exist in this audience.
    
    CRITICAL: You MUST return exactly 10 items in the array.`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            age: { type: Type.NUMBER },
            interests: { type: Type.ARRAY, items: { type: Type.STRING } },
            income_level: { type: Type.STRING, enum: ["low", "medium", "high"] },
            likelihood_to_buy: { type: Type.NUMBER },
            vals_segment: { type: Type.STRING, enum: ["Innovator", "Thinker", "Believer", "Achiever", "Striver", "Experiencer", "Maker", "Survivor"] },
            ocean_traits: {
              type: Type.OBJECT,
              properties: {
                openness: { type: Type.NUMBER },
                conscientiousness: { type: Type.NUMBER },
                extraversion: { type: Type.NUMBER },
                agreeableness: { type: Type.NUMBER },
                neuroticism: { type: Type.NUMBER }
              },
              required: ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]
            },
            social_proof_sensitivity: { type: Type.NUMBER },
            risk_aversion: { type: Type.NUMBER },
            decision_style: { type: Type.STRING, enum: ["Rational", "Emotional", "Impulsive"] },
            brand_loyalty: { type: Type.NUMBER }
          },
          required: ["id", "age", "interests", "income_level", "likelihood_to_buy", "vals_segment", "ocean_traits", "social_proof_sensitivity", "risk_aversion", "decision_style", "brand_loyalty"]
        }
      }
    }
  });
  return JSON.parse(response.text || "[]");
}

export async function simulateDecision(persona: any, adContext: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Persona Profile: ${JSON.stringify(persona)}. 
    Ad Context: ${adContext}.
    
    Simulate this persona's reaction to the ad. 
    Consider their VALS segment, OCEAN traits, and decision-making style. 
    Would they click? Would they buy? 
    
    Return JSON: { clicked: boolean, bought: boolean, reasoning: string }`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          clicked: { type: Type.BOOLEAN },
          bought: { type: Type.BOOLEAN },
          reasoning: { type: Type.STRING }
        },
        required: ["clicked", "bought", "reasoning"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
}
