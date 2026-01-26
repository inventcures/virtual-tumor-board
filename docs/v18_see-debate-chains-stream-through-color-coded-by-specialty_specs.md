# V18 Specification: Real-Time Deliberation Visualization

**Date:** 2026-01-27  
**Status:** Planning  
**Priority:** High  
**Author:** AI-assisted (Claude)

---

## 0. HCI & Human Factors Design Principles

> *"A key goal in data visualization, and in communication, is to help people spend less time trying to remember and understand, and more time actually following along."* — Saloni Dattani

This specification follows evidence-based HCI principles to reduce cognitive load while conveying complex multi-agent deliberation. Our clinician users are already cognitively loaded; our visualization must **clarify, not overwhelm**.

### Core Design Principles (Saloni's Guidelines Applied)

#### 1. **Reduce Cognitive Load Through Clarity**
- **Keep text horizontal** — Never rotate specialist names or phase labels
- **Label directly** — Agent names appear next to their thoughts, no separate legend required
- **Use plain language** — "Checking tumor margins" not "Evaluating circumferential resection margin R0 feasibility"
- **Progressive disclosure** — Show summary first, details on demand

#### 2. **Match Colors to Medical Concepts**
| Specialty | Color Rationale |
|-----------|-----------------|
| Surgical | Blue (scrubs, sterile field) |
| Medical Oncology | Green (systemic therapy, growth/healing) |
| Radiation | Orange/Yellow (radiation warning signs) |
| Pathology | Purple (H&E stains, laboratory) |
| Radiology | Cyan (imaging screens, X-ray blue) |
| Genetics | Pink (DNA diagrams convention) |
| Palliative | Amber (warmth, comfort, care) |

These are not arbitrary—they match clinicians' existing mental models.

#### 3. **Visual Hierarchy Reduces Scanning**
```
Phase Header (LARGEST, boldest)
  └── Agent Name (Medium, colored)
        └── Thought Content (Normal, readable)
              └── Citation (Smallest, subtle)
```

#### 4. **One Message Per Visual Element**
- Each thought bubble = one agent's single thought
- Each phase section = one deliberation stage
- No dual-axis charts, no overloaded panels

#### 5. **Guide the Reader Through Complexity**
When showing unfamiliar visualization (multi-agent debate stream):
- Provide a 2-second "how to read this" hint on first use
- Use consistent spatial layout (agents always in same order)
- Animate transitions to show causality (thought A → response B)

#### 6. **Make It Work Standalone**
Every screenshot of the deliberation stream should be interpretable without external context:
- Phase name visible
- Agent specialty visible (not just name)
- Time elapsed visible
- Clear that this is AI-generated deliberation

### Anti-Patterns to Avoid

| Bad Practice | Why It's Bad | Our Solution |
|--------------|--------------|--------------|
| Separate legend for agents | Forces eye movement, memory load | Direct labels |
| Vertical text | Unnatural reading | Horizontal only |
| Too many colors (>7) | Indistinguishable, overwhelming | Max 7 specialties + 1 consensus |
| Jargon without context | Excludes non-specialists | Plain language + technical term |
| Dense information walls | Cognitive overload | Chunked thoughts, whitespace |
| Autoscroll without control | Loss of agency | Manual scroll + "Jump to latest" |
| Animation for decoration | Distracting | Animation only for meaning (phase transitions) |

### Cognitive Load Budget

For a 60-second deliberation stream, users should:
- **Recognize** which specialist is speaking: < 0.5 seconds
- **Understand** phase transitions: < 1 second  
- **Follow** the debate thread: continuous, effortless
- **Recall** key recommendations: 3-5 points max

If users are squinting, re-reading, or losing track—we've failed.

---

## 1. Executive Summary

### The Problem
Currently, when the Virtual Tumor Board deliberates on a case, users see a loading spinner and then receive the final recommendations. The rich adversarial debate between specialists—the "thinking" process—is invisible. This is a missed opportunity for:

1. **Transparency**: Clinicians want to see *how* the AI reached its conclusions
2. **Trust**: Watching the debate unfold builds confidence in the process
3. **Education**: Trainees can learn from the multi-specialty reasoning
4. **Engagement**: Real-time streaming keeps users engaged during the 30-60 second deliberation

