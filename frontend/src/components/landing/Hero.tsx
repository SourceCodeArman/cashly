/**
 * Landing Hero Section
 */
import CTAButton from './CTAButton'

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-mesh">
      {/* Radial gradient accents */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-200 blur-3xl opacity-40" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-teal-200 blur-3xl opacity-40" />
      </div>
      <div className="container-custom py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center rounded-full border border-emerald-200/60 bg-white/60 px-3 py-1 text-sm text-emerald-700 backdrop-blur">
            Cashly • Personal finance made simple
          </div>
          <h1 className="h1 text-gray-900">
            Own your money with clarity and control
          </h1>
          <p className="mx-auto mt-6 max-w-[80%] lead">
            Connect your bank, track spending in real time, and hit your goals faster
            all in a beautiful, privacy-first dashboard.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <CTAButton />
            <a
              href="#features"
              className="rounded-xl border border-gray-200 bg-white/70 px-6 py-3 text-gray-700 shadow-sm backdrop-blur hover:bg-white"
            >
              Learn more
            </a>
          </div>
          <div className="mt-8 text-xs text-gray-500">
            Free to try. No credit card required.
          </div>
        </div>
      </div>
    </section>
  )
}


