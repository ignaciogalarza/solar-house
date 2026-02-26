# RatePreview Component - Visual Guide

## Component Output Visualization

### Basic Day/Night Tariff

Input:
```typescript
[
  { name: 'Night', rate: 0.23, startTime: '22:00', endTime: '06:00', color: '#3B82F6' },
  { name: 'Day', rate: 0.44, startTime: '06:00', endTime: '22:00', color: '#FCD34D' },
]
```

Visual Output:
```
┌────────────────────┬──────────────────────────────────┐
│      Night        │          Day €0.44/kWh          │
│     €0.23/kWh     │                                  │
└────────────────────┴──────────────────────────────────┘
00:00     06:00      12:00      18:00      24:00

Legend:
   Night €0.23/kWh    Day €0.44/kWh
```

### Complex 4-Period Tariff

Input:
```typescript
[
  { name: 'Night', rate: 0.18, startTime: '22:00', endTime: '07:00', color: '#1E40AF' },
  { name: 'Morning', rate: 0.32, startTime: '07:00', endTime: '11:00', color: '#60A5FA' },
  { name: 'Peak', rate: 0.58, startTime: '11:00', endTime: '19:00', color: '#EF4444' },
  { name: 'Evening', rate: 0.42, startTime: '19:00', endTime: '22:00', color: '#F97316' },
]
```

Visual Output:
```
┌────────┬───┬──────────────┬────────┬───┐
│ Night  │Mor│    Peak      │Evening │Ngt│
│€0.18   │€32│   €0.58      │ €0.42  │€18│
└────────┴───┴──────────────┴────────┴───┘
00:00  06:00  12:00  18:00  24:00

Legend:
   Night €0.18/kWh    Morning €0.32/kWh    Peak €0.58/kWh    Evening €0.42/kWh
```

Note: Night label appears on both sides because it wraps midnight.

### Segment Sizing Logic

```
24-hour day = 1440 minutes = 100% width

Period Duration → Percentage
6 hours    → 6/24 = 25%     ✓ Label visible
8 hours    → 8/24 = 33.3%   ✓ Label visible
9 hours    → 9/24 = 37.5%   ✓ Label visible
4 hours    → 4/24 = 16.7%   ✓ Label visible
2 hours    → 2/24 = 8.3%    ✓ Label visible
1 hour     → 1/24 = 4.2%    ✗ Label hidden
1.5 hours  → 1.5/24 = 6.25% ✗ Label hidden
```

The 8% threshold prevents text overflow on narrow segments.

## Overnight Period Handling

### Example: Night Period 23:00-08:00

**Input Period:**
```
startTime: '23:00'
endTime: '08:00'
```

**Processing:**
```
startMinutes = 23 * 60 = 1380
endMinutes = 8 * 60 = 480

endMinutes <= startMinutes?
480 <= 1380 → TRUE (overnight detected!)

Split into two segments:
1. Evening: 23:00 to 24:00 (00:00)
   - startPercent: (1380/1440) * 100 = 95.8%
   - widthPercent: (100 - 95.8) = 4.2%

2. Morning: 00:00 to 08:00
   - startPercent: 0%
   - widthPercent: (480/1440) * 100 = 33.3%
```

**Visual Result:**
```
┌────────────────────────────────────────┬────────────┐
│              Day €0.44                │Night€0.23  │
│                                       │            │
└────────────────────────────────────────┴────────────┘
                                    23:00  24:00 00:00
                                              
                                    ↓ wrapped to morning ↓

┌────────────────────┬────────────────────────────────┐
│Night €0.23/kWh    │        Day €0.44/kWh          │
│                   │                                │
└────────────────────┴────────────────────────────────┘
00:00      06:00      12:00      18:00      24:00
 ↑
Morning segment of Night period
```

## Time Axis Reference

The timeline includes 5 evenly-spaced time markers:

```
00:00 = Midnight (start of day)
06:00 = 6:00 AM
12:00 = Noon (middle of day)
18:00 = 6:00 PM
24:00 = Midnight (end of day)
```

These divide the day into 6-hour chunks for easy reference.

