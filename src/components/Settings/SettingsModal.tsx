import { useEffect, useCallback } from 'react'
import { useSettingsStore, selectIsModalOpen } from '@/stores/settingsStore'
import SettingsHeader from './SettingsHeader'
import SettingsTabs from './SettingsTabs'
import AppearanceSection from './sections/AppearanceSection'
import AISection from './sections/AISection'
import EditorSection from './sections/EditorSection'
import AboutSection from './sections/AboutSection'

export default function SettingsModal() {
  const isOpen = useSettingsStore(selectIsModalOpen)
  const activeTab = useSettingsStore((s) => s.activeTab)
  const closeModal = useSettingsStore((s) => s.closeModal)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeModal])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        closeModal()
      }
    },
    [closeModal]
  )

  if (!isOpen) return null

  const renderSection = () => {
    switch (activeTab) {
      case 'appearance':
        return <AppearanceSection />
      case 'ai':
        return <AISection />
      case 'editor':
        return <EditorSection />
      case 'about':
        return <AboutSection />
      default:
        return null
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div
        className="
          w-[560px] max-h-[80vh] 
          bg-white dark:bg-[#1E1E1E]
          rounded-xl shadow-2xl
          flex flex-col overflow-hidden
          animate-in fade-in zoom-in-95 duration-150
        "
        onClick={(e) => e.stopPropagation()}
      >
        <SettingsHeader />
        <SettingsTabs />
        <div className="flex-1 overflow-y-auto p-6">{renderSection()}</div>
      </div>
    </div>
  )
}
