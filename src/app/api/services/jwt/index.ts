import jwt, { JwtPayload } from "jsonwebtoken";

// Ensure secret key is set
const SECRET_KEY = process.env.NEXT_PRIVATE_JWT_SECRET || '%SGJV^%YFgvj5y#';
if (!SECRET_KEY) {
    throw new Error("JWT_SECRET environment variable is not set");
}

// Generate a token
export function generateToken(payload: object, expiresIn: string = "30d"): string {
    // @ts-ignore
    return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

// Validate a token
export function validateToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, SECRET_KEY) as JwtPayload;
    } catch (err) {
        return null;
    }
}
