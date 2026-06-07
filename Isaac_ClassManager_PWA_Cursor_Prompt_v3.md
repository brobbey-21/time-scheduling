# Isaac's Personal Class & Todo PWA — Cursor Project Prompt v2

## Project Overview
A personal Progressive Web App (PWA) for Isaac — a BSc Mining Engineering student at UMaT, Tarkwa Ghana.
Manages class schedules, study blocks, and daily todos with push notifications.
Single user, no auth, fully client-side with IndexedDB persistence.
Installed on iPhone via Safari "Add to Home Screen". Deployed on Vercel.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router only — no `/pages`) |
| Language | TypeScript strict mode |
| Styling | Tailwind CSS (mobile-first) |
| PWA | `next-pwa` |
| Local DB | `idb` (IndexedDB) |
| Notifications | Web Notification API + Service Worker |
| Icons | `lucide-react` |
| Animations | `framer-motion` |
| Fonts | `Sora` (headings) + `DM Sans` (body) via Google Fonts |
| Deployment | Vercel |

---

## Design System

### Philosophy
Premium, warm, light. Feels like a high-end iOS productivity app.
NOT dark. NOT clinical white. Warm off-white base with white cards.
Every element should feel intentional and refined.
No harsh borders. No flat opaque badges. No thin left-border indicators.
Type indicators use full soft-tinted pill badges.
Cards use soft shadows for elevation, not borders.

### Color Tokens (`globals.css`)
```css
:root {
  /* Backgrounds */
  --bg-base: #F5F5F0;        /* warm off-white — main app background */
  --bg-card: #FFFFFF;        /* card surface */
  --bg-card-hover: #FAFAF8;

  /* Text */
  --text-primary: #0F172A;   /* near black */
  --text-secondary: #64748B; /* slate — venue, lecturer, subtitles */
  --text-tertiary: #94A3B8;  /* lightest — timestamps, hints */

  /* Brand */
  --accent: #2563EB;         /* royal blue — primary action, active tab, Next Up card */
  --accent-light: #EFF6FF;   /* blue tint for subtle backgrounds */

  /* Borders & Dividers */
  --border: #E2E8F0;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);

  /* Class Type Pills — background / text / icon color */
  --type-physical-bg: #FEF3C7;   --type-physical-text: #D97706;
  --type-vle-bg: #EDE9FE;        --type-vle-text: #7C3AED;
  --type-practical-bg: #FFEDD5;  --type-practical-text: #EA580C;
  --type-study-bg: #DCFCE7;      --type-study-text: #16A34A;
  --type-rest-bg: #FEE2E2;       --type-rest-text: #DC2626;

  /* Card tints — ultra-soft full-card wash per type */
  --tint-physical: #FFFBEB;
  --tint-vle: #F5F3FF;
  --tint-practical: #FFF7ED;
  --tint-study: #F0FDF4;
  --tint-rest: #FFF5F5;
}
```

### Typography Scale
```css
/* Heading — Sora */
.text-display   { font: 700 28px/1.2 'Sora', sans-serif; }
.text-title     { font: 600 20px/1.3 'Sora', sans-serif; }
.text-subtitle  { font: 600 16px/1.4 'Sora', sans-serif; }

/* Body — DM Sans */
.text-body      { font: 400 15px/1.5 'DM Sans', sans-serif; }
.text-caption   { font: 400 13px/1.4 'DM Sans', sans-serif; }
.text-micro     { font: 500 11px/1.3 'DM Sans', sans-serif; letter-spacing: 0.05em; }
```

### Card Style
```css
.card {
  background: var(--bg-card);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
  padding: 16px;
}
.card:active { transform: scale(0.98); }
```

### Type Badge Component
```tsx
// Soft pill — NOT a flat block, NOT a border
<span className="type-badge" data-type={type}>
  <Icon size={11} />
  {label}
</span>

// CSS:
.type-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 999px;
  font: 600 11px/1 'DM Sans'; letter-spacing: 0.04em;
  text-transform: uppercase;
}
// Each type gets bg + text from tokens above
```

