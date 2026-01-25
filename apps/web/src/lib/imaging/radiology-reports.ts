/**
 * Radiology Reports for Sample Cases
 * AI-generated structured radiology reports
 */

export interface RadiologistReport {
  caseId: string;
  studyType: string;
  technique: string;
  comparison: string;
  findings: {
    primaryLesion: string;
    lymphNodes: string;
    metastases: string;
    incidental: string;
  };
  measurements: Array<{
    label: string;
    value: string;
    slice: number;
    location: string;
  }>;
  impression: string[];
  recommendations: string[];
  reporter: string;
  signedAt: string;
}

export const RADIOLOGY_REPORTS: Record<string, RadiologistReport> = {
  "lung-nsclc-kras-g12c": {
    caseId: "lung-nsclc-kras-g12c",
    studyType: "CT Chest with IV Contrast",
    technique: "Helical CT of the chest was performed from thoracic inlet to adrenal glands following IV administration of 100mL Omnipaque 350. 3mm axial images reconstructed with soft tissue and lung algorithms.",
    comparison: "Prior CT dated 3 months ago",
    findings: {
      primaryLesion: "A 4.2 x 3.8 x 4.0 cm spiculated mass is identified in the right upper lobe, abutting the oblique fissure. The mass demonstrates heterogeneous enhancement with central areas of low attenuation suggesting necrosis. There is broad pleural contact without definite chest wall invasion. The mass encases the right upper lobe bronchus with near-complete occlusion.",
      lymphNodes: "Right hilar lymphadenopathy with a 2.1 x 1.9 cm node (station 10R). Subcarinal lymph node measures 1.8 cm in short axis (station 7). Right paratracheal node measures 1.2 cm (station 4R). Left hilum is unremarkable.",
      metastases: "No definite hepatic or adrenal lesions identified. No suspicious bone lesions. No pleural effusion or nodules. Brain not included in this study.",
      incidental: "Mild emphysematous changes bilaterally, predominantly upper lobe distribution. Coronary artery calcifications noted. Small hiatal hernia. Thyroid appears normal.",
    },
    measurements: [
      { label: "RUL Mass (primary)", value: "4.2 x 3.8 x 4.0 cm", slice: 45, location: "Right upper lobe" },
      { label: "Right hilar node", value: "2.1 x 1.9 cm", slice: 52, location: "Station 10R" },
      { label: "Subcarinal node", value: "1.8 cm (short axis)", slice: 58, location: "Station 7" },
      { label: "Right paratracheal", value: "1.2 cm", slice: 38, location: "Station 4R" },
    ],
    impression: [
      "Right upper lobe mass measuring 4.2 cm consistent with primary lung malignancy, with imaging features suggestive of adenocarcinoma.",
      "Ipsilateral hilar and mediastinal lymphadenopathy suspicious for nodal metastases (N2 disease).",
      "No evidence of distant metastatic disease on this study.",
      "Clinical staging: at least cT2bN2M0, Stage IIIA.",
    ],
    recommendations: [
      "PET-CT for complete metabolic staging",
      "Tissue biopsy if not yet obtained for histological confirmation and molecular testing",
      "Brain MRI to complete staging workup",
      "Pulmonary function tests prior to treatment planning",
    ],
    reporter: "Dr. Chitran (AI Radiologist)",
    signedAt: "2026-01-25T10:30:00Z",
  },

  "breast-her2-positive": {
    caseId: "breast-her2-positive",
    studyType: "Mammogram and Breast MRI",
    technique: "Bilateral digital mammography with tomosynthesis. Contrast-enhanced breast MRI with kinetic analysis.",
    comparison: "Screening mammogram dated 1 year ago",
    findings: {
      primaryLesion: "A 2.8 cm irregular mass with spiculated margins is identified in the upper outer quadrant of the left breast at 10 o'clock position, 6 cm from nipple. On MRI, the mass demonstrates rapid initial enhancement with washout kinetics (Type III curve). Associated architectural distortion and skin thickening noted.",
      lymphNodes: "Two morphologically abnormal left axillary lymph nodes with cortical thickening measuring 1.5 cm and 1.2 cm. Right axilla unremarkable.",
      metastases: "No evidence of chest wall invasion. Contralateral breast shows scattered fibroglandular tissue without suspicious findings.",
      incidental: "Benign-appearing intramammary lymph node in right breast. No significant background parenchymal enhancement.",
    },
    measurements: [
      { label: "Left breast mass", value: "2.8 x 2.4 x 2.6 cm", slice: 42, location: "Left UOQ, 10 o'clock" },
      { label: "Axillary node 1", value: "1.5 cm", slice: 35, location: "Left axilla Level I" },
      { label: "Axillary node 2", value: "1.2 cm", slice: 38, location: "Left axilla Level I" },
    ],
    impression: [
      "Left breast mass highly suspicious for malignancy (BI-RADS 5).",
      "Suspicious left axillary lymphadenopathy, likely nodal involvement.",
      "Clinical staging suggests at least cT2N1.",
    ],
    recommendations: [
      "Core needle biopsy of breast mass for histology and receptor testing",
      "Axillary lymph node fine needle aspiration or core biopsy",
      "Consider staging CT chest/abdomen/pelvis if high-grade or extensive nodal disease confirmed",
    ],
    reporter: "Dr. Chitran (AI Radiologist)",
    signedAt: "2026-01-25T11:15:00Z",
  },

  "colorectal-msi-h": {
    caseId: "colorectal-msi-h",
    studyType: "CT Abdomen/Pelvis with IV Contrast",
    technique: "Helical CT from diaphragm to symphysis pubis with IV contrast. Oral contrast administered 60 minutes prior.",
    comparison: "CT colonography 6 months ago",
    findings: {
      primaryLesion: "Circumferential wall thickening of the sigmoid colon over a 6 cm segment with luminal narrowing. Maximum wall thickness 1.8 cm. Associated pericolonic fat stranding without definite extramural extension.",
      lymphNodes: "Multiple enlarged mesenteric lymph nodes, largest measuring 1.4 cm. No retroperitoneal lymphadenopathy.",
      metastases: "Three hypodense hepatic lesions: Segment VI (2.3 cm), Segment VII (1.8 cm), Segment IVa (1.2 cm). Enhancement pattern consistent with metastases. No other sites of distant disease.",
      incidental: "Gallstones without cholecystitis. Mild splenomegaly. Simple renal cysts bilaterally.",
    },
    measurements: [
      { label: "Sigmoid tumor length", value: "6.0 cm", slice: 65, location: "Sigmoid colon" },
      { label: "Max wall thickness", value: "1.8 cm", slice: 68, location: "Sigmoid colon" },
      { label: "Liver met (Seg VI)", value: "2.3 cm", slice: 28, location: "Hepatic segment VI" },
      { label: "Liver met (Seg VII)", value: "1.8 cm", slice: 25, location: "Hepatic segment VII" },
      { label: "Liver met (Seg IVa)", value: "1.2 cm", slice: 22, location: "Hepatic segment IVa" },
    ],
    impression: [
      "Sigmoid colon adenocarcinoma with circumferential involvement over 6 cm.",
      "Mesenteric lymphadenopathy suspicious for nodal metastases.",
      "Three hepatic metastases involving segments VI, VII, and IVa.",
      "Stage IV disease (cT3N+M1a - liver only).",
    ],
    recommendations: [
      "Colonoscopy with biopsy for tissue diagnosis and MMR/MSI testing",
      "PET-CT to evaluate for additional sites of disease",
      "Hepatobiliary surgery consultation for resectability assessment",
      "Consider liver MRI with hepatobiliary contrast for complete lesion characterization",
    ],
    reporter: "Dr. Chitran (AI Radiologist)",
    signedAt: "2026-01-25T12:00:00Z",
  },

  "head-neck-oral-hpv-neg": {
    caseId: "head-neck-oral-hpv-neg",
    studyType: "CT Neck with IV Contrast",
    technique: "Helical CT of the neck from skull base to thoracic inlet with IV contrast. 2mm axial images with coronal and sagittal reformats.",
    comparison: "None available",
    findings: {
      primaryLesion: "A 3.5 x 3.2 x 2.8 cm heterogeneously enhancing mass arising from the right lateral tongue, crossing midline. Invasion of the floor of mouth musculature and extrinsic tongue muscles noted. No definite mandibular invasion on CT, though cortical irregularity at the right mandibular body warrants further evaluation.",
      lymphNodes: "Right level IB node measuring 2.4 cm with central necrosis. Right level II node 1.8 cm. Left level II node 1.2 cm, likely reactive.",
      metastases: "No retropharyngeal lymphadenopathy. No distant metastases identified in visualized thorax. Lung apices clear.",
      incidental: "Mild cervical degenerative changes. Thyroid appears normal.",
    },
    measurements: [
      { label: "Tongue mass", value: "3.5 x 3.2 x 2.8 cm", slice: 55, location: "Right lateral tongue" },
      { label: "Right Level IB node", value: "2.4 cm", slice: 48, location: "Right submandibular" },
      { label: "Right Level II node", value: "1.8 cm", slice: 45, location: "Right upper jugular" },
    ],
    impression: [
      "Right lateral tongue squamous cell carcinoma with floor of mouth invasion and midline extension.",
      "Bilateral cervical lymphadenopathy, right level IB and II nodes concerning for metastatic involvement.",
      "Cortical irregularity of right mandible - recommend dedicated CT or MRI for bone assessment.",
      "Clinical staging: cT4aN2b.",
    ],
    recommendations: [
      "MRI with gadolinium for better soft tissue delineation and perineural spread assessment",
      "Dental evaluation and panorex",
      "PET-CT for complete staging",
      "ENT/Head & Neck surgery consultation",
    ],
    reporter: "Dr. Chitran (AI Radiologist)",
    signedAt: "2026-01-25T13:30:00Z",
  },

  "cervical-stage-iiib": {
    caseId: "cervical-stage-iiib",
    studyType: "MRI Pelvis with IV Contrast",
    technique: "MRI pelvis with T1, T2, DWI sequences and post-gadolinium imaging. CT chest/abdomen for staging.",
    comparison: "Ultrasound pelvis 2 weeks ago",
    findings: {
      primaryLesion: "A 5.2 x 4.8 cm cervical mass with high T2 signal and restricted diffusion, extending to the lower uterine segment superiorly and the upper vagina inferiorly. Bilateral parametrial invasion present extending to the pelvic sidewall on the left. Left hydronephrosis with proximal ureteric dilatation consistent with ureteric involvement.",
      lymphNodes: "Bilateral external iliac lymphadenopathy: left 1.6 cm, right 1.2 cm. Left common iliac node 1.4 cm. Para-aortic region clear.",
      metastases: "No peritoneal disease. Liver and lungs unremarkable on staging CT.",
      incidental: "Small amount of free fluid in pelvis, likely reactive. Nabothian cysts in cervix.",
    },
    measurements: [
      { label: "Cervical mass", value: "5.2 x 4.8 cm", slice: 42, location: "Cervix" },
      { label: "Left external iliac", value: "1.6 cm", slice: 38, location: "Left pelvis" },
      { label: "Right external iliac", value: "1.2 cm", slice: 40, location: "Right pelvis" },
      { label: "Left common iliac", value: "1.4 cm", slice: 32, location: "Left retroperitoneum" },
    ],
    impression: [
      "Locally advanced cervical carcinoma with bilateral parametrial extension to pelvic sidewall on left.",
      "Left hydroureteronephrosis indicating ureteric involvement.",
      "Bilateral pelvic lymphadenopathy.",
      "FIGO Stage IIIB (pelvic sidewall involvement with hydronephrosis).",
    ],
    recommendations: [
      "PET-CT for complete metabolic staging including para-aortic nodes",
      "Nephrostomy placement for left hydronephrosis if symptomatic or renal function declining",
      "Radiation oncology consultation for definitive chemoradiation planning",
    ],
    reporter: "Dr. Chitran (AI Radiologist)",
    signedAt: "2026-01-25T14:00:00Z",
  },

  "prostate-mcrpc-brca2": {
    caseId: "prostate-mcrpc-brca2",
    studyType: "PSMA PET-CT",
    technique: "Whole-body PET-CT 60 minutes after IV administration of 8 mCi Ga-68 PSMA-11.",
    comparison: "PSMA PET-CT 6 months ago",
    findings: {
      primaryLesion: "Intense PSMA uptake in the prostate with SUVmax 28.4, increased from prior (SUVmax 18.2). Extracapsular extension into left seminal vesicle.",
      lymphNodes: "Multiple PSMA-avid pelvic and retroperitoneal lymph nodes: largest left external iliac 2.2 cm (SUVmax 24.1), para-aortic 1.8 cm (SUVmax 19.3). New right common iliac node 1.4 cm.",
      metastases: "Multiple new osseous metastases demonstrating intense PSMA uptake: L2 vertebra (SUVmax 32.1), right iliac bone, left 6th rib. Previously noted T10 lesion shows progression.",
      incidental: "Moderate bilateral hydronephrosis, unchanged. Prostatic enlargement with median lobe.",
    },
    measurements: [
      { label: "Prostate SUVmax", value: "28.4", slice: 68, location: "Prostate" },
      { label: "L2 vertebra SUVmax", value: "32.1", slice: 45, location: "Lumbar spine" },
      { label: "Left external iliac", value: "2.2 cm (SUVmax 24.1)", slice: 58, location: "Pelvis" },
      { label: "Para-aortic node", value: "1.8 cm (SUVmax 19.3)", slice: 42, location: "Retroperitoneum" },
    ],
    impression: [
      "Progressive metastatic castration-resistant prostate cancer.",
      "Multiple new and progressive osseous metastases.",
      "Progressive nodal disease in pelvis and retroperitoneum.",
      "Local progression with seminal vesicle invasion.",
    ],
    recommendations: [
      "Correlate with PSA kinetics",
      "Consider change in systemic therapy - BRCA2+ status may warrant PARP inhibitor",
      "Radiation oncology consultation for palliative RT to symptomatic bone lesions",
      "Bone health optimization with denosumab or zoledronic acid",
    ],
    reporter: "Dr. Chitran (AI Radiologist)",
    signedAt: "2026-01-25T15:00:00Z",
  },

  "gastric-stage-iii": {
    caseId: "gastric-stage-iii",
    studyType: "CT Abdomen with IV Contrast + EUS",
    technique: "Multiphasic CT abdomen. Endoscopic ultrasound with fine needle aspiration.",
    comparison: "Upper GI endoscopy 1 week ago",
    findings: {
      primaryLesion: "Marked circumferential wall thickening of the gastric antrum and pylorus measuring up to 2.8 cm in wall thickness over a 7 cm length. Tumor extends to involve the first part of duodenum. Loss of normal fat plane with pancreatic head raises concern for T4 disease.",
      lymphNodes: "Multiple perigastric lymph nodes along lesser and greater curvature. Enlarged celiac axis node 1.6 cm. Portahepatic node 1.3 cm.",
      metastases: "No hepatic metastases. No ascites or peritoneal nodules. Small volume peritoneal disease cannot be excluded.",
      incidental: "Mild fatty liver. Previous cholecystectomy.",
    },
    measurements: [
      { label: "Antral wall thickness", value: "2.8 cm", slice: 55, location: "Gastric antrum" },
      { label: "Tumor length", value: "7.0 cm", slice: 52, location: "Antrum to D1" },
      { label: "Celiac node", value: "1.6 cm", slice: 42, location: "Celiac axis" },
      { label: "Portahepatic node", value: "1.3 cm", slice: 45, location: "Porta hepatis" },
    ],
    impression: [
      "Locally advanced gastric adenocarcinoma involving antrum and pylorus with duodenal extension.",
      "Possible pancreatic invasion (T4b) - needs operative assessment.",
      "Perigastric and celiac lymphadenopathy indicating N3 disease.",
      "Clinical staging: cT4N3M0 (Stage IIIC) pending laparoscopic staging.",
    ],
    recommendations: [
      "Diagnostic laparoscopy with peritoneal washings to rule out occult peritoneal disease",
      "PET-CT for complete metabolic staging",
      "Nutritional assessment and optimization",
      "Multidisciplinary discussion for neoadjuvant chemotherapy vs upfront surgery",
    ],
    reporter: "Dr. Chitran (AI Radiologist)",
    signedAt: "2026-01-25T16:00:00Z",
  },

  "ovarian-brca1-hgsoc": {
    caseId: "ovarian-brca1-hgsoc",
    studyType: "CT Abdomen/Pelvis with IV Contrast",
    technique: "Helical CT from diaphragm to pubic symphysis with IV contrast.",
    comparison: "Pelvic ultrasound 3 weeks ago",
    findings: {
      primaryLesion: "Large complex cystic and solid left adnexal mass measuring 8.2 x 7.5 x 9.0 cm with thick irregular septations, solid papillary projections, and heterogeneous enhancement. Normal left ovary not separately visualized. Right ovary appears normal.",
      lymphNodes: "Left external iliac lymph node 1.4 cm. Para-aortic nodes at renal hilum level measure up to 1.2 cm.",
      metastases: "Peritoneal carcinomatosis with omental caking (4 cm thickness). Multiple peritoneal implants along paracolic gutters and pelvic peritoneum. Moderate ascites. Subdiaphragmatic nodule on right measuring 1.5 cm. Lung bases clear.",
      incidental: "Small bilateral pleural effusions, likely reactive. CA-125: 1842 U/mL (provided clinically).",
    },
    measurements: [
      { label: "Left adnexal mass", value: "8.2 x 7.5 x 9.0 cm", slice: 52, location: "Left adnexa" },
      { label: "Omental cake", value: "4.0 cm thickness", slice: 38, location: "Greater omentum" },
      { label: "Subdiaphragmatic nodule", value: "1.5 cm", slice: 18, location: "Right subdiaphragmatic" },
      { label: "Ascites", value: "Moderate", slice: 45, location: "Abdomen/pelvis" },
    ],
    impression: [
      "Left adnexal mass highly suspicious for ovarian malignancy.",
      "Peritoneal carcinomatosis with omental caking consistent with Stage IIIC/IV disease.",
      "Moderate ascites.",
      "Subdiaphragmatic disease - FIGO Stage IVA.",
    ],
    recommendations: [
      "Diagnostic paracentesis for cytology",
      "Gynecologic oncology consultation",
      "Consider neoadjuvant chemotherapy given extent of disease",
      "Germline BRCA testing if not already performed",
    ],
    reporter: "Dr. Chitran (AI Radiologist)",
    signedAt: "2026-01-25T17:00:00Z",
  },

  "esophageal-neoadjuvant": {
    caseId: "esophageal-neoadjuvant",
    studyType: "CT Chest/Abdomen + EUS",
    technique: "CT from thoracic inlet to iliac crests with IV contrast. Endoscopic ultrasound with staging.",
    comparison: "Initial staging PET-CT 2 months ago",
    findings: {
      primaryLesion: "Eccentric wall thickening of distal esophagus and GE junction measuring up to 1.8 cm wall thickness over 5 cm length. Maximum external tumor diameter 3.2 cm. Tumor extends 2 cm into gastric cardia. EUS shows T3 invasion into adventitia.",
      lymphNodes: "Paraesophageal lymph node at level of tumor measuring 1.2 cm. Gastrohepatic ligament node 0.9 cm. Celiac axis clear. No supraclavicular adenopathy.",
      metastases: "No hepatic metastases. No pulmonary nodules. No ascites. Adrenal glands normal.",
      incidental: "Small sliding hiatal hernia. Mild atherosclerotic disease of the aorta.",
    },
    measurements: [
      { label: "Tumor wall thickness", value: "1.8 cm", slice: 62, location: "Distal esophagus/GEJ" },
      { label: "Tumor length", value: "5.0 cm", slice: 60, location: "Distal esophagus to cardia" },
      { label: "Paraesophageal node", value: "1.2 cm", slice: 58, location: "Paraesophageal" },
      { label: "External tumor diameter", value: "3.2 cm", slice: 62, location: "GE junction" },
    ],
    impression: [
      "Distal esophageal/GE junction adenocarcinoma, Siewert Type II.",
      "EUS staging: uT3N1, no evidence of distant metastases.",
      "Clinical staging: cT3N1M0, Stage IIIA - candidate for neoadjuvant chemoradiation.",
    ],
    recommendations: [
      "PET-CT for metabolic baseline prior to neoadjuvant therapy",
      "Nutritional assessment - consider feeding jejunostomy",
      "Multidisciplinary discussion for neoadjuvant protocol (CROSS or FLOT)",
      "Cardiac clearance for surgery",
    ],
    reporter: "Dr. Chitran (AI Radiologist)",
    signedAt: "2026-01-25T18:00:00Z",
  },

  "pancreatic-borderline": {
    caseId: "pancreatic-borderline",
    studyType: "CT Abdomen Pancreas Protocol",
    technique: "Triphasic pancreatic protocol CT with arterial, pancreatic, and portal venous phases. 1mm thin sections through pancreas.",
    comparison: "None available",
    findings: {
      primaryLesion: "A 3.5 x 3.2 cm hypodense mass in the pancreatic body with involvement of the splenic artery over 180 degrees (but <270 degrees). The mass abuts the celiac axis without encasement. The SMV/portal vein confluence shows short segment narrowing without occlusion. Main pancreatic duct dilated to 6mm upstream with parenchymal atrophy.",
      lymphNodes: "Peripancreatic lymph nodes up to 1.0 cm, indeterminate. No celiac or para-aortic lymphadenopathy.",
      metastases: "No hepatic lesions. No ascites. No peritoneal nodules. Lung bases clear.",
      incidental: "Cholelithiasis. Splenic vein appears patent. Small volume peripancreatic fat stranding.",
    },
    measurements: [
      { label: "Pancreatic mass", value: "3.5 x 3.2 cm", slice: 48, location: "Pancreatic body" },
      { label: "Splenic artery involvement", value: "180 degrees", slice: 46, location: "Splenic artery" },
      { label: "MPD dilation", value: "6 mm", slice: 52, location: "Pancreatic body/tail" },
      { label: "SMV-PV narrowing", value: "Short segment", slice: 50, location: "SMV-PV confluence" },
    ],
    impression: [
      "Pancreatic body adenocarcinoma with borderline resectable features.",
      "Splenic artery involvement (>180 degrees) without celiac encasement.",
      "SMV-portal vein abutment with focal narrowing - likely resectable with vein reconstruction.",
      "No evidence of distant metastatic disease.",
    ],
    recommendations: [
      "EUS with FNA for tissue diagnosis if not yet obtained",
      "Staging laparoscopy to rule out occult peritoneal disease",
      "Multidisciplinary pancreatic tumor board review",
      "Consider neoadjuvant therapy (FOLFIRINOX or gemcitabine-based) prior to surgery",
      "CA 19-9 level for baseline",
    ],
    reporter: "Dr. Chitran (AI Radiologist)",
    signedAt: "2026-01-25T19:00:00Z",
  },

  // Case 10: Pediatric GBM - Brain MRI
  "pediatric-gbm-brain": {
    caseId: "pediatric-gbm-brain",
    studyType: "MRI Brain with and without IV Contrast",
    technique: "Multiplanar, multisequence MRI of the brain including T1, T2, FLAIR, DWI, ADC, SWI, and post-gadolinium T1-weighted sequences. 3D volumetric acquisition for surgical planning.",
    comparison: "None available - new diagnosis",
    findings: {
      primaryLesion: "Large heterogeneous mass centered in the left frontoparietal region measuring 5.2 x 4.8 x 4.5 cm. The mass demonstrates peripheral irregular ring enhancement with central non-enhancing necrotic component. Marked surrounding T2/FLAIR hyperintense vasogenic edema extending into the left frontal and parietal white matter. The lesion exerts significant mass effect with 8mm rightward midline shift at the level of the septum pellucidum. Compression of the left lateral ventricle with early signs of obstructive hydrocephalus.",
      lymphNodes: "Not applicable for CNS imaging.",
      metastases: "No evidence of leptomeningeal enhancement to suggest CSF dissemination. No additional intraparenchymal lesions identified. Complete spine imaging recommended to rule out drop metastases.",
      incidental: "No prior intracranial hemorrhage. Normal major intracranial vessels on MRA sequences. No dural venous sinus thrombosis.",
    },
    measurements: [
      { label: "Tumor maximum diameter", value: "5.2 cm", slice: 55, location: "Left frontoparietal" },
      { label: "Necrotic core", value: "2.8 x 2.5 cm", slice: 55, location: "Central tumor" },
      { label: "Midline shift", value: "8 mm", slice: 50, location: "Septum pellucidum" },
      { label: "Edema extent", value: "Extends 2cm beyond tumor", slice: 52, location: "Left hemisphere white matter" },
      { label: "Enhancing rim thickness", value: "0.8-1.2 cm", slice: 55, location: "Tumor periphery" },
    ],
    impression: [
      "Large left frontoparietal high-grade glioma with imaging features highly suggestive of glioblastoma (WHO Grade 4).",
      "Ring enhancement with central necrosis - classic GBM appearance.",
      "Significant mass effect with 8mm midline shift - concerning for impending herniation.",
      "Extensive peritumoral edema consistent with aggressive biology.",
      "No evidence of CSF dissemination on current study, though spinal MRI recommended.",
    ],
    recommendations: [
      "Urgent neurosurgical consultation for mass effect management and surgical planning",
      "Consider dexamethasone for cerebral edema reduction",
      "MRI spine with contrast to complete neuroaxis staging",
      "Perfusion MRI and MR spectroscopy for surgical planning if time permits",
      "Pediatric neuro-oncology tumor board discussion",
      "Neuropsychological baseline assessment pre-treatment",
    ],
    reporter: "Dr. Chitran (AI Neuroradiologist)",
    signedAt: "2026-01-25T20:00:00Z",
  },
};

