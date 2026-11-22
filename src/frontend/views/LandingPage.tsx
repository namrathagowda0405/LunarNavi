import { useState, useEffect } from 'react'
import { ViewId } from '../Sidebar'
import { LunarGlobe3D } from '../components/LunarGlobe3D'
import {
  calculateAstronomicalLunarPhase,
  LunarPhaseTelemetry,
} from '../lunarAstronomy'
import '../LandingPage.css'

export { calculateAstronomicalLunarPhase }
export type { LunarPhaseTelemetry }

interface LandingPageProps {
  onNavigate: (view: ViewId) => void
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  // Compute astronomical phase live with periodic refresh (every 60s)
  const [lunarTelemetry, setLunarTelemetry] = useState<LunarPhaseTelemetry>(() =>
    calculateAstronomicalLunarPhase()
  )

  useEffect(() => {
    const timer = setInterval(() => {
      setLunarTelemetry(calculateAstronomicalLunarPhase())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="observatory-page" role="region" aria-label="LunarNavi Welcome Portal">
      {/* Deep Space Background Overlays */}
      <div className="space-nebula-glow" aria-hidden="true" />
      <div className="space-stars-depth" aria-hidden="true" />

      {/* Faint Celestial Coordinate & Orbital Arc Overlay */}
      <svg
        className="celestial-grid-overlay"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="grid-fade" cx="70%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Polar coordinate declination rings centered on lunar observation node */}
        <ellipse cx="1120" cy="400" rx="460" ry="460" fill="none" stroke="url(#grid-fade)" strokeWidth="0.8" strokeDasharray="3 8" />
        <ellipse cx="1120" cy="400" rx="340" ry="340" fill="none" stroke="url(#grid-fade)" strokeWidth="0.8" />
        <ellipse cx="1120" cy="400" rx="220" ry="220" fill="none" stroke="url(#grid-fade)" strokeWidth="0.6" strokeDasharray="2 6" />

        {/* Faint orbital approach tangents */}
        <path d="M 0 540 Q 640 480 1120 400" fill="none" stroke="url(#grid-fade)" strokeWidth="0.8" strokeDasharray="4 6" />
        <path d="M 400 900 Q 860 620 1120 400" fill="none" stroke="url(#grid-fade)" strokeWidth="0.8" strokeDasharray="3 7" />

        {/* Coordinate tick markers */}
        <line x1="1120" y1="50" x2="1120" y2="750" stroke="url(#grid-fade)" strokeWidth="0.6" strokeDasharray="1 9" />
        <line x1="660" y1="400" x2="1580" y2="400" stroke="url(#grid-fade)" strokeWidth="0.6" strokeDasharray="1 9" />
      </svg>

      {/* Top Observatory Brand Header */}
      <header className="observatory-header">
        <a href="#landing" className="observatory-brand" aria-label="LunarNavi Home">
          <div className="observatory-logo-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a9 9 0 0 0 9 9" />
              <circle cx="12" cy="7" r="1.2" fill="currentColor" />
            </svg>
          </div>
          <div className="observatory-brand-text">
            <span className="observatory-brand-name">LunarNavi</span>
            <span className="observatory-brand-descriptor">
              A Lunar Landing-Site Decision Support System
            </span>
          </div>
        </a>

        <div className="observatory-header-actions">
          <button
            type="button"
            className="observatory-header-btn"
            onClick={() => onNavigate('overview')}
            aria-label="Open Application Dashboard"
          >
            <span>Launch Console</span>
            <span className="observatory-btn-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </header>

      {/* Main Observatory Composition */}
      <main className="observatory-hero">
        {/* Left Side: Structured Scientific Narrative */}
        <section className="observatory-narrative">
          {/* Tagline Pill */}
          <div className="observatory-tagline-container">
            <span className="observatory-tagline-text">
              From lunar data to informed landing decisions.
            </span>
          </div>

          {/* Eyebrow Label */}
          <div className="observatory-eyebrow">
            LUNAR LANDING-SITE DECISION SUPPORT
          </div>

          {/* Main Headline */}
          <h1 className="observatory-headline">
            Find the right place to land.
          </h1>

          {/* Supporting Text */}
          <p className="observatory-supporting-text">
            Compare lunar sites. Evaluate mission requirements. Understand the trade-offs.
          </p>

          {/* Primary Action Button */}
          <div className="observatory-action-group">
            <button
              type="button"
              className="observatory-primary-cta"
              onClick={() => onNavigate('overview')}
              id="explore-lunarnavi-cta"
            >
              <span>Explore LunarNavi</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>

          {/* Direct Access Navigation */}
          <nav className="observatory-quick-access" aria-label="Direct Workflow Access">
            <span className="quick-access-label font-mono">DIRECT ACCESS:</span>
            <div className="quick-access-pills">
              <button
                type="button"
                className="quick-access-pill"
                onClick={() => onNavigate('map')}
              >
                Lunar Map
              </button>
              <button
                type="button"
                className="quick-access-pill"
                onClick={() => onNavigate('results')}
              >
                Results & Ranking
              </button>
              <button
                type="button"
                className="quick-access-pill"
                onClick={() => onNavigate('data-sources')}
              >
                Data & Sources
              </button>
            </div>
          </nav>
        </section>

        {/* Right Side: Unobstructed 3D Moon Centerpiece */}
        <section className="observatory-stage" aria-label="Interactive 3D Moon Observation">
          <div className="observatory-moon-canvas-wrap">
            <LunarGlobe3D
              sunDirection={lunarTelemetry.sunDirection}
              autoRotate={true}
            />
          </div>
        </section>
      </main>

      {/* Footer & Methodological Disclaimer */}
      <footer className="observatory-footer">
        <p className="observatory-disclaimer">
          <strong>Prototype for decision support. Not a landing safety certification tool.</strong>
          {' '}Candidate site metrics derived from published lunar mission research and baseline orbital datasets. Live NASA PDS/API pipeline integration is in progress.
        </p>

        <div className="observatory-footer-links">
          <button
            type="button"
            className="observatory-link"
            onClick={() => onNavigate('data-sources')}
          >
            Data & Sources
          </button>
          <span className="observatory-link-dot" aria-hidden="true">·</span>
          <button
            type="button"
            className="observatory-link"
            onClick={() => onNavigate('about')}
          >
            About LunarNavi
          </button>
        </div>
      </footer>
    </div>
  )
}
