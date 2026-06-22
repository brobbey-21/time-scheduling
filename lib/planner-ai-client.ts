'use client';

import type { PlannerAiOptimization } from './types';

export async function fetchPlannerOptimization(): Promise<{
  optimization: PlannerAiOptimization;
} | null> {
  try {
    const res = await fetch('/api/planner/optimize', {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? 'Optimization failed');
    }

    return (await res.json()) as { optimization: PlannerAiOptimization };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Optimization failed');
  }
}
