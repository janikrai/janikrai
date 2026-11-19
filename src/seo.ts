import { PROJECTS } from './constants';
import { Project } from './types';

export const SITE_ORIGIN = 'https://janikrai.com';
export const SITE_NAME = 'Janik Rai';
export const DEFAULT_SHARE_IMAGE = 'https://janikrai.b-cdn.net/Favicon/images.png';
export const DEFAULT_SHARE_IMAGE_WIDTH = 414;
export const DEFAULT_SHARE_IMAGE_HEIGHT = 414;
export const DEFAULT_SHARE_IMAGE_TYPE = 'image/png';

// Projects whose year has an unconfirmed discrepancy (e.g. Bandits: 2024 live vs 2026 notes)
// omit the year from share descriptions until confirmed.
export const SHARE_YEAR_OMITTED_IDS = new Set<string>(['this-is-home']);

const STILL_DIMENSIONS: Record<string, { width: number; height: number }> = {
  'https://janikrai.b-cdn.net/Stills/Bandits/Bandits10.jpeg': { width: 3800, height: 2522 },
  'https://janikrai.b-cdn.net/Stills/Into-the-heat/Into-the-heat1.jpeg': { width: 3198, height: 2126 },
  'https://janikrai.b-cdn.net/Stills/farm-to-table/farm-to-table_1.jpg': { width: 3624, height: 2484 },
  'https://janikrai.b-cdn.net/Stills/for-her/for-her1.jpeg': { width: 3810, height: 2124 },
  'https://janikrai.b-cdn.net/Stills/bliss/Bliss1.jpg': { width: 2856, height: 2134 },
  'https://janikrai.b-cdn.net/Stills/Barcelos/barcelos_1.jpg': { width: 3194, height: 2110 },
  'https://janikrai.b-cdn.net/Stills/stillness/Meditation1.jpeg': { width: 3264, height: 2264 },
  'https://janikrai.b-cdn.net/Stills/light-between-us/Nanak_Diwali1.jpg': { width: 3862, height: 2470 },
  'https://janikrai.b-cdn.net/Stills/still-close/still-close_1.jpeg': { width: 3168, height: 2164 },
  'https://janikrai.b-cdn.net/Stills/push/push_1.jpg': { width: 4072, height: 2280 },
  'https://janikrai.b-cdn.net/Stills/eternity/eternity1.jpg': { width: 3790, height: 2110 },
  'https://janikrai.b-cdn.net/Stills/life-at-sea/life-at-sea_1.jpg': { width: 2846, height: 2110 },
};

export interface RouteMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: 'website' | 'profile' | 'video.other';
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  imageType?: string;
  imageAlt: string;
  jsonLd?: Record<string, unknown>;
}

export const RELEASED_PROJECTS: Project[] = PROJECTS.filter(
  (project) => !project.previewOnly && Boolean(project.videoUrl)
);

function parseCreditValue(credits: string | undefined, roles: string[]): string | null {
  if (!credits) return null;
  const lines = credits.split('\n').map((line) => line.trim()).filter(Boolean);
  for (const role of roles) {
    const prefix = `${role.toLowerCase()}:`;
    const match = lines.find((line) => line.toLowerCase().startsWith(prefix));
    if (match) {
      const value = match.slice(prefix.length).trim();
      if (value) return value;
    }
  }
  return null;
}

function isNarrativeProject(project: Project): boolean {
  return project.client.trim().toLowerCase() === 'narrative';
}

export function getProjectShareTitle(project: Project): string {
  if (isNarrativeProject(project)) {
    return `${project.name} · Narrative Film · ${SITE_NAME}`;
  }
  return `${project.name} · ${project.client} · ${SITE_NAME}`;
}

