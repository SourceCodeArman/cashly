import { LayoutDashboard, Target, Bell, Settings, Landmark, CreditCard, Wallet, Building2, ShieldCheck, Lock, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, useScroll, useSpring } from 'framer-motion'
import { useMemo } from 'react'
import { LandingNavbar } from '@/components/landing/LandingNavbar'
import { LandingFooter } from '@/components/landing/LandingFooter'

export function Landing() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#1A1A1A] font-sans selection:bg-[#E3E8D3] selection:text-[#1A1A1A] overflow-x-hidden w-full">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-[#1A1A1A] z-50 origin-[0%]"
        style={{ scaleX }}
      />

      <LandingNavbar />
      <Hero />
      <FeaturesGrid />
      <BigPicture />
      <WhyChoose />
      <TrustSection />
      <Steps />
      <Connect />
      <LandingFooter />
    </div>
  )
}
// Removed local Navbar component


function Hero() {
  return (
    <section className="pt-32 pb-20 w-full md:pt-48 md:pb-32 relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-serif tracking-tight mb-8 leading-[0.9]">
            Take Control of <br />
            <span className="relative inline-block px-4 mx-2">
              <span className="italic relative z-10 text-[#1A1A1A]">Your Finances.</span>
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-[#1A1A1A]/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Automated tracking, Gemini AI-powered intelligence, and goal-oriented savings for professionals who want to master their money.
          </p>

          <div className="max-w-4xl mx-auto mt-20 relative">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative aspect-[16/10] bg-[#1A1A1A] rounded-[2rem] p-3 shadow-2xl"
            >
              <div className="absolute inset-0 bg-[#E3E8D3]/10 rounded-[2rem] pointer-events-none" />
              <SimulatedDashboard />
            </motion.div>
          </div>
        </motion.div>

        {/* Brand Bar */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 opacity-60 max-w-4xl mx-auto">
          {/* Placeholders for partner logos if needed, or remove */}
        </div>
      </div>
    </section>
  )
}

function SimulatedDashboard() {
  return (
    <div className="w-full h-full bg-[#0A0A0A] rounded-[1.5rem] p-6 md:p-10 flex flex-col relative overflow-hidden border border-white/5">
      {/* Abstract Header */}
      <div className="flex justify-between items-center mb-12 opacity-20">
        <div className="flex gap-4 items-center">
          <div className="h-8 w-8 rounded-full bg-white" />
          <div className="h-3 w-24 rounded-full bg-white" />
        </div>
        <div className="h-8 w-8 rounded-full bg-white" />
      </div>

      {/* Main Metric */}
      <div className="mb-auto z-10">
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          whileInView={{ width: "auto", opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          <div className="text-4xl md:text-6xl font-serif text-white mb-2 tracking-tight">
            $12,450<span className="text-[#E3E8D3]">.00</span>
          </div>
        </motion.div>
        <div className="h-4 w-32 rounded-full bg-[#333]" />
      </div>

      {/* Animated Graph */}
      <div className="relative h-48 w-full z-10">
        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="grid-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E3E8D3" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#E3E8D3" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area under curve */}
          <motion.path
            d="M0 100 L0 60 Q 25 70, 50 40 T 100 20 L 100 100 Z"
            fill="url(#grid-gradient)"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            viewport={{ once: true }}
          />

          {/* Line */}
          <motion.path
            d="M0 60 Q 25 70, 50 40 T 100 20"
            fill="none"
            stroke="#E3E8D3"
            strokeWidth="2" // Scaled relative to viewBox, roughly
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            viewport={{ once: true }}
          />

          {/* Dots on line */}
          <motion.circle cx="50" cy="40" r="1.5" fill="#E3E8D3"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ delay: 1 }}
            viewport={{ once: true }}
          />
          <motion.circle cx="100" cy="20" r="1.5" fill="#E3E8D3"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ delay: 1.8 }}
            viewport={{ once: true }}
          />
        </svg>
      </div>

      {/* Background Dots Animation */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full bg-blend-overlay"
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
              opacity: Math.random()
            }}
            animate={{
              y: [null, Math.random() * 100 + "%"],
              opacity: [null, Math.random(), null]
            }}
            transition={{
              duration: 10 + Math.random() * 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>
    </div>
  )
}

function FeaturesGrid() {
  const features = [
    {
      icon: Target,
      label: "Smart Savings",
      title: "Smart Savings Goals",
      desc: "Create specific goals for emergency funds, vacations, or debt payoff. We calculate the monthly contributions for you."
    },
    {
      icon: LayoutDashboard,
      label: "Overview",
      title: "Automatic Tracking",
      desc: "Connect your bank accounts and credit cards to see all your transactions in one place. No manual entry required."
    },
    {
      icon: Bell,
      label: "Intelligence",
      title: "AI-Driven Spending Insights",
      desc: "Visualize spending trends, identify bad habits, and get personalized recommendations to reduce expenses."
    },
    {
      icon: Settings,
      label: "Control",
      title: "Gemini AI Categorization",
      desc: "Powered by Google Gemini AI to automatically categorize your transactions with unmatched accuracy."
    }
  ]

  return (
    <section className="py-24 w-full">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-20 md:text-center max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-serif mb-6">We've cracked the code.</h2>
          <p className="text-lg text-[#1A1A1A]/60">
            Financial clarity shouldn't be complicated. We use advanced AI to do the heavy lifting for you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="p-8 rounded-[2rem] bg-[#FDFCF8] border border-[#1A1A1A]/5 hover:shadow-xl transition-all duration-300"
            >
              <div className="w-12 h-12 bg-[#1A1A1A] text-white rounded-2xl flex items-center justify-center mb-6">
                <f.icon strokeWidth={1.5} />
              </div>
              <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-3">{f.label}</div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-sm opacity-60 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function BigPicture() {
  return (
    <section className="py-32 w-full">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-20 items-center">
        <div className="order-2 lg:order-1">
          <div className="aspect-[4/5] rounded-[2rem] bg-[#111] relative overflow-hidden p-10 flex items-center justify-center">
            <SimulatedNetwork />
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <h2 className="text-5xl md:text-7xl font-serif mb-8 leading-[0.9]">See the <br /><span className="italic text-[#3A4D39]">Big Picture.</span></h2>
          <p className="text-xl opacity-60 mb-12 leading-relaxed">
            Stop guessing where your money went. Cashly gives you a crystal-clear view of your financial health, empowered by next-gen AI.
          </p>

          <div className="space-y-8">
            {[
              "Real-time net worth tracking",
              "Investment portfolio integration",
              "Predictive cash flow analysis"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-[#3A4D39]" />
                <span className="text-lg font-medium">{item}</span>
              </div>
            ))}
          </div>

          <Button size="lg" className="mt-12 rounded-full px-8 bg-[#1A1A1A] hover:bg-[#1A1A1A]/80">
            Explore Features
          </Button>
        </div>
      </div>
    </section>
  )
}

function SimulatedNetwork() {
  const nodes = [
    { icon: Landmark, angle: 0, delay: 0 },
    { icon: CreditCard, angle: 72, delay: 0.2 },
    { icon: Wallet, angle: 144, delay: 0.4 },
    { icon: Building2, angle: 216, delay: 0.6 },
    { icon: Landmark, angle: 288, delay: 0.8 },
  ]

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      {/* Central Hub (Cashly) */}
      <motion.div
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        transition={{ type: "spring", duration: 1.5 }}
        viewport={{ once: true }}
        className="w-32 h-32 rounded-full bg-[#1A1A1A] border-4 border-[#222] flex flex-col items-center justify-center z-20 shadow-2xl relative"
      >
        <div className="text-2xl font-serif font-bold text-white tracking-tight">Cashly</div>
        <div className="text-[10px] uppercase tracking-widest text-[#E3E8D3] mt-1 opacity-80">Central</div>

        {/* Pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-full border border-[#E3E8D3]/30"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </motion.div>

      {/* Satellite Nodes (Banks) */}
      {nodes.map((node, i) => {
        const angleRad = (node.angle - 90) * (Math.PI / 180)
        const x = 50 + 35 * Math.cos(angleRad)
        const y = 50 + 35 * Math.sin(angleRad)

        return (
          <div key={i} className="absolute inset-0 pointer-events-none">
            {/* Connecting Line */}
            <svg className="absolute inset-0 w-full h-full overflow-visible">
              <motion.line
                x1="50%" y1="50%"
                x2={`${x}%`} y2={`${y}%`}
                stroke="#E3E8D3"
                strokeWidth="2"
                strokeOpacity="0.1"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: node.delay }}
                viewport={{ once: true }}
              />
            </svg>

            {/* Flowing Data Particle */}
            <motion.div
              className="absolute w-1.5 h-1.5 bg-[#E3E8D3] rounded-full z-10 -translate-x-1/2 -translate-y-1/2"
              initial={{ left: `${x}%`, top: `${y}%`, opacity: 0 }}
              animate={{
                left: [`${x}%`, "50%"],
                top: [`${y}%`, "50%"],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
                delay: node.delay
              }}
            />

            {/* Satellite Icon */}
            <motion.div
              className="absolute w-16 h-16 rounded-2xl bg-white border border-[#1A1A1A]/10 flex items-center justify-center shadow-lg z-20"
              style={{ left: `${x}%`, top: `${y}%`, marginLeft: '-32px', marginTop: '-32px' }}
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ delay: node.delay, type: "spring" }}
              viewport={{ once: true }}
            >
              <node.icon className="w-6 h-6 text-[#1A1A1A]" strokeWidth={1.5} />
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}

function WhyChoose() {
  const tableData = [
    { label: "Automatic Tracking", us: "Included", them: "Manual" },
    { label: "Gemini AI Categorization", us: "Included", them: "Basic Rules" },
    { label: "Security", us: "Bank-Level", them: "Standard" },
    { label: "Real-time Sync", us: "Instant", them: "Delayed" },
    { label: "Support", us: "Priority", them: "Email only" },
  ]

  return (
    <section className="py-32 w-full px-10 bg-[#F5F5F0]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-20">
          <span className="text-sm font-bold uppercase tracking-widest opacity-40">Comparisons</span>
          <h2 className="text-5xl md:text-6xl font-serif mt-4">Why Choose Cashly?</h2>
          <p className="mt-6 text-lg opacity-60 max-w-lg mx-auto">
            See how we compare to traditional spreadsheet budgeting and other apps.
          </p>
          <div className="mt-8">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#E3E8D3] text-sm font-medium">
              New Standard
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#1A1A1A]/5 overflow-hidden">
          <div className="grid grid-cols-3 p-6 border-b border-[#1A1A1A]/5 bg-[#FAFAFA] text-sm font-bold uppercase tracking-wider opacity-60">
            <div>Feature</div>
            <div className="text-center text-[#1A1A1A] opacity-100">Cashly</div>
            <div className="text-right">Others</div>
          </div>
          {tableData.map((row, i) => (
            <div key={i} className="grid grid-cols-3 p-6 border-b border-[#1A1A1A]/5 last:border-0 hover:bg-[#FDFCF8] transition-colors">
              <div className="font-medium opacity-70">{row.label}</div>
              <div className="text-center font-bold font-serif">{row.us}</div>
              <div className="text-right opacity-50">{row.them}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TrustSection() {
  const items = [
    {
      icon: Lock,
      title: "Bank-Grade Encryption",
      desc: "Your financial data is encrypted with AES-256 standards. We use the same security protocols as the world's largest banks."
    },
    {
      icon: ShieldCheck,
      title: "Privacy First",
      desc: "We never sell your data. Your financial habits are your business, and our business is helping you optimize them."
    },
    {
      icon: Activity,
      title: "99.9% Uptime",
      desc: "Financial clarity whenever you need it. Our redundant infrastructure ensures Cashly is always ready."
    }
  ]

  return (
    <section className="py-32 w-full">
      <div className="max-w-[1400px] mx-auto">
        <div className="text-center mb-24 max-w-2xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-serif mb-6">Built on Trust.</h2>
          <p className="text-xl opacity-60">
            Security isn't a feature; it's our foundation. We protect your wealth with industry-leading standards.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-[#FAFAFA] border border-[#1A1A1A]/5 p-8 md:p-12 rounded-[2rem] hover:shadow-xl transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#E3E8D3] flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors duration-300">
                <item.icon className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
              <p className="text-[#1A1A1A]/60 leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Steps() {
  return (
    <section className="py-32 w-full bg-white">
      <div className="max-w-[1400px] mx-auto flex flex-col items-center">
        <div className="flex flex-col items-center text-center mb-20">
          <h2 className="text-5xl md:text-7xl font-serif mb-6">Map Your Success</h2>
          <Button
            className="rounded-full border border-[#1A1A1A] bg-transparent text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white px-8 h-12 text-lg transition-colors duration-300"
          >
            Start Mapping
          </Button>
        </div>

        <div className="flex items-center justify-between border-t border-[#1A1A1A]/10 pt-12 w-full">
          {[
            { num: "01", title: "Connect", desc: "Securely link your bank accounts and credit cards." },
            { num: "02", title: "Analyze", desc: "Our AI automatically categorizes your transactions and identifies trends." },
            { num: "03", title: "Achieve", desc: "Set goals and let Cashly guide you to financial freedom." },
          ].map((step, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="text-6xl font-serif opacity-10 mb-6 group-hover:opacity-100 group-hover:text-[#E3E8D3] transition-all duration-500">{step.num}</div>
              <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
              <p className="text-[#1A1A1A]/60 leading-relaxed max-w-xs">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-24 rounded-[2rem] overflow-hidden aspect-[21/9] relative w-full">
          <SimulatedJourney />
        </div>
      </div>
    </section>
  )
}

function SimulatedJourney() {
  return (
    <div className="w-full h-full bg-[#1A1A1A] rounded-[2rem] relative overflow-hidden flex items-center justify-center">
      {/* Background Grid */}
      <div className="absolute inset-0 grid grid-cols-6 grid-rows-3 gap-8 opacity-10 pointer-events-none">
        {[...Array(18)].map((_, i) => (
          <div key={i} className="border border-[#E3E8D3]/20 rounded-xl" />
        ))}
      </div>

      {/* Path */}
      <div className="relative w-2/3 h-1/2">
        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
          {/* Base Line */}
          <motion.path
            d="M0 50 C 20 50, 20 25, 50 25 S 80 0, 100 0"
            fill="none"
            stroke="#E3E8D3"
            strokeWidth="0.5"
            strokeOpacity="0.2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Animated Line */}
          <motion.path
            d="M0 50 C 20 50, 20 25, 50 25 S 80 0, 100 0"
            fill="none"
            stroke="#E3E8D3"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            viewport={{ once: true }}
          />
        </svg>

        {/* Milestones */}
        {[
          { x: '0%', y: '100%', label: 'Start' },
          { x: '50%', y: '50%', label: 'Growth' },
          { x: '100%', y: '0%', label: 'Freedom' }
        ].map((point, i) => (
          <motion.div
            key={i}
            className="absolute w-4 h-4 rounded-full bg-[#E3E8D3] shadow-[0_0_20px_rgba(227,232,211,0.5)] z-10"
            style={{
              left: point.x,
              top: point.y,
            }}
            initial={{ scale: 0, x: "-50%", y: "-50%" }}
            whileInView={{ scale: 1, x: "-50%", y: "-50%" }}
            transition={{ delay: 0.5 + i * 0.5, type: "spring" }}
            viewport={{ once: true }}
          >
            <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold tracking-widest text-white/50 bg-black/50 px-2 py-1 rounded-full whitespace-nowrap opacity-0 md:opacity-100">
              {point.label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function Connect() {
  return (
    <section className="py-32 w-full text-center">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-5xl md:text-7xl font-serif mb-8">Connect with us</h2>
        <p className="text-xl opacity-60 mb-12">
          Ready to take control? Join Cashly today and start building your wealth.
        </p>
        <Button className="h-14 px-10 rounded-full bg-[#3A4D39] text-white hover:bg-[#2F3E2E] text-lg">
          Get Started Now
        </Button>
      </div>
    </section>
  )
}

// Footer removed




function TapeBackground() {
  const path = useMemo(() => {
    // Generate right edge (from top to bottom)
    let rightEdge = "L100,0 "
    for (let y = 5; y <= 100; y += 5) {
      const x = 98 + Math.random() * 4 // Random between 98 and 102
      rightEdge += `L${x.toFixed(1)},${y} `
    }

    // Generate left edge (from bottom to top)
    let leftEdge = "L0,100 "
    for (let y = 95; y >= 0; y -= 5) {
      const x = -2 + Math.random() * 4 // Random between -2 and 2
      leftEdge += `L${x.toFixed(1)},${y} `
    }

    return `M0,0 ${rightEdge} L0,100 ${leftEdge} Z`
  }, [])

  return (
    <motion.div
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.8, ease: "circOut" }}
      className="absolute inset-0 -z-10 -rotate-2 -skew-x-12 origin-left"
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-[105%] h-[120%] -left-[2.5%] -top-[10%] absolute fill-[#E3E8D3]"
      >
        <path d={path} />
      </svg>
      {/* Tape texture/sheen */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent mix-blend-overlay pointer-events-none" />
    </motion.div>
  )
}