### Class Types
```typescript
type ClassType = 'CLASS_PHYSICAL' | 'CLASS_VLE' | 'PRACTICAL' | 'STUDY' | 'REST';

const TYPE_CONFIG: Record<ClassType, {
  label: string;
  icon: string;       // lucide-react icon name
  bg: string;         // CSS var
  text: string;       // CSS var
  cardTint: string;   // CSS var — ultra-soft card background wash
}> = {
  CLASS_PHYSICAL: { label: 'CLASS',      icon: 'MapPin',        bg: '--type-physical-bg',   text: '--type-physical-text',  cardTint: '--tint-physical'  },
  CLASS_VLE:      { label: 'ONLINE',     icon: 'Wifi',          bg: '--type-vle-bg',        text: '--type-vle-text',       cardTint: '--tint-vle'       },
  PRACTICAL:      { label: 'PRACTICAL',  icon: 'FlaskConical',  bg: '--type-practical-bg',  text: '--type-practical-text', cardTint: '--tint-practical' },
  STUDY:          { label: 'STUDY',      icon: 'BookOpen',      bg: '--type-study-bg',      text: '--type-study-text',     cardTint: '--tint-study'     },
  REST:           { label: 'REST',       icon: 'Coffee',        bg: '--type-rest-bg',       text: '--type-rest-text',      cardTint: '--tint-rest'      },
};
```

---

## Folder Structure

```
/app
  layout.tsx                   < Root layout, fonts, PWA meta, BottomNav
  page.tsx                     < Today view
  /timetable
    page.tsx                   < Full week timetable
  /todos
    page.tsx                   < Daily todo manager
  /manage
    page.tsx                   < All classes list (All / Custom tabs)
    /add
      page.tsx                 < Add new class form
    /[id]
      page.tsx                 < Class detail view
      /edit
        page.tsx               < Edit class form
  /settings
    page.tsx                   < Settings + appearance

/components
  BottomNav.tsx
  ClassCard.tsx                < Used in Today + Timetable
  ClassCardCompact.tsx         < Used in Manage list
  TodoItem.tsx
  TypeBadge.tsx                < Reusable pill badge
  TypeSelector.tsx             < Visual type picker for forms
  DaySelector.tsx              < Horizontal pill day tabs
  NextUpCard.tsx               < Hero card on Today view
  PageHeader.tsx               < Consistent page top bar
  EmptyState.tsx               < Empty screen illustration + message
  BottomSheet.tsx              < Reusable modal sheet (add todo, confirm delete)

/lib
  db.ts                        < IndexedDB (idb) — all stores
  seed.ts                      < One-time seed from timetable.config.ts > IndexedDB
  timetable.config.ts          < Default semester 2 data
  notifications.ts             < Notification scheduling
  utils.ts                     < Time formatting, date helpers, greeting logic

/public
  manifest.json
  icons/
    icon-192.png
    icon-512.png
    badge-72.png

next.config.js
tailwind.config.ts
vercel.json
```

---

## Pages & UI — Detailed Spec

### Today View (`/app/page.tsx`)

**Header:**
```
Good morning / afternoon / evening,     [Bell icon — notification toggle]
Isaac
Tuesday, June 9
3 classes today • 2 tasks              < dynamic count, accent color
```

**Next Up Card** (if a class is coming today):
```
┌─────────────────────────────────────────┐
│ NEXT UP                      3:30 PM   │  < accent blue gradient card
│                                         │    bg: linear-gradient(135deg, #2563EB, #1D4ED8)
│ MN 374                                  │    white text throughout
│ Surface Mining Systems                  │
│                                         │
│ CCG2      AB Yaley    [CLASS pill] │
│                                         │
│ View Details                        >  │
└─────────────────────────────────────────┘
```

**Today's Schedule section:**
- "Today's Schedule" label + "See all >" link to /timetable
- Scrollable vertical list of ClassCard components for today
- Sorted by startTime
- Currently active class gets a subtle pulsing ring on its type badge

**Today's Todos section:**
- "Today's Tasks" label + count badge
- Top 3 todos shown, "See all >" to /todos
- Inline checkbox interaction with framer-motion strikethrough

**FAB:** Blue FAB with <Plus/> icon bottom right — opens BottomSheet to quickly add a todo

---

### Timetable View (`/app/timetable/page.tsx`)

**Header:** "Timetable" title + calendar icon

**Day Selector:**
```
[Mon] [Tue•] [Wed] [Thu] [Fri]
```
Pill tabs. Active = solid accent blue. Inactive = `--bg-card` with border.
Auto-selects current day on load.

**Class list:**
- Full day schedule as ClassCard list
- Time shown on left: `09:00` in `--text-tertiary`
- Each ClassCard shows full card tint background based on type
- Empty slots between classes show time gap subtly

