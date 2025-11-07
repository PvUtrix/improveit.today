# ImproveIt.Today - Feature Specifications

## User Personas

### 1. Reporter (General Public)
**Goals**: Report problems in their environment, track resolution
**Pain Points**: Authorities don't listen, no transparency, problems ignored
**Needs**: Easy reporting, visibility, sense of impact

### 2. Voter (Engaged Citizen)
**Goals**: Signal which problems matter most in their community
**Pain Points**: Don't have resources to fix things themselves
**Needs**: Simple way to show support, see impact of votes

### 3. Solver (Individual/Company)
**Goals**: Find paid work, build reputation, help community
**Pain Points**: Hard to find opportunities, trust issues
**Needs**: Browse problems, submit bids, get paid securely

### 4. Funder (Donor/Charity)
**Goals**: Support meaningful causes, see direct impact
**Pain Points**: Unsure if money is used effectively
**Needs**: Transparency, verification, impact metrics

### 5. Authority (Government/Organization)
**Goals**: Receive legitimate reports, prioritize resources, maintain accountability
**Pain Points**: Spam reports, unclear priorities, public pressure
**Needs**: Filtered notifications, dashboard, response tracking

---

## Feature Details

### 🤖 Telegram Bot Interface (MVP)

#### User Flow: Reporting a Problem

**Step 1: Start**
```
User: /start

Bot:
👋 Welcome to ImproveIt.Today!

Help improve your community by reporting problems:
🚨 Potholes, broken infrastructure
💡 Missing streetlights
🗑️ Trash accumulation
🏗️ Unsafe structures
...and much more!

What would you like to do?
[Report Problem] [Browse Map] [My Reports] [Help]
```

**Step 2: Report Problem**
```
User: [Taps "Report Problem"]

Bot:
📍 Please share the location of the problem.

You can:
• Share your current location 📲
• Send any location from the map 🗺️
• Type an address 🏠

[Share Location] [Cancel]
```

**Step 3: Location Shared**
```
User: [Shares location]

Bot:
✅ Location received: 123 Main St, Springfield

📸 Please send a photo of the problem (optional but recommended)

[Skip Photo] [Cancel]
```

**Step 4: Photo Upload**
```
User: [Sends photo]

Bot:
✅ Photo received

📝 Please describe the problem:
(Keep it concise - 1-3 sentences)
```

**Step 5: Description**
```
User: Large pothole on Main St, dangerous for cars and bikes

Bot:
🏷️ What category best describes this problem?

[🚗 Roads] [💡 Lighting] [🗑️ Waste] [🏗️ Infrastructure]
[🌳 Environment] [🚧 Safety] [Other]
```

**Step 6: Category Selection**
```
User: [Taps "Roads"]

Bot:
✅ Problem submitted successfully!

📊 Problem #12345
📍 Location: 123 Main St, Springfield
🏷️ Category: Roads
⬆️ Votes: 1 (you)

Your problem is now visible on the map. Others can vote to increase priority.

[View on Map] [Share Problem] [Back to Menu]

💡 Tip: Share with neighbors to get more votes!
```

#### User Flow: Browsing Problems

**Nearby Problems**
```
User: /nearby

Bot:
📍 Showing problems near you (5km radius):

1. 🚗 Large pothole on Main St
   ⬆️ 47 votes • 📍 200m away • ⏰ 3 days ago
   [View Details] [Upvote]

2. 💡 Broken streetlight on Oak Ave
   ⬆️ 23 votes • 📍 450m away • ⏰ 1 week ago
   [View Details] [Upvote]

3. 🗑️ Overflowing trash bin at Park
   ⬆️ 89 votes • 📍 800m away • ⏰ 2 days ago
   [View Details] [Upvote]

[Show More] [Change Radius] [View Map]
```

