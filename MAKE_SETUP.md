# Make.com → Google Sheets → FB Ads Dashboard

Step-by-step guide to configure automated Facebook Ads data sync.

---

## Overview

```
Facebook Ads API → Make.com (daily) → Google Sheet → Dashboard API → FB Ads Dashboard
```

**Frequency**: Daily at 6:00 AM AEST (after overnight ad delivery)
**Backfill**: Once on setup, then incremental daily

---

## 1. Create Google Sheet

1. Create a new Google Sheet named `SuperNova FB Ads Data`
2. In **Sheet1**, add these headers in row 1:

```
Date | Campaign ID | Campaign Name | Campaign Objective | Ad Set ID | Ad Set Name | Ad ID | Ad Name | Creative Name | Spend | Impressions | Reach | Link Clicks | Landing Page Views | Conversions | Conversion Value | Attribution Window | CPM | Hour of Day | Day of Week
```

3. Note the **Sheet ID** from the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`

---

## 2. Create Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Sheets API**
4. Go to **IAM & Admin → Service Accounts**
5. Create a new service account (name: `supernova-fb-ads`)
6. Create a JSON key and download it
7. Share the Google Sheet with the service account email (Viewer access is sufficient)
8. Base64-encode the JSON key:

```bash
base64 -i service-account.json | tr -d '\n'
```

9. Add to Vercel environment variables:
   - `GOOGLE_SERVICE_ACCOUNT_JSON` = the base64 string
   - `FB_ADS_SHEET_ID` = the Sheet ID from step 1.3

---

## 3. Make.com Scenario Setup

### Module 1: Schedule (Trigger)

- **Type**: Schedule
- **Interval**: Every 1 day
- **Time**: 06:00 (AEST)

### Module 2: Facebook Ads — Get Ad Insights

- **Connection**: Connect your Facebook Ads account
- **Ad Account ID**: Your ad account ID (act_XXXXXXXXX)
- **Level**: `ad` (most granular — rolls up to campaign/ad set)
- **Date Preset**: `yesterday` (for daily sync) or `last_30d` (for backfill)
- **Time Increment**: `1` (daily)
- **Fields** (select ALL of these):

```
date_start
campaign_id
campaign_name
objective
adset_id
adset_name
ad_id
ad_name
spend
impressions
reach
inline_link_clicks
actions (landing_page_view, offsite_conversion)
action_values (offsite_conversion)
cpm
```

- **Attribution Window**: `7d_click` (default, matches dashboard expectation)
- **Breakdowns**: None (or `hourly_stats_aggregated_by_advertiser_time_zone` for hourly data)

### Module 3: Iterator

- Iterate over the results array from Module 2

### Module 4: Google Sheets — Add a Row

- **Connection**: Connect with service account or OAuth
- **Spreadsheet**: Select `SuperNova FB Ads Data`
- **Sheet**: Sheet1
- **Map values**:

| Column | Make.com Field |
|--------|---------------|
| Date | `date_start` |
| Campaign ID | `campaign_id` |
| Campaign Name | `campaign_name` |
| Campaign Objective | `objective` |
| Ad Set ID | `adset_id` |
| Ad Set Name | `adset_name` |
| Ad ID | `ad_id` |
| Ad Name | `ad_name` |
| Creative Name | *(see Note 1)* |
| Spend | `spend` |
| Impressions | `impressions` |
| Reach | `reach` |
| Link Clicks | `inline_link_clicks` |
| Landing Page Views | `actions.landing_page_view.value` |
| Conversions | `actions.offsite_conversion.value` |
| Conversion Value | `action_values.offsite_conversion.value` |
| Attribution Window | `7d_click` (static text) |
| CPM | `cpm` |
| Hour of Day | *(empty unless hourly breakdown)* |
| Day of Week | *(empty — dashboard derives from date)* |

---

## 4. Creative Name Mapping

**Note 1**: Facebook API doesn't provide a "Creative Name" field directly. Options:

### Option A: Ad Name Convention (Recommended)
Use a naming convention in your ad names, e.g.:
```
[Creative] Celebration Photo v1 - 18-35
[Creative] Squad Standing v2 - Retarget
```

Then in Make.com, use a **Text Parser** module to extract the creative name:
- Pattern: `\[Creative\]\s*(.+?)\s*-`
- Output: Group 1 → Creative Name column

### Option B: Manual Mapping
Create a second sheet tab `Creative Map` with two columns:
- `Ad ID` | `Creative Name`
- Use a Make.com **Lookup** module to match

### Option C: Use Ad Creative API
Add a second Facebook API module:
- **Endpoint**: `GET /ad_id/adcreatives`
- **Fields**: `name, title`
- Map the creative name to the spreadsheet

---

## 5. Backfill Historical Data

For initial setup, run the scenario once with:
- **Date Preset**: `last_90d` or `last_180d`
- **Time Increment**: `1` (daily)

This populates historical data. Then switch to `yesterday` for daily runs.

**Important**: The dashboard handles duplicate rows gracefully — same date+campaign+ad combinations will be summed correctly.

---

## 6. Error Handling

### Make.com
- Add an **Error Handler** module after the Google Sheets module
- Type: **Resume** (skip failed rows, log warning)
- Add a **Slack/Email notification** on scenario failure

### Dashboard
- If Google Sheets API is slow (>8s), the dashboard returns a timeout error
- Users can fall back to CSV upload
- The API route has an 8-second timeout (Vercel hobby plan = 10s limit)

### Common Issues

| Issue | Fix |
|-------|-----|
| "Sheet is empty" | Check Make.com scenario ran successfully |
| "Token exchange failed" | Re-download service account JSON, re-encode base64 |
| "Google Sheets API error: 403" | Share the sheet with the service account email |
| "Connection timed out" | Data too large — reduce date range or paginate |
| Duplicate rows appearing | Add a **Search Row** module before **Add Row** to check for existing date+ad_id |

---

## 7. Environment Variables (Vercel)

```env
# Base64-encoded Google service account JSON
GOOGLE_SERVICE_ACCOUNT_JSON=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Li...

# Google Sheet ID from URL
FB_ADS_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
```

Add both to **Vercel → Settings → Environment Variables** (Production + Preview).

---

## 8. Verification Checklist

- [ ] Google Sheet has correct headers in Row 1
- [ ] Service account has Viewer access to the sheet
- [ ] Make.com scenario runs successfully (check execution logs)
- [ ] Dashboard loads data from Google Sheets (try the "Google Sheets" toggle)
- [ ] Daily schedule is set to 06:00 AEST
- [ ] Error notifications configured (Slack/email)
- [ ] Backfill completed (90+ days of data)
- [ ] Creative names are populated (via naming convention or mapping)
