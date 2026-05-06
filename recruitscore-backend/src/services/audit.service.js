import AuditLog from "../models/AuditLog.model.js";

export const createAuditLog = async ({
  userId,
  action,
  targetCollection,
  targetId,
  before,
  after,
  ipAddress,
  details,
}) => {
  try {
    await AuditLog.create({
      userId,
      action,
      targetCollection,
      targetId,
      before,
      after,
      ipAddress,
      details,
    });
  } catch (err) {
    // Ne pas bloquer l execution si le log echoue
    console.error("❌ Erreur création audit log :", err.message);
  }
};