**Problem Details**
```
User: [Taps "View Details" on problem #12345]

Bot:
🚗 Problem #12345: Large pothole on Main St

📍 Location: 123 Main St, Springfield
🏷️ Category: Roads
📅 Reported: Nov 5, 2025 (2 days ago)
👤 Reporter: @john_doe (⭐ 4.5 reputation)

📝 Description:
Large pothole on Main St, dangerous for cars and bikes. Approximately 2 feet wide and 6 inches deep.

📊 Statistics:
⬆️ 47 upvotes
💰 $150 estimated cost
🎯 Status: Escalated to City Roads Dept
🔔 Authority notified: Nov 6, 2025

💼 Bids: 2 solvers interested
🏆 Top bid: $120 by ABC Paving Co.

[⬆️ Upvote] [💰 Fund This] [📷 View Photos]
[💬 Comments] [🔔 Follow Updates] [📤 Share]
```

#### Commands Reference

```
/start - Welcome message and main menu
/report - Report a new problem
/nearby - Show problems near you
/my_reports - Your submitted problems
/my_votes - Problems you've voted for
/search [keyword] - Search problems
/map - View interactive map
/profile - Your profile and settings
/solver - Register as a solver
/help - Help and FAQ
/settings - Adjust preferences

Admin/Solver Commands:
/bid [problem_id] - Submit a bid
/my_bids - View your bids
/dashboard - Solver dashboard
```

#### Inline Keyboards

**Main Menu**
```
┌─────────────────────────────┐
│   📝 Report Problem          │
├─────────────────────────────┤
│   🗺️ Browse Map             │
├─────────────────────────────┤
│   📊 My Reports              │
├─────────────────────────────┤
│   ⬆️ My Votes                │
├─────────────────────────────┤
│   👤 Profile                 │
├─────────────────────────────┤
│   ❓ Help                    │
└─────────────────────────────┘
```

**Problem Actions**
```
┌────────────┬────────────┬────────────┐
│ ⬆️ Upvote   │ 💰 Fund     │ 📤 Share    │
├────────────┴────────────┴────────────┤
│ 💬 Comments                          │
├──────────────────────────────────────┤
│ 🔔 Follow Updates                    │
└──────────────────────────────────────┘
```

---

### 🗺️ Interactive Map (Web Interface)

#### Map Features

**Visual Elements**
- Problems displayed as pins/markers
- Color-coded by category:
  - 🔴 Red: Safety/Urgent
  - 🟠 Orange: Infrastructure
  - 🟡 Yellow: Environment
  - 🟢 Green: Low priority
  - 🔵 Blue: Resolved
- Pin size scales with vote count
- Clustering for nearby problems (when zoomed out)

**Map Interactions**
- Click pin → Show problem details in sidebar
- Hover pin → Show quick preview (title, votes, category)
- Draw area → Filter problems in area
- Heatmap toggle → Show problem density

**Filters & Controls**
```
┌─────────────────────────────┐
│ 🔍 Search: _______________  │
├─────────────────────────────┤
│ Category: [All ▼]           │
│ Status: [All ▼]             │
│ Date: [All time ▼]          │
│ Votes: Min [0] Max [∞]      │
├─────────────────────────────┤
│ ☐ Show Resolved             │
│ ☐ Show Funded               │
│ ☐ Heatmap View              │
└─────────────────────────────┘
```

**Sidebar - Problem Details**
```
┌─────────────────────────────────┐
│  [← Back]          [✕ Close]    │
├─────────────────────────────────┤
│  🚗 Large pothole on Main St    │
│  Problem #12345                 │
├─────────────────────────────────┤
│  📸 [Image Gallery]             │
├─────────────────────────────────┤
│  📍 123 Main St, Springfield    │
│  🏷️ Category: Roads             │
│  📅 Reported: 2 days ago        │
├─────────────────────────────────┤
│  📊 47 ⬆️ upvotes               │
│  [⬆️ Upvote This Problem]       │
├─────────────────────────────────┤
│  💰 Funding: $85 / $150 (57%)   │
│  ████████░░░░░░                 │
│  [💰 Contribute]                │
├─────────────────────────────────┤
│  🎯 Status: Escalated           │
│  🔔 City Roads Dept notified    │
├─────────────────────────────────┤
│  💼 2 Bids from Solvers         │
│  🏆 Best: $120 (ABC Paving)     │
│  [View All Bids]                │
├─────────────────────────────────┤
│  💬 12 Comments                 │
│  [View Comments]                │
└─────────────────────────────────┘
```