export function getProjectShareDescription(project: Project): string {
  const includeYear = Boolean(project.year) && !SHARE_YEAR_OMITTED_IDS.has(project.id);
  const yearSuffix = includeYear ? ` (${project.year})` : '';

  const isWriterDirector = Boolean(parseCreditValue(project.credits, ['Writer & Director']));
  const isDirectorDp = Boolean(parseCreditValue(project.credits, ['Director & DP']));
  const dp = parseCreditValue(project.credits, ['DP']);
  const editor = parseCreditValue(project.credits, ['Editor']);
  const productionCo = parseCreditValue(project.credits, ['Production Company']);

  if (isNarrativeProject(project)) {
    const lead = `${project.name}${yearSuffix}, a narrative film directed by ${SITE_NAME}.`;
    return dp ? `${lead} Cinematography by ${dp}.` : lead;
  }

  let lead: string;
  if (project.id === 'this-is-home') {
    lead = `${project.name}, a commercial film for ${project.client} directed by ${SITE_NAME}.`;
  } else if (isDirectorDp) {
    lead = `${project.name} for ${project.client}${yearSuffix}, directed and shot by ${SITE_NAME}.`;
  } else if (isWriterDirector) {
    lead = `${project.name} for ${project.client}${yearSuffix}, written and directed by ${SITE_NAME}.`;
  } else if (productionCo && project.id === 'into-the-heat') {
    lead = `${project.name} for ${project.client}${yearSuffix}, directed by ${SITE_NAME} with ${productionCo}.`;
  } else {
    lead = `${project.name} for ${project.client}${yearSuffix}, directed by ${SITE_NAME}.`;
  }

  if (dp) {
    return `${lead} Cinematography by ${dp}.`;
  }
  if (isDirectorDp && editor) {
    return `${lead} Edited by ${editor}.`;
  }
  return lead;
}

export function getProjectShareImage(project: Project): {
  url: string;
  width?: number;
  height?: number;
  type: string;
  alt: string;
} {
  const stillUrl = project.stills?.[0];
  if (stillUrl) {
    const dims = STILL_DIMENSIONS[stillUrl];
    const isPng = /\.png(\?.*)?$/i.test(stillUrl);
    return {
      url: stillUrl,
      width: dims?.width,
      height: dims?.height,
      type: isPng ? 'image/png' : 'image/jpeg',
      alt: isNarrativeProject(project)
        ? `Still from ${project.name}, directed by ${SITE_NAME}`
        : `Still from ${project.name} for ${project.client}, directed by ${SITE_NAME}`,
    };
  }

  return {
    url: DEFAULT_SHARE_IMAGE,
    width: DEFAULT_SHARE_IMAGE_WIDTH,
    height: DEFAULT_SHARE_IMAGE_HEIGHT,
    type: DEFAULT_SHARE_IMAGE_TYPE,
    alt: `${project.name} — ${SITE_NAME}`,
  };
}

