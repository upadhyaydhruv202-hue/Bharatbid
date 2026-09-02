import type { NotificationService } from '../../notifications';

export interface ProcurementNotifyInput {
  userId?: string | null;
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  body: string;
  href: string;
  entityType: 'tender' | 'bid' | 'bidder' | 'review' | 'evaluation' | 'verification';
  entityId: string;
  idempotencyKey?: string;
}

export async function notifyProcurement(
  notifications: NotificationService | null | undefined,
  input: ProcurementNotifyInput,
): Promise<void> {
  if (!notifications || !input.userId) {
    return;
  }

  try {
    await notifications.notify({
      userId: input.userId,
      type: input.type ?? 'info',
      title: input.title,
      body: `${input.body}\n\nDEMO / SYNTHETIC`,
      email: false,
      category: 'system',
      metadata: {
        href: input.href,
        entityType: input.entityType,
        entityId: input.entityId,
        demo: true,
      },
      idempotencyKey: input.idempotencyKey,
    });
  } catch {
    // In-app notification must not fail the procurement action.
  }
}