---

### 🌍 3D Globe Visualization

#### Visual Concept

**Globe Appearance**
- Realistic Earth texture with country borders
- Day/night cycle (visual effect)
- Smooth rotation and zoom
- Problems appear as glowing points
- Vote intensity = vertical line/spike height

**Problem Visualization**
```
High votes (1000+):  ┃ Tall spike
Medium votes (100+): │ Medium spike
Low votes (<100):    • Small dot
```

**Color Coding**
- 🔴 Red spike: Critical/urgent (high votes, long open)
- 🟠 Orange spike: Important (medium-high votes)
- 🟡 Yellow spike: Normal (medium votes)
- 🟢 Green spike: Recently resolved (celebratory)

**Interactions**
- Click country → Zoom to country level
- Click spike → Show problem details
- Rotate globe by dragging
- Filter by category (buttons overlay)
- Timeline slider (show how problems evolved over time)

**Statistics Overlay**
```
┌─────────────────────────────┐
│  🌍 Global Impact           │
├─────────────────────────────┤
│  📊 234,567 Problems        │
│  ✅ 89,234 Resolved (38%)   │
│  💰 $4.5M Funded            │
│  👥 1.2M Active Users       │
│  🏆 12,345 Solvers          │
└─────────────────────────────┘
```

---

### 💼 Solver Features

#### Solver Registration

**Profile Setup**
```
1. Account Type:
   ☐ Individual
   ☐ Team/Group
   ☐ Registered Company
   ☐ NGO/Charity

2. Skills & Expertise:
   ☑ Road Repairs
   ☑ Electrical Work
   ☐ Plumbing
   ☐ Carpentry
   ☐ Painting
   ...

3. Service Areas:
   [Add locations/regions]
   • Springfield, IL (50km radius)
   • Nearby counties

4. Verification Documents:
   📄 Business License (optional)
   📄 Insurance Certificate (optional)
   📄 Portfolio/Past Work

5. Pricing:
   Hourly rate: $___/hr
   Available for: Fixed bids ☑ Hourly ☑
```

#### Solver Dashboard

```
┌─────────────────────────────────────────────┐
│  👷 Solver Dashboard - ABC Paving Co.       │
├─────────────────────────────────────────────┤
│  ⭐ Rating: 4.8/5 (23 reviews)              │
│  ✅ Completed: 15 jobs                      │
│  💰 Earned: $12,450                         │
│  📈 Success Rate: 94%                       │
├─────────────────────────────────────────────┤
│  📌 AVAILABLE JOBS NEAR YOU                 │
├─────────────────────────────────────────────┤
│  1. 🚗 Pothole repair - Main St             │
│     💰 Budget: $150 • ⬆️ 47 votes           │
│     📍 2.3 km away • 🔔 2 days ago          │
│     [View Details] [Submit Bid]             │
├─────────────────────────────────────────────┤
│  2. 💡 Streetlight repair - Oak Ave         │
│     💰 Budget: $200 • ⬆️ 89 votes           │
│     📍 5.1 km away • 🔔 1 week ago          │
│     [View Details] [Submit Bid]             │
├─────────────────────────────────────────────┤
│  📊 MY BIDS (3 active)                      │
├─────────────────────────────────────────────┤
│  • Broken bench repair - Park               │
│    Status: Pending • Bid: $120              │
├─────────────────────────────────────────────┤
│  🔨 ACTIVE JOBS (1)                         │
├─────────────────────────────────────────────┤
│  • Sidewalk repair - Elm St                 │
│    Deadline: 3 days • [Update Progress]     │
└─────────────────────────────────────────────┘
```

#### Bidding Interface

