/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Church brand colors
        'church': {
          'green-dark': '#004B3D',      // Dark teal/green
          'green-medium': '#2F5F54',    // Medium green
          'green': '#39704D',           // Forest green
          'gray-warm': '#988F83',       // Warm gray
          'cream': '#E8E5E1',           // Light cream
          'blue': '#0047AB',            // Royal blue
          'blue-dark': '#3E5266',       // Dark slate blue
          'navy': '#1F2937',            // Navy (existing dark)
          'gold-dark': '#B8860B',       // Dark gold
          'gold': '#C9A961',            // Gold
          'gold-light': '#F4C542',      // Bright gold
          'slate': '#2B2B2B',           // Dark slate
        },
        // Override default grays with church palette
        'primary': {
          50: '#F0F4F3',
          100: '#E8E5E1',
          200: '#D1CCC4',
          300: '#988F83',
          400: '#6B6256',
          500: '#2F5F54',
          600: '#39704D',
          700: '#004B3D',
          800: '#2B2B2B',
          900: '#1F2937',
        },
        'accent': {
          50: '#FEF9E7',
          100: '#FDF4D3',
          200: '#F4C542',
          300: '#C9A961',
          400: '#B8860B',
          500: '#0047AB',
          600: '#3E5266',
          700: '#004B3D',
        }
      },
    },
  },
  plugins: [],
}
