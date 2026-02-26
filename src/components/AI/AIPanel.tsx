import { useViewStore, selectAiPanelOpen } from '@/stores/viewStore'
import { useEditorStore, selectActiveTabId } from '@/stores/editorStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAIStore } from '@/stores/aiStore'
import { useAIChat } from '@/hooks/useAIChat'
import AIPanelHeader from './AIPanelHeader'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import NoAPIKeyMessage from './NoAPIKeyMessage'

export default function AIPanel() {
  const isOpen = useViewStore(selectAiPanelOpen)
  const activeTabId = useEditorStore(selectActiveTabId)
  const apiKey = useSettingsStore((s) => s.openRouterApiKey)
  const isApiKeyVerified = useSettingsStore((s) => s.isApiKeyVerified)

  const history = useAIStore((s) =>
    activeTabId ? s.chatHistories.get(activeTabId) || [] : []
  )
  const isLoading = useAIStore((s) => s.isLoading)
  const error = useAIStore((s) => s.error)

  const { retryLastMessage } = useAIChat()

  return (
    <div
      className={`
        fixed top-[44px] right-0 h-[calc(100vh-44px)] z-20
        bg-white dark:bg-[#1E1E1E]
        border-l border-gray-200 dark:border-gray-700
        flex flex-col
        transform transition-transform
        ${
          isOpen
            ? 'translate-x-0 duration-200 ease-out'
            : 'translate-x-full duration-150 ease-in'
        }
      `}
      style={{ width: '360px' }}
      aria-hidden={!isOpen}
    >
      <AIPanelHeader />

      <div className="flex-1 flex flex-col overflow-hidden">
        {!apiKey ? (
          <NoAPIKeyMessage />
        ) : (
          <>
            <ChatMessages
              messages={history}
              isLoading={isLoading}
              error={error}
              onRetry={retryLastMessage}
            />
            <ChatInput disabled={!isApiKeyVerified} />
          </>
        )}
      </div>
    </div>
  )
}