## Color Scheme Used in Examples

```
#1E40AF  = Dark Blue      (Night periods)
#60A5FA  = Light Blue     (Morning periods)
#3B82F6  = Blue           (Off-peak)
#FCD34D  = Yellow         (Day periods)
#EF4444  = Red            (Peak periods)
#F97316  = Orange         (Evening periods)
#10B981  = Green          (Cheap periods)
#8B5CF6  = Purple         (Standard periods)
```

## Hover Interaction

When hovering over any segment:

1. **Visual Change**: Segment opacity decreases to 80%
2. **Tooltip Appears**: Shows "Period Name: EUR X.XX/kWh"
   - Example: "Peak: EUR0.58/kWh"

```
Before Hover:        After Hover:
┌──────────┐        ┌──────────┐
│  Peak    │  →     │  Peak    │  ← Slightly transparent
│€0.58     │        │€0.58     │
└──────────┘        └──────────┘    Tooltip: "Peak: EUR0.58/kWh"
```

## Small Segment Example

When segments are very small (<8% width):

```
Too Small - No Label:
┌│ Day  │──────────────────────────────────┐
│└──────┘                                  │
│← 1-hour segment (4.2%)                   │

Just Right - Label Visible:
┌────────┬────────────────────────────────┐
│ Morning│      Day €0.44/kWh            │
│€0.32   │                               │
└────────┴────────────────────────────────┘
← 2-hour segment (8.3%)
```

## Dynamic Width Calculation

All segment widths are calculated as percentages:

```
widthPercent = (durationMinutes / 1440) * 100

Example calculations:
├─ 2 hours  = 120 min  = (120/1440) * 100 = 8.33%
├─ 4 hours  = 240 min  = (240/1440) * 100 = 16.67%
├─ 6 hours  = 360 min  = (360/1440) * 100 = 25%
├─ 8 hours  = 480 min  = (480/1440) * 100 = 33.33%
├─ 12 hours = 720 min  = (720/1440) * 100 = 50%
└─ 16 hours = 960 min  = (960/1440) * 100 = 66.67%
```

## Legend Layout

The legend appears below the timeline and adapts to content:

```
Single Column (small screen):
┌─────────────────────┐
│ Night €0.23/kWh    │
│ Day €0.44/kWh      │
└─────────────────────┘

Multi-Column (large screen):
┌──────────────────┬──────────────────┐
│ Night €0.23/kWh │ Day €0.44/kWh    │
└──────────────────┴──────────────────┘
```

Each legend item includes:
- Color dot (matching the segment color)
- Period name
- Rate in EUR/kWh with 2 decimal places

## Real-World Example: UK Economy 7 Tariff

Economy 7 offers 7 hours of cheap night rate:

```
[
  { name: 'Night', rate: 0.15, startTime: '23:00', endTime: '06:00', color: '#3B82F6' },
  { name: 'Day', rate: 0.35, startTime: '06:00', endTime: '23:00', color: '#FCD34D' },
]
```

Visual:
```
┌───┬─────────────────────────────────────────┐
│Nit│           Day €0.35/kWh               │
│€15│                                        │
└───┴─────────────────────────────────────────┘
00:00      06:00      12:00      18:00      24:00
  ↑
Night is only ~4.2% width (1 hour remainder + day wrapping)
Actually shows on morning side of the next segment

Result: Two small segments (23:00-24:00 and 00:00-06:00)
combining to 7 hours total night rate
```

## Responsive Behavior

The component maintains proper proportions across all screen sizes:

```
Small Screen (320px):    Medium Screen (768px):    Large Screen (1024px+):
┌──────┬──────┐         ┌────────────────────┐    ┌──────────────────────────┐
│Night │ Day  │         │Night│    Day      │    │Night €0.23│    Day €0.44   │
└──────┴──────┘         └────────────────────┘    └──────────────────────────┘

Time markers adjust spacing but remain aligned
All percentages preserved across screen sizes
```

---

This visual guide demonstrates how the RatePreview component translates rate data into an intuitive visual timeline that users can quickly understand.
