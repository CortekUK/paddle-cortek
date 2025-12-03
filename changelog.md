## 2025-11-14

### Social Media Template & Scheduling Improvements

- **Removed Target Field from Competitions/Academies Scheduled Send Form** (2025-11-14)
  - Removed "Day to send" (TODAY/TOMORROW) field from scheduled send form for COMPETITIONS_ACADEMIES category
  - Target field now defaults to 'TODAY' for this category
  - Target field still visible for AVAILABILITY and PARTIAL_MATCHES categories

- **Fixed Template Background Image Zoom Issue** (2025-11-14)
  - Changed default `bgFit` from 'cover' to 'contain' in TemplateDesigner
  - New templates now show full image by default instead of zoomed in
  - Users can still change to 'cover' mode if needed via properties panel
  - Fixes issue where 1080x920 images appeared zoomed in during template design

- **Added Template Name Display in Renders List** (2025-11-14)
  - Updated `social_post_renders` query to join with `social_templates` table
  - Template name now displays in renders list below the source badge
  - Makes it easier to identify which template was used for each render

- **Improved Copy Button Styling in Renders** (2025-11-14)
  - Enhanced copy button styling with better spacing (gap-1.5)
  - Increased icon size from h-3 w-3 to h-3.5 w-3.5 for better visibility
  - Added title attribute for better accessibility

- **Verified Social Media Post Section Availability** (2025-11-14)
  - Confirmed SocialPostBuilder is available for:
    - Court Availability (already implemented)
    - Partial Matches (already implemented)
    - Competitions & Academies (already implemented)

- **Verified History/Log View** (2025-11-14)
  - Confirmed history/log view already exists in ScheduledSendsV2 component
  - Shows recent runs with success/failure status
  - Includes log details modal for viewing full run details
  - Filters logs by category automatically

- **Event Locking Implementation for Social Templates - COMPLETED** (2025-11-14)
  - **Database Schema**:
    - Added migration `20251114092832_add_event_locking_to_social_templates.sql` to add `event_id`, `summary_variant`, and `source_category` fields to `social_templates` table
    - Added migration `20251114100000_add_event_id_to_social_post_schedules.sql` to add `event_id` field to `social_post_schedules` table
    - Added indexes for faster queries on `event_id` fields
  - **Scheduler Function (`run-social-post-schedules`)**:
    - Completely rewrote scheduler to use locked event/variant from templates
    - Added proper summary generation functions (`generateTournamentSummary`, `generateCompetitiveOpenMatchesSummary`, `generateAvailabilitySummary`) from `run-scheduled-sends-v2`
    - Implemented event filtering by locked `event_id` for competitions - filters tournaments/lessons/classes by event_id when template has it locked
    - Implemented variant filtering for partial matches (competitive-open-1, competitive-open-2, competitive-open-3)
    - Added organization relationship to fetch `tenant_id` and `club_name`
    - Uses template's locked `event_id` and `summary_variant` when available, falls back to schedule values
    - Filters out "Untitled" events and full events automatically
    - Generates detailed summaries with dates, times, spaces left, join URLs for competitions
  - **Schedule Creation (`MultiLayerSocialPostBuilder`)**:
    - Updated `handleSchedule` to save locked `event_id` and `summary_variant` from template when creating schedules
    - Uses template's `source_category` if available
    - Saves locked values to schedule for faster access
  - **Generate Now (`MultiLayerSocialPostBuilder`)**:
    - Updated `handleGenerateNow` to use locked `event_id` and `summary_variant` from template
    - Uses locked variant when calling render function
    - Logs locked values for debugging
  - **Template Designer**:
    - Templates can store locked `event_id`, `summary_variant`, and `source_category` values
    - When a template with locked values is selected, it uses those values instead of page context
    - Infrastructure is complete - UI to set these values can be added later if needed
  - **Integration**:
    - Templates with locked event/variant will use those values when scheduled
    - Scheduler automatically filters competitions by locked event_id
    - Scheduler automatically filters partial matches by locked variant
    - All scheduled posts now use proper summary generation with detailed formatting

## 2025-01-27

### Template Designer Text Visibility Fixes

- **Text Height Calculation Improvements** (2025-01-27)
  - **CRITICAL FIX**: Textbox is now added to canvas FIRST before calculating height - Fabric.js needs object on canvas to measure text properly
  - Enhanced height recalculation logic using three methods:
    1. `_textLines` array (most accurate - Fabric.js internal calculation)
    2. `calcTextHeight()` method (Fabric.js built-in method)
    3. Fallback calculation based on text length (most generous)
  - Removed `maxHeight` and `clipPath` constraints that could clip text
  - Increased padding from 40-50px to 60-80px to ensure no text is ever cut off
  - Changed character width estimate from 0.5x to 0.45x fontSize for more conservative calculation
  - Added multiple recalculations at 50ms, 150ms, 300ms, and 500ms intervals to ensure accuracy
  - Height always grows, never shrinks to ensure text is never cut off
  - Applied fixes to all locations:
    - New text layer creation (`addLayer` function)
    - Existing layer loading (`loadExistingLayers` function)
    - Text editing completion event (`text:editing:exited`)
    - Text changed event (`text:changed`)
  - Force recalculation by updating text property to trigger Fabric.js internal measurement

