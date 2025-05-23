import { Summarizer } from "@/components/dashboard/summarizer"

export default function SummarizerPage() {
  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 bg-wave-pattern opacity-10 pointer-events-none"></div>
      <main className="px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-foreground">Article Summarizer</h1>
          <Summarizer />
        </div>
      </main>
    </div>
  )
}
