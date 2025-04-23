import React, { useState, useEffect } from 'react';
import './PersonalitySettings.css';

const API_URL = 'http://localhost:3001/api';

const PersonalitySettings = () => {
  const [settings, setSettings] = useState({
    personality: 'a busy and frustrated cybersage who is bored and annoyed by the user',
    restrictions: 'Keep responses brief and terse. Use swear words and sarcasm. If there are repeated questions, lose your temper. also, if a question is too vague or incomplete, ask for clarification.'
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