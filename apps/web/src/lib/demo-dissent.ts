/**
 * Curated specialist disagreements for the 10 demo cases.
 *
 * Each entry is a clinically real controversy for that presentation —
 * the kind an actual MDT would argue about — so every demo deliberation
 * reliably surfaces dissent in the DissentPanel and the V18 debate
 * stream. Live (non-demo) deliberations instead parse the moderator's
 * fenced `dissent-json` block (see api/deliberate/user-case/route.ts).
 *
 * Keyed by SampleCase.cancer.type (LUNG, BREAST, ...), mirroring
 * demo-citations.ts. Positions reference the 7 round-1 specialist
 * agent ids so the panel chips resolve to named clinicians.
 */

import type { DissentEntry } from "@/components/DissentPanel";

export const DEMO_DISSENT: Record<string, DissentEntry[]> = {
  LUNG: [
    {
      topic:
        "Trimodality therapy (neoadjuvant chemo-IO → surgery) vs definitive chemoradiation for resectable IIIA-N2",
      significance: "high",
      positions: [
        {
          agentId: "surgical-oncologist",
          position:
            "This is a fit 58-year-old (ECOG 1) with a technically resectable RUL primary. I would offer neoadjuvant chemoimmunotherapy (CheckMate 816 approach) followed by lobectomy if mediastinal restaging clears — trimodality gives the best local control in selected N2 patients.",
        },
        {
          agentId: "medical-oncologist",
          position:
            "Multistation N2 (4R + 7) favors definitive concurrent chemoradiation with durvalumab consolidation (PACIFIC). Trimodality in multistation N2 has never shown an overall survival benefit over chemoRT (INT 0139), and pneumonectomy-risk anatomy adds perioperative mortality.",
        },
      ],
      resolution:
        "Consensus adopted definitive chemoRT + durvalumab given multistation N2. Surgical dissent recorded: revisit resection only if restaging after induction shows single-station downstaging and the patient strongly prefers surgery.",
    },
    {
      topic: "Timing of brain MRI relative to treatment start",
      significance: "moderate",
      positions: [
        {
          agentId: "radiologist",
          position:
            "Brain MRI is missing from the staging workup. 10–15% of Stage III NSCLC harbor occult brain metastases — starting curative-intent chemoRT without it risks futile toxicity.",
        },
        {
          agentId: "radiation-oncologist",
          position:
            "Agree it is needed, but LINAC slot wait times mean simulation should proceed in parallel; delaying the RT start date for MRI scheduling at a government center could cost 2–3 weeks.",
        },
      ],
      resolution:
        "Brain MRI (or contrast CT brain if MRI unavailable) mandated before the first fraction, but CT simulation and planning proceed in parallel so no treatment delay is incurred.",
    },
  ],

  BREAST: [
    {
      topic: "Neoadjuvant TCHP vs upfront surgery for cT2N0 HER2+ disease",
      significance: "high",
      positions: [
        {
          agentId: "medical-oncologist",
          position:
            "Neoadjuvant TCHP is preferred for HER2+ tumors ≥2 cm: pCR assessment lets us escalate to T-DM1 if residual disease remains (KATHERINE), which we forfeit by operating first.",
        },
        {
          agentId: "surgical-oncologist",
          position:
            "With a clinically node-negative 2.5 cm tumor and a patient prioritizing fertility timelines, upfront breast-conserving surgery with sentinel node biopsy is defensible and gives definitive pathology before committing to a year of anti-HER2 therapy.",
        },
      ],
      resolution:
        "Neoadjuvant TCHP adopted — the response-adapted escalation option outweighs the benefit of upfront pathology. Fertility preservation completed before cycle 1.",
    },
    {
      topic: "Delay for fertility preservation before chemotherapy",
      significance: "moderate",
      positions: [
        {
          agentId: "palliative-care",
          position:
            "A 42-year-old premenopausal woman must be offered oocyte/embryo cryopreservation before gonadotoxic chemotherapy; random-start stimulation takes ~2 weeks and is a quality-of-life priority.",
        },
        {
          agentId: "medical-oncologist",
          position:
            "Ki-67 of 35% signals a proliferative tumor — every week of delay matters. If the fertility clinic cannot start immediately, ovarian suppression with GnRH agonist during chemotherapy is the pragmatic fallback.",
        },
      ],
      resolution:
        "Urgent fertility referral with random-start stimulation capped at 2 weeks; GnRH agonist co-administered during chemotherapy regardless.",
    },
  ],

  COLORECTAL: [
    {
      topic:
        "Upfront liver resection vs neoadjuvant immunotherapy for MSI-H oligometastatic disease",
      significance: "high",
      positions: [
        {
          agentId: "surgical-oncologist",
          position:
            "Three resectable liver metastases with the largest at 3.2 cm is a clear window for curative-intent hepatectomy plus primary resection. Windows of resectability close; operate while we can.",
        },
        {
          agentId: "medical-oncologist",
          position:
            "MSI-H tumors show dramatic responses to checkpoint blockade (KEYNOTE-177; NICHE-2 neoadjuvant data). Immunotherapy first could convert this to a lesser operation — or even sustained complete response — and treats micrometastatic disease immediately.",
        },
      ],
      resolution:
        "Neoadjuvant pembrolizumab for 3–4 cycles with early cross-sectional reassessment; surgery scheduled at first sign of non-response so the resectability window is protected.",
    },
    {
      topic: "Adequacy of staging before committing to hepatectomy",
      significance: "moderate",
      positions: [
        {
          agentId: "radiologist",
          position:
            "CT undercounts small liver lesions; liver-protocol MRI with hepatocyte-specific contrast should precede any surgical decision — finding a fourth lesion changes the plan.",
        },
        {
          agentId: "surgical-oncologist",
          position:
            "PET-CT plus triphasic CT is sufficient in most centers here; adding MRI delays decision-making by weeks in this healthcare setting and rarely changes management when three lesions are already confirmed.",
        },
      ],
      resolution:
        "Liver MRI ordered given it directly informs the immunotherapy-response assessment baseline; scheduled within the first pembrolizumab cycle to avoid delay.",
    },
  ],

  HEAD_NECK: [
    {
      topic:
        "Upfront composite resection vs induction chemotherapy for T4a buccal SCC with mandibular invasion",
      significance: "high",
      positions: [
        {
          agentId: "surgical-oncologist",
          position:
            "T4a oral cavity disease is primarily surgical: composite resection with segmental mandibulectomy and free-flap reconstruction now. Induction chemotherapy risks progression to unresectability and does not improve survival in operable oral cavity cancer.",
        },
        {
          agentId: "medical-oncologist",
          position:
            "The soft-tissue extent here is borderline for clear margins. Two cycles of induction (TPF) can shrink the tumor to improve the R0 rate — Indian centers routinely use this for borderline-resectable buccal primaries.",
        },
      ],
      resolution:
        "Upfront surgery adopted — imaging review judged the disease resectable with clear margins, and delay was deemed the greater risk. Induction reserved only if the flap team's assessment changes at exam under anesthesia.",
    },
    {
      topic: "Adjuvant radiation alone vs concurrent chemoradiation",
      significance: "moderate",
      positions: [
        {
          agentId: "radiation-oncologist",
          position:
            "Commit to PORT now; add concurrent cisplatin only if final pathology shows extranodal extension or positive margins (the two Category 1 indications from EORTC 22931/RTOG 9501).",
        },
        {
          agentId: "medical-oncologist",
          position:
            "With N2b nodal burden and an HPV-negative tobacco-driven tumor, I would plan for concurrent chemoRT upfront — this biology recurs locoregionally and pathology frequently upstages.",
        },
      ],
      resolution:
        "Decision deferred to final histopathology per guideline indications; weekly cisplatin logistics pre-arranged so no delay occurs if ENE or positive margins are found.",
    },
  ],

  CERVIX: [
    {
      topic: "Adding pembrolizumab to definitive chemoradiation (KEYNOTE-A18)",
      significance: "high",
      positions: [
        {
          agentId: "medical-oncologist",
          position:
            "FIGO IIIB node-positive disease with CPS 15 is exactly the KEYNOTE-A18 population where pembrolizumab plus CRT improved progression-free survival; we should offer it.",
        },
        {
          agentId: "palliative-care",
          position:
            "Pembrolizumab costs ₹3–4 lakh per cycle and is not covered by her RSBY insurance. The financial toxicity for this family could be catastrophic for an incremental PFS benefit — standard cisplatin-CRT plus brachytherapy remains curative-intent.",
        },
      ],
      resolution:
        "Standard cisplatin-CRT with brachytherapy adopted; patient counseled transparently about pembrolizumab evidence, with patient-assistance-program application initiated in parallel rather than delaying treatment.",
    },
    {
      topic: "Extended-field RT to cover para-aortic nodes",
      significance: "moderate",
      positions: [
        {
          agentId: "radiation-oncologist",
          position:
            "With confirmed pelvic nodal disease, prophylactic extended-field coverage of the para-aortic chain should be considered — occult PA involvement runs 15–20% in this setting.",
        },
        {
          agentId: "radiologist",
          position:
            "PET-CT shows no para-aortic uptake. Extending the field adds duodenal and marrow toxicity in an anemic patient (Hb 9.2) for nodes we cannot demonstrate; treat the pelvis and surveil.",
        },
      ],
      resolution:
        "Pelvic-field CRT with tight PA surveillance imaging at 3 months; anemia corrected to Hb ≥10 before RT start as both specialists required.",
    },
  ],

  PROSTATE: [
    {
      topic: "PARP inhibitor vs taxane chemotherapy as next line in BRCA2+ mCRPC",
      significance: "high",
      positions: [
        {
          agentId: "geneticist",
          position:
            "Germline BRCA2 is the strongest predictive biomarker in prostate cancer — olaparib doubled rPFS over ARSI switch in PROfound Cohort A. An oral agent also suits an ECOG 2 patient with cardiac comorbidity.",
        },
        {
          agentId: "medical-oncologist",
          position:
            "Rapid progression on enzalutamide with a PSA of 245 suggests aggressive biology where docetaxel gives faster cytoreduction and symptom control; PARP inhibition can follow chemotherapy.",
        },
      ],
      resolution:
        "Olaparib selected given the germline BRCA2 alteration, ECOG 2, and cardiac history; docetaxel held in reserve with a 12-week PSA/imaging checkpoint to trigger the switch early if response is inadequate.",
    },
    {
      topic: "Radium-223 timing for symptomatic bone-only disease",
      significance: "moderate",
      positions: [
        {
          agentId: "radiation-oncologist",
          position:
            "Bone-only metastatic disease with pain is the ALSYMPCA population — radium-223 improves survival and skeletal-event rates and should not be left until the patient is too frail to receive all 6 cycles.",
        },
        {
          agentId: "medical-oncologist",
          position:
            "Sequencing radium-223 now blocks concurrent PARP therapy and consumes marrow reserve we may need for later chemotherapy. External-beam RT to the dominant painful site controls symptoms without those costs.",
        },
      ],
      resolution:
        "Palliative EBRT to the dominant pain site now; radium-223 positioned as the dedicated bone-directed line after olaparib, with zoledronic acid and calcium/vitamin D started immediately for his osteoporosis.",
    },
  ],

  GASTRIC: [
    {
      topic: "Perioperative FLOT vs surgery-first for T4a disease",
      significance: "high",
      positions: [
        {
          agentId: "medical-oncologist",
          position:
            "Perioperative FLOT is the standard for ≥cT2 resectable gastric cancer (FLOT4: median OS 50 vs 35 months over ECF). Four pre-op cycles treat micrometastatic disease this T4a tumor has almost certainly seeded.",
        },
        {
          agentId: "surgical-oncologist",
          position:
            "An antral T4a lesion threatens outlet obstruction — three months of chemotherapy risks presenting back to me with an emergency, unresectable situation and a malnourished patient. Resect first, give adjuvant therapy after.",
        },
      ],
      resolution:
        "Perioperative FLOT adopted with a firm safeguard: endoscopic/dietetic review before each cycle, and immediate crossover to surgery at the first sign of obstruction or non-response. Feeding jejunostomy considered at staging laparoscopy.",
    },
    {
      topic: "Adding nivolumab to perioperative therapy at PD-L1 CPS 8",
      significance: "moderate",
      positions: [
        {
          agentId: "medical-oncologist",
          position:
            "CPS ≥5 predicted benefit in CheckMate-649, and perioperative immunotherapy trials (MATTERHORN) are reading out positively — offering nivolumab with FLOT is defensible now.",
        },
        {
          agentId: "pathologist",
          position:
            "CheckMate-649 is a metastatic dataset; in the curative perioperative setting the OS data are immature, and this MSS, EBV-negative, CPS 8 tumor sits in the modest-benefit zone. Off-protocol use adds cost without proven cure-rate gain.",
        },
      ],
      resolution:
        "Standard perioperative FLOT without nivolumab; clinical-trial screening for perioperative immunotherapy offered as the route to access it with equipoise.",
    },
  ],

  OVARIAN: [
    {
      topic: "Primary debulking surgery vs neoadjuvant chemotherapy for IIIC HGSOC",
      significance: "high",
      positions: [
        {
          agentId: "surgical-oncologist",
          position:
            "In a fit ECOG 1 patient, primary debulking to R0 remains the strongest prognostic intervention in ovarian cancer. Laparoscopic assessment (Fagotti score) says operate first if complete cytoreduction is achievable.",
        },
        {
          agentId: "medical-oncologist",
          position:
            "CA-125 of 1,250 with bilateral disease and nodal involvement predicts high tumor burden; BRCA1-mutant HGSOC is exquisitely platinum-sensitive, so 3 cycles of NACT followed by interval debulking achieves R0 more often with less morbidity (CHORUS/EORTC 55971).",
        },
      ],
      resolution:
        "Diagnostic laparoscopy with Fagotti scoring to arbitrate: PDS if predictive of R0, otherwise NACT-IDS. Both specialists endorsed making surgery-extent the deciding variable rather than ideology.",
    },
    {
      topic: "Maintenance: olaparib alone vs olaparib plus bevacizumab",
      significance: "moderate",
      positions: [
        {
          agentId: "geneticist",
          position:
            "Germline BRCA1 with HRD score 52 gets the full SOLO-1 benefit from olaparib monotherapy (7-year OS advantage); adding bevacizumab brings hypertension/proteinuria risk without clear incremental benefit in BRCA-mutant disease.",
        },
        {
          agentId: "medical-oncologist",
          position:
            "PAOLA-1's combination arm performed best in exactly this HRD-positive population, and bulky IIIC disease with ascites is where bevacizumab adds disease control during the maintenance window.",
        },
      ],
      resolution:
        "Olaparib monotherapy maintenance chosen — BRCA1-mutant biology, cost (bevacizumab not covered), and toxicity profile all favored it. Bevacizumab reserved for the platinum-sensitive relapse setting.",
    },
  ],

  ESOPHAGEAL: [
    {
      topic: "Neoadjuvant CROSS chemoradiation vs perioperative FLOT",
      significance: "high",
      positions: [
        {
          agentId: "radiation-oncologist",
          position:
            "CROSS (41.4 Gy + carboplatin/paclitaxel) is the established standard for resectable esophageal adenocarcinoma with a decade of survival follow-up and excellent tolerability in a 62-year-old.",
        },
        {
          agentId: "medical-oncologist",
          position:
            "ESOPEC (2024) showed perioperative FLOT beat CROSS on overall survival for esophageal adenocarcinoma — for a Siewert I GEJ tumor behaving like gastric-type disease, FLOT should now be preferred.",
        },
      ],
      resolution:
        "FLOT adopted as primary plan given the adenocarcinoma histology and ESOPEC data, with CROSS as the fallback if the patient cannot tolerate 4-drug chemotherapy. Adjuvant nivolumab (CheckMate 577) applies only if the CRT pathway is used and residual disease remains.",
    },
    {
      topic: "Transthoracic (Ivor Lewis) vs transhiatal esophagectomy",
      significance: "moderate",
      positions: [
        {
          agentId: "surgical-oncologist",
          position:
            "Siewert I demands an Ivor Lewis transthoracic approach with two-field lymphadenectomy — nodal yield ≥15 and mediastinal clearance are compromised by the transhiatal route.",
        },
        {
          agentId: "palliative-care",
          position:
            "Transthoracic surgery carries roughly double the pulmonary morbidity. In a patient with reflux-scarred lungs and a long recovery runway, the perioperative quality-of-life cost deserves explicit weight, not just nodal counts.",
        },
      ],
      resolution:
        "Minimally invasive Ivor Lewis at a high-volume center, with prehabilitation (respiratory physiotherapy, nutrition) mandated for 4 weeks pre-op to directly address the morbidity concern.",
    },
  ],

  BRAIN: [
    {
      topic:
        "Maximal safe resection vs function-first conservative surgery in a 12-year-old",
      significance: "high",
      positions: [
        {
          agentId: "surgical-oncologist",
          position:
            "Extent of resection is the strongest modifiable prognostic factor in high-grade glioma. With 8 mm midline shift and mass effect, I recommend awake-assisted maximal safe resection with intraoperative mapping — feasible in a cooperative 12-year-old at experienced centers.",
        },
        {
          agentId: "palliative-care",
          position:
            "He already has right-sided weakness and personality change from a dominant-hemisphere tumor. An aggressive resection that leaves a child hemiplegic or aphasic trades months of survival for the quality of the time he has — neurocognitive preservation must set the resection boundary.",
        },
      ],
      resolution:
        "Maximal safe resection with intraoperative neuromonitoring and pre-mapped functional boundaries agreed as hard stop lines; the family was counseled on the explicit trade-off and consented to function-sparing limits.",
    },
    {
      topic: "Standard Stupp protocol vs trial-directed therapy for H3 G34-mutant, MGMT-unmethylated disease",
      significance: "moderate",
      positions: [
        {
          agentId: "medical-oncologist",
          position:
            "Radiotherapy with concurrent and adjuvant temozolomide remains the default backbone for hemispheric pediatric high-grade glioma; abandoning it for investigational agents without trial infrastructure risks undertreatment.",
        },
        {
          agentId: "geneticist",
          position:
            "MGMT is unmethylated, so temozolomide benefit is marginal — and note ONC201 targets H3 K27M, not G34R, so it does not apply here. The PDGFRA amplification is the actionable lever; this child belongs on a targeted-therapy trial (e.g., avapritinib pediatric studies) alongside RT.",
        },
      ],
      resolution:
        "Focal RT proceeds per pediatric dosing with temozolomide, while simultaneous trial screening for PDGFRA-directed agents runs at AIIMS/Tata Memorial; therapy switches to trial protocol if a slot opens before adjuvant phase.",
    },
  ],
};

export function getDemoDissent(cancerType: string): DissentEntry[] {
  return DEMO_DISSENT[cancerType] ?? [];
}
