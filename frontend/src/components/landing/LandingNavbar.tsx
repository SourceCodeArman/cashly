import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'
import { motion } from 'framer-motion'
import { useState } from 'react'

export function LandingNavbar() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <nav className="fixed top-0 inset-x-0 z-40 bg-[#FDFCF8]/80 backdrop-blur-md border-b border-[#1A1A1A]/5">
            <div className="max-w-[1400px] mx-auto w-full h-20 flex items-center justify-between px-6 xl:px-0">
                <Link to="/"><Logo /></Link>

                <div className="hidden md:flex items-center gap-8">
                    <Link to="/features" className="text-sm font-medium hover:text-[#1A1A1A]/70 transition-colors">Features</Link>
                    <Link to="/pricing" className="text-sm font-medium hover:text-[#1A1A1A]/70 transition-colors">Pricing</Link>
                    <Link to="/about" className="text-sm font-medium hover:text-[#1A1A1A]/70 transition-colors">About</Link>
                    <Link to="/login" className="text-sm font-medium hover:text-[#1A1A1A]/70 transition-colors">Log in</Link>
                    <Button asChild className="rounded-full bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 px-6">
                        <Link to="/register">Get Started</Link>
                    </Button>
                </div>

                <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:hidden absolute top-20 left-0 right-0 bg-[#FDFCF8] border-b border-[#1A1A1A]/5 p-6 flex flex-col gap-4 shadow-xl"
                >
                    <Link to="/features" className="text-lg font-medium">Features</Link>
                    <Link to="/pricing" className="text-lg font-medium">Pricing</Link>
                    <Link to="/about" className="text-lg font-medium">About</Link>
                    <div className="h-px bg-[#1A1A1A]/5 my-2" />
                    <Link to="/login" className="text-lg font-medium">Log in</Link>
                    <Button asChild className="w-full rounded-full bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90">
                        <Link to="/register">Get Started</Link>
                    </Button>
                </motion.div>
            )}
        </nav>
    )
}
