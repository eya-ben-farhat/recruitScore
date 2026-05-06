import jwt from "jsonwebtoken";

// Verifie si l'utilisateur est connecte
export const isAuthenticated = async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({
        success: false,
        message: "Non autorise, token manquant",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    request.user = decoded;
  } catch (err) {
    return reply.status(401).send({
      success: false,
      message: "Token invalide ou expire",
    });
  }
};

// Verifie si l'utilisateur est admin
export const isAdmin = async (request, reply) => {
  if (request.user.role !== "admin") {
    return reply.status(403).send({
      success: false,
      message: "Acces refuse, admin uniquement",
    });
  }
};

// Verifie les roles autorises
export const hasRole = (...roles) => {
  return async (request, reply) => {
    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({
        success: false,
        message: `Acces refuse, roles autorises : ${roles.join(", ")}`,
      });
    }
  };
};

// Verifie les permissions
export const hasPermission = (module, action) => {
  return async (request, reply) => {
    const userPermissions = request.user.permissions[module];
    if (!userPermissions || !userPermissions.includes(action)) {
      return reply.status(403).send({
        success: false,
        message: `Permission refusee : ${action} sur ${module}`,
      });
    }
  };
};
