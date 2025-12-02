// services/smsService.ts
import axios from 'axios';

// Interface for SMS request
export interface SendSmsRequest {
  client_phone: string;
  message: string;
}

// Interface for SMS response (adjust based on actual API response)
export interface SendSmsResponse {
  success: boolean;
  message?: string;
  // Add other response fields as needed
}

// SMS Service
class SmsService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NEXT_PRIVATE_SMS_API_KEY || '';
    this.baseUrl = process.env.NEXT_PRIVATE_SMS_BASE_URL || 'https://litdraft-app-stg.omnisai.io';
    
    if (!this.apiKey) {
      console.error('SMS API Key is not configured');
    }
  }

  async sendSms(data: SendSmsRequest): Promise<SendSmsResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/private/send_sms/`,
        {
          client_phone: data.client_phone,
          message: data.message,
        },
        {
          headers: {
            'accept': 'application/json',
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('SMS API Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to send SMS');
      }
      throw error;
    }
  }
}

// Export a singleton instance
export const smsService = new SmsService();

// Alternative: Export the function directly
export const sendSms = async (data: SendSmsRequest): Promise<SendSmsResponse> => {
  console.log('Sending SMS to:', data.client_phone);
  console.log('Message:', data.message);
  try{
    return smsService.sendSms(data);
  }
  catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};