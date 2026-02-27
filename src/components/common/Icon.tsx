import { CSSProperties } from 'react'

import arrowDropDown from '@/assets/icons/arrow_drop_down.svg'
import arrowRight from '@/assets/icons/arrow_right.svg'
import arrowRightAlt from '@/assets/icons/arrow_right_alt.svg'
import cancel from '@/assets/icons/cancel.svg'
import chatBubble from '@/assets/icons/chat_bubble.svg'
import check from '@/assets/icons/check.svg'
import checkCircle from '@/assets/icons/check_circle.svg'
import checklist from '@/assets/icons/checklist.svg'
import close from '@/assets/icons/close.svg'
import code from '@/assets/icons/code.svg'
import copy from '@/assets/icons/copy.svg'
import editDocument from '@/assets/icons/edit_document.svg'
import formatBold from '@/assets/icons/format_bold.svg'
import formatH1 from '@/assets/icons/format_h1.svg'
import formatH2 from '@/assets/icons/format_h2.svg'
import formatH3 from '@/assets/icons/format_h3.svg'
import formatH4 from '@/assets/icons/format_h4.svg'
import formatIndentDecrease from '@/assets/icons/format_indent_decrease.svg'
import formatIndentIncrease from '@/assets/icons/format_indent_increase.svg'
import formatItalic from '@/assets/icons/format_italic.svg'
import formatListBulleted from '@/assets/icons/format_list_bulleted.svg'
import formatListNumbered from '@/assets/icons/format_list_numbered.svg'
import formatQuote from '@/assets/icons/format_quote.svg'
import formatUnderlined from '@/assets/icons/format_underlined.svg'
import horizontalRule from '@/assets/icons/horizontal_rule.svg'
import image from '@/assets/icons/image.svg'
import link from '@/assets/icons/link.svg'
import menu from '@/assets/icons/menu.svg'
import moreHoriz from '@/assets/icons/more_horiz.svg'
import refresh from '@/assets/icons/refresh.svg'
import robot from '@/assets/icons/robot.svg'
import search from '@/assets/icons/search.svg'
import send from '@/assets/icons/send.svg'
import stopCircle from '@/assets/icons/stop_circle.svg'
import strikethrough from '@/assets/icons/strikethrough.svg'
import sync from '@/assets/icons/sync.svg'
import table from '@/assets/icons/table.svg'
import undo from '@/assets/icons/undo.svg'
import visibility from '@/assets/icons/visibility.svg'
import visibilityOff from '@/assets/icons/visibility_off.svg'

interface IconProps {
  name: string
  size?: number
  className?: string
  style?: CSSProperties
}

const iconMap: Record<string, string> = {
  // Arrows
  arrow_drop_down: arrowDropDown,
  arrow_right: arrowRight,
  arrow_right_alt: arrowRightAlt,
  expand_more: arrowDropDown,
  expand_less: arrowDropDown,
  
  // Actions
  cancel: cancel,
  check: check,
  check_circle: checkCircle,
  close: close,
  copy: copy,
  content_copy: copy,
  refresh: refresh,
  search: search,
  send: send,
  stop_circle: stopCircle,
  sync: sync,
  undo: undo,
  
  // Chat/AI
  chat_bubble: chatBubble,
  chat: chatBubble,
  edit_document: editDocument,
  robot: robot,
  smart_toy: robot,
  
  // Text formatting
  format_bold: formatBold,
  format_h1: formatH1,
  format_h2: formatH2,
  format_h3: formatH3,
  format_h4: formatH4,
  format_indent_decrease: formatIndentDecrease,
  format_indent_increase: formatIndentIncrease,
  format_italic: formatItalic,
  format_underlined: formatUnderlined,
  format_underline: formatUnderlined,
  strikethrough: strikethrough,
  strikethrough_s: strikethrough,
  format_strikethrough: strikethrough,
  
  // Lists
  format_list_bulleted: formatListBulleted,
  format_list_numbered: formatListNumbered,
  checklist: checklist,
  
  // Blocks
  format_quote: formatQuote,
  code: code,
  code_blocks: code,
  
  // Insert
  horizontal_rule: horizontalRule,
  image: image,
  link: link,
  table: table,
  table_chart: table,
  
  // UI
  menu: menu,
  more_horiz: moreHoriz,
  visibility: visibility,
  visibility_off: visibilityOff,
}

const noShrinkIcons = ['format_h1', 'format_h2', 'format_h3', 'format_h4', 'code', 'code_blocks', 'strikethrough', 'strikethrough_s', 'format_strikethrough', 'format_bold', 'horizontal_rule']

export default function Icon({ name, size = 20, className = '', style }: IconProps) {
  const iconSrc = iconMap[name]
  const shouldShrink = !noShrinkIcons.includes(name)
  const adjustedSize = shouldShrink ? size * 0.8 : size

  if (!iconSrc) {
    console.warn(`Icon not found: ${name}`)
    return (
      <span
        className={`inline-flex items-center justify-center select-none ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.6, ...style }}
      >
        ?
      </span>
    )
  }

  return (
    <img
      src={iconSrc}
      alt=""
      className={`inline-block select-none transition-all duration-150 icon-default ${className}`}
      style={{
        width: adjustedSize,
        height: adjustedSize,
        ...style,
      }}
      aria-hidden="true"
    />
  )
}
