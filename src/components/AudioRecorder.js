import React, { useState, useRef, useEffect } from 'react';
import './AudioRecorder.css';
import config from '../config';

const AudioRecorder = ({ savedQuestions = [], setSavedQuestions }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [personalitySettings, setPersonalitySettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [lastRecordTimestamp, setLastRecordTimestamp] = useState(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  const playAudio = (base64Audio) => {
    if (base64Audio) {
      const audioSrc = `data:audio/mpeg;base64,${base64Audio}`;
      if (audioRef.current) {
        audioRef.current.src = audioSrc;
        audioRef.current.play();
        setIsSpeaking(true);
      }
    }
  };

  useEffect(() => {
    if (currentAudio) {
      playAudio(currentAudio);
    }
  }, [currentAudio]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        setIsSpeaking(false);
      };
    }
  }, []);

  // Fetch personality settings when component mounts
  useEffect(() => {
    fetchSettings();
  }, []);

  // Check for data purge
  useEffect(() => {
    const checkRecords = async () => {
      try {
        const response = await fetch(`${config.API_URL}/records`);
        if (!response.ok) {
          throw new Error('Failed to fetch records');
        }
        const data = await response.json();
        
        // If we have saved questions but backend has none, clear the frontend state
        if (savedQuestions.length > 0 && (!data || data.length === 0)) {
          console.log('Backend data purged, clearing frontend state');
          setSavedQuestions([]);
          setTranscription('');
          setCurrentResponse('');
          setCurrentAudio(null);
        }
        
        // Update last record timestamp
        if (data && data.length > 0) {
          setLastRecordTimestamp(data[0].timestamp);
        }
      } catch (error) {
        console.error('Error checking records:', error);
      }
    };

    // Check every 5 seconds
    const interval = setInterval(checkRecords, 5000);
    return () => clearInterval(interval);
  }, [savedQuestions]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${config.API_URL}/settings`);
      const data = await response.json();
      setPersonalitySettings(data.settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const saveTranscription = async (text) => {
    if (!personalitySettings) {
      console.error('Personality settings not loaded yet');
      return;
    }

    try {
      setIsThinking(true);
      const timestamp = new Date().toISOString();
      
      // First check if backend has any records
      const recordsResponse = await fetch(`${config.API_URL}/records`);
      const backendRecords = await recordsResponse.json();
      
      const context = {
        personality: personalitySettings,
        conversationHistory: backendRecords.length > 0 ? backendRecords : []
      };

      const newRecord = {
        text,
        timestamp,
        id: Date.now(),
        context
      };

      const response = await fetch(`${config.API_URL}/records`, {
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
      
      const updatedRecord = {
        ...newRecord,
        response: data.response || 'No response received',
        audio: data.audio || null
      };
      
      setSavedQuestions(prevQuestions => {
        const currentQuestions = Array.isArray(prevQuestions) ? prevQuestions : [];
        return [updatedRecord, ...currentQuestions];
      });

      if (data.audio) {
        setCurrentAudio(data.audio);
      }
      setCurrentResponse(data.response || 'No response received');
    } catch (error) {
      console.error('Error saving record:', error);
    } finally {
      setIsThinking(false);
    }
  };

  const startRecording = () => {
    try {
      if (!('webkitSpeechRecognition' in window)) {
        console.error('Speech recognition not supported in this browser');
        return;
      }

      const recognition = new window.webkitSpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        setTranscription(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };

      recognition.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  };

  const stopRecording = async () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      
      if (transcription) {
        await saveTranscription(transcription);
      }
    }
  };

  const getButtonState = () => {
    if (isSpeaking) return 'speaking';
    if (isThinking) return 'thinking';
    if (isRecording) return 'recording';
    return 'waiting';
  };

  return (
    <div className="audio-recorder">
      <audio ref={audioRef} />
      {isLoading ? (
        <div className="loading-state">
          <div className="button-placeholder waiting" />
        </div>
      ) : !personalitySettings ? (
        <div className="error-state">
          <p>Error loading personality settings. Please try refreshing the page.</p>
        </div>
      ) : (
        <div className="recorder-container">
          {transcription && (
            <div className="question-overlay">
              {transcription}
            </div>
          )}
          <button
            className={`record-button ${getButtonState()}`}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
          />
          {currentResponse && (
            <div className="response-overlay">
              {currentResponse}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioRecorder; 