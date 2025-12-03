function getEnvVar(key: keyof ImportMetaEnv): string {
    const value = import.meta.env[key]
    if (!value) {
        throw new Error(
            `Missing required environment variable: ${key}. ` +
                'Please check your .env file.',
        )
    }
    return value
}

export const config = {
    mapbox: {
        token: getEnvVar('VITE_MAPBOX_TOKEN'),
        style: getEnvVar('VITE_MAPBOX_STYLE'),
    },
    backend: {
        url: getEnvVar('VITE_BACKEND_URL'),
    },
} as const
