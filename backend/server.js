require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Paths to our files
const recordsPath = path.join(__dirname, 'data', 'records.json');
const settingsPath = path.join(__dirname, 'data', 'settings.json');

// Ensure data directory exists
const ensureDataDir = async () => {
  const dataDir = path.join(__dirname, 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir);
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
        personality: "a busy and frustrated wizard who is bored and annoyed by the user",
        restrictions: "Keep responses brief and terse. Use swear words and sarcasm. If there are repeated questions, lose your temper."
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

  // Format conversation history
  const conversationMessages = conversationHistory.map(q => ({
    role: "user",
    content: q.text
  }));

  // Add current question
  const currentMessage = {
    role: "user",
    content: text
  };

  // Combine all messages
  return [
    systemMessage,
    ...conversationMessages,
    currentMessage
  ];
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

// Initialize the data directory and files
const initializeApp = async () => {
  try {
    await ensureDataDir();
    await initializeRecordsFile();
    await initializeSettingsFile();
    console.log('App initialization complete');
  } catch (error) {
    console.error('Error during app initialization:', error);
  }
};

// Call initialization
initializeApp();

// Routes
app.post('/api/records', async (req, res) => {
  try {
    console.log('Received request body:', JSON.stringify(req.body, null, 2));
    
    const { text, context } = req.body;
    if (!text || !context) {
      throw new Error('Missing required fields: text and context');
    }

    const formattedConversation = formatConversationForOpenAI(text, context);
    console.log('Formatted conversation for OpenAI:', JSON.stringify(formattedConversation, null, 2));

    const aiResponse = await callOpenAI(formattedConversation);
    console.log('Received AI response:', aiResponse);

    const record = {
      text,
      timestamp: new Date().toISOString(),
      context,
      response: aiResponse
    };

    const records = await readRecords();
    records.push(record);
    await writeRecords(records);

    console.log('Record saved successfully:', record);
    res.json(record);
  } catch (error) {
    console.error('Error processing record:', error);
    res.status(500).json({ 
      error: 'Failed to process record', 
      details: error.message 
    });
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 