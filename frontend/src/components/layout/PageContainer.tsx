/**
 * PageCanvas - Spotify-Style Centered Card Container
 * 
 * ARCHITECTURE:
 * MainLayout → PageCanvas → Page Content
 * 
 * WHAT PAGECANVAS OWNS:
 * - Max-width (centered card effect)
 * - Horizontal padding (breathing space on left/right)
 * - Rounded corners (card appearance)
 * - Background color
 * - Consistent layout across ALL pages
 * 
 * WHAT PAGES OWN:
 * - Their own hero sections
 * - Content grids
 * - Cards and components
 * - Vertical padding/spacing
 * 
 * RESULT: Guaranteed breathing space, hero not glued to edges
 */

import { ReactNode } from 'react';

interface PageCanvasProps {
    children: ReactNode;
    /** Set to true for pages that need full-bleed hero sections (like SongDetails) */
    fullBleed?: boolean;
    className?: string;
}

// Global container settings - single source of truth
export const CANVAS_MAX_WIDTH = 1350;
export const CANVAS_PADDING = 32; // px-8 equivalent

export function PageCanvas({ children, fullBleed = false, className = '' }: PageCanvasProps) {
    return (
        <div
            className={`
                bg-[#121212]
                rounded-t-xl
                min-h-[calc(100vh-64px)]
                overflow-hidden
                ${className}
            `}
            style={{
                width: '100%',
                maxWidth: `${CANVAS_MAX_WIDTH}px`,
                boxShadow: '0 -2px 24px rgba(0, 0, 0, 0.3)'
            }}
        >
            {/* Inner wrapper with horizontal padding - unless fullBleed */}
            {fullBleed ? (
                children
            ) : (
                <div style={{ padding: `0 ${CANVAS_PADDING}px` }}>
                    {children}
                </div>
            )}
        </div>
    );
}

// Re-export for backwards compatibility
export { PageCanvas as PageContainer };
export const CONTAINER_MAX_WIDTH = CANVAS_MAX_WIDTH;

export default PageCanvas;
