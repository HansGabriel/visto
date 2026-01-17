import { useState } from 'react'

interface PairingCodeProps {
  pairingCode: string | null
  isLoading: boolean
  onRegenerate?: () => void
}

export function PairingCode({
  pairingCode,
  isLoading,
  onRegenerate,
}: PairingCodeProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!pairingCode) return

    try {
      await navigator.clipboard.writeText(pairingCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error: unknown) {
      console.error('Failed to copy to clipboard:', error)
      // Fallback: show error to user or use alternative copy method
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-gray-800 rounded-lg">
        <div className="text-lg text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!pairingCode) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-gray-800 rounded-lg">
        <div className="text-lg text-red-400">Failed to generate pairing code</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-gray-800 rounded-lg">
      <h2 className="text-lg font-semibold text-gray-300">Pairing Code</h2>

      <div className="flex items-center gap-3">
        <div className="text-4xl font-bold tracking-widest text-white font-mono bg-gray-900 px-6 py-4 rounded-lg">
          {pairingCode}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="px-4 py-2 rounded-lg font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 active:bg-gray-500 transition-colors"
          >
            Generate New Code
          </button>
        )}
      </div>

      <p className="text-sm text-gray-400 text-center max-w-md">
        Enter this code in your mobile app to connect your desktop
      </p>
    </div>
  )
}