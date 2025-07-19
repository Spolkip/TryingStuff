// Load environment variables from .env file
// This should be the very first line of your file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const admin = require('firebase-admin');

// --- FIREBASE SETUP ---
// Assemble the service account credentials from environment variables
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  // Replace the literal '\n' characters with actual newlines
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const db = admin.firestore();
const bucket = admin.storage().bucket();
const app = express();

app.use(cors());
app.use(express.json());

// --- FILE UPLOAD SETUP ---
const upload = multer({ storage: multer.memoryStorage() });

// --- API ROUTES ---

// Route to handle spreadsheet uploads
app.post('/api/upload', upload.single('spreadsheet'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const blob = bucket.file(`uploads/${Date.now()}_${req.file.originalname}`);
  const blobStream = blob.createWriteStream({
    resumable: false,
  });

  blobStream.on('error', err => {
    console.error(err);
    res.status(500).send({ message: 'Error uploading to Firebase Storage.', error: err });
  });

  blobStream.on('finish', () => {
    processSpreadsheet(req.file.buffer, req.file.originalname)
      .then(() => {
        res.status(200).send({ message: 'File uploaded and processing started.' });
      })
      .catch(err => {
        console.error('Processing error:', err);
        res.status(500).send({ message: 'Error processing the spreadsheet.', error: err });
      });
  });

  blobStream.end(req.file.buffer);
});

// Route to get all players
app.get('/api/players', async (req, res) => {
    try {
        const playersSnapshot = await db.collection('players').get();
        const players = [];
        playersSnapshot.forEach(doc => {
            players.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).json(players);
    } catch (err) {
        console.error('Error fetching players:', err);
        res.status(500).send({ message: 'Error fetching players.', error: err });
    }
});


// --- DATA PROCESSING FUNCTION ---
async function processSpreadsheet(buffer, originalname) {
  const data = buffer.toString('utf-8');
  const rows = data.split(/\r?\n/).slice(1); // Handle both Windows and Unix line endings

  for (const row of rows) {
    // This regex handles commas inside of quoted strings
    const columns = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
    if (columns.length < 11) continue;

    const iggId = columns[0]?.trim();
    if (!iggId || !/^\d+$/.test(iggId)) continue; // Skip if IGG ID is missing or not a number

    const name = columns[1]?.replace(/"/g, '').trim();
    const might = parseInt(columns[2]?.replace(/"/g, '').replace(/,/g, ''), 10);
    const kills = parseInt(columns[3]?.replace(/"/g, '').replace(/,/g, ''), 10);

    if (isNaN(might) || isNaN(kills)) continue;

    const playerData = {
      name,
      might,
      kills,
      rank: columns[6]?.trim() || 'N/A',
      t4_t5: columns[7]?.trim() || 'N/A',
      sigils: parseInt(columns[8]?.trim(), 10) || 0,
      mana: columns[9]?.trim() || 'N/A',
      discordName: columns[10]?.trim() || 'N/A',
      last_updated: new Date()
    };

    const playerRef = db.collection('players').doc(iggId);
    const historyRef = db.collection('player_history');

    const doc = await playerRef.get();
    if (doc.exists) {
        const previousData = doc.data();
        playerData.mightIncrease = playerData.might - (previousData.might || 0);
        playerData.killsIncrease = playerData.kills - (previousData.kills || 0);
    } else {
        playerData.mightIncrease = 0;
        playerData.killsIncrease = 0;
    }

    await playerRef.set(playerData, { merge: true });

    await historyRef.add({
      iggId,
      date: new Date(),
      might: playerData.might,
      kills: playerData.kills,
      spreadsheet_name: originalname
    });
  }
  console.log('Spreadsheet processing complete.');
}


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
