# LunarNavi

Mission-aware lunar landing site selection and decision support system.

## About the Project

LunarNavi is a mission-aware decision support prototype designed to assist mission planners and engineers in evaluating and selecting candidate lunar landing sites based on terrain, illumination, communication, and mission-specific constraints.

> **Note:** Prototype for decision support. Not a landing safety certification tool.

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation
Install project dependencies:
```bash
npm install
```

### Development
Start the local Vite development server:
```bash
npm run dev
```

### Build
Compile TypeScript and build the production bundle:
```bash
npm run build
```

### Testing
Run tests using Vitest:
```bash
npm test
```

To run tests in watch mode during development:
```bash
npm run test:watch
```

## Folder Guide

- `src/engine`: Core calculation engine, scoring logic, and lunar site evaluation algorithms.
- `src/frontend`: UI components, interactive dashboard, and user views.
- `data`: Lunar site data, crater catalogs, and mission constraint profiles.
- `tests`: Test suites and verification tests powered by Vitest.
- `docs`: Documentation, architecture diagrams, and specification guides.
