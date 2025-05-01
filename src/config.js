const config = {
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api'
};

// Debug log to verify environment variable
console.log('API URL:', config.API_URL);
console.log('Environment:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);

export default config; 