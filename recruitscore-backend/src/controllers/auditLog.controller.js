import AuditLog from "../models/AuditLog.model.js";

// Obtenir tous les logs
export const getAuditLogs = async (request, reply) => {
  try {
    const {
      action,
      userId,
      targetCollection,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = request.query;

    const filter = {};

    if (action) filter.action = action;
    if (userId) filter.userId = userId;
    if (targetCollection) filter.targetCollection = targetCollection;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate("userId", "firstName lastName email role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return reply.status(200).send({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      count: logs.length,
      logs,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir un log par ID
export const getAuditLogById = async (request, reply) => {
  try {
    const log = await AuditLog.findById(request.params.id).populate(
      "userId",
      "firstName lastName email role",
    );

    if (!log) {
      return reply.status(404).send({
        success: false,
        message: "Log non trouve",
      });
    }

    return reply.status(200).send({
      success: true,
      log,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Obtenir les logs d un utilisateur
export const getUserAuditLogs = async (request, reply) => {
  try {
    const { page = 1, limit = 20 } = request.query;

    const total = await AuditLog.countDocuments({
      userId: request.params.userId,
    });

    const logs = await AuditLog.find({ userId: request.params.userId })
      .populate("userId", "firstName lastName email role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return reply.status(200).send({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      count: logs.length,
      logs,
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

// Statistiques des actions
export const getAuditStats = async (request, reply) => {
  try {
    // Nombre de logs par action
    const statsByAction = await AuditLog.aggregate([
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Nombre de logs par utilisateur
    const statsByUser = await AuditLog.aggregate([
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          count: 1,
          "user.firstName": 1,
          "user.lastName": 1,
          "user.email": 1,
          "user.role": 1,
        },
      },
    ]);

    // Nombre de logs par collection
    const statsByCollection = await AuditLog.aggregate([
      {
        $group: {
          _id: "$targetCollection",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Activite des 7 derniers jours
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activityLast7Days = await AuditLog.aggregate([
      {
        $match: { createdAt: { $gte: sevenDaysAgo } },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalLogs = await AuditLog.countDocuments();

    return reply.status(200).send({
      success: true,
      stats: {
        totalLogs,
        byAction: statsByAction,
        byUser: statsByUser,
        byCollection: statsByCollection,
        activityLast7Days,
      },
    });
  } catch (err) {
    return reply.status(500).send({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};
