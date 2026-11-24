import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly senderId: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = (
      this.configService.get<string>('SMSAPI_BASE_URL') ||
      'https://dashboard.smsapi.lk/api/v3'
    ).replace(/\/+$/, '');
    this.apiToken = (
      this.configService.get<string>('SMSAPI_API_TOKEN') ||
      '568|rGV8TbUQsgHdL7YqOcHTHtjJKK6XofBChN2FxH46'
    ).trim();
    this.senderId = (
      this.configService.get<string>('SMSAPI_SENDER_ID') ||
      'VERSSARO'
    ).trim();
  }

  /**
   * Normalizes phone numbers into E.164 without plus format for SMSAPI.LK (e.g. 94771234567)
   */
  normalizePhoneNumber(phone: string): string {
    if (!phone) return '';
    let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

    // Replace leading +
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }

    // Replace leading 00
    if (cleaned.startsWith('00')) {
      cleaned = cleaned.substring(2);
    }

    // Sri Lankan local format: 07XXXXXXXX (10 digits) -> 947XXXXXXXX
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '94' + cleaned.substring(1);
    }

    // Sri Lankan 9 digits format without 0: 7XXXXXXXX (9 digits) -> 947XXXXXXXX
    if (/^[1-9]\d{8}$/.test(cleaned) && (cleaned.startsWith('7') || cleaned.startsWith('1') || cleaned.startsWith('2') || cleaned.startsWith('3') || cleaned.startsWith('4') || cleaned.startsWith('5') || cleaned.startsWith('6') || cleaned.startsWith('8') || cleaned.startsWith('9'))) {
      cleaned = '94' + cleaned;
    }

    return cleaned;
  }

  /**
   * Masks phone number for public UI preview (e.g. +94 77 *** 5678)
   */
  maskPhoneNumber(phone: string): string {
    const norm = this.normalizePhoneNumber(phone);
    if (norm.length >= 8) {
      const prefix = norm.substring(0, 4);
      const suffix = norm.substring(norm.length - 4);
      return `+${prefix} *** ${suffix}`;
    }
    return phone;
  }

  /**
   * Send SMS OTP message via SMSAPI.LK (https://dashboard.smsapi.lk/api/v3/sms/send)
   */
  async sendOtp(recipientPhone: string, otpCode: string, purpose: string = 'LOGIN'): Promise<SmsSendResult> {
    const formattedPhone = this.normalizePhoneNumber(recipientPhone);

    let messageText = `Your FleetLink verification code is ${otpCode}. Valid for 5 minutes. Do not share this code.`;
    if (purpose === 'REGISTER') {
      messageText = `Welcome to FleetLink! Your account verification code is ${otpCode}. Valid for 5 minutes.`;
    } else if (purpose === 'PASSWORD_RESET') {
      messageText = `Your FleetLink password reset code is ${otpCode}. Valid for 5 minutes.`;
    }

    if (!this.apiToken) {
      this.logger.error(`SMS dispatch failed: No SMSAPI_API_TOKEN set in environment.`);
      return {
        success: false,
        error: 'SMS service is not configured. Missing SMSAPI_API_TOKEN.',
      };
    }

    const payload = {
      recipient: formattedPhone,
      sender_id: this.senderId,
      type: 'plain',
      message: messageText,
    };

    try {
      const endpoint = `${this.baseUrl}/sms/send`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok || (responseData.status && responseData.status === 'error')) {
        const errorMsg = responseData.message || `SMSAPI.LK HTTP status ${response.status}`;
        this.logger.error(`SMSAPI.LK dispatch failed for ${formattedPhone}: ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
        };
      }

      this.logger.log(`SMS successfully dispatched via SMSAPI.LK to ${formattedPhone}`);
      return {
        success: true,
        messageId: responseData.data?.uid || responseData.message_id,
      };
    } catch (err: any) {
      this.logger.error(`Failed to reach SMSAPI.LK: ${err.message}`, err.stack);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}
