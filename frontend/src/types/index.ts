/**
 * Song Metadata Types
 * ====================
 * Type definitions for the Query by Humming application.
 * Updated to match songs.json structure.
 */

/**
 * Spotify statistics for an artist
 */
export interface SpotifyStats {
    listeners: string;
    rank: string;
    followers?: string;
    top_cities: Array<{
        city: string;
        count: string;
    }>;
}

/**
 * Social media links for an artist
 */
export interface SocialLinks {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    wikipedia?: string;
    website?: string;
}

/**
 * Represents metadata for a song in the database
 */
export interface SongMetadata {
    /** Unique identifier */
    id: string;
    /** Display title of the song */
    title: string;
    /** Artist name */
    artist: string;
    /** Album name */
    album: string;
    /** Song duration (e.g., "3:45") */
    length: string;
    /** Release date string */
    release_date: string;
    /** Theme color hex code */
    theme_color: string;
    /** Spotify URL */
    spotify_url: string;
    /** Song lyrics */
    lyrics?: string;
    /** Credits text */
    credits_text?: string;
    /** Artist bio */
    bio?: string;
    /** Spotify statistics */
    spotify_stats?: SpotifyStats;
    /** Social media links */
    social_links?: SocialLinks;
    /** Path to audio file */
    audio_path: string;
    /** Path to cover image */
    cover_image: string;
    /** Path to artist image */
    artist_image: string;
    /** Is the artist currently on tour? */
    on_tour?: boolean;
    /** List of upcoming tour dates */
    tour_dates?: Array<{
        date: string;
        venue: string;
        location: string;
        time: string;
    }>;
}

/**
 * Match result from the backend API
 */
export interface SearchResult {
    song: SongMetadata;
    confidence: number;
    dtw_distance: number;
}

/**
 * Application status states
 */
export type AppStatus = 'idle' | 'recording' | 'processing' | 'success' | 'error';

/**
 * Navigation route definition
 */
export interface NavRoute {
    path: string;
    label: string;
    icon: string;
}
