function getEnvVar(key: keyof ImportMetaEnv): string {
    const value = import.meta.env[key]
    if (!value) {
        throw new Error(
            `Missing required environment variable: ${key}. ` +
                'Please copy .env.example to .env and fill in your credentials.',
        )
    }
    return value
}

export const config = {
    mapbox: {
        token: getEnvVar('VITE_MAPBOX_TOKEN'),
        style: getEnvVar('VITE_MAPBOX_STYLE'),
    },
    openAIP: {
        apiKey: getEnvVar('VITE_OPENAIP_API_KEY'),
    },
    airportDB: {
        token: getEnvVar('VITE_AIRPORTDB_API_TOKEN'),
    },
} as const