**ClassCard anatomy:**
```
┌──────────────────────────────────────────┐  < card tint bg
│ MN 376 · Surface Mine Planning           │  < course code bold + name
│ JB Baidoe  ·  FL A3                      │  < lecturer · venue (secondary text)
│                              [CLASS pill] │  < type badge bottom right
└──────────────────────────────────────────┘
```
Tap > navigates to `/manage/[id]` detail view.

---

### Todo Manager (`/app/todos/page.tsx`)

**Header:** "Todos" + `···` menu

**Date navigator:**
```
< Tue, June 9 >     [calendar icon]
```

**Filter tabs:**
```
[All•]  [Pending]  [Completed]
```

**Todo list:**
Each TodoItem:
```
[ ]  Review MN 374 lecture notes          *  ···
    12:00 PM
```
- Checkbox with framer-motion animated checkmark on complete
- Star toggle for priority
- `···` opens options (edit time, delete)
- Completed todos: text strikethrough, moved to bottom or Completed tab
- Drag handle (`······`) for reordering (optional — implement if straightforward)

**Add todo input (bottom of list):**
```
[ Add a new task...                    + ]
```
Tapping expands to show time picker option.

---

### Manage Classes (`/app/manage/page.tsx`)

**Header:** "Manage Classes" + "Edit" toggle (enters bulk-select/delete mode)

**Tabs:**
```
[All Classes•]  [Custom Classes]
```
All Classes = default seed + user added merged
Custom Classes = only user-added (IndexedDB only)

**Class list item (ClassCardCompact):**
```
┌──────────────────────────────────────────┐
│ MN 372                        [CLASS]  › │
│ Underground Mining Systems               │
│ Monday · 11:00 AM                        │
└──────────────────────────────────────────┘
```
Type badge pill on right. Tap > detail view.

**FAB:** Blue `+` > `/manage/add`

---

### Class Detail View (`/app/manage/[id]/page.tsx`)

**Header:** `< Back` + `···` menu (Edit / Delete)

**Top section:**
```
┌──────────────────────────────────────────┐
│  [Type icon large]  MN 374              │  < icon in type color on tinted bg
│                     Surface Mining      │
│                     Systems             │
│                     [CLASS pill]        │
└──────────────────────────────────────────┘
```

**Details list:**
```
 Date          Tuesday, June 9
 Time          3:30 PM – 5:30 PM
Venue         CCG2
 Lecturer      AB Yaley
 Type          Class (Physical)
```

**Reminder toggle:**
```
 Reminder      [toggle ON]
   10 minutes before
```

**Notes field:**
```
Notes                              [edit icon]
Important 3-credit course.
Focus on weekly preparation
and practice questions.
```
Tappable to edit inline.

**Bottom CTA:**
```
[    Add to Calendar  ]   < generates .ics for this single class
```

---

### Add / Edit Class Form (`/manage/add` and `/manage/[id]/edit`)

Full editable form:

```
Course Code        [MN 374              ]
Course Name        [Surface Mining...   ]

Day
[Mon] [Tue] [Wed] [Thu] [Fri]

Start Time    [09:00 AM ▾]
End Time      [10:00 AM ▾]

Venue          [CCG2                  ]
               (leave blank if VLE)

Lecturer       [AB Yaley              ]

Type
┌──────────┬──────────┬──────────┐
│ CLASS │  ONLINE│  PRACT │  < visual segmented selector
├──────────┴──┬───────┴──────────┤     each option shows its pill color
│   STUDY  │     REST        │     selected = filled, unselected = outline
└─────────────┴──────────────────┘

Reminder
 Notify before class  [toggle]
   [5 min ▾] before

Notes
[                                 ]
[  multiline text area            ]

[        Save Class         ]    < accent blue full-width button
[        Delete             ]    < red text button (edit mode only)
```

**Venue field smart hint:**
If venue field is empty or user types "VLE" > auto-sets type to `CLASS_VLE`
If venue has a room code > auto-sets type to `CLASS_PHYSICAL`
User can always override manually.

---

### Settings (`/app/settings/page.tsx`)

```
Settings

── Notifications ──────────────────────
 Enable Notifications        [toggle]
   Default Reminder    10 minutes before ›

── Appearance ─────────────────────────
<Sun size={16} /> App Theme                      Light  (locked — light only for now)

── Data ───────────────────────────────
<Trash2 size={16} /> Clear All Todos                      ›  (red text)
<RotateCcw size={16} /> Reset to Default Timetable           ›  (red text)

── About ──────────────────────────────
<Info size={16} /> App Version                    1.0.0
   Built for UMaT Semester 2, 2026

── iOS Tip ────────────────────────────
<Info size={14} /> For notifications to work, tap Share
    > Add to Home Screen first.
```

