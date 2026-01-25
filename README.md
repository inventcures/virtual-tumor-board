# Virtual Tumor Board (VTB)

AI-powered multi-agent tumor board for cancer case deliberation and medical imaging analysis.

## Live Demo

**Production:** https://virtual-tumor-board-production.up.railway.app

## Features

### Multi-Agent Deliberation
- **Medical Oncologist** - Treatment planning, systemic therapy
- **Surgical Oncologist** - Surgical approaches, resectability
- **Radiation Oncologist** - Radiotherapy protocols
- **Radiologist** - Imaging interpretation, staging
- **Pathologist** - Histopathology, molecular markers
- **Moderator** - Synthesizes consensus recommendations

### Medical Imaging Analysis
- **MedGemma Integration** - AI-powered radiology analysis via HuggingFace
- **OncoSeg 3D Segmentation** - Tumor segmentation for NIfTI/DICOM files
- **DICOM Support** - Upload and view DICOM series
- **Camera Capture** - Photograph printed X-rays/scans via phone

### Analytics Dashboard
- Real-time visitor tracking
- Geographic distribution
- Feature usage analytics
- PostgreSQL persistence (Railway)
- CSV export

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TailwindCSS |
| Backend | Next.js API Routes, Server Actions |
| AI/ML | MedGemma (HuggingFace), OncoSeg, GPT-4 |
| Database | PostgreSQL (Railway) |
| Deployment | Railway |
| Monorepo | pnpm workspaces |

## Project Structure

```
oss-virtual-tumor-board/
├── apps/
│   └── web/                    # Next.js frontend
│       ├── src/
│       │   ├── app/            # App router pages
│       │   │   ├── admin/      # Analytics dashboard
│       │   │   ├── deliberate/ # Tumor board deliberation
│       │   │   ├── demo/       # Demo case viewer
│       │   │   └── upload/     # Document/imaging upload
│       │   ├── components/     # React components
│       │   │   └── my-imaging/ # Imaging upload & analysis
│       │   └── lib/            # Utilities
│       │       ├── analytics/  # Visitor tracking
│       │       ├── medgemma/   # MedGemma client
│       │       └── oncoseg/    # OncoSeg client
│       └── middleware.ts       # Analytics middleware
├── packages/
│   └── agents/                 # AI agent definitions
├── services/
│   └── segmentation/           # MedSAM3 segmentation service
└── huggingface/
    └── oncoseg-api/            # HuggingFace Space files
```

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/inventcures/virtual-tumor-board.git
cd virtual-tumor-board

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Environment Variables

Create `apps/web/.env.local`:

```env
# Required for AI features
OPENAI_API_KEY=sk-...

# Optional: MedGemma via Vertex AI
GOOGLE_CLOUD_PROJECT=your-project
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# Optional: Analytics persistence
DATABASE_URL=postgresql://...

# Optional: Admin dashboard protection
ADMIN_TOKEN=your-secret-token
```

## Deployment

### Railway (Recommended)

1. Connect your GitHub repo to Railway
2. Add PostgreSQL database (optional, for analytics)
3. Set environment variables
4. Deploy

The app auto-deploys on push to `main`.

### Environment Variables on Railway

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for agents |
| `DATABASE_URL` | No | Auto-set when adding Postgres |
| `ADMIN_TOKEN` | No | Password for `/admin` dashboard |

## Admin Dashboard

Access analytics at `/admin`:

- **Without auth:** `/admin` (if `ADMIN_TOKEN` not set)
- **With auth:** `/admin?token=YOUR_ADMIN_TOKEN`

Features:
- Real-time visitor count
- Geographic distribution (countries, cities)
- Device breakdown (desktop, mobile, tablet)
- Top pages and referrers
- Feature usage (deliberation, imaging, OncoSeg)
- Trend charts (hourly, daily)
- CSV export

## API Endpoints

### Deliberation
- `POST /api/deliberate` - Run tumor board deliberation
- `GET /api/deliberate/stream` - SSE stream for live deliberation

### Imaging
- `POST /api/imaging/analyze` - MedGemma image analysis
- `POST /api/imaging/segment` - OncoSeg 3D segmentation

### Analytics
- `POST /api/analytics/track` - Log page view
- `POST /api/analytics/event` - Log feature event
- `GET /api/analytics/summary` - Get aggregated stats
- `GET /api/analytics/realtime` - Get live stats
- `GET /api/analytics/status` - Storage status

## External Services

### MedGemma (HuggingFace)
Medical imaging analysis using Google's MedGemma 27B model.
- Space: `warshanks/medgemma-27b-it`
- Fallback: Gemini API

### OncoSeg (HuggingFace)
3D tumor segmentation for CT/MRI volumes.
- Space: `tp53/oncoseg-api`
- Input: Base64-encoded NIfTI files
- Output: Segmentation mask + statistics

## Development

```bash
# Run development server
pnpm dev

# Build for production
pnpm build

# Type check
pnpm lint

# Run tests
pnpm test
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Acknowledgments

- [MedGemma](https://huggingface.co/google/medgemma-27b-it) - Google's medical AI model
- [Railway](https://railway.app) - Deployment platform
- [Saloni Dattani](https://salonidattani.com) - Data visualization principles
