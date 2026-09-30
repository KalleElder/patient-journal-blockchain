// Rollerna kommer alltid från backend, frontend hittar inte på egna.
export const ROLES = {
  DOCTOR: "DOCTOR",
  NURSE: "NURSE",
  CARE_CENTER: "CARE_CENTER",
  PATIENT: "PATIENT",
  UNAUTHORIZED: "UNAUTHORIZED",
};

export const STAFF_ROLES = [ROLES.DOCTOR, ROLES.NURSE, ROLES.CARE_CENTER];

// Svenska namn på rollerna, bara för visning.
export const ROLE_LABEL = {
  DOCTOR: "Läkare",
  NURSE: "Sjuksköterska",
  CARE_CENTER: "Vårdcentral",
  PATIENT: "Patient",
  UNAUTHORIZED: "Obehörig",
};

export function isStaff(user) {
  return STAFF_ROLES.includes(user?.role);
}
