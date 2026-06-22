import { NextResponse } from 'next/server';
import { getAllCohorts } from '@/lib/cohorts';

export async function GET() {
  const cohorts = await getAllCohorts();
  return NextResponse.json({ cohorts });
}
