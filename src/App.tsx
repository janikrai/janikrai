import React, { useState, useEffect, useRef, useMemo, forwardRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useNavigate, useParams, useLocation, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PROJECTS, CATEGORIES, SELECTED_PROJECT_ORDER, ARCHIVE_PROJECT_ORDER } from './constants';
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

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

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
  const [isStillsOpen, setIsStillsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isHoveringControl, setIsHoveringControl] = useState(false);
  const [isControlsFocused, setIsControlsFocused] = useState(false);
  const [hoveredPrev, setHoveredPrev] = useState(false);
  const [focusedPrev, setFocusedPrev] = useState(false);
  const [hoveredNext, setHoveredNext] = useState(false);
  const [focusedNext, setFocusedNext] = useState(false);

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
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const aboutOverlayRef = useRef<HTMLDivElement>(null);
  const creditsOverlayRef = useRef<HTMLDivElement>(null);
  const selectedLinkRef = useRef<HTMLAnchorElement>(null);
  const [selectedLeft, setSelectedLeft] = useState<number>(0);
  const [infoContentLeft, setInfoContentLeft] = useState<number>(0);

  const preCreditsVolume = useRef<number>(1);
  const savedVolumeRef = useRef<number>(1);
  const wasPlayingRef = useRef<boolean>(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
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

  const filteredProjects = useMemo(() => {
    const order = activeCategory === 'Selected' ? SELECTED_PROJECT_ORDER : ARCHIVE_PROJECT_ORDER;
    return order
      .map(id => PROJECTS.find(p => p.id === id))
      .filter((p): p is Project => Boolean(p));
  }, [activeCategory]);

  const currentIndex = useMemo(
    () => selectedProject ? filteredProjects.findIndex(p => p.id === selectedProject.id) : -1,
    [selectedProject, filteredProjects]
  );
  const totalInCollection = filteredProjects.length;
  const hasMultipleProjects = totalInCollection > 1;

  const prevIndex = useMemo(() => {
    if (!hasMultipleProjects || currentIndex === -1) return -1;
    return (currentIndex - 1 + totalInCollection) % totalInCollection;
  }, [hasMultipleProjects, currentIndex, totalInCollection]);

  const nextIndex = useMemo(() => {
    if (!hasMultipleProjects || currentIndex === -1) return -1;
    return (currentIndex + 1) % totalInCollection;
  }, [hasMultipleProjects, currentIndex, totalInCollection]);

  const prevProject = prevIndex >= 0 ? filteredProjects[prevIndex] : null;
  const nextProject = nextIndex >= 0 ? filteredProjects[nextIndex] : null;
  const hasPrev = Boolean(prevProject);
  const hasNext = Boolean(nextProject);

  const shouldReduceMotion = useReducedMotion();

  // Stop film audio immediately when closing a project, even while its visual closing animation finishes
  useEffect(() => {
    if (!selectedProject && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.muted = true;
      setIsPlaying(false);
    }
  }, [selectedProject]);

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

  // Fullscreen change tracking
  // Fullscreen change tracking across desktop and mobile (including iOS video events)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isDocFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      const isVideoFs = Boolean(videoRef.current && (videoRef.current as any).webkitDisplayingFullscreen);
      setIsFullscreen(isDocFs || isVideoFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    const videoEl = videoRef.current;
    const onVideoFsEnter = () => setIsFullscreen(true);
    const onVideoFsExit = () => setIsFullscreen(false);
    if (videoEl) {
      videoEl.addEventListener('webkitbeginfullscreen', onVideoFsEnter);
      videoEl.addEventListener('webkitendfullscreen', onVideoFsExit);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      if (videoEl) {
        videoEl.removeEventListener('webkitbeginfullscreen', onVideoFsEnter);
        videoEl.removeEventListener('webkitendfullscreen', onVideoFsExit);
      }
    };
  }, [selectedProject?.id]);

  // When switching project in full-film player: unmuted autoplay with fallback
  useEffect(() => {
    setHasVideoError(false);
    setIsCreditsOpen(false);
    setIsStillsOpen(false);
    preCreditsVolume.current = 1;
    setProgress(0);
    setCurrentTime(0);
    setIsControlsVisible(true);
    setIsBuffering(true);

    const video = videoRef.current;
    if (!selectedProject || !video) return;

    video.pause();
    video.currentTime = 0;
    video.volume = savedVolumeRef.current > 0 ? savedVolumeRef.current : 1;
    video.muted = false;
    setIsMuted(false);
    video.load();

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // Autoplay with sound blocked; fallback to muted autoplay
          video.muted = true;
          setIsMuted(true);
          video.play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch(() => {
              // Blocked completely; show visible Play control gracefully
              setIsPlaying(false);
              setIsBuffering(false);
            });
        });
    }

    return () => {
      video.pause();
      video.currentTime = 0;
    };
  }, [selectedProject?.id]);

  // Inactivity timer for fading the entire video interface after 1 second
  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const startInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    const isActuallyPlaying = videoRef.current ? !videoRef.current.paused : isPlaying;
    if (isActuallyPlaying && !isSeeking && !isBuffering && !isControlsFocused && !isCreditsOpen && !isStillsOpen) {
      inactivityTimerRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 1000);
    }
  }, [isPlaying, isSeeking, isBuffering, isControlsFocused, isCreditsOpen, isStillsOpen, clearInactivityTimer]);

  useEffect(() => {
    if (!isPlaying || isBuffering || isSeeking || isControlsFocused || isCreditsOpen || isStillsOpen) {
      setIsControlsVisible(true);
      clearInactivityTimer();
    } else {
      // On desktop/tablet, preserve visibility behavior
      if (isDesktop) {
        startInactivityTimer();
      }
    }
    return () => {
      clearInactivityTimer();
    };
  }, [isPlaying, isBuffering, isSeeking, isControlsFocused, isCreditsOpen, isStillsOpen, isDesktop, clearInactivityTimer, startInactivityTimer]);

  // Window pointermove listener when player is open: any pointer move reveals controls and resets the 1s inactivity countdown
  useEffect(() => {
    if (!selectedProject) return;

    const handlePointerMove = () => {
      setIsControlsVisible(true);
      startInactivityTimer();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [selectedProject, startInactivityTimer]);

  const togglePlay = useCallback((e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleSound = useCallback((e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const video = videoRef.current;
    if (!video) return;
    if (isMuted || video.muted || video.volume === 0) {
      video.muted = false;
      const vol = savedVolumeRef.current > 0 ? savedVolumeRef.current : 1;
      video.volume = vol;
      setIsMuted(false);
      // Ensure playback continues smoothly when unmuted on mobile browsers
      if (video.paused && isPlaying) {
        video.play().catch(() => {});
      }
    } else {
      savedVolumeRef.current = video.volume > 0 ? video.volume : 1;
      video.muted = true;
      setIsMuted(true);
    }
  }, [isMuted, isPlaying]);

  const toggleFullscreen = useCallback((e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const el = playerContainerRef.current;
    const video = videoRef.current;

    const isCurrentlyFullscreen = Boolean(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement ||
      (video && (video as any).webkitDisplayingFullscreen) ||
      isFullscreen
    );

    if (!isCurrentlyFullscreen) {
      // Enter Fullscreen directly from user tap
      if (el && el.requestFullscreen) {
        el.requestFullscreen().catch(() => {
          if (video && (video as any).webkitEnterFullscreen) {
            try {
              (video as any).webkitEnterFullscreen();
            } catch {}
          }
        });
      } else if (el && (el as any).webkitRequestFullscreen) {
        try {
          (el as any).webkitRequestFullscreen();
        } catch {
          if (video && (video as any).webkitEnterFullscreen) {
            try {
              (video as any).webkitEnterFullscreen();
            } catch {}
          }
        }
      } else if (video && (video as any).webkitEnterFullscreen) {
        try {
          (video as any).webkitEnterFullscreen();
        } catch {}
      }
    } else {
      // Exit Fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        try {
          (document as any).webkitExitFullscreen();
        } catch {}
      } else if ((document as any).mozCancelFullScreen) {
        try {
          (document as any).mozCancelFullScreen();
        } catch {}
      } else if ((document as any).msExitFullscreen) {
        try {
          (document as any).msExitFullscreen();
        } catch {}
      }

      if (video && (video as any).webkitExitFullscreen) {
        try {
          (video as any).webkitExitFullscreen();
        } catch {}
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  const handleTimeUpdate = useCallback(() => {
    if (isSeeking || !videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(cur);
    if (dur > 0) {
      setProgress(cur / dur);
      setDuration(dur);
    }
  }, [isSeeking]);

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);
  }, []);

  const activeTimelineElRef = useRef<HTMLDivElement | null>(null);

  const seekToPosition = useCallback((clientX: number, targetEl?: HTMLElement | null) => {
    const el = targetEl || activeTimelineElRef.current || timelineRef.current;
    if (!el || !videoRef.current || !duration) return;
    const rect = el.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const newProgress = rect.width > 0 ? clickX / rect.width : 0;
    setProgress(newProgress);
    const newTime = newProgress * duration;
    setCurrentTime(newTime);
    videoRef.current.currentTime = newTime;
  }, [duration]);

  const handleTimelinePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsSeeking(true);
    const target = e.currentTarget;
    activeTimelineElRef.current = target;
    seekToPosition(e.clientX, target);

    const onPointerMove = (moveEvent: PointerEvent) => {
      seekToPosition(moveEvent.clientX, target);
    };

    const onPointerUp = () => {
      setIsSeeking(false);
      activeTimelineElRef.current = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [seekToPosition]);

  const handleTimelineKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    let newTime = currentTime;
    if (e.key === 'ArrowLeft') {
      newTime = Math.max(0, currentTime - 5);
    } else if (e.key === 'ArrowRight') {
      newTime = Math.min(duration, currentTime + 5);
    } else if (e.key === 'Home') {
      newTime = 0;
    } else if (e.key === 'End') {
      newTime = duration;
    } else {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(newTime / duration);
  }, [currentTime, duration]);

  const handleOpenProjectInfo = useCallback((e?: React.MouseEvent<HTMLElement>) => {
    creditsTriggerRef.current = e?.currentTarget || null;
    setIsCreditsOpen(true);
  }, []);

  const handleCloseProjectInfo = useCallback(() => {
    setIsCreditsOpen(false);
    creditsTriggerRef.current?.focus();
  }, []);

  const handleOpenStills = useCallback(() => {
    setIsStillsOpen(true);
  }, []);

  const handleCloseStills = useCallback(() => {
    setIsStillsOpen(false);
  }, []);

  const handleGoHome = useCallback(() => {
    clearInactivityTimer();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.muted = true;
      videoRef.current.currentTime = 0;
    }
    setIsCreditsOpen(false);
    setIsStillsOpen(false);
    setIsPlaying(false);
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
    navigate('/');
  }, [clearInactivityTimer, navigate]);

  const handleClosePlayer = useCallback((e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    clearInactivityTimer();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.muted = true;
      videoRef.current.currentTime = 0;
    }
    setIsCreditsOpen(false);
    setIsStillsOpen(false);
    setIsPlaying(false);
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
    const targetRoute = cameFrom === '/archive' ? '/archive' : '/';
    navigate(targetRoute);
  }, [clearInactivityTimer, cameFrom, navigate]);

  const handlePrev = useCallback(() => {
    clearInactivityTimer();
    handleCloseProjectInfo();
    setIsStillsOpen(false);
    if (!prevProject) return;
    if (videoRef.current) {
      videoRef.current.pause();
    }
    navigate(`/work/${prevProject.id}`, { state: { from: cameFrom || (activeCategory === 'Archive' ? '/archive' : '/') } });
  }, [clearInactivityTimer, handleCloseProjectInfo, prevProject, navigate, cameFrom, activeCategory]);

  const handleNext = useCallback(() => {
    clearInactivityTimer();
    handleCloseProjectInfo();
    setIsStillsOpen(false);
    if (!nextProject) return;
    if (videoRef.current) {
      videoRef.current.pause();
    }
    navigate(`/work/${nextProject.id}`, { state: { from: cameFrom || (activeCategory === 'Archive' ? '/archive' : '/') } });
  }, [clearInactivityTimer, handleCloseProjectInfo, nextProject, navigate, cameFrom, activeCategory]);

  const handleSurfaceClick = useCallback(() => {
    if (isCreditsOpen || isStillsOpen) return;
    if (!isControlsVisible) {
      setIsControlsVisible(true);
      if (videoRef.current ? !videoRef.current.paused : isPlaying) {
        startInactivityTimer();
      }
      return;
    }
    togglePlay();
  }, [isCreditsOpen, isStillsOpen, isControlsVisible, isPlaying, startInactivityTimer, togglePlay]);

  // Keyboard navigation, Space to play/pause, and Escape hierarchy
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement
      );
      if (isInput) return;

      if (e.key === 'Escape') {
        if (isCreditsOpen) {
          e.preventDefault();
          handleCloseProjectInfo();
          return;
        }
        if (isStillsOpen) {
          e.preventDefault();
          handleCloseStills();
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

      // Space key for play/pause when in player and not on interactive element
      if (selectedProject && (e.key === ' ' || e.code === 'Space')) {
        const isInteractive = activeEl && (
          activeEl.tagName === 'BUTTON' ||
          activeEl.tagName === 'A' ||
          activeEl.getAttribute('role') === 'slider'
        );
        if (!isInteractive && !isCreditsOpen && !isStillsOpen) {
          e.preventDefault();
          togglePlay();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isCreditsOpen,
    isStillsOpen,
    selectedProject,
    isAboutOpen,
    navigate,
    handleCloseProjectInfo,
    handleCloseStills,
    handleClosePlayer,
    togglePlay,
  ]);

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
            <meta name="description" content="British-Canadian commercial director balancing striking imagery with a raw, human sensibility. Cinematic composition grounded in lived reality." />
            <meta property="og:title" content="Janik Rai — Commercial Director" />
            <meta property="og:description" content="British-Canadian commercial director balancing striking imagery with a raw, human sensibility. Cinematic composition grounded in lived reality." />
            <meta property="og:image" content="https://janikrai.b-cdn.net/Favicon/images.png" />
            <meta property="og:image:width" content="414" />
            <meta property="og:image:height" content="414" />
            <meta property="og:url" content="https://janikrai.com" />
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="Janik Rai — Commercial Director" />
            <meta name="twitter:description" content="British-Canadian commercial director balancing striking imagery with a raw, human sensibility. Cinematic composition grounded in lived reality." />
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
            <span
              style={{ filter: 'blur(0.5px)' }}
              className="font-heading text-[15.6px] sm:text-[16px] md:text-[17px] font-semibold uppercase tracking-[0.06em] text-ink/90 group-hover:text-ink transition-transform duration-[450ms] [transition-timing-function:cubic-bezier(0.5,0.25,0,1)] group-hover:translate-x-6 sm:group-hover:translate-x-10 group-focus-visible:translate-x-6 sm:group-focus-visible:translate-x-10 motion-reduce:transform-none motion-reduce:transition-none whitespace-nowrap will-change-transform"
            >
              Janik
            </span>
            <span
              style={{ filter: 'blur(0.5px)' }}
              className="font-heading text-[15.6px] sm:text-[16px] md:text-[17px] font-semibold uppercase tracking-[0.06em] text-ink/90 group-hover:text-ink transition-transform duration-[450ms] [transition-timing-function:cubic-bezier(0.5,0.25,0,1)] group-hover:-translate-x-6 sm:group-hover:-translate-x-10 group-focus-visible:-translate-x-6 sm:group-focus-visible:-translate-x-10 motion-reduce:transform-none motion-reduce:transition-none whitespace-nowrap will-change-transform"
            >
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
                isAboutOpen ? 'pointer-events-none' : 'opacity-100'
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
                isAboutOpen ? 'pointer-events-none' : 'opacity-100'
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
                      className={`absolute inset-0 flex flex-col items-center justify-end px-8 pb-16 sm:pb-20 text-inherit no-underline focus:outline-none focus:ring-1 focus:ring-ink/40 transition-opacity duration-300 ${
                        isAboutOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
                      }`}
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
              {!hasSwipedOnce && !isAboutOpen && (
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
              poster={getPoster(activeTeaser)}
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

      {/* Project Video Player Overlay (Full-Viewport Presentation & Reference Controls) */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            ref={(el) => {
              playerOverlayRef.current = el;
              playerContainerRef.current = el;
            }}
            role="dialog"
            aria-modal="true"
            aria-label={`Project film: ${selectedProject.name}`}
            tabIndex={-1}
            onKeyDown={(e) => handleTrapFocus(e, playerOverlayRef)}
            onPointerMove={startInactivityTimer}
            onClick={handleSurfaceClick}
            style={{ outline: 'none' }}
            initial={shouldReduceMotion ? { opacity: 0 } : { clipPath: 'inset(0% 50% 0% 50%)' }}
            animate={shouldReduceMotion ? { opacity: 1 } : { clipPath: 'inset(0% 0% 0% 0%)' }}
            exit={shouldReduceMotion ? { opacity: 0 } : { clipPath: 'inset(0% 50% 0% 50%)' }}
            transition={
              shouldReduceMotion
                ? { duration: 0.2, ease: 'easeOut' }
                : { duration: 0.65, ease: [0.5, 0.25, 0, 1] }
            }
            onAnimationStart={() => {
              if (!selectedProject && videoRef.current) {
                videoRef.current.pause();
                videoRef.current.muted = true;
                setIsPlaying(false);
              }
            }}
            className={`fixed inset-0 z-[60] flex items-center justify-center bg-black overflow-hidden select-none ${
              !isControlsVisible && isPlaying ? 'cursor-none' : 'cursor-default'
            }`}
          >
            {/* Full-Viewport Video Player (Preserves aspect ratio with letterboxing, never cropped) */}
            <div className="absolute inset-0 flex items-center justify-center w-full h-full pointer-events-none">
              <video
                ref={videoRef}
                key={selectedProject.id}
                src={selectedProject.videoUrl}
                poster={getPoster(selectedProject)}
                playsInline
                preload="auto"
                onPlay={() => setIsPlaying(true)}
                onPlaying={() => {
                  setIsPlaying(true);
                  setIsBuffering(false);
                  startInactivityTimer();
                }}
                onWaiting={() => {
                  setIsBuffering(true);
                  clearInactivityTimer();
                  setIsControlsVisible(true);
                }}
                onLoadStart={() => {
                  setIsBuffering(true);
                  clearInactivityTimer();
                  setIsControlsVisible(true);
                }}
                onSeeking={() => {
                  clearInactivityTimer();
                  setIsControlsVisible(true);
                }}
                onSeeked={() => {
                  if (videoRef.current ? !videoRef.current.paused : isPlaying) {
                    startInactivityTimer();
                  }
                }}
                onPause={() => {
                  setIsPlaying(false);
                  clearInactivityTimer();
                  setIsControlsVisible(true);
                }}
                onEnded={() => {
                  setIsPlaying(false);
                  clearInactivityTimer();
                  setIsControlsVisible(true);
                }}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onError={() => {
                  setHasVideoError(true);
                  setIsBuffering(false);
                  clearInactivityTimer();
                  setIsControlsVisible(true);
                }}
                className={`w-full h-full ${isFullscreen ? 'object-contain' : 'object-cover'} pointer-events-none select-none bg-black`}
              />
            </div>

            {/* Blocked Autoplay / Video Error Fallback */}
            {hasVideoError && (
              <div
                className="relative z-50 flex flex-col items-center justify-center p-8 md:p-10 border border-white/10 bg-black/85 rounded-sm text-center max-w-lg mx-auto space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-[15.6px] leading-[22px] font-main text-ink/80">Unable to load film</p>
                <div className="flex items-center gap-6 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHasVideoError(false);
                      if (videoRef.current) {
                        videoRef.current.load();
                        videoRef.current.play().catch(() => {});
                      }
                    }}
                    className="text-[15.6px] leading-[22px] font-main px-4 py-1.5 border border-white/20 hover:border-white/60 transition-colors cursor-pointer"
                  >
                    Retry
                  </button>
                  <a
                    href={selectedProject.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[15.6px] leading-[22px] font-main opacity-70 hover:opacity-100 underline underline-offset-4 transition-opacity"
                  >
                    Open video directly
                  </a>
                </div>
              </div>
            )}

            {/* Desktop Header: Navigation on left, Centred Title, Fixed Info/Stills/Close on right */}
            <header
              onClick={(e) => e.stopPropagation()}
              className={`hidden md:flex fixed top-0 left-0 right-0 z-[70] p-5 md:p-6 items-baseline justify-between select-none bg-gradient-to-b from-black/50 via-black/15 to-transparent transition-opacity duration-300 ease-out ${
                isControlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Corner Navigation: Info, Home, Archive at 50% opacity */}
              <nav aria-label="Main Navigation" className="flex items-baseline gap-10 sm:gap-14 md:gap-16">
                <Link
                  to="/info"
                  onClick={() => {
                    if (videoRef.current) videoRef.current.pause();
                  }}
                  className="font-main text-[15.6px] leading-[22px] opacity-50 hover:opacity-100 focus-visible:opacity-100 transition-opacity no-underline text-inherit focus:outline-none focus-visible:underline underline-offset-4"
                >
                  Info
                </Link>
                <button
                  type="button"
                  onClick={handleGoHome}
                  aria-label="Return to homepage"
                  className="font-main text-[15.6px] leading-[22px] opacity-50 hover:opacity-100 focus-visible:opacity-100 transition-opacity text-inherit cursor-pointer focus:outline-none focus-visible:underline underline-offset-4"
                >
                  Home
                </button>
                <Link
                  to="/archive"
                  onClick={() => {
                    if (videoRef.current) videoRef.current.pause();
                  }}
                  className="font-main text-[15.6px] leading-[22px] opacity-50 hover:opacity-100 focus-visible:opacity-100 transition-opacity no-underline text-inherit focus:outline-none focus-visible:underline underline-offset-4"
                >
                  Archive
                </Link>
              </nav>

              {/* Viewport-Centred Project Title (Clickable, opening Project Info/Credits) */}
              <div className="absolute left-1/2 -translate-x-1/2 top-5 md:top-6 pointer-events-auto flex items-center justify-center max-w-[42vw] text-center">
                <button
                  type="button"
                  onClick={handleOpenProjectInfo}
                  aria-label={`View info and credits for ${selectedProject.name}`}
                  className="font-main text-[15.6px] leading-[22px] text-ink opacity-90 hover:opacity-50 focus-visible:opacity-100 transition-opacity cursor-pointer truncate focus:outline-none focus-visible:underline underline-offset-4"
                >
                  {selectedProject.name}, {selectedProject.client}
                </button>
              </div>

              {/* Project Details: Fixed Positions (Position 1: Info, Position 2: Stills) */}
              <div className="flex items-baseline gap-6 sm:gap-8 md:gap-10 text-ink">
                {selectedProject.year && (
                  <span className="font-main text-[15.6px] leading-[22px] text-ink opacity-75 hidden lg:inline">
                    {selectedProject.year}
                  </span>
                )}

                {/* Position 1: Info Position (Video playing -> Info) */}
                <div className="w-[48px] text-right inline-flex justify-end">
                  <button
                    ref={playerCloseBtnRef}
                    type="button"
                    onClick={handleOpenProjectInfo}
                    aria-label="View project info and credits"
                    className="font-main text-[15.6px] leading-[22px] text-ink hover:opacity-50 transition-opacity focus:outline-none focus-visible:underline underline-offset-4 cursor-pointer"
                  >
                    Info
                  </button>
                </div>

                {/* Position 2: Stills Position (Video playing -> Stills) */}
                {selectedProject.stills && selectedProject.stills.length > 0 && (
                  <div className="w-[50px] text-right inline-flex justify-end">
                    <button
                      type="button"
                      onClick={handleOpenStills}
                      aria-label="View project stills"
                      className="font-main text-[15.6px] leading-[22px] text-ink hover:opacity-50 transition-opacity focus:outline-none focus-visible:underline underline-offset-4 cursor-pointer"
                    >
                      Stills
                    </button>
                  </div>
                )}
              </div>
            </header>

            {/* Mobile Header: 2-line title/client on left (clickable), Fixed Info & Stills on right */}
            <header
              onClick={(e) => e.stopPropagation()}
              inert={isCreditsOpen || isStillsOpen ? true : undefined}
              aria-hidden={isCreditsOpen || isStillsOpen ? true : undefined}
              className={`flex md:hidden fixed top-0 left-0 right-0 z-[70] p-6 pt-12 items-start justify-between select-none bg-gradient-to-b from-black/60 via-black/20 to-transparent transition-opacity duration-300 ease-out ${
                isControlsVisible && !isCreditsOpen && !isStillsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            >
              <button
                type="button"
                onClick={handleOpenProjectInfo}
                aria-label={`View info and credits for ${selectedProject.name}`}
                className="flex flex-col text-left max-w-[62%] cursor-pointer focus:outline-none focus-visible:underline underline-offset-4"
              >
                <span className="font-main text-[15.6px] leading-[20px] text-ink truncate">
                  {selectedProject.name},
                </span>
                <span className="font-main text-[15.6px] leading-[20px] text-ink truncate">
                  {selectedProject.client}
                </span>
              </button>

              <div className="flex items-baseline gap-6 text-ink">
                {/* Position 1: Info */}
                <div className="w-[44px] text-right inline-flex justify-end">
                  <button
                    type="button"
                    onClick={handleOpenProjectInfo}
                    aria-label="View project info"
                    className="font-main text-[15.6px] leading-[20px] text-ink hover:opacity-50 transition-opacity focus:outline-none focus-visible:underline underline-offset-4 cursor-pointer"
                  >
                    Info
                  </button>
                </div>

                {/* Position 2: Stills */}
                {selectedProject.stills && selectedProject.stills.length > 0 && (
                  <div className="w-[46px] text-right inline-flex justify-end">
                    <button
                      type="button"
                      onClick={handleOpenStills}
                      aria-label="View project stills"
                      className="font-main text-[15.6px] leading-[20px] text-ink hover:opacity-50 transition-opacity focus:outline-none focus-visible:underline underline-offset-4 cursor-pointer"
                    >
                      Stills
                    </button>
                  </div>
                )}
              </div>
            </header>

            {/* Desktop Central Playback Controls: Shared Grid with Explicit Control Groups & Flexible Timeline */}
            <div
              className={`hidden md:flex fixed top-1/2 left-0 right-0 -translate-y-1/2 z-50 pointer-events-none transition-opacity duration-300 ease-out motion-reduce:transition-none ${
                isControlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full px-5 md:px-6 items-center grid grid-cols-[1fr_auto_1fr] pointer-events-none"
              >
                {/* Left Control Group: Compact Navigation Pair (Previous + Next), Play */}
                <div className="flex items-center justify-between w-full max-w-[500px] lg:max-w-[560px] xl:max-w-[620px] justify-self-start pl-[20px] sm:pl-[28px] md:pl-[36px] pr-8 lg:pr-14 xl:pr-16">
                  {/* Compact Navigation Pair: Previous & Next with ~30% further reduced gap */}
                  <div className="flex items-center gap-[50px] lg:gap-[60px] xl:gap-[68px]">
                    {/* Previous Film */}
                    <div className="pointer-events-auto relative inline-flex flex-col items-center">
                      <button
                        type="button"
                        onClick={handlePrev}
                        onMouseEnter={() => setHoveredPrev(true)}
                        onMouseLeave={() => setHoveredPrev(false)}
                        onFocus={() => {
                          setFocusedPrev(true);
                          setIsControlsFocused(true);
                        }}
                        onBlur={() => {
                          setFocusedPrev(false);
                          setIsControlsFocused(false);
                        }}
                        aria-label={prevProject ? `Previous project: ${prevProject.name}` : 'Previous project'}
                        className={`font-main text-[15.6px] leading-[22px] transition-opacity duration-200 focus:outline-none focus-visible:underline underline-offset-4 cursor-pointer select-none ${
                          hoveredPrev || focusedPrev
                            ? 'opacity-40 text-ink'
                            : 'opacity-85 hover:opacity-40 text-ink'
                        }`}
                      >
                        Previous
                      </button>
                      {prevProject && (
                        <div
                          className={`absolute top-full left-1/2 -translate-x-1/2 pt-1 pointer-events-none whitespace-nowrap transition-opacity duration-200 ${
                            hoveredPrev || focusedPrev ? 'opacity-100' : 'opacity-0'
                          }`}
                        >
                          <span className="font-main text-[12px] leading-[16px] text-ink/80">
                            {prevProject.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Next Film */}
                    <div className="pointer-events-auto relative inline-flex flex-col items-center">
                      <button
                        type="button"
                        onClick={handleNext}
                        onMouseEnter={() => setHoveredNext(true)}
                        onMouseLeave={() => setHoveredNext(false)}
                        onFocus={() => {
                          setFocusedNext(true);
                          setIsControlsFocused(true);
                        }}
                        onBlur={() => {
                          setFocusedNext(false);
                          setIsControlsFocused(false);
                        }}
                        aria-label={nextProject ? `Next project: ${nextProject.name}` : 'Next project'}
                        className={`font-main text-[15.6px] leading-[22px] transition-opacity duration-200 focus:outline-none focus-visible:underline underline-offset-4 cursor-pointer select-none ${
                          hoveredNext || focusedNext
                            ? 'opacity-40 text-ink'
                            : 'opacity-85 hover:opacity-40 text-ink'
                        }`}
                      >
                        Next
                      </button>
                      {nextProject && (
                        <div
                          className={`absolute top-full left-1/2 -translate-x-1/2 pt-1 pointer-events-none whitespace-nowrap transition-opacity duration-200 ${
                            hoveredNext || focusedNext ? 'opacity-100' : 'opacity-0'
                          }`}
                        >
                          <span className="font-main text-[12px] leading-[16px] text-ink/80">
                            {nextProject.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Play / Pause Toggle */}
                  <button
                    type="button"
                    onClick={togglePlay}
                    onFocus={() => setIsControlsFocused(true)}
                    onBlur={() => setIsControlsFocused(false)}
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                    className="pointer-events-auto font-main text-[15.6px] leading-[22px] text-ink opacity-85 hover:opacity-40 transition-opacity focus:outline-none focus-visible:underline underline-offset-4 cursor-pointer select-none"
                  >
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                </div>

                {/* Center Control Group: Flexible Timeline Scrubber */}
                <div className="pointer-events-auto w-[22vw] min-w-[200px] max-w-[340px] flex items-center justify-center">
                  <div
                    ref={timelineRef}
                    role="slider"
                    aria-label="Playback timeline"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(duration) || 100}
                    aria-valuenow={Math.round(currentTime)}
                    aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
                    tabIndex={0}
                    onPointerDown={handleTimelinePointerDown}
                    onKeyDown={handleTimelineKeyDown}
                    onFocus={() => setIsControlsFocused(true)}
                    onBlur={() => setIsControlsFocused(false)}
                    className="w-full relative flex items-center h-8 cursor-pointer select-none group focus:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
                  >
                    {/* Horizontal Track Line */}
                    <div className="w-full h-[1px] bg-white/35 relative group-hover:bg-white/50 transition-colors">
                      {/* Elapsed Progress Line */}
                      <div
                        className="absolute top-0 left-0 h-[1px] bg-white"
                        style={{ width: `${progress * 100}%` }}
                      />
                      {/* Vertical Tick Playhead */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-[1.5px] h-[14px] bg-white pointer-events-none transition-transform duration-75"
                        style={{ left: `calc(${progress * 100}% - 0.75px)` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Control Group: Sound, Fullscreen */}
                <div className="flex items-center justify-between w-full max-w-[320px] lg:max-w-[380px] xl:max-w-[420px] justify-self-end pl-8 lg:pl-14 xl:pl-16 pr-[20px] sm:pr-[28px] md:pr-[36px]">
                  {/* Sound Toggle */}
                  <button
                    type="button"
                    onClick={toggleSound}
                    onFocus={() => setIsControlsFocused(true)}
                    onBlur={() => setIsControlsFocused(false)}
                    aria-label={isMuted ? 'Turn on sound' : 'Mute sound'}
                    className={`pointer-events-auto font-main text-[15.6px] leading-[22px] text-ink transition-opacity focus:outline-none focus-visible:underline underline-offset-4 cursor-pointer select-none ${
                      isMuted ? 'opacity-40 hover:opacity-80' : 'opacity-85 hover:opacity-40'
                    }`}
                  >
                    Sound
                  </button>

                  {/* Fullscreen Toggle */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    onFocus={() => setIsControlsFocused(true)}
                    onBlur={() => setIsControlsFocused(false)}
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    className="pointer-events-auto font-main text-[15.6px] leading-[22px] text-ink opacity-85 hover:opacity-40 transition-opacity focus:outline-none focus-visible:underline underline-offset-4 cursor-pointer select-none whitespace-nowrap"
                  >
                    Fullscreen
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Playback Controls & Navigation: 3-tier bottom layout matching Alexis Gómez reference IMG_4343 */}
            <div
              inert={isCreditsOpen || isStillsOpen ? true : undefined}
              aria-hidden={isCreditsOpen || isStillsOpen ? true : undefined}
              style={{
                paddingLeft: 'max(1.5rem, env(safe-area-inset-left, 0px))',
                paddingRight: 'max(1.5rem, env(safe-area-inset-right, 0px))',
                paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))'
              }}
              className={`flex md:hidden fixed bottom-0 left-0 right-0 z-[70] px-6 pb-8 sm:pb-10 pt-4 pointer-events-none transition-opacity duration-300 ease-out motion-reduce:transition-none ${
                isCreditsOpen || isStillsOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-none'
              }`}
            >
              <div className="flex flex-col w-full select-none pointer-events-none">
                {/* Auto-Hiding Playback Controls: Tier 1 (Play, Sound, Fullscreen) & Tier 2 (Timeline Scrubber) */}
                <div
                  inert={!isControlsVisible || isCreditsOpen || isStillsOpen ? true : undefined}
                  aria-hidden={!isControlsVisible || isCreditsOpen || isStillsOpen ? true : undefined}
                  className={`flex flex-col w-full transition-opacity duration-300 ease-out motion-reduce:transition-none pointer-events-none ${
                    isControlsVisible && !isCreditsOpen && !isStillsOpen
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none'
                  }`}
                >
                  {/* Tier 1: Pause/Play (left), Sound & Fullscreen (right, sharing column anchors with Previous & Next) */}
                  <div className="flex items-baseline justify-between w-full mb-3 pointer-events-auto">
                    {/* Play / Pause Toggle */}
                    <div className="text-left flex items-baseline">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay(e);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-label={isPlaying ? 'Pause video' : 'Play video'}
                        className="pointer-events-auto font-main text-[15.6px] leading-[22px] text-ink opacity-90 hover:opacity-50 transition-opacity cursor-pointer focus:outline-none focus-visible:underline underline-offset-4 -m-3 p-3 inline-flex items-center select-none"
                      >
                        {isPlaying ? 'Pause' : 'Play'}
                      </button>
                    </div>

                    {/* Right-aligned Navigation Group: Sound (Col 2) & Fullscreen (Col 3) sharing column anchors with Previous & Next */}
                    <div className="flex items-baseline justify-end gap-[18px]">
                      {/* Column 2 Anchor: Sound (left-aligned directly above Previous) */}
                      <div className="flex items-baseline justify-start min-w-[62px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSound(e);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          aria-label={isMuted ? 'Turn on sound' : 'Mute sound'}
                          className={`pointer-events-auto font-main text-[15.6px] leading-[22px] text-ink transition-opacity cursor-pointer focus:outline-none focus-visible:underline underline-offset-4 -my-3 py-3 -ml-3 pl-3 pr-2 -mr-2 inline-flex items-center justify-start select-none ${
                            isMuted ? 'opacity-40' : 'opacity-90 hover:opacity-50'
                          }`}
                        >
                          Sound
                        </button>
                      </div>

                      {/* Column 3 Anchor: Fullscreen (aligned directly above Next) */}
                      <div className="flex items-baseline justify-end min-w-[72px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFullscreen(e);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                          className="pointer-events-auto font-main text-[15.6px] leading-[22px] text-ink opacity-90 hover:opacity-50 transition-opacity cursor-pointer focus:outline-none focus-visible:underline underline-offset-4 -my-3 py-3 pl-2 -ml-2 -mr-3 pr-3 inline-flex items-center justify-end select-none whitespace-nowrap"
                        >
                          Fullscreen
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tier 2: Full-width Timeline Scrubber */}
                  <div
                    role="slider"
                    aria-label="Playback timeline"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(duration) || 100}
                    aria-valuenow={Math.round(currentTime)}
                    aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
                    tabIndex={0}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      handleTimelinePointerDown(e);
                    }}
                    onKeyDown={handleTimelineKeyDown}
                    className="w-full relative flex items-center h-6 cursor-pointer select-none mb-3 focus:outline-none pointer-events-auto"
                  >
                    <div className="w-full h-[1px] bg-white/40 relative">
                      <div
                        className="absolute top-0 left-0 h-[1px] bg-white"
                        style={{ width: `${progress * 100}%` }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-[1.5px] h-[14px] bg-white pointer-events-none"
                        style={{ left: `calc(${progress * 100}% - 0.75px)` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Persistent Navigation: Tier 3 (Back left-aligned, Previous & Next grouped in right-aligned flex container) */}
                <div className="flex items-baseline justify-between w-full pointer-events-auto">
                  {/* Back Button */}
                  <div className="text-left flex items-baseline">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClosePlayer(e);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      aria-label="Back to project list"
                      className="pointer-events-auto font-main text-[15.6px] leading-[22px] text-ink opacity-90 hover:opacity-50 transition-opacity cursor-pointer focus:outline-none focus-visible:underline underline-offset-4 -m-3 p-3 inline-flex items-center select-none"
                    >
                      Back
                    </button>
                  </div>

                  {/* Right-aligned Navigation Group: Previous (Col 2) & Next (Col 3) sharing column anchors with Sound & Fullscreen */}
                  <div className="flex items-baseline justify-end gap-[18px]">
                    {/* Column 2 Anchor: Previous (left-aligned to column anchor) */}
                    <div className="flex items-baseline justify-start min-w-[62px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrev();
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-label={prevProject ? `Previous project: ${prevProject.name}` : 'Previous project'}
                        className="pointer-events-auto font-main text-[15.6px] leading-[22px] text-ink opacity-90 hover:opacity-50 transition-opacity cursor-pointer focus:outline-none focus-visible:underline underline-offset-4 -my-3 py-3 -ml-3 pl-3 pr-2 -mr-2 inline-flex items-center justify-start select-none whitespace-nowrap"
                      >
                        Previous
                      </button>
                    </div>

                    {/* Column 3 Anchor: Next (aligned directly below Fullscreen) */}
                    <div className="flex items-baseline justify-end min-w-[72px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNext();
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-label={nextProject ? `Next project: ${nextProject.name}` : 'Next project'}
                        className="pointer-events-auto font-main text-[15.6px] leading-[22px] text-ink opacity-90 hover:opacity-50 transition-opacity cursor-pointer focus:outline-none focus-visible:underline underline-offset-4 -my-3 py-3 pl-2 -ml-2 -mr-3 pr-3 inline-flex items-center justify-end select-none whitespace-nowrap"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Project Stills Overlay */}
            <AnimatePresence>
              {isStillsOpen && selectedProject.stills && (
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Production stills for ${selectedProject.name}`}
                  tabIndex={-1}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.76, 0, 0.24, 1] }}
                  className="fixed inset-0 z-[95] flex flex-col bg-white/80 backdrop-blur-[2px] text-neutral-900 overflow-y-auto"
                  onClick={handleCloseStills}
                >
                  {/* Header Bar matching Reference with transparent background */}
                  <header
                    onClick={(e) => e.stopPropagation()}
                    className="fixed top-0 left-0 right-0 z-10 p-6 pt-12 md:p-6 flex items-baseline justify-between select-none bg-transparent"
                  >
                    {/* Corner Navigation: Info, Home, Archive at 50% opacity (Hidden on mobile) */}
                    <nav aria-label="Main Navigation" className="hidden md:flex items-baseline gap-10 sm:gap-14 md:gap-16">
                      <Link
                        to="/info"
                        onClick={() => {
                          if (videoRef.current) videoRef.current.pause();
                        }}
                        className="font-main text-[15.6px] leading-[22px] text-neutral-900 opacity-50 hover:opacity-100 focus-visible:opacity-100 transition-opacity no-underline focus:outline-none focus-visible:underline underline-offset-4"
                      >
                        Info
                      </Link>
                      <button
                        type="button"
                        onClick={handleGoHome}
                        aria-label="Return to homepage"
                        className="font-main text-[15.6px] leading-[22px] text-neutral-900 opacity-50 hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer focus:outline-none focus-visible:underline underline-offset-4"
                      >
                        Home
                      </button>
                      <Link
                        to="/archive"
                        onClick={() => {
                          if (videoRef.current) videoRef.current.pause();
                        }}
                        className="font-main text-[15.6px] leading-[22px] text-neutral-900 opacity-50 hover:opacity-100 focus-visible:opacity-100 transition-opacity no-underline focus:outline-none focus-visible:underline underline-offset-4"
                      >
                        Archive
                      </Link>
                    </nav>

                    {/* Viewport-Centred Project Title (Clickable, opening Project Info/Credits - Desktop/Tablet only) */}
                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-5 md:top-6 pointer-events-auto items-center justify-center max-w-[42vw] text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsStillsOpen(false);
                          handleOpenProjectInfo();
                        }}
                        aria-label={`View info and credits for ${selectedProject.name}`}
                        className="font-main text-[15.6px] leading-[22px] text-neutral-900 opacity-90 hover:opacity-50 focus-visible:opacity-100 transition-opacity cursor-pointer truncate focus:outline-none focus-visible:underline underline-offset-4"
                      >
                        {selectedProject.name}, {selectedProject.client}
                      </button>
                    </div>

                    {/* Project Details: Fixed Positions (Position 1: Info, Position 2: Video) */}
                    <div className="flex items-baseline gap-6 sm:gap-8 md:gap-10 text-neutral-900 ml-auto md:ml-0">
                      {selectedProject.year && (
                        <span className="font-main text-[15.6px] leading-[22px] hidden lg:inline opacity-75">
                          {selectedProject.year}
                        </span>
                      )}

                      {/* Position 1: Info Position (Stills open -> Info: switches directly to Project Info) */}
                      <div className="w-[44px] sm:w-[48px] text-right inline-flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setIsStillsOpen(false);
                            handleOpenProjectInfo();
                          }}
                          aria-label="View project info and credits"
                          className="font-main text-[15.6px] leading-[22px] text-neutral-900 hover:opacity-50 transition-opacity focus:outline-none focus-visible:underline underline-offset-4 cursor-pointer"
                        >
                          Info
                        </button>
                      </div>

                      {/* Position 2: Stills Position (Stills open -> Video: returns to film without restarting) */}
                      <div className="w-[46px] sm:w-[50px] text-right inline-flex justify-end">
                        <button
                          type="button"
                          onClick={handleCloseStills}
                          aria-label="Return to video"
                          className="font-main text-[15.6px] leading-[22px] text-neutral-900 hover:opacity-50 transition-opacity focus:outline-none focus-visible:underline underline-offset-4 cursor-pointer"
                        >
                          Video
                        </button>
                      </div>
                    </div>
                  </header>


                  {/* Stills Vertical Stack */}
                  <div
                    className="w-full flex-1 max-w-3xl lg:max-w-4xl mx-auto px-6 sm:px-8 pt-24 md:pt-28 pb-24 flex flex-col items-center gap-16 md:gap-24"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {selectedProject.stills.map((still, idx) => (
                      <div key={idx} className="w-full flex justify-center">
                        <img
                          src={still}
                          alt={`${selectedProject.name} production still ${idx + 1}`}
                          loading={idx === 0 ? 'eager' : 'lazy'}
                          className="w-full h-auto object-contain select-none"
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Project Info & Credits Overlay */}
            <AnimatePresence>
              {isCreditsOpen && (
                <motion.div
                  ref={creditsOverlayRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Info and credits for ${selectedProject.name}`}
                  tabIndex={-1}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.76, 0, 0.24, 1] }}
                  className="fixed inset-0 z-[95] flex flex-col bg-white/80 backdrop-blur-[2px] text-neutral-900 overflow-y-auto"
                  onClick={handleCloseProjectInfo}
                >
                  {/* Header Bar matching Reference with transparent background */}
                  <header
                    onClick={(e) => e.stopPropagation()}
                    className="fixed top-0 left-0 right-0 z-10 p-6 pt-12 md:p-6 flex items-baseline justify-between select-none bg-transparent"
                  >
                    {/* Corner Navigation: Info, Home, Archive at 50% opacity (Hidden on mobile) */}
                    <nav aria-label="Main Navigation" className="hidden md:flex items-baseline gap-10 sm:gap-14 md:gap-16">
                      <Link
                        to="/info"
                        onClick={() => {
                          if (videoRef.current) videoRef.current.pause();
                        }}
                        className="font-main text-[15.6px] leading-[22px] text-neutral-900 opacity-50 hover:opacity-100 focus-visible:opacity-100 transition-opacity no-underline focus:outline-none focus-visible:underline underline-offset-4"
                      >
                        Info
                      </Link>
                      <button
                        type="button"
                        onClick={handleGoHome}
                        aria-label="Return to homepage"
                        className="font-main text-[15.6px] leading-[22px] text-neutral-900 opacity-50 hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer focus:outline-none focus-visible:underline underline-offset-4"
                      >
                        Home
                      </button>
                      <Link
                        to="/archive"
                        onClick={() => {
                          if (videoRef.current) videoRef.current.pause();
                        }}
                        className="font-main text-[15.6px] leading-[22px] text-neutral-900 opacity-50 hover:opacity-100 focus-visible:opacity-100 transition-opacity no-underline focus:outline-none focus-visible:underline underline-offset-4"
                      >
                        Archive
                      </Link>
                    </nav>

                    {/* Viewport-Centred Project Title (Desktop/Tablet only) */}
                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-5 md:top-6 pointer-events-auto items-center justify-center max-w-[42vw] text-center">
                      <span className="font-main text-[15.6px] leading-[22px] text-neutral-900 opacity-90 truncate">
                        {selectedProject.name}, {selectedProject.client}
                      </span>
                    </div>

                    {/* Project Details: Fixed Positions (Position 1: Video, Position 2: Stills) */}
                    <div className="flex items-baseline gap-6 sm:gap-8 md:gap-10 text-neutral-900 ml-auto md:ml-0">
                      {selectedProject.year && (
                        <span className="font-main text-[15.6px] leading-[22px] hidden lg:inline opacity-75">
                          {selectedProject.year}
                        </span>
                      )}

                      {/* Position 1: Info Position (Project Info open -> Video: returns to film without restarting) */}
                      <div className="w-[44px] sm:w-[48px] text-right inline-flex justify-end">
                        <button
                          ref={creditsCloseBtnRef}
                          type="button"
                          onClick={handleCloseProjectInfo}
                          aria-label="Return to video"
                          className="font-main text-[15.6px] leading-[22px] text-neutral-900 hover:opacity-50 transition-opacity focus:outline-none focus-visible:underline underline-offset-4 cursor-pointer"
                        >
                          Video
                        </button>
                      </div>

                      {/* Position 2: Stills Position (Project Info open -> Stills: switches directly to Stills) */}
                      {selectedProject.stills && selectedProject.stills.length > 0 && (
                        <div className="w-[46px] sm:w-[50px] text-right inline-flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreditsOpen(false);
                              handleOpenStills();
                            }}
                            aria-label="View project stills"
                            className="font-main text-[15.6px] leading-[22px] text-neutral-900 hover:opacity-50 transition-opacity focus:outline-none focus-visible:underline underline-offset-4 cursor-pointer"
                          >
                            Stills
                          </button>
                        </div>
                      )}
                    </div>
                  </header>


                  {/* Content Layout: Left half completely clear, right half starting at 50% screen center */}
                  <div
                    className="w-full flex-1 max-w-[1440px] mx-auto px-6 md:px-12 pt-24 pb-20 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Left column is empty to match Reference */}
                    <div
                      className="hidden md:block cursor-pointer h-full"
                      onClick={handleCloseProjectInfo}
                      aria-hidden="true"
                    />

                    {/* Right column holds the synopsis / client presentation, laurels, and credits */}
                    <div className="space-y-8 md:space-y-10">
                      <div>
                        <p className="font-main text-[15.6px] leading-[22px] text-neutral-900/90 max-w-xl">
                          {selectedProject.name} for {selectedProject.client}.
                        </p>
                      </div>

                      {selectedProject.laurelUrls && selectedProject.laurelUrls.length > 0 && (
                        <div className="flex gap-4 items-center flex-wrap pt-1">
                          {selectedProject.laurelUrls.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt=""
                              aria-hidden="true"
                              className="h-14 w-auto object-contain opacity-85"
                              style={{ filter: 'brightness(0)' }}
                            />
                          ))}
                        </div>
                      )}

                      {selectedProject.credits && selectedProject.credits.trim() !== '' && (
                        <div className="pt-2">
                          <p className="text-[10.5px] leading-[12px] uppercase tracking-[0.05em] font-heading font-semibold text-neutral-500 mb-5">
                            CREDITS
                          </p>
                          <div className="space-y-1.5 max-w-xl">
                            {selectedProject.credits.split('\n').filter(Boolean).map((line, i) => {
                              const colonIndex = line.indexOf(':');
                              if (colonIndex === -1) {
                                return (
                                  <p key={i} className="text-[15.6px] leading-[22px] font-main text-neutral-900">
                                    {line}
                                  </p>
                                );
                              }
                              const role = line.substring(0, colonIndex).trim();
                              const name = line.substring(colonIndex + 1).trim();
                              return (
                                <div key={i} className="grid grid-cols-[130px_1fr] sm:grid-cols-[170px_1fr] gap-x-4 items-baseline">
                                  <span className="font-main text-[15.6px] leading-[22px] text-neutral-500">
                                    {role}
                                  </span>
                                  <span className="font-main text-[15.6px] leading-[22px] text-neutral-900">
                                    {name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
            initial={shouldReduceMotion ? { opacity: 0 } : { clipPath: 'inset(0% 50% 0% 50%)' }}
            animate={shouldReduceMotion ? { opacity: 1 } : { clipPath: 'inset(0% 0% 0% 0%)' }}
            exit={shouldReduceMotion ? { opacity: 0 } : { clipPath: 'inset(0% 50% 0% 50%)' }}
            transition={
              shouldReduceMotion
                ? { duration: 0.2, ease: 'easeOut' }
                : { duration: 0.65, ease: [0.5, 0.25, 0, 1] }
            }
            className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-white/80 backdrop-blur-[2px] text-neutral-800"
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
              className="fixed top-5 left-5 md:top-6 md:left-6 z-[90] text-[15.6px] leading-[22px] font-main text-neutral-800 hover:text-neutral-500 opacity-80 hover:opacity-100 transition-opacity focus:outline-none focus-visible:underline underline-offset-4 cursor-pointer"
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
                      className="w-[180px] sm:w-[220px] aspect-[3/4] object-cover select-none"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Biography */}
                  <div className="space-y-3.5">
                    <p className="text-[15.6px] leading-[22px] text-neutral-800 font-main font-normal">
                      Janik Rai is a British-Canadian director with South Asian roots. His work balances striking imagery with a raw, human sensibility, combining cinematic composition with a sense of lived reality.
                    </p>

                    {isBioExpanded && (
                      <div id="bio-more-content" className="space-y-3.5 pt-1">
                        <p className="text-[15.6px] leading-[22px] text-neutral-800 font-main font-normal">
                          Self-taught, Rai began his filmmaking career in music videos, working with some of the world’s biggest South Asian artists. It was through these early projects that he developed his approach to visual storytelling, which became the foundation of his commercial work.
                        </p>
                        <p className="text-[15.6px] leading-[22px] text-neutral-800 font-main font-normal">
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
                        className="inline-block text-[15.6px] leading-[22px] font-main italic underline underline-offset-4 decoration-neutral-400 hover:decoration-neutral-800 text-neutral-800 hover:text-neutral-950 transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-800"
                      >
                        {isBioExpanded ? 'Less' : 'More'}
                      </button>
                    </div>
                  </div>

                  {/* Metadata Sections: CONTACT, WORK, REPRESENTATION */}
                  <div className="mt-12 md:mt-16 space-y-6 md:space-y-7">
                    {/* Contact */}
                    <div className="grid grid-cols-[115px_1fr] sm:grid-cols-[145px_1fr] items-baseline gap-2">
                      <span className="text-[10.5px] leading-[12px] font-heading font-semibold uppercase tracking-[0.05em] text-neutral-500 select-none">
                        Contact
                      </span>
                      <div className="text-[15.6px] leading-[22px] font-main text-neutral-800">
                        <a
                          href="mailto:contact@janikrai.com"
                          className="hover:text-neutral-500 transition-colors inline-block"
                        >
                          contact@janikrai.com
                        </a>
                      </div>
                    </div>

                    {/* Work */}
                    <div className="grid grid-cols-[115px_1fr] sm:grid-cols-[145px_1fr] items-baseline gap-2">
                      <span className="text-[10.5px] leading-[12px] font-heading font-semibold uppercase tracking-[0.05em] text-neutral-500 select-none">
                        Work
                      </span>
                      <div className="flex flex-col gap-1 text-[15.6px] leading-[22px] font-main text-neutral-800">
                        <a
                          href="https://vimeo.com/janikrai"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-neutral-500 transition-colors inline-block w-fit"
                        >
                          Vimeo
                        </a>
                        <a
                          href="https://www.instagram.com/janikrai"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-neutral-500 transition-colors inline-block w-fit"
                        >
                          Instagram
                        </a>
                      </div>
                    </div>

                    {/* Representation */}
                    <div className="grid grid-cols-[115px_1fr] sm:grid-cols-[145px_1fr] items-baseline gap-2">
                      <span className="text-[10.5px] leading-[12px] font-heading font-semibold uppercase tracking-[0.05em] text-neutral-500 select-none">
                        Representation
                      </span>
                      <div className="flex flex-col gap-1 text-[15.6px] leading-[22px] font-main text-neutral-800">
                        <a
                          href="mailto:holly@alfredofilms.com"
                          className="hover:text-neutral-500 transition-colors inline-block w-fit"
                        >
                          Alfredo (Canada)
                        </a>
                        <a
                          href="mailto:amanda@mistnoir.tv"
                          className="hover:text-neutral-500 transition-colors inline-block w-fit"
                        >
                          Mist Noir (UAE)
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
                      className="w-full aspect-[3/4] object-cover select-none"
                      referrerPolicy="no-referrer"
                    />
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
