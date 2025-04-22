import { SignIn } from '@clerk/nextjs'

export default function Page() {
  // Render the Clerk Sign In component
  // path="/sign-in" is the default, so often not needed explicitly
  // routing="path" is also the default
  return <SignIn />
} 