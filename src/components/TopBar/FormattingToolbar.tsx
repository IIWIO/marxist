import { useMemo } from 'react'
import ToolbarButton from './ToolbarButton'
import HeadingButton from './HeadingButton'
import OverflowMenu from './OverflowMenu'
import type { FormattingCommandName } from '@/components/Editor/extensions/formatting'

interface FormattingToolbarProps {
  onAction: (action: FormattingCommandName) => void
  windowWidth: number
  disabled?: boolean
}

interface IconItem {
  id: FormattingCommandName
  icon: string
  label: string
  shortcut?: string
  priority: boolean
  isHeading?: false
}

interface HeadingItem {
  id: FormattingCommandName
  label: string
  isHeading: true
  headingLevel: 1 | 2 | 3 | 4
  priority: boolean
}

type ToolbarItem = IconItem | HeadingItem

interface ToolbarGroup {
  id: string
  items: ToolbarItem[]
}

const toolbarGroups: ToolbarGroup[] = [
  {
    id: 'text',
    items: [
      { id: 'bold', icon: 'format_bold', label: 'Bold', shortcut: '⌘B', priority: true },
      { id: 'italic', icon: 'format_italic', label: 'Italic', shortcut: '⌘I', priority: true },
      { id: 'underline', icon: 'format_underline', label: 'Underline', priority: false },
      { id: 'strikethrough', icon: 'strikethrough_s', label: 'Strikethrough', priority: false },
    ],
  },
  {
    id: 'indent',
    items: [
      { id: 'indent', icon: 'format_indent_increase', label: 'Indent', priority: false },
      { id: 'outdent', icon: 'format_indent_decrease', label: 'Outdent', priority: false },
    ],
  },
  {
    id: 'headings',
    items: [
      { id: 'heading1', label: 'Heading 1', isHeading: true, headingLevel: 1, priority: true },
      { id: 'heading2', label: 'Heading 2', isHeading: true, headingLevel: 2, priority: true },
      { id: 'heading3', label: 'Heading 3', isHeading: true, headingLevel: 3, priority: false },
      { id: 'heading4', label: 'Heading 4', isHeading: true, headingLevel: 4, priority: false },
    ],
  },
  {
    id: 'lists',
    items: [
      { id: 'bulletList', icon: 'format_list_bulleted', label: 'Bullet list', priority: true },
      { id: 'numberList', icon: 'format_list_numbered', label: 'Number list', priority: true },
      { id: 'checklist', icon: 'checklist', label: 'Checklist', priority: false },
    ],
  },
  {
    id: 'blocks',
    items: [
      { id: 'blockquote', icon: 'format_quote', label: 'Blockquote', priority: false },
      { id: 'codeBlock', icon: 'code_blocks', label: 'Code block', priority: true },
    ],
  },
  {
    id: 'insert',
    items: [
      { id: 'link', icon: 'link', label: 'Link', shortcut: '⌘K', priority: true },
      { id: 'image', icon: 'image', label: 'Image', priority: false },
      { id: 'table', icon: 'table_chart', label: 'Table', priority: false },
      { id: 'horizontalRule', icon: 'horizontal_rule', label: 'Horizontal rule', priority: false },
    ],
  },
]

const OVERFLOW_BREAKPOINT = 900

export default function FormattingToolbar({ onAction, windowWidth, disabled = false }: FormattingToolbarProps) {
  const showOverflow = windowWidth < OVERFLOW_BREAKPOINT

  const { priorityGroups, overflowItems } = useMemo(() => {
    const priority: ToolbarGroup[] = []
    const overflow: Array<{
      id: FormattingCommandName
      icon?: string
      label: string
      isHeading?: boolean
      headingLevel?: 1 | 2 | 3 | 4
    }> = []

    toolbarGroups.forEach((group) => {
      const priorityGroupItems = group.items.filter((item) => item.priority)
      const overflowGroupItems = group.items.filter((item) => !item.priority)

      if (priorityGroupItems.length > 0) {
        priority.push({ ...group, items: priorityGroupItems })
      }

      overflowGroupItems.forEach((item) => {
        overflow.push({
          id: item.id,
          icon: 'icon' in item ? item.icon : undefined,
          label: item.label,
          isHeading: item.isHeading,
          headingLevel: 'headingLevel' in item ? item.headingLevel : undefined,
        })
      })
    })

    return { priorityGroups: priority, overflowItems: overflow }
  }, [])

  const groupsToRender = showOverflow ? priorityGroups : toolbarGroups

  return (
    <div className="flex items-center">
      {groupsToRender.map((group, groupIndex) => (
        <div key={group.id} className="flex items-center">
          {groupIndex > 0 && <div className="w-4" />}

          <div className="flex items-center gap-2">
            {group.items.map((item) => {
              if (item.isHeading) {
                return (
                  <HeadingButton
                    key={item.id}
                    level={item.headingLevel}
                    onClick={() => onAction(item.id)}
                    disabled={disabled}
                  />
                )
              }

              return (
                <ToolbarButton
                  key={item.id}
                  icon={(item as IconItem).icon}
                  label={item.label}
                  onClick={() => onAction(item.id)}
                  disabled={disabled}
                  shortcut={(item as IconItem).shortcut}
                />
              )
            })}
          </div>
        </div>
      ))}

      {showOverflow && overflowItems.length > 0 && (
        <>
          <div className="w-4" />
          <OverflowMenu items={overflowItems} onAction={onAction} disabled={disabled} />
        </>
      )}
    </div>
  )
}
