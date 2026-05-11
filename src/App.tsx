import { useState, useEffect, useRef, useMemo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams, useLocation, Routes, Route, Navigate } from 'react-router-dom';
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

function ArchiveTile({ project, handleProjectClick, observer }: { project: Project, handleProjectClick: (p: Project) => void, observer: IntersectionObserver | null }) {
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const currentVideo = videoRef.current;
    if (currentVideo && observer) {
      observer.observe(currentVideo);
    }
    return () => {
      if (currentVideo && observer) {
        observer.unobserve(currentVideo);
      }
    };
  }, [observer]);

  const handlePlayState = () => {
    setIsVideoReady(true);
    if (videoRef.current?.dataset.inView === 'true') {
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleProjectClick(project); } }}
      className='relative aspect-video cursor-pointer overflow-hidden'
      onClick={() => handleProjectClick(project)}
    >
      <img
        src={project.stills?.[0] ?? project.teaserUrl}
        alt={project.name}
        className='absolute inset-0 w-full h-full object-cover'
      />
      <video
        ref={videoRef}
        src={project.teaserUrl}
        poster={project.stills?.[0] ?? ''}
        muted
        loop
        playsInline
        preload="none"
        onCanPlay={handlePlayState}
        onWaiting={() => {}}
        onPlaying={() => setIsVideoReady(true)}
        className='absolute inset-0 w-full h-full object-cover transition-opacity duration-700'
        style={{ opacity: isVideoReady ? 1 : 0 }}
      />
      <div className='absolute inset-0 bg-black/55' />
      <div className='absolute inset-0 flex flex-col items-start justify-end p-2'>
        <p className='text-[11px] uppercase tracking-[0.2em] opacity-75 leading-none mb-1'>{project.client}</p>
        <h3 className='text-[13px] uppercase tracking-[0.1em] font-bold leading-tight font-display'>{project.name}</h3>
      </div>
    </div>
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

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [infoContentLeft, setInfoContentLeft] = useState<number>(0);

  const preCreditsVolume = useRef<number>(1);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const activeCategory: Category = location.pathname === '/archive' ? 'Archive' : 'Selected';
  const isAboutOpen = location.pathname === '/info';
  const selectedProject = useMemo(() => PROJECTS.find(p => p.id === projectId) || null, [projectId]);

  const filteredProjects = useMemo(
    () => PROJECTS.filter(p => p.tags.includes(activeCategory)),
    [activeCategory]
  );

  const currentIndex = useMemo(() => selectedProject ? filteredProjects.findIndex(p => p.id === selectedProject.id) : -1, [selectedProject, filteredProjects]);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < filteredProjects.length - 1;

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
  const archiveContainerRef = useRef<HTMLDivElement>(null);
  const [archiveObserver, setArchiveObserver] = useState<IntersectionObserver | null>(null);

  useEffect(() => {
    if (activeCategory !== 'Archive') {
      setArchiveObserver(null);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.dataset.inView = 'true';
            video.preload = "auto";
            video.play().catch(() => {});
          } else {
            video.dataset.inView = 'false';
            video.pause();
          }
        });
      },
      { 
        root: archiveContainerRef.current,
        rootMargin: '200px' 
      }
    );
    setArchiveObserver(observer);
    return () => observer.disconnect();
  }, [activeCategory]);

  useEffect(() => {
    const refs = [bgVideoRef0, bgVideoRef1];
    const nextIndex = activeBgIndex === 0 ? 1 : 0;
    const nextVideo = refs[nextIndex].current;
    if (nextVideo) {
      nextVideo.src = activeTeaser.teaserUrl;
      nextVideo.poster = getPoster(activeTeaser);
      nextVideo.load();
      nextVideo.play().catch(() => {});
    }
    const timer = setTimeout(() => setActiveBgIndex(nextIndex), 150);
    return () => clearTimeout(timer);
  }, [activeTeaser]);

  useEffect(() => {
    const preloadedVideos: HTMLVideoElement[] = [];
    PROJECTS.filter(p => p.tags.includes('Selected')).forEach(project => {
      if (project.teaserUrl) {
        const video = document.createElement('video');
        video.src = project.teaserUrl;
        video.preload = 'auto';
        video.muted = true;
        video.load();
        preloadedVideos.push(video);
      }
    });
    return () => {
      preloadedVideos.forEach(v => {
        v.src = '';
        v.load();
      });
    };
  }, []);

  useEffect(() => {
    setMobileIndex(0);
    setHasSwipedOnce(false);
  }, [activeCategory]);

  useEffect(() => {
    if (selectedProject && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedProject?.id]);

  useEffect(() => {
    filteredProjects.forEach((project, i) => {
      const videoEl = document.getElementById(`mobile-video-${project.id}`) as HTMLVideoElement;
      if (videoEl) {
        if (i === mobileIndex) {
          videoEl.play().catch(() => {});
        } else {
          videoEl.pause();
        }
      }
    });
  }, [mobileIndex, filteredProjects]);

  const handleProjectClick = (project: Project) => {
    navigate(`/work/${project.id}`, { state: { from: location.pathname } });
  };

  const handlePrev = () => {
    setIsCreditsOpen(false);
    if (!selectedProject) return;
    const prevProject = filteredProjects[currentIndex - 1];
    if (prevProject) {
      navigate(`/work/${prevProject.id}`);
    }
  };

  const handleNext = () => {
    setIsCreditsOpen(false);
    if (!selectedProject) return;
    const nextProject = filteredProjects[currentIndex + 1];
    if (nextProject) {
      navigate(`/work/${nextProject.id}`);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCreditsOpen) {
          setIsCreditsOpen(false);
          if (videoRef.current && !isNaN(videoRef.current.volume)) {
            videoRef.current.volume = preCreditsVolume.current;
          }
        } else if (selectedProject) {
          navigate(-1);
        } else if (isAboutOpen) {
          navigate(-1);
        }
      }
      if (e.key === 'ArrowLeft' && selectedProject) {
        handlePrev();
      }
      if (e.key === 'ArrowRight' && selectedProject) {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isCreditsOpen, selectedProject, isAboutOpen, navigate, handlePrev, handleNext]);

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

  return (
    <div className="relative min-h-screen w-full bg-bg text-ink selection:bg-ink selection:text-bg">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Courier+Prime&display=swap'); .typewriter-bio { font-family: 'Courier Prime', 'Courier New', Courier, monospace !important; }`}</style>
      <Helmet>
        {selectedProject ? (
          <>
            <title>{selectedProject.name} — Janik Rai</title>
            <meta name="description" content={`${selectedProject.name} for ${selectedProject.client}. Directed by Janik Rai.`} />
            <meta property="og:title" content={`${selectedProject.name} — Janik Rai`} />
            <meta property="og:description" content={`${selectedProject.name} for ${selectedProject.client}. Directed by Janik Rai.`} />
            <meta property="og:image" content={selectedProject.stills?.[0] || 'https://janikrai.b-cdn.net/Stills/eternity/eternity1.jpg'} />
            <meta property="og:url" content={`https://janikrai.com/work/${selectedProject.id}`} />
            <meta property="og:type" content="video.other" />
            <meta name="twitter:card" content="summary_large_image" />
            <link rel="canonical" href={`https://janikrai.com/work/${selectedProject.id}`} />
          </>
        ) : isAboutOpen ? (
          <>
            <title>About — Janik Rai</title>
            <meta name="description" content="Janik Rai is a British-Canadian director with South Asian roots, based in Vancouver and working internationally." />
            <meta property="og:title" content="About — Janik Rai" />
            <link rel="canonical" href="https://janikrai.com/info" />
          </>
        ) : (
          <>
            <title>Janik Rai — Commercial Director</title>
            <meta name="description" content="Vancouver-based commercial director. Cinematic, narrative-driven work for BMW, Spotify, Powerade, Apple Music, and more." />
            <meta property="og:title" content="Janik Rai — Commercial Director" />
            <meta property="og:description" content="Vancouver-based commercial director. Cinematic, narrative-driven work for BMW, Spotify, Powerade, Apple Music, and more." />
            <meta property="og:image" content="https://janikrai.b-cdn.net/Stills/eternity/eternity1.jpg" />
            <meta property="og:url" content="https://janikrai.com" />
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary_large_image" />
            <link rel="canonical" href="https://janikrai.com" />
          </>
        )}
      </Helmet>

      {/* Navigation */}
      {/* Desktop Nav */}
      <nav className={`fixed top-0 left-0 z-[80] w-full px-6 md:px-10 py-4 md:py-6 bg-transparent transition-opacity duration-300 hidden md:flex ${selectedProject ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-start justify-between w-full">
          {/* Categories */}
          <div className='flex gap-6 md:gap-10'>
            <>
              {CATEGORIES.map((cat) => (
                <StrikeButton
                  key={cat}
                  onClick={() => navigate(cat === 'Archive' ? '/archive' : '/')}
                  className={`text-[22px] font-bold uppercase tracking-widest transition-opacity hover:opacity-100 ${
                    !isAboutOpen && activeCategory === cat ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  {cat}
                </StrikeButton>
              ))}
              {isAboutOpen ? (
                <StrikeButton
                  ref={closeButtonRef}
                  onClick={() => navigate(-1)}
                  className='text-[22px] font-bold uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity'
                >
                  Close
                </StrikeButton>
              ) : (
                <StrikeButton
                  onClick={() => navigate('/info')}
                  className='text-[22px] font-bold uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity'
                >
                  Info
                </StrikeButton>
              )}
            </>
          </div>

          {/* Name */}
          <div className='absolute left-1/2 -translate-x-1/2 hidden md:block'>
            <div className="group flex flex-col items-center">
              <button onClick={() => navigate('/')} className='text-[26px] font-bold uppercase tracking-[0.05em]'>
                Janik Rai
              </button>
              <p className='text-[13px] uppercase tracking-[0.3em] opacity-0 -translate-y-1 group-hover:opacity-85 group-hover:translate-y-0 transition-all duration-300 pointer-events-none'>
                Director
              </p>
            </div>
          </div>

          {/* Info Toggle / Close */}
          <div className='min-w-[4rem] flex justify-end'>
          </div>
        </div>
      </nav>

      {/* Mobile Nav */}
      <div className={`fixed top-0 left-0 right-0 z-[80] flex md:hidden flex-col items-center pt-4 pb-3 bg-transparent transition-opacity duration-300 ${isAboutOpen || selectedProject ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <button
          onClick={() => {
            navigate('/');
          }}
          className='text-[19px] font-bold uppercase tracking-[0.3em] mb-4'
        >
          Janik Rai
        </button>
        <div className='flex items-center gap-8'>
          {CATEGORIES.map((cat) => (
            <StrikeButton
              key={cat}
              onClick={() => navigate(cat === 'Archive' ? '/archive' : '/')}
              className={`text-[16px] uppercase tracking-widest transition-opacity ${
                activeCategory === cat ? 'opacity-100 font-bold' : 'opacity-30'
              }`}
            >
              {cat}
            </StrikeButton>
          ))}
          <StrikeButton
            onClick={() => navigate('/info')}
            className='text-[16px] uppercase tracking-widest opacity-30'
          >
            Info
          </StrikeButton>
        </div>
      </div>

      {/* Main Content */}
      <main
        style={{ paddingTop: '13vh' }}
        className="relative z-10 flex min-h-screen items-start justify-start p-6 md:p-10"
      >
        {/* Desktop Project List */}
        <div className="hidden md:block w-full max-w-2xl text-left">
          <div className={`space-y-0 transition-opacity duration-300 ${isAboutOpen ? 'opacity-0' : 'opacity-100'}`}>
            {filteredProjects.map((project, index) => (
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleProjectClick(project); } }}
                onMouseEnter={() => {
                  setHoveredProject(project);
                  setActiveTeaser(project);
                }}
                onMouseLeave={() => setHoveredProject(null)}
                onClick={() => handleProjectClick(project)}
                className="group flex cursor-pointer items-baseline justify-start gap-4 py-0 transition-colors"
              >
                <div className="grid items-baseline leading-snug" style={{ gridTemplateColumns: '2.5rem 20rem 2rem 1fr' }}>
                  <span className={`text-[16px] font-mono transition-all duration-300 ${
                    hoveredProject?.id === project.id 
                      ? 'text-ink/75 line-through decoration-ink/75 decoration-[3px]' 
                      : 'text-ink/65'
                  }`}>
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  
                  <h2 className={`text-[22px] uppercase tracking-[0.1em] font-display transition-all duration-300 ${
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
                  >
                    <svg width='14' height='10' viewBox='0 0 14 10' fill='none' xmlns='http://www.w3.org/2000/svg' style={{ display: 'inline-block' }}>
                      <path d='M1 5H13M13 5L9 1M13 5L9 9' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/>
                    </svg>
                  </span>

                  <span className={`text-[17px] uppercase tracking-[0.1em] transition-all duration-300 ${
                    hoveredProject?.id === project.id 
                      ? 'text-ink/75' 
                      : 'text-ink/65 group-hover:text-ink/85'
                  }`}>
                    {project.client}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Project Browsing */}
        <div className="md:hidden">
          {activeCategory === 'Archive' ? (
            <div 
              ref={archiveContainerRef}
              className={`fixed inset-0 overflow-y-auto z-10 px-3 pt-24 pb-10 transition-opacity duration-300 ${isAboutOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
              <div className='grid grid-cols-2 gap-2'>
                {filteredProjects.map((project) => (
                  <ArchiveTile
                    key={project.id}
                    project={project}
                    handleProjectClick={handleProjectClick}
                    observer={archiveObserver}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div 
              className={`fixed inset-0 overflow-hidden z-10 transition-opacity duration-300 ${isAboutOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {filteredProjects.map((project, i) => (
                <div
                  key={project.id}
                  className='absolute inset-0 transition-opacity duration-500'
                  style={{ opacity: i === mobileIndex ? 1 : 0, pointerEvents: i === mobileIndex ? 'auto' : 'none' }}
                >
                  <video
                    id={`mobile-video-${project.id}`}
                    src={project.teaserUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className='absolute inset-0 w-full h-full object-cover opacity-75'
                  />
                  <div className='absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/40' />
                  <div
                    className='absolute inset-0 flex flex-col items-center justify-center px-8'
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleProjectClick(project); } }}
                    onClick={() => handleProjectClick(project)}
                  >
                    <p className='text-[13px] uppercase tracking-[0.3em] opacity-50 mb-3'>{project.client}</p>
                    <h2 className='text-2xl uppercase tracking-[0.15em] font-bold text-center font-display'>
                      {project.name}
                    </h2>
                  </div>
                </div>
              ))}
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

      {/* Background Video */}
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

      {/* Award Indicator (Bottom Right) */}
      <div className="fixed right-10 bottom-10 z-20 pointer-events-none">
        <AnimatePresence>
          <div className='flex gap-3 items-end' style={{ flexWrap: 'wrap' }}>
            {hoveredProject?.laurelUrls?.map((url, i) => (
              <motion.img 
                key={hoveredProject?.id + '-' + i} 
                src={url} 
                alt='Award laurel' 
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
            initial={{ opacity: 0, clipPath: 'inset(2% 2% 2% 2% round 4px)' }}
            animate={{ opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 0px)' }}
            exit={{ opacity: 1, clipPath: 'inset(100% 0% 0% 0% round 0px)' }}
            transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[60] flex flex-col bg-bg overflow-y-auto"
          >
            <div className='flex md:hidden items-center justify-between p-6 sticky top-0 z-[80]'>
              {selectedProject.credits && selectedProject.credits.trim() !== '' && (
                <StrikeButton
                  onClick={() => {
                    if (videoRef.current) {
                      preCreditsVolume.current = videoRef.current.volume;
                      videoRef.current.volume = Math.max(0, videoRef.current.volume * 0.5);
                    }
                    setIsCreditsOpen(true);
                  }}
                  className='text-[15px] uppercase tracking-widest opacity-75'
                >
                  Credits
                </StrikeButton>
              )}
              {(!selectedProject.credits || selectedProject.credits.trim() === '') && <div />}
              <p className='text-[15px] uppercase tracking-[0.2em] font-bold absolute left-1/2 -translate-x-1/2 font-display'>{selectedProject.name}</p>
              <StrikeButton
                onClick={() => { navigate(location.state?.from || '/'); setIsCreditsOpen(false); }}
                className='text-[15px] uppercase tracking-widest opacity-75'
              >
                Close
              </StrikeButton>
            </div>

            <div className='hidden md:flex sticky top-0 z-[80] items-center justify-between p-6 md:p-10 bg-transparent'>
              <div className='flex items-center gap-10'>
                <StrikeButton
                  onClick={() => {
                    navigate(location.state?.from || '/');
                    setIsCreditsOpen(false);
                  }}
                  className='text-[22px] font-bold uppercase tracking-widest opacity-75 hover:opacity-100 transition-opacity'
                >
                  Close
                </StrikeButton>
                {selectedProject.credits && selectedProject.credits.trim() !== '' && (
                  <StrikeButton
                    onClick={() => {
                      if (videoRef.current) {
                        preCreditsVolume.current = videoRef.current.volume;
                        videoRef.current.volume = Math.max(0, videoRef.current.volume * 0.5);
                      }
                      setIsCreditsOpen(true);
                    }}
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

            <div className="flex-1 flex flex-col items-center pt-2 pb-10 px-6 md:px-20 space-y-10">
              <div className='relative w-full max-w-6xl'>
                {hasPrev && (
                  <StrikeButton
                    onClick={handlePrev}
                    className='hidden md:flex absolute left-[-4rem] top-1/2 -translate-y-1/2 text-[20px] font-bold uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity'
                  >
                    Prev
                  </StrikeButton>
                )}

                <div style={{ width: '100%', maxWidth: '1152px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <video
                    ref={videoRef}
                    key={selectedProject.id}
                    src={selectedProject.videoUrl}
                    poster={getPoster(selectedProject)}
                    controls
                    autoPlay
                    playsInline
                    style={{
                      width: '100%',
                      maxHeight: '80vh',
                      objectFit: 'contain',
                      background: 'black'
                    }}
                  />
                </div>

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
                    className='hidden md:flex absolute right-[-4rem] top-1/2 -translate-y-1/2 text-[20px] font-bold uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity'
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

            {/* Credits Overlay */}
            <AnimatePresence>
              {isCreditsOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
                  className='fixed inset-0 z-[90] flex items-center justify-center'
                  style={{
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)'
                  }}
                  onClick={() => setIsCreditsOpen(false)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCreditsOpen(false);
                      if (videoRef.current && !isNaN(videoRef.current.volume)) {
                        videoRef.current.volume = preCreditsVolume.current;
                      }
                    }}
                    className='absolute top-6 left-6 md:top-10 md:left-10 text-[16px] md:text-[20px] uppercase tracking-widest opacity-75 hover:opacity-100 transition-opacity'
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
                      className='mt-10 text-[14px] uppercase tracking-widest opacity-75 text-left'
                      onClick={() => {
                        setIsCreditsOpen(false);
                        if (videoRef.current && !isNaN(videoRef.current.volume)) {
                          videoRef.current.volume = preCreditsVolume.current;
                        }
                      }}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center lg:items-start lg:justify-start lg:pt-[15vh] lg:px-10 bg-bg/85 backdrop-blur-sm"
            onClick={() => navigate(-1)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(-1);
              }}
              className='flex md:hidden absolute top-6 right-6 text-[16px] uppercase tracking-widest opacity-75 hover:opacity-100 transition-opacity'
            >
              Close
            </button>
            <div className='w-full px-6 pt-24 pb-10 flex flex-col gap-10 lg:hidden' onClick={(e) => e.stopPropagation()}>
              <div className='flex flex-col gap-4'>
                <h4 className='text-[17px] uppercase tracking-[0.5em] opacity-80 font-bold'>Bio</h4>
                <div className='flex flex-col gap-6 text-[15px] uppercase tracking-[0.15em] leading-loose opacity-100 typewriter-bio' style={{ fontFamily: "'Courier New', Courier, monospace" }}>
                  <p className="typewriter-bio">Janik Rai is a British-Canadian director with South Asian roots, based in Vancouver and working internationally.</p>
                  <p className="typewriter-bio">Drawn to the space between what people say and what they mean, he makes work that feels human and real. A composed, cinematic eye rooted in documentary authenticity.</p>
                </div>
              </div>
              <div className='flex flex-col gap-4'>
                <h4 className='text-[17px] uppercase tracking-[0.5em] opacity-80 font-bold'>Contact</h4>
                <a href='mailto:contact@janikrai.com' className='text-[15px] uppercase tracking-[0.2em] opacity-100 hover:opacity-60 transition-opacity typewriter-bio'>contact@janikrai.com</a>
                <div className='flex items-center gap-6'>
                  <a href='https://vimeo.com/janikrai' target='_blank' rel='noopener noreferrer' className='opacity-100 hover:opacity-60 transition-opacity'>
                    <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'><path d='M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.087 3.479-3.131C5.002 2.764 6.166 2.125 6.912 2.056c1.735-.168 2.899 1.021 3.437 3.505.584 2.718.991 4.407 1.234 5.088.686 1.92 1.437 2.882 2.197 2.882.686 0 1.704-.861 3.063-2.617 1.339-1.736 2.054-3.054 2.093-3.926.084-1.485-.435-2.223-1.573-2.223-.568 0-1.151.131-1.768.393 1.167-3.831 3.411-5.691 6.703-5.619 2.351.066 3.454 1.585 3.279 4.177z'/></svg>
                  </a>
                  <a href='https://www.instagram.com/janikrai' target='_blank' rel='noopener noreferrer' className='opacity-100 hover:opacity-60 transition-opacity'>
                    <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'><path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z'/></svg>
                  </a>
                </div>
              </div>
            </div>

            <div
              className='hidden lg:flex flex-col gap-8'
              style={{
                marginLeft: `${infoContentLeft - 40}px`,
                maxWidth: `calc(100vw - ${(infoContentLeft) * 2}px + 40px)`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className='flex flex-col gap-8 max-w-[50rem] pr-10'>
                <h4 className='text-[16px] uppercase tracking-[0.5em] opacity-40 font-bold' style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>Bio</h4>
                <div 
                  className='flex flex-col gap-6 text-[16px] uppercase tracking-[0.2em] leading-loose typewriter-bio'
                  style={{ fontFamily: "'Courier Prime', 'Courier New', Courier, monospace" }}
                >
                  <p className='typewriter-bio'>Janik Rai is a British-Canadian director with South Asian roots, based in Vancouver and working internationally.</p>
                  <p className='typewriter-bio'>Drawn to the space between what people say and what they mean, he makes work that feels human and real. A composed, cinematic eye rooted in documentary authenticity.</p>
                </div>
              </div>

              <div className='flex flex-col gap-6'>
                <h4 className='text-[16px] uppercase tracking-[0.5em] opacity-40 font-bold' style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>Contact</h4>
                <div className='flex flex-col gap-5'>
                  <a href='mailto:contact@janikrai.com' className='text-[16px] uppercase tracking-[0.2em] typewriter-bio hover:opacity-60 transition-opacity'>contact@janikrai.com</a>
                  <div className='flex items-center gap-6'>
                    <a href='https://vimeo.com/janikrai' target='_blank' rel='noopener noreferrer' className='opacity-100 hover:opacity-60 transition-opacity'>
                      <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'><path d='M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.087 3.479-3.131C5.002 2.764 6.166 2.125 6.912 2.056c1.735-.168 2.899 1.021 3.437 3.505.584 2.718.991 4.407 1.234 5.088.686 1.92 1.437 2.882 2.197 2.882.686 0 1.704-.861 3.063-2.617 1.339-1.736 2.054-3.054 2.093-3.926.084-1.485-.435-2.223-1.573-2.223-.568 0-1.151.131-1.768.393 1.167-3.831 3.411-5.691 6.703-5.619 2.351.066 3.454 1.585 3.279 4.177z'/></svg>
                    </a>
                    <a href='https://www.instagram.com/janikrai' target='_blank' rel='noopener noreferrer' className='opacity-100 hover:opacity-60 transition-opacity'>
                      <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'><path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z'/></svg>
                    </a>
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
