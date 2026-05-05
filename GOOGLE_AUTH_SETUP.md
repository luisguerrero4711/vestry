# Vestry — Google Sign-In Setup Guide

This guide covers exactly what to configure in Google Cloud Console and Supabase to make "Continue with Google" work in both local dev and production.

---

## Part 1 — Google Cloud Console

### 1.1 Create or open your project

Go to [console.cloud.google.com](https://console.cloud.google.com) and select or create a project (e.g. "Vestry").

### 1.2 Enable the Google Identity API

1. In the left menu → **APIs & Services → Library**
2. Search for **"Google Identity"** or **"OAuth"**
3. Enable **Google Identity Toolkit API** (if not already enabled)

### 1.3 Create OAuth credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `Vestry Web`

#### Authorized JavaScript origins (add all that apply)

```
http://localhost:5173
https://YOUR_NETLIFY_DOMAIN.netlify.app
https://YOUR_CUSTOM_DOMAIN.com
```

#### Authorized redirect URI (this must match Supabase exactly)

```
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
```

> Your Supabase project ref is the subdomain in your Supabase URL, e.g.
> `https://abcdefghijklmnop.supabase.co` → ref is `abcdefghijklmnop`

5. Click **Create** — copy the **Client ID** and **Client Secret**. You'll need these in Part 2.

---

## Part 2 — Supabase Dashboard

### 2.1 Enable Google provider

1. Go to your Supabase project → **Authentication → Providers**
2. Find **Google** and click to expand it
3. Toggle **Enable Sign in with Google** → ON
4. Paste in your **Client ID** and **Client Secret** from Google
5. Click **Save**

### 2.2 Configure URL settings

1. Go to **Authentication → URL Configuration**

**Site URL** (your production domain):
```
https://YOUR_NETLIFY_DOMAIN.netlify.app
```

**Redirect URLs** (add all three — use the exact format with `/**`):
```
http://localhost:5173/**
https://YOUR_NETLIFY_DOMAIN.netlify.app/**
https://YOUR_CUSTOM_DOMAIN.com/**
```

> The `/**` wildcard is required. Without it, Supabase will reject the redirect
> and users will see an error after signing in.

---

## Part 3 — Environment variables

### Local development (`.env` file in project root)

Copy `.env.example` → `.env` and fill in your values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SITE_URL=http://localhost:5173
VITE_MASTER_ADMIN_EMAIL=aluisguerrero12@gmail.com
```

The `.env` file is gitignored — never commit it.

### Netlify production

In **Netlify → Site settings → Environment variables**, add:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://your-project-ref.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `your-anon-key-here` |
| `VITE_SITE_URL` | `https://your-app.netlify.app` |
| `VITE_MASTER_ADMIN_EMAIL` | `aluisguerrero12@gmail.com` |

After adding variables, trigger a redeploy from the Netlify dashboard.

---

## Part 4 — Run the database migration

In **Supabase → SQL Editor**, open and run `supabase/google_auth_migration.sql`.

This adds the `email`, `full_name`, `avatar_url`, and `role` columns to the `profiles` table, and adds the INSERT policy needed for the OAuth callback.

---

## Part 5 — Testing checklist

Run through each scenario to verify the flow is working end to end.

### Local (`http://localhost:5173`)

- [ ] Click "Continue with Google" → redirected to Google sign-in
- [ ] Sign in with a Google account → redirected back to `/auth/callback`
- [ ] `/auth/callback` shows spinner briefly → redirected to `/role-selection` (first time)
- [ ] Pick "Landlord" or "Tenant" → redirected to `/dashboard`
- [ ] Sign out, sign in again → goes directly to `/dashboard` (role already set)

### Master admin login

- [ ] Sign in with `aluisguerrero12@gmail.com` via Google
- [ ] `/auth/callback` → redirected directly to `/admin` (no role selection)
- [ ] Confirm `profiles` row has `is_admin = true`, `role = 'admin'`, `plan = 'portfolio'`

### Production (`https://your-app.netlify.app`)

- [ ] Same Google login flow works (no `localhost` hardcoded anywhere)
- [ ] Redirect URL uses the production Netlify domain
- [ ] First-time user → profile row created with `email`, `full_name`, `avatar_url`
- [ ] Returning user → profile row updated (avatar/name sync on every login)

### Edge cases

- [ ] User signs in with email/password (not Google) → still works normally
- [ ] Demo login (`demo@vestry.app`) → still works, no profile upsert attempted
- [ ] User navigates directly to `/auth/callback` with no code → shows spinner, then error
- [ ] User navigates to `/role-selection` without being logged in → redirected to `/auth`

---

## How the flow works (summary)

```
User clicks "Continue with Google"
  ↓
supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: SITE_URL/auth/callback })
  ↓
Browser → Google sign-in page
  ↓
Google → Supabase (https://PROJECT.supabase.co/auth/v1/callback)
  ↓
Supabase exchanges code for session, redirects to →
  ↓
YOUR APP: /auth/callback
  ↓
AuthCallback component: getSession() / onAuthStateChange fires
  ↓
Upsert profile (email, full_name, avatar_url, admin check)
  ↓
Read profile.role + profile.is_admin
  ↓
Redirect:
  is_admin          → /admin
  role = landlord   → /dashboard
  role = tenant     → /dashboard
  role = null       → /role-selection
```