- **RLS Policy Fix for Social Templates Storage** (2025-01-27)
  - Created migration `20250120000002_fix_social_templates_storage_rls.sql`
  - Simplified RLS policies to directly check `organization_members` table
  - Removed dependency on `get_user_org_id` function
  - Fixed image upload errors in Template Designer
  - Policies now check if user belongs to organization matching the first folder in storage path

## 2025-01-26

### Complete Scheduler Implementation for PARTIAL_MATCHES & COMPETITIONS_ACADEMIES

- **PARTIAL_MATCHES Scheduler** (2025-01-26)
  - Added `has_players: 'TRUE'` parameter to fetchMatchesData to only get matches with players
  - Implemented summary variant filtering (1_PLAYER, 2_PLAYERS, 3_PLAYERS, 1_3_PLAYERS)
  - Replaced simple summary with detailed `formatMatchWhatsAppBlock` formatting
  - Uses `generateCompetitiveOpenMatchesSummary` for complete match details with locations, levels, players
  - Filters by cancelled status, join_requests_info status, competition_mode, and match_type
  - Enriches matches with player data (allPlayers, registeredPlayers, spacesLeft) for display

- **COMPETITIONS_ACADEMIES Scheduler** (2025-01-26)
  - Fixed fetchCompetitionsData to fetch tournaments, lessons, and classes separately using Promise.all
  - Combines all events into single array with type markers
  - Filters out "Untitled" events automatically
  - Filters by event_id if specified in template or schedule
  - Skips full events (checks participant counts using getPlayerCapacity)
  - Generates detailed tournament summaries using generateTournamentSummary with dates, times, spaces left, join URLs
  - Logs skipped full events for visibility

- **One-Off Scheduling Support** (2025-01-26)
  - Added support for `is_one_off` flag in run-scheduled-sends-v2
  - One-off schedules marked as COMPLETED after execution (no next_run_at_utc)
  - Custom date ranges supported via `date_start_utc` and `date_end_utc` fields
  - Uses custom date ranges when provided, otherwise falls back to TODAY/TOMORROW logic
  - Properly handles datetime-local conversion for one-off run_at_utc

- **Skip Full Events Logic** (2025-01-26)
  - Checks participant counts before sending for COMPETITIONS_ACADEMIES
  - Skips events where registered >= max_players
  - Logs as SKIPPED status with message "No data available to send"
  - Updates schedule with last_status: SKIPPED
  - Shows skipped count in logs for debugging

- **Template Auto-Load in Scheduler** (2025-01-26)
  - When template selected in ScheduledSendsV2, auto-fills:
    - whatsapp_group from template
    - summary_variant from template
    - event_id (linked_event_id) from template
  - Template configuration is loaded from message_templates table
  - Fixed summary variant values to match backend: 1_PLAYER, 2_PLAYERS, 3_PLAYERS, 1_3_PLAYERS

- **Custom Date Range UI** (2025-01-26)
  - Added custom date range inputs for COMPETITIONS_ACADEMIES one-off schedules
  - Supports date_start_utc and date_end_utc for flexible date selection
  - UI shows datetime-local inputs with proper UTC conversion
  - One-off toggle shows either run_at_date_local input or custom range inputs
  - Properly handles timezone conversion using clubTimezone

- **Enhanced Query & Data Fetching** (2025-01-26)
  - Updated scheduled_sends_v2 query to include summary_variant, linked_event_id from message_templates
  - Helper functions moved before Deno.serve() to fix deployment errors
  - Removed duplicate helper function definitions
  - All helper functions (formatTournamentDateTime, getPlayerCapacity, generateTournamentSummary, formatMatchWhatsAppBlock, generateCompetitiveOpenMatchesSummary) now properly defined before serve()

- **Improved Error Handling & Logging** (2025-01-26)
  - Added SKIPPED status logging for schedules with no data
  - Better error messages distinguishing between fetch errors and application errors
  - Enhanced logging for competitions data fetching and filtering
  - Logs skipped full events count for visibility
  - Proper error handling for empty summaries

## 2025-10-30

