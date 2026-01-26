"use client";

import Link from "next/link";
import { 
  Brain, 
  Upload, 
  FlaskConical, 
  Shield, 
  BookOpen, 
  Mail, 
  ExternalLink,
  Users,
  FileText,
  Stethoscope,
  Microscope,
  Radiation,
  Heart,
  Dna,
  AlertTriangle,
  ChevronRight
} from "lucide-react";

// Specialist agents
const SPECIALISTS = [
  { name: "Medical Oncologist", icon: Stethoscope, guidelines: "NCCN, ESMO" },
  { name: "Surgical Oncologist", icon: Users, guidelines: "SSO, ACS" },
  { name: "Radiation Oncologist", icon: Radiation, guidelines: "ASTRO, ESTRO" },
  { name: "Pathologist", icon: Microscope, guidelines: "CAP, WHO" },
  { name: "Radiologist", icon: FileText, guidelines: "ACR, RSNA" },
  { name: "Palliative Care", icon: Heart, guidelines: "ASCO, MASCC" },
  { name: "Molecular/Genetics", icon: Dna, guidelines: "ACMG, AMP" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white">Virtual Tumor Board</h1>
                <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">AI-Powered MDT Simulation</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <a 
                href="https://inventcures.github.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors"
              >
                inventcures
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs sm:text-sm mb-6">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Open Source Research Tool
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              AI-Simulated{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Multi-Disciplinary
              </span>{" "}
              Tumor Board
            </h1>
            
            <p className="text-base sm:text-lg text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              Experience how 7 AI oncology specialists deliberate on cancer cases, 
              grounded in international clinical guidelines. Built for research, 
              education, and exploring AI in oncology.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link 
                href="/demo"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all"
              >
                <FlaskConical className="w-5 h-5" />
                Try Demo Cases
                <ChevronRight className="w-4 h-4" />
              </Link>
              
              <Link 
                href="/upload"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold border border-slate-700 hover:border-slate-600 transition-all"
              >
                <Upload className="w-5 h-5" />
                Upload Real Records
              </Link>
            </div>

            {/* Privacy note */}
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-500">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>No data stored on servers. Processing happens in your browser.</span>
            </div>
          </div>
        </div>
      </section>

      {/* What is this? */}
      <section className="py-12 sm:py-16 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              What is a Virtual Tumor Board?
            </h2>
            <p className="text-slate-400 leading-relaxed mb-6">
              A <strong className="text-white">Tumor Board</strong> (or Multi-Disciplinary Team meeting) is where 
              oncology specialists from different disciplines come together to discuss complex cancer cases and 
              agree on the best treatment plan.
            </p>
            <p className="text-slate-400 leading-relaxed">
              This tool <strong className="text-white">simulates</strong> that process using AI agents, each representing 
              a different oncology subspecialty, grounded in their respective clinical society guidelines. 
              It's designed for <strong className="text-white">research and educational exploration</strong> of how 
              AI might assist in oncology decision-making.
            </p>
          </div>
        </div>
      </section>

      {/* Specialists Grid */}
      <section className="py-12 sm:py-16 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">
            7 Specialist AI Agents
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
            {SPECIALISTS.map((specialist) => {
              const Icon = specialist.icon;
              return (
                <div 
                  key={specialist.name}
                  className="p-3 sm:p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors"
                >
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400 mb-2" />
                  <p className="text-xs sm:text-sm font-medium text-white mb-1 leading-tight">
                    {specialist.name}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500">
                    {specialist.guidelines}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Two CTAs */}
      <section className="py-12 sm:py-16 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Demo Cases */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
              <FlaskConical className="w-10 h-10 text-indigo-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Try with Demo Cases
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Explore 10 synthetic cancer cases across lung, breast, colorectal, 
                head & neck, and more. See how the AI agents deliberate and reach consensus.
              </p>
              <ul className="text-xs text-slate-500 space-y-1 mb-6">
                <li>• 10 diverse cancer types</li>
                <li>• Includes Indian clinical context (PMJAY, drug availability)</li>
                <li>• Real DICOM imaging from TCIA</li>
              </ul>
              <Link 
                href="/demo"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
              >
                Launch Demo
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Upload Records */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
              <Upload className="w-10 h-10 text-emerald-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Upload Real Records
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Upload your own cancer medical records (pathology, radiology, genomics) 
                and see what the AI tumor board suggests. 
              </p>
              <ul className="text-xs text-slate-500 space-y-1 mb-6">
                <li>• <strong className="text-emerald-400">No PII stored</strong> - processing in browser</li>
                <li>• Session auto-deletes after 24 hours</li>
                <li>• Supports PDF, JPG, PNG</li>
              </ul>
              <Link 
                href="/upload"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
              >
                Upload Records
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-12 sm:py-16 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-start gap-4">
            <BookOpen className="w-8 h-8 text-purple-400 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
                Origin Story
              </h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                In mid-2025, my aunt was diagnosed with breast cancer in India. During her staging workup, 
                an MRI revealed <em className="text-white">"age-related sclerotic changes"</em> in her 
                spine—a common, benign finding in older adults. But here's the catch: sclerotic bone 
                lesions can also indicate metastatic cancer spread. For anxious days, we didn't know if 
                her cancer was Stage II (curable) or Stage IV (metastatic). The uncertainty was agonizing.
              </p>
              <p className="text-slate-400 leading-relaxed mb-4">
                We were privileged. Through personal connections, we managed to convene an actual 
                multi-disciplinary tumor board with some of the <em className="text-white">top oncologists 
                in India</em>—surgical oncologist, medical oncologist, radiation oncologist, radiologist—all 
                reviewing her case together. They clarified that the sclerotic changes were indeed 
                age-related, not metastases. But the experience left me shaken.
              </p>
              <p className="text-slate-400 leading-relaxed mb-4">
                <strong className="text-white">Most Indian cancer patients don't have that privilege.</strong> Even 
                well-to-do families struggle to get multiple specialists in one room. For the millions 
                diagnosed each year, navigating conflicting opinions, unclear radiology reports, and 
                ambiguous findings like "incidental sclerotic changes vs. distant mets" is a lonely, 
                terrifying journey.
              </p>
              <p className="text-slate-400 leading-relaxed mb-4">
                That sparked an idea: <em className="text-white">Can I use technology and AI to scale 
                that privilege—to potentially every cancer patient?</em> Not to replace real doctors, 
                but to help patients understand what specialists typically consider, what questions to 
                ask, and how to make sense of ambiguous findings.
              </p>
              <p className="text-slate-400 leading-relaxed mb-4">
                This tool is the result—7 AI specialist agents, grounded in international guidelines, 
                simulating the nuanced deliberation of a tumor board. Built to democratize access to 
                multi-disciplinary oncology thinking.
              </p>
              <a 
                href="https://inventcures.github.io/ai-powered-virtual-mtb/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
              >
                Read more on inventcures.github.io
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-12 sm:py-16 border-t border-slate-800/50 bg-amber-500/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-start gap-4 p-4 sm:p-6 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-8 h-8 text-amber-400 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-amber-400 mb-2">
                Important Disclaimer
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-3">
                This is a <strong>research and educational tool</strong>, NOT a Clinical Decision Support System (CDSS) 
                or medical device. It is <strong>NOT a substitute</strong> for professional medical advice, diagnosis, 
                or treatment from qualified oncologists.
              </p>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• AI-generated opinions may contain errors or hallucinations</li>
                <li>• Always consult qualified oncologists for real medical decisions</li>
                <li>• Not validated for clinical use or patient care</li>
                <li>• For informational and research purposes only</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact / Deploy */}
      <section className="py-12 sm:py-16 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <Mail className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
              Interested in Piloting at Your Hospital?
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              If you're a hospital administrator, oncologist, or healthcare IT leader interested in 
              exploring AI-assisted tumor boards, I'd love to hear from you.
            </p>
            <a 
              href="mailto:spiff007@gmail.com?subject=Interested%20in%20piloting%20AI%20tumor%20board%20tool"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium border border-slate-700 hover:border-slate-600 transition-all"
            >
              <Mail className="w-5 h-5" />
              Email: spiff007@gmail.com
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-slate-400">Virtual Tumor Board</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a 
                href="https://inventcures.github.io"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                inventcures
              </a>
              <Link href="/demo" className="hover:text-white transition-colors">
                Demo
              </Link>
              <Link href="/upload" className="hover:text-white transition-colors">
                Upload
              </Link>
            </div>
            
            <p className="text-xs text-slate-600">
              Made with care in India 🇮🇳
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
