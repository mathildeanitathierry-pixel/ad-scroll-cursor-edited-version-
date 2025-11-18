# Video Ad Platform

A TikTok/Reels-style vertical scrolling video ad platform where users can watch ads, earn points, and request withdrawals.

## Features

- **Infinite Vertical Scroll**: Swipe up/down through video ads with infinite feed (loops when reaching the end)
- **User Authentication**: Secure signup/login with email
- **Points System**: Earn points by watching video ads
- **Withdrawal Requests**: Cash out points via Bank Transfer or Revolut
- **User Profile**: Track earnings, ads watched, and activity history
- **Watch History**: View all previously watched ads with timestamps
- **Real-time Stats**: Live counter showing current points balance

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn-ui, Tailwind CSS
- **Backend**: Lovable Cloud (Supabase)
- **Database**: PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth
- **Routing**: React Router v6

## Database Schema

### Tables

- `user_stats`: User statistics (points earned, ads watched, watch time)
- `watch_history`: History of watched ads per user
- `video_ads`: Video ad content and metadata
- `withdrawal_requests`: User withdrawal requests and status

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Git

### Installation

1. Clone the repository:
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:8080`

## Project Structure

```
src/
├── components/          # React components
│   ├── auth/           # Authentication forms
│   ├── ui/             # shadcn-ui components
│   ├── CashCounter.tsx # Points display
│   ├── VideoCard.tsx   # Video ad player
│   └── NavLink.tsx     # Navigation component
├── pages/              # Route pages
│   ├── Index.tsx       # Main feed
│   ├── Auth.tsx        # Login/signup
│   ├── Profile.tsx     # User profile
│   └── Withdraw.tsx    # Withdrawal requests
├── services/           # External services
│   └── metaAdLibrary.ts # Meta Ad Library API integration
├── lib/                # Utilities
│   ├── auth.ts         # Auth helpers
│   ├── stats.ts        # Stats management
│   ├── withdrawals.ts  # Withdrawal logic
│   └── validations.ts  # Form validation
├── data/               # Mock data
│   └── mockVideos.ts   # Sample video ads (fallback)
└── integrations/       # External services
    └── supabase/       # Supabase client & types
```

## Key Features Implementation

### Infinite Scroll
- Videos loop infinitely using mock ad data
- Automatically loads more ads when scrolling near the end
- Smooth transitions between videos

### Points & Withdrawals
- Points conversion: 100 points = $1.00
- Minimum withdrawal: varies by method
- Supported methods: Bank Transfer, Revolut
- Withdrawal status tracking (pending/completed)

### Authentication
- Email/password authentication
- Protected routes requiring login
- Session persistence
- Automatic redirect to auth page for unauthenticated users

## Development

### Environment Variables

The `.env` file contains configuration:
- `VITE_SUPABASE_URL` (auto-generated)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (auto-generated)
- `VITE_SUPABASE_PROJECT_ID` (auto-generated)
- `VITE_META_ACCESS_TOKEN` (required for real brand ads)

#### Getting a Meta API Access Token

1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Navigate to Business Settings
3. Under Users → System Users, create or select a system user
4. Generate an access token with `ads_read` permission
5. Add the token as `VITE_META_ACCESS_TOKEN`

**Note:** Without the Meta API token, the app will use demo videos as fallback.

### Fetching Brand Ads from Meta

The app integrates with the Meta Ad Library API to fetch real video ads from:
- Apple
- Nike
- Samsung
- Coca-Cola
- Joe and the Juice (page ID pending)
- Whoop (page ID pending)

To find missing page IDs, open browser console and run:
```javascript
window.findMissingPageIds()
```

Then update the `BRAND_PAGE_IDS` in `src/services/metaAdLibrary.ts` with the correct IDs.

### Database Migrations

Database schema is managed through Supabase migrations in `supabase/migrations/`

## Deployment

Deploy via Lovable:
1. Open [Lovable Project](https://lovable.dev/projects/67b6e811-173c-40e1-8c65-efd6998cc2ee)
2. Click Share → Publish
3. Optional: Connect custom domain in Project > Settings > Domains

## Contributing

This project was built with [Lovable](https://lovable.dev) and supports bidirectional GitHub sync.

### Development Workflow Options

1. **Via Lovable**: Make changes directly in the Lovable editor (auto-commits to GitHub)
2. **Via IDE**: Clone repo, make changes locally, push to GitHub (auto-syncs to Lovable)
3. **Via GitHub**: Edit files directly on GitHub (auto-syncs to Lovable)
4. **Via Codespaces**: Use GitHub Codespaces for cloud-based development

## License

Private project - All rights reserved