---

## IndexedDB Schema (`/lib/db.ts`)

```typescript
// DB name: 'isaac-pwa', version: 1

// Store: 'classes'
interface ClassEntry {
  id: string;                // uuid
  courseCode: string;
  courseName: string;
  day: 'Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday';
  startTime: string;         // 'HH:MM' 24hr
  endTime: string;           // 'HH:MM' 24hr
  venue: string;
  lecturer: string;
  type: ClassType;
  notificationEnabled: boolean;
  notificationMinsBefore: number;  // 5 | 10 | 15 | 30
  notes: string;
  isDefault: boolean;        // true = seeded, false = user added
  createdAt: number;
  updatedAt: number;
}

// Store: 'todos'
interface TodoEntry {
  id: string;
  date: string;              // 'YYYY-MM-DD'
  text: string;
  completed: boolean;
  starred: boolean;
  reminderTime?: string;     // 'HH:MM' optional
  order: number;             // for manual sorting
  createdAt: number;
}

// Store: 'settings'
interface SettingEntry {
  key: string;
  value: string | number | boolean;
}
// Keys used: 'seeded', 'notificationsEnabled', 'defaultReminderMins'
```

---

## Seed Data (`/lib/timetable.config.ts`)

On first launch check `settings.get('seeded')`. If false > write all entries below to `classes` store > set `seeded: true`.

