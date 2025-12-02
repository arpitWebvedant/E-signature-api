import { User } from '@/app/api/models'
import { CentralizedAuthSession } from '@/app/api/types/auth'
import axios, { AxiosInstance } from 'axios'
import { Op } from 'sequelize'

class CentralizedAuthService {
  private httpClient: AxiosInstance
  private static instance: CentralizedAuthService

  constructor() {
    this.httpClient = axios.create({
      baseURL:
        process.env.NEXT_PRIVATE_CENTRALIZED_AUTH_BACKEND_URL ||
        'http://localhost:3011',
      withCredentials: true,
    })
  }

  public static getInstance(): CentralizedAuthService {
    if (!CentralizedAuthService.instance) {
      CentralizedAuthService.instance = new CentralizedAuthService()
    }
    return CentralizedAuthService.instance
  }

  /**
   * Find or create a local user based on centralized auth user data
   */
  async findOrCreateLocalUser(
    sessionData: CentralizedAuthSession,
  ): Promise<User | { syncError: boolean }> {
    const centralizedUser = sessionData.user

    try {
      const [localUser, created] = await User.findOrCreate({
        where: {
          [Op.or]: [
            { centralizedUserId: centralizedUser.id },
            { email: centralizedUser.email },
          ],
        },
        defaults: {
          centralizedUserId: centralizedUser.id,
          email: centralizedUser.email,
          name: centralizedUser.name,
          isActive: true,
          createdAt: new Date(),
        },
      })

      if (created) {
        console.log(
          'CentralizedAuthService: Created new local user for:',
          centralizedUser.email,
        )

        // await this.createDefaultProfile(localUser.id, centralizedUser)
      } else {
        if (
          localUser.name !== centralizedUser.name ||
          localUser.email !== centralizedUser.email ||
          localUser.centralizedUserId !== centralizedUser.id
        ) {
          await localUser.update({
            name: centralizedUser.name,
            email: centralizedUser.email,
            centralizedUserId: centralizedUser.id,
          })
        }

        // await this.ensureUserProfile(localUser.id, centralizedUser)
      }

      return localUser
    } catch (error) {
      console.error(
        'CentralizedAuthService: Failed to sync user to local database:',
        error,
      )

      return {
        id: Number(centralizedUser.id),
        email: centralizedUser.email,
        name: centralizedUser.name,
        centralizedUserId: centralizedUser.id,
        syncError: true,
      }
    }
  }

