/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_MAPBOX_TOKEN: string
    readonly VITE_MAPBOX_STYLE: string
    readonly VITE_OPENAIP_API_KEY: string
    readonly VITE_AIRPORTDB_API_TOKEN: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
