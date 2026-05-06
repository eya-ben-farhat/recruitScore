import Question from "../models/Question.model.js";
import User from "../models/User.model.js";

export const seedQuestions = async () => {
  try {
    const count = await Question.countDocuments();
    if (count > 0) {
      console.log("Questions déjà existantes");
      return;
    }

    const admin = await User.findOne({ role: "admin" });

    const questions = [
      // ALGORITHMIQUE - easy
      {
        type: "qcm",
        theme: "algorithmique",
        difficulty: "easy",
        content:
          "Quelle est la complexité d un tableau trié avec la recherche binaire ?",
        options: [
          { label: "O(n)", isCorrect: false },
          { label: "O(log n)", isCorrect: true },
          { label: "O(n²)", isCorrect: false },
          { label: "O(1)", isCorrect: false },
        ],
        explanation:
          "La recherche binaire divise le tableau en deux à chaque étape",
        targetSkill: "algorithmique",
        points: 5,
        createdBy: admin._id,
      },
      {
        type: "qcm",
        theme: "algorithmique",
        difficulty: "easy",
        content: "Quelle structure de données fonctionne en LIFO ?",
        options: [
          { label: "File (Queue)", isCorrect: false },
          { label: "Pile (Stack)", isCorrect: true },
          { label: "Tableau", isCorrect: false },
          { label: "Liste", isCorrect: false },
        ],
        explanation: "LIFO = Last In First Out, c est le principe de la pile",
        targetSkill: "algorithmique",
        points: 5,
        createdBy: admin._id,
      },
      {
        type: "qcm",
        theme: "algorithmique",
        difficulty: "easy",
        content:
          "Quel algorithme de tri a une complexité O(n log n) en moyenne ?",
        options: [
          { label: "Tri à bulles", isCorrect: false },
          { label: "Tri par insertion", isCorrect: false },
          { label: "Tri rapide", isCorrect: true },
          { label: "Tri par sélection", isCorrect: false },
        ],
        explanation:
          "Le tri rapide (quicksort) a une complexité moyenne de O(n log n)",
        targetSkill: "algorithmique",
        points: 5,
        createdBy: admin._id,
      },

      // ALGORITHMIQUE - medium
      {
        type: "open",
        theme: "algorithmique",
        difficulty: "medium",
        content:
          "Expliquez la différence entre une liste chaînée et un tableau.",
        explanation:
          "Tableau : accès direct O(1), taille fixe. Liste chaînée : accès séquentiel O(n), taille dynamique",
        targetSkill: "algorithmique",
        points: 10,
        createdBy: admin._id,
      },
      {
        type: "code",
        theme: "algorithmique",
        difficulty: "medium",
        content:
          "Écrivez une fonction qui vérifie si une chaîne de caractères est un palindrome.",
        explanation:
          'Comparer la chaîne avec son inverse : str === str.split("").reverse().join("")',
        programmingLanguage: "javascript",
        targetSkill: "algorithmique",
        points: 10,
        createdBy: admin._id,
      },
      {
        type: "qcm",
        theme: "algorithmique",
        difficulty: "medium",
        content:
          "Quelle est la complexité de l insertion dans une table de hachage ?",
        options: [
          { label: "O(1) en moyenne", isCorrect: true },
          { label: "O(log n)", isCorrect: false },
          { label: "O(n)", isCorrect: false },
          { label: "O(n²)", isCorrect: false },
        ],
        explanation:
          "Une table de hachage a une complexité O(1) en moyenne pour les opérations",
        targetSkill: "algorithmique",
        points: 10,
        createdBy: admin._id,
      },

      // ALGORITHMIQUE - hard
      {
        type: "code",
        theme: "algorithmique",
        difficulty: "hard",
        content: "Implémentez un algorithme de tri fusion (merge sort).",
        explanation:
          "Diviser récursivement le tableau en deux moitiés, trier chaque moitié et fusionner",
        programmingLanguage: "javascript",
        targetSkill: "algorithmique",
        points: 20,
        createdBy: admin._id,
      },
      {
        type: "open",
        theme: "algorithmique",
        difficulty: "hard",
        content:
          "Expliquez le problème du voyageur de commerce et ses solutions approchées.",
        explanation:
          "NP-difficile, solutions : algorithme glouton, recuit simulé, algorithme génétique",
        targetSkill: "algorithmique",
        points: 20,
        createdBy: admin._id,
      },

      // WEB - easy
      {
        type: "qcm",
        theme: "web",
        difficulty: "easy",
        content: "Que signifie HTML ?",
        options: [
          { label: "Hyper Text Markup Language", isCorrect: true },
          { label: "High Tech Modern Language", isCorrect: false },
          { label: "Hyper Transfer Markup Layer", isCorrect: false },
          { label: "Home Tool Markup Language", isCorrect: false },
        ],
        explanation: "HTML = HyperText Markup Language",
        targetSkill: "web",
        points: 5,
        createdBy: admin._id,
      },
      {
        type: "qcm",
        theme: "web",
        difficulty: "easy",
        content: 'Quel code HTTP signifie "Not Found" ?',
        options: [
          { label: "200", isCorrect: false },
          { label: "301", isCorrect: false },
          { label: "404", isCorrect: true },
          { label: "500", isCorrect: false },
        ],
        explanation: "404 = Not Found, la ressource demandée n existe pas",
        targetSkill: "web",
        points: 5,
        createdBy: admin._id,
      },
      {
        type: "qcm",
        theme: "web",
        difficulty: "easy",
        content: "Quelle méthode HTTP est utilisée pour créer une ressource ?",
        options: [
          { label: "GET", isCorrect: false },
          { label: "POST", isCorrect: true },
          { label: "DELETE", isCorrect: false },
          { label: "PATCH", isCorrect: false },
        ],
        explanation: "POST est utilisé pour créer une nouvelle ressource",
        targetSkill: "web",
        points: 5,
        createdBy: admin._id,
      },

      // WEB - medium
      {
        type: "qcm",
        theme: "web",
        difficulty: "medium",
        content: "Qu est ce que le CORS ?",
        options: [
          { label: "Cross-Origin Resource Sharing", isCorrect: true },
          { label: "Common Object Request Service", isCorrect: false },
          { label: "Client Origin Response System", isCorrect: false },
          { label: "Cross Object Routing Service", isCorrect: false },
        ],
        explanation:
          "CORS permet à une page web d accéder à des ressources d un autre domaine",
        targetSkill: "web",
        points: 10,
        createdBy: admin._id,
      },
      {
        type: "code",
        theme: "web",
        difficulty: "medium",
        content:
          "Écrivez une route Express.js GET qui retourne une liste d utilisateurs en JSON.",
        explanation: 'app.get("/users", (req, res) => res.json(users))',
        programmingLanguage: "javascript",
        targetSkill: "web",
        points: 10,
        createdBy: admin._id,
      },
      {
        type: "open",
        theme: "web",
        difficulty: "medium",
        content:
          "Expliquez la différence entre l authentification par session et par JWT.",
        explanation:
          "Session : état côté serveur. JWT : token stateless côté client",
        targetSkill: "web",
        points: 10,
        createdBy: admin._id,
      },

      // WEB - hard
      {
        type: "code",
        theme: "web",
        difficulty: "hard",
        content:
          "Implémentez un middleware d authentification JWT avec Fastify.",
        explanation:
          "Vérifier le token dans le header Authorization, décoder avec jsonwebtoken",
        programmingLanguage: "javascript",
        targetSkill: "web",
        points: 20,
        createdBy: admin._id,
      },
      {
        type: "open",
        theme: "web",
        difficulty: "hard",
        content:
          "Expliquez l architecture microservices et ses avantages/inconvénients.",
        explanation:
          "Services indépendants, scalabilité individuelle, complexité opérationnelle accrue",
        targetSkill: "web",
        points: 20,
        createdBy: admin._id,
      },

      // DB - easy
      {
        type: "qcm",
        theme: "DB",
        difficulty: "easy",
        content: "Que signifie SQL ?",
        options: [
          { label: "Structured Query Language", isCorrect: true },
          { label: "Simple Query Language", isCorrect: false },
          { label: "Standard Query Logic", isCorrect: false },
          { label: "Sequential Query Language", isCorrect: false },
        ],
        explanation: "SQL = Structured Query Language",
        targetSkill: "DB",
        points: 5,
        createdBy: admin._id,
      },
      {
        type: "qcm",
        theme: "DB",
        difficulty: "easy",
        content: "Quelle commande SQL permet de récupérer des données ?",
        options: [
          { label: "INSERT", isCorrect: false },
          { label: "UPDATE", isCorrect: false },
          { label: "SELECT", isCorrect: true },
          { label: "DELETE", isCorrect: false },
        ],
        explanation: "SELECT est utilisé pour récupérer des données",
        targetSkill: "DB",
        points: 5,
        createdBy: admin._id,
      },
      {
        type: "qcm",
        theme: "DB",
        difficulty: "easy",
        content: "Qu est ce qu une clé primaire ?",
        options: [
          { label: "Un champ qui peut être null", isCorrect: false },
          { label: "Un identifiant unique pour chaque ligne", isCorrect: true },
          { label: "Un champ obligatoire", isCorrect: false },
          { label: "Un index sur plusieurs colonnes", isCorrect: false },
        ],
        explanation:
          "La clé primaire identifie de manière unique chaque enregistrement",
        targetSkill: "DB",
        points: 5,
        createdBy: admin._id,
      },

      // DB - medium
      {
        type: "code",
        theme: "DB",
        difficulty: "medium",
        content:
          "Écrivez une requête SQL pour obtenir les 5 employés les mieux payés.",
        explanation: "SELECT * FROM employees ORDER BY salary DESC LIMIT 5",
        programmingLanguage: "sql",
        targetSkill: "DB",
        points: 10,
        createdBy: admin._id,
      },
      {
        type: "open",
        theme: "DB",
        difficulty: "medium",
        content:
          "Expliquez la différence entre une base de données SQL et NoSQL.",
        explanation:
          "SQL : structuré, ACID, relations. NoSQL : flexible, scalable, documents/clé-valeur",
        targetSkill: "DB",
        points: 10,
        createdBy: admin._id,
      },
      {
        type: "qcm",
        theme: "DB",
        difficulty: "medium",
        content: "Qu est ce qu un index dans une base de données ?",
        options: [
          { label: "Une contrainte d intégrité", isCorrect: false },
          { label: "Une structure qui accélère les requêtes", isCorrect: true },
          { label: "Une clé étrangère", isCorrect: false },
          { label: "Une vue matérialisée", isCorrect: false },
        ],
        explanation:
          "Un index accélère les opérations de recherche dans une table",
        targetSkill: "DB",
        points: 10,
        createdBy: admin._id,
      },

      // DB - hard
      {
        type: "code",
        theme: "DB",
        difficulty: "hard",
        content:
          "Écrivez une requête MongoDB pour obtenir les candidats avec un score supérieur à 80, groupés par niveau de formation.",
        explanation:
          'db.candidates.aggregate([{$match: {"scores.global": {$gt: 80}}}, {$group: {_id: "$education.level", count: {$sum: 1}}}])',
        programmingLanguage: "javascript",
        targetSkill: "DB",
        points: 20,
        createdBy: admin._id,
      },
      {
        type: "open",
        theme: "DB",
        difficulty: "hard",
        content:
          "Expliquez les propriétés ACID et leur importance dans les transactions.",
        explanation:
          "Atomicité, Cohérence, Isolation, Durabilité - garantissent l intégrité des données",
        targetSkill: "DB",
        points: 20,
        createdBy: admin._id,
      },

      // RESEAU - easy
      {
        type: "qcm",
        theme: "réseau",
        difficulty: "easy",
        content: "Quel protocole est utilisé pour naviguer sur le web ?",
        options: [
          { label: "FTP", isCorrect: false },
          { label: "HTTP", isCorrect: true },
          { label: "SMTP", isCorrect: false },
          { label: "SSH", isCorrect: false },
        ],
        explanation: "HTTP = HyperText Transfer Protocol",
        targetSkill: "réseau",
        points: 5,
        createdBy: admin._id,
      },
      {
        type: "qcm",
        theme: "réseau",
        difficulty: "easy",
        content: "Sur quel port fonctionne HTTPS par défaut ?",
        options: [
          { label: "80", isCorrect: false },
          { label: "443", isCorrect: true },
          { label: "22", isCorrect: false },
          { label: "21", isCorrect: false },
        ],
        explanation: "HTTPS utilise le port 443 par défaut",
        targetSkill: "réseau",
        points: 5,
        createdBy: admin._id,
      },

      // RESEAU - medium
      {
        type: "qcm",
        theme: "réseau",
        difficulty: "medium",
        content: "Quelle est la différence entre TCP et UDP ?",
        options: [
          { label: "TCP est plus rapide qu UDP", isCorrect: false },
          { label: "TCP garantit la livraison, UDP non", isCorrect: true },
          { label: "UDP est orienté connexion", isCorrect: false },
          {
            label: "TCP est utilisé pour le streaming vidéo",
            isCorrect: false,
          },
        ],
        explanation:
          "TCP garantit la livraison et l ordre des paquets, UDP est plus rapide mais sans garantie",
        targetSkill: "réseau",
        points: 10,
        createdBy: admin._id,
      },
      {
        type: "open",
        theme: "réseau",
        difficulty: "medium",
        content: "Expliquez le modèle OSI et ses 7 couches.",
        explanation:
          "Physique, Liaison, Réseau, Transport, Session, Présentation, Application",
        targetSkill: "réseau",
        points: 10,
        createdBy: admin._id,
      },

      // RESEAU - hard
      {
        type: "open",
        theme: "réseau",
        difficulty: "hard",
        content: "Expliquez comment fonctionne le protocole TLS/SSL.",
        explanation:
          "Handshake, échange de clés, chiffrement asymétrique puis symétrique",
        targetSkill: "réseau",
        points: 20,
        createdBy: admin._id,
      },
      {
        type: "open",
        theme: "réseau",
        difficulty: "hard",
        content: "Qu est ce qu une attaque DDoS et comment s en protéger ?",
        explanation:
          "Saturation de serveur par requêtes massives. Protection : rate limiting, CDN, firewall",
        targetSkill: "réseau",
        points: 20,
        createdBy: admin._id,
      },
    ];

    await Question.insertMany(questions);
    console.log(`${questions.length} questions créées avec succès !`);
  } catch (err) {
    console.error("Erreur seed questions :", err);
  }
};
