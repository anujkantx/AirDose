# 💻 AirDose Frontend

The frontend for AirDose is a modern, responsive web application built with **Next.js 14+ (App Router)**, **TypeScript**, and **Tailwind CSS**.

---

## 🛠️ Tech Stack & Libraries

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts & Visualizations**: [Recharts](https://recharts.org/)
- **State & Caching**: Custom Session Storage Cache with `forceRefresh` toggle

---

## 📂 Directory Structure

```text
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root HTML layout with Inter font
│   │   ├── globals.css               # Dark theme utility classes & scrollbar
│   │   ├── page.tsx                  # Landing & marketing page
│   │   ├── signin/page.tsx           # Authentication signin page
│   │   ├── signup/page.tsx           # Account registration page
│   │   └── dashboard/
│   │       ├── page.tsx              # Main air quality & telemetry dashboard
│   │       └── locations/page.tsx    # Saved location coordinates page
│   │
│   ├── components/
│   │   ├── DashboardNavbar.tsx       # Navbar with Haversine proximity detection
│   │   ├── Sidebar.tsx               # Minimal navigation sidebar
│   │   ├── AirQualityHero.tsx        # AQI hero score & health recommendation
│   │   ├── PollutantGrid.tsx         # PM2.5, PM10, NO2, O3, CO, SO2 grid
│   │   ├── AirTrendChart.tsx         # Hourly air quality trend visualization
│   │   ├── StationInfoCard.tsx       # Nearest OpenAQ station metadata
│   │   ├── CurrentLocationCard.tsx   # Live HTML5 geolocation card
│   │   └── SavedLocationsTable.tsx   # Saved location management table
│   │
│   └── lib/
│       ├── api.ts                    # Backend API client & local cache helpers
│       └── haversine.ts              # Proximity calculation utility
│
├── tailwind.config.ts                # Tailwind design token configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json                      # Project dependencies & scripts
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Ensure `NEXT_PUBLIC_API_URL` points to your backend instance (default: `http://localhost:8000`).

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

### 4. Production Build
To create an optimized production build:
```bash
npm run build
npm start
```

---

## 🤝 Contributing
Please refer to the main repository [README.md](../README.md#contributing-guidelines) for project contribution guidelines and coding standards.
