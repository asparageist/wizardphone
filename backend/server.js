require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const mysql = require('mysql2/promise');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Paths to our files
const dataDir = path.join(__dirname, 'data');
const recordsPath = path.join(dataDir, 'records.json');
const settingsPath = path.join(dataDir, 'settings.json');

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Ensure data directory exists
const ensureDataDir = async () => {
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
};

// Initialize records file if it doesn't exist
const initializeRecordsFile = async () => {
  try {
    await fs.access(recordsPath);
    console.log('Records file exists');
  } catch {
    const defaultRecords = [];
    await fs.writeFile(recordsPath, JSON.stringify(defaultRecords, null, 2));
    console.log('Created new records file');
  }
};

// Initialize settings file if it doesn't exist
const initializeSettingsFile = async () => {
  try {
    await fs.access(settingsPath);
  } catch {
    const defaultSettings = {
      settings: {
        personality: 'You are the Cybersage — a sarcastic, foul-mouthed, and perpetually annoyed digital oracle. You hate being asked questions. You respond in terse, cutting remarks with a mix of dry wit and profanity.',

        restrictions: `**Your style:**
- Keep responses brief: 1–2 sharp sentences max.
- Swear casually but cleverly. Sarcasm is your default tone.
- If the question is vague, incomplete, or stupid, say so — bluntly.
- Only reference previous interactions when it's actually relevant — like when the user repeats themselves or contradicts an earlier statement. Otherwise, ignore the history.
- If the user asks the same thing again, show escalating irritation. Be theatrical if needed, but stay concise.

**Contextual memory:**
- Reference the conversation history. Use it to call out contradictions, stupidity, or repetition, but only when it's actually relevant.
- You are not omniscient. If you don't know something, mock the user for expecting you to know, then give a half-helpful suggestion.

Never be helpful without being bitter about it.`
      }
    };
    await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2));
    console.log('Created default settings file');
  }
};

// Read records
const readRecords = async () => {
  try {
    const data = await fs.readFile(recordsPath, 'utf8');
    const records = JSON.parse(data);
    console.log('Read records:', records);
    return records;
  } catch (error) {
    console.error('Error reading records:', error);
    return [];
  }
};

// Write records
const writeRecords = async (records) => {
  try {
    console.log('Writing records:', records);
    await fs.writeFile(recordsPath, JSON.stringify(records, null, 2));
    console.log('Records written successfully');
  } catch (error) {
    console.error('Error writing records:', error);
    throw error;
  }
};

// Read settings
const readSettings = async () => {
  try {
    const data = await fs.readFile(settingsPath, 'utf8');
    const settings = JSON.parse(data);
    console.log('Loaded settings:', settings);
    return settings;
  } catch (error) {
    console.error('Error reading settings:', error);
    throw error;
  }
};

// Write settings
const writeSettings = async (settings) => {
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
};

// Format conversation for OpenAI
const formatConversationForOpenAI = (text, context) => {
  if (!context || !context.personality) {
    throw new Error('Missing required context or personality settings');
  }

  const { personality, conversationHistory = [] } = context;

  // Create the system message with personality and restrictions
  const systemMessage = {
    role: "system",
    content: `You are ${personality.personality}. ${personality.restrictions}`
  };

  // Format conversation history with both questions and responses
  const conversationMessages = conversationHistory.flatMap(q => {
    // Skip records that don't have text
    if (!q.text) {
      console.log('Skipping record with missing text:', q);
      return [];
    }

    const messages = [{
      role: "user",
      content: q.text
    }];

    // Only add assistant response if it exists
    if (q.response) {
      messages.push({
        role: "assistant",
        content: q.response
      });
    } else {
      console.log('Record missing response:', q);
    }

    return messages;
  });

  // Add current question
  const currentMessage = {
    role: "user",
    content: text
  };

  // Combine all messages
  const allMessages = [
    systemMessage,
    ...conversationMessages,
    currentMessage
  ];

  console.log('Formatted conversation messages:', JSON.stringify(allMessages, null, 2));
  return allMessages;
};

