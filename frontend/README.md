# LightMap Enterprise Frontend

Explainable, enterprise-grade web application for low-light image restoration, benchmarking, and illumination diagnostics.

## Architecture & Design System

- **Design Philosophy**: Restrained, corporate, trustworthy aesthetic (IBM Carbon / Microsoft Fluent / Google Cloud console inspired).
- **Theme**: Light-only palette (`#F7F9FC` background, `#FFFFFF` surfaces, `#E3E8EF` borders, `#1F4FD8` deep corporate blue accent, `#1E8E5A` / `#B7791F` / `#C53030` semantic status indicators).
- **Typography**: Inter with tabular numerals for precision metrics alignment.
- **Icons**: Lucide React line icons.
- **Analytics & Visualizations**: Recharts data visualizations (spectral histograms, multi-method comparative bar charts, region-wise gain heatmaps).

## Application Structure

```text
frontend/src/
├── components/
│   ├── Layout/
│   │   ├── Navbar.tsx             # Top navigation with live backend status indicator
│   │   ├── HeroStrip.tsx          # Value proposition & trust badges
│   │   └── Footer.tsx             # Minimal 1-line enterprise footer
│   ├── Workspace/
│   │   └── WorkspaceSection.tsx   # Drag-and-drop dropzone, file metadata, sample loader & profiles
│   ├── MethodSelector/
│   │   └── MethodSelector.tsx     # 3-card architecture selector (Classical, Hybrid center, Deep)
│   ├── Viewer/
│   │   ├── CompareViewer.tsx      # Split slider, side-by-side, synchronized zoom & pan (0.5x - 5.0x)
│   │   ├── RegionInspector.tsx    # 8x ROI pixel magnifier with hover tooltip (x, y, RGB, ΔL)
│   │   └── ExplainabilityMaps.tsx # Fusion weight W, disagreement & change heatmaps with opacity slider
│   ├── Pipeline/
│   │   └── PipelineSection.tsx    # Classical step-by-step strip, Retinexformer spec, hybrid SVG graph
│   ├── Analysis/
│   │   └── AnalysisSection.tsx    # Histograms, change distribution, 4x4 grid gain, guardian report, timing
│   └── Methodology/
│       └── MethodologySection.tsx # Scientific accordions & LOL-v2 benchmark evaluation table
├── pages/
│   └── Home.tsx                   # Central reactive state orchestrator
├── services/
│   └── api.ts                     # REST client for /api/v1 endpoints
└── types/
    └── image.ts                   # Strongly-typed data models and metric payloads
```

## Running the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev -- --host 0.0.0.0 --port 5173
```
Accessible at: **http://localhost:5173**

### 3. Build for Production
```bash
npm run build
```
Type checks via `tsc -b` and bundles with Vite into `dist/`.
