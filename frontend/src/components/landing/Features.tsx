/**
 * Features Section
 */
export default function Features() {
  const features = [
    {
      title: 'Bank connections',
      desc: 'Securely connect your accounts to see balances and transactions in one place.',
    },
    {
      title: 'Smart categorization',
      desc: 'AI-assisted categorization helps you understand spending patterns instantly.',
    },
    {
      title: 'Budgets & goals',
      desc: 'Create actionable budgets and savings goals and track progress automatically.',
    },
    {
      title: 'Real-time insights',
      desc: 'Beautiful dashboards show cash flow, trends, and upcoming bills at a glance.',
    },
    {
      title: 'Privacy-first',
      desc: 'Your data stays encrypted. We never sell it. You control what’s shared.',
    },
    {
      title: 'Fast & delightful',
      desc: 'A crisp, modern experience with responsive UI and smooth interactions.',
    },
  ]

  return (
    <section id="features" className="py-20 md:py-24">
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Everything you need</h2>
          <p className="mt-3 text-gray-600">
            Cashly brings powerful tools together so you can master your finances without the
            complexity.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="card-glass p-6 hover-float transition"
            >
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">
                ✓
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


