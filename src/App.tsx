import { useState } from 'react'
import { Sidebar, ViewId } from './frontend/Sidebar'
import { OverviewDashboard } from './frontend/views/OverviewDashboard'
import { MissionSetup } from './frontend/views/MissionSetup'
import { LunarMap } from './frontend/views/LunarMap'
import { CandidateSites } from './frontend/views/CandidateSites'
import { Results } from './frontend/views/Results'
import { RobustnessAnalysis } from './frontend/views/RobustnessAnalysis'
import { DataAndSources } from './frontend/views/DataAndSources'
import { AboutLunarNavi } from './frontend/views/MissionOverview'
import { defaultFormState, MissionFormState } from './frontend/missionForm'
import { MissionProfile } from './engine/mission'

export function App() {
  // Default to Overview Dashboard as the landing page
  const [activeView, setActiveView] = useState<ViewId>('overview')
  // Form state preserved in application state across navigation
  const [formState, setFormState] = useState<MissionFormState>(defaultFormState)
  // Stored validated mission profile
  const [configuredMission, setConfiguredMission] = useState<MissionProfile | null>(null)

  const handleAnalyzeSuccess = (profile: MissionProfile) => {
    setConfiguredMission(profile)
    setActiveView('results')
  }

  return (
    <div className="app-shell">
      {/* Accessibility Skip Link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Global Top Bar */}
      <header className="topbar" role="banner">
        <div className="topbar__brand">
          <div className="topbar__logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a9 9 0 0 0 9 9" />
              <circle cx="12" cy="7" r="1" fill="currentColor" />
            </svg>
          </div>
          <div className="topbar__title-group">
            <span className="topbar__app-name">LunarNavi</span>
            <span className="topbar__app-tag">MISSION-CONTROL DECISION SUPPORT</span>
          </div>
        </div>

        <div className="topbar__disclaimer" role="note">
          <span className="disclaimer-badge">PROTOTYPE</span>
          <span className="disclaimer-text">
            Prototype for decision support. Not a landing safety certification tool.
          </span>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <div className="app-body">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        <main id="main-content" className="app-content" tabIndex={-1}>
          {activeView === 'overview' && <OverviewDashboard onNavigate={setActiveView} />}
          {activeView === 'setup' && (
            <MissionSetup
              formState={formState}
              onFormChange={setFormState}
              onAnalyzeSuccess={handleAnalyzeSuccess}
            />
          )}
          {activeView === 'map' && <LunarMap onNavigate={setActiveView} />}
          {activeView === 'sites' && <CandidateSites />}
          {activeView === 'results' && (
            <Results
              formState={formState}
              configuredMission={configuredMission}
              onEditMission={() => setActiveView('setup')}
            />
          )}
          {activeView === 'robustness' && <RobustnessAnalysis onNavigate={setActiveView} />}
          {activeView === 'data-sources' && <DataAndSources />}
          {activeView === 'about' && <AboutLunarNavi />}
        </main>
      </div>
    </div>
  )
}

export default App
