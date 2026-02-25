import { OutcomeTracker } from "@/components/OutcomeTracker";

export const metadata = {
  title: "Longitudinal Outcomes - Virtual Tumor Board",
  description: "Track patient outcomes to improve the VTB's clinical reasoning",
};

export default function OutcomesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">Longitudinal Outcome Tracker</h1>
        <p className="text-slate-400 mt-2 max-w-3xl">
          Log overall survival, progression-free survival, and toxicity events. This data creates a continuous feedback loop that the VTB uses to adapt and refine its future treatment recommendations based on real-world outcomes.
        </p>
      </div>

      <OutcomeTracker />
    </div>
  );
}