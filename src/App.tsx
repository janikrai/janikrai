import React, { useState, useEffect, useRef, useMemo, forwardRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams, useLocation, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PROJECTS, CATEGORIES } from './constants';
import { Project, Category } from './types';

const StrikeButton = forwardRef<HTMLButtonElement, { children: React.ReactNode, onClick?: () => void, className?: string, disabled?: boolean, [key: string]: any }>(
  ({ children, onClick, className, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        onClick={onClick}
        className={`transition-opacity duration-200 hover:opacity-100 ${className}`}
        disabled={disabled}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
StrikeButton.displayName = 'StrikeButton';

const getPoster = (project: Project) => project.stills?.[0] ?? '';

function ArchiveTile({
  project,
  isOverlayOpen,
  isTabHidden,
  isDesktop
}: {
  key?: React.Key;
  project: Project;
  isOverlayOpen: boolean;
  isTabHidden: boolean;
  isDesktop: boolean;
}) {
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLAnchorElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isDesktop) return;

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
        });
      },
      {
        threshold: 0.15,
        rootMargin: '100px 0px 100px 0px',
      }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [isDesktop]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isDesktop && isInView && !isOverlayOpen && !isTabHidden) {
      if (!video.src) {
        video.src = project.teaserUrl;
        video.load();
      }
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isInView, isOverlayOpen, isTabHidden, isDesktop, project.teaserUrl]);

  return (
    <Link
      ref={containerRef}
      to={`/work/${project.id}`}
      state={{ from: '/archive' }}
      className='relative aspect-video cursor-pointer overflow-hidden block text-inherit no-underline focus:outline-none focus:ring-1 focus:ring-ink/40'
      aria-label={`View project: ${project.name} for ${project.client}`}
    >
      <img
        src={project.stills?.[0] ?? project.teaserUrl}
        alt=""
        aria-hidden="true"
        className='absolute inset-0 w-full h-full object-cover select-none'
      />
      {!isDesktop && (
        <video
          ref={videoRef}
          poster={project.stills?.[0] ?? ''}
          muted
          loop
          playsInline
          preload="none"
          onCanPlay={() => setIsVideoReady(true)}
          onPlaying={() => setIsVideoReady(true)}
          className='absolute inset-0 w-full h-full object-cover transition-opacity duration-700 pointer-events-none'
          style={{ opacity: isVideoReady ? 1 : 0 }}
        />
      )}
      <div className='absolute inset-0 bg-black/55 pointer-events-none' />
      <div className='absolute inset-0 flex flex-col items-start justify-end p-2 pointer-events-none'>
        <p className='text-[10.5px] leading-[12px] uppercase tracking-[0.05em] font-heading font-semibold opacity-75 mb-0.5'>{project.client}</p>
        <h3 className='text-[15.6px] leading-[22px] font-main text-ink'>{project.name}</h3>
      </div>
    </Link>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainView />} />
      <Route path="/archive" element={<MainView />} />
      <Route path="/info" element={<MainView />} />
      <Route path="/work/:projectId" element={<MainView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function MainView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();

  const [hoveredProject, setHoveredProject] = useState<Project | null>(null);
  const [activeTeaser, setActiveTeaser] = useState<Project>(PROJECTS[0]);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [hasSwipedOnce, setHasSwipedOnce] = useState(false);
  const [mobilePlayingMap, setMobilePlayingMap] = useState<Record<string, boolean>>({});
  const [hasVideoError, setHasVideoError] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [isTabHidden, setIsTabHidden] = useState(() =>
    typeof document !== 'undefined' ? document.hidden : false
  );

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const aboutCloseBtnRef = useRef<HTMLButtonElement>(null);
  const playerCloseBtnRef = useRef<HTMLButtonElement>(null);
  const creditsCloseBtnRef = useRef<HTMLButtonElement>(null);
  const creditsTriggerRef = useRef<HTMLElement | null>(null);
  const playerScrollRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const playerOverlayRef = useRef<HTMLDivElement>(null);
  const aboutOverlayRef = useRef<HTMLDivElement>(null);
  const creditsOverlayRef = useRef<HTMLDivElement>(null);
  const selectedLinkRef = useRef<HTMLAnchorElement>(null);
  const [selectedLeft, setSelectedLeft] = useState<number>(0);
  const [infoContentLeft, setInfoContentLeft] = useState<number>(0);

  const preCreditsVolume = useRef<number>(1);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const cameFrom = (location.state as { from?: string } | null)?.from;
  const activeCategory: Category = useMemo(() => {
    if (location.pathname === '/archive') return 'Archive';
    if (projectId) {
      if (cameFrom === '/archive') return 'Archive';
      if (cameFrom === '/' || cameFrom === '/info') return 'Selected';
      const proj = PROJECTS.find(p => p.id === projectId);
      if (proj && !proj.tags.includes('Selected')) return 'Archive';
    }
    return 'Selected';
  }, [location.pathname, location.state, projectId]);

  const isAboutOpen = location.pathname === '/info';
  const selectedProject = useMemo(() => PROJECTS.find(p => p.id === projectId) || null, [projectId]);
  const isOverlayOpen = Boolean(selectedProject || isAboutOpen);

  const filteredProjects = useMemo(
    () => PROJECTS.filter(p => p.tags.includes(activeCategory)),
    [activeCategory]
  );

  const currentIndex = useMemo(
    () => selectedProject ? filteredProjects.findIndex(p => p.id === selectedProject.id) : -1,
    [selectedProject, filteredProjects]
  );
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < filteredProjects.length - 1;

  // Viewport resize tracking
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track the exact left coordinate of 'Selected' to align project column
  useEffect(() => {
    const updateSelectedLeft = () => {
      if (selectedLinkRef.current) {
        const rect = selectedLinkRef.current.getBoundingClientRect();
        if (rect.left > 0) {
          setSelectedLeft(rect.left);
        }
      }
    };
    updateSelectedLeft();
    window.addEventListener('resize', updateSelectedLeft);
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(updateSelectedLeft);
    }
    return () => window.removeEventListener('resize', updateSelectedLeft);
  }, []);

  // Document tab visibility tracking
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Lock background body scroll when overlay is active
  useEffect(() => {
    if (isOverlayOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOverlayOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndY.current = e.changedTouches[0].clientY;
    const diff = (touchStartY.current ?? 0) - (touchEndY.current ?? 0);
    const total = filteredProjects.length;
    if (diff > 35) {
      setMobileIndex(i => (i + 1) % total);
      setHasSwipedOnce(true);
    }
    if (diff < -35) {
      setMobileIndex(i => (i - 1 + total) % total);
      setHasSwipedOnce(true);
    }
    touchStartY.current = null;
    touchEndY.current = null;
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef0 = useRef<HTMLVideoElement>(null);
  const bgVideoRef1 = useRef<HTMLVideoElement>(null);
  const [activeBgIndex, setActiveBgIndex] = useState(0);

  // Desktop background video crossfade with readyState check & outgoing pause
  useEffect(() => {
    if (!isDesktop) return;

    const refs = [bgVideoRef0, bgVideoRef1];
    const prevIndex = activeBgIndex;
    const nextIndex = activeBgIndex === 0 ? 1 : 0;
    const nextVideo = refs[nextIndex].current;
    const prevVideo = refs[prevIndex].current;
    if (!nextVideo) return;

    let cancelled = false;
    let pauseTimer: NodeJS.Timeout | null = null;
    let swapTimer: NodeJS.Timeout | null = null;
    const startTime = Date.now();

    const swap = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 150 - elapsed);
      swapTimer = setTimeout(() => {
        if (cancelled) return;
        setActiveBgIndex(nextIndex);
        // Pause outgoing background video once the 600ms CSS fade completes
        pauseTimer = setTimeout(() => {
          if (!cancelled && prevVideo) {
            prevVideo.pause();
          }
        }, 650);

        // Optionally prefetch one likely next teaser after current is ready
        const curIdx = filteredProjects.findIndex(p => p.id === activeTeaser.id);
        const nextProj = filteredProjects[(curIdx + 1) % filteredProjects.length];
        if (nextProj?.teaserUrl && typeof document !== 'undefined') {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.as = 'video';
          link.href = nextProj.teaserUrl;
          document.head.appendChild(link);
          setTimeout(() => {
            if (link.parentNode) link.parentNode.removeChild(link);
          }, 6000);
        }
      }, remaining);
    };

    nextVideo.src = activeTeaser.teaserUrl;
    nextVideo.poster = getPoster(activeTeaser);
    nextVideo.load();

    if (!isOverlayOpen && !isTabHidden) {
      nextVideo.play().catch(() => {});
    }

    if (nextVideo.readyState >= 3) {
      swap();
    } else {
      nextVideo.addEventListener('canplay', swap, { once: true });
    }

    return () => {
      cancelled = true;
      if (swapTimer) clearTimeout(swapTimer);
      if (pauseTimer) clearTimeout(pauseTimer);
      nextVideo.removeEventListener('canplay', swap);
    };
  }, [activeTeaser, isDesktop, filteredProjects, isOverlayOpen, isTabHidden]);

  // Pause desktop background videos while an overlay is open or tab is hidden
  useEffect(() => {
    if (!isDesktop) return;
    const currentBgVideo = activeBgIndex === 0 ? bgVideoRef0.current : bgVideoRef1.current;

    if (isOverlayOpen || isTabHidden) {
      bgVideoRef0.current?.pause();
      bgVideoRef1.current?.pause();
    } else {
      currentBgVideo?.play().catch(() => {});
    }
  }, [isOverlayOpen, isTabHidden, isDesktop, activeBgIndex]);

  // Mobile video playback for active swipe index
  useEffect(() => {
    if (isDesktop) return;

    filteredProjects.forEach((project, i) => {
      const videoEl = document.getElementById(`mobile-video-${project.id}`) as HTMLVideoElement | null;
      if (videoEl) {
        if (i === mobileIndex && !isOverlayOpen && !isTabHidden && activeCategory === 'Selected') {
          videoEl.play().catch(() => {});
        } else {
          videoEl.pause();
        }
      }
    });
  }, [mobileIndex, filteredProjects, isDesktop, isOverlayOpen, isTabHidden, activeCategory]);

  useEffect(() => {
    setMobileIndex(0);
    setHasSwipedOnce(false);
  }, [activeCategory]);

  // When switching project in full-film player
  useEffect(() => {
    setHasVideoError(false);
    setIsCreditsOpen(false);
    preCreditsVolume.current = 1;

    if (selectedProject && videoRef.current) {
      videoRef.current.volume = 1;
      videoRef.current.currentTime = 0;
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
      playerScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedProject?.id]);

  // Shared credits close handler that restores volume saved when credits opened
  const handleCloseCredits = useCallback(() => {
    setIsCreditsOpen(false);
    if (videoRef.current && !isNaN(videoRef.current.volume)) {
      videoRef.current.volume = preCreditsVolume.current;
    }
    creditsTriggerRef.current?.focus();
  }, []);

  // Shared credits open handler
  const handleOpenCredits = useCallback((e: React.MouseEvent<HTMLElement>) => {
    creditsTriggerRef.current = e.currentTarget;
    if (videoRef.current) {
      preCreditsVolume.current = videoRef.current.volume;
      videoRef.current.volume = Math.max(0, videoRef.current.volume * 0.5);
    }
    setIsCreditsOpen(true);
  }, []);

  const handleClosePlayer = useCallback(() => {
    handleCloseCredits();
    navigate(cameFrom || (activeCategory === 'Archive' ? '/archive' : '/'));
  }, [handleCloseCredits, navigate, cameFrom, activeCategory]);

  const handlePrev = useCallback(() => {
    handleCloseCredits();
    if (!selectedProject) return;
    const prevProject = filteredProjects[currentIndex - 1];
    if (prevProject) {
      navigate(`/work/${prevProject.id}`, { state: { from: cameFrom || (activeCategory === 'Archive' ? '/archive' : '/') } });
    }
  }, [handleCloseCredits, selectedProject, filteredProjects, currentIndex, navigate, cameFrom, activeCategory]);

  const handleNext = useCallback(() => {
    handleCloseCredits();
    if (!selectedProject) return;
    const nextProject = filteredProjects[currentIndex + 1];
    if (nextProject) {
      navigate(`/work/${nextProject.id}`, { state: { from: cameFrom || (activeCategory === 'Archive' ? '/archive' : '/') } });
    }
  }, [handleCloseCredits, selectedProject, filteredProjects, currentIndex, navigate, cameFrom, activeCategory]);

  // Keyboard navigation & Escape handling with Credits precedence
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        if (isCreditsOpen) {
          e.preventDefault();
          handleCloseCredits();
          return;
        }
        if (selectedProject) {
          e.preventDefault();
          handleClosePlayer();
          return;
        }
        if (isAboutOpen) {
          e.preventDefault();
          navigate('/');
          return;
        }
      }

      if (!isCreditsOpen && selectedProject) {
        if (e.key === 'ArrowLeft' && hasPrev) {
          e.preventDefault();
          handlePrev();
        }
        if (e.key === 'ArrowRight' && hasNext) {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isCreditsOpen, selectedProject, isAboutOpen, navigate, handlePrev, handleNext, handleCloseCredits, handleClosePlayer, hasPrev, hasNext]);

  // Focus trap utility
  const handleTrapFocus = (e: React.KeyboardEvent<HTMLElement>, containerRef: React.RefObject<HTMLElement | null>) => {
    if (e.key !== 'Tab' || !containerRef.current) return;
    const elements = Array.from(
      containerRef.current.querySelectorAll(
        'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    const focusables: HTMLElement[] = elements.filter((el): el is HTMLElement => el instanceof HTMLElement && !el.closest('[inert]'));

    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first || document.activeElement === containerRef.current) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  // Measure desktop Info align position
  useEffect(() => {
    const measure = () => {
      if (closeButtonRef.current) {
        setInfoContentLeft(closeButtonRef.current.getBoundingClientRect().left);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isAboutOpen]);

  // Player overlay focus management
  useEffect(() => {
    if (selectedProject) {
      if (!lastFocusedRef.current) {
        lastFocusedRef.current = document.activeElement as HTMLElement;
      }
      const timer = setTimeout(() => {
        playerCloseBtnRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    } else {
      lastFocusedRef.current?.focus();
      lastFocusedRef.current = null;
    }
  }, [selectedProject]);

  // Info overlay focus management
  useEffect(() => {
    if (isAboutOpen) {
      if (!lastFocusedRef.current) {
        lastFocusedRef.current = document.activeElement as HTMLElement;
      }
      const timer = setTimeout(() => {
        const btn = closeButtonRef.current || aboutCloseBtnRef.current || aboutOverlayRef.current;
        btn?.focus();
      }, 60);
      return () => clearTimeout(timer);
    } else if (!selectedProject) {
      lastFocusedRef.current?.focus();
      lastFocusedRef.current = null;
    }
  }, [isAboutOpen, selectedProject]);

  useEffect(() => {
    if (!isAboutOpen) {
      setIsBioExpanded(false);
    }
  }, [isAboutOpen]);

  // Credits overlay focus management
  useEffect(() => {
    if (isCreditsOpen) {
      const timer = setTimeout(() => {
        creditsCloseBtnRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isCreditsOpen]);

  if (projectId && !selectedProject) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="relative min-h-screen w-full bg-bg text-ink selection:bg-ink selection:text-bg">
      <Helmet>
        {selectedProject ? (
          <>
            <title>{selectedProject.name} — Janik Rai</title>
            <meta name="description" content={`${selectedProject.name} for ${selectedProject.client}. Directed by Janik Rai.`} />
            <meta property="og:title" content={`${selectedProject.name} — Janik Rai`} />
            <meta property="og:description" content={`${selectedProject.name} for ${selectedProject.client}. Directed by Janik Rai.`} />
            <meta property="og:image" content="https://janikrai.b-cdn.net/Favicon/images.png" />
            <meta property="og:image:width" content="414" />
            <meta property="og:image:height" content="414" />
            <meta property="og:url" content={`https://janikrai.com/work/${selectedProject.id}`} />
            <meta property="og:type" content="video.other" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={`${selectedProject.name} — Janik Rai`} />
            <meta name="twitter:description" content={`${selectedProject.name} for ${selectedProject.client}. Directed by Janik Rai.`} />
            <meta name="twitter:image" content="https://janikrai.b-cdn.net/Favicon/images.png" />
            <link rel="canonical" href={`https://janikrai.com/work/${selectedProject.id}`} />
          </>
        ) : location.pathname === '/archive' ? (
          <>
            <title>Archive — Janik Rai</title>
            <meta name="description" content="Archive of commercial and narrative work directed by Janik Rai." />
            <meta property="og:title" content="Archive — Janik Rai" />
            <meta property="og:description" content="Archive of commercial and narrative work directed by Janik Rai." />
            <meta property="og:image" content="https://janikrai.b-cdn.net/Favicon/images.png" />
            <meta property="og:image:width" content="414" />
            <meta property="og:image:height" content="414" />
            <meta property="og:url" content="https://janikrai.com/archive" />
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="Archive — Janik Rai" />
            <meta name="twitter:description" content="Archive of commercial and narrative work directed by Janik Rai." />
            <meta name="twitter:image" content="https://janikrai.b-cdn.net/Favicon/images.png" />
            <link rel="canonical" href="https://janikrai.com/archive" />
          </>
        ) : isAboutOpen ? (
          <>
            <title>About — Janik Rai</title>
            <meta name="description" content="Janik Rai is a British-Canadian director with South Asian roots. His work balances striking imagery with a raw, human sensibility, combining cinematic composition with a sense of lived reality." />
            <meta property="og:title" content="About — Janik Rai" />
            <meta property="og:description" content="Janik Rai is a British-Canadian director with South Asian roots. His work balances striking imagery with a raw, human sensibility, combining cinematic composition with a sense of lived reality." />
            <meta property="og:image" content="https://janikrai.b-cdn.net/Favicon/images.png" />
            <meta property="og:image:width" content="414" />
            <meta property="og:image:height" content="414" />
            <meta property="og:url" content="https://janikrai.com/info" />
            <meta property="og:type" content="profile" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="About — Janik Rai" />
            <meta name="twitter:description" content="Janik Rai is a British-Canadian director with South Asian roots. His work balances striking imagery with a raw, human sensibility, combining cinematic composition with a sense of lived reality." />
            <meta name="twitter:image" content="https://janikrai.b-cdn.net/Favicon/images.png" />
            <link rel="canonical" href="https://janikrai.com/info" />
          </>
        ) : (
          <>
            <title>Janik Rai — Commercial Director</title>
            <meta name="description" content="Toronto-based commercial director. Cinematic, narrative-driven work for BMW, Spotify, Powerade, Apple Music, and more." />
            <meta property="og:title" content="Janik Rai — Commercial Director" />
            <meta property="og:description" content="Toronto-based commercial director. Cinematic, narrative-driven work for BMW, Spotify, Powerade, Apple Music, and more." />
            <meta property="og:image" content="https://janikrai.b-cdn.net/Favicon/images.png" />
            <meta property="og:image:width" content="414" />
            <meta property="og:image:height" content="414" />
            <meta property="og:url" content="https://janikrai.com" />
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="Janik Rai — Commercial Director" />
            <meta name="twitter:description" content="Toronto-based commercial director. Cinematic, narrative-driven work for BMW, Spotify, Powerade, Apple Music, and more." />
            <meta name="twitter:image" content="https://janikrai.b-cdn.net/Favicon/images.png" />
            <link rel="canonical" href="https://janikrai.com" />
          </>
        )}
      </Helmet>

      {/* Navigation */}
      <nav
        inert={isOverlayOpen ? true : undefined}
        className={`fixed top-0 left-0 right-0 z-[80] p-5 md:p-6 pointer-events-none transition-opacity duration-300 ${
          isOverlayOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Mobile: 3 equal-width grid columns (left, centre, right). Desktop & Tablet: flex with preserved gaps */}
        <div className="grid grid-cols-3 items-baseline sm:flex sm:items-baseline sm:gap-16 md:gap-20 pointer-events-auto w-full sm:w-auto">
          <Link
            to="/info"
            className="block sm:inline text-left font-main text-[15.6px] leading-[22px] opacity-55 hover:opacity-100 transition-opacity no-underline text-inherit focus:outline-none focus-visible:ring-1 focus-visible:ring-ink/40 whitespace-nowrap"
          >
            Info
          </Link>
          <Link
            ref={selectedLinkRef}
            to="/"
            className={`block sm:inline text-center sm:text-left font-main text-[15.6px] leading-[22px] transition-opacity no-underline text-inherit focus:outline-none focus-visible:ring-1 focus-visible:ring-ink/40 whitespace-nowrap ${
              activeCategory === 'Selected' ? 'opacity-100 font-normal' : 'opacity-55 hover:opacity-100'
            }`}
          >
            Selected
          </Link>
          <Link
            to="/archive"
            className={`block sm:inline text-right sm:text-left font-main text-[15.6px] leading-[22px] transition-opacity no-underline text-inherit focus:outline-none focus-visible:ring-1 focus-visible:ring-ink/40 whitespace-nowrap ${
              activeCategory === 'Archive' ? 'opacity-100 font-normal' : 'opacity-55 hover:opacity-100'
            }`}
          >
            Archive
          </Link>
        </div>
      </nav>

      {/* Centred Director Name (Reference Layout & Inward Hover Animation, +2px Typography) */}
      <div
        inert={isOverlayOpen ? true : undefined}
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none transition-opacity duration-300 ${
          isAboutOpen || selectedProject || activeCategory === 'Archive' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <Link
          to="/info"
          aria-label="Janik Rai — View Director Info"
          className="group pointer-events-auto relative inline-flex items-center justify-center text-inherit no-underline cursor-pointer select-none py-10 px-8 sm:px-14 md:px-20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink/60"
        >
          <div className="flex items-center justify-center gap-20 sm:gap-28 md:gap-36 lg:gap-48 pointer-events-none">
            <span className="font-heading text-[15.6px] sm:text-[16px] md:text-[17px] font-semibold uppercase tracking-[0.06em] text-ink/90 group-hover:text-ink transition-transform duration-[450ms] [transition-timing-function:cubic-bezier(0.5,0.25,0,1)] group-hover:translate-x-6 sm:group-hover:translate-x-10 group-focus-visible:translate-x-6 sm:group-focus-visible:translate-x-10 motion-reduce:transform-none motion-reduce:transition-none whitespace-nowrap will-change-transform">
              Janik
            </span>
            <span className="font-heading text-[15.6px] sm:text-[16px] md:text-[17px] font-semibold uppercase tracking-[0.06em] text-ink/90 group-hover:text-ink transition-transform duration-[450ms] [transition-timing-function:cubic-bezier(0.5,0.25,0,1)] group-hover:-translate-x-6 sm:group-hover:-translate-x-10 group-focus-visible:-translate-x-6 sm:group-focus-visible:-translate-x-10 motion-reduce:transform-none motion-reduce:transition-none whitespace-nowrap will-change-transform">
              Rai
            </span>
          </div>
        </Link>
      </div>

      {/* Main Content */}
      <main
        inert={isOverlayOpen ? true : undefined}
        className="relative z-10 flex min-h-screen items-start justify-start p-0 pt-16 md:pt-[72px] pb-36 md:pb-40"
      >
        {/* Desktop Project List (Aligned exactly beneath 'Selected', +2px Typography) */}
        <div
          className="hidden md:block w-full max-w-2xl text-left md:pl-[138px]"
          style={{ paddingLeft: selectedLeft ? `${selectedLeft}px` : undefined }}
        >
          <div className={`space-y-0 transition-opacity duration-300 ${isAboutOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {filteredProjects.map((project) => {
              const isHovered = hoveredProject?.id === project.id;
              return (
                <Link
                  key={project.id}
                  to={`/work/${project.id}`}
                  state={{ from: location.pathname }}
                  onMouseEnter={() => {
                    setHoveredProject(project);
                    setActiveTeaser(project);
                  }}
                  onMouseLeave={() => setHoveredProject(null)}
                  onFocus={() => {
                    setHoveredProject(project);
                    setActiveTeaser(project);
                  }}
                  onBlur={() => setHoveredProject(null)}
                  className="group grid grid-cols-[185px_auto] lg:grid-cols-[200px_auto] xl:grid-cols-[215px_auto] items-baseline cursor-pointer no-underline text-inherit mb-[4.4px] leading-[17.6px] focus:outline-none focus-visible:underline underline-offset-2"
                >
                  <span
                    className={`text-[15.6px] leading-[17.6px] font-main whitespace-nowrap transition-opacity duration-200 ${
                      isHovered ? 'opacity-100 text-ink' : 'opacity-55 group-hover:opacity-100 text-ink'
                    }`}
                  >
                    {project.name}
                  </span>
                  <span
                    className={`text-[15.6px] leading-[17.6px] font-main whitespace-nowrap transition-opacity duration-200 ${
                      isHovered ? 'opacity-75 text-ink' : 'opacity-40 group-hover:opacity-65 text-ink'
                    }`}
                  >
                    {project.client}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Mobile Project Browsing */}
        <div className="md:hidden">
          {activeCategory === 'Archive' ? (
            <div 
              className={`fixed inset-0 overflow-y-auto z-10 p-[8.5px] pt-16 pb-12 transition-opacity duration-300 ${
                isAboutOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              <div className='grid grid-cols-2 gap-2'>
                {filteredProjects.map((project) => (
                  <ArchiveTile
                    key={project.id}
                    project={project}
                    isOverlayOpen={isOverlayOpen}
                    isTabHidden={isTabHidden}
                    isDesktop={isDesktop}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div 
              className={`fixed inset-0 overflow-hidden z-10 transition-opacity duration-300 ${
                isAboutOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {filteredProjects.map((project, i) => {
                const isCurrent = i === mobileIndex;
                const isPlaying = mobilePlayingMap[project.id];
                return (
                  <div
                    key={project.id}
                    className='absolute inset-0 transition-opacity duration-500'
                    style={{ opacity: isCurrent ? 1 : 0, pointerEvents: isCurrent ? 'auto' : 'none' }}
                  >
                    <img
                      src={getPoster(project)}
                      alt=""
                      aria-hidden="true"
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                        isPlaying ? 'opacity-0' : 'opacity-75'
                      }`}
                    />
                    {!isDesktop && (
                      <video
                        id={`mobile-video-${project.id}`}
                        src={project.teaserUrl}
                        poster={getPoster(project)}
                        muted
                        loop
                        playsInline
                        onPlaying={() => setMobilePlayingMap(prev => ({ ...prev, [project.id]: true }))}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                          isPlaying ? 'opacity-75' : 'opacity-0'
                        }`}
                      />
                    )}
                    <div className='absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/40 pointer-events-none' />
                    <Link
                      to={`/work/${project.id}`}
                      state={{ from: '/' }}
                      className='absolute inset-0 flex flex-col items-center justify-end px-8 pb-16 sm:pb-20 text-inherit no-underline focus:outline-none focus:ring-1 focus:ring-ink/40'
                      aria-label={`View project: ${project.name}`}
                    >
                      <p className='text-[10.5px] leading-[12px] uppercase tracking-[0.05em] font-heading font-semibold opacity-60 mb-1'>{project.client}</p>
                      <h2 className='text-[15.6px] sm:text-[17px] leading-[22px] font-main font-normal text-center text-ink'>
                        {project.name}
                      </h2>
                    </Link>
                  </div>
                );
              })}
              {!hasSwipedOnce && (
                <div className='absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none'>
                  <motion.div
                    animate={{ y: [0, 6, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    className='flex flex-col items-center gap-[3px] opacity-50'
                  >
                    <div className='w-[1px] h-4 bg-current' />
                    <div className='w-1.5 h-1.5 rounded-full bg-current' />
                  </motion.div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Desktop Background Video */}
      {isDesktop && (
        <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden' }} className="hidden md:block z-0 pointer-events-none">
          {[bgVideoRef0, bgVideoRef1].map((ref, i) => (
            <video
              key={i}
              ref={ref}
              muted
              loop
              playsInline
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: i === activeBgIndex ? 0.75 : 0,
                transition: 'opacity 0.6s ease',
              }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent opacity-50" />
        </div>
      )}

      {/* Award Indicator (Bottom Right) */}
      <div className="fixed right-6 md:right-10 bottom-6 md:bottom-10 z-20 pointer-events-none" aria-hidden="true">
        <AnimatePresence>
          <div className='flex gap-3 items-end' style={{ flexWrap: 'wrap' }}>
            {hoveredProject?.laurelUrls?.map((url, i) => (
              <motion.img 
                key={hoveredProject?.id + '-' + i} 
                src={url} 
                alt='' 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 10 }} 
                className='h-40 w-auto object-contain opacity-75 max-w-[60px]' 
                style={{ filter: 'brightness(0) invert(0.93)' }}
              />
            ))}
          </div>
        </AnimatePresence>
      </div>

      {/* Project Player Overlay */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            ref={(el) => {
              playerScrollRef.current = el;
              playerOverlayRef.current = el;
            }}
            role="dialog"
            aria-modal="true"
            aria-label={`Project: ${selectedProject.name}`}
            tabIndex={-1}
            onKeyDown={(e) => handleTrapFocus(e, playerOverlayRef)}
            style={{ outline: 'none' }}
            initial={{ opacity: 0, clipPath: 'inset(2% 2% 2% 2% round 4px)' }}
            animate={{ opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 0px)' }}
            exit={{ opacity: 1, clipPath: 'inset(100% 0% 0% 0% round 0px)' }}
            transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[60] flex flex-col bg-bg overflow-y-auto"
          >
            {/* Underlying player contents become inert when credits dialog is open */}
            <div className="contents" inert={isCreditsOpen ? true : undefined}>
              {/* Mobile Header */}
              <div className='flex md:hidden items-center justify-between p-[8.5px] sticky top-0 z-[80] bg-transparent'>
                {selectedProject.credits && selectedProject.credits.trim() !== '' && (
                  <StrikeButton
                    onClick={handleOpenCredits}
                    className='text-[15.6px] leading-[22px] font-main opacity-75'
                  >
                    Credits
                  </StrikeButton>
                )}
                {(!selectedProject.credits || selectedProject.credits.trim() === '') && <div />}
                <p className='text-[15.6px] leading-[22px] font-heading font-semibold uppercase tracking-[0.08em] absolute left-1/2 -translate-x-1/2 text-ink'>{selectedProject.name}</p>
                <StrikeButton
                  onClick={handleClosePlayer}
                  className='text-[15.6px] leading-[22px] font-main opacity-75'
                >
                  Close
                </StrikeButton>
              </div>

              {/* Desktop Header */}
              <div className='hidden md:flex sticky top-0 z-[80] items-center justify-between p-5 md:p-6 bg-transparent'>
                <div className='flex items-center gap-6'>
                  <StrikeButton
                    ref={playerCloseBtnRef}
                    onClick={handleClosePlayer}
                    className='text-[15.6px] leading-[22px] font-main opacity-75 hover:opacity-100 transition-opacity'
                  >
                    Close
                  </StrikeButton>
                  {selectedProject.credits && selectedProject.credits.trim() !== '' && (
                    <StrikeButton
                      onClick={handleOpenCredits}
                      className='text-[15.6px] leading-[22px] font-main opacity-75 hover:opacity-100 transition-opacity'
                    >
                      Credits
                    </StrikeButton>
                  )}
                </div>
                <div className='absolute left-1/2 -translate-x-1/2 text-center pointer-events-none'>
                  <p className='text-[15.6px] leading-[22px] font-heading font-semibold uppercase tracking-[0.08em] text-ink'>{selectedProject.name}</p>
                </div>
                <div />
              </div>

              {/* Player Body */}
              <div className="flex-1 flex flex-col items-center pt-2 pb-10 px-6 md:px-20 space-y-10">
                <div className='relative w-full max-w-6xl'>
                  {hasPrev && (
                    <StrikeButton
                      onClick={handlePrev}
                      className='hidden md:flex absolute left-[-3.5rem] top-1/2 -translate-y-1/2 text-[15.6px] leading-[22px] font-main opacity-55 hover:opacity-100 transition-opacity'
                    >
                      Prev
                    </StrikeButton>
                  )}

                  <div style={{ width: '100%', maxWidth: '1152px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {hasVideoError ? (
                      <div className="flex flex-col items-center justify-center p-8 md:p-12 border border-white/10 bg-black/60 rounded-sm text-center max-w-lg mx-auto my-12 space-y-4">
                        <p className="text-[13.6px] leading-[19px] font-main opacity-80">Unable to load film</p>
                        <div className="flex items-center gap-6 pt-2">
                          <button
                            onClick={() => {
                              setHasVideoError(false);
                              if (videoRef.current) {
                                videoRef.current.load();
                                videoRef.current.play().catch(() => {});
                              }
                            }}
                            className="text-[13.6px] leading-[19px] font-main px-4 py-1.5 border border-white/20 hover:border-white/60 transition-colors"
                          >
                            Retry
                          </button>
                          <a
                            href={selectedProject.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13.6px] leading-[19px] font-main opacity-70 hover:opacity-100 underline underline-offset-4 transition-opacity"
                          >
                            Open video directly
                          </a>
                        </div>
                      </div>
                    ) : (
                      <video
                        ref={videoRef}
                        key={selectedProject.id}
                        src={selectedProject.videoUrl}
                        poster={getPoster(selectedProject)}
                        controls
                        autoPlay
                        playsInline
                        onError={() => setHasVideoError(true)}
                        style={{
                          width: '100%',
                          maxHeight: '80vh',
                          objectFit: 'contain',
                          background: 'black'
                        }}
                      />
                    )}
                  </div>

                  {selectedProject.laurelUrls && selectedProject.laurelUrls.length > 0 && (
                    <div className='flex items-center justify-center gap-6 pt-6 w-full'>
                      {selectedProject.laurelUrls.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=''
                          aria-hidden='true'
                          className='h-16 md:h-24 w-auto object-contain opacity-60'
                          style={{ filter: 'brightness(0) invert(0.93)' }}
                        />
                      ))}
                    </div>
                  )}

                  <div className='flex md:hidden items-center justify-between w-full px-6 pt-4'>
                    {hasPrev && (
                      <StrikeButton
                        onClick={handlePrev}
                        className='text-[15.6px] leading-[22px] font-main opacity-75'
                      >
                        Prev
                      </StrikeButton>
                    )}
                    {!hasPrev && <div />}
                    {hasNext && (
                      <StrikeButton
                        onClick={handleNext}
                        className='text-[15.6px] leading-[22px] font-main opacity-75'
                      >
                        Next
                      </StrikeButton>
                    )}
                    {!hasNext && <div />}
                  </div>

                  {hasNext && (
                    <StrikeButton
                      onClick={handleNext}
                      className='hidden md:flex absolute right-[-3.5rem] top-1/2 -translate-y-1/2 text-[15.6px] leading-[22px] font-main opacity-55 hover:opacity-100 transition-opacity'
                    >
                      Next
                    </StrikeButton>
                  )}
                </div>

                {selectedProject.stills && (
                  <div className="w-full max-w-6xl space-y-10 pb-20">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedProject.stills.map((still, idx) => (
                        <motion.img
                          key={idx}
                          loading='lazy'
                          src={still}
                          width='800'
                          height='450'
                          alt={`${selectedProject.name} for ${selectedProject.client} — production still ${idx + 1}`}
                          className="w-full aspect-video object-cover bg-white/5"
                          referrerPolicy="no-referrer"
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Credits Overlay */}
            <AnimatePresence>
              {isCreditsOpen && (
                <motion.div
                  ref={creditsOverlayRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Credits for ${selectedProject.name}`}
                  tabIndex={-1}
                  onKeyDown={(e) => handleTrapFocus(e, creditsOverlayRef)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
                  className='fixed inset-0 z-[90] flex items-center justify-center'
                  style={{
                    outline: 'none',
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)'
                  }}
                  onClick={handleCloseCredits}
                >
                  <button
                    ref={creditsCloseBtnRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseCredits();
                    }}
                    className='absolute top-5 left-5 md:top-6 md:left-6 text-[15.6px] leading-[22px] font-main opacity-75 hover:opacity-100 transition-opacity focus:outline-none focus:ring-1 focus:ring-ink/40'
                  >
                    Close
                  </button>
                  <div className='flex flex-col md:hidden w-full px-6 py-10 overflow-y-auto max-h-[80vh]' onClick={(e) => e.stopPropagation()}>
                    <h4 className='text-[10.5px] leading-[12px] uppercase tracking-[0.05em] font-heading font-semibold mb-6 text-ink/50'>Credits</h4>
                    <div className='flex flex-col gap-4'>
                      {selectedProject.credits.split('\n').filter(Boolean).map((line, i) => {
                        const colonIndex = line.indexOf(':');
                        const role = line.substring(0, colonIndex).trim();
                        const name = line.substring(colonIndex + 1).trim();
                        return (
                          <div key={`credit-${i}`} className='flex flex-col gap-0.5'>
                            <span className='text-[10.5px] leading-[12px] uppercase tracking-[0.05em] font-heading font-semibold text-ink/50'>{role}</span>
                            <span className='text-[15.6px] leading-[22px] font-main text-ink/95'>{name}</span>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      className='mt-8 text-[15.6px] leading-[22px] font-main opacity-75 text-left hover:opacity-100 transition-opacity'
                      onClick={handleCloseCredits}
                    >
                      Close
                    </button>
                  </div>

                  <div
                    className='hidden md:block max-w-2xl w-full px-12 py-12 rounded-sm overflow-y-auto max-h-[80vh]'
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h4 className='text-[10.5px] leading-[12px] uppercase tracking-[0.05em] font-heading font-semibold mb-8 text-ink/50'>Credits</h4>
                    <div className='grid gap-y-3' style={{ gridTemplateColumns: '1fr 1fr' }}>
                      {selectedProject.credits.split('\n').filter(Boolean).map((line, i) => {
                        const colonIndex = line.indexOf(':');
                        const role = line.substring(0, colonIndex).trim();
                        const name = line.substring(colonIndex + 1).trim();
                        return (
                          <div key={`credit-${i}`} className="contents">
                            <span className='text-[10.5px] leading-[12px] uppercase tracking-[0.05em] font-heading font-semibold text-ink/50 self-baseline'>{role}</span>
                            <span className='text-[15.6px] leading-[22px] font-main text-ink/95 text-right self-baseline'>{name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About Popup */}
      <AnimatePresence>
        {isAboutOpen && (
          <motion.div
            ref={aboutOverlayRef}
            role="dialog"
            aria-modal="true"
            aria-label="About Janik Rai"
            tabIndex={-1}
            onKeyDown={(e) => handleTrapFocus(e, aboutOverlayRef)}
            style={{ outline: 'none' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-bg/92 backdrop-blur-md"
            onClick={() => navigate('/')}
          >
            {/* Top-Left Close Button matching reference corner padding 8.5px */}
            <button
              ref={(el) => {
                aboutCloseBtnRef.current = el;
                closeButtonRef.current = el;
              }}
              onClick={(e) => {
                e.stopPropagation();
                navigate('/');
              }}
              aria-label="Close Info"
              className="fixed top-5 left-5 md:top-6 md:left-6 z-[90] text-[15.6px] leading-[22px] font-main opacity-60 hover:opacity-100 transition-opacity focus:outline-none focus:ring-1 focus:ring-ink/40 cursor-pointer"
            >
              Close
            </button>

            {/* Main Info Canvas */}
            <div
              className="w-full min-h-screen p-5 md:p-6 pt-20 md:pt-24 pb-16 flex flex-col justify-between flex-1 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex flex-col lg:flex-row items-start justify-start">
                {/* Left Editorial Column - restored to left side */}
                <div className="w-full max-w-xl min-w-0">
                  {/* Mobile Headshot (centred horizontally within Info page content frame with equal space on both sides) */}
                  <div className="lg:hidden mb-6 flex justify-center sm:justify-start w-full">
                    <img
                      src="https://janikrai.b-cdn.net/Favicon/IMG_4092%20(1).jpg"
                      alt="Janik Rai"
                      className="w-[180px] sm:w-[220px] aspect-[3/4] object-cover rounded-sm border border-white/10 shadow-xl select-none"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Biography */}
                  <div className="space-y-3.5">
                    <p className="text-[15.6px] leading-[22px] text-ink/90 font-main font-normal">
                      Janik Rai is a British-Canadian director with South Asian roots. His work balances striking imagery with a raw, human sensibility, combining cinematic composition with a sense of lived reality.
                    </p>

                    {isBioExpanded && (
                      <div id="bio-more-content" className="space-y-3.5 pt-1">
                        <p className="text-[15.6px] leading-[22px] text-ink/90 font-main font-normal">
                          Self-taught, Rai began his filmmaking career in music videos, working with some of the world’s biggest South Asian artists. It was through these early projects that he developed his approach to visual storytelling, which became the foundation of his commercial work.
                        </p>
                        <p className="text-[15.6px] leading-[22px] text-ink/90 font-main font-normal">
                          Across commercials and branded content, his approach begins with what an image can communicate through behaviour, atmosphere and detail. He gives the gestures and interactions that make a moment believable as much attention as the frame itself.
                        </p>
                      </div>
                    )}

                    <div>
                      <button
                        type="button"
                        onClick={() => setIsBioExpanded(!isBioExpanded)}
                        aria-expanded={isBioExpanded}
                        aria-controls="bio-more-content"
                        className="inline-block text-[15.6px] leading-[22px] font-main italic underline underline-offset-4 decoration-ink/40 hover:decoration-ink opacity-70 hover:opacity-100 transition-all cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-ink/40"
                      >
                        {isBioExpanded ? 'Less' : 'More'}
                      </button>
                    </div>
                  </div>

                  {/* Metadata Sections: CONTACT, WORK, REPRESENTATION */}
                  <div className="mt-12 md:mt-16 space-y-6 md:space-y-7">
                    {/* Contact */}
                    <div className="grid grid-cols-[115px_1fr] sm:grid-cols-[145px_1fr] items-baseline gap-2">
                      <span className="text-[10.5px] leading-[12px] font-heading font-semibold uppercase tracking-[0.05em] text-ink/50 select-none">
                        Contact
                      </span>
                      <div className="text-[15.6px] leading-[22px] font-main text-ink/90">
                        <a
                          href="mailto:contact@janikrai.com"
                          className="hover:opacity-60 transition-opacity inline-block"
                        >
                          contact@janikrai.com
                        </a>
                      </div>
                    </div>

                    {/* Work */}
                    <div className="grid grid-cols-[115px_1fr] sm:grid-cols-[145px_1fr] items-baseline gap-2">
                      <span className="text-[10.5px] leading-[12px] font-heading font-semibold uppercase tracking-[0.05em] text-ink/50 select-none">
                        Work
                      </span>
                      <div className="flex flex-col gap-1 text-[15.6px] leading-[22px] font-main text-ink/90">
                        <a
                          href="https://vimeo.com/janikrai"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:opacity-60 transition-opacity inline-block w-fit"
                        >
                          Vimeo
                        </a>
                        <a
                          href="https://www.instagram.com/janikrai"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:opacity-60 transition-opacity inline-block w-fit"
                        >
                          Instagram
                        </a>
                      </div>
                    </div>

                    {/* Representation */}
                    <div className="grid grid-cols-[115px_1fr] sm:grid-cols-[145px_1fr] items-baseline gap-2">
                      <span className="text-[10.5px] leading-[12px] font-heading font-semibold uppercase tracking-[0.05em] text-ink/50 select-none">
                        Representation
                      </span>
                      <div className="text-[15.6px] leading-[22px] font-main text-ink/90">
                        <a
                          href="mailto:holly@alfredofilms.com"
                          className="hover:opacity-60 transition-opacity inline-block"
                        >
                          Alfredo (Canada)
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Desktop Headshot - exactly preserved in current middle-right position and size */}
                <div className="hidden lg:block absolute left-[calc(50%+160px)] xl:left-[calc(50%+180px)] top-20 md:top-24 flex-shrink-0">
                  <div className="w-[220px] xl:w-[250px]">
                    <img
                      src="https://janikrai.b-cdn.net/Favicon/IMG_4092%20(1).jpg"
                      alt="Janik Rai"
                      className="w-full aspect-[3/4] object-cover rounded-sm border border-white/10 shadow-2xl select-none"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Copyright matching reference footer placement */}
              <div className="pt-16 md:pt-20 text-[15.6px] leading-[22px] font-main text-ink/40">
                <p>Janik Rai © All Rights Reserved</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
