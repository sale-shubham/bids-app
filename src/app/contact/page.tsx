import type { Metadata } from 'next';
import { PublicPage } from '@/components/layout/public-page';
import { ContactForm } from '@/features/contact/contact-form';

export const metadata: Metadata = {
  title: 'Contact NobleBid',
  description: 'Questions about bidding, selling or your account? Send the NobleBid team a message.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <PublicPage className="max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Contact us</h1>
        <p className="text-muted-foreground">Questions about bidding, selling or your account? Send us a message and we will get back to you by email.</p>
      </header>
      <ContactForm />
    </PublicPage>
  );
}
