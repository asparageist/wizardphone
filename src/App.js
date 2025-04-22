import React, { useState, useEffect } from 'react';
import './App.css';
import AudioRecorder from './components/AudioRecorder';
import PersonalitySettings from './components/PersonalitySettings';
import QuestionList from './components/QuestionList';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSavedQuestions = async () => {
      try {
        const response = await fetch(`${API_URL}/records`);
        if (!response.ok) {
          throw new Error('Failed to fetch records');
        }
        const data = await response.json();
        console.log('Fetched saved questions:', data);
        setSavedQuestions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching records:', error);
        setSavedQuestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedQuestions();
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