- Performed a full project review: frontend routing/auth, Supabase client, key hooks, services, and all critical edge functions. Skimmed migrations to map core tables used by the app (`profiles`, `organizations`, `organization_members`, `org_automation_settings`, `message_templates`, `scheduled_sends_v2`, `send_logs_v2`, `social_templates`, `social_post_renders`, `user_roles`, `wa_messages_log`).
- Identified main flows: onboarding, client portal, admin console, scheduled sends v2 pipeline, Playtomic integrations, WhatsApp emulator messaging, and social post rendering/storage.
- Noted security considerations: public anon key in frontend, edge function auth variances (some service-role only), and CORS policies.
- Captured questions and follow-ups to validate assumptions before changes.

### Paddle Court Availability Enhancements — Implementation Plan Outline
### Implementation Progress (2025-10-30)
- Social image scheduling
  - Added `social_post_schedules` table with support for DAILY and RANGE_DAILY, plus one-off.
  - Builder Schedule dialog now supports Daily and One-Off Custom Range.
  - `run-social-post-schedules` updated to build context dynamically per source and advance schedules; pause/resume/cancel in UI.
- Social Media Library
  - Added Schedules tab with status, next/last run, and controls.
- Scheduler data isolation fix (2025-10-30)
  - Fixed `run-scheduled-sends-v2` to fetch category-specific data:
    - Court Availability: uses availability endpoint
    - Partial Matches: uses matches endpoint with has_players=TRUE, applies variant filtering (1/2/3/1-3 players), generates detailed WhatsApp-format summaries
    - Competitions & Academies: fetches tournaments/lessons/classes separately, skips untitled/full events, generates detailed tournament summaries
  - Added proper error handling and logging for each category
  - Each scheduler now receives its own unique data based on category field
  - Fixed `ScheduledSendsV2` component to filter schedules by category (only show relevant schedules in each tab)
- WhatsApp timeout error handling (2025-10-30)
  - Fixed function name: changed `send-whatsapp` to `send-whatsapp-message` in PartialMatches and CompetitionsAcademies
  - Improved timeout handling: if message was sent but request timed out, show warning instead of error
  - Added timeout detection in all three pages (Court Availability, Partial Matches, Competitions & Academies)
  - User now sees "Warning" with "may have been sent" message instead of error when timeout occurs (message usually delivered)
- Schedule creation UUID error fix (2025-10-30)
  - Fixed `invalid input syntax for type uuid: ""` error when creating schedules without template
  - Added validation: template_id is now required for new schedules (frontend + backend)
  - Added sanitization: empty strings for UUID fields (template_id, event_id) are converted to null
  - Fixed one-off schedule datetime handling: datetime-local input now properly converts to UTC using club timezone
  - Edge function now validates and sanitizes all optional fields before database insert/update
- Template save category constraint fix (2025-10-30)
  - Fixed `message_templates_category_check` constraint violation error
  - Created migration to update category constraint: allows 'AVAILABILITY', 'PARTIAL_MATCHES', 'COMPETITIONS_ACADEMIES'
  - Previous constraint only allowed 'COURT_AVAILABILITY', 'PARTIAL_MATCHES', 'COMPETITIONS' which didn't match codebase usage
- Create button debugging (2025-10-30)
  - Added console logging to `handleSave` to debug button click issues
  - Added better error messages for missing organization/profile
  - Added request/response logging for edge function calls
- Date picker visibility fix (2025-10-30)
  - Fixed date picker buttons being cut off in COMPETITIONS_ACADEMIES schedule modal
  - Increased modal width from `max-w-md` to `max-w-lg` for better spacing
  - Changed custom date range inputs from side-by-side grid to vertical stack layout
  - Added `w-full` class to date inputs to ensure calendar buttons are fully visible
  - Created helper function `isoToDatetimeLocal` for cleaner date format conversion
- Scheduler run now and improved logging (2025-10-30)
  - Added "Run Now" button (clock icon) in schedule actions to trigger immediate execution
  - Added "Trigger Immediately" button (send icon) that directly calls edge function for instant execution (bypasses cron)
  - Run Now button sets next_run_at_utc to 2 minutes from now for better reliability
  - Auto-refresh logs disabled per user request (logs refresh manually or on page load)
  - Toast message shows exact run time in schedule's timezone
  - Added SKIPPED status display in logs with yellow/warning badge for schedules skipped due to no data
  - Added tooltips to all action buttons for better UX
  - Improved error visibility: schedules skipped because no competitions/events found will show as SKIPPED in logs
- COMPETITIONS_ACADEMIES scheduler fix (2025-10-30)
  - Fixed error handling in fetchCompetitionsData - now handles individual endpoint failures gracefully
  - Added comprehensive logging for competitions data fetching and filtering
  - Improved error messages with full error details
  - Added validation for empty summaries before sending
  - Enhanced date_display_short generation error handling
  - Fixed catch block to ensure summary and count_slots are always set even on error