### The Solution
Implement a **real-time streaming deliberation panel** that shows the Chain-of-Thought (CoT) reasoning of each specialist as it happens, color-coded by specialty, with visual delineation of deliberation phases.

**Inspiration**: Similar to how Claude, o1, and DeepSeek show their "thinking" process during complex reasoning—but adapted for multi-agent medical deliberation.

---

## 2. Visual Design Concept

### 2.1 Overall Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Virtual Tumor Board                                │
├─────────────────────────────────────┬───────────────────────────────────────┤
│                                     │                                       │
│         CASE INPUT PANEL            │      DELIBERATION STREAM PANEL        │
│                                     │                                       │
│  ┌─────────────────────────────┐   │  ┌─────────────────────────────────┐  │
│  │  Patient: John D., 62M      │   │  │  ▼ PHASE 1: Initial Assessment  │  │
│  │  Diagnosis: NSCLC Stage IIIA│   │  │    ════════════════════════════  │  │
│  │  EGFR: Wild-type            │   │  │                                 │  │
│  │  PD-L1: 80%                 │   │  │  🔵 Dr. Shalya (Surgical):      │  │
│  │  ECOG: 1                    │   │  │  "Reviewing resectability...    │  │
│  │  ...                        │   │  │   T3N2M0, considering margins..." │  │
│  │                             │   │  │                                 │  │
│  └─────────────────────────────┘   │  │  🟢 Dr. Chitra (Medical Onc):   │  │
│                                     │  │  "PD-L1 80% suggests strong     │  │
│  ┌─────────────────────────────┐   │  │   IO candidate. Checking NCCN..." │  │
│  │  📎 Attached Documents      │   │  │                                 │  │
│  │  • CT_chest_2026-01.dcm     │   │  │  🟠 Dr. Kiran (Radiation):      │  │
│  │  • pathology_report.pdf     │   │  │  "Evaluating SBRT vs conventional│  │
│  │                             │   │  │   for this nodal involvement..." │  │
│  └─────────────────────────────┘   │  │                                 │  │
│                                     │  │  ▼ PHASE 2: Adversarial Debate  │  │
│  ┌─────────────────────────────┐   │  │    ════════════════════════════  │  │
│  │  [Start Deliberation]       │   │  │                                 │  │
│  │                             │   │  │  🔵 Dr. Shalya: "I disagree     │  │
│  └─────────────────────────────┘   │  │   with upfront surgery—N2 nodal │  │
│                                     │  │   disease requires neoadjuvant." │  │
│                                     │  │                                 │  │
│                                     │  │  🟢 Dr. Chitra: "Agreed. NCCN   │  │
│                                     │  │   recommends concurrent chemoRT │  │
│                                     │  │   or induction chemo first..."  │  │
│                                     │  │                                 │  │
│                                     │  └─────────────────────────────────┘  │
│                                     │                                       │
├─────────────────────────────────────┴───────────────────────────────────────┤
│                         FINAL RECOMMENDATIONS                                │
│  (Appears after deliberation completes)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Color Coding by Specialty

| Specialty | Color | Icon | Hex Code | Tailwind Class |
|-----------|-------|------|----------|----------------|
| Surgical Oncology | Blue | 🔵 🔪 | `#3B82F6` | `text-blue-500` |
| Medical Oncology | Green | 🟢 💊 | `#22C55E` | `text-green-500` |
| Radiation Oncology | Orange | 🟠 ☢️ | `#F97316` | `text-orange-500` |
| Pathology | Purple | 🟣 🔬 | `#A855F7` | `text-purple-500` |
| Radiology | Cyan | 🔵 📷 | `#06B6D4` | `text-cyan-500` |
| Genetics | Pink | 🩷 🧬 | `#EC4899` | `text-pink-500` |
| Palliative Care | Amber | 🟡 🤝 | `#F59E0B` | `text-amber-500` |
| Moderator/Consensus | White/Gray | ⚪ 🎯 | `#F1F5F9` | `text-slate-100` |

### 2.3 Phase Delineation — Simplified

