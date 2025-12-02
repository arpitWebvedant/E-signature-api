import { NextResponse } from "next/server";
import { ensureDbConnection } from '@/app/api/db/connectDb';

/**
 * @openapi
 * /api/v1/auth:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get Centralized Auth API status
 *     description: Returns a welcome message indicating the Centralized Auth API is running.
 *     responses:
 *       200:
 *         description: Centralized Auth API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *             example:
 *               success: true
 *               message: "Welcome to the Centralized Auth API"
 */
export async function GET() { 
    await ensureDbConnection();
  return NextResponse.json({
    success: true,
    message: "Welcome to the Centralized Auth API",
  });
}
