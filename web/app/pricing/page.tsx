import { PricingSection } from "@/components/pricing/pricing-section";

export const metadata = {
  title: "Pricing - Tildra",
  description: "Choose the perfect plan for your summarization needs",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-wave-pattern opacity-10 pointer-events-none"></div>
      <main className="container mx-auto px-4 py-8 relative z-10">
        <PricingSection />
      </main>
    </div>
  );
}
