import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

describe('Data & Sources View - Simplified & Authoritative', () => {
  const dataSourcesFile = path.join(currentDir, '../src/frontend/views/DataAndSources.tsx')
  const content = fs.readFileSync(dataSourcesFile, 'utf-8')

  it('contains Section A: Key Data Sources with 1-sentence purposes and direct archive links', () => {
    expect(content).toContain('Key Scientific Data Sources')
    expect(content).toContain('Lunar Orbiter Laser Altimeter (LOLA)')
    expect(content).toContain('A New View of the Lunar South Pole (PGDA Product 90)')
    expect(content).toContain('Illumination Conditions of Lunar Polar Regions (PGDA Product 69)')
    expect(content).toContain('Lunar Exploration Neutron Detector (LEND) & LCROSS')
    expect(content).toContain('Diviner Lunar Radiometer Experiment')
    expect(content).toContain('NASA Artemis III Science Definition Team Report')

    // Direct archive links
    expect(content).toContain('https://pds-geosciences.wustl.edu/missions/lro/lola.htm')
    expect(content).toContain('https://pgda.gsfc.nasa.gov/products/90')
    expect(content).toContain('https://pgda.gsfc.nasa.gov/products/69')
    expect(content).toContain('https://pds-geosciences.wustl.edu/missions/lro/lend.htm')
    expect(content).toContain('https://diviner.ucla.edu/')
    expect(content).toContain('https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/')

    // Target blank and security attributes
    expect(content).toContain('target="_blank"')
    expect(content).toContain('rel="noopener noreferrer"')
  })

  it('contains Section B: Data Used in Site Evaluation with genuine categories only', () => {
    expect(content).toContain('Data Categories Used in Site Evaluation')
    expect(content).toContain('Terrain & Elevation')
    expect(content).toContain('Surface Slope')
    expect(content).toContain('Terrain Roughness')
    expect(content).toContain('Solar Illumination')
    expect(content).toContain('Water-Ice & Resource Evidence')
    expect(content).toContain('Communication Visibility')
    expect(content).toContain('Scientific Return Value')
  })

  it('contains Section C: Data Quality & Verification with the four truthful statuses', () => {
    expect(content).toContain('Data Quality & Verification Statuses')
    expect(content).toContain('Verified / source-backed')
    expect(content).toContain('Derived from source data')
    expect(content).toContain('Estimated')
    expect(content).toContain('Unavailable')
    expect(content).toContain('No-Fabrication Policy')
  })

  it('contains Section D: Scientific Transparency statement and prototype disclaimer', () => {
    expect(content).toContain('Scientific Transparency & Mission Evaluation Boundary')
    expect(content).toContain('LunarNavi is a decision-support prototype designed for preliminary landing-site trade studies.')
    expect(content).toContain('landing safety certification')
    expect(content).toContain('All candidate evaluations, feasibility determinations, and multi-criteria rankings depend strictly on available scientific data')
    expect(content).toContain('users can independently verify all measurements')
  })

  it('does not contain fake confidence percentages, invented quality scores, or excessive catalogs', () => {
    expect(content).not.toContain('99.8% Data Accuracy')
    expect(content).not.toContain('Overall Data Reliability: 94%')
    expect(content).not.toContain('100% Quality Score')
  })
})
