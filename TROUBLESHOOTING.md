# Troubleshooting: Deployment Not Working

## 🔴 Most Common Issue: Missing Environment Variables

If your deployment at https://ad-scroll-cursor-edited-version.vercel.app shows a blank page or error, it's most likely because **environment variables are missing**.

### Quick Fix:

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**: "ad-scroll-cursor-edited-version"
3. **Go to Settings → Environment Variables**
4. **Add these REQUIRED variables**:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_SUPABASE_PROJECT_ID=your-project-id-here
```

5. **Redeploy**: After adding variables, go to Deployments → Click "..." on latest deployment → Redeploy

### How to Get Supabase Credentials:

1. Go to https://supabase.com/dashboard
2. Select your project (or create one if you haven't)
3. Go to **Settings → API**
4. Copy:
   - **Project URL** → Use for `VITE_SUPABASE_URL`
   - **anon public** key → Use for `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **Project ID** → Use for `VITE_SUPABASE_PROJECT_ID` (found in Settings → General)

## 🔍 How to Check What's Wrong

### Option 1: Check Browser Console
1. Open your deployed site: https://ad-scroll-cursor-edited-version.vercel.app
2. Press `F12` or right-click → Inspect
3. Go to **Console** tab
4. Look for error messages (they'll tell you what's missing)

### Option 2: Check Vercel Build Logs
1. Go to Vercel Dashboard → Your Project
2. Click on **Deployments**
3. Click on the latest deployment
4. Check the **Build Logs** for any errors

### Option 3: Check Vercel Function Logs
1. Go to Vercel Dashboard → Your Project
2. Click on **Functions** tab
3. Check for any runtime errors

## 🐛 Common Errors & Solutions

### Error: "Missing env.VITE_SUPABASE_URL"
**Solution**: Add `VITE_SUPABASE_URL` in Vercel environment variables

### Error: "Missing env.VITE_SUPABASE_PUBLISHABLE_KEY"
**Solution**: Add `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel environment variables

### Blank White Screen
**Causes**:
- Missing environment variables (most common)
- JavaScript error preventing app from loading
- Build failed but deployment succeeded

**Solution**:
1. Check browser console for errors
2. Verify all environment variables are set
3. Check build logs in Vercel

### Build Succeeds But App Doesn't Load
**Causes**:
- Environment variables not set
- Runtime error in the app
- CORS issues with Supabase

**Solution**:
1. Add environment variables
2. Check browser console
3. Verify Supabase CORS settings include your Vercel domain

### "Failed to fetch" or Network Errors
**Causes**:
- Supabase URL is incorrect
- CORS not configured in Supabase
- Network connectivity issues

**Solution**:
1. Verify `VITE_SUPABASE_URL` is correct
2. In Supabase Dashboard → Settings → API → Add your Vercel domain to allowed origins

## ✅ Verification Checklist

After adding environment variables, verify:

- [ ] All 3 required Supabase variables are added
- [ ] Variable names start with `VITE_` (important!)
- [ ] No extra spaces or quotes in variable values
- [ ] Redeployed after adding variables
- [ ] Build succeeded in Vercel
- [ ] Browser console shows no errors
- [ ] Supabase project is active and running

## 🚀 Quick Test

After fixing, test these:
1. ✅ Homepage loads
2. ✅ Can see video ads
3. ✅ Can sign up/login
4. ✅ Points system works

## 📞 Still Not Working?

If you've checked everything above and it's still not working:

1. **Share the error message** from browser console
2. **Check Vercel build logs** and share any errors
3. **Verify Supabase project** is active and accessible
4. **Test locally** with `npm run dev` to see if it works there

## 🔗 Helpful Links

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Getting Started](https://supabase.com/docs/guides/getting-started)
- [Vercel Deployment Logs](https://vercel.com/docs/concepts/deployments/deployment-history)