The MAI-DxO adversarial deliberation has 5 distinct phases. **Following Saloni's principle of clarity**, we use:
- **Consistent left border colors** (easy pattern recognition)
- **Plain English phase names** (no jargon)
- **Elapsed time** (builds anticipation, reduces uncertainty)
- **Collapse/expand** (progressive disclosure)

```
┌────────────────────────────────────────────────────────────────┐
│  ● PHASE 1: Each specialist reviews the case      12s elapsed │
│  ─────────────────────────────────────────────────────────────  │
│  │ (Collapsed view: "5 specialists assessed the case")        │
│  │                                                             │
│  │ (Expanded view: individual assessments shown)              │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  ◉ PHASE 2: Specialists debate key decisions      28s elapsed │  ← ACTIVE (pulsing dot)
│  ─────────────────────────────────────────────────────────────  │
│  │                                                             │
│  │  Dr. Shalya (Surgery): "N2 disease—surgery alone           │
│  │  has poor outcomes. I recommend neoadjuvant first."        │
│  │                                                             │
│  │  ↳ Dr. Chitra (Medical Onc): "Agreed. NCCN says            │
│  │    concurrent chemoRT for stage IIIA."                     │
│  │                                                             │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  ○ PHASE 3: Checking clinical guidelines          (pending)   │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  ○ PHASE 4: Building consensus                    (pending)   │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  ○ PHASE 5: Final recommendations                 (pending)   │
└────────────────────────────────────────────────────────────────┘
```

**Phase Status Indicators** (minimal, unambiguous):
- `○` = Pending (gray, hollow)
- `◉` = Active (colored, pulsing)
- `●` = Complete (colored, solid)

### 2.4 Simplified Thought Bubble Design

**Problem**: Complex bubbles with icons, badges, and metadata overwhelm users.

**Solution**: Minimalist thought bubbles following Saloni's "focus on data" principle.

```
┌─ Minimal Thought Bubble ─────────────────────────────────────┐
│                                                              │
│  Dr. Shalya · Surgery                                        │ ← Name + Specialty (horizontal)
│  ──────────────────────────────────────────────────────────  │ ← Colored underline (not bg)
│  "For N2 nodal disease, upfront surgery alone has only       │
│   15-25% 5-year survival. Neoadjuvant therapy recommended."  │ ← Plain language summary
│                                                              │
│   📖 SSO Stage IIIA Guidelines                               │ ← Citation (subtle, clickable)
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**What we removed** (intentionally):
- ❌ Avatar images (not needed—name suffices)
- ❌ Background color fill (too noisy when many bubbles)
- ❌ Multiple icons per bubble
- ❌ Timestamp on every thought (phase elapsed time is enough)
- ❌ Confidence badges (adds cognitive load without benefit)

**What we kept**:
- ✅ Color-coded underline (specialty recognition in <0.5s)
- ✅ Name + Specialty text (redundancy aids scanning)
- ✅ Quote-style thought (clearly AI-generated content)
- ✅ Single subtle citation link

---

## 3. Deliberation Phases Breakdown

### Phase 1: Initial Assessment (10-15s)
Each specialist independently evaluates the case from their domain perspective.

**Visual Cues:**
- Phase header with pulsing animation
- Specialists appear sequentially as they start
- Each specialist's stream shows their initial assessment
- Tooltips show what guidelines they're consulting

**Content Example:**
```
🔵 Dr. Shalya (Surgical Oncology)
   Evaluating resectability...
   ├─ T3 tumor: Potentially resectable
   ├─ N2 nodes: Concerning for upfront surgery
   └─ Consulting SSO guidelines for Stage IIIA...

🟢 Dr. Chitra (Medical Oncology)  
   Reviewing systemic therapy options...
   ├─ EGFR wild-type: TKIs not indicated
   ├─ PD-L1 80%: Strong IO candidate
   └─ Checking NCCN NSCLC v.2026.1...
```

### Phase 2: Adversarial Debate (20-30s)
Specialists challenge each other's assumptions and recommendations.

**Visual Cues:**
- "Debate mode" indicator (crossed swords icon ⚔️)
- Connecting lines between disagreeing specialists
- Highlighted points of contention
- Agreement/disagreement badges

**Content Example:**
```
⚔️ DEBATE: Surgery Timing

