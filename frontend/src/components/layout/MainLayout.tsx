/**
 * MainLayout - Global App Shell
 * 
 * GLOBAL LAYOUT RULE:
 * - Background fills full viewport width (zinc-950)
 * - ALL pages wrapped in centered PageContainer
 * - PageContainer has max-width 1400px + breathing space
 * - Only content inside changes on navigation
 * - Container size and position NEVER changes
 * 
 * RESULT: Spotify-style calm, centered, contained layout
 */

import { Outlet } from 'react-router-dom';
import { TopNav, TOP_NAV_HEIGHT } from './TopNav';
import { PageContainer } from './PageContainer';

export function MainLayout() {
    return (
        // Full-width background - extends to screen edges (matches navbar color)
        <div className="min-h-screen" style={{ backgroundColor: '#121212' }}>
            {/* Fixed Top Navigation */}
            <TopNav />

            {/* Main Content Area - Offset below navbar */}
            <main
                className="flex justify-center w-full"
                style={{ paddingTop: TOP_NAV_HEIGHT }}
            >
                {/* 
                    PageCanvas - THE GLOBAL CENTERED CONTAINER
                    - All pages render inside this
                    - Max-width 1350px, centered with flexbox
                    - Breathing space on left and right
                    - Same width on ALL pages
                    - fullBleed=true for pages with custom hero backgrounds
                */}
                <PageContainer fullBleed>
                    <Outlet />
                </PageContainer>
            </main>
        </div>
    );
}

export default MainLayout;