```typescript
export const DEFAULT_CLASSES: Omit<ClassEntry, 'createdAt'|'updatedAt'>[] = [

  // ── MONDAY ──────────────────────────────────────────
  { id:'mon-1',  courseCode:'REST',     courseName:'Morning Rest',                    day:'Monday',    startTime:'07:00', endTime:'09:00', venue:'',      lecturer:'',                  type:'REST',           notificationEnabled:false, notificationMinsBefore:10, notes:'',                                    isDefault:true },
  { id:'mon-2',  courseCode:'MN 372',   courseName:'Underground Mining Systems',      day:'Monday',    startTime:'11:00', endTime:'12:00', venue:'VLE',   lecturer:'BT AKUNOR',         type:'CLASS_VLE',      notificationEnabled:true,  notificationMinsBefore:10, notes:'',                                    isDefault:true },
  { id:'mon-3',  courseCode:'MN 372',   courseName:'Underground Mining Systems',      day:'Monday',    startTime:'12:00', endTime:'13:00', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Review lecture notes.',               isDefault:true },
  { id:'mon-4',  courseCode:'MN 376',   courseName:'Surface Mine Planning & Design',  day:'Monday',    startTime:'13:00', endTime:'14:30', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Prep for Tuesday MN376.',             isDefault:true },
  { id:'mon-5',  courseCode:'MN 350',   courseName:'Mineral Resource Estimation',     day:'Monday',    startTime:'14:30', endTime:'15:30', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Prep for Tuesday field work.',        isDefault:true },
  { id:'mon-6',  courseCode:'MN 374',   courseName:'Surface Mining Systems',          day:'Monday',    startTime:'15:30', endTime:'16:30', venue:'CCG2',  lecturer:'AB YALEY',          type:'CLASS_PHYSICAL', notificationEnabled:true,  notificationMinsBefore:10, notes:'Priority 3-credit course.',           isDefault:true },
  { id:'mon-7',  courseCode:'MN 374',   courseName:'Surface Mining Systems',          day:'Monday',    startTime:'16:30', endTime:'18:30', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Consolidate today\'s class.',         isDefault:true },
  { id:'mon-8',  courseCode:'REST',     courseName:'Wind Down',                       day:'Monday',    startTime:'18:30', endTime:'19:30', venue:'',      lecturer:'',                  type:'REST',           notificationEnabled:false, notificationMinsBefore:10, notes:'',                                    isDefault:true },

  // ── TUESDAY ─────────────────────────────────────────
  { id:'tue-1',  courseCode:'REST',     courseName:'Morning Rest',                    day:'Tuesday',   startTime:'07:00', endTime:'09:00', venue:'',      lecturer:'',                  type:'REST',           notificationEnabled:false, notificationMinsBefore:10, notes:'',                                    isDefault:true },
  { id:'tue-2',  courseCode:'MN 376',   courseName:'Surface Mine Planning & Design',  day:'Tuesday',   startTime:'09:00', endTime:'11:00', venue:'',      lecturer:'JB BAIDOE',         type:'CLASS_PHYSICAL', notificationEnabled:true,  notificationMinsBefore:10, notes:'2 hour class.',                       isDefault:true },
  { id:'tue-3',  courseCode:'MN 372',   courseName:'Underground Mining Systems',      day:'Tuesday',   startTime:'11:00', endTime:'12:00', venue:'',      lecturer:'BT AKUNOR',         type:'PRACTICAL',      notificationEnabled:true,  notificationMinsBefore:10, notes:'Practical session.',                  isDefault:true },
  { id:'tue-4',  courseCode:'MN 374',   courseName:'Surface Mining Systems',          day:'Tuesday',   startTime:'12:00', endTime:'13:30', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Prep for Wednesday MN374.',           isDefault:true },
  { id:'tue-5',  courseCode:'MN 350',   courseName:'Mineral Resource Estimation',     day:'Tuesday',   startTime:'13:30', endTime:'15:30', venue:'GR 1',  lecturer:'CK ARTHUR',         type:'PRACTICAL',      notificationEnabled:true,  notificationMinsBefore:10, notes:'Field Work 2. 2 hours.',              isDefault:true },
  { id:'tue-6',  courseCode:'REST',     courseName:'Break after fieldwork',           day:'Tuesday',   startTime:'15:30', endTime:'16:30', venue:'',      lecturer:'',                  type:'REST',           notificationEnabled:false, notificationMinsBefore:10, notes:'',                                    isDefault:true },
  { id:'tue-7',  courseCode:'MN 380',   courseName:'Mine Drainage',                   day:'Tuesday',   startTime:'16:30', endTime:'17:30', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Prep for Wednesday MN380(P).',        isDefault:true },
  { id:'tue-8',  courseCode:'MN 352',   courseName:'Research Methods & Ethics',       day:'Tuesday',   startTime:'17:30', endTime:'18:30', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Prep for Wednesday MN352.',           isDefault:true },
  { id:'tue-9',  courseCode:'MN 370',   courseName:'Computer Applications in Mining', day:'Tuesday',   startTime:'18:30', endTime:'19:30', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Prep for Wednesday MN370(P).',        isDefault:true },
  { id:'tue-10', courseCode:'REST',     courseName:'Wind Down',                       day:'Tuesday',   startTime:'19:30', endTime:'20:30', venue:'',      lecturer:'',                  type:'REST',           notificationEnabled:false, notificationMinsBefore:10, notes:'',                                    isDefault:true },

  // ── WEDNESDAY ───────────────────────────────────────
  { id:'wed-1',  courseCode:'MN 392',   courseName:'Practical',                       day:'Wednesday', startTime:'07:00', endTime:'08:00', venue:'FL A2', lecturer:'AB YALLEY',         type:'PRACTICAL',      notificationEnabled:true,  notificationMinsBefore:10, notes:'Early morning practical.',            isDefault:true },
  { id:'wed-2',  courseCode:'REST',     courseName:'Morning Break',                   day:'Wednesday', startTime:'08:00', endTime:'09:00', venue:'',      lecturer:'',                  type:'REST',           notificationEnabled:false, notificationMinsBefore:10, notes:'',                                    isDefault:true },
  { id:'wed-3',  courseCode:'MN 374',   courseName:'Surface Mining Systems',          day:'Wednesday', startTime:'09:00', endTime:'10:00', venue:'VLE',   lecturer:'AB YALEY',          type:'CLASS_VLE',      notificationEnabled:true,  notificationMinsBefore:10, notes:'Online via VLE.',                     isDefault:true },
  { id:'wed-4',  courseCode:'MN 378',   courseName:'AI Application in Mining',        day:'Wednesday', startTime:'10:00', endTime:'11:00', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Prep for Thursday MN378(P).',         isDefault:true },
  { id:'wed-5',  courseCode:'MN 392',   courseName:'Practical',                       day:'Wednesday', startTime:'11:00', endTime:'12:00', venue:'CCL1',  lecturer:'S AL-HASSAN',       type:'PRACTICAL',      notificationEnabled:true,  notificationMinsBefore:10, notes:'',                                    isDefault:true },
  { id:'wed-6',  courseCode:'MN 380',   courseName:'Mine Drainage',                   day:'Wednesday', startTime:'13:30', endTime:'14:30', venue:'GR 1',  lecturer:'EA MANTE',          type:'PRACTICAL',      notificationEnabled:true,  notificationMinsBefore:10, notes:'Practical session.',                  isDefault:true },
  { id:'wed-7',  courseCode:'MN 352',   courseName:'Research Methods & Ethics',       day:'Wednesday', startTime:'14:30', endTime:'15:30', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Prep for 15:30 MN352 class.',         isDefault:true },
  { id:'wed-8',  courseCode:'MN 352',   courseName:'Research Methods & Ethics',       day:'Wednesday', startTime:'15:30', endTime:'17:30', venue:'FL B2', lecturer:'F KUNKYIN-SAADAARI',type:'CLASS_PHYSICAL', notificationEnabled:true,  notificationMinsBefore:10, notes:'2 hour class. Dr Kunkyin-Saadaari.',  isDefault:true },
  { id:'wed-9',  courseCode:'MN 370',   courseName:'Computer Applications in Mining', day:'Wednesday', startTime:'17:30', endTime:'18:30', venue:'GF 4',  lecturer:'G ATVOR',           type:'PRACTICAL',      notificationEnabled:true,  notificationMinsBefore:10, notes:'Practical session.',                  isDefault:true },
  { id:'wed-10', courseCode:'REST',     courseName:'Evening Break',                   day:'Wednesday', startTime:'18:30', endTime:'19:30', venue:'',      lecturer:'',                  type:'REST',           notificationEnabled:false, notificationMinsBefore:10, notes:'',                                    isDefault:true },
  { id:'wed-11', courseCode:'MN 378',   courseName:'AI Application in Mining',        day:'Wednesday', startTime:'19:30', endTime:'20:30', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Light evening session.',              isDefault:true },

  // ── THURSDAY ────────────────────────────────────────
  { id:'thu-1',  courseCode:'REST',     courseName:'Morning Rest',                    day:'Thursday',  startTime:'07:00', endTime:'09:00', venue:'',      lecturer:'',                  type:'REST',           notificationEnabled:false, notificationMinsBefore:10, notes:'',                                    isDefault:true },
  { id:'thu-2',  courseCode:'MN 378',   courseName:'AI Application in Mining',        day:'Thursday',  startTime:'09:00', endTime:'10:00', venue:'CCU',   lecturer:'BT AKUNOR',         type:'PRACTICAL',      notificationEnabled:true,  notificationMinsBefore:10, notes:'Practical session.',                  isDefault:true },
  { id:'thu-3',  courseCode:'MN 378',   courseName:'AI Application in Mining',        day:'Thursday',  startTime:'10:00', endTime:'11:00', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Review today\'s practical.',          isDefault:true },
  { id:'thu-4',  courseCode:'MN 392',   courseName:'Practical',                       day:'Thursday',  startTime:'11:00', endTime:'12:00', venue:'VLE',   lecturer:'F KUNKYIN-SAADAARI',type:'CLASS_VLE',      notificationEnabled:true,  notificationMinsBefore:10, notes:'Online via VLE.',                     isDefault:true },
  { id:'thu-5',  courseCode:'MN 374',   courseName:'Surface Mining Systems',          day:'Thursday',  startTime:'12:00', endTime:'13:30', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Priority course consolidation.',      isDefault:true },
  { id:'thu-6',  courseCode:'MN 360',   courseName:'Course',                          day:'Thursday',  startTime:'13:30', endTime:'14:30', venue:'VLE',   lecturer:'EA MANTE',          type:'CLASS_VLE',      notificationEnabled:true,  notificationMinsBefore:10, notes:'Online via VLE.',                     isDefault:true },
  { id:'thu-7',  courseCode:'REST',     courseName:'Afternoon Break',                 day:'Thursday',  startTime:'14:30', endTime:'15:30', venue:'',      lecturer:'',                  type:'REST',           notificationEnabled:false, notificationMinsBefore:10, notes:'',                                    isDefault:true },
  { id:'thu-8',  courseCode:'MN 170',   courseName:'Course',                          day:'Thursday',  startTime:'16:30', endTime:'17:30', venue:'VLE',   lecturer:'G ATVOR',           type:'CLASS_VLE',      notificationEnabled:true,  notificationMinsBefore:10, notes:'Online via VLE.',                     isDefault:true },
  { id:'thu-9',  courseCode:'MN 352',   courseName:'Research Methods & Ethics',       day:'Thursday',  startTime:'17:30', endTime:'18:30', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Evening study block.',                isDefault:true },
  { id:'thu-10', courseCode:'MN 014',   courseName:'Course',                          day:'Thursday',  startTime:'18:30', endTime:'19:30', venue:'VLE',   lecturer:'FC QUANSAH',        type:'CLASS_VLE',      notificationEnabled:true,  notificationMinsBefore:10, notes:'Online via VLE.',                     isDefault:true },
  { id:'thu-11', courseCode:'REST',     courseName:'Evening Break',                   day:'Thursday',  startTime:'19:30', endTime:'20:30', venue:'',      lecturer:'',                  type:'REST',           notificationEnabled:false, notificationMinsBefore:10, notes:'',                                    isDefault:true },
  { id:'thu-12', courseCode:'MN 382',   courseName:'Mine Machinery',                  day:'Thursday',  startTime:'20:30', endTime:'21:30', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Final block of the day.',             isDefault:true },

  // ── FRIDAY ──────────────────────────────────────────
  { id:'fri-1',  courseCode:'REST',     courseName:'Morning Rest',                    day:'Friday',    startTime:'07:00', endTime:'09:00', venue:'',      lecturer:'',                  type:'REST',           notificationEnabled:false, notificationMinsBefore:10, notes:'',                                    isDefault:true },
  { id:'fri-2',  courseCode:'MN 378',   courseName:'AI Application in Mining',        day:'Friday',    startTime:'09:00', endTime:'10:00', venue:'VLE',   lecturer:'BT AKUNOR',         type:'CLASS_VLE',      notificationEnabled:true,  notificationMinsBefore:10, notes:'Online via VLE.',                     isDefault:true },
  { id:'fri-3',  courseCode:'REST',     courseName:'Mid-Morning Break',               day:'Friday',    startTime:'10:00', endTime:'11:00', venue:'',      lecturer:'',                  type:'REST',           notificationEnabled:false, notificationMinsBefore:10, notes:'',                                    isDefault:true },
  { id:'fri-4',  courseCode:'MN 276',   courseName:'Practical',                       day:'Friday',    startTime:'11:00', endTime:'12:00', venue:'FL A3', lecturer:'JB BAIDOE',         type:'PRACTICAL',      notificationEnabled:true,  notificationMinsBefore:10, notes:'Practical session.',                  isDefault:true },
  { id:'fri-5',  courseCode:'MN 374',   courseName:'Surface Mining Systems',          day:'Friday',    startTime:'12:00', endTime:'13:30', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Priority course deep study.',         isDefault:true },
  { id:'fri-6',  courseCode:'MN 372',   courseName:'Underground Mining Systems',      day:'Friday',    startTime:'13:30', endTime:'15:30', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Priority course weekly review.',      isDefault:true },
  { id:'fri-7',  courseCode:'REST',     courseName:'Afternoon Break',                 day:'Friday',    startTime:'15:30', endTime:'16:30', venue:'',      lecturer:'',                  type:'REST',           notificationEnabled:false, notificationMinsBefore:10, notes:'',                                    isDefault:true },
  { id:'fri-8',  courseCode:'MN 378',   courseName:'AI Application in Mining',        day:'Friday',    startTime:'16:30', endTime:'18:30', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'Weekly AI review.',                   isDefault:true },
  { id:'fri-9',  courseCode:'MN 382',   courseName:'Mine Machinery',                  day:'Friday',    startTime:'18:30', endTime:'19:30', venue:'',      lecturer:'',                  type:'STUDY',          notificationEnabled:true,  notificationMinsBefore:5,  notes:'End of week catch-up.',               isDefault:true },
  { id:'fri-10', courseCode:'REST',     courseName:'Free Time',                       day:'Friday',    startTime:'19:30', endTime:'20:30', venue:'',      lecturer:'',                  type:'REST',           notificationEnabled:false, notificationMinsBefore:10, notes:'Rest and recharge.',                  isDefault:true },
];
```

