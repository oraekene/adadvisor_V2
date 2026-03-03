import { Persona } from "../types";

export interface DecisionResult {
  clicked: boolean;
  bought: boolean;
  score: number;
}

/**
 * Precision Behavioral Engine
 * Calculates click and purchase probabilities based on psychographic traits and product data.
 */
export function calculateDecision(persona: Persona, productPrice: number, engagementRate: number): DecisionResult {
  // 1. Calculate Click Probability (0 to 1)
  // Openness and Extraversion drive curiosity.
  let clickProb = (persona.ocean_traits.openness * 0.6) + (persona.ocean_traits.extraversion * 0.4);
  
  // Impulsive decision style increases click probability.
  if (persona.decision_style === 'Impulsive') clickProb += 0.2;
  if (persona.decision_style === 'Rational') clickProb -= 0.1;

  // Normalize click probability
  clickProb = Math.min(Math.max(clickProb, 0.05), 0.95);

  const clicked = Math.random() < clickProb;

  // 2. Calculate Purchase Probability (0 to 1)
  if (!clicked) {
    return { clicked: false, bought: false, score: 0 };
  }

  // Base score from AI's initial assessment
  let purchaseScore = persona.likelihood_to_buy;

  // Price Sensitivity based on Income
  const incomeMultiplier = {
    'low': productPrice > 100 ? 0.3 : 0.7,
    'medium': productPrice > 500 ? 0.5 : 1.0,
    'high': 1.2
  }[persona.income_level];
  
  purchaseScore *= incomeMultiplier;

  // Risk Aversion impact
  // High risk aversion significantly penalizes high-priced products.
  if (productPrice > 50) {
    purchaseScore *= (1 - (persona.risk_aversion * 0.5));
  }

  // VALS Segment Adjustments
  const valsAdjustments: Record<string, number> = {
    'Innovator': 1.3,   // Early adopters
    'Experiencer': 1.2, // Impulse buyers
    'Thinker': 0.9,     // Need more data
    'Believer': 1.1,    // Brand loyal
    'Survivor': 0.5     // Very cautious
  };
  purchaseScore *= (valsAdjustments[persona.vals_segment] || 1.0);

  // OCEAN Trait Adjustments
  // Conscientiousness = more careful, less impulsive buying
  purchaseScore *= (1 - (persona.ocean_traits.conscientiousness * 0.3));
  // Agreeableness = more likely to trust the creator
  purchaseScore *= (1 + (persona.ocean_traits.agreeableness * 0.2));

  // Final normalization
  purchaseScore = Math.min(Math.max(purchaseScore, 0.01), 0.99);

  const bought = Math.random() < purchaseScore;

  return {
    clicked,
    bought,
    score: purchaseScore
  };
}
