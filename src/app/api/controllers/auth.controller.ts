import { authService } from '@/app/api/services'
import { CentralizedAuthSession } from '@/app/api/types/auth'
import { NextResponse } from 'next/server'
import { UserAttributes } from '../models/user.model'

export const authController = {
  async autoLogin(req: Request) {
    try {
      const session = await authService.getSession(req.headers)
      if (!session?.user) {
        return NextResponse.json(
          { success: false, message: 'Not authenticated' },
          { status: 401 },
        )
      }
      

      const localUser = await authService.findOrCreateLocalUser(session)

      return NextResponse.json({
        success: true,
        message: 'Auto-login successful',
        localUser,
        centralizedUser: session.user,
      })
    } catch (error) {
      console.error('Auto-login failed:', error)
      return NextResponse.json(
        { success: false, message: 'Auto-login failed' },
        { status: 500 },
      )
    }
  },

  async syncUser(req: Request) {
    try {
      const body = await req.json()
      const session = await authService.getSession(req.headers)
      if (!session?.user) {
        return NextResponse.json(
          { success: false, message: 'Not authenticated' },
          { status: 401 },
        )
      }

      const sessionData: CentralizedAuthSession = {
        user: body.centralizedUser || session.user,
        session: session.session,
      }

      const localUser = await authService.findOrCreateLocalUser(sessionData)

      return NextResponse.json({
        success: true,
        message: 'User synced successfully',
        localUser,
      })
    } catch (error) {
      console.error('User sync failed:', error)
      return NextResponse.json(
        { success: false, message: 'User sync failed' },
        { status: 500 },
      )
    }
  },

  async getCurrentUser(req: Request) {
    try {
      const session = await authService.getSession(req.headers)
      if (!session?.user) {
        return NextResponse.json(
          { success: false, message: 'Not authenticated' },
          { status: 401 },
        )
      }

      const localUser = await authService.findOrCreateLocalUser(session)

      return NextResponse.json({
        success: true,
        user: session.user,
        localUser,
      })
    } catch (error) {
      console.error('Failed to get current user:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to get current user' },
        { status: 500 },
      )
    }
  },

  async updateProfile(req: Request) {
    try {
      const session = await authService.getSession(req.headers)
      if (!session?.user) {
        return NextResponse.json(
          { success: false, message: 'Not authenticated' },
          { status: 401 },
        )
      }

      const body = await req.json()
      const { fullName, signature } = body
      console.log(fullName, signature, session.user)
      const updatedUser: UserAttributes | { syncError: boolean } = await authService.updateUserProfile(
        session,
        { fullName, signature, name: session.user.name },
        req.headers,
      )

      return NextResponse.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: (updatedUser as UserAttributes).id,
          name: (updatedUser as UserAttributes).name,
          fullName: (updatedUser as UserAttributes).fullName,
          email: (updatedUser as UserAttributes).email,
          signature: (updatedUser as UserAttributes).signature,
          centralizedUserId: (updatedUser as UserAttributes).centralizedUserId,
        },
      })
    } catch (error: unknown) {
      console.error('Profile update failed:', error as Error)
      return NextResponse.json(
        {
          success: false,
          message: (error as Error).message || 'Profile update failed',
        },
        { status: 500 },
      )
    }
  },
  async validateSession(req: Request) {
    try {
      const session = await authService.getSession(req.headers)
      if (!session?.user) {
        return NextResponse.json(
          { success: false, message: 'Session not valid' },
          { status: 401 },
        )
      }

      const localUser = await authService.findOrCreateLocalUser(session)

      return NextResponse.json({
        success: true,
        message: 'Session is valid',
        user: session.user,
        localUser,
      })
    } catch (error) {
      console.error('Session validation failed:', error)
      return NextResponse.json(
        { success: false, message: 'Session validation failed' },
        { status: 500 },
      )
    }
  },

  async login() {
    return NextResponse.json(
      { success: false, message: 'Not implemented' },
      { status: 501 },
    )
  },

  async logout() {
    return NextResponse.json(
      { success: false, message: 'Not implemented' },
      { status: 501 },
    )
  },

  async register() {
    return NextResponse.json(
      { success: false, message: 'Not implemented' },
      { status: 501 },
    )
  },
}
