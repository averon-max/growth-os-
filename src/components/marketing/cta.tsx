import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="border-b border-[var(--border)] py-28">
      <Container className="text-center">
        <h2 className="font-display text-[2.1rem] font-semibold tracking-tight md:text-[2.6rem]">
          Your website should never stop improving.
        </h2>
        <p className="mx-auto mt-4 max-w-[480px] text-[1rem] text-[var(--text-dim)]">
          Connect your website and discover your highest-value opportunities.
        </p>
        <div className="mt-8">
          <Button href="/signup" size="md" className="px-7">Start Free</Button>
        </div>
      </Container>
    </section>
  );
}
