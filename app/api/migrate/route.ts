import { NextResponse } from 'next/server';
import { sqlite } from '@/lib/db';

export async function POST() {
  try {
    // Add pso_levy column if it doesn't exist
    try {
      sqlite.exec('ALTER TABLE electricity_tariffs ADD COLUMN pso_levy REAL');
    } catch { /* column may already exist */ }

    // Add vat_rate column if it doesn't exist
    try {
      sqlite.exec('ALTER TABLE electricity_tariffs ADD COLUMN vat_rate REAL');
    } catch { /* column may already exist */ }

    return NextResponse.json({ success: true, message: 'Migration complete' });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
