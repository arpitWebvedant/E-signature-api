export interface CentralizedAuthSession {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      emailVerified: boolean;
      createdAt: string;
      updatedAt: string;
      organizationUsers?: Array<{
        id: string;
        userId: string;
        organizationId: string;
        roleId: string;
        status: string;
        organization?: {
          id: string;
          name: string;
          slug: string;
          type?: string;
          state?: string;
        };
        role?: {
          id: string;
          name: string;
          description: string;
        };
        userRoles?: Array<{
          id: string;
          userId: string;
          roleId: string;
          role: {
            id: string;
            name: string;
            description: string;
          };
        }>;
      }>;
    };
    session?: {
      id: string;
      token?: string;
      expiresAt: string;
      userId: string;
    };
  }