import { PricingPreview } from "@/components/landing/pricing-preview";
import { Header } from "@/components/shared/header";

export const metadata = {
  title: "Pricing - Tildra",
  description: "Choose the perfect plan for your summarization needs",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-wave-pattern opacity-10 pointer-events-none"></div>
      <Header />
      <main className="container mx-auto px-4 py-8 relative z-10">
        <PricingPreview />
      </main>
    </div>
  );
}
