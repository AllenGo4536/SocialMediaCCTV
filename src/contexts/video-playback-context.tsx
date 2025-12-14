"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface VideoPlaybackContextType {
    playingId: string | null;
    setPlayingId: (id: string | null) => void;
}

const VideoPlaybackContext = createContext<VideoPlaybackContextType | undefined>(undefined);

export function VideoPlaybackProvider({ children }: { children: ReactNode }) {
    const [playingId, setPlayingId] = useState<string | null>(null);

    return (
        <VideoPlaybackContext.Provider value={{ playingId, setPlayingId }}>
            {children}
        </VideoPlaybackContext.Provider>
    );
}

export function useVideoPlayback() {
    const context = useContext(VideoPlaybackContext);
    if (context === undefined) {
        throw new Error('useVideoPlayback must be used within a VideoPlaybackProvider');
    }
    return context;
}