export function getRouteMetadata(pathname: string): RouteMetadata {
  const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');

  if (normalizedPath.startsWith('/work/')) {
    const projectId = normalizedPath.slice('/work/'.length);
    const project = RELEASED_PROJECTS.find((p) => p.id === projectId);
    if (project) {
      const title = getProjectShareTitle(project);
      const description = getProjectShareDescription(project);
      const canonicalUrl = `${SITE_ORIGIN}/work/${project.id}`;
      const image = getProjectShareImage(project);

      return {
        title,
        description,
        canonicalUrl,
        ogType: 'video.other',
        imageUrl: image.url,
        imageWidth: image.width,
        imageHeight: image.height,
        imageType: image.type,
        imageAlt: image.alt,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'VideoObject',
          name: isNarrativeProject(project)
            ? project.name
            : `${project.name} — ${project.client}`,
          description,
          thumbnailUrl: image.url,
          contentUrl: project.videoUrl,
          url: canonicalUrl,
          director: {
            '@type': 'Person',
            name: SITE_NAME,
          },
          ...(!SHARE_YEAR_OMITTED_IDS.has(project.id) && project.year
            ? { dateCreated: String(project.year) }
            : {}),
        },
      };
    }
  }

  if (normalizedPath === '/archive') {
    const title = 'Archive — Janik Rai';
    const description = 'Archive of commercial and narrative work directed by Janik Rai.';
    return {
      title,
      description,
      canonicalUrl: `${SITE_ORIGIN}/archive`,
      ogType: 'website',
      imageUrl: DEFAULT_SHARE_IMAGE,
      imageWidth: DEFAULT_SHARE_IMAGE_WIDTH,
      imageHeight: DEFAULT_SHARE_IMAGE_HEIGHT,
      imageType: DEFAULT_SHARE_IMAGE_TYPE,
      imageAlt: 'Janik Rai — Commercial Director',
    };
  }

  if (normalizedPath === '/info') {
    const title = 'About — Janik Rai';
    const description =
      'Janik Rai is a British-Canadian director with South Asian roots. His work balances striking imagery with a raw, human sensibility, combining cinematic composition with a sense of lived reality.';
    return {
      title,
      description,
      canonicalUrl: `${SITE_ORIGIN}/info`,
      ogType: 'profile',
      imageUrl: DEFAULT_SHARE_IMAGE,
      imageWidth: DEFAULT_SHARE_IMAGE_WIDTH,
      imageHeight: DEFAULT_SHARE_IMAGE_HEIGHT,
      imageType: DEFAULT_SHARE_IMAGE_TYPE,
      imageAlt: 'Janik Rai — Commercial Director',
    };
  }

  return {
    title: 'Janik Rai — Commercial Director',
    description:
      'British-Canadian commercial director balancing striking imagery with a raw, human sensibility. Cinematic composition grounded in lived reality.',
    canonicalUrl: SITE_ORIGIN,
    ogType: 'website',
    imageUrl: DEFAULT_SHARE_IMAGE,
    imageWidth: DEFAULT_SHARE_IMAGE_WIDTH,
    imageHeight: DEFAULT_SHARE_IMAGE_HEIGHT,
    imageType: DEFAULT_SHARE_IMAGE_TYPE,
    imageAlt: 'Janik Rai — Commercial Director',
  };
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderSeoHeadTags(meta: RouteMetadata): string {
  const lines = [
    `<title>${escapeHtmlText(meta.title)}</title>`,
    `<meta data-rh="true" name="description" content="${escapeHtmlAttr(meta.description)}" />`,
    `<link data-rh="true" rel="canonical" href="${escapeHtmlAttr(meta.canonicalUrl)}" />`,
    `<meta data-rh="true" property="og:site_name" content="${escapeHtmlAttr(SITE_NAME)}" />`,
    `<meta data-rh="true" property="og:type" content="${escapeHtmlAttr(meta.ogType)}" />`,
    `<meta data-rh="true" property="og:url" content="${escapeHtmlAttr(meta.canonicalUrl)}" />`,
    `<meta data-rh="true" property="og:title" content="${escapeHtmlAttr(meta.title)}" />`,
    `<meta data-rh="true" property="og:description" content="${escapeHtmlAttr(meta.description)}" />`,
    `<meta data-rh="true" property="og:image" content="${escapeHtmlAttr(meta.imageUrl)}" />`,
    `<meta data-rh="true" property="og:image:secure_url" content="${escapeHtmlAttr(meta.imageUrl)}" />`,
    `<meta data-rh="true" property="og:image:alt" content="${escapeHtmlAttr(meta.imageAlt)}" />`,
  ];

  if (meta.imageType) {
    lines.push(`<meta data-rh="true" property="og:image:type" content="${escapeHtmlAttr(meta.imageType)}" />`);
  }
  if (meta.imageWidth && meta.imageHeight) {
    lines.push(`<meta data-rh="true" property="og:image:width" content="${meta.imageWidth}" />`);
    lines.push(`<meta data-rh="true" property="og:image:height" content="${meta.imageHeight}" />`);
  }

  lines.push(
    `<meta data-rh="true" name="twitter:card" content="summary_large_image" />`,
    `<meta data-rh="true" name="twitter:title" content="${escapeHtmlAttr(meta.title)}" />`,
    `<meta data-rh="true" name="twitter:description" content="${escapeHtmlAttr(meta.description)}" />`,
    `<meta data-rh="true" name="twitter:image" content="${escapeHtmlAttr(meta.imageUrl)}" />`,
    `<meta data-rh="true" name="twitter:image:alt" content="${escapeHtmlAttr(meta.imageAlt)}" />`
  );

  if (meta.jsonLd) {
    const json = JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c');
    lines.push(`<script data-rh="true" type="application/ld+json">${json}</script>`);
  }

  return lines.join('\n    ');
}

export function injectMetadataIntoHtml(html: string, pathname: string): string {
  const meta = getRouteMetadata(pathname);
  const rendered = `<!--seo:start-->\n    ${renderSeoHeadTags(meta)}\n    <!--seo:end-->`;
  return html.replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, rendered);
}

export const PRERENDER_ROUTES: string[] = [
  '/archive',
  '/info',
  ...RELEASED_PROJECTS.map((project) => `/work/${project.id}`),
];
