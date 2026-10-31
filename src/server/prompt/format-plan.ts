import type { PlanSlot } from '../plan';

export function formatPlan(plan: readonly PlanSlot[]): string {
  return plan.map((slot, i) => `${i + 1}. ${slot.type}${slot.boss ? ' (BOSS: harder)' : ''}`).join('\n');
}
