import { ContactForm } from "@/components/contact/contact-form"
import { Logo } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export const metadata = {
  title: "Contact Us - Tildra",
  description: "Get in touch with the Tildra team for support, feedback, or inquiries",
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-wave-pattern opacity-10 pointer-events-none"></div>

      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Logo size="sm" animated={true} href="/" />
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-foreground">Contact Us</h1>
          <p className="text-foreground/70 mb-8">
            We&apos;d love to hear from you! Whether you have questions, feedback, or need support, don&apos;t hesitate to reach out. Fill out the form below and we'll
            get back to you as soon as possible.
          </p>

          <ContactForm />
        </div>
      </main>
    </div>
  )
}
