import { Container } from "@/components/ui/container";

const categories = [
  "Local Business",
  "E-commerce",
  "Professional Services",
  "Healthcare",
  "SaaS",
  "Agencies",
];

export function TrustStrip() {
  return (
    <section className="border-b border-[var(--border)] py-12">
      <Container>
        <p className="eyebrow mb-6 text-center">
          Built for businesses that want their website to work harder
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {categories.map((c) => (
            <span key={c} className="font-display text-[0.95rem] text-[var(--text-faint)]">
              {c}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
