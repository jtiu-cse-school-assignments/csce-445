var admin = require("firebase-admin");
var serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://rpgrocery-51091.firebaseio.com"
});

// Firebase project's database
const db = admin.firestore();
const settings = {timestampsInSnapshots: true};
db.settings(settings);

exports.db = db;
exports.admin = admin;