/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#0a0a0a', // Preto quase absoluto
        'brand-card': '#171717', // Cinza chumbo para cartões
        'brand-yellow': '#FACC15', // Amarelo vibrante
        'brand-green': '#22c55e', // Verde neon
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'], // Isso força a fonte nova
      },
    
      backgroundImage: {
        'hero-pattern': "linear-gradient(to bottom, rgba(10,10,10,0.3), rgba(10,10,10,0.95)), url('https://images.unsplash.com/photo-1571008887538-b36bb32f4571?q=80&w=2070&auto=format&fit=crop')",
      }
    },
  },
  plugins: [],
}