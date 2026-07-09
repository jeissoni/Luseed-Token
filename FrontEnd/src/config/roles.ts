export type UserRole = "investor" | "manager" | "operator";

export const ROLE_LABELS: Record<UserRole, string> = {
  investor: "Inversor",
  manager: "Socio",
  operator: "Operador",
};

export const ROLE_HOME: Record<UserRole, string> = {
  investor: "/inversor/resumen",
  manager: "/managers",
  operator: "/operaciones",
};

/** Prioridad para redirección cuando el usuario tiene varios roles. */
export const ROLE_PRIORITY: UserRole[] = ["operator", "manager", "investor"];

export function pickDefaultRoute(roles: UserRole[]): string {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return ROLE_HOME[role];
  }
  return "/sin-acceso";
}
