/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, Users, DollarSign, Play, Plus, History, 
  Target, ChevronRight, AlertCircle, CheckCircle2, 
  ArrowUpRight, ArrowDownRight, Activity, BrainCircuit,
  Info, ChevronDown, ChevronUp, Sparkles, HelpCircle,
  FileText, BookOpen, Download, Loader2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
import { generatePersonas, simulateDecision, estimateBenchmarks, generateAdGuide } from './services/geminiService';
import { calculateDecision } from './services/behavioralEngine';
import { Simulation, Persona } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  console.log("App component rendering...");
  const [view, setView] = useState<'dashboard' | 'new' | 'results'>('dashboard');
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSim, setActiveSim] = useState<Simulation | null>(null);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [simLogs, setSimLogs] = useState<{ personaId: string; action: string; success: boolean; reasoning?: string }[]>([]);
  const [expandedPersona, setExpandedPersona] = useState<string | null>(null);
  const [expandedPriceCard, setExpandedPriceCard] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [adGuide, setAdGuide] = useState<string | null>(null);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    business_name: 'Cal AI',
    product_description: 'AI-powered calorie tracking app that uses photos to log food.',
    usp: 'Instant photo logging, high accuracy, personalized nutrition coaching.',
    campaign_goal: 'Drive app installs and premium subscriptions.',
    product_price: 50,
    margin: 0.7,
    conversion_rate: 0.02,
    creator_name: 'Mr Beast',
    audience_size: 100000000,
    demographics: 'Gen Z, Gaming, Entertainment',
    engagement_rate: 0.05,
    creator_fee: 0, // 0 means AI will estimate
    cpm: 0, // 0 means AI will estimate
    custom_roas_targets: [1.5, 3.0, 5.0] as number[]
  });

  useEffect(() => {
    fetchSimulations();
  }, []);

  const fetchSimulations = async (retries = 3) => {
    try {
      const res = await fetch('/api/simulations');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setSimulations(data);
    } catch (err) {
      console.error('Failed to fetch simulations', err);
      if (retries > 0) {
        console.log(`Retrying fetch... (${retries} attempts left)`);
        setTimeout(() => fetchSimulations(retries - 1), 2000);
      }
    }
  };

  const downloadCalculationFlow = (sim: Simulation, targetROAS: number, budget: number) => {
    const budgets = sim.calculated_budgets ? JSON.parse(sim.calculated_budgets) : [];
    const b = budgets.find((x: any) => x.target === targetROAS) || {};
    const flow = `
CALCULATION FLOW: ${sim.business_name} x ${sim.creator_name}
Target ROAS: ${targetROAS}x
--------------------------------------------------

1. INPUTS (Starting Guesses)
- Audience Size: ${sim.audience_size.toLocaleString()}
- Product Price: $${sim.product_price}
- Engagement Rate (Guess): ${(sim.engagement_rate * 100).toFixed(2)}%
- Conversion Rate (Guess): ${(sim.conversion_rate * 100).toFixed(2)}%
- Creator Fee: $${(sim.creator_fee || 0).toLocaleString()}
- CPM: $${(sim.cpm || 0).toFixed(2)}

2. SIMULATION DISCOVERY (Monte Carlo Results)
- Discovered Click Rate: ${((sim.discovered_click_rate || 0) * 100).toFixed(4)}%
  (Calculated by simulating 10,000 agents with psychographic traits)
- Discovered Conversion Rate: ${((sim.discovered_conversion_rate || 0) * 100).toFixed(4)}%
  (Calculated by observing purchase decisions among clicking agents)

3. PROJECTIONS
- Total Estimated Clicks: ${Math.round(sim.audience_size * (sim.discovered_click_rate || 0)).toLocaleString()}
- Total Estimated Sales: ${Math.round(sim.audience_size * (sim.discovered_conversion_rate || 0)).toLocaleString()}
- Total Estimated Revenue: $${Math.round(sim.audience_size * (sim.discovered_conversion_rate || 0) * sim.product_price).toLocaleString()}

4. BUDGET CALCULATION
- Formula: Total Estimated Revenue / Target ROAS
- Calculation: $${Math.round(sim.audience_size * (sim.discovered_conversion_rate || 0) * sim.product_price).toLocaleString()} / ${targetROAS}
- Suggested Budget: $${Math.ceil(budget).toLocaleString()}

5. DETERMINISTIC MEDIA BUYING BRIDGE
- Reach Cost (to acquire ${sim.audience_size.toLocaleString()} impressions): $${Math.round((sim.audience_size / 1000) * (sim.cpm || 0)).toLocaleString()}
- Creator Fee: $${(sim.creator_fee || 0).toLocaleString()}
- Total Required Spend: $${(Math.round((sim.audience_size / 1000) * (sim.cpm || 0)) + (sim.creator_fee || 0)).toLocaleString()}
- Target CPA: $${(b.cpa || 0).toFixed(2)}
- Target CPC: $${(b.cpc || 0).toFixed(2)}

6. SCENARIO ANALYSIS
${b.scenario === 'A' ? `
SCENARIO A: Creator Fee Exceeds Gap
- The creator fee ($${(sim.creator_fee || 0).toLocaleString()}) is greater than the remaining budget after reach costs.
- Recommendation: Focus on high-intent targeting and creative optimization to lower CPC/CPA.
` : `
SCENARIO B: Creator Fee Within Budget
- The creator fee ($${(sim.creator_fee || 0).toLocaleString()}) is covered by the budget.
- Frequency/Contingency Gap: $${Math.round(b.gap || 0).toLocaleString()}
- Recommendation: Use the extra budget for retargeting or creative testing.
`}

${b.cpa > sim.product_price ? `
!!! SANITY CHECK WARNING !!!
Target CPA ($${b.cpa.toFixed(2)}) exceeds Product Price ($${sim.product_price}).
This campaign may lose money on a single-sale basis.
` : ''}

--------------------------------------------------
This budget represents the maximum combined spend (creator fee + ad spend) 
to maintain a ${targetROAS}x ROAS based on the simulated audience behavior.
`;

    const blob = new Blob([flow], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sim.business_name.replace(/\s+/g, '_')}_${targetROAS}x_Budget_Flow.txt`;
    a.click();
  };

  const downloadRawLog = (sim: Simulation) => {
    if (!sim.raw_simulation_log) return;
    const blob = new Blob([sim.raw_simulation_log], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raw_agents_${sim.id}.csv`;
    a.click();
  };

  const downloadFullReport = (sim: Simulation) => {
    const budgets = sim.calculated_budgets ? JSON.parse(sim.calculated_budgets) : [];
    const report = `
ATTRIBUTION AI - FULL SIMULATION REPORT
Generated: ${new Date(sim.created_at).toLocaleString()}
--------------------------------------------------

BUSINESS OVERVIEW
Business Name: ${sim.business_name}
Product Description: ${sim.product_description}
USPs: ${sim.usp}
Campaign Goal: ${sim.campaign_goal}
Product Price: $${sim.product_price}
Margin: ${sim.margin * 100}%
Creator Fee: $${(sim.creator_fee || 0).toLocaleString()}
CPM: $${(sim.cpm || 0).toFixed(2)}

CAMPAIGN TARGETING
Creator: ${sim.creator_name}
Audience Size: ${sim.audience_size.toLocaleString()}
Demographics: ${sim.demographics}

DISCOVERED PERFORMANCE (Simulated)
Discovered Click Rate: ${((sim.discovered_click_rate || 0) * 100).toFixed(4)}%
Discovered Conversion Rate: ${((sim.discovered_conversion_rate || 0) * 100).toFixed(4)}%

BID RECOMMENDATIONS (Total Campaign Budget)
${budgets.map((b: any) => `
- Target ROAS: ${b.target}x
  Suggested Total Budget: $${Math.ceil(b.budget).toLocaleString()}
  Target CPA: $${b.cpa.toFixed(2)}
  Target CPC: $${b.cpc.toFixed(2)}
  Scenario: ${b.scenario === 'A' ? 'A (Creator Fee Priority)' : 'B (ROAS Met + Contingency)'}
  ${b.cpa > sim.product_price ? '!!! WARNING: CPA EXCEEDS PRODUCT PRICE !!!' : ''}
`).join('\n')}

PSYCHOGRAPHIC AGENT PROFILES
The simulation generated ${personas.length} unique audience archetypes.

${personas.map((p, i) => `
PERSONA #${i + 1}: ${p.vals_segment}
- Age: ${p.age}
- Decision Style: ${p.decision_style}
- Income Level: ${p.income_level}
- Interests: ${p.interests.join(', ')}
- OCEAN Traits: O:${p.ocean_traits.openness.toFixed(2)}, C:${p.ocean_traits.conscientiousness.toFixed(2)}, E:${p.ocean_traits.extraversion.toFixed(2)}, A:${p.ocean_traits.agreeableness.toFixed(2)}, N:${p.ocean_traits.neuroticism.toFixed(2)}
- Risk Aversion: ${p.risk_aversion.toFixed(2)}
- Brand Loyalty: ${p.brand_loyalty.toFixed(2)}
`).join('\n')}

--------------------------------------------------
AD CREATION GUIDE
${sim.ad_guide || 'No guide generated for this simulation.'}

--------------------------------------------------
This report is generated by Attribution AI. 
Use these findings to negotiate creator rates and optimize your ad creative.
    `;
    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attribution_report_${sim.id}.txt`;
    a.click();
  };

  const handleSaveGuide = async () => {
    if (!activeSim || !adGuide) return;
    try {
      await fetch(`/api/simulations/${activeSim.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad_guide: adGuide })
      });
      setActiveSim({ ...activeSim, ad_guide: adGuide });
      fetchSimulations();
    } catch (err) {
      console.error("Failed to save ad guide", err);
    }
  };

  const handleGenerateGuide = async (budgetObj?: any) => {
    if (!activeSim) return;
    setIsGeneratingGuide(true);
    setShowGuideModal(true);
    try {
      const budgets = activeSim.calculated_budgets ? JSON.parse(activeSim.calculated_budgets) : [];
      const selectedBudget = budgetObj || budgets[1] || budgets[0];
      const guide = await generateAdGuide(activeSim, personas, selectedBudget.target, selectedBudget);
      setAdGuide(guide || "Failed to generate guide.");
    } catch (err) {
      console.error("Failed to generate ad guide", err);
      setAdGuide("An error occurred while generating your guide.");
    } finally {
      setIsGeneratingGuide(false);
    }
  };

  const runSimulation = async () => {
    setLoading(true);
    setSimulationProgress(0);
    setSimLogs([]);
    setView('results');

    try {
      let currentFormData = { ...formData };
      
      // 0. Auto-estimate benchmarks if needed
      if (formData.conversion_rate === 0 || formData.engagement_rate === 0 || formData.cpm === 0) {
        setIsEstimating(true);
        const benchmarks = await estimateBenchmarks(
          { creator_name: formData.creator_name, demographics: formData.demographics },
          { business_name: formData.business_name }
        );
        currentFormData = {
          ...formData,
          conversion_rate: formData.conversion_rate || benchmarks.conversion_rate,
          engagement_rate: formData.engagement_rate || benchmarks.engagement_rate,
          cpm: formData.cpm || benchmarks.average_cpm || 15 // Default to $15 if AI fails
        };
        setFormData(currentFormData);
        setIsEstimating(false);
      }

      // 1. Generate Archetypes (Personas)
      const generatedPersonas = await generatePersonas(
        { creator_name: currentFormData.creator_name, demographics: currentFormData.demographics },
        { 
          business_name: currentFormData.business_name, 
          product_price: currentFormData.product_price,
          product_description: currentFormData.product_description
        }
      );
      setPersonas(generatedPersonas);
      setSimulationProgress(20);

      // 2. Simulate Archetype Decisions
      const results = [];
      for (let i = 0; i < generatedPersonas.length; i++) {
        const persona = generatedPersonas[i];
        const decision = calculateDecision(persona, currentFormData.product_price, currentFormData.engagement_rate);
        const aiReasoning = await simulateDecision(persona, `Ad for ${currentFormData.business_name} on ${currentFormData.creator_name}'s channel`);
        
        const finalResult = {
          ...decision,
          reasoning: aiReasoning.reasoning
        };
        
        results.push(finalResult);
        setSimLogs(prev => [...prev, { 
          personaId: persona.id, 
          action: finalResult.bought ? 'Purchased' : (finalResult.clicked ? 'Clicked' : 'Ignored'),
          success: finalResult.bought,
          reasoning: finalResult.reasoning
        }]);
        setSimulationProgress(prev => prev + (60 / generatedPersonas.length));
      }

      // 3. Monte Carlo Scaling
      const monteCarloCount = 10000;
      const monteCarloLog: string[] = ["AgentID,ArchetypeID,VALS,DecisionStyle,Clicked,Bought,Score"];
      let mcBought = 0;
      let mcClicked = 0;

      for (let i = 0; i < monteCarloCount; i++) {
        const archetypeIndex = Math.floor(Math.random() * generatedPersonas.length);
        const archetype = generatedPersonas[archetypeIndex];
        const result = calculateDecision(archetype, currentFormData.product_price, currentFormData.engagement_rate);
        if (result.bought) mcBought++;
        if (result.clicked) mcClicked++;
        monteCarloLog.push(`${i},${archetype.id},${archetype.vals_segment},${archetype.decision_style},${result.clicked},${result.bought},${result.score.toFixed(4)}`);
      }

      const buyRate = mcBought / monteCarloCount;
      const clickRate = mcClicked / monteCarloCount;
      
      const estimatedSales = currentFormData.audience_size * buyRate;
      const estimatedRevenue = estimatedSales * currentFormData.product_price;

      // Deterministic Reach Cost Calculation
      const reachCost = (currentFormData.audience_size / 1000) * (currentFormData.cpm || 15);
      const creatorFee = currentFormData.creator_fee || (estimatedRevenue * 0.1); // Estimate 10% of revenue if not provided

      // Calculate Budgets for each Custom ROAS Target
      const calculatedBudgets = currentFormData.custom_roas_targets.map(target => {
        const targetBudget = estimatedRevenue / target;
        const gap = targetBudget - reachCost;
        
        let finalBudget: number;
        let scenario: 'A' | 'B';
        
        if (creatorFee > gap) {
          // Scenario A: Creator fee takes precedence
          finalBudget = creatorFee + reachCost;
          scenario = 'A';
        } else {
          // Scenario B: Creator fee is less than gap
          finalBudget = targetBudget;
          scenario = 'B';
        }

        return {
          target,
          budget: Math.ceil(finalBudget),
          scenario,
          reachCost,
          creatorFee,
          gap: targetBudget - reachCost - creatorFee,
          cpa: finalBudget / estimatedSales,
          cpc: finalBudget / (currentFormData.audience_size * clickRate),
          cpm: (finalBudget / currentFormData.audience_size) * 1000
        };
      });

      const newSim: Simulation = {
        id: Math.random().toString(36).substr(2, 9),
        ...currentFormData,
        custom_roas_targets: JSON.stringify(currentFormData.custom_roas_targets),
        calculated_budgets: JSON.stringify(calculatedBudgets),
        predicted_low_price: calculatedBudgets[0]?.budget || 0,
        predicted_med_price: calculatedBudgets[1]?.budget || 0,
        predicted_high_price: calculatedBudgets[2]?.budget || 0,
        discovered_click_rate: clickRate,
        discovered_conversion_rate: buyRate,
        raw_simulation_log: monteCarloLog.join("\n"),
        created_at: new Date().toISOString()
      };

      // 4. Save to DB
      await fetch('/api/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSim)
      });

      setActiveSim(newSim);
      setSimulations([newSim, ...simulations]);
      setSimulationProgress(100);
    } catch (err) {
      console.error('Simulation failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      {/* Navigation */}
      <nav className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <BrainCircuit className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight">Attribution AI</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <button 
              onClick={() => setView('dashboard')}
              className={cn("text-xs sm:text-sm font-medium transition-colors", view === 'dashboard' ? "text-black" : "text-black/40 hover:text-black")}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setView('new')}
              className="bg-black text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium hover:bg-black/80 transition-all flex items-center gap-2"
            >
              <Plus size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">New Simulation</span>
              <span className="xs:hidden">New</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Market Intelligence</h1>
                  <p className="text-black/50 mt-2">Simulated ad performance across your portfolio.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto">
                  <StatCard label="Total Simulations" value={simulations.length.toString()} icon={<Activity size={18} />} />
                  <StatCard label="Avg. Predicted ROAS" value="4.2x" icon={<TrendingUp size={18} />} />
                </div>
              </div>

              {/* Recent Simulations */}
              <div className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-black/5 flex justify-between items-center bg-black/[0.02]">
                  <h2 className="font-semibold flex items-center gap-2">
                    <History size={18} />
                    Recent Analysis
                  </h2>
                </div>
                <div className="divide-y divide-black/5">
                  {simulations.length === 0 ? (
                    <div className="p-20 text-center text-black/40">
                      No simulations yet. Start your first one to see results.
                    </div>
                  ) : (
                    simulations.map((sim) => (
                      <div 
                        key={sim.id} 
                        className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-black/[0.01] transition-colors cursor-pointer group gap-4 sm:gap-0"
                        onClick={() => { setActiveSim(sim); setView('results'); }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                            <Target className="text-black/40 group-hover:text-black transition-colors" size={20} />
                          </div>
                          <div>
                            <div className="font-medium text-sm sm:text-base">{sim.business_name} × {sim.creator_name}</div>
                            <div className="text-xs text-black/40">{new Date(sim.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-12">
                          <div className="text-left sm:text-right">
                            <div className="text-[10px] text-black/40 uppercase tracking-wider font-bold">Max Bid</div>
                            <div className="font-mono font-medium text-sm sm:text-base">${(sim.predicted_high_price / 1000).toFixed(0)}K</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-black/40 uppercase tracking-wider font-bold">Status</div>
                            <div className="flex items-center gap-1 text-emerald-600 text-xs sm:text-sm font-medium">
                              <CheckCircle2 size={14} />
                              Complete
                            </div>
                          </div>
                          <ChevronRight className="text-black/20 group-hover:text-black transition-colors hidden sm:block" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'new' && (
            <motion.div 
              key="new"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white rounded-3xl border border-black/5 p-6 sm:p-8 shadow-xl">
                <h2 className="text-2xl font-bold mb-6">New Simulation</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InputField 
                      label="Business Name" 
                      value={formData.business_name} 
                      onChange={v => setFormData({...formData, business_name: v})} 
                    />
                    <InputField 
                      label="Creator/Channel" 
                      value={formData.creator_name} 
                      onChange={v => setFormData({...formData, creator_name: v})} 
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-black/40">Product Details</h3>
                    <textarea 
                      className="w-full bg-black/5 border-none rounded-2xl p-4 text-sm focus:ring-2 ring-black/10 transition-all min-h-[80px]"
                      placeholder="Product Description (What are you selling?)..."
                      value={formData.product_description}
                      onChange={e => setFormData({...formData, product_description: e.target.value})}
                    />
                    <textarea 
                      className="w-full bg-black/5 border-none rounded-2xl p-4 text-sm focus:ring-2 ring-black/10 transition-all min-h-[60px]"
                      placeholder="Unique Selling Points (Why is it better?)..."
                      value={formData.usp}
                      onChange={e => setFormData({...formData, usp: e.target.value})}
                    />
                    <InputField 
                      label="Campaign Goal" 
                      value={formData.campaign_goal} 
                      onChange={v => setFormData({...formData, campaign_goal: v})} 
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-black/40">Business Metrics</h3>
                      <button 
                        onClick={async () => {
                          setIsEstimating(true);
                          const benchmarks = await estimateBenchmarks(
                            { creator_name: formData.creator_name, demographics: formData.demographics },
                            { business_name: formData.business_name }
                          );
                          setFormData({
                            ...formData,
                            conversion_rate: benchmarks.conversion_rate,
                            engagement_rate: benchmarks.engagement_rate
                          });
                          setIsEstimating(false);
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1 hover:text-indigo-800 transition-colors"
                      >
                        <Sparkles size={12} />
                        AI Estimate Benchmarks
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputField 
                        label="Product Price ($)" 
                        type="number" 
                        value={formData.product_price} 
                        onChange={v => setFormData({...formData, product_price: Number(v)})} 
                      />
                      <InputField 
                        label="Margin (%)" 
                        type="number" 
                        value={formData.margin * 100} 
                        onChange={v => setFormData({...formData, margin: Number(v) / 100})} 
                      />
                      <InputField 
                        label="Creator Fee ($) (Opt.)" 
                        type="number" 
                        value={formData.creator_fee} 
                        onChange={v => setFormData({...formData, creator_fee: Number(v)})} 
                      />
                      <InputField 
                        label="CPM ($) (Opt.)" 
                        type="number" 
                        value={formData.cpm} 
                        onChange={v => setFormData({...formData, cpm: Number(v)})} 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-black/40">Target ROAS Multiples (Max 4)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {formData.custom_roas_targets.map((target, i) => (
                        <div key={i} className="relative group">
                          <InputField 
                            label={`Target ${i+1}`} 
                            type="number" 
                            value={target} 
                            onChange={v => {
                              const newTargets = [...formData.custom_roas_targets];
                              newTargets[i] = Number(v);
                              setFormData({...formData, custom_roas_targets: newTargets});
                            }} 
                          />
                          {formData.custom_roas_targets.length > 1 && (
                            <button 
                              onClick={() => {
                                const newTargets = formData.custom_roas_targets.filter((_, idx) => idx !== i);
                                setFormData({...formData, custom_roas_targets: newTargets});
                              }}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      ))}
                      {formData.custom_roas_targets.length < 4 && (
                        <button 
                          onClick={() => setFormData({...formData, custom_roas_targets: [...formData.custom_roas_targets, 2.0]})}
                          className="flex flex-col items-center justify-center border-2 border-dashed border-black/10 rounded-2xl p-4 hover:border-black/20 transition-all group"
                        >
                          <Plus size={20} className="text-black/20 group-hover:text-black/40" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-black/20 group-hover:text-black/40">Add Target</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-black/40">Channel Metrics</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputField 
                        label="Audience Size" 
                        type="number" 
                        value={formData.audience_size} 
                        onChange={v => setFormData({...formData, audience_size: Number(v)})} 
                      />
                      <InputField 
                        label="Engagement (%)" 
                        type="number" 
                        value={formData.engagement_rate * 100} 
                        onChange={v => setFormData({...formData, engagement_rate: Number(v) / 100})} 
                      />
                    </div>
                    <textarea 
                      className="w-full bg-black/5 border-none rounded-2xl p-4 text-sm focus:ring-2 ring-black/10 transition-all min-h-[100px]"
                      placeholder="Demographics & Audience Interests..."
                      value={formData.demographics}
                      onChange={e => setFormData({...formData, demographics: e.target.value})}
                    />
                  </div>

                  <button 
                    onClick={runSimulation}
                    disabled={loading}
                    className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black/90 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Simulating Agents...
                      </>
                    ) : (
                      <>
                        <Play size={20} fill="currentColor" />
                        Run Simulation
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'results' && activeSim && (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
                <div>
                  <div className="flex items-center gap-2 text-black/40 mb-2">
                    <button onClick={() => setView('dashboard')} className="hover:text-black text-xs sm:text-sm">Dashboard</button>
                    <ChevronRight size={12} className="sm:w-3.5 sm:h-3.5" />
                    <span className="text-black font-medium text-xs sm:text-sm">Simulation Results</span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">{activeSim.business_name} × {activeSim.creator_name}</h1>
                </div>
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <button 
                    onClick={() => downloadRawLog(activeSim)}
                    className="flex items-center gap-2 px-4 py-2 bg-black/5 hover:bg-black/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    <Download size={14} />
                    Raw Agent Data (CSV)
                  </button>
                  {activeSim.raw_simulation_log && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => downloadFullReport(activeSim)}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-black/80 transition-all shadow-lg shadow-black/10"
                      >
                        <FileText size={14} />
                        Download Full Report
                      </button>
                    </div>
                  )}
                  <button 
                    onClick={handleGenerateGuide}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                  >
                    <BookOpen size={14} />
                    Ad Creation Guide
                  </button>
                  {loading && (
                    <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
                      <div className="text-xs sm:text-sm font-medium text-black/60">Simulation Progress</div>
                      <div className="w-full md:w-64 h-2 bg-black/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-black"
                          initial={{ width: 0 }}
                          animate={{ width: `${simulationProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Simulation Logs (Real-time feel) */}
              {loading && (
                <div className="bg-black text-white rounded-3xl p-6 font-mono text-xs h-48 overflow-y-auto space-y-1 scrollbar-hide">
                  <div className="text-emerald-400">Initializing synthetic audience...</div>
                  {simLogs.map((log, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">[{new Date().toLocaleTimeString()}]</span>
                        <span className="font-bold">Agent {log.personaId}:</span>
                        <span className={log.success ? "text-emerald-400" : "text-white/60"}>{log.action}</span>
                      </div>
                      {log.reasoning && (
                        <div className="pl-6 text-[10px] text-white/30 italic leading-tight mb-2">
                          "{log.reasoning}"
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="animate-pulse">_</div>
                </div>
              )}

              {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
                  {(() => {
                    const budgets = activeSim.calculated_budgets ? JSON.parse(activeSim.calculated_budgets) : [];
                    return budgets.map((b: any, i: number) => (
                      <PriceCard 
                        key={i}
                        tier={i === 0 ? "Low Risk" : i === 1 ? "Balanced" : i === 2 ? "High Stakes" : "Aggressive"} 
                        price={b.budget} 
                        cac={b.cpa}
                        productPrice={activeSim.product_price}
                        scenario={b.scenario}
                        gap={b.gap}
                        probability={`${b.target}x`} 
                        description={b.scenario === 'A' ? "Creator fee is high. Focus on high-intent targeting." : "Optimal balance. Extra budget used for frequency."}
                        color={i === 0 ? "emerald" : i === 1 ? "indigo" : i === 2 ? "orange" : "orange"}
                        isExpanded={expandedPriceCard === `tier-${i}`}
                        onToggle={() => setExpandedPriceCard(expandedPriceCard === `tier-${i}` ? null : `tier-${i}`)}
                        onDownload={(e) => { e.stopPropagation(); downloadCalculationFlow(activeSim, b.target, b.budget); }}
                        onGenerateGuide={(e) => { e.stopPropagation(); handleGenerateGuide(b); }}
                      />
                    ));
                  })()}
                </div>
              )}

              {/* Visualizations */}
              {!loading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/5 shadow-sm">
                    <h3 className="font-bold mb-6 flex items-center gap-2">
                      <TrendingUp size={18} />
                      Predicted Funnel Performance
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[
                          { name: 'Impressions', val: activeSim.audience_size },
                          { name: 'Clicks', val: activeSim.audience_size * (activeSim.discovered_click_rate || activeSim.engagement_rate) },
                          { name: 'Sales', val: activeSim.audience_size * (activeSim.discovered_conversion_rate || (activeSim.engagement_rate * activeSim.conversion_rate)) },
                        ]}>
                          <defs>
                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#00000060'}} />
                          <YAxis hide />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                          />
                          <Area type="monotone" dataKey="val" stroke="#000" fillOpacity={1} fill="url(#colorVal)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/5 shadow-sm flex flex-col justify-center">
                    <h3 className="font-bold mb-6 flex items-center gap-2">
                      <BrainCircuit size={18} />
                      Psychographic Agent Profiles
                    </h3>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                      {personas.map((p, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "p-4 rounded-2xl bg-black/[0.02] border border-black/5 space-y-3 transition-all cursor-pointer hover:bg-black/[0.04]",
                            expandedPersona === p.id ? "ring-2 ring-black/5" : ""
                          )}
                          onClick={() => setExpandedPersona(expandedPersona === p.id ? null : p.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-black shrink-0">
                                {p.id.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-xs sm:text-sm font-bold">Age {p.age} • {p.vals_segment}</div>
                                <div className="text-[9px] sm:text-[10px] text-black/40 uppercase font-black tracking-widest">{p.decision_style} Decision Style</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-tighter text-black/40">Buy Prob.</div>
                                <div className="font-mono text-xs sm:text-sm font-bold">{(p.likelihood_to_buy * 100).toFixed(0)}%</div>
                              </div>
                              {expandedPersona === p.id ? <ChevronUp size={14} className="text-black/20" /> : <ChevronDown size={14} className="text-black/20" />}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-5 gap-1">
                            {Object.entries(p.ocean_traits).map(([trait, val]) => (
                              <div key={trait} className="text-center">
                                <div className="text-[7px] sm:text-[8px] uppercase font-black text-black/30">{trait[0]}</div>
                                <div className="h-1 bg-black/5 rounded-full overflow-hidden mt-0.5">
                                  <div className="h-full bg-black/40" style={{ width: `${(val as number) * 100}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>

                          <AnimatePresence>
                            {expandedPersona === p.id && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden pt-2 border-t border-black/5 space-y-2"
                              >
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-[8px] font-black uppercase text-black/30">Social Sensitivity</div>
                                    <div className="text-[10px] font-bold">{(p.social_proof_sensitivity * 100).toFixed(0)}%</div>
                                  </div>
                                  <div>
                                    <div className="text-[8px] font-black uppercase text-black/30">Risk Aversion</div>
                                    <div className="text-[10px] font-bold">{(p.risk_aversion * 100).toFixed(0)}%</div>
                                  </div>
                                </div>
                                <div className="text-[10px] text-black/60">
                                  <span className="font-bold">Interests:</span> {p.interests.join(', ')}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                    <p className="mt-6 text-[10px] text-black/40 italic leading-tight">
                      * Personas derived from VALS™ segmentation, Big Five (OCEAN) personality models, and behavioral economics data.
                    </p>
                  </div>
                </div>
              )}

              {!loading && (
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                    <h3 className="font-bold flex items-center gap-2">
                      <Target size={18} />
                      Post-Deal Analysis
                    </h3>
                    {!activeSim.actual_revenue ? (
                      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <input 
                          type="number" 
                          placeholder="Actual Spend ($)" 
                          className="bg-black/5 border-none rounded-xl px-4 py-2 text-sm w-full sm:w-32"
                          id="actual_spend"
                        />
                        <input 
                          type="number" 
                          placeholder="Actual Revenue ($)" 
                          className="bg-black/5 border-none rounded-xl px-4 py-2 text-sm w-full sm:w-32"
                          id="actual_revenue"
                        />
                        <button 
                          onClick={async () => {
                            const spend = Number((document.getElementById('actual_spend') as HTMLInputElement).value);
                            const rev = Number((document.getElementById('actual_revenue') as HTMLInputElement).value);
                            await fetch(`/api/simulations/${activeSim.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ actual_spend: spend, actual_revenue: rev })
                            });
                            setActiveSim({ ...activeSim, actual_spend: spend, actual_revenue: rev });
                            fetchSimulations();
                          }}
                          className="bg-black text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-black/80 w-full sm:w-auto"
                        >
                          Save Actuals
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                        <CheckCircle2 size={16} />
                        Data Verified
                      </div>
                    )}
                  </div>

                  {activeSim.actual_revenue && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: 'Predicted Revenue', val: activeSim.predicted_med_price / activeSim.margin },
                            { name: 'Actual Revenue', val: activeSim.actual_revenue },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#00000060'}} />
                            <YAxis hide />
                            <Tooltip cursor={{fill: '#00000005'}} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                            <Bar dataKey="val" fill="#000" radius={[8, 8, 0, 0]} barSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col justify-center space-y-6">
                        <div className="p-6 rounded-2xl bg-black/[0.02] border border-black/5">
                          <div className="text-[10px] font-bold text-black/40 uppercase mb-1">Prediction Accuracy</div>
                          <div className="text-2xl sm:text-3xl font-black">
                            {Math.min(100, (100 - Math.abs(((activeSim.predicted_med_price / activeSim.margin) - activeSim.actual_revenue!) / activeSim.actual_revenue!) * 100)).toFixed(1)}%
                          </div>
                          <div className="text-[10px] text-black/40 mt-2">Model is learning from this variance to improve future simulations.</div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                            <div className="text-[9px] font-black text-emerald-700 uppercase">Actual ROAS</div>
                            <div className="text-lg sm:text-xl font-bold text-emerald-900">{(activeSim.actual_revenue! / activeSim.actual_spend!).toFixed(2)}x</div>
                          </div>
                          <div className="flex-1 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                            <div className="text-[9px] font-black text-indigo-700 uppercase">Actual ROI</div>
                            <div className="text-lg sm:text-xl font-bold text-indigo-900">{(((activeSim.actual_revenue! * activeSim.margin) - activeSim.actual_spend!) / activeSim.actual_spend! * 100).toFixed(0)}%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Ad Guide Modal */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGuideModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-black/5 flex items-center justify-between bg-indigo-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">Ad Creation Guide</h2>
                    <p className="text-xs text-black/40 font-bold uppercase tracking-widest">Tailored Strategy</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowGuideModal(false)}
                  className="p-2 hover:bg-black/5 rounded-full transition-colors"
                >
                  <X size={20} className="text-black/40" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 scrollbar-hide">
                {isGeneratingGuide ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 size={40} className="text-indigo-600 animate-spin" />
                    <p className="text-sm font-bold text-black/40 animate-pulse">Consulting Ad Strategist...</p>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-black/70 prose-strong:text-black prose-ul:list-disc prose-li:text-black/70">
                    <Markdown>{adGuide}</Markdown>
                  </div>
                )}
              </div>

              <div className="p-6 sm:p-8 border-t border-black/5 bg-black/[0.02] flex flex-col sm:flex-row gap-4 justify-between items-center">
                <p className="text-[10px] text-black/40 font-bold uppercase tracking-widest max-w-[200px] text-center sm:text-left">
                  {activeSim.ad_guide ? "Guide is saved to this simulation." : "Save this guide to access it later."}
                </p>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button 
                    onClick={handleGenerateGuide}
                    disabled={isGeneratingGuide}
                    className="flex-1 sm:flex-none px-6 py-3 bg-white border border-black/10 text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black/5 transition-all disabled:opacity-50"
                  >
                    Regenerate
                  </button>
                  <button 
                    onClick={handleSaveGuide}
                    disabled={isGeneratingGuide || !adGuide}
                    className="flex-1 sm:flex-none px-8 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                  >
                    Save Guide
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white px-6 py-4 rounded-2xl border border-black/5 shadow-sm flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black/60">
        {icon}
      </div>
      <div>
        <div className="text-xs text-black/40 font-bold uppercase tracking-wider">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text' }: { label: string; value: any; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-black/40 ml-1">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-black/5 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 ring-black/10 transition-all"
      />
    </div>
  );
}

function PriceCard({ tier, price, probability, description, color, isExpanded, onToggle, onDownload, onGenerateGuide, cac, productPrice, scenario, gap }: { tier: string; price: number; probability: string; description: string; color: 'emerald' | 'indigo' | 'orange'; isExpanded?: boolean; onToggle?: () => void; onDownload?: (e: React.MouseEvent) => void; onGenerateGuide?: (e: React.MouseEvent) => void; cac?: number; productPrice?: number; scenario?: 'A' | 'B'; gap?: number }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100'
  };

  const isUnsafe = cac && productPrice && cac > productPrice;

  return (
    <div 
      className={cn(
        "bg-white p-6 sm:p-8 rounded-[2rem] border border-black/5 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500 cursor-pointer",
        isExpanded ? "ring-2 ring-black/5" : ""
      )}
      onClick={onToggle}
    >
      <div className={cn("absolute top-0 right-0 px-4 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest", colors[color])}>
        {probability} Target ROAS
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs sm:text-sm font-bold text-black/40 uppercase tracking-widest">{tier}</div>
        {isExpanded ? <ChevronUp size={14} className="text-black/20" /> : <ChevronDown size={14} className="text-black/20" />}
      </div>
      <div className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1">Total Campaign Budget</div>
      <div className="text-3xl sm:text-5xl font-black tracking-tighter mb-2">
        ${Math.ceil(price).toLocaleString()}
      </div>
      {cac !== undefined && (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Target CAC:</div>
          <div className={cn("text-sm font-bold", isUnsafe ? "text-red-600" : "text-emerald-600")}>${cac.toFixed(2)}</div>
        </div>
      )}

      {isUnsafe && (
        <div className="mb-4 p-3 bg-red-50 border-red-100 rounded-xl flex items-start gap-2 text-red-700">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div className="text-[9px] font-bold leading-tight uppercase tracking-wider">
            Warning: Target CAC exceeds product price. This campaign may lose money on a single-sale basis.
          </div>
        </div>
      )}

      {scenario === 'A' && (
        <div className="mb-4 p-3 bg-orange-50 border-orange-100 rounded-xl flex items-start gap-2 text-orange-700">
          <Info size={14} className="shrink-0 mt-0.5" />
          <div className="text-[9px] font-bold leading-tight uppercase tracking-wider">
            Scenario A: Creator fee takes precedence. Paid media budget is lean.
          </div>
        </div>
      )}

      {scenario === 'B' && (
        <div className="mb-4 p-3 bg-blue-50 border-blue-100 rounded-xl flex items-start gap-2 text-blue-700">
          <Info size={14} className="shrink-0 mt-0.5" />
          <div className="text-[9px] font-bold leading-tight uppercase tracking-wider">
            Scenario B: Target ROAS met with extra ${Math.round(gap || 0).toLocaleString()} for frequency/contingency.
          </div>
        </div>
      )}

      <p className="text-xs sm:text-sm text-black/60 leading-relaxed mb-6">
        {description}
      </p>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6 space-y-4 pt-4 border-t border-black/5"
          >
            <div className="p-4 rounded-2xl bg-black/[0.02] space-y-2">
              <div className="text-[10px] font-black uppercase text-black/40">What this means:</div>
              <p className="text-xs text-black/60 leading-relaxed">
                This is the **maximum** you should spend on this creator partnership (including their fee and any supporting ad spend) to achieve a **{probability} Return on Ad Spend**.
              </p>
              <p className="text-xs text-black/60 leading-relaxed">
                If the creator asks for more than this, the simulation suggests you will likely lose money or fail to meet your target ROI.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={onDownload}
                className="flex-1 py-3 rounded-xl border border-black/10 text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Download size={14} />
                Calculation Flow
              </button>
              <button 
                onClick={onGenerateGuide}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
              >
                <BookOpen size={14} />
                Ad Guide
              </button>
            </div>

            <p className="text-[10px] text-black/40 italic">
              Calculated by simulating 10,000 agents and projecting ROI across your full audience.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-1 w-full bg-black/5 rounded-full overflow-hidden">
        <motion.div 
          className={cn("h-full", color === 'emerald' ? 'bg-emerald-500' : color === 'indigo' ? 'bg-indigo-500' : 'bg-orange-500')}
          initial={{ width: 0 }}
          animate={{ width: probability }}
          transition={{ delay: 0.5, duration: 1 }}
        />
      </div>
    </div>
  );
}
