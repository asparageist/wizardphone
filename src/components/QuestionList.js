import React from 'react';
import './QuestionList.css';

const QuestionList = ({ questions = [] }) => {
  if (!Array.isArray(questions)) {
    console.error('Questions prop is not an array:', questions);
    return <div className="question-list">Error: Invalid questions data</div>;
  }

  return (
    <div className="question-list">
      <h2>Conversation History</h2>
      <div className="questions-container">
        {questions.map((question) => {
          if (!question || typeof question !== 'object') {
            console.error('Invalid question data:', question);
            return null;
          }

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