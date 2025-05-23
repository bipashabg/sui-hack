import axios from "axios";

const TWEET_MAX_TIME_MS = 1 * 60 * 1000;

interface Tweet {
    contents: string;
    id: string;
    createdAt: string;
}

interface TwitterUser {
    id: string;
    username: string;
}

interface TwitterApiResponse {
    data?: Array<{
        id: string;
        text: string;
        created_at: string;
        author_id: string;
    }>;
    includes?: {
        users: TwitterUser[];
    };
    meta?: {
        result_count: number;
        next_token?: string;
    };
}

export async function getTweets(userName: string): Promise<Tweet[]> {
    try {
        const userResponse = await axios.get(
            `https://api.twitter.com/2/users/by/username/${userName}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const userId = userResponse.data.data.id;

        const tweetsResponse = await axios.get<TwitterApiResponse>(
            `https://api.twitter.com/2/users/${userId}/tweets`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    'tweet.fields': 'created_at,author_id',
                    'max_results': 10, 
                    'exclude': 'retweets,replies' 
                }
            }
        );

        if (!tweetsResponse.data.data) {
            return [];
        }

        const tweets: Tweet[] = tweetsResponse.data.data.map(tweet => ({
            contents: tweet.text,
            id: tweet.id,
            createdAt: tweet.created_at
        }));

        return tweets.filter(tweet => 
            new Date(tweet.createdAt).getTime() > Date.now() - TWEET_MAX_TIME_MS
        );

    } catch (error) {
        console.error('Error fetching tweets:', error);
        if (axios.isAxiosError(error)) {
            console.error('API Error:', error.response?.data);
        }
        return [];
    }
}

export async function getTweetsByUserId(userId: string): Promise<Tweet[]> {
    try {
        const response = await axios.get<TwitterApiResponse>(
            `https://api.twitter.com/2/users/${userId}/tweets`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    'tweet.fields': 'created_at,author_id',
                    'max_results': 10,
                    'exclude': 'retweets,replies'
                }
            }
        );

        if (!response.data.data) {
            return [];
        }

        const tweets: Tweet[] = response.data.data.map(tweet => ({
            contents: tweet.text,
            id: tweet.id,
            createdAt: tweet.created_at
        }));

        return tweets.filter(tweet => 
            new Date(tweet.createdAt).getTime() > Date.now() - TWEET_MAX_TIME_MS
        );

    } catch (error) {
        console.error('Error fetching tweets:', error);
        return [];
    }
}