```
┌─────────────────────────────────────────────┐
│  Submit Bid - Problem #12345                │
├─────────────────────────────────────────────┤
│  🚗 Large pothole on Main St                │
│  📍 123 Main St, Springfield                │
├─────────────────────────────────────────────┤
│  💰 Your Bid Amount: $______                │
│  📅 Timeline: _____ days                    │
│  💼 Labor: $______                          │
│  🛠️ Materials: $______                      │
│  📊 Other Costs: $______                    │
├─────────────────────────────────────────────┤
│  📝 Work Plan:                              │
│  ┌───────────────────────────────────────┐ │
│  │                                       │ │
│  │  [Describe your approach...]          │ │
│  │                                       │ │
│  └───────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│  📅 Proposed Start Date: [____]             │
│  ⏰ Estimated Duration: ___ days/hours      │
│  🛡️ Warranty Period: ___ months             │
├─────────────────────────────────────────────┤
│  📄 Attachments (optional):                 │
│  [Upload references, portfolio, etc.]       │
├─────────────────────────────────────────────┤
│  [ Cancel ]              [ Submit Bid ]     │
└─────────────────────────────────────────────┘
```

---

### 💰 Funding & Payment Features

#### Crowdfunding Campaign

**Campaign Page**
```
┌─────────────────────────────────────────────┐
│  💰 Fund This Problem                       │
├─────────────────────────────────────────────┤
│  🚗 Large pothole on Main St                │
│  Problem #12345                             │
├─────────────────────────────────────────────┤
│  Goal: $150 • Raised: $85 (57%)             │
│  ████████████░░░░░░░                        │
├─────────────────────────────────────────────┤
│  👥 12 Contributors                         │
│  ⏰ 15 days remaining                       │
├─────────────────────────────────────────────┤
│  💵 Contribute Amount:                      │
│  [$5] [$10] [$25] [$50] [Custom: $___]     │
├─────────────────────────────────────────────┤
│  💳 Payment Method:                         │
│  ☐ Credit Card                              │
│  ☐ PayPal                                   │
│  ☐ Cryptocurrency                           │
├─────────────────────────────────────────────┤
│  ☑ Show my name as contributor              │
│  ☐ Make this contribution anonymous         │
├─────────────────────────────────────────────┤
│  [ Cancel ]        [ Contribute Now ]       │
└─────────────────────────────────────────────┘
```

**Funding Sources Breakdown**
```
┌─────────────────────────────────────────────┐
│  💰 Funding Sources                         │
├─────────────────────────────────────────────┤
│  👥 Public Crowdfunding:      $85 (57%)     │
│  🏛️ Government Matching:      $40 (27%)     │
│  🏢 Corporate Sponsor:        $25 (16%)     │
│  ──────────────────────────────────────     │
│  📊 Total Raised:             $150 ✅       │
└─────────────────────────────────────────────┘
```

#### Escrow & Payment Flow

```
1. Problem reported → Bidding opens
2. Bids submitted → Community/reporter selects winner
3. Funding goal reached → Funds move to escrow
4. Solver starts work → Progress updates posted
5. Work completed → Solver requests release
6. Community/reporter verifies → Funds released to solver
7. Guarantee period starts → Funds held in reserve (10-20%)
8. Guarantee expires → Reserve released to solver
```

---

### 🏛️ Authority Dashboard

#### Authority Portal

```
┌─────────────────────────────────────────────┐
│  🏛️ Springfield City Roads Department      │
├─────────────────────────────────────────────┤
│  📊 Dashboard Overview                      │
├─────────────────────────────────────────────┤
│  🚨 High Priority (100+ votes):        7    │
│  ⚠️ Medium Priority (50-99 votes):    15    │
│  📋 New Reports (this week):          23    │
│  ✅ Resolved (this month):            45    │
├─────────────────────────────────────────────┤
│  📍 Problems in Your Jurisdiction           │
├─────────────────────────────────────────────┤
│  1. 🚗 Large pothole - Main St              │
│     ⬆️ 247 votes • 🔴 URGENT                │
│     [Acknowledge] [Assign Team] [View]      │
├─────────────────────────────────────────────┤
│  2. 🚧 Broken guardrail - Highway 55        │
│     ⬆️ 189 votes • 🔴 URGENT                │
│     Status: Team assigned                   │
│     [Update Status] [View]                  │
├─────────────────────────────────────────────┤
│  3. 💡 Streetlight out - Park Ave           │
│     ⬆️ 92 votes • 🟠 HIGH                   │
│     [Acknowledge] [Assign Team] [View]      │
├─────────────────────────────────────────────┤
│  📈 Performance Metrics                     │
│  • Avg Response Time: 2.3 days              │
│  • Avg Resolution Time: 12 days             │
│  • Community Satisfaction: 78%              │
└─────────────────────────────────────────────┘
```

