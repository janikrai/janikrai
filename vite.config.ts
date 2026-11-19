import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {injectMetadataIntoHtml, PRERENDER_ROUTES} from './src/seo';

const KNOWN_HTML_ROUTES = new Set<string>(['/', ...PRERENDER_ROUTES]);

function getNormalizedRoutePath(reqUrl: string | undefined): string | null {
  if (!reqUrl) return null;
  const [rawPath, query = ''] = reqUrl.split('?');
  if (!rawPath) return null;
  if (query.includes('import') || query.includes('html-proxy')) {
    return null;
  }
  const normalized = rawPath === '/' ? '/' : rawPath.replace(/\/+$/, '');
  return KNOWN_HTML_ROUTES.has(normalized) ? normalized : null;
}

function seoPrerenderPlugin(): Plugin {
  const rootDir = __dirname;
  let resolvedOutDir = path.resolve(rootDir, 'dist');

  return {
    name: 'seo-prerender-plugin',
    configResolved(config) {
      resolvedOutDir = path.resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          return next();
        }
        const routePath = getNormalizedRoutePath(req.url);
        if (!routePath) {
          return next();
        }
        try {
          const indexPath = path.resolve(rootDir, 'index.html');
          const rawHtml = fs.readFileSync(indexPath, 'utf-8');
          const transformedHtml = await server.transformIndexHtml(
            req.originalUrl || req.url || '/',
            rawHtml
          );
          const finalHtml = injectMetadataIntoHtml(transformedHtml, routePath);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(req.method === 'HEAD' ? undefined : finalHtml);
        } catch (err) {
          next(err);
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          return next();
        }
        const routePath = getNormalizedRoutePath(req.url);
        if (!routePath) {
          return next();
        }
        const targetFile =
          routePath === '/'
            ? path.resolve(resolvedOutDir, 'index.html')
            : path.resolve(resolvedOutDir, `${routePath.slice(1)}.html`);
        if (!fs.existsSync(targetFile)) {
          return next();
        }
        const html = fs.readFileSync(targetFile, 'utf-8');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(req.method === 'HEAD' ? undefined : html);
      });
    },
    closeBundle() {
      const distIndexPath = path.resolve(resolvedOutDir, 'index.html');
      if (!fs.existsSync(distIndexPath)) return;

      const baseHtml = fs.readFileSync(distIndexPath, 'utf-8');
      fs.writeFileSync(distIndexPath, injectMetadataIntoHtml(baseHtml, '/'), 'utf-8');

      for (const route of PRERENDER_ROUTES) {
        const outputPath = path.resolve(resolvedOutDir, `${route.slice(1)}.html`);
        fs.mkdirSync(path.dirname(outputPath), {recursive: true});
        fs.writeFileSync(outputPath, injectMetadataIntoHtml(baseHtml, route), 'utf-8');
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), seoPrerenderPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
