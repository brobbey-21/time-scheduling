import { NextResponse } from 'next/server';
import { getCohorts } from '@/lib/cohorts';

export async function GET() {
  return NextResponse.json({ cohorts: getCohorts() });
}
