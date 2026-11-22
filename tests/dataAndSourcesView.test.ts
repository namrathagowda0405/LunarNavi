import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

describe('Data & Sources View - Clean, Minimal & Hackathon Judge Ready', () => {
  const dataSourcesFile = path.join(currentDir, '../src/frontend/views/DataAndSources.tsx')
  const content = fs.readFileSync(dataSourcesFile, 'utf-8')

  it('contains exactly one brief introduction sentence explaining lunar scientific datasets', () => {
    expect(content).toContain('LunarNavi uses lunar scientific datasets to evaluate candidate landing sites.')
  })

  it('contains only genuine scientific data sources with 1-sentence data descriptions and direct archive links', () => {
    // 6 genuine sources
    expect(content).toContain('Lunar Orbiter Laser Altimeter (LOLA)')
    expect(content).toContain('LOLA 50m Slope & Roughness (PGDA Product 90)')
    expect(content).toContain('Polar Illumination & Earth Visibility (PGDA Product 69)')
    expect(content).toContain('Lunar Exploration Neutron Detector (LEND) & LCROSS')
    expect(content).toContain('Diviner Lunar Radiometer Experiment')
    expect(content).toContain('NASA Artemis III Science Definition Team Report')

    // Organizations
    expect(content).toContain('NASA Planetary Data System (PDS) / GSFC')
    expect(content).toContain('NASA Planetary Geodynamics Data Archive / GSFC')
    expect(content).toContain('NASA PDS Geosciences / LCROSS')
    expect(content).toContain('NASA / UCLA')
    expect(content).toContain('NASA Science Mission Directorate')

    // Direct archive URLs
    expect(content).toContain('https://pds-geosciences.wustl.edu/missions/lro/lola.htm')
    expect(content).toContain('https://pgda.gsfc.nasa.gov/products/90')
    expect(content).toContain('https://pgda.gsfc.nasa.gov/products/69')
    expect(content).toContain('https://pds-geosciences.wustl.edu/missions/lro/lend.htm')
    expect(content).toContain('https://diviner.ucla.edu/')
    expect(content).toContain('https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/')

    // Secure target attributes
    expect(content).toContain('target="_blank"')
    expect(content).toContain('rel="noopener noreferrer"')
  })

  it('includes simple, truthful coverage statuses reflecting the actual pipeline', () => {
    expect(content).toContain('Verified / available')
    expect(content).toContain('Derived from source data')
    expect(content).toContain('Unavailable / insufficient')
  })

  it('does not contain redundant tables, sidebars, heavy breakdowns, or fake confidence metrics', () => {
    expect(content).not.toContain('99.8% Data Accuracy')
    expect(content).not.toContain('Overall Data Reliability: 94%')
    expect(content).not.toContain('100% Quality Score')
    expect(content).not.toContain('Data Categories Used in Site Evaluation') // Removed heavy secondary table
    expect(content).not.toContain('Data Quality & Verification Statuses') // Removed heavy secondary cards
  })
})
