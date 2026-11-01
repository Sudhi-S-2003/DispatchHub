import { BrandingMode } from '@prisma/client';

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

export function injectBranding(htmlContent: string, mode: BrandingMode): string {
  if (mode === BrandingMode.WHITE_LABEL) {
    return htmlContent; // 100% white-label, zero watermark
  }

  // Co-Branded Footer Badge
  const badge = `
    <div style="margin-top: 36px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      ⚡ Delivered via <a href="https://dispatchhub.io" style="color: #4f46e5; text-decoration: none; font-weight: 600;">DispatchHub</a>
    </div>
  `;

  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${badge}</body>`);
  }

  return `${htmlContent}\n${badge}`;
}
