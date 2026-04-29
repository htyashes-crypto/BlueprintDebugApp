import { type LogCheckContext, formatContextTime } from '../models/LogCheckContext'
import { Tooltip } from './Tooltip'

interface HistoryItemProps {
  index: number
  ctx: LogCheckContext
  selected: boolean
  onClick: () => void
}

/** 名字长度超过此值时启用悬浮 tooltip，避免短名字也弹窗骚扰用户。 */
const NAME_TRUNCATE_THRESHOLD = 22

/** 左栏单条历史记录项；与 SVG 中卡片尺寸 256×46 圆角 6px 一致。 */
export function HistoryItem({ index, ctx, selected, onClick }: HistoryItemProps): JSX.Element {
  const name = ctx.name || '(无名称)'
  const tooltipContent = name.length > NAME_TRUNCATE_THRESHOLD
    ? `[${index}] ${formatContextTime(ctx.timestamp)}\n${name}`
    : ''

  return (
    <Tooltip content={tooltipContent} placement="right">
      <button
        className={
          'w-full h-[46px] rounded-md px-2.5 py-1.5 text-left transition ' +
          (selected
            ? 'bg-accent-blueDeep border border-accent-blue'
            : 'bg-bg-panelAlt border border-border-base hover:brightness-110')
        }
        onClick={onClick}
        title={name}
      >
        <div className="text-fg-accent font-mono text-2xs leading-tight">[{index}] {formatContextTime(ctx.timestamp)}</div>
        <div className="text-fg-base text-xs truncate leading-tight mt-0.5">{name}</div>
      </button>
    </Tooltip>
  )
}

/** 实时数据虚拟项，显示在历史列表顶部；选中态用更亮蓝。 */
interface LiveItemProps {
  selected: boolean
  rootCount: number
  liveLogCount: number
  onClick: () => void
}

export function LiveItem({ selected, rootCount, liveLogCount, onClick }: LiveItemProps): JSX.Element {
  return (
    <button
      className={
        'w-full h-[46px] rounded-md px-2.5 py-1.5 text-left transition ' +
        (selected
          ? 'bg-accent-blueDeep border border-accent-blue'
          : 'bg-bg-panelAlt border border-border-base hover:brightness-110')
      }
      onClick={onClick}
    >
      <div className="text-white text-[13px] font-medium leading-tight">▶ 实时数据</div>
      <div className="text-fg-accent text-2xs leading-tight mt-0.5">
        {rootCount} 个根上下文 · {liveLogCount} 行日志
      </div>
    </button>
  )
}