🔵 Dr. Shalya challenges:
   "Upfront surgery for N2 disease has poor outcomes.
    5-year survival only 15-25% without neoadjuvant."
   
   └─ 🟢 Dr. Chitra responds:
      "Agreed. NCCN Category 1 recommends concurrent
       chemoRT or induction chemotherapy first."
      
      └─ 🟠 Dr. Kiran adds:
         "If concurrent chemoRT chosen, I can deliver
          60 Gy in 30 fractions with carboplatin/paclitaxel."
```

### Phase 3: Guideline Grounding (10-15s)
Each recommendation is anchored to specific guidelines with citations.

**Visual Cues:**
- Guideline source badges (NCCN, ESMO, SSO, ASTRO)
- Citation links that can be expanded
- Evidence level indicators (Category 1, 2A, etc.)

**Content Example:**
```
📚 GUIDELINE GROUNDING

🟢 Dr. Chitra citing:
   ┌─────────────────────────────────────────────┐
   │ NCCN NSCLC v.2026.1, NSCL-7               │
   │ "For stage IIIA (T1-3, N2), concurrent    │
   │  chemoradiation is preferred (Category 1)" │
   │ Evidence: Multiple randomized trials       │
   └─────────────────────────────────────────────┘

🟠 Dr. Kiran citing:
   ┌─────────────────────────────────────────────┐
   │ ASTRO Lung RT Guidelines 2024              │
   │ "60 Gy in 30 fractions standard dose for   │
   │  definitive chemoRT in stage III NSCLC"    │
   └─────────────────────────────────────────────┘
```

### Phase 4: Consensus Building (5-10s)
Specialists converge on a unified recommendation.

**Simplified Visual** (following Saloni's "one message per element"):
```
┌─────────────────────────────────────────────────────────────────┐
│  ● PHASE 4: Building consensus                      8s elapsed │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Recommendation: Neoadjuvant chemoRT → Restaging → Surgery     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ████████████████████████████████████████ 100% agree    │   │ ← Simple progress bar
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  All 5 specialists support this plan.                          │
│  Dr. Shalya adds: "Restaging CT/PET after chemoRT essential"   │ ← Only show if notable
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**What we simplified**:
- ❌ Individual vote checkmarks for each specialist (visual clutter)
- ✅ Single progress bar showing agreement level
- ✅ One-line summary of consensus
- ✅ Only notable conditions/dissents shown

### Phase 5: Final Recommendations
Structured output with actionable treatment plan.

**Simplified Final Output** (scannable, actionable):
```
┌─────────────────────────────────────────────────────────────────┐
│  ✓ RECOMMENDATIONS READY                           58s total   │
│  ═════════════════════════════════════════════════════════════  │
│                                                                 │
│  PRIMARY PLAN                                                   │
│  ───────────                                                    │
│  1. Concurrent chemoradiation (60 Gy + carboplatin/paclitaxel) │
│  2. Restaging CT + PET at 6-8 weeks                            │
│  3. If response: Surgical resection                            │
│                                                                 │
│  KEY CONSIDERATIONS                                             │
│  ──────────────────                                             │
│  • PD-L1 80% — may qualify for durvalumab consolidation        │
│  • Good PS (ECOG 1) — tolerate aggressive approach             │
│                                                                 │
│  GUIDELINE BASIS                                                │
│  ───────────────                                                │
│  NCCN NSCLC v.2026 · SSO Stage III Guidelines · ASTRO Lung RT  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [View Full Report]  [Export PDF]  [Share with Patient]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Design Rationale**:
- **Numbered steps** → Clear sequence, easy to remember
- **Bullet points** → Scannable at a glance
- **Grouped sections** → Reduces cognitive load
- **Action buttons** → Clear next steps
- **No celebration animation** → Medical context requires sobriety

---

## 4. Technical Architecture

### 4.1 Streaming Protocol

```typescript
// Server-Sent Events (SSE) for real-time streaming
interface DeliberationEvent {
  type: 'phase_start' | 'agent_thought' | 'debate_point' | 'citation' | 'consensus' | 'complete';
  timestamp: number;
  phase: 1 | 2 | 3 | 4 | 5;
  agent?: {
    id: AgentId;
    name: string;
    specialty: string;
    color: string;
  };
  content: string;
  metadata?: {
    guideline_source?: string;
    evidence_level?: string;
    agrees_with?: AgentId[];
    disagrees_with?: AgentId[];
    citation?: Citation;
  };
}

