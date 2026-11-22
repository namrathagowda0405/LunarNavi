import { ModuleStatus, STATUS_LABEL } from './moduleStatus'

interface StatusChipProps {
  status: ModuleStatus
  customLabel?: string
}

export function StatusChip({ status, customLabel }: StatusChipProps) {
  const label = customLabel ?? STATUS_LABEL[status]

  return (
    <span className={`status-chip status-chip--${status}`} role="status">
      <span className="status-chip__dot" aria-hidden="true" />
      <span className="status-chip__text">{label}</span>
    </span>
  )
}
