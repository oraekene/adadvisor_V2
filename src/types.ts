export interface Simulation {
  id: string;
  business_name: string;
  product_description: string;
  usp: string;
  campaign_goal: string;
  product_price: number;
  margin: number;
  conversion_rate: number;
  creator_name: string;
  audience_size: number;
  demographics: string;
  engagement_rate: number;
  creator_fee?: number;
  cpm?: number;
  custom_roas_targets?: string; // JSON string of number[]
  calculated_budgets?: string; // JSON string of { target: number, budget: number, scenario: 'A' | 'B', reachCost: number, creatorFee: number, gap: number }[]
  predicted_low_price: number;
  predicted_med_price: number;
  predicted_high_price: number;
  discovered_click_rate?: number;
  discovered_conversion_rate?: number;
  actual_spend?: number;
  actual_revenue?: number;
  raw_simulation_log?: string;
  ad_guide?: string;
  ad_guides?: string; // JSON string of { target: number, content: string }[]
  created_at: string;
}

export interface Persona {
  id: string;
  age: number;
  interests: string[];
  income_level: 'low' | 'medium' | 'high';
  likelihood_to_buy: number; // 0 to 1
  vals_segment: 'Innovator' | 'Thinker' | 'Believer' | 'Achiever' | 'Striver' | 'Experiencer' | 'Maker' | 'Survivor';
  ocean_traits: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  social_proof_sensitivity: number; // 0 to 1
  risk_aversion: number; // 0 to 1
  decision_style: 'Rational' | 'Emotional' | 'Impulsive';
  brand_loyalty: number; // 0 to 1
}