// Example stream
event: phase_start
data: {"type":"phase_start","phase":1,"timestamp":1706345678901}

event: agent_thought
data: {"type":"agent_thought","phase":1,"agent":{"id":"surgical-oncologist","name":"Dr. Shalya","specialty":"Surgical Oncology","color":"blue"},"content":"Evaluating resectability of T3N2M0 NSCLC...","timestamp":1706345679012}

event: agent_thought
data: {"type":"agent_thought","phase":1,"agent":{"id":"surgical-oncologist","name":"Dr. Shalya","specialty":"Surgical Oncology","color":"blue"},"content":"N2 nodal involvement is concerning for upfront surgery.","timestamp":1706345679234}
```

### 4.2 API Endpoint

```typescript
// apps/web/src/app/api/deliberate/stream/route.ts

import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const { caseData } = await request.json();
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Create deliberation orchestrator with streaming callbacks
      const orchestrator = new DeliberationOrchestrator({
        onPhaseStart: (phase) => {
          controller.enqueue(encoder.encode(
            `event: phase_start\ndata: ${JSON.stringify({ type: 'phase_start', phase, timestamp: Date.now() })}\n\n`
          ));
        },
        onAgentThought: (agent, thought) => {
          controller.enqueue(encoder.encode(
            `event: agent_thought\ndata: ${JSON.stringify({ 
              type: 'agent_thought', 
              agent: { id: agent.id, name: agent.name, specialty: agent.specialty, color: AGENT_COLORS[agent.id] },
              content: thought,
              timestamp: Date.now()
            })}\n\n`
          ));
        },
        onDebatePoint: (fromAgent, toAgent, point, agrees) => {
          controller.enqueue(encoder.encode(
            `event: debate_point\ndata: ${JSON.stringify({
              type: 'debate_point',
              from: fromAgent.id,
              to: toAgent.id,
              content: point,
              agrees,
              timestamp: Date.now()
            })}\n\n`
          ));
        },
        onCitation: (agent, citation) => {
          controller.enqueue(encoder.encode(
            `event: citation\ndata: ${JSON.stringify({
              type: 'citation',
              agent: agent.id,
              citation,
              timestamp: Date.now()
            })}\n\n`
          ));
        },
        onConsensus: (recommendation, votes) => {
          controller.enqueue(encoder.encode(
            `event: consensus\ndata: ${JSON.stringify({
              type: 'consensus',
              recommendation,
              votes,
              timestamp: Date.now()
            })}\n\n`
          ));
        },
        onComplete: (finalReport) => {
          controller.enqueue(encoder.encode(
            `event: complete\ndata: ${JSON.stringify({
              type: 'complete',
              report: finalReport,
              timestamp: Date.now()
            })}\n\n`
          ));
          controller.close();
        }
      });
      
      await orchestrator.deliberate(caseData);
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### 4.3 Frontend Component