---

## Notification Logic (`/lib/notifications.ts`)

```typescript
// 1. On Settings page mount — check Notification.permission
// 2. If 'default' > show prompt button
// 3. If 'denied' > show instructions card
// 4. If 'granted' > notifications active

// Scheduling: use setTimeout for same-session
// Calculate ms until (classStartTime - notificationMinsBefore)
// If time already passed today > skip

function scheduleClassNotifications(classes: ClassEntry[]) {
  const now = new Date();
  classes.forEach(cls => {
    if (!cls.notificationEnabled) return;
    const [h, m] = cls.startTime.split(':').map(Number);
    const classTime = new Date();
    classTime.setHours(h, m - cls.notificationMinsBefore, 0);
    const msUntil = classTime.getTime() - now.getTime();
    if (msUntil <= 0) return;
    setTimeout(() => {
      new Notification(`${cls.type === 'CLASS_VLE' ? '' : ''} ${cls.courseCode} in ${cls.notificationMinsBefore} mins`, {
        body: `${cls.courseName}${cls.venue ? ' · ' + cls.venue : ''}${cls.lecturer ? ' · ' + cls.lecturer : ''}`,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag: cls.id,
      });
    }, msUntil);
  });
}

// Call this on app load each day with today's classes
```

---

## PWA Config

