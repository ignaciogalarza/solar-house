/**
 * Example usage and test cases for RatePreview component
 * This demonstrates how to use the component with different rate period configurations
 */

import { RatePreview } from './RatePreview';

/**
 * Example 1: Basic 3-period tariff (Night, Day, Peak)
 * Common in European electricity markets
 */
export const Example_Basic = () => {
  const periods = [
    {
      name: 'Night',
      rate: 0.23,
      startTime: '22:00',
      endTime: '06:00',
      color: '#3B82F6', // Blue
    },
    {
      name: 'Day',
      rate: 0.44,
      startTime: '06:00',
      endTime: '22:00',
      color: '#FCD34D', // Yellow
    },
  ];

  return <RatePreview periods={periods} />;
};

/**
 * Example 2: 4-period tariff with specific peak hours
 * More detailed rate structure with off-peak morning
 */
export const Example_Complex = () => {
  const periods = [
    {
      name: 'Night',
      rate: 0.18,
      startTime: '22:00',
      endTime: '07:00',
      color: '#1E40AF', // Dark Blue
    },
    {
      name: 'Morning',
      rate: 0.32,
      startTime: '07:00',
      endTime: '11:00',
      color: '#60A5FA', // Light Blue
    },
    {
      name: 'Peak',
      rate: 0.58,
      startTime: '11:00',
      endTime: '19:00',
      color: '#EF4444', // Red
    },
    {
      name: 'Evening',
      rate: 0.42,
      startTime: '19:00',
      endTime: '22:00',
      color: '#F97316', // Orange
    },
  ];

  return <RatePreview periods={periods} />;
};

/**
 * Example 3: Time-of-Use tariff with weekend different rates
 * Demonstrates segment sizing and overnight wrapping
 */
export const Example_TimeOfUse = () => {
  const periods = [
    {
      name: 'Cheap',
      rate: 0.15,
      startTime: '23:00',
      endTime: '06:00',
      color: '#10B981', // Green
    },
    {
      name: 'Mid',
      rate: 0.28,
      startTime: '06:00',
      endTime: '16:00',
      color: '#3B82F6', // Blue
    },
    {
      name: 'Expensive',
      rate: 0.65,
      startTime: '16:00',
      endTime: '21:00',
      color: '#EF4444', // Red
    },
    {
      name: 'Standard',
      rate: 0.35,
      startTime: '21:00',
      endTime: '23:00',
      color: '#8B5CF6', // Purple
    },
  ];

  return <RatePreview periods={periods} />;
};

/**
 * Test case: Verify overnight period wrapping
 * Period starts at 23:30 and ends at 07:15 next day
 * This should be split into two visual segments
 */
export const Test_OvernightWrapping = () => {
  const periods = [
    {
      name: 'Night',
      rate: 0.23,
      startTime: '23:30',
      endTime: '07:15',
      color: '#3B82F6',
    },
    {
      name: 'Day',
      rate: 0.55,
      startTime: '07:15',
      endTime: '23:30',
      color: '#FCD34D',
    },
  ];

  return <RatePreview periods={periods} />;
};

/**
 * Test case: Verify label visibility threshold
 * Small segments (<8% width) should not display labels
 * This helps prevent text overflow in narrow segments
 */
export const Test_SmallSegments = () => {
  const periods = [
    {
      name: 'A',
      rate: 0.20,
      startTime: '00:00',
      endTime: '01:00', // 4.2% of 24h - too small for label
      color: '#EF4444',
    },
    {
      name: 'B',
      rate: 0.30,
      startTime: '01:00',
      endTime: '07:00', // 25% of 24h - shows label
      color: '#3B82F6',
    },
    {
      name: 'C',
      rate: 0.50,
      startTime: '07:00',
      endTime: '23:00', // 66.7% of 24h - shows label
      color: '#FCD34D',
    },
  ];

  return <RatePreview periods={periods} />;
};

/**
 * Integration example: Fetch real tariff data from API
 * This shows how you'd integrate the component in a real application
 *
 * Usage in a page or other component:
 * ```tsx
 * async function TariffPage() {
 *   const tariff = await fetch('/api/tariff').then(r => r.json());
 *   return <RatePreview periods={tariff.periods} />;
 * }
 * ```
 */