#### Notification Preferences

```
┌─────────────────────────────────────────────┐
│  🔔 Notification Settings                   │
├─────────────────────────────────────────────┤
│  Trigger: Problem reaches ___ votes         │
│  (Current: 100 votes)                       │
├─────────────────────────────────────────────┤
│  Notification Channels:                     │
│  ☑ Email: roads@springfield.gov             │
│  ☑ SMS: +1-555-0123                         │
│  ☑ Dashboard Alert                          │
│  ☐ Webhook: https://...                     │
├─────────────────────────────────────────────┤
│  Categories to Monitor:                     │
│  ☑ Roads                                    │
│  ☑ Sidewalks                                │
│  ☑ Bridges                                  │
│  ☐ Lighting (Parks Dept)                    │
│  ☐ Waste (Sanitation Dept)                  │
├─────────────────────────────────────────────┤
│  Notification Frequency:                    │
│  ○ Immediate                                │
│  ● Daily Digest (9 AM)                      │
│  ○ Weekly Digest (Monday)                   │
└─────────────────────────────────────────────┘
```

---

### 📊 Analytics & Impact

#### User Impact Dashboard

```
┌─────────────────────────────────────────────┐
│  📊 Your Impact - @john_doe                 │
├─────────────────────────────────────────────┤
│  📝 Problems Reported: 12                   │
│  ✅ Resolved: 8 (67%)                       │
│  ⬆️ Total Votes Received: 345               │
├─────────────────────────────────────────────┤
│  🏆 Achievements                            │
│  ⭐ First Reporter (reported 1 problem)     │
│  ⭐ Community Hero (5 problems resolved)    │
│  ⭐ Vote Leader (100+ votes on your issues) │
├─────────────────────────────────────────────┤
│  💰 Crowdfunding Impact                     │
│  Total Contributed: $125                    │
│  Problems Funded: 8                         │
│  Total Funds Unlocked: $1,240               │
├─────────────────────────────────────────────┤
│  🎯 Reputation Score: 4.5 ⭐                │
│  (Based on report quality & verification)   │
└─────────────────────────────────────────────┘
```

#### Global Impact Stats

```
┌─────────────────────────────────────────────┐
│  🌍 Global Impact                           │
├─────────────────────────────────────────────┤
│  📊 Total Problems Reported: 2,456,789      │
│  ✅ Resolved: 892,345 (36%)                 │
│  ⬆️ Total Votes Cast: 45,678,901           │
│  💰 Total Funds Raised: $45.6M              │
│  👥 Active Users: 3.4M                      │
│  🏆 Active Solvers: 67,890                  │
├─────────────────────────────────────────────┤
│  🌟 Top Countries by Activity               │
│  1. 🇺🇸 United States: 456K problems        │
│  2. 🇮🇳 India: 389K problems                │
│  3. 🇧🇷 Brazil: 234K problems               │
│  4. 🇩🇪 Germany: 198K problems              │
│  5. 🇬🇧 United Kingdom: 156K problems       │
├─────────────────────────────────────────────┤
│  📈 Trending Categories                     │
│  1. 🚗 Roads & Infrastructure (28%)         │
│  2. 💡 Public Lighting (18%)                │
│  3. 🗑️ Waste Management (15%)               │
│  4. 🌳 Environment (12%)                    │
│  5. 🚧 Safety Hazards (11%)                 │
└─────────────────────────────────────────────┘
```

