export function requireEnv(name:string):string{
    const value=process.env[name];

    if(!value){
        throw new Error(`Missing required env variable: ${name}`);
    }

    return value;
}


// ===== TURN config =====
export const TURN_SECRET = requireEnv("TURN_SECRET");
export const TURN_TTL_SECONDS = Number(requireEnv("TURN_TTL_SECONDS"));

export const STUN_URL = requireEnv("STUN_URL");
export const TURN_UDP_URL = requireEnv("TURN_UDP_URL");
export const TURN_TCP_URL = requireEnv("TURN_TCP_URL");

// ===== Downstream services =====
export const ROOM_SERVICE_BASE_URL = requireEnv("ROOM_SERVICE_BASE_URL");

