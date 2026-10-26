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
        <p className='text-[11px] uppercase tracking-[0.2em] opacity-75 leading-none mb-1'>{project.client}</p>
        <h3 className='text-[13px] uppercase tracking-[0.1em] font-bold leading-tight font-display'>{project.name}</h3>
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
      {/* Desktop Nav */}
      <nav
        inert={isOverlayOpen ? true : undefined}
        className={`fixed top-0 left-0 z-[80] w-full px-6 md:px-10 py-4 md:py-6 bg-transparent transition-opacity duration-300 hidden md:flex ${
          selectedProject ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="flex items-start justify-between w-full">
          {/* Categories */}
          <div className='flex gap-6 lg:gap-10'>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                to={cat === 'Archive' ? '/archive' : '/'}
                className={`text-[19px] lg:text-[22px] font-bold uppercase tracking-widest transition-opacity hover:opacity-100 ${
                  !isAboutOpen && activeCategory === cat ? 'opacity-100' : 'opacity-55'
                }`}
              >
                {cat}
              </Link>
            ))}
            {isAboutOpen ? (
              <StrikeButton
                ref={closeButtonRef}
                onClick={() => navigate('/')}
                className='text-[19px] lg:text-[22px] font-bold uppercase tracking-widest opacity-55 hover:opacity-100 transition-opacity'
              >
                Close
              </StrikeButton>
            ) : (
              <Link
                to="/info"
                className='text-[19px] lg:text-[22px] font-bold uppercase tracking-widest opacity-55 hover:opacity-100 transition-opacity'
              >
                Info
              </Link>
            )}
          </div>

          {/* Name */}
          <div className='absolute left-1/2 -translate-x-1/2 hidden md:block'>
            <div className="group flex flex-col items-center">
              <Link to='/' className='text-[22px] lg:text-[26px] font-bold uppercase tracking-[0.05em]'>
                Janik Rai
              </Link>
              <p className='text-[11px] lg:text-[13px] uppercase tracking-[0.3em] opacity-0 -translate-y-1 group-hover:opacity-85 group-hover:translate-y-0 transition-all duration-300 pointer-events-none'>
                Director
              </p>
            </div>
          </div>

          {/* Spacer */}
          <div className='min-w-[4rem] flex justify-end' />
        </div>
      </nav>

      {/* Mobile Nav */}
      <div
        inert={isOverlayOpen ? true : undefined}
        className={`fixed top-0 left-0 right-0 z-[80] flex md:hidden flex-col items-center pt-4 pb-3 bg-transparent transition-opacity duration-300 ${
          isAboutOpen || selectedProject ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <Link
          to='/'
          className='text-[19px] font-bold uppercase tracking-[0.3em] mb-4 text-inherit no-underline'
        >
          Janik Rai
        </Link>
        <div className='flex items-center gap-8'>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              to={cat === 'Archive' ? '/archive' : '/'}
              className={`text-[16px] uppercase tracking-widest transition-opacity text-inherit no-underline ${
                activeCategory === cat ? 'opacity-100 font-bold' : 'opacity-55'
              }`}
            >
              {cat}
            </Link>
          ))}
          <Link
            to='/info'
            className='text-[16px] uppercase tracking-widest opacity-55 text-inherit no-underline'
          >
            Info
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main
        inert={isOverlayOpen ? true : undefined}
        style={{ paddingTop: '13vh' }}
        className="relative z-10 flex min-h-screen items-start justify-start p-6 md:p-10 pb-36 md:pb-40"
      >
        {/* Desktop Project List */}
        <div className="hidden md:block w-full max-w-2xl text-left">
          <div className={`space-y-0 transition-opacity duration-300 ${isAboutOpen ? 'opacity-0' : 'opacity-100'}`}>
            {filteredProjects.map((project, index) => (
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
                className="group flex cursor-pointer items-baseline justify-start gap-4 py-0 transition-colors no-underline text-inherit focus:outline-none focus:ring-1 focus:ring-ink/40"
              >
                <div className="grid items-baseline leading-snug w-full gap-2 lg:gap-4" style={{ gridTemplateColumns: '2.5rem minmax(11rem, 20rem) 1.5rem 1fr' }}>
                  <span className={`text-[16px] font-mono transition-all duration-300 ${
                    hoveredProject?.id === project.id 
                      ? 'text-ink/75 line-through decoration-ink/75 decoration-[3px]' 
                      : 'text-ink/65'
                  }`}>
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  
                  <h2 className={`text-[19px] lg:text-[22px] uppercase tracking-[0.1em] font-display truncate transition-all duration-300 ${
                    hoveredProject?.id === project.id
                      ? 'text-ink font-bold'
                      : 'text-ink/75 group-hover:text-ink/85 font-bold'
                  }`}>
                    {project.name}
                  </h2>

                  <span 
                    className={`text-[19px] font-bold transition-opacity duration-300 ${
                      hoveredProject?.id === project.id ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{ fontWeight: 900 }}
                    aria-hidden="true"
                  >
                    <svg width='14' height='10' viewBox='0 0 14 10' fill='none' xmlns='http://www.w3.org/2000/svg' style={{ display: 'inline-block' }}>
                      <path d='M1 5H13M13 5L9 1M13 5L9 9' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/>
                    </svg>
                  </span>

                  <span className={`text-[15px] lg:text-[17px] uppercase tracking-[0.1em] truncate transition-all duration-300 ${
                    hoveredProject?.id === project.id 
                      ? 'text-ink/75' 
                      : 'text-ink/65 group-hover:text-ink/85'
                  }`}>
                    {project.client}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile Project Browsing */}
        <div className="md:hidden">
          {activeCategory === 'Archive' ? (
            <div 
              className={`fixed inset-0 overflow-y-auto z-10 px-3 pt-24 pb-12 transition-opacity duration-300 ${
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
                      className='absolute inset-0 flex flex-col items-center justify-center px-8 text-inherit no-underline focus:outline-none focus:ring-1 focus:ring-ink/40'
                      aria-label={`View project: ${project.name}`}
                    >
                      <p className='text-[13px] uppercase tracking-[0.3em] opacity-50 mb-3'>{project.client}</p>
                      <h2 className='text-2xl uppercase tracking-[0.15em] font-bold text-center font-display'>
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
              <div className='flex md:hidden items-center justify-between p-6 sticky top-0 z-[80]'>
                {selectedProject.credits && selectedProject.credits.trim() !== '' && (
                  <StrikeButton
                    onClick={handleOpenCredits}
                    className='text-[15px] uppercase tracking-widest opacity-75'
                  >
                    Credits
                  </StrikeButton>
                )}
                {(!selectedProject.credits || selectedProject.credits.trim() === '') && <div />}
                <p className='text-[15px] uppercase tracking-[0.2em] font-bold absolute left-1/2 -translate-x-1/2 font-display'>{selectedProject.name}</p>
                <StrikeButton
                  onClick={handleClosePlayer}
                  className='text-[15px] uppercase tracking-widest opacity-75'
                >
                  Close
                </StrikeButton>
              </div>

              {/* Desktop Header */}
              <div className='hidden md:flex sticky top-0 z-[80] items-center justify-between p-6 md:p-10 bg-transparent'>
                <div className='flex items-center gap-10'>
                  <StrikeButton
                    ref={playerCloseBtnRef}
                    onClick={handleClosePlayer}
                    className='text-[22px] font-bold uppercase tracking-widest opacity-75 hover:opacity-100 transition-opacity'
                  >
                    Close
                  </StrikeButton>
                  {selectedProject.credits && selectedProject.credits.trim() !== '' && (
                    <StrikeButton
                      onClick={handleOpenCredits}
                      className='text-[22px] font-bold uppercase tracking-widest opacity-75 hover:opacity-100 transition-opacity'
                    >
                      Credits
                    </StrikeButton>
                  )}
                </div>
                <div className='absolute left-1/2 -translate-x-1/2 text-center pointer-events-none'>
                  <p className='text-[22px] uppercase tracking-[0.2em] font-bold font-display'>{selectedProject.name}</p>
                </div>
                <div />
              </div>

              {/* Player Body */}
              <div className="flex-1 flex flex-col items-center pt-2 pb-10 px-6 md:px-20 space-y-10">
                <div className='relative w-full max-w-6xl'>
                  {hasPrev && (
                    <StrikeButton
                      onClick={handlePrev}
                      className='hidden md:flex absolute left-[-4rem] top-1/2 -translate-y-1/2 text-[20px] font-bold uppercase tracking-widest opacity-55 hover:opacity-100 transition-opacity'
                    >
                      Prev
                    </StrikeButton>
                  )}

                  <div style={{ width: '100%', maxWidth: '1152px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {hasVideoError ? (
                      <div className="flex flex-col items-center justify-center p-8 md:p-12 border border-white/10 bg-black/60 rounded-sm text-center max-w-lg mx-auto my-12 space-y-4">
                        <p className="text-[13px] uppercase tracking-[0.2em] opacity-80 font-mono">Unable to load film</p>
                        <div className="flex items-center gap-6 pt-2">
                          <button
                            onClick={() => {
                              setHasVideoError(false);
                              if (videoRef.current) {
                                videoRef.current.load();
                                videoRef.current.play().catch(() => {});
                              }
                            }}
                            className="text-[12px] uppercase tracking-widest px-4 py-2 border border-white/20 hover:border-white/60 transition-colors"
                          >
                            Retry
                          </button>
                          <a
                            href={selectedProject.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] uppercase tracking-widest opacity-70 hover:opacity-100 underline underline-offset-4 transition-opacity"
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
                        className='text-[15px] uppercase tracking-widest opacity-75'
                      >
                        Prev
                      </StrikeButton>
                    )}
                    {!hasPrev && <div />}
                    {hasNext && (
                      <StrikeButton
                        onClick={handleNext}
                        className='text-[15px] uppercase tracking-widest opacity-75'
                      >
                        Next
                      </StrikeButton>
                    )}
                    {!hasNext && <div />}
                  </div>

                  {hasNext && (
                    <StrikeButton
                      onClick={handleNext}
                      className='hidden md:flex absolute right-[-4rem] top-1/2 -translate-y-1/2 text-[20px] font-bold uppercase tracking-widest opacity-55 hover:opacity-100 transition-opacity'
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
                    className='absolute top-6 left-6 md:top-10 md:left-10 text-[16px] md:text-[20px] uppercase tracking-widest opacity-75 hover:opacity-100 transition-opacity focus:outline-none focus:ring-1 focus:ring-ink/40'
                  >
                    Close
                  </button>
                  <div className='flex flex-col md:hidden w-full px-6 py-10 overflow-y-auto max-h-[80vh]' onClick={(e) => e.stopPropagation()}>
                    <h4 className='text-[16px] uppercase tracking-[0.5em] font-bold mb-8 font-display'>Credits</h4>
                    <div className='flex flex-col gap-5'>
                      {selectedProject.credits.split('\n').filter(Boolean).map((line, i) => {
                        const colonIndex = line.indexOf(':');
                        const role = line.substring(0, colonIndex).trim();
                        const name = line.substring(colonIndex + 1).trim();
                        return (
                          <div key={`credit-${i}`} className='flex flex-col gap-1'>
                            <span className='text-[12px] uppercase tracking-[0.2em] opacity-80'>{role}</span>
                            <span className='text-[14px] uppercase tracking-[0.15em] font-bold opacity-100'>{name}</span>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      className='mt-10 text-[14px] uppercase tracking-widest opacity-75 text-left hover:opacity-100 transition-opacity'
                      onClick={handleCloseCredits}
                    >
                      Close
                    </button>
                  </div>

                  <div
                    className='hidden md:block max-w-3xl w-full px-16 py-14 rounded-sm overflow-y-auto max-h-[80vh]'
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h4 className='text-[22px] uppercase tracking-[0.5em] font-bold mb-12 font-display'>Credits</h4>
                    <div className='grid gap-y-4' style={{ gridTemplateColumns: '1fr 1fr' }}>
                      {selectedProject.credits.split('\n').filter(Boolean).map((line, i) => {
                        const colonIndex = line.indexOf(':');
                        const role = line.substring(0, colonIndex).trim();
                        const name = line.substring(colonIndex + 1).trim();
                        return (
                          <div key={`credit-${i}`} className="contents">
                            <span className='text-[18px] uppercase tracking-[0.15em] opacity-85 font-normal'>{role}</span>
                            <span className='text-[18px] uppercase tracking-[0.15em] opacity-100 font-bold text-right'>{name}</span>
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
            className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto lg:items-start lg:justify-start lg:pt-[15vh] lg:px-10 bg-bg/85 backdrop-blur-sm"
            onClick={() => navigate('/')}
          >
            <button
              ref={aboutCloseBtnRef}
              onClick={(e) => {
                e.stopPropagation();
                navigate('/');
              }}
              className='flex md:hidden fixed top-6 right-6 text-[16px] uppercase tracking-widest opacity-75 hover:opacity-100 transition-opacity focus:outline-none focus:ring-1 focus:ring-ink/40'
            >
              Close
            </button>
            <div className='w-full px-6 pt-24 pb-12 flex flex-col gap-10 lg:hidden' onClick={(e) => e.stopPropagation()}>
              <div className='w-full flex justify-center mb-2'>
                <img
                  src="https://janikrai.b-cdn.net/Favicon/IMG_4092%20(1).jpg"
                  alt="Janik Rai"
                  className="w-full max-w-[280px] aspect-[3/4] object-cover rounded-sm select-none pointer-events-none"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className='flex flex-col gap-4'>
                <h4 className='text-[17px] uppercase tracking-[0.5em] opacity-80 font-bold'>Bio</h4>
                <div className='flex flex-col gap-6 text-[15px] uppercase tracking-[0.15em] leading-loose opacity-100 typewriter-bio'>
                  <p className="typewriter-bio">Janik Rai is a British-Canadian director with South Asian roots. His work balances striking imagery with a raw, human sensibility, combining cinematic composition with a sense of lived reality.</p>
                  {isBioExpanded && (
                    <div id="bio-more-mobile" className="flex flex-col gap-6">
                      <p className="typewriter-bio">Self-taught, Rai began his filmmaking career in music videos, working with some of the world’s biggest South Asian artists. It was through these early projects that he developed his approach to visual storytelling, which became the foundation of his commercial work.</p>
                      <p className="typewriter-bio">Across commercials and branded content, his approach begins with what an image can communicate through behaviour, atmosphere and detail. He gives the gestures and interactions that make a moment believable as much attention as the frame itself.</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsBioExpanded(!isBioExpanded)}
                    aria-expanded={isBioExpanded}
                    aria-controls="bio-more-mobile"
                    className="typewriter-bio text-[13px] uppercase tracking-[0.2em] underline underline-offset-4 decoration-ink/40 hover:decoration-ink opacity-70 hover:opacity-100 transition-all cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-ink/40 w-fit"
                  >
                    {isBioExpanded ? 'Less' : 'More'}
                  </button>
                </div>
              </div>
              <div className='flex flex-col gap-4'>
                <h4 className='text-[17px] uppercase tracking-[0.5em] opacity-80 font-bold'>Representation</h4>
                <div className='flex flex-col gap-2 text-[15px] uppercase tracking-[0.2em] typewriter-bio'>
                  <span className='opacity-80'>Canada</span>
                  <a
                    href='mailto:holly@alfredofilms.com'
                    className='opacity-100 hover:opacity-60 transition-opacity typewriter-bio leading-relaxed'
                  >
                    Alfredo Films<br />
                    Holly Rowden
                  </a>
                </div>
              </div>
              <div className='flex flex-col gap-4'>
                <h4 className='text-[17px] uppercase tracking-[0.5em] opacity-80 font-bold'>Contact</h4>
                <a href='mailto:contact@janikrai.com' className='text-[15px] uppercase tracking-[0.2em] opacity-100 hover:opacity-60 transition-opacity typewriter-bio'>contact@janikrai.com</a>
                <div className='flex items-center gap-6'>
                  <a href='https://vimeo.com/janikrai' target='_blank' rel='noopener noreferrer' aria-label="Janik Rai on Vimeo" className='opacity-100 hover:opacity-60 transition-opacity'>
                    <svg aria-hidden="true" width='18' height='18' viewBox='0 0 24 24' fill='currentColor'><path d='M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.087 3.479-3.131C5.002 2.764 6.166 2.125 6.912 2.056c1.735-.168 2.899 1.021 3.437 3.505.584 2.718.991 4.407 1.234 5.088.686 1.92 1.437 2.882 2.197 2.882.686 0 1.704-.861 3.063-2.617 1.339-1.736 2.054-3.054 2.093-3.926.084-1.485-.435-2.223-1.573-2.223-.568 0-1.151.131-1.768.393 1.167-3.831 3.411-5.691 6.703-5.619 2.351.066 3.454 1.585 3.279 4.177z'/></svg>
                  </a>
                  <a href='https://www.instagram.com/janikrai' target='_blank' rel='noopener noreferrer' aria-label="Janik Rai on Instagram" className='opacity-100 hover:opacity-60 transition-opacity'>
                    <svg aria-hidden="true" width='18' height='18' viewBox='0 0 24 24' fill='currentColor'><path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z'/></svg>
                  </a>
                </div>
              </div>
            </div>

            <div
              className='hidden lg:flex flex-row items-start pb-20 w-full max-w-[1400px]'
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex-shrink-0 animate-fade-in"
                style={{
                  width: infoContentLeft > 80 ? `${Math.min(300, infoContentLeft - 80)}px` : '260px',
                  marginRight: '40px'
                }}
              >
                <img
                  src="https://janikrai.b-cdn.net/Favicon/IMG_4092%20(1).jpg"
                  alt="Janik Rai"
                  className="w-full aspect-[3/4] object-cover rounded-sm select-none pointer-events-none"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className='flex flex-col gap-8 flex-1 min-w-0'>
                <div className='flex flex-col gap-8 max-w-[60rem] pr-6 lg:pr-10'>
                  <h4 className='text-[16px] uppercase tracking-[0.5em] opacity-40 font-bold'>Bio</h4>
                  <div className='flex flex-col gap-6 text-[16px] uppercase tracking-[0.2em] leading-loose typewriter-bio'>
                    <p className='typewriter-bio'>Janik Rai is a British-Canadian director with South Asian roots. His work balances striking imagery with a raw, human sensibility, combining cinematic composition with a sense of lived reality.</p>
                    {isBioExpanded && (
                      <div id="bio-more-desktop" className="flex flex-col gap-6">
                        <p className='typewriter-bio'>Self-taught, Rai began his filmmaking career in music videos, working with some of the world’s biggest South Asian artists. It was through these early projects that he developed his approach to visual storytelling, which became the foundation of his commercial work.</p>
                        <p className='typewriter-bio'>Across commercials and branded content, his approach begins with what an image can communicate through behaviour, atmosphere and detail. He gives the gestures and interactions that make a moment believable as much attention as the frame itself.</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsBioExpanded(!isBioExpanded)}
                      aria-expanded={isBioExpanded}
                      aria-controls="bio-more-desktop"
                      className="typewriter-bio text-[13px] lg:text-[14px] uppercase tracking-[0.2em] underline underline-offset-4 decoration-ink/40 hover:decoration-ink opacity-70 hover:opacity-100 transition-all cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-ink/40 w-fit"
                    >
                      {isBioExpanded ? 'Less' : 'More'}
                    </button>
                  </div>
                </div>

                <div className='flex flex-col gap-6'>
                  <h4 className='text-[16px] uppercase tracking-[0.5em] opacity-40 font-bold'>Representation</h4>
                  <div className='flex flex-col gap-2 text-[16px] uppercase tracking-[0.2em] typewriter-bio'>
                    <span className='opacity-80'>Canada</span>
                    <a
                      href='mailto:holly@alfredofilms.com'
                      className='typewriter-bio hover:opacity-60 transition-opacity leading-relaxed'
                    >
                      Alfredo Films<br />
                      Holly Rowden
                    </a>
                  </div>
                </div>

                <div className='flex flex-col gap-6'>
                  <h4 className='text-[16px] uppercase tracking-[0.5em] opacity-40 font-bold'>Contact</h4>
                  <div className='flex flex-col gap-5'>
                    <a href='mailto:contact@janikrai.com' className='text-[16px] uppercase tracking-[0.2em] typewriter-bio hover:opacity-60 transition-opacity'>contact@janikrai.com</a>
                    <div className='flex items-center gap-6'>
                      <a href='https://vimeo.com/janikrai' target='_blank' rel='noopener noreferrer' aria-label="Janik Rai on Vimeo" className='opacity-100 hover:opacity-60 transition-opacity'>
                        <svg aria-hidden="true" width='18' height='18' viewBox='0 0 24 24' fill='currentColor'><path d='M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.087 3.479-3.131C5.002 2.764 6.166 2.125 6.912 2.056c1.735-.168 2.899 1.021 3.437 3.505.584 2.718.991 4.407 1.234 5.088.686 1.92 1.437 2.882 2.197 2.882.686 0 1.704-.861 3.063-2.617 1.339-1.736 2.054-3.054 2.093-3.926.084-1.485-.435-2.223-1.573-2.223-.568 0-1.151.131-1.768.393 1.167-3.831 3.411-5.691 6.703-5.619 2.351.066 3.454 1.585 3.279 4.177z'/></svg>
                      </a>
                      <a href='https://www.instagram.com/janikrai' target='_blank' rel='noopener noreferrer' aria-label="Janik Rai on Instagram" className='opacity-100 hover:opacity-60 transition-opacity'>
                        <svg aria-hidden="true" width='18' height='18' viewBox='0 0 24 24' fill='currentColor'><path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z'/></svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