---

### 🔔 Notification System

#### Notification Types

**For Reporters:**
1. Problem acknowledged by authority
2. Problem status changed (in progress, resolved, etc.)
3. Someone upvoted your problem
4. New bid received
5. Funding milestone reached
6. Problem resolved - verification needed

**For Voters:**
1. Problem you voted for was resolved
2. Problem you voted for needs more funding

**For Solvers:**
1. New problem matching your skills in your area
2. Your bid was accepted/rejected
3. Payment released
4. Review received

**For Funders:**
1. Problem you funded was resolved
2. Funding goal reached
3. Impact report available

**For Authorities:**
1. Problem reached vote threshold in your jurisdiction
2. Problem escalated (not addressed in X days)
3. Multiple similar problems reported (clustering alert)

---

### 🔒 Privacy & Safety Features

#### Privacy Controls

```
┌─────────────────────────────────────────────┐
│  🔒 Privacy Settings                        │
├─────────────────────────────────────────────┤
│  Profile Visibility:                        │
│  ● Public (anyone can see)                  │
│  ○ Community only (registered users)        │
│  ○ Private (only me)                        │
├─────────────────────────────────────────────┤
│  Show on Problem Reports:                   │
│  ☑ Username                                 │
│  ☐ Real name                                │
│  ☐ Location history                         │
├─────────────────────────────────────────────┤
│  Anonymous Reporting:                       │
│  ☐ Allow me to report anonymously           │
│  (Note: Reduces report credibility)         │
├─────────────────────────────────────────────┤
│  Data Sharing:                              │
│  ☑ Share aggregated stats                   │
│  ☐ Allow authorities to contact me          │
│  ☐ Show my contributions publicly           │
└─────────────────────────────────────────────┘
```

#### Reporting & Moderation

```
Problems can be flagged for:
• Spam
• Duplicate
• False report
• Inappropriate content
• Dangerous/illegal request

Moderator review within 24 hours
User can appeal decisions
Repeat violators: account suspension
```

---

## Quality & Verification

### Problem Verification

**Status Progression:**
```
1. Reported → Initial submission
2. Verified → Moderator or community confirmed (photos, multiple reports)
3. Escalated → Reached vote threshold, authority notified
4. In Progress → Solver working on it
5. Pending Verification → Solver claims completion
6. Resolved → Community verified completion
7. Reopened → Problem recurred (within guarantee period)
```

**Verification Methods:**
- Community vote (5+ users confirm resolution)
- Reporter confirms
- Authority confirms
- Before/after photo comparison
- Location visit verification (trusted verifiers)

---

## Gamification & Engagement

### Achievements & Badges

**Reporter Badges:**
- 🥉 First Report: Submitted 1 problem
- 🥈 Community Watchdog: 10 problems reported
- 🥇 Change Maker: 50 problems reported
- ⭐ Resolution Hero: 80% of your reports resolved

**Voter Badges:**
- 🗳️ Voice of Change: Cast 100 votes
- 🎯 Trend Setter: Voted on 10 problems that reached top 100
- 👁️ Problem Spotter: First to vote on 5 problems

**Solver Badges:**
- 🔧 Quick Fix: Resolved problem in <24 hours
- ⭐ 5-Star Solver: Maintained 5-star rating for 20+ jobs
- 🏆 Community Champion: Resolved 100 problems
- 💎 Trusted Pro: Verified business, insurance, 50+ jobs

**Funder Badges:**
- 💰 First Contributor: Made first contribution
- 🌟 Generous Donor: Contributed $500+
- 🎯 Impact Investor: Funded 20+ problems

### Leaderboards

**Global Leaderboards:**
- Top Reporters (by problems resolved)
- Top Voters (by impact of votes)
- Top Solvers (by rating & jobs completed)
- Top Funders (by total contributions)

**Local Leaderboards:**
- By city
- By neighborhood
- By category

---

**Last Updated**: 2025-11-07
