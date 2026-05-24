export default {
content: [
"./index.html",
"./src/**/*.{js,ts,jsx,tsx}",
],
theme: {
extend: {
colors: {
'jet-black': '#050505',
'graphite': '#1a1a1a',
'chrome': '#d4d4d4',
'candy-red': '#ff0033',
'neon-blue': '#00f3ff',
'money-green': '#00ff9d',
'glass-panel': 'rgba(20, 20, 20, 0.85)',
'glass-border': 'rgba(255, 255, 255, 0.15)',
},
fontFamily: {
sans: ['Roboto', 'sans-serif'],
display: ['Montserrat', 'sans-serif'],
},
backgroundImage: {
'carbon': 'radial-gradient(black 15%, transparent 16%), radial-gradient(black 15%, transparent 16%), radial-gradient(rgba(255,255,255,.1) 15%, transparent 20%), radial-gradient(rgba(255,255,255,.1) 15%, transparent 20%)',
},
backgroundSize: {
'carbon-size': '16px 16px',
},
backgroundPosition: {
'carbon-pos': '0 0, 8px 8px, 0 1px, 8px 9px',
}
},
},
plugins: [],
}