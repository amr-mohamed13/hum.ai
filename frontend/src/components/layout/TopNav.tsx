/**
 * TopNav - Fixed Top Navigation Bar
 * Height: 64px (h-16)
 * Contains: Logo + Centered Navigation Icons
 * 
 * Hover Effect: Subtle blur/glow, NOT color change
 * Active State: Subtle white background, NOT green
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { CONTAINER_MAX_WIDTH } from './PageContainer';

const NAV_HEIGHT = 64; // Define nav height as constant for reuse

// Custom Library Icon - Pause symbol + Open trapezoidal shape
const LibraryIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        {/* Pause symbol - two vertical parallel lines with gap */}
        <line x1="5" y1="6" x2="5" y2="22" />
        <line x1="9" y1="6" x2="9" y2="22" />
        {/* Open trapezoidal shape - vertical left, horizontal bottom, diagonal top, open right */}
        <line x1="13" y1="6" x2="13" y2="22" />
        <line x1="13" y1="22" x2="20" y2="22" />
        <line x1="13" y1="6" x2="20" y2="12" />
        <line x1="20" y1="12" x2="20" y2="22" />
    </svg>
);

const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/library', icon: LibraryIcon, label: 'Library' },
    { path: '/how-it-works', icon: Info, label: 'How it Works' },
];

export function TopNav() {
    const navigate = useNavigate();
    const location = useLocation();

    // Browser history navigation
    const handleBack = () => {
        navigate(-1);
    };

    const handleForward = () => {
        navigate(1);
    };

    return (
        <nav
            className="fixed top-0 left-0 right-0 z-50"
            style={{
                height: NAV_HEIGHT,
                backgroundColor: '#121212',
                // No border, no shadow - navbar blends into app shell
            }}
        >
            <div className="flex items-center justify-between h-full w-full">
                {/* Left: Logo - Aligned with PageContainer start */}
                <div className="flex items-center" style={{
                    paddingLeft: `max(0px, calc((100% - ${CONTAINER_MAX_WIDTH}px) / 2))`,
                    minWidth: '0'
                }}>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        Hum<span className="text-purple-400">.ai</span>
                    </h1>
                </div>

                {/* Center: Navigation Icons - Wider container with more spacing */}
                <div className="flex items-center gap-20 bg-white/[0.03] rounded-full px-4 py-2">
                    {navItems.map(({ path, icon: Icon, label }) => {
                        const isActive = location.pathname === path;
                        const isLibraryIcon = path === '/library';
                        return (
                            <button
                                key={path}
                                onClick={() => navigate(path)}
                                title={label}
                                className={clsx(
                                    'w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300',
                                    isActive
                                        ? 'text-white bg-white/15'
                                        : 'text-white/50 hover:text-white/90'
                                )}
                                style={{
                                    // FIX: Subtle blur/glow hover effect (NO color change)
                                    // - Active: subtle white glow
                                    // - Hover: soft blur effect via backdrop-filter
                                    boxShadow: isActive
                                        ? '0 0 12px rgba(255,255,255,0.08)'
                                        : undefined,
                                    backdropFilter: isActive ? 'blur(4px)' : undefined
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        // Soft blur glow on hover (not green, not harsh)
                                        e.currentTarget.style.backdropFilter = 'blur(8px)';
                                        e.currentTarget.style.boxShadow = '0 0 20px rgba(255,255,255,0.04)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.backdropFilter = 'none';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }
                                }}
                            >
                                {isLibraryIcon ? (
                                    <Icon className="w-5 h-5" />
                                ) : (
                                    <Icon className="w-5 h-5" strokeWidth={1.8} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Right: Back/Forward Navigation - Aligned with PageContainer end */}
                <div className="flex items-center gap-2" style={{
                    paddingRight: `max(0px, calc((100% - ${CONTAINER_MAX_WIDTH}px) / 2))`,
                    minWidth: '0'
                }}>
                    <button
                        onClick={handleBack}
                        className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/70 hover:text-white transition-all"
                        title="Go back"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleForward}
                        className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/70 hover:text-white transition-all"
                        title="Go forward"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </nav>
    );
}

// Export nav height for use in layout
export const TOP_NAV_HEIGHT = NAV_HEIGHT;

export default TopNav;
