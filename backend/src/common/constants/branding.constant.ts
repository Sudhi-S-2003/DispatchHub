const PLATFORM_NAME = 'DispatchHub';
const PLATFORM_URL = 'https://dispatchhub.io';

export const BRANDING_CONSTANTS = {
  PLATFORM_NAME,
  PLATFORM_URL,
  PLATFORM_FOOTER_HTML: `
    <div style="margin-top: 36px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      ⚡ Delivered via <a href="${PLATFORM_URL}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">${PLATFORM_NAME}</a> • Reliable Cloud Email
    </div>
  `.trim(),
} as const;
