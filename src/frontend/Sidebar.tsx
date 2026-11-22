import type { ReactNode } from 'react'

export type ViewId =
  | 'landing'
  | 'overview'
  | 'setup'
  | 'map'
  | 'sites'
  | 'results'
  | 'robustness'
  | 'data-sources'
  | 'about'

interface NavItem {
  id: ViewId
  label: string
  icon: ReactNode
}

interface SidebarProps {
  activeView: ViewId
  onViewChange: (view: ViewId) => void
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      ),
    },
    {
      id: 'setup',
      label: 'Mission Setup',
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      ),
    },
    {
      id: 'results',
      label: 'Results & Ranking',
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      id: 'map',
      label: 'Lunar Map',
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
      ),
    },
    {
      id: 'sites',
      label: 'Candidate Sites',
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10z" />
          <circle cx="12" cy="11" r="2.5" />
        </svg>
      ),
    },
    {
      id: 'robustness',
      label: 'Robustness Analysis',
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
          <circle cx="14" cy="14" r="1" fill="currentColor" />
          <circle cx="10" cy="10" r="1" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'data-sources',
      label: 'Data & Sources',
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
          <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
        </svg>
      ),
    },
    {
      id: 'about',
      label: 'About LunarNavi',
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a14.5 14.5 0 0 0 0 18" />
          <path d="M3 12h18" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="sidebar-nav" aria-label="Main Navigation">
      <div className="sidebar-header">
        <span className="sidebar-title">DECISION SUPPORT</span>
      </div>
      <ul className="nav-list">
        {navItems.map((item) => {
          const isActive = activeView === item.id
          return (
            <li key={item.id} className="nav-item">
              <button
                type="button"
                className={`nav-button ${isActive ? 'nav-button--active' : ''}`}
                onClick={() => onViewChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.icon}
                <span className="nav-label">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
