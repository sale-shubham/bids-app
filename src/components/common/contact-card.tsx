import { Mail, Phone, User } from 'lucide-react';

export interface Contact {
  name: string;
  email: string;
  phone: string;
}

/** A counterparty's name, email and phone with mailto / tel links. */
export function ContactCard({ title, contact }: { title: string; contact: Contact }) {
  return (
    <div className="space-y-2 rounded-lg border bg-background p-3 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="inline-flex items-center gap-2 font-medium">
        <User className="h-4 w-4 text-muted-foreground" aria-hidden /> {contact.name}
      </p>
      <p>
        <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 text-primary hover:underline">
          <Mail className="h-4 w-4" aria-hidden /> {contact.email}
        </a>
      </p>
      <p>
        <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-2 text-primary hover:underline">
          <Phone className="h-4 w-4" aria-hidden /> {contact.phone}
        </a>
      </p>
    </div>
  );
}
