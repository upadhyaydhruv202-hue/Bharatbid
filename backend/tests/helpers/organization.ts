import type { Repositories } from '../../src/repositories';

export async function shareDefaultOrganization(
  repos: Repositories,
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  const memberships = await repos.organizations.listForUser(fromUserId);
  const org = memberships.find((item) => item.isDefault) ?? memberships[0];
  if (!org) {
    return;
  }
  await repos.organizations.addMember(org.id, toUserId, false);
}
