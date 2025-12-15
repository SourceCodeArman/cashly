import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'

export function LandingFooter() {
    return (
        <footer className="py-20 w-full border-t border-[#1A1A1A]/5 px-6 xl:px-0 bg-[#FDFCF8] text-[#1A1A1A]">
            <div className="max-w-[1400px] mx-auto grid md:grid-cols-4 gap-12 items-start justify-between">
                <div className="md:col-span-1 flex flex-col items-start md:items-center">
                    <Link to="/"><Logo /></Link>
                    <div className="mt-12 flex gap-4 opacity-50">
                        <div className="w-8 h-8 bg-[#1A1A1A] rounded-full" />
                        <div className="w-8 h-8 bg-[#1A1A1A] rounded-full" />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:col-span-3 items-start w-full">
                    <div className="flex flex-col items-start m-auto">
                        <h4 className="font-bold mb-6">Product</h4>
                        <ul className="space-y-4 text-sm opacity-60">
                            <li><Link to="/features">Features</Link></li>
                            <li><Link to="/pricing">Pricing</Link></li>
                            <li><Link to="/integrations">Integrations</Link></li>
                        </ul>
                    </div>
                    <div className="flex flex-col items-start m-auto">
                        <h4 className="font-bold mb-6">Company</h4>
                        <ul className="space-y-4 text-sm opacity-60">
                            <li><Link to="/about">About</Link></li>
                            <li><Link to="/careers">Careers</Link></li>
                            <li><Link to="/contact">Contact</Link></li>
                        </ul>
                    </div>
                    <div className="flex flex-col items-start m-auto">
                        <h4 className="font-bold mb-6">Legal</h4>
                        <ul className="space-y-4 text-sm opacity-60">
                            <li><Link to="/privacy">Privacy</Link></li>
                            <li><Link to="/terms">Terms</Link></li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    )
}
