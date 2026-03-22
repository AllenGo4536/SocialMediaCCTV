
import { ApifyClient } from 'apify-client';

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

if (!APIFY_API_TOKEN) {
    console.warn('Missing APIFY_API_TOKEN environment variable. Scraping will not work.');
}

export const apifyClient = new ApifyClient({
    token: APIFY_API_TOKEN,
});

export const INSTAGRAM_SCRAPER_ACTOR_ID = 'apify/instagram-post-scraper';
export const TIKTOK_SCRAPER_ACTOR_ID = 'clockworks/tiktok-scraper';
export const YOUTUBE_SCRAPER_ACTOR_ID = 'streamers/youtube-scraper';
export const X_SCRAPER_ACTOR_ID = 'apidojo/twitter-scraper-lite';

/**
 * Triggers an Instagram scrape for a list of usernames.
 * @param usernames Array of Instagram usernames to scrape
 * @param limit Max posts per profile (default 30 for initial scrape)
 */
export async function triggerInstagramScrape(usernames: string[], limit: number = 5) {
    const webhookUrl = process.env.NEXT_PUBLIC_BASE_URL
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/apify`
        : undefined;

    const input = {
        username: usernames,
        resultsLimit: limit,
        searchType: "hashtag", // Default, but we are using username list
        searchLimit: 1,
        // Add "scrapeUser" or whatever the actor expects. 
        // Based on user prompt "Add a username...". 
        // The actor accepts "username": []
    };

    // Per Apify docs, inputs change. 
    // User prompt said: "Add one or more Instagram usernames...".
    // Input key mapping based on standard Apify actors:
    // "username": ["..."]

    const run = await apifyClient.actor(INSTAGRAM_SCRAPER_ACTOR_ID).start(input, {
        webhooks: webhookUrl ? [
            {
                eventTypes: ['ACTOR.RUN.SUCCEEDED'],
                requestUrl: webhookUrl,
            }
        ] : undefined
    });

    return run;
}

/**
 * Triggers a TikTok scrape for a list of usernames.
 * @param usernames Array of TikTok usernames to scrape
 * @param limit Max videos per profile
 */
export async function triggerTikTokScrape(usernames: string[], limit: number = 5) {
    const webhookUrl = process.env.NEXT_PUBLIC_BASE_URL
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/apify`
        : undefined;

    const input = {
        profiles: usernames,
        resultsPerPage: limit,
        profileScrapeSections: ['videos'],
        profileSorting: 'latest',
        excludePinnedPosts: false,
        scrapeRelatedVideos: false,
        shouldDownloadAvatars: false,
        shouldDownloadCovers: false,
        shouldDownloadMusicCovers: false,
        shouldDownloadSlideshowImages: false,
        shouldDownloadSubtitles: false,
        shouldDownloadVideos: false,
        proxyCountryCode: 'None',
    };

    const run = await apifyClient.actor(TIKTOK_SCRAPER_ACTOR_ID).start(input, {
        webhooks: webhookUrl ? [
            {
                eventTypes: ['ACTOR.RUN.SUCCEEDED'],
                requestUrl: webhookUrl,
            }
        ] : undefined
    });

    return run;
}

/**
 * Triggers a YouTube scrape for a list of channel/profile URLs.
 * @param startUrls Array of YouTube channel/profile URLs
 * @param limit Max regular videos per URL
 */
export async function triggerYoutubeScrape(startUrls: string[], limit: number = 5) {
    const webhookUrl = process.env.NEXT_PUBLIC_BASE_URL
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/apify`
        : undefined;

    const input = {
        startUrls: startUrls.map((url) => ({ url })),
        maxResults: limit,
        maxResultsShorts: limit,
        maxResultStreams: 0,
        sortVideosBy: 'NEWEST',
    };

    const run = await apifyClient.actor(YOUTUBE_SCRAPER_ACTOR_ID).start(input, {
        webhooks: webhookUrl ? [
            {
                eventTypes: ['ACTOR.RUN.SUCCEEDED'],
                requestUrl: webhookUrl,
            }
        ] : undefined
    });

    return run;
}
