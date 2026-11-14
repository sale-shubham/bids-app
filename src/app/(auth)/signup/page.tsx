import Link from 'next/link';

// Phase 1 will add the real signup: name, email, password, role (Bidder /
// Auctioneer) and an email OTP verification step.
export default function SignupPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signup (name, email, password, role and email verification) arrives in Phase 1.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