/**
 * Get radiology report for a case
 */
export function getRadiologyReport(caseId: string): RadiologistReport | null {
  return RADIOLOGY_REPORTS[caseId] || null;
}

/**
 * Generate a placeholder report for cases without specific data
 */
export function generatePlaceholderReport(caseId: string, cancerType: string): RadiologistReport {
  return {
    caseId,
    studyType: "CT with IV Contrast",
    technique: "Helical CT with IV contrast administration. Standard imaging protocol.",
    comparison: "No prior imaging available for comparison.",
    findings: {
      primaryLesion: `Primary lesion identified consistent with ${cancerType}. Further characterization pending detailed review.`,
      lymphNodes: "Regional lymph nodes require assessment. No definite pathological adenopathy on initial review.",
      metastases: "No obvious distant metastatic disease on initial review. Complete staging recommended.",
      incidental: "No significant incidental findings.",
    },
    measurements: [
      { label: "Primary lesion", value: "Measurement pending", slice: 50, location: "Primary site" },
    ],
    impression: [
      `Findings consistent with ${cancerType}.`,
      "Complete staging workup recommended.",
      "Tissue diagnosis required for definitive characterization.",
    ],
    recommendations: [
      "Biopsy for histological confirmation",
      "Complete staging imaging as appropriate",
      "Multidisciplinary tumor board discussion",
    ],
    reporter: "Dr. Chitran (AI Radiologist)",
    signedAt: new Date().toISOString(),
  };
}
