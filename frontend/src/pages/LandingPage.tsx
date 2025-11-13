/**
 * Marketing Landing Page
 */
import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import Testimonials from '@/components/landing/Testimonials'
import Footer from '@/components/landing/Footer'
import LandingHeader from '@/components/landing/LandingHeader'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <LandingHeader />
      <Hero />
      <Features />
      <Testimonials />
      <Footer />
    </div>
  )
}


