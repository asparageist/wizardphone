import React, { useState, useEffect } from 'react';
import './PersonalitySettings.css';

const API_URL = 'http://localhost:3001/api';

const PersonalitySettings = () => {
  const [settings, setSettings] = useState({
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
  });

  // Fetch settings when component mounts
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/settings`);
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <div className="personality-settings">
      <h2>AI Personality Settings</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="personality">Personality:</label>
          <textarea
            id="personality"
            name="personality"
            value={settings.personality}
            onChange={handleChange}
            rows="3"
            placeholder="Describe the AI's personality..."
          />
        </div>
        <div className="form-group">
          <label htmlFor="restrictions">Restrictions:</label>
          <textarea
            id="restrictions"
            name="restrictions"
            value={settings.restrictions}
            onChange={handleChange}
            rows="3"
            placeholder="Set any restrictions or guidelines..."
          />
        </div>
        <button type="submit" className="save-button">
          Save Settings
        </button>
      </form>
    </div>
  );
};

export default PersonalitySettings; 