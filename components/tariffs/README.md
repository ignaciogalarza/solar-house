# Tariff Components

## RatePreview

A React component that displays a 24-hour timeline visualization of electricity rate periods.

### Features

- **Visual Timeline**: Colored segments representing different rate periods throughout the day
- **Overnight Wrapping**: Automatically handles periods that span midnight (e.g., 23:00-06:00)
- **Responsive Labels**: Text labels only appear on segments wide enough to display them (>8% width)
- **Time Axis**: Reference markers at 6-hour intervals (00:00, 06:00, 12:00, 18:00, 24:00)
- **Rate Legend**: Below the timeline shows period names and rates
- **Hover Tooltips**: Displays full period information on mouse hover

### Props

```typescript
interface RatePeriod {
  name: string;        // Period identifier (e.g., "Night", "Peak")
  rate: number;        // Electricity rate in EUR/kWh
  startTime: string;   // Start time in 'HH:MM' format (24-hour)
  endTime: string;     // End time in 'HH:MM' format (24-hour)
  color: string;       // Hex color code (e.g., '#3B82F6')
}

interface RatePreviewProps {
  periods: RatePeriod[];  // Array of rate periods
}
```

### Basic Usage

```tsx
import { RatePreview } from '@/components/tariffs';

export function TariffPage() {
  const periods = [
    {
      name: 'Night',
      rate: 0.23,
      startTime: '22:00',
      endTime: '06:00',
      color: '#3B82F6',
    },
    {
      name: 'Day',
      rate: 0.44,
      startTime: '06:00',
      endTime: '22:00',
      color: '#FCD34D',
    },
  ];

  return <RatePreview periods={periods} />;
}
```

### How It Works

#### 1. Time to Minutes Conversion
The component converts time strings to minutes since midnight for easier calculations:
- '00:00' = 0 minutes
- '12:00' = 720 minutes
- '23:59' = 1439 minutes

#### 2. Duration Calculation
Handles both normal and overnight periods:
- **Normal period** (06:00-22:00): Simple subtraction of start from end
- **Overnight period** (23:00-06:00): Wraps around midnight using formula:
  `24*60 - startMinutes + endMinutes`

#### 3. Percentage Calculation
Converts time values to percentages of the 24-hour day:
- Formula: `(minutes / 1440) * 100`
- Used for segment width and positioning

#### 4. Segment Processing
- Creates visual segments from each period
- Overnight periods are split into two segments:
  - Evening: Start time to 24:00
  - Morning: 00:00 to end time
- Sorts segments by start position for correct visual order

#### 5. Rendering
- Timeline uses flexbox layout with segments sized by width percentage
- Labels only show if segment width > 8% (approximately 2 hours)
- Hover opacity transition for better interactivity

### Styling

The component uses Tailwind CSS classes and inline styles:

- **Container**: `space-y-3` for vertical spacing
- **Timeline**: `h-10 rounded-lg overflow-hidden flex bg-[#1E293B]`
- **Segments**: Dynamic width percentage, flexbox centering
- **Time axis**: 5 evenly-spaced time markers
- **Legend**: Wrapped flex layout with color indicators

### Example Scenarios

#### Scenario 1: Simple Day/Night
```tsx
const periods = [
  { name: 'Night', rate: 0.23, startTime: '22:00', endTime: '06:00', color: '#3B82F6' },
  { name: 'Day', rate: 0.44, startTime: '06:00', endTime: '22:00', color: '#FCD34D' },
];
```

Result: Two equal-ish segments (8h night vs 16h day)

#### Scenario 2: Complex Multi-Period
```tsx
const periods = [
  { name: 'Night', rate: 0.18, startTime: '22:00', endTime: '07:00', color: '#1E40AF' },
  { name: 'Morning', rate: 0.32, startTime: '07:00', endTime: '11:00', color: '#60A5FA' },
  { name: 'Peak', rate: 0.58, startTime: '11:00', endTime: '19:00', color: '#EF4444' },
  { name: 'Evening', rate: 0.42, startTime: '19:00', endTime: '22:00', color: '#F97316' },
];
```

Result: Four segments with varying widths representing the rate structure

### Edge Cases Handled

1. **Overnight Periods**: Periods that end the next day are automatically split
   - Input: startTime='23:00', endTime='07:00'
   - Output: Two visual segments at correct positions

2. **Exact Midnight Boundaries**: Periods starting or ending exactly at 00:00 or 24:00
   - 00:00 is treated as 0 minutes
   - 24:00 is equivalent to 00:00 of next day

3. **Very Small Segments**: Segments less than 8% width don't display text labels
   - Prevents text overflow and improves readability

4. **Floating Point Precision**: All calculations use percentage values
   - Prevents rounding errors when segments add up to 100%

### Performance Considerations

- Time complexity: O(n) where n is the number of periods
- Space complexity: O(n) for the segments array
- No unnecessary re-renders (pure component)
- Inline styles only on segments (minimal CSS recalculation)

### Accessibility

- Time axis labels clearly show 24-hour format
- Color indicators in legend for colorblind users
- Hover tooltips provide additional information
- Text contrast meets WCAG standards (white on colored backgrounds)

### Testing

See `RatePreview.test.tsx` for example implementations and test cases:
- Basic 2-period tariff
- Complex 4-period tariff
- Overnight wrapping verification
- Small segment visibility threshold

### Future Enhancements

- Animated transitions when rates change
- Click-to-select periods
- Rate comparison between days
- Integration with real API data
- Mobile-optimized touch interactions
- Accessibility improvements (ARIA labels)