### `next.config.js`
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});
module.exports = withPWA({ reactStrictMode: true });
```

### `public/manifest.json`
```json
{
  "name": "Isaac's Class Manager",
  "short_name": "Classes",
  "description": "Personal class schedule and todo manager — UMaT Sem 2",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F5F5F0",
  "theme_color": "#F5F5F0",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

## Bottom Navigation (`/components/BottomNav.tsx`)

```
[  Today ] [  Timetable ] [ [check] Todos ] [  Manage ]
```
- Fixed bottom, white background, top border `--border`
- Safe area: `padding-bottom: env(safe-area-inset-bottom)`
- Active tab: icon + label in `--accent` blue
- Inactive: icon + label in `--text-tertiary`
- Active tab indicator: small filled dot above icon

---

## Key Implementation Rules

1. **Seed once** — check `settings` store for `seeded` key on every app load. Only seed if false.
2. **All reads from IndexedDB** — never read from `timetable.config.ts` at runtime after seeding.
3. **Merge by day** — Today and Timetable views query IndexedDB `classes` store filtered by day, sorted by `startTime`.
4. **Next Up logic** — find first class where `startTime > now` on today. Highlight it in hero card.
5. **Active class** — if `startTime <= now <= endTime` > pulsing ring on type badge.
6. **12hr display** — always display times as `9:00 AM`, store as `09:00` 24hr internally.
7. **Greeting** — before 12 = "Good morning", 12–17 = "Good afternoon", after 17 = "Good evening".
8. **Venue smart detect** — in Add/Edit form: if venue input === 'VLE' (case insensitive) > auto-select `CLASS_VLE` type. Room code > auto-select `CLASS_PHYSICAL`. User always overrides.
9. **iOS tip** — on first launch show a one-time dismissible banner: "Tap Share > Add to Home Screen for notifications."
10. **Max width** — `max-w-[430px] mx-auto` — looks great centered on desktop too.
11. **No auth, no backend, no server** — everything IndexedDB. Fully offline after first Vercel load.

---

## Dependencies

```json
{
  "dependencies": {
    "next": "14.2.x",
    "react": "^18",
    "react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3",
    "next-pwa": "^5.6.0",
    "idb": "^8.0.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.383.0",
    "uuid": "^9.0.0",
    "@types/uuid": "^9.0.0"
  }
}
```

---

## Build Order for Cursor (follow exactly)

```
1.  next.config.js
2.  tailwind.config.ts
3.  app/globals.css          < all CSS variables + font imports
4.  public/manifest.json
5.  lib/timetable.config.ts  < full seed data above
6.  lib/db.ts                < IndexedDB setup + all CRUD functions
7.  lib/seed.ts              < one-time seeder
8.  lib/notifications.ts
9.  lib/utils.ts             < time formatters, greeting, date helpers
10. components/TypeBadge.tsx
11. components/TypeSelector.tsx
12. components/ClassCard.tsx
13. components/ClassCardCompact.tsx
14. components/TodoItem.tsx
15. components/NextUpCard.tsx
16. components/DaySelector.tsx
17. components/BottomNav.tsx
18. components/PageHeader.tsx
19. components/EmptyState.tsx
20. components/BottomSheet.tsx
21. app/layout.tsx
22. app/page.tsx             < Today view
23. app/timetable/page.tsx
24. app/todos/page.tsx
25. app/manage/page.tsx
26. app/manage/add/page.tsx
27. app/manage/[id]/page.tsx
28. app/manage/[id]/edit/page.tsx
29. app/settings/page.tsx
30. vercel.json > deploy
```
