import React, { useState, useEffect } from 'react';
import './App.css';
import AudioRecorder from './components/AudioRecorder';
import PersonalitySettings from './components/PersonalitySettings';
import QuestionList from './components/QuestionList';
import config from './config';

function App() {
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await fetch(`${config.API_URL}/records`);
        const data = await response.json();
        setSavedQuestions(data);
      } catch (error) {
        console.error('Error fetching records:', error);
      }
    };

    fetchRecords();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Wizard Phone</h1>
      </header>
      <main>
        <div className="settings-section">
          <PersonalitySettings />
        </div>
        <div className="recorder-section">
          <AudioRecorder 
            savedQuestions={savedQuestions}
            setSavedQuestions={setSavedQuestions}
          />
        </div>
        <div className="history-section">
          {isLoading ? (
            <p>Loading conversation history...</p>
          ) : (
            <QuestionList questions={savedQuestions} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
