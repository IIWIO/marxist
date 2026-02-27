import Icon from '@/components/common/Icon'
import { useAIAgent } from '@/hooks/useAIAgent'
import { useEditorStore } from '@/stores/editorStore'

export default function DiffBanner() {
  const activeTab = useEditorStore((s) => s.getActiveTab())
  const { acceptEdit, revertEdit, cancelRequest } = useAIAgent()

  if (!activeTab?.isAIEditing && !activeTab?.showDiff) return null

  if (activeTab.isAIEditing) {
    return (
      <div
        className="
        flex items-center justify-between
        px-4 py-2
        bg-blue-50 dark:bg-blue-900/30
        border-b border-blue-200 dark:border-blue-700
      "
      >
        <div className="flex items-center gap-3 text-sm">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-medium text-blue-800 dark:text-blue-200">
            Carl is editing your document...
          </span>
        </div>
        <button
          onClick={cancelRequest}
          className="
            flex items-center gap-1.5 px-3 py-1.5
            rounded-lg border border-red-300 dark:border-red-600
            text-sm font-medium text-red-600 dark:text-red-400
            hover:bg-red-50 dark:hover:bg-red-900/30
            transition-colors
          "
        >
          <Icon name="close" size={16} />
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div
      className="
      flex items-center justify-between
      px-4 py-2
      bg-amber-50 dark:bg-amber-900/30
      border-b border-amber-200 dark:border-amber-700
    "
    >
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium text-amber-800 dark:text-amber-200">
          Carl made changes to your document
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={revertEdit}
          className="
            flex items-center gap-1.5 px-3 py-1.5
            rounded-lg border border-gray-300 dark:border-gray-600
            text-sm font-medium
            text-text-primary-light dark:text-text-primary-dark
            hover:bg-gray-100 dark:hover:bg-gray-700
            transition-colors
          "
        >
          <Icon name="undo" size={16} />
          Revert
        </button>

        <button
          onClick={acceptEdit}
          className="
            flex items-center gap-1.5 px-3 py-1.5
            rounded-lg
            bg-green-600 dark:bg-green-700
            text-sm font-medium text-white
            hover:bg-green-700 dark:hover:bg-green-600
            transition-colors
          "
        >
          <Icon name="check" size={16} />
          Accept
        </button>
      </div>
    </div>
  )
}
