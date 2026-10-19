import { FirestoreService } from './firestoreService';
import { StorageService } from './storage';

export const AuthApiService = {
  // Check if a Lab Unique ID is available in real time (Instagram handle style)
  async checkLabIdAvailability(labId: string): Promise<{ available: boolean; message: string }> {
    const clean = (labId || '').trim().toUpperCase();

    if (!clean) {
      return { available: false, message: 'Please enter a Lab ID.' };
    }

    if (clean.length < 3) {
      return { available: false, message: 'Lab ID must be at least 3 characters.' };
    }

    if (clean.length > 20) {
      return { available: false, message: 'Lab ID cannot exceed 20 characters.' };
    }

    if (!/^[A-Z0-9_-]+$/.test(clean)) {
      return { available: false, message: 'Only uppercase letters, numbers, and hyphens allowed.' };
    }

    // 1. Check local storage first
    const localLab = StorageService.findLabByUniqueId(clean);
    if (localLab) {
      return {
        available: false,
        message: `"${clean}" is already registered. Please choose another Lab ID.`,
      };
    }

    // 2. Check backend endpoint
    try {
      const res = await fetch(`/api/auth/check-lab-id?labId=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      // Backend check fallback
    }

    // 3. Check Firestore cloud document
    try {
      const cloudLab = await FirestoreService.getLabAccount(clean);
      if (cloudLab) {
        return {
          available: false,
          message: `"${clean}" is already registered. Please choose another Lab ID.`,
        };
      }
    } catch {
      // ignore
    }

    return {
      available: true,
      message: `✓ "${clean}" is available!`,
    };
  },

  // Send real 6-digit verification code to recipient's Gmail inbox
  async sendOtpToGmail(
    email: string,
    purpose: 'REGISTER' | 'LOGIN',
    labName?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose, labName }),
      });

      const data = await res.json();
      return {
        success: data.success ?? false,
        message: data.message || 'Verification request processed.',
      };
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      return {
        success: false,
        message: 'Could not connect to verification server. Please check your network connection.',
      };
    }
  },

  // Verify the 6-digit code received in Gmail
  async verifyOtp(
    email: string,
    otp: string
  ): Promise<{ success: boolean; message: string; verificationToken?: string }> {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      return {
        success: data.success ?? false,
        message: data.message || 'Verification check completed.',
        verificationToken: data.verificationToken,
      };
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      return {
        success: false,
        message: 'Verification check failed. Please try again.',
      };
    }
  },
};
