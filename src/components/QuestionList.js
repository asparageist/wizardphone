import React, { useState } from 'react';
import './QuestionList.css';

const QuestionList = ({ questions = [] }) => {
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);

  if (!Array.isArray(questions)) {
    console.error('Questions prop is not an array:', questions);
    return <div className="question-list">Error: Invalid questions data</div>;
  }

  const handlePlayAudio = (audioFilename) => {
    console.log('Playing audio:', audioFilename);
    if (currentlyPlaying === audioFilename) {
      // If the same audio is playing, stop it
      setCurrentlyPlaying(null);
    } else {
      // Play the new audio
      setCurrentlyPlaying(audioFilename);
    }
  };

  return (
    <div className="question-list">
      <h2>Conversation History</h2>
      <div className="questions-container">
        {questions.map((question) => {
          if (!question || typeof question !== 'object') {
            console.error('Invalid question data:', question);
            return null;
          }

          console.log('Rendering question:', question);

          return (
            <div key={question.id || question.timestamp} className="question-item">
              <div className="question">
                <span className="timestamp">
                  {question.timestamp ? new Date(question.timestamp).toLocaleTimeString() : 'No timestamp'}
                </span>
                <p className="question-text">{question.text || 'No question text'}</p>
              </div>
              {question.response && (
                <div className="response">
                  <p className="response-text">{question.response}</p>
                  {question.audioFilename && (
                    <div className="audio-player">
                      <button 
                        className={`play-button ${currentlyPlaying === question.audioFilename ? 'playing' : ''}`}
                        onClick={() => handlePlayAudio(question.audioFilename)}
                      >
                        {currentlyPlaying === question.audioFilename ? '⏹' : '▶'}
                      </button>
                      {currentlyPlaying === question.audioFilename && (
                        <audio 
                          autoPlay 
                          onEnded={() => setCurrentlyPlaying(null)}
                          src={`http://localhost:3001/api/audio/${question.audioFilename}`}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionList; 