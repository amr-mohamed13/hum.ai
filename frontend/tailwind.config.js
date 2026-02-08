/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'spotify-black': '#121212',
                'spotify-dark': '#181818',
                'spotify-gray': '#282828',
                'spotify-light-gray': '#b3b3b3',
                'spotify-green': '#1db954',
                'spotify-green-hover': '#1ed760',
            },
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
