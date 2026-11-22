import { useState, useEffect, useMemo } from 'react'
import { Sidebar, ViewId } from './frontend/Sidebar'
import { LandingPage } from './frontend/views/LandingPage'
import { OverviewDashboard } from './frontend/views/OverviewDashboard'
import { MissionSetup } from './frontend/views/MissionSetup'
import { LunarMap } from './frontend/views/LunarMap'
import { CandidateSites } from './frontend/views/CandidateSites'
import { Results } from './frontend/views/Results'
import { RobustnessAnalysis } from './frontend/views/RobustnessAnalysis'
import { DataAndSources } from './frontend/views/DataAndSources'
import { AboutLunarNavi } from './frontend/views/MissionOverview'
import { defaultFormState, MissionFormState, buildMissionProfile } from './frontend/missionForm'
import { MissionProfile, getDefaultMissionProfile } from './engine/mission'

const VALID_VIEWS: ViewId[] = [
  'landing',
  'overview',
  'setup',
  'map',
  'sites',
  'results',
  'robustness',
  'data-sources',
  'about',
]

function getInitialView(): ViewId {
  if (typeof window !== 'undefined' && window.location.hash) {
    const raw = window.location.hash.replace(/^#\/?/, '') as ViewId
    if (VALID_VIEWS.includes(raw)) return raw
  }
  return 'landing'
}

const FORM_STATE_STORAGE_KEY = 'lunarnavi_form_state'
const CONFIGURED_MISSION_STORAGE_KEY = 'lunarnavi_configured_mission'

function getInitialFormState(): MissionFormState {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(FORM_STATE_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Clear legacy preset dates so user starts with clean empty fields
        if (parsed.launchDate === '2027-05-27') parsed.launchDate = ''
        if (parsed.arrivalDate === '2027-06-01') parsed.arrivalDate = ''
        return parsed
      }
    } catch (e) {
      console.warn('Could not read form state from localStorage:', e)
    }
  }
  return defaultFormState()
}

function getInitialConfiguredMission(): MissionProfile | null {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(CONFIGURED_MISSION_STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.warn('Could not read configured mission from localStorage:', e)
    }
  }
  return null
}

export function App() {
  // Default to Welcome Landing Page, or sync with URL hash
  const [activeView, setActiveView] = useState<ViewId>(getInitialView)
  // Form state preserved across navigation and page refresh
  const [formState, setFormState] = useState<MissionFormState>(getInitialFormState)
  // Stored validated mission profile
  const [configuredMission, setConfiguredMission] = useState<MissionProfile | null>(getInitialConfiguredMission)
  // Targeted site to focus on the Lunar Map
  const [targetMapSiteId, setTargetMapSiteId] = useState<string | null>(null)

  // Unified live active mission profile derived from formState, keeping all views in sync
  const activeMission: MissionProfile = useMemo(() => {
    const buildRes = buildMissionProfile(formState)
    if (buildRes.ok && buildRes.profile) {
      return buildRes.profile
    }
    return getDefaultMissionProfile(formState.missionType)
  }, [formState])

  useEffect(() => {
    const handleHash = () => {
      const raw = window.location.hash.replace(/^#\/?/, '') as ViewId
      if (VALID_VIEWS.includes(raw)) {
        setActiveView(raw)
      }
    }
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  const handleViewChange = (view: ViewId) => {
    if (typeof window !== 'undefined') {
      window.location.hash = view
    }
    setActiveView(view)
  }

  const handleFormChange = (nextState: MissionFormState) => {
    setFormState(nextState)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FORM_STATE_STORAGE_KEY, JSON.stringify(nextState))
      } catch (e) {
        console.warn('Could not persist form state to localStorage:', e)
      }
    }
  }

  const handleAnalyzeSuccess = (profile: MissionProfile) => {
    setConfiguredMission(profile)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CONFIGURED_MISSION_STORAGE_KEY, JSON.stringify(profile))
        localStorage.setItem(FORM_STATE_STORAGE_KEY, JSON.stringify(formState))
      } catch (e) {
        console.warn('Could not persist mission to localStorage:', e)
      }
    }
    handleViewChange('results')
  }

  const handleViewOnMap = (siteId?: string) => {
    setTargetMapSiteId(siteId || null)
    handleViewChange('map')
  }

  // Render full-bleed space Landing Page when on landing view
  if (activeView === 'landing') {
    return <LandingPage onNavigate={handleViewChange} />
  }

  return (
    <div className="app-shell">
      {/* Accessibility Skip Link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Global Top Bar */}
      <header className="topbar" role="banner">
        <div
          className="topbar__brand"
          style={{ cursor: 'pointer' }}
          onClick={() => handleViewChange('landing')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleViewChange('landing')
            }
          }}
          title="Return to LunarNavi Landing Portal"
          aria-label="Return to LunarNavi Landing Portal"
        >
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
        <Sidebar activeView={activeView} onViewChange={handleViewChange} />

        <main id="main-content" className="app-content" tabIndex={-1}>
          {activeView === 'overview' && (
            <OverviewDashboard
              onNavigate={handleViewChange}
              configuredMission={configuredMission}
              activeMission={activeMission}
              formState={formState}
            />
          )}
          {activeView === 'setup' && (
            <MissionSetup
              formState={formState}
              onFormChange={handleFormChange}
              onAnalyzeSuccess={handleAnalyzeSuccess}
            />
          )}
          {activeView === 'map' && (
            <LunarMap
              configuredMission={configuredMission}
              activeMission={activeMission}
              formState={formState}
              onNavigate={handleViewChange}
              targetSiteId={targetMapSiteId}
            />
          )}
          {activeView === 'sites' && (
            <CandidateSites
              configuredMission={configuredMission}
              activeMission={activeMission}
              formState={formState}
              onNavigate={handleViewChange}
            />
          )}
          {activeView === 'results' && (
            <Results
              formState={formState}
              configuredMission={configuredMission}
              activeMission={activeMission}
              onEditMission={() => handleViewChange('setup')}
              onNavigate={handleViewChange}
              onViewOnMap={handleViewOnMap}
            />
          )}
          {activeView === 'robustness' && (
            <RobustnessAnalysis
              activeMission={activeMission}
              formState={formState}
              onNavigate={handleViewChange}
            />
          )}
          {activeView === 'data-sources' && <DataAndSources />}
          {activeView === 'about' && <AboutLunarNavi />}
        </main>
      </div>
    </div>
  )
}

export default App