  /**
   * Prepare authentication headers for requests to centralized auth
   * Handles both cookie-based and Authorization header-based authentication
   */
  private prepareAuthHeaders(
    headers: Headers | Record<string, string | undefined>
  ): Record<string, string> {
    const authHeaders: Record<string, string> = {}
  
    // Get Authorization
    const authHeader =
      headers instanceof Headers
        ? headers.get('authorization') ?? undefined
        : headers.authorization ?? headers.Authorization
  
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        const sessionToken = authHeader.substring(7)
        authHeaders.cookie = `better-auth.session_token=${sessionToken}`
      } else {
        authHeaders.authorization = authHeader
      }
    }
  
    // Get Cookie
    const cookieHeader =
      headers instanceof Headers
        ? headers.get('cookie') ?? undefined
        : headers.cookie ?? headers.Cookie
  
    if (cookieHeader) {
      if (authHeaders.cookie) {
        authHeaders.cookie += `; ${cookieHeader}`
      } else {
        authHeaders.cookie = cookieHeader
      }
    }
  
    return authHeaders
  }
  

  async validateSession(headers: Headers | Record<string, string | undefined>): Promise<CentralizedAuthSession | null> {
    try {
      const authHeaders = this.prepareAuthHeaders(headers)

      const response = await this.httpClient.post(
        '/auth/session',
        {},
        {
          headers: authHeaders,
        },
      )

      let sessionData
      if (response.data.success && response.data.data) {
        sessionData = response.data.data
      } else if (response.data.user) {
        sessionData = response.data
      } else {
        return null
      }
      return sessionData as CentralizedAuthSession
    } catch (error: unknown) {
      console.error(
        'CentralizedAuthService: Session validation error:',
        error instanceof Error ? error.message : 'Unknown error',
      )
      if (error instanceof axios.AxiosError && error.response?.status === 401) {
        return null
      }
      return null
    }
  }

  async getSession(headers: Headers | Record<string, string | undefined>): Promise<CentralizedAuthSession | null> {
    return this.validateSession(headers)
  }
  async updateUserProfile(
    session: CentralizedAuthSession,
    profileData: {
      name: string
      signature: string
      fullName?: string
    },
    headers?: Headers | Record<string, string | undefined>,
  ): Promise<User | { syncError: boolean }> {
    try {
      const user = await User.findOne({
        where: {
          [Op.or]: [
            { centralizedUserId: session.user.id },
            { email: session.user.email },
          ],
        },
      })

      if (!user) {
        throw new Error('User not found in local database')
      }

      // Update user profile
      const updatedUser = await user.update({
        name: profileData.name,
        fullName: profileData.fullName || profileData.name,
        signature: profileData.signature,
        updatedAt: new Date(),
      })

      // Optionally sync with centralized auth service if needed
      try {
        const authHeaders = this.prepareAuthHeaders(headers || {})

        await this.httpClient.patch(
          `/api/users/${user.centralizedUserId}/profile`,
          {
            name: profileData.name,
            fullName: profileData.fullName || profileData.name,
          },
          {
            headers: authHeaders,
          },
        )

        console.log(
          'CentralizedAuthService: Profile updated in centralized auth',
        )
      } catch (centralizedError) {
        console.warn(
          'CentralizedAuthService: Failed to update profile in centralized auth, but local update succeeded:',
          centralizedError,
        )
        // Continue with local update even if centralized update fails
      }

      return updatedUser
    } catch (error: unknown) {
      console.error('CentralizedAuthService: Profile update failed:', error instanceof Error ? error.message : 'Unknown error')
      throw new Error(`Profile update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  async checkUserPermission(
    userId: string,
    product: string,
    module: string,
    permission: string,
    headers?: Headers | Record<string, string | undefined>,
  ): Promise<boolean> {
    try {
      const authHeaders = this.prepareAuthHeaders(headers || {})
      const response = await this.httpClient.get('/roles/check-permission', {
        params: {
          userId,
          product,
          module,
          permission,
        },
        headers: authHeaders,
      })

      return response.data?.hasPermission || false
    } catch (error: unknown) {
      console.error(
        'CentralizedAuthService: Permission check failed:',
        error instanceof axios.AxiosError ? error.response?.data || error.message : 'Unknown error',
      )
      return false
    }
  }

  async getUserRoleNames(
    userId: string,
    organizationId: string,
  ): Promise<string[]> {
    try {
      const response = await this.httpClient.get(
        `/api/organizations/${organizationId}/users/${userId}/roles`,
      )
      return response.data?.map((role: { name: string }) => role.name) || []
    } catch (error: unknown) {
      console.error('Error fetching user roles from centralized auth:', error instanceof Error ? error.message : 'Unknown error')
      return []
    }
  }

  async getRoleById(roleId: string): Promise<{ name: string } | null> {
    try {
      const response = await this.httpClient.get(`/api/roles/${roleId}`)
      return response.data as { name: string } | null
    } catch (error: unknown) {
      console.error('Error fetching role by ID from centralized auth:', error instanceof Error ? error.message : 'Unknown error')
      return null
    }
  }

  async getRolesByIds(roleIds: string[]): Promise<{ name: string }[]> {
    try {
      const rolePromises = roleIds.map((id) => this.getRoleById(id))
      const roles = await Promise.all(rolePromises)
      return roles.filter((role) => role !== null) as { name: string }[]
    } catch (error: unknown) {
      console.error('Error fetching roles by IDs from centralized auth:', error)
      return []
    }
  }

  async getUserById(userId: string): Promise<{ name: string, email: string, signature: string } | null> {
    try {
      const response = await this.httpClient.get(`/api/users/${userId}`)
      return response.data as { name: string, email: string, signature: string } | null
    } catch (error: unknown) {
      console.error('Error fetching user from centralized auth:', error instanceof Error ? error.message : 'Unknown error')
      return null
    }
  }

  async getOrganizationUsers(organizationId: string): Promise<{ name: string, email: string, signature: string }[]> {
    try {
      const response = await this.httpClient.get(
        `/api/organizations/${organizationId}/users`,
      )
      return response.data as { name: string, email: string, signature: string }[] || []
    } catch (error: unknown) {
      console.error(
        'Error fetching organization users from centralized auth:',
        error instanceof Error ? error.message : 'Unknown error',
      )
      return []
    }
  }

  // private async createDefaultProfile(
  //   userId: number,
  //   centralizedUser: any,
  // ): Promise<void> {
  //   /*
  //   await Profile.create({
  //     userId,
      
  //   });
  //   */
  // }

  // private async ensureUserProfile(
  //   userId: number,
  //   centralizedUser: any,
  // ): Promise<void> {
  //   /*
  //   const profile = await Profile.findOne({ where: { userId } });
  //   if (!profile) {
  //     await this.createDefaultProfile(userId, centralizedUser);
  //   }
  //   */
  // }

  handleError(error: unknown): never {
    if (error instanceof axios.AxiosError && error.response) {
      throw new Error(
        error.response.data.message || 'Centralized auth service error',
      )
    }
    throw new Error((error as Error)?.message || 'Unknown centralized auth service error')
  }
}

export const centralizedAuthService = CentralizedAuthService.getInstance()
export default centralizedAuthService
