import Link from "next/link"
import { Logo } from "@/components/ui/logo"

export function Footer() {
  return (
    <footer className="container mx-auto px-4 py-12 border-t border-border relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <Logo size="sm" />
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-sm text-foreground/60">
          <Link
            href="/privacy-policy"
            className="hover:text-primary transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-of-service"
            className="hover:text-primary transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
          >
            Terms of Service
          </Link>
          <Link
            href="/contact-us"
            className="hover:text-primary transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
          >
            Contact Us
          </Link>
        </div>

        <div className="mt-4 md:mt-0 text-sm text-foreground/40">© 2024 Tildra. All rights reserved.</div>
      </div>
    </footer>
  )
}
