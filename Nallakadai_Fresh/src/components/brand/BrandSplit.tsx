import logo from "@/assets/logo.jpg.asset.json";
import heroVillage from "@/assets/hero-village.jpg";
import heroStore from "@/assets/hero-store.jpg";

export function BrandFooter({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const cls = tone === "dark" ? "text-primary-foreground/75" : "text-muted-foreground";
  return (
    <footer className={`px-4 py-4 text-center text-xs leading-relaxed ${cls}`}>
      <p>
        Powered by{" "}
        <a
          href="https://www.nallakadai.in"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          www.nallakadai.in
        </a>
      </p>
      <p className="mt-1">
        <span aria-hidden="true">🌾 🐄 🪔 🥭 🌱</span>
        <span className="mx-2">Made in India — With love from Erode</span>
        <span aria-hidden="true">🧡</span>
      </p>
    </footer>
  );
}

/**
 * Split brand layout: 3/4 illustrated natural panel on the left,
 * 1/4 sign-in panel on the right. Stacks on mobile.
 */
export function BrandSplit({
  variant = "village",
  eyebrow,
  headline,
  tamil,
  children,
}: {
  variant?: "village" | "store";
  eyebrow?: string;
  headline: string;
  tamil?: string;
  children: React.ReactNode;
}) {
  const art = variant === "store" ? heroStore : heroVillage;
  return (
    <div className="flex min-h-screen flex-col bg-primary lg:flex-row">
      {/* Illustration side — 3/4 */}
      <section className="relative flex min-h-[38vh] flex-col justify-end overflow-hidden bg-[hsl(40_45%_94%)] lg:min-h-screen lg:w-3/4">
        <img
          src={art}
          alt="Traditional Tamil farm and village life illustration"
          width={1280}
          height={1600}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/25 to-transparent" />
        <div className="relative p-6 lg:p-12">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-primary p-2 shadow-lg">
              <img
                src={logo.url}
                alt="Nalla Kadai logo"
                className="h-16 w-auto object-contain lg:h-20"
              />
            </div>
            <div className="text-primary-foreground">
              <div className="text-xl leading-tight lg:text-2xl">Fresh Nalla Kadai</div>
              <div className="ta text-sm text-primary-foreground/80">நல்ல கடை</div>
            </div>
          </div>
          {eyebrow && (
            <p className="mt-6 text-xs uppercase tracking-[0.35em] text-primary-foreground/70">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-2 max-w-xl text-3xl text-primary-foreground lg:text-5xl">{headline}</h1>
          {tamil && <p className="ta mt-2 text-base text-primary-foreground/85">{tamil}</p>}
        </div>
      </section>

      {/* Sign-in side — 1/4 */}
      <section className="flex flex-1 flex-col bg-primary lg:w-1/4">
        <div className="flex flex-1 items-center justify-center px-5 py-8">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <BrandFooter />
      </section>
    </div>
  );
}
