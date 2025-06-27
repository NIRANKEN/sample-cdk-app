export const apiConfig = {
  // For local development with SAM Local, use http://localhost:3000
  // For deployed environments, REACT_APP_API_BASE_URL should be set via build environment variables
  baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000',
};
