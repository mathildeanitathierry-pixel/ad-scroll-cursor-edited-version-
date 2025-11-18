# Deployment Guide for Vercel

This guide will help you deploy your AdScroll Rewards application to Vercel with Supabase backend.

## ✅ Pre-Deployment Checklist

### 1. Supabase Setup (Backend)

1. **Create a Supabase Project** (if you haven't already):
   - Go to https://supabase.com/dashboard
   - Click "New Project"
   - Choose a name and database password
   - Select a region close to your users

2. **Run Database Migrations**:
   - In Supabase Dashboard → SQL Editor
   - Run these migration files in order:
     - `supabase/migrations/20251114144115_c8ffcc4d-23d2-4127-a46d-1846e85b3818.sql`
     - `supabase/migrations/20251114150352_0e8803db-d910-4f85-8331-bce133bdbde7.sql`
     - `supabase/migrations/20251115140951_add_revolut_id.sql`
     - `supabase/migrations/20251117112756_e795d620-c978-4584-88f4-7018952d62b9.sql`
   - Also run `APPLY_MIGRATION.sql` if needed

3. **Get Your Supabase Credentials**:
   - Go to Settings → API
   - Copy:
     - **Project URL** → `VITE_SUPABASE_URL`
     - **anon/public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`
     - **Project ID** → `VITE_SUPABASE_PROJECT_ID`

### 2. Vercel Deployment

1. **Connect GitHub Repository**:
   - Go to https://vercel.com/dashboard
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Vite configuration

2. **Configure Build Settings** (should auto-detect):
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Add Environment Variables**:
   In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

   **Required:**
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
   VITE_SUPABASE_PROJECT_ID=your-project-id-here
   ```

   **Optional (for real ads):**
   ```
   VITE_META_ACCESS_TOKEN=your-meta-access-token
   VITE_SEARCHAPI_KEY=your-searchapi-key
   ```

4. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete (1-3 minutes)
   - Your app will be live at `your-project.vercel.app`

### 3. Custom Domain Setup (ad-reward.com)

1. **In Vercel Dashboard**:
   - Go to your project → Settings → Domains
   - Click "Add Domain"
   - Enter: `ad-reward.com` and `www.ad-reward.com`

2. **Update DNS Records**:
   - Vercel will show you DNS records to add
   - Go to your domain registrar (where you bought ad-reward.com)
   - Add the DNS records Vercel provides:
     - **Option A**: Add A record pointing to Vercel's IP
     - **Option B**: Add CNAME record (recommended) pointing to `cname.vercel-dns.com`

3. **Wait for DNS Propagation**:
   - Usually takes 5-60 minutes
   - Vercel will automatically provision SSL certificates
   - You'll see a green checkmark when ready

### 4. Post-Deployment Verification

Test these features after deployment:

- [ ] ✅ Homepage loads correctly
- [ ] ✅ User signup/login works
- [ ] ✅ Video ads play correctly
- [ ] ✅ Points system works (watching ads earns points)
- [ ] ✅ User profile displays correctly
- [ ] ✅ Withdrawal requests work
- [ ] ✅ Watch history saves correctly

### 5. Auto-Deployment

Vercel automatically deploys when you push to GitHub:

- **Production**: Pushes to `main` branch → deploys to production
- **Preview**: Pushes to other branches → creates preview URLs
- **Pull Requests**: Creates preview deployments with unique URLs

## 🔧 Troubleshooting

### Build Fails

1. **Check build logs** in Vercel Dashboard → Deployments
2. **Verify environment variables** are set correctly
3. **Check Node.js version** (should be 16+)
4. **Verify all dependencies** are in `package.json`

### Environment Variables Not Working

- Ensure all variables start with `VITE_` prefix
- Redeploy after adding new variables
- Check for typos in variable names

### Supabase Connection Issues

1. **Verify credentials** in Supabase Dashboard
2. **Check CORS settings** in Supabase:
   - Settings → API → Allowed Origins
   - Add your Vercel domain: `https://ad-reward.com`
3. **Verify RLS policies** are set up correctly

### Custom Domain Not Working

1. **Check DNS propagation**: Use https://dnschecker.org
2. **Verify DNS records** match Vercel's requirements
3. **Wait longer** - can take up to 24 hours in rare cases
4. **Check SSL certificate** status in Vercel Dashboard

## 📝 Environment Variables Reference

### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project ID | Supabase Dashboard → Settings → General |

### Optional Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `VITE_META_ACCESS_TOKEN` | Meta Ad Library API token | Meta Business Suite → System Users |
| `VITE_SEARCHAPI_KEY` | SearchAPI key for brand ads | https://www.searchapi.io/ |

## 🚀 Quick Deploy Commands

```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Deploy from command line
vercel

# Deploy to production
vercel --prod

# Add environment variable via CLI
vercel env add VITE_SUPABASE_URL
```

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)

## 🎉 Success!

Once deployed, your app will be available at:
- Production: `https://ad-reward.com`
- Preview deployments: `https://your-project-abc123.vercel.app`

Any changes pushed to GitHub will automatically trigger new deployments!

