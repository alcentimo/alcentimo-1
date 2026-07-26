import { HeroInstantStoreExperience } from "@/components/landing/HeroInstantStoreExperience";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200/60 bg-[#FAFAF9] pt-28 sm:pt-32 lg:pt-36 dark:border-zinc-800/60 dark:bg-zinc-950">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.14),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.08),transparent)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[linear-gradient(to_bottom,white,transparent)] opacity-25 dark:bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] dark:opacity-15"
        aria-hidden="true"
      />

      <div className="page-container relative pb-20 sm:pb-24 lg:pb-28">
        <HeroInstantStoreExperience />
      </div>
    </section>
  );
}
