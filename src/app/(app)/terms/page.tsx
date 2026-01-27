import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="w-full p-4 md:p-6 flex items-center justify-between max-w-3xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Terms of Service
        </h1>

        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Last updated: January 2026
          </p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
            Use at Your Own Risk
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            By using GroupVibes, you acknowledge and agree that your use of this application is entirely at your own risk. 
            We provide this service &quot;as is&quot; without any warranties, express or implied.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
            Limitation of Liability
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            To the fullest extent permitted by applicable law, GroupVibes and its creators shall not be liable for any 
            direct, indirect, incidental, special, consequential, or punitive damages resulting from your use of or 
            inability to use the application.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
            No Professional Advice
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            GroupVibes is not a substitute for professional medical, mental health, or any other professional advice. 
            If you are experiencing a mental health crisis, please contact a qualified professional or emergency services.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
            Changes to Terms
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We reserve the right to modify these terms at any time. Continued use of the application after any changes 
            constitutes your acceptance of the new terms.
          </p>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Link href="/privacy" className="text-primary hover:underline">
            View Privacy Policy →
          </Link>
        </div>
      </main>
    </div>
  )
}
