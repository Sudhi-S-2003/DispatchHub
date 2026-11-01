import { BrandingMode } from '@prisma/client';
import { BRANDING_CONSTANTS } from '../constants/index.js';

export function interpolateTemplate(
  templateString: string,
  parameters: Record<string, any> = {},
): string {
  if (!templateString) return '';

  return templateString.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, path) => {
    // 1. Direct key match (e.g. parameters["header.name"])
    if (parameters[path] !== undefined && parameters[path] !== null) {
      return String(parameters[path]);
    }

    // 2. Nested dot notation lookup (e.g. parameters.header.name)
    const keys = path.split('.');
    let value: any = parameters;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        value = undefined;
        break;
      }
    }

    return value !== undefined && value !== null ? String(value) : match;
  });
}

export function injectFooter(
  htmlContent: string,
  mode: BrandingMode,
  customerFooterHtml?: string | null,
): string {
  let footerSnippet = '';

  if (mode === BrandingMode.CO_BRANDED) {
    // 1. Platform Co-Branded Footer (Watermark) using centralized constant
    footerSnippet = BRANDING_CONSTANTS.PLATFORM_FOOTER_HTML;
  } else if (mode === BrandingMode.WHITE_LABEL && customerFooterHtml) {
    // 2. Customer Custom Company Footer (White-Label only)
    footerSnippet = `
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        ${customerFooterHtml}
      </div>
    `;
  } else {
    // 3. Clean White-Label (No footer)
    return htmlContent;
  }

  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${footerSnippet}</body>`);
  }

  return `${htmlContent}\n${footerSnippet}`;
}