```tsx
// apps/web/src/components/deliberation-stream.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DeliberationStreamProps {
  caseId: string;
  onComplete: (report: FinalReport) => void;
}

const AGENT_COLORS: Record<string, string> = {
  'surgical-oncologist': 'blue',
  'medical-oncologist': 'green',
  'radiation-oncologist': 'orange',
  'pathologist': 'purple',
  'radiologist': 'cyan',
  'geneticist': 'pink',
  'palliative-care': 'amber',
};

const PHASE_LABELS = [
  '',
  'Initial Assessment',
  'Adversarial Debate',
  'Guideline Grounding',
  'Consensus Building',
  'Final Recommendations',
];

export function DeliberationStream({ caseId, onComplete }: DeliberationStreamProps) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [thoughts, setThoughts] = useState<AgentThought[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!caseId) return;
    
    setIsStreaming(true);
    const eventSource = new EventSource(`/api/deliberate/stream?caseId=${caseId}`);
    
    eventSource.addEventListener('phase_start', (e) => {
      const data = JSON.parse(e.data);
      setCurrentPhase(data.phase);
    });
    
    eventSource.addEventListener('agent_thought', (e) => {
      const data = JSON.parse(e.data);
      setThoughts(prev => [...prev, {
        id: `${data.agent.id}-${data.timestamp}`,
        agent: data.agent,
        content: data.content,
        phase: currentPhase,
        timestamp: data.timestamp,
      }]);
      
      // Auto-scroll to bottom
      if (streamRef.current) {
        streamRef.current.scrollTop = streamRef.current.scrollHeight;
      }
    });
    
    eventSource.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data);
      setIsStreaming(false);
      onComplete(data.report);
      eventSource.close();
    });
    
    return () => eventSource.close();
  }, [caseId]);

  // Group thoughts by phase
  const thoughtsByPhase = thoughts.reduce((acc, thought) => {
    const phase = thought.phase || 1;
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(thought);
    return acc;
  }, {} as Record<number, AgentThought[]>);

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <span className="text-lg">🧠</span>
          Deliberation Process
        </h3>
        {isStreaming && (
          <span className="flex items-center gap-2 text-xs text-emerald-400">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Live
          </span>
        )}
      </div>
      
      {/* Stream Content */}
      <div 
        ref={streamRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        <AnimatePresence>
          {Object.entries(thoughtsByPhase).map(([phase, phaseThoughts]) => (
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* Phase Header */}
              <PhaseHeader 
                phase={Number(phase)} 
                label={PHASE_LABELS[Number(phase)]}
                isActive={currentPhase === Number(phase)}
              />
              
              {/* Agent Thoughts */}
              {phaseThoughts.map((thought) => (
                <AgentThoughtBubble
                  key={thought.id}
                  thought={thought}
                />
              ))}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Typing indicator when streaming */}
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-slate-500 text-sm"
          >
            <span className="flex gap-1">
              <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            Specialists deliberating...
          </motion.div>
        )}
      </div>
    </div>
  );
}

function PhaseHeader({ phase, label, isActive }: { phase: number; label: string; isActive: boolean }) {
  const borderColors = ['', 'border-blue-500', 'border-orange-500', 'border-green-500', 'border-purple-500', 'border-emerald-500'];
  
  return (
    <div className={`flex items-center gap-2 py-2 border-l-4 pl-3 ${borderColors[phase]} bg-slate-800/50 rounded-r`}>
      <span className="text-xs font-mono text-slate-500">PHASE {phase}</span>
      <span className="text-sm font-medium text-slate-300">{label}</span>
      {isActive && (
        <span className="ml-auto flex items-center gap-1 text-xs text-blue-400">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
          Active
        </span>
      )}
    </div>
  );
}

function AgentThoughtBubble({ thought }: { thought: AgentThought }) {
  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500/30 bg-blue-500/5',
    green: 'border-green-500/30 bg-green-500/5',
    orange: 'border-orange-500/30 bg-orange-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
    cyan: 'border-cyan-500/30 bg-cyan-500/5',
    pink: 'border-pink-500/30 bg-pink-500/5',
    amber: 'border-amber-500/30 bg-amber-500/5',
  };
  
  const textColors: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    purple: 'text-purple-400',
    cyan: 'text-cyan-400',
    pink: 'text-pink-400',
    amber: 'text-amber-400',
  };
  
  const color = thought.agent.color || 'blue';
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-lg border p-3 ${colorClasses[color]}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-sm font-medium ${textColors[color]}`}>
          {thought.agent.name}
        </span>
        <span className="text-xs text-slate-500">
          {thought.agent.specialty}
        </span>
      </div>
      <p className="text-sm text-slate-300 leading-relaxed">
        {thought.content}
      </p>
    </motion.div>
  );
}
```

### 4.4 Backend Changes to Orchestrator

```typescript
// packages/agents/src/orchestrator/streaming-orchestrator.ts

