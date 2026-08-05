export function canDeleteRequestForUser({
  role,
  requestFamilyMemberId,
  requestOrganizerId,
  currentFamilyMemberId,
  currentOrganizerId,
}: {
  role?: string | null;
  requestFamilyMemberId?: string | null;
  requestOrganizerId?: string | null;
  currentFamilyMemberId?: string | null;
  currentOrganizerId?: string | null;
}) {
  if (!role) return false;

  if (role === 'SUPER_ADMIN') {
    return true;
  }

  if (role === 'FAMILY_MEMBER') {
    return Boolean(currentFamilyMemberId) && String(currentFamilyMemberId) === String(requestFamilyMemberId || '');
  }

  if (role === 'ORGANIZER') {
    return Boolean(currentOrganizerId) && String(currentOrganizerId) === String(requestOrganizerId || '');
  }

  return false;
}

export function canDeleteSessionForUser({
  role,
  sessionFamilyMemberId,
  sessionOrganizerId,
  requestFamilyMemberId,
  currentFamilyMemberId,
  currentOrganizerId,
}: {
  role?: string | null;
  sessionFamilyMemberId?: string | null;
  sessionOrganizerId?: string | null;
  requestFamilyMemberId?: string | null;
  currentFamilyMemberId?: string | null;
  currentOrganizerId?: string | null;
}) {
  if (!role) return false;

  if (role === 'SUPER_ADMIN') {
    return true;
  }

  if (role === 'FAMILY_MEMBER') {
    const matchesFamily = Boolean(currentFamilyMemberId) && (
      String(currentFamilyMemberId) === String(sessionFamilyMemberId || '') ||
      String(currentFamilyMemberId) === String(requestFamilyMemberId || '')
    );
    return matchesFamily;
  }

  if (role === 'ORGANIZER') {
    return Boolean(currentOrganizerId) && String(currentOrganizerId) === String(sessionOrganizerId || '');
  }

  return false;
}
