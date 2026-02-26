import { useState, useCallback } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import APIKeyInput from '../components/APIKeyInput'
import ModelSelector from '../components/ModelSelector'
import SystemPromptEditor from '../components/SystemPromptEditor'

export default function AISection() {
  const apiKey = useSettingsStore((s) => s.openRouterApiKey)
  const selectedModel = useSettingsStore((s) => s.selectedModel)
  const systemPrompt = useSettingsStore((s) => s.systemPrompt)
  const isApiKeyVerified = useSettingsStore((s) => s.isApiKeyVerified)
  const availableModels = useSettingsStore((s) => s.availableModels)
  const updateSetting = useSettingsStore((s) => s.updateSetting)
  const setApiKeyVerified = useSettingsStore((s) => s.setApiKeyVerified)

  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const handleVerify = useCallback(async () => {
    if (!apiKey.trim()) {
      setVerifyError('Please enter an API key')
      return
    }

    setIsVerifying(true)
    setVerifyError(null)

    try {
      const verifyResult = await window.electron.ai.verifyKey(apiKey)

      if (!verifyResult.valid) {
        setVerifyError(verifyResult.error || 'Invalid API key')
        setApiKeyVerified(false, [])
        return
      }

      const modelsResult = await window.electron.ai.listModels()

      if (modelsResult.error) {
        setVerifyError(modelsResult.error)
        setApiKeyVerified(false, [])
        return
      }

      setApiKeyVerified(true, modelsResult.models || [])
    } catch (error) {
      setVerifyError((error as Error).message)
      setApiKeyVerified(false, [])
    } finally {
      setIsVerifying(false)
    }
  }, [apiKey, setApiKeyVerified])

  const handleApiKeyChange = useCallback(
    (value: string) => {
      updateSetting('openRouterApiKey', value)
      setApiKeyVerified(false, [])
      setVerifyError(null)
    },
    [updateSetting, setApiKeyVerified]
  )

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
          OpenRouter API Key
        </label>
        <APIKeyInput
          value={apiKey}
          onChange={handleApiKeyChange}
          onVerify={handleVerify}
          isVerifying={isVerifying}
          isVerified={isApiKeyVerified}
          error={verifyError}
        />
        <p className="mt-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
          Get your API key from{' '}
          <button
            onClick={() => window.electron.file.openExternal('https://openrouter.ai/keys')}
            className="text-accent dark:text-accent-dark hover:underline"
          >
            openrouter.ai/keys
          </button>
        </p>
      </div>

      {isApiKeyVerified && (
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
            Model
          </label>
          <ModelSelector
            value={selectedModel}
            models={availableModels}
            onChange={(value) => updateSetting('selectedModel', value)}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
          System Prompt
        </label>
        <SystemPromptEditor
          value={systemPrompt}
          onChange={(value) => updateSetting('systemPrompt', value)}
        />
        <p className="mt-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
          Customize how the AI assistant behaves
        </p>
      </div>
    </div>
  )
}
