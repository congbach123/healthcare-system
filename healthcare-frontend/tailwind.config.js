/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3498db',
        'primary-dark': '#2980b9',
        secondary: '#2ecc71',
        'secondary-dark': '#27ae60',
        warning: '#e67e22',
        danger: '#e74c3c',
        'light-gray': '#f5f5f5',
        'medium-gray': '#e0e0e0',
        'dark-gray': '#7f8c8d',
        'text-color': '#333333',
      },
      boxShadow: {
        card: '0 2px 5px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
}