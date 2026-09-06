import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MapPin,
  SlidersHorizontal,
  Sparkles,
  MessagesSquare,
  FileText,
  Wallet,
} from 'lucide-react';
import { Card } from '@/components/shared/Card';

export const metadata: Metadata = {
  title: 'About — KelanaAI',
  description:
    'How KelanaAI turns a destination, a budget and a travel style into a day-by-day itinerary, and how its travel assistant stays grounded in real documents.',
};

const STEPS = [
  {
    icon: MapPin,
    title: 'Pick a destination',
    body: 'Drop a pin anywhere on the map. KelanaAI resolves it to a city and country, so you can plan somewhere you cannot yet spell.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Set the shape of the trip',
    body: 'Length, total budget, the month you are travelling, your style, and who you are travelling with. Those last two genuinely change the plan — a family trip is paced differently from a solo one.',
  },
  {
    icon: Sparkles,
    title: 'Get a day-by-day itinerary',
    body: 'Each day comes back with a theme and a filled morning, afternoon and evening: named places, rough costs, and how long to allow. Afternoons pair a cultural site with something hands-on; evenings pair dinner with somewhere to go after.',
  },
  {
    icon: Wallet,
    title: 'See where the money goes',
    body: 'A budget breakdown across accommodation, food, transport, activities and extras, plus practical guidance on reaching the city and getting around once you are there.',
  },
];

export default function AboutPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="flex flex-col gap-4">
        <span
          className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-white"
          style={{ background: 'var(--brand-gradient)' }}
        >
          <Sparkles size={14} aria-hidden="true" />
          About KelanaAI
        </span>
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">
          Travel planning that does the tedious part
        </h1>
        <p className="text-lg leading-relaxed text-brand-muted">
          Planning a trip means turning a vague idea — a city, a rough budget, a
          fortnight in October — into an actual schedule. KelanaAI does that
          first draft for you, then answers the awkward follow-up questions that
          usually send you to a dozen browser tabs.
        </p>
      </header>

      <h2 className="mt-12 font-display text-2xl font-bold tracking-tight text-brand-ink">
        How planning works
      </h2>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {STEPS.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="flex flex-col gap-2">
            <Icon size={20} style={{ color: 'var(--brand-primary)' }} aria-hidden="true" />
            <p className="font-semibold text-brand-ink">{title}</p>
            <p className="text-sm leading-relaxed text-brand-muted">{body}</p>
          </Card>
        ))}
      </div>

      <h2 className="mt-12 font-display text-2xl font-bold tracking-tight text-brand-ink">
        The assistant answers from documents, not from memory
      </h2>
      <div className="mt-5 flex flex-col gap-4">
        <Card className="flex flex-col gap-2">
          <MessagesSquare size={20} style={{ color: 'var(--brand-primary)' }} aria-hidden="true" />
          <p className="font-semibold text-brand-ink">Ask the awkward questions</p>
          <p className="text-sm leading-relaxed text-brand-muted">
            Visa paperwork, customs allowances, how to pay abroad without
            carrying cash, what a week actually costs. The assistant keeps the
            thread, so you can ask a follow-up without repeating yourself.
          </p>
        </Card>
        <Card className="flex flex-col gap-2">
          <FileText size={20} style={{ color: 'var(--brand-primary)' }} aria-hidden="true" />
          <p className="font-semibold text-brand-ink">Every answer shows its sources</p>
          <p className="text-sm leading-relaxed text-brand-muted">
            Rather than trusting the model&apos;s recollection, each question first
            searches a curated library of travel documents — official visa
            checklists, customs and payment guides, city guides — and the answer
            is written from the passages it finds. Those passages are shown
            underneath, so you can check the claim yourself. When the library
            does not cover something, the assistant says so instead of guessing.
          </p>
        </Card>
      </div>

      <h2 className="mt-12 font-display text-2xl font-bold tracking-tight text-brand-ink">
        A note on what it is
      </h2>
      <p className="mt-3 leading-relaxed text-brand-muted">
        KelanaAI writes a strong first draft, not a booking. Prices, opening
        hours and entry rules shift, and the assistant is only as current as the
        documents behind it — check anything time-sensitive before you commit
        money to it.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          style={{ background: 'var(--brand-gradient)' }}
        >
          Plan a trip
        </Link>
        <Link
          href="/assistant"
          className="inline-flex items-center gap-2 rounded-full border-2 border-brand-primary px-5 py-2.5 text-sm font-semibold text-brand-primary transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
        >
          Ask the assistant
        </Link>
      </div>
    </section>
  );
}
