import axios from 'axios';

const centralizedAuthBackendService = {
  validateSession: async (cookies: string) => {
    const response = await axios.post(
      `${process.env.CENTRALIZED_AUTH_BACKEND_URL}/auth/session`,
      {},
      { headers: { Cookie: cookies } }
    );
    return response.data;
  },
  autoLogin: async (cookies: string) => {
    const response = await axios.get(
      `${process.env.CENTRALIZED_AUTH_BACKEND_URL}/auth/auto-login`,
      { headers: { Cookie: cookies } }
    );
    return response.data;
  },
};

export default centralizedAuthBackendService;