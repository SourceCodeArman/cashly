/**
 * Marketing Landing Page
 */
import { useState } from 'react'
import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import Testimonials from '@/components/landing/Testimonials'
import Footer from '@/components/landing/Footer'
import LandingHeader from '@/components/landing/LandingHeader'
import PricingModal from '@/components/landing/PricingModal'

export default function LandingPage() {
  const [showPricingModal, setShowPricingModal] = useState(false)

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-purple-500 to-pink-100 fixed inset-0 w-full h-full -z-10"></div>
      <div className="relative min-h-screen">
        <LandingHeader onOpenPricing={() => setShowPricingModal(true)} />
        <Hero onOpenPricing={() => setShowPricingModal(true)} />
        <Features />
        <Testimonials />
        <Footer />
      </div>
      <PricingModal 
        isOpen={showPricingModal} 
        onClose={() => setShowPricingModal(false)} 
      />
    </>
  )
}


