/**
 * Home Page - Minimal Landing
 * ============================
 * Hero image only, no content.
 */

import heroImage from '../assets/Hero-Section.png';

// Nav height constant (must match TopNav)
const NAV_HEIGHT = 64;

export function Home() {
    return (
        <div className="w-full">
            {/* Hero Section - Full height */}
            <section
                className="relative w-full overflow-hidden flex items-center justify-center"
                style={{
                    height: `calc(100vh - ${NAV_HEIGHT}px)`,
                    minHeight: '600px'
                }}
            >
                {/* Background Image Layer */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `url(${heroImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center top'
                    }}
                />

                {/* Subtle Gradient overlay for visual polish */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(to top, rgba(18, 18, 18, 0.8) 0%, transparent 40%)'
                    }}
                />
            </section>
        </div>
    );
}

export default Home;
