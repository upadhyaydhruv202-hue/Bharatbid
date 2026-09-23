import { getTestPrisma } from './database';

export function utcDateOnly(daysFromToday: number): string {
  const now = new Date();
  const utc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromToday);
  return new Date(utc).toISOString().slice(0, 10);
}

export function openTenderSchedule() {
  return {
    issueDate: utcDateOnly(-60),
    closingDate: utcDateOnly(60),
  };
}

export async function expireTenderWindow(tenderId: string): Promise<void> {
  await getTestPrisma().tender.update({
    where: { id: tenderId },
    data: { closingDate: new Date(Date.now() - 60_000) },
  });
}
