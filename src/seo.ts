import { PROJECTS, SELECTED_PROJECT_ORDER } from './constants';
import { Project } from './types';

export const SITE_ORIGIN = 'https://www.janikrai.com';
export const SITE_NAME = 'Janik Rai';
export const DEFAULT_SHARE_IMAGE = 'https://janikrai.b-cdn.net/Favicon/images.png';
export const DEFAULT_SHARE_IMAGE_WIDTH = 414;
export const DEFAULT_SHARE_IMAGE_HEIGHT = 414;
export const DEFAULT_SHARE_IMAGE_TYPE = 'image/png';

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
  const isWriterDirector = Boolean(parseCreditValue(project.credits, ['Writer & Director']));
  const isDirectorDp = Boolean(parseCreditValue(project.credits, ['Director & DP']));
  const dp = parseCreditValue(project.credits, ['DP']);
  const editor = parseCreditValue(project.credits, ['Editor']);
  const productionCo = parseCreditValue(project.credits, ['Production Company']);

  if (isNarrativeProject(project)) {
    const lead = `${project.name}, a narrative film directed by ${SITE_NAME}.`;
    return dp ? `${lead} Cinematography by ${dp}.` : lead;
  }

  let lead: string;
  if (project.id === 'this-is-home') {
    lead = `${project.name}, a commercial film for ${project.client} directed by ${SITE_NAME}.`;
  } else if (isDirectorDp) {
    lead = `${project.name} for ${project.client}, directed and shot by ${SITE_NAME}.`;
  } else if (isWriterDirector) {
    lead = `${project.name} for ${project.client}, written and directed by ${SITE_NAME}.`;
  } else if (productionCo && project.id === 'into-the-heat') {
    lead = `${project.name} for ${project.client}, directed by ${SITE_NAME} with ${productionCo}.`;
  } else {
    lead = `${project.name} for ${project.client}, directed by ${SITE_NAME}.`;
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
    `<meta data-seo="true" name="description" content="${escapeHtmlAttr(meta.description)}" />`,
    `<link data-seo="true" rel="canonical" href="${escapeHtmlAttr(meta.canonicalUrl)}" />`,
    `<meta data-seo="true" property="og:site_name" content="${escapeHtmlAttr(SITE_NAME)}" />`,
    `<meta data-seo="true" property="og:type" content="${escapeHtmlAttr(meta.ogType)}" />`,
    `<meta data-seo="true" property="og:url" content="${escapeHtmlAttr(meta.canonicalUrl)}" />`,
    `<meta data-seo="true" property="og:title" content="${escapeHtmlAttr(meta.title)}" />`,
    `<meta data-seo="true" property="og:description" content="${escapeHtmlAttr(meta.description)}" />`,
    `<meta data-seo="true" property="og:image" content="${escapeHtmlAttr(meta.imageUrl)}" />`,
    `<meta data-seo="true" property="og:image:alt" content="${escapeHtmlAttr(meta.imageAlt)}" />`,
  ];

  if (meta.imageType) {
    lines.push(`<meta data-seo="true" property="og:image:type" content="${escapeHtmlAttr(meta.imageType)}" />`);
  }
  if (meta.imageWidth && meta.imageHeight) {
    lines.push(`<meta data-seo="true" property="og:image:width" content="${meta.imageWidth}" />`);
    lines.push(`<meta data-seo="true" property="og:image:height" content="${meta.imageHeight}" />`);
  }

  lines.push(
    `<meta data-seo="true" name="twitter:card" content="summary_large_image" />`,
    `<meta data-seo="true" name="twitter:title" content="${escapeHtmlAttr(meta.title)}" />`,
    `<meta data-seo="true" name="twitter:description" content="${escapeHtmlAttr(meta.description)}" />`,
    `<meta data-seo="true" name="twitter:image" content="${escapeHtmlAttr(meta.imageUrl)}" />`,
    `<meta data-seo="true" name="twitter:image:alt" content="${escapeHtmlAttr(meta.imageAlt)}" />`
  );

  if (meta.jsonLd) {
    const json = JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c');
    lines.push(`<script data-seo="true" type="application/ld+json">${json}</script>`);
  }

  return lines.join('\n    ');
}

