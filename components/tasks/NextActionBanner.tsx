import Link from "next/link";

type Props = {
  title: string;
  description: string;
  href: string;
  ctaLabel?: string;
};

export function NextActionBanner({
  title,
  description,
  href,
  ctaLabel = "Continue",
}: Props) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl border-2 border-slate-900 bg-slate-900 p-6 shadow-xl ring-1 ring-slate-950/50 sm:p-8"
      aria-labelledby="next-action-banner-title"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
          Next action
        </p>
        <h2
          id="next-action-banner-title"
          className="mt-2 text-xl font-bold text-white sm:text-2xl"
        >
          {title}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
          {description}
        </p>
        <Link
          href={href}
          className="mt-6 inline-flex min-h-11 min-w-[10rem] items-center justify-center rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