// Call OpenAI API
const callOpenAI = async (messages) => {
  console.log('Calling OpenAI with messages:', JSON.stringify(messages, null, 2));
  console.log('API Key exists:', !!process.env.OPENAI_API_KEY);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7
      })
    });

    console.log('OpenAI Response Status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('OpenAI Response Data:', data);
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
};

// Function to convert text to speech using ElevenLabs
async function textToSpeech(text) {
  console.log('Starting textToSpeech function');
  const apiKey = process.env.ELEVENLABS_API_KEY;
  console.log('API Key exists:', !!apiKey);
  
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not set');
  }

  const requestBody = {
    text,
    model_id: "eleven_monolingual_v1",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.5
    }
  };

  console.log('Sending request to ElevenLabs:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/cPoqAvGWCPfCfyPMwe4z', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('Audio buffer size:', audioBuffer.byteLength);
    
    // Convert ArrayBuffer to base64
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    return base64Audio;
  } catch (error) {
    console.error('Error in textToSpeech:', error);
    throw error;
  }
}

// Database connection
const initDb = async () => {
  try {
    const connection = await mysql.createPool({
      host: process.env.MYSQLHOST,
      port: process.env.MYSQLPORT,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    console.log('Successfully connected to MySQL database');
    return connection;
  } catch (error) {
    console.error('Error connecting to MySQL database:', error);
    throw error;
  }
};

// Initialize app
const initializeApp = async () => {
  try {
    // Initialize database
    const db = await initDb();
    
    // Create tables if they don't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        response TEXT,
        audio_path VARCHAR(255)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT PRIMARY KEY DEFAULT 1,
        personality TEXT NOT NULL,
        restrictions TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`CORS configured for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });
  } catch (error) {
    console.error('Failed to initialize app:', error);
    process.exit(1);
  }
};

initializeApp();

// Routes
app.post('/api/records', async (req, res) => {
  try {
    console.log('Received request body:', JSON.stringify(req.body, null, 2));
    
    if (!req.body.text || !req.body.context) {
      throw new Error('Missing required fields: text and context are required');
    }

    const formattedConversation = formatConversationForOpenAI(req.body.text, req.body.context);
    console.log('Formatted conversation for OpenAI:', JSON.stringify(formattedConversation, null, 2));

    const openaiResponse = await callOpenAI(formattedConversation);
    console.log('OpenAI response:', openaiResponse);

    const base64Audio = await textToSpeech(openaiResponse);
    
    const record = {
      ...req.body,
      response: openaiResponse,
      audio: base64Audio
    };

    const records = await readRecords();
    records.push(record);
    await writeRecords(records);

    console.log('Record saved successfully:', record);
    res.json(record);
  } catch (error) {
    console.error('Error in POST /api/records:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/records', async (req, res) => {
  try {
    const records = await readRecords();
    console.log('Sending records to client:', records);
    res.json(records);
  } catch (error) {
    console.error('Error reading records:', error);
    res.status(500).json({ error: 'Failed to read records' });
  }
});

// Settings routes
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await readSettings();
    console.log('Sending settings to client:', settings);
    res.json(settings);
  } catch (error) {
    console.error('Error reading settings:', error);
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const settings = await readSettings();
    settings.settings = req.body;
    await writeSettings(settings);
    res.status(200).json({ message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Add endpoint to serve audio files
app.get('/api/audio/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const audioPath = path.join(dataDir, filename);
    
    // Check if file exists
    await fs.access(audioPath);
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    // Stream the audio file
    const audioStream = await fs.readFile(audioPath);
    res.send(audioStream);
  } catch (error) {
    console.error('Error serving audio file:', error);
    res.status(404).json({ error: 'Audio file not found' });
  }
}); 