- Time verification and debugging improvements (2025-10-30)
  - Added verification step after updating next_run_at_utc to ensure database update succeeded
  - Increased wait time from 500ms to 1000ms for database commit
  - Added detailed logging in edge function to show query parameters and found schedules
  - Added logging for each schedule's next_run_at_utc and category when processing
  - Improved time comparison logging to debug schedule pickup issues
  - Fixed timezone format comparison (+00:00 vs Z format)
  - Added debug query to show all ACTIVE schedules with timestamp comparison
- Edge function error handling fix (2025-10-30)
  - Changed from Supabase client invoke to direct fetch for send-whatsapp-message calls
  - Now extracts actual error response body instead of generic "non-2xx status code" message
  - Better error parsing: handles both JSON and text responses
  - Shows HTTP status code, status text, and full error details in logs
  - Improved error visibility for debugging WhatsApp message sending issues
  - Fixed error handling: send-whatsapp-message always returns HTTP 200, so we check responseBody.status instead
  - Added proper fetch error handling for network errors and timeouts
  - Added 3-minute timeout for fetch requests with AbortController
  - Better error messages distinguishing between HTTP errors and response status errors
- Frontend edge function call fix (2025-10-30)
  - Changed handleTriggerNow in ScheduledSendsV2.tsx to use direct fetch instead of supabase.functions.invoke
  - Now provides detailed error messages with HTTP status codes and response bodies
  - Better debugging: shows full response details in console logs
  - Handles authentication by getting session token manually
  - Improved error parsing for both JSON and text responses
- Edge function deployment fix (2025-10-30)
  - Fixed syntax error: moved all helper functions before Deno.serve() call
  - Removed duplicate function definitions that were after Deno.serve() closes
  - Fixed try-catch structure in fetch error handling
  - Removed orphaned catch block that was causing syntax errors
  - All functions now properly defined before Deno.serve() as required by Deno edge functions
  - Changed from Deno.serve to serve (imported from std library) to match working examples
  - Fixed scope error: nextLocal variable now properly defined outside if-else block
  - Added semicolons to match working example style
  - Fixed indentation issues in retry loop
  - Fixed scope error: moved category variable outside try block so it's accessible in catch block
  - Added missing semicolons to all await statements and results.push calls
  - Changed from imported serve to Deno.serve (native Deno API)
  - Note: Still investigating persistent "Expression expected" error at file closing - structure appears correct, all braces match

- Added DB fields and indexes to support summary variants, event IDs, one-off runs, and custom ranges.
- Updated `schedules-v2-upsert` to accept/store new fields.
- Enhanced `run-scheduled-sends-v2` with:
  - Partial Matches variant handling (1/2/3/1–3 players)
  - Competitions/Academies custom ranges and event targeting
  - Skip Untitled and Full events; SKIPPED logs
  - One-off runs set to PAUSED after execution
  - WhatsApp group from schedule/template
- UI updates:
  - Templates now save module/variant/event/group; scheduler auto-fills configuration
  - Scheduler supports one-off and custom ranges for Competitions/Academies
- Tests: Introduced Vitest and unit tests for variant filtering and skip rules (`tests/scheduler.spec.ts`).
- Security: Added `SECURITY.md` with CORS tightening and RLS guidance.


- DB/schema
  - Templates: add `module` (enum: PARTIAL_MATCHES, COMPETITIONS_ACADEMIES), `summary_variant` (nullable), `linked_event_id` (nullable), `whatsapp_group` (text), keep verbatim `content`.
  - Schedules V2: already has `category`; add `summary_variant`, `event_id`, `date_start_utc`, `date_end_utc`, `is_one_off` (bool), and optional `run_at_utc` for one-offs.
  - RLS: ensure org scoping on new fields and tables; indexes on (`category`,`status`,`next_run_at_utc`) and on (`is_one_off`,`run_at_utc`).
- UI
  - Fix Message Builder save: persist module + variant + event ID + group + body.
  - Scheduler: selecting a template auto-fills fields (variant, event, group, date range). Add custom date range picker; support one-off scheduling for competitions/academies.
- Edge functions
  - `run-scheduled-sends-v2`: honor `category` plus new `summary_variant`, `event_id`, custom date ranges; implement skip rules (untitled, full events); use template’s WhatsApp group.
  - `playtomic-fetch`: already supports endpoints; ensure it returns participant counts for competitions/classes for full-checks.
  - Logging: keep `send_logs_v2`/`wa_messages_log` consistent for verification.
- Tests-first
  - Unit tests for summary generation, variant filters, skip-full, time windows, template save/load.
  - Integration tests invoking edge functions with fixtures.