export function syncDocumentMetadata(meta: RouteMetadata): void {
  if (typeof document === 'undefined' || !document.head) return;

  if (document.title !== meta.title) {
    document.title = meta.title;
  }

  const head = document.head;

  const setMetaTag = (attr: 'name' | 'property', key: string, content: string | undefined) => {
    const matches = Array.from(head.querySelectorAll<HTMLMetaElement>(`meta[${attr}="${key}"]`));
    if (!content) {
      matches.forEach((el) => el.remove());
      return;
    }
    let primary = matches[0];
    if (!primary) {
      primary = document.createElement('meta');
      primary.setAttribute(attr, key);
      primary.setAttribute('data-seo', 'true');
      head.appendChild(primary);
    }
    primary.setAttribute('content', content);
    for (let i = 1; i < matches.length; i += 1) {
      matches[i].remove();
    }
  };

  // Remove any legacy duplicate og:image:secure_url tags if present
  head.querySelectorAll('meta[property="og:image:secure_url"]').forEach((el) => el.remove());

  setMetaTag('name', 'description', meta.description);
  setMetaTag('property', 'og:site_name', SITE_NAME);
  setMetaTag('property', 'og:type', meta.ogType);
  setMetaTag('property', 'og:url', meta.canonicalUrl);
  setMetaTag('property', 'og:title', meta.title);
  setMetaTag('property', 'og:description', meta.description);
  setMetaTag('property', 'og:image', meta.imageUrl);
  setMetaTag('property', 'og:image:alt', meta.imageAlt);
  setMetaTag('property', 'og:image:type', meta.imageType);
  setMetaTag('property', 'og:image:width', meta.imageWidth ? String(meta.imageWidth) : undefined);
  setMetaTag('property', 'og:image:height', meta.imageHeight ? String(meta.imageHeight) : undefined);
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', meta.title);
  setMetaTag('name', 'twitter:description', meta.description);
  setMetaTag('name', 'twitter:image', meta.imageUrl);
  setMetaTag('name', 'twitter:image:alt', meta.imageAlt);

  const canonicalLinks = Array.from(head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'));
  let canonical = canonicalLinks[0];
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('data-seo', 'true');
    head.appendChild(canonical);
  }
  canonical.setAttribute('href', meta.canonicalUrl);
  for (let i = 1; i < canonicalLinks.length; i += 1) {
    canonicalLinks[i].remove();
  }

  const ldScripts = Array.from(head.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'));
  if (meta.jsonLd) {
    let scriptEl = ldScripts[0];
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.setAttribute('type', 'application/ld+json');
      scriptEl.setAttribute('data-seo', 'true');
      head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(meta.jsonLd);
    for (let i = 1; i < ldScripts.length; i += 1) {
      ldScripts[i].remove();
    }
  } else {
    ldScripts.forEach((el) => el.remove());
  }
}

export function renderInitialHomeHtml(): string {
  const selectedProjects = SELECTED_PROJECT_ORDER
    .map((id) => PROJECTS.find((p) => p.id === id))
    .filter((p): p is Project => Boolean(p));

  const firstProject = selectedProjects[0];
  const firstPoster = firstProject?.teaserPosterUrl || firstProject?.stills?.[0] || '';

  const desktopRows = selectedProjects
    .map((project) => {
      const nameHtml = `<span class="text-[15.6px] leading-[17.6px] font-main whitespace-nowrap opacity-55 group-hover:opacity-100 text-ink">${escapeHtmlText(project.name)}</span>`;
      const comingSoonBadge = project.previewOnly
        ? ` <span class="italic text-[0.85em] align-baseline">(coming soon)</span>`
        : '';
      const clientHtml = `<span class="text-[15.6px] leading-[17.6px] font-main whitespace-nowrap opacity-40 group-hover:opacity-65 text-ink">${escapeHtmlText(project.client)}${comingSoonBadge}</span>`;

      if (project.previewOnly) {
        return `<div><div role="presentation" aria-label="${escapeHtmlAttr(`${project.name} — ${project.client} (coming soon)`)}" class="group grid w-full grid-cols-[185px_auto] lg:grid-cols-[200px_auto] xl:grid-cols-[215px_auto] items-baseline py-[2.2px] text-inherit leading-[17.6px] cursor-default">${nameHtml}${clientHtml}</div></div>`;
      }

      return `<div><a href="/work/${escapeHtmlAttr(project.id)}" class="group grid w-full grid-cols-[185px_auto] lg:grid-cols-[200px_auto] xl:grid-cols-[215px_auto] items-baseline py-[2.2px] no-underline text-inherit leading-[17.6px] cursor-pointer">${nameHtml}${clientHtml}</a></div>`;
    })
    .join('');

  const mobileCard = firstProject
    ? `<div class="md:hidden fixed inset-0 overflow-hidden z-10">${
        firstPoster
          ? `<img src="${escapeHtmlAttr(firstPoster)}" alt="" aria-hidden="true" class="absolute inset-0 w-full h-full object-cover opacity-75" />`
          : ''
      }<div class="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/40 pointer-events-none"></div>${
        firstProject.previewOnly
          ? `<div class="absolute inset-0 flex flex-col items-center justify-end px-8 pb-16 sm:pb-20 text-inherit cursor-default"><p class="text-[10.5px] leading-[12px] uppercase tracking-[0.05em] font-heading font-semibold opacity-60 mb-1">${escapeHtmlText(firstProject.client)} <span class="normal-case italic text-[0.85em] align-baseline">(coming soon)</span></p><h2 class="text-[15.6px] sm:text-[17px] leading-[22px] font-main font-normal text-center text-ink">${escapeHtmlText(firstProject.name)}</h2></div>`
          : `<a href="/work/${escapeHtmlAttr(firstProject.id)}" class="absolute inset-0 flex flex-col items-center justify-end px-8 pb-16 sm:pb-20 text-inherit no-underline"><p class="text-[10.5px] leading-[12px] uppercase tracking-[0.05em] font-heading font-semibold opacity-60 mb-1">${escapeHtmlText(firstProject.client)}</p><h2 class="text-[15.6px] sm:text-[17px] leading-[22px] font-main font-normal text-center text-ink">${escapeHtmlText(firstProject.name)}</h2></a>`
      }</div>`
    : '';

  const desktopBg = firstPoster
    ? `<div style="position:fixed;inset:0;width:100vw;height:100vh;overflow:hidden" class="hidden md:block z-0 pointer-events-none bg-bg"><div class="relative w-full h-full opacity-75"><img src="${escapeHtmlAttr(firstPoster)}" alt="" aria-hidden="true" class="absolute inset-0 w-full h-full object-cover select-none" /></div><div class="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent opacity-50 pointer-events-none"></div></div>`
    : '';

  return `<div class="relative min-h-screen w-full bg-bg text-ink selection:bg-ink selection:text-bg"><nav class="fixed top-0 left-0 right-0 z-[80] p-5 md:p-6 pointer-events-none"><div class="grid grid-cols-3 items-baseline sm:flex sm:items-baseline sm:gap-16 md:gap-20 pointer-events-auto w-full sm:w-auto"><a href="/info" class="block sm:inline text-left font-main text-[15.6px] leading-[22px] opacity-55 hover:opacity-100 transition-opacity no-underline text-inherit whitespace-nowrap">Info</a><a href="/" class="block sm:inline text-center sm:text-left font-main text-[15.6px] leading-[22px] opacity-100 font-normal no-underline text-inherit whitespace-nowrap">Selected</a><a href="/archive" class="block sm:inline text-right sm:text-left font-main text-[15.6px] leading-[22px] opacity-55 hover:opacity-100 transition-opacity no-underline text-inherit whitespace-nowrap">Archive</a></div></nav><div class="fixed inset-x-0 top-1/2 -translate-y-1/2 z-[75] pointer-events-none flex items-center justify-center overflow-hidden"><a href="/info" aria-label="Janik Rai — View Director Info" class="group relative inline-flex items-center justify-center text-inherit no-underline select-none py-10 px-8 sm:px-14 md:px-20 pointer-events-auto cursor-pointer"><div class="flex items-center justify-center gap-20 sm:gap-28 md:gap-[9.9rem] lg:gap-[13.2rem] pointer-events-none"><span style="filter:blur(0.5px)" class="font-heading text-[15.6px] sm:text-[16px] md:text-[17px] font-semibold uppercase tracking-[0.06em] text-ink/90 whitespace-nowrap inline-block select-none">Janik</span><span style="filter:blur(0.5px)" class="font-heading text-[15.6px] sm:text-[16px] md:text-[17px] font-semibold uppercase tracking-[0.06em] text-ink/90 whitespace-nowrap inline-block select-none">Rai</span></div></a></div><main class="relative z-10 flex min-h-screen items-start justify-start p-0 pt-16 md:pt-[72px] pb-36 md:pb-40"><div class="hidden md:block w-full max-w-2xl text-left md:pl-[127px]"><div class="space-y-0"><div class="space-y-0 -mt-[2.2px]">${desktopRows}</div></div></div>${mobileCard}</main>${desktopBg}</div>`;
}

export function injectMetadataIntoHtml(html: string, pathname: string): string {
  const meta = getRouteMetadata(pathname);
  const rendered = `<!--seo:start-->\n    ${renderSeoHeadTags(meta)}\n    <!--seo:end-->`;
  const normalized = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  const appHtml = normalized === '/' ? renderInitialHomeHtml() : '';
  return html
    .replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, rendered)
    .replace('<!--app:html-->', appHtml);
}

export const PRERENDER_ROUTES: string[] = [
  '/archive',
  '/info',
  ...RELEASED_PROJECTS.map((project) => `/work/${project.id}`),
];
