import { badRequest } from "./errors";

export const AUTO_APPROVAL_MESSAGE = "Disetujui otomatis karena approval aplikasi nonaktif.";

export function assertRequiredApprovers(approvalEnabled: boolean, approverIds: string[]) {
  if (approvalEnabled && approverIds.length === 0) {
    throw badRequest("Pilih minimal 1 approver sebelum mengajukan");
  }
}
