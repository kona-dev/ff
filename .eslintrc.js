module.exports = {
  extends: 'next/core-web-vitals',
  rules: {
    // Add exceptions if needed
    'react-hooks/exhaustive-deps': 'warn', // Downgrade to warning if needed
  }
} 