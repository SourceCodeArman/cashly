/**
 * Simple Footer
 */
export default function Footer() {
  return (
    <footer className="border-t border-gray-100 py-10">
      <div className="container-custom flex flex-col items-center justify-between gap-4 text-sm text-gray-600 sm:flex-row">
        <div>© {new Date().getFullYear()} Cashly. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-gray-800">
            Privacy
          </a>
          <a href="#" className="hover:text-gray-800">
            Terms
          </a>
          <a href="#" className="hover:text-gray-800">
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}


