export type LoginPhase =
  | { kind: "email" }
  | { kind: "mfa" }
  | { kind: "registration"; requiresApproval: boolean }
  | { kind: "group_profile" }
  | { kind: "pending_approval" }
  | { kind: "blocked" };

export function loginRequiresApproval(phase: LoginPhase): boolean {
  return phase.kind === "registration" && phase.requiresApproval;
}
