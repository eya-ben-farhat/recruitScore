import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";

// Dossier de stockage des CV
const UPLOAD_DIR = "uploads/cv";

// Creer le dossier si il n existe pas
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Types de fichiers autorises
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Taille maximale : 5MB
const MAX_SIZE = 5 * 1024 * 1024;

export const uploadCV = async (file, candidateId) => {
  // Verifier le type du fichier
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error("Format non autorise. Utilisez PDF ou DOCX");
  }

  // Verifier la taille
  if (file.file.bytesRead > MAX_SIZE) {
    throw new Error("Fichier trop volumineux. Maximum 5MB");
  }

  // Generer un nom unique pour le fichier
  const extension = path.extname(file.filename);
  const fileName = `cv_${candidateId}_${Date.now()}${extension}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  // Sauvegarder le fichier
  await pipeline(file.file, fs.createWriteStream(filePath));

  return {
    fileName,
    filePath,
    mimeType: file.mimetype,
    previewUrl: `/uploads/cv/${fileName}`,
  };
};

export const deleteCV = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};
