import React, { useState, useRef, useEffect } from 'react';
import './AudioRecorder.css';

const API_URL = 'http://localhost:3001/api';

const AudioRecorder = ({ savedQuestions = [], setSavedQuestions }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [personalitySettings, setPersonalitySettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const recognitionRef = useRef(null);

  // Fetch personality settings when component mounts
  useEffect(() => {
    fetchPersonalitySettings();
  }, []);

  const fetchPersonalitySettings = async () => {
    try {
      const response = await fetch(`${API_URL}/settings`);
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();
      console.log('Received settings:', data);
      if (data.settings) {
        setPersonalitySettings(data.settings);
      } else {
        console.error('Settings data is missing:', data);
        throw new Error('Invalid settings format');
      }
    } catch (error) {
      console.error('Error fetching personality settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTranscription = async (text) => {
    if (!personalitySettings) {
      console.error('Personality settings not loaded yet');
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const newRecord = {
        text,
        timestamp,
        id: Date.now(),
        context: {
          personality: personalitySettings,
          conversationHistory: Array.isArray(savedQuestions) ? savedQuestions.map(q => ({
            text: q.text,
            timestamp: q.timestamp
          })) : []
        }
      };

      console.log('Sending record to backend:', JSON.stringify(newRecord, null, 2));

      const response = await fetch(`${API_URL}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRecord),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend error response:', errorData);
        throw new Error(errorData.details || 'Failed to save record');
      }

      const data = await response.json();
      console.log('Backend response:', data);
      
      if (!data.response) {
        console.warn('No response received from backend');
      }

      // Update the questions list with the new record including the response
      const updatedRecord = {
        ...newRecord,
        response: data.response || 'No response received'
      };
      
      console.log('Updating questions with:', updatedRecord);
      setSavedQuestions(prevQuestions => {
        const currentQuestions = Array.isArray(prevQuestions) ? prevQuestions : [];
        return [updatedRecord, ...currentQuestions];
      });
    } catch (error) {
      console.error('Error saving record:', error);
    }
  };

  const startRecording = () => {
    try {
      // Check if browser supports speech recognition
      if (!('webkitSpeechRecognition' in window)) {
        console.error('Speech recognition not supported in this browser');
        return;
      }

      // Initialize speech recognition
      const recognition = new window.webkitSpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        console.log('Transcription:', transcript);
        setTranscription(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };

      recognition.start();
      console.log('Speech recognition started');
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  };

  const stopRecording = async () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      console.log('Speech recognition stopped');
      setIsRecording(false);
      
      // Save the final transcription when recording stops
      if (transcription) {
        await saveTranscription(transcription);
      }
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="audio-recorder">
      {isLoading ? (
        <p>Loading personality settings...</p>
      ) : !personalitySettings ? (
        <p>Error loading personality settings. Please try refreshing the page.</p>
      ) : (
        <>
          <div className="recorder-container">
            <button
              className={`record-button ${isRecording ? 'recording' : ''}`}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
            >
              {isRecording ? 'Recording...' : 'Hold to Record'}
            </button>
            {transcription && (
              <div className="transcription">
                <h3>Your Question:</h3>
                <p>{transcription}</p>
              </div>
            )}
            {savedQuestions.length > 0 && (
              <div className="saved-questions">
                <h3>Previous Questions:</h3>
                <ul>
                  {savedQuestions.map((record) => (
                    <li key={record.id}>
                      <p className="question-text">{record.text}</p>
                      <span className="timestamp">{formatTimestamp(record.timestamp)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AudioRecorder; 