export interface StreamingCallbacks {
  onPhaseStart: (phase: number) => void;
  onAgentThought: (agent: AgentPersona, thought: string) => void;
  onDebatePoint: (from: AgentPersona, to: AgentPersona, point: string, agrees: boolean) => void;
  onCitation: (agent: AgentPersona, citation: Citation) => void;
  onConsensus: (recommendation: string, votes: Record<AgentId, boolean>) => void;
  onComplete: (report: FinalReport) => void;
}

export class StreamingDeliberationOrchestrator {
  private callbacks: StreamingCallbacks;
  
  constructor(callbacks: StreamingCallbacks) {
    this.callbacks = callbacks;
  }
  
  async deliberate(caseData: CaseData): Promise<FinalReport> {
    // Phase 1: Initial Assessment
    this.callbacks.onPhaseStart(1);
    const initialAssessments = await this.runInitialAssessment(caseData);
    
    // Phase 2: Adversarial Debate
    this.callbacks.onPhaseStart(2);
    const debateResults = await this.runAdversarialDebate(initialAssessments);
    
    // Phase 3: Guideline Grounding
    this.callbacks.onPhaseStart(3);
    const groundedResults = await this.runGuidelineGrounding(debateResults);
    
    // Phase 4: Consensus Building
    this.callbacks.onPhaseStart(4);
    const consensus = await this.buildConsensus(groundedResults);
    
    // Phase 5: Final Recommendations
    this.callbacks.onPhaseStart(5);
    const report = await this.generateFinalReport(consensus);
    
    this.callbacks.onComplete(report);
    return report;
  }
  
  private async runInitialAssessment(caseData: CaseData) {
    const agents = this.getActiveAgents(caseData);
    
    const assessments = await Promise.all(
      agents.map(async (agent) => {
        // Stream thoughts as they come from the LLM
        const response = await this.streamAgentThinking(
          agent,
          `Provide initial assessment for: ${JSON.stringify(caseData)}`,
          (thought) => this.callbacks.onAgentThought(agent, thought)
        );
        return { agent, assessment: response };
      })
    );
    
    return assessments;
  }
  
  private async streamAgentThinking(
    agent: AgentPersona,
    prompt: string,
    onThought: (thought: string) => void
  ): Promise<string> {
    // Use streaming API from Claude/Gemini
    const stream = await this.llm.streamGenerate({
      model: 'claude-sonnet-4-20250514',
      prompt,
      systemPrompt: agent.systemPrompt,
    });
    
    let fullResponse = '';
    let buffer = '';
    
    for await (const chunk of stream) {
      buffer += chunk;
      fullResponse += chunk;
      
      // Emit thoughts at sentence boundaries
      const sentences = buffer.split(/(?<=[.!?])\s+/);
      if (sentences.length > 1) {
        for (let i = 0; i < sentences.length - 1; i++) {
          if (sentences[i].trim()) {
            onThought(sentences[i].trim());
          }
        }
        buffer = sentences[sentences.length - 1];
      }
    }
    
    // Emit any remaining buffer
    if (buffer.trim()) {
      onThought(buffer.trim());
    }
    
    return fullResponse;
  }
}
```

---

## 5. UX Interactions

### 5.1 Hover States
- **Agent bubble hover**: Show full agent profile, specialization, and current guideline sources
- **Citation hover**: Preview guideline text with link to full document
- **Phase header hover**: Show phase description and expected duration

### 5.2 Click Interactions
- **Agent bubble click**: Expand to show full reasoning chain
- **Citation click**: Open guideline source in side panel
- **Debate point click**: Highlight related thoughts from other agents

### 5.3 Keyboard Shortcuts
- `Space`: Pause/resume streaming (for review)
- `↑/↓`: Navigate between thoughts
- `P`: Jump to previous phase
- `N`: Jump to next phase
- `F`: Toggle fullscreen mode

### 5.4 Accessibility
- Screen reader announcements for new phases
- High contrast mode for color-blind users (use patterns + colors)
- Keyboard navigation throughout
- Reduced motion option (disable animations)

---

## 6. Mobile Responsive Design

### 6.1 Mobile Layout (< 768px)

```
┌─────────────────────────┐
│  Virtual Tumor Board    │
├─────────────────────────┤
│  [Case Summary]         │  <- Collapsed, tap to expand
├─────────────────────────┤
│                         │
│  DELIBERATION STREAM    │
│  (Full width)           │
│                         │
│  🔵 Dr. Shalya:         │
│  "Evaluating..."        │
│                         │
│  🟢 Dr. Chitra:         │
│  "Checking NCCN..."     │
│                         │
├─────────────────────────┤
│  [View Recommendations] │  <- Sticky bottom button
└─────────────────────────┘
```

### 6.2 Tablet Layout (768px - 1024px)
- Side-by-side with 40/60 split
- Collapsible case panel

### 6.3 Desktop Layout (> 1024px)
- Full side-by-side as shown in main design
- Optional: Three-column layout with citations panel

---

## 7. Performance Considerations

### 7.1 Streaming Optimization
- Batch DOM updates every 100ms to prevent jank
- Use `requestAnimationFrame` for smooth scrolling
- Virtualize long lists (if > 100 thoughts)

### 7.2 Memory Management
- Limit stored thoughts to last 500 (archive older to IndexedDB)
- Lazy load agent avatars and icons
- Clean up event listeners on unmount

### 7.3 Network Resilience
- Automatic reconnection on connection drop
- Buffer thoughts locally during disconnection
- Show connection status indicator

---

## 8. Analytics & Telemetry

Track user engagement with deliberation visualization:

```typescript
interface DeliberationAnalytics {
  sessionId: string;
  caseId: string;
  
  // Engagement metrics
  timeSpentWatching: number;  // seconds
  pauseCount: number;
  phaseSkipCount: number;
  thoughtsExpanded: number;
  citationsClicked: number;
  
  // UX feedback
  completedWatching: boolean;  // watched to end
  scrolledManually: boolean;
  usedKeyboardShortcuts: boolean;
  
  // Technical metrics
  averageLatency: number;  // ms between server send and render
  droppedFrames: number;
  reconnectionCount: number;
}
```

---

## 9. Implementation Roadmap

### Phase 1: MVP (Week 1-2)
- [ ] Basic SSE streaming endpoint
- [ ] Simple thought bubbles with color coding
- [ ] Phase headers (no fancy animations)
- [ ] Auto-scroll to bottom

### Phase 2: Polish (Week 3)
- [ ] Framer Motion animations
- [ ] Debate visualization (connecting lines)
- [ ] Citation expansion
- [ ] Mobile responsive layout

### Phase 3: Advanced (Week 4)
- [ ] Keyboard shortcuts
- [ ] Accessibility improvements
- [ ] Analytics integration
- [ ] Performance optimization

### Phase 4: Future Enhancements
- [ ] Voice narration option
- [ ] Export deliberation as PDF/video
- [ ] Collaborative viewing (multiple users watch same deliberation)
- [ ] Historical deliberation replay

---

## 10. Open Questions

1. **Thought granularity**: Should we emit every sentence, or batch into logical units?
2. **Replay mode**: Should users be able to replay past deliberations?
3. **Intervention**: Can users pause and inject questions mid-deliberation?
4. **Privacy**: Should deliberation streams be stored or ephemeral?
5. **Speed control**: Should users be able to speed up/slow down the stream?

---

## 11. Appendix: Component Tree

```
DeliberationPage
├── CaseInputPanel
│   ├── PatientSummary
│   ├── DocumentUploader
│   └── StartDeliberationButton
│
├── DeliberationStreamPanel
│   ├── StreamHeader
│   │   ├── Title
│   │   └── LiveIndicator
│   │
│   ├── StreamContent
│   │   ├── PhaseSection (×5)
│   │   │   ├── PhaseHeader
│   │   │   └── AgentThoughtBubble (×n)
│   │   │       ├── AgentAvatar
│   │   │       ├── AgentName
│   │   │       ├── ThoughtContent
│   │   │       └── CitationBadge (optional)
│   │   │
│   │   └── TypingIndicator
│   │
│   └── StreamControls (optional)
│       ├── PauseButton
│       ├── SpeedControl
│       └── JumpToPhaseDropdown
│
└── RecommendationsPanel (appears on complete)
    ├── RecommendationSummary
    ├── DetailedPlan
    ├── Citations
    └── ExportButton
```

---

*This specification will be updated as implementation progresses.*
