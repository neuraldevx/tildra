import { ContactForm } from "@/components/contact/contact-form"
import Link from "next/link"
import { ArrowLeft, MessageCircle, Mail, Clock, MapPin, Phone } from "lucide-react"

export const metadata = {
  title: "Contact Us - Tildra",
  description: "Get in touch with the Tildra team for support, feedback, or inquiries",
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-transparent py-16 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Link href="/" className="inline-flex items-center text-sm text-foreground/60 hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-foreground">Contact Us</h1>
                <p className="text-foreground/70">We'd love to hear from you</p>
              </div>
            </div>
            
            <p className="text-lg text-foreground/80 max-w-2xl">
              Whether you have questions, feedback, or need support, don't hesitate to reach out. 
              Our team is here to help you get the most out of Tildra.
            </p>
          </div>
        </div>
      </div>

      {/* Contact Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Information */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
                  <p className="text-foreground/70 mb-6">
                    We typically respond within 24 hours during business days.
                  </p>
                </div>

                {/* Contact Methods */}
                <div className="space-y-4">
                  <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">Email Support</h3>
                        <p className="text-sm text-foreground/60">
                          <a href="mailto:support@tildra.xyz" className="text-primary hover:underline">
                            support@tildra.xyz
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">Response Time</h3>
                        <p className="text-sm text-foreground/60">Within 24 hours</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">Service Coverage</h3>
                        <p className="text-sm text-foreground/60">Global</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FAQ Section */}
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    Quick Help
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium mb-1">Need help with summarization?</p>
                      <p className="text-foreground/70">
                        Try our{" "}
                        <Link href="/summarizer" className="text-primary hover:underline">
                          summarizer tool
                        </Link>{" "}
                        or check common questions in our support docs.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Account or billing issues?</p>
                      <p className="text-foreground/70">
                        Visit your{" "}
                        <Link href="/dashboard" className="text-primary hover:underline">
                          dashboard
                        </Link>{" "}
                        to manage your account settings.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <ContactForm />
            </div>
          </div>

          {/* Additional Help Section */}
          <div className="mt-16 pt-8 border-t">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold mb-4">Other Ways to Get Help</h2>
              <p className="text-foreground/70 max-w-2xl mx-auto">
                Looking for specific information? These resources might help you find what you need.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card border rounded-lg p-6 text-center">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Privacy Policy</h3>
                <p className="text-sm text-foreground/70 mb-4">
                  Learn how we protect and handle your data
                </p>
                <Link href="/privacy-policy" className="text-primary hover:underline text-sm">
                  Read Privacy Policy →
                </Link>
              </div>

              <div className="bg-card border rounded-lg p-6 text-center">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Terms of Service</h3>
                <p className="text-sm text-foreground/70 mb-4">
                  Review our terms and conditions
                </p>
                <Link href="/terms-of-service" className="text-primary hover:underline text-sm">
                  Read Terms →
                </Link>
              </div>

              <div className="bg-card border rounded-lg p-6 text-center">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Try Tildra</h3>
                <p className="text-sm text-foreground/70 mb-4">
                  Experience our AI-powered summarization
                </p>
                <Link href="/summarizer" className="text-primary hover:underline text-sm">
                  Try Now →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
