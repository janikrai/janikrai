import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PROJECTS, CATEGORIES } from './constants';
import { Project, Category } from './types';

function StrikeButton({ children, onClick, className, disabled }: { children: React.ReactNode, onClick?: () => void, className?: string, disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`group ${className}`}
      disabled={disabled}
    >
      <span className='relative inline-block'>
        {children}
        <span className='absolute left-0 top-1/2 h-[1px] bg-current transition-all duration-300 ease-out w-0 group-hover:w-full' />
      </span>
    </button>
  );
}

const getPoster = (project: Project) => project.stills?.[0] ?? '';

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
  const bgVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (bgVideoRef.current) {
      bgVideoRef.current.src = activeTeaser.teaserUrl;
      bgVideoRef.current.poster = getPoster(activeTeaser);
      bgVideoRef.current.load();
      bgVideoRef.current.play().catch(() => {});
    }
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
    navigate(`/work/${project.id}`);
  };

  const handlePrev = () => {
    if (!selectedProject) return;
    const prevProject = filteredProjects[currentIndex - 1];
    if (prevProject) {
      navigate(`/work/${prevProject.id}`);
    }
  };

  const handleNext = () => {
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

  return (
    <div className="relative min-h-screen w-full bg-bg text-ink selection:bg-ink selection:text-bg">
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
            {isAboutOpen ? (
              <StrikeButton
                onClick={() => navigate(-1)}
                className='text-[16px] uppercase tracking-widest opacity-85 hover:opacity-100 transition-opacity'
              >
                Close
              </StrikeButton>
            ) : (
              <>
                {CATEGORIES.map((cat) => (
                  <StrikeButton
                    key={cat}
                    onClick={() => navigate(cat === 'Archive' ? '/archive' : '/')}
                    className={`text-[16px] font-medium uppercase tracking-widest transition-opacity hover:opacity-100 ${
                      activeCategory === cat ? 'opacity-100' : 'opacity-85'
                    }`}
                  >
                    {cat}
                  </StrikeButton>
                ))}
                <StrikeButton
                  onClick={() => navigate('/info')}
                  className='text-[16px] font-medium uppercase tracking-widest opacity-85 hover:opacity-100 transition-opacity'
                >
                  Info
                </StrikeButton>
              </>
            )}
          </div>

          {/* Name */}
          <div className='absolute left-1/2 -translate-x-1/2 hidden md:block'>
            <button
              onClick={() => {
                navigate('/');
              }}
              className='text-[16px] font-bold uppercase tracking-[0.3em]'
            >
              Janik Rai
            </button>
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
          className='text-[17px] font-bold uppercase tracking-[0.3em] mb-4'
        >
          Janik Rai
        </button>
        <div className='flex items-center gap-8'>
          {CATEGORIES.map((cat) => (
            <StrikeButton
              key={cat}
              onClick={() => navigate(cat === 'Archive' ? '/archive' : '/')}
              className={`text-[14px] uppercase tracking-widest transition-opacity ${
                activeCategory === cat ? 'opacity-100 font-bold' : 'opacity-65'
              }`}
            >
              {cat}
            </StrikeButton>
          ))}
          <StrikeButton
            onClick={() => navigate('/info')}
            className='text-[14px] uppercase tracking-widest opacity-65'
          >
            Info
          </StrikeButton>
        </div>
      </div>

      {/* Main Content */}
      <main
        style={{ paddingTop: '9vh' }}
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
                <div className="grid items-baseline leading-snug" style={{ gridTemplateColumns: '2rem minmax(12rem, auto) 1rem minmax(8rem, auto)' }}>
                  <span className={`text-[14px] font-mono transition-all duration-300 ${
                    hoveredProject?.id === project.id 
                      ? 'text-ink/75 line-through decoration-ink/75' 
                      : 'text-ink/65'
                  }`}>
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  
                  <h2 className={`text-[15px] uppercase tracking-[0.1em] font-display transition-all duration-300 ${
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

                  <span className={`text-[15px] uppercase tracking-[0.1em] transition-all duration-300 ${
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
            <div className={`fixed inset-0 overflow-y-auto z-10 px-3 pt-24 pb-10 transition-opacity duration-300 ${isAboutOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <div className='grid grid-cols-2 gap-2'>
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleProjectClick(project); } }}
                    className='relative aspect-video cursor-pointer overflow-hidden'
                    onClick={() => handleProjectClick(project)}
                  >
                    <video
                      src={project.teaserUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className='absolute inset-0 w-full h-full object-cover'
                    />
                    <div className='absolute inset-0 bg-black/55' />
                    <div className='absolute inset-0 flex flex-col items-start justify-end p-2'>
                      <p className='text-[9px] uppercase tracking-[0.2em] opacity-75 leading-none mb-1'>{project.client}</p>
                      <h3 className='text-[11px] uppercase tracking-[0.1em] font-bold leading-tight font-display'>{project.name}</h3>
                    </div>
                  </div>
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
                    <p className='text-[11px] uppercase tracking-[0.3em] opacity-50 mb-3'>{project.client}</p>
                    <h2 className='text-xl uppercase tracking-[0.15em] font-bold text-center font-display'>
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
        <video
          ref={bgVideoRef}
          autoPlay
          muted
          loop
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }}
        />
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
                style={{ filter: 'brightness(0) saturate(100%) invert(10%) sepia(95%) saturate(7500%) hue-rotate(5deg) brightness(110%)' }}
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
            exit={{ opacity: 0, clipPath: 'inset(2% 2% 2% 2% round 4px)' }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
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
                  className='text-[13px] uppercase tracking-widest opacity-75'
                >
                  Credits
                </StrikeButton>
              )}
              {(!selectedProject.credits || selectedProject.credits.trim() === '') && <div />}
              <p className='text-[13px] uppercase tracking-[0.2em] font-bold absolute left-1/2 -translate-x-1/2 font-display'>{selectedProject.name}</p>
              <StrikeButton
                onClick={() => { navigate(-1); setIsCreditsOpen(false); }}
                className='text-[13px] uppercase tracking-widest opacity-75'
              >
                Close
              </StrikeButton>
            </div>

            <div className='hidden md:flex sticky top-0 z-[80] items-center justify-between p-6 md:p-10 bg-transparent'>
              <div className='flex items-center gap-10'>
                <StrikeButton
                  onClick={() => {
                    navigate(-1);
                    setIsCreditsOpen(false);
                  }}
                  className='text-[16px] uppercase tracking-widest opacity-75 hover:opacity-100 transition-opacity'
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
                    className='text-[16px] uppercase tracking-widest opacity-75 hover:opacity-100 transition-opacity'
                  >
                    Credits
                  </StrikeButton>
                )}
              </div>
              <div className='absolute left-1/2 -translate-x-1/2 text-center pointer-events-none'>
                <p className='text-[16px] uppercase tracking-[0.2em] font-bold font-display'>{selectedProject.name}</p>
              </div>
              <div />
            </div>

            <div className="flex-1 flex flex-col items-center py-10 px-6 md:px-20 space-y-10">
              <div className='relative w-full max-w-6xl'>
                <StrikeButton
                  onClick={handlePrev}
                  className={`hidden md:flex absolute left-[-4rem] top-1/2 -translate-y-1/2 text-[16px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity ${
                    !hasPrev ? 'invisible' : ''
                  }`}
                >
                  Prev
                </StrikeButton>

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
                  <StrikeButton
                    onClick={handlePrev}
                    className={`text-[13px] uppercase tracking-widest opacity-75 ${
                      !hasPrev ? 'invisible' : ''
                    }`}
                  >
                    Prev
                  </StrikeButton>
                  <StrikeButton
                    onClick={handleNext}
                    className={`text-[13px] uppercase tracking-widest opacity-75 ${
                      !hasNext ? 'invisible' : ''
                    }`}
                  >
                    Next
                  </StrikeButton>
                </div>

                <StrikeButton
                  onClick={handleNext}
                  className={`hidden md:flex absolute right-[-4rem] top-1/2 -translate-y-1/2 text-[16px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity ${
                    !hasNext ? 'invisible' : ''
                  }`}
                >
                  Next
                </StrikeButton>
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
                    className='absolute top-6 left-6 md:top-10 md:left-10 text-[14px] uppercase tracking-widest opacity-75 hover:opacity-100 transition-opacity'
                  >
                    Close
                  </button>
                  <div className='flex flex-col md:hidden w-full px-6 py-10 overflow-y-auto max-h-[80vh]' onClick={(e) => e.stopPropagation()}>
                    <h4 className='text-[14px] uppercase tracking-[0.5em] font-bold mb-8 font-display'>Credits</h4>
                    <div className='flex flex-col gap-5'>
                      {selectedProject.credits.split('\n').filter(Boolean).map((line, i) => {
                        const colonIndex = line.indexOf(':');
                        const role = line.substring(0, colonIndex).trim();
                        const name = line.substring(colonIndex + 1).trim();
                        return (
                          <div key={`credit-${i}`} className='flex flex-col gap-1'>
                            <span className='text-[10px] uppercase tracking-[0.2em] opacity-80'>{role}</span>
                            <span className='text-[12px] uppercase tracking-[0.15em] font-bold opacity-100'>{name}</span>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      className='mt-10 text-[12px] uppercase tracking-widest opacity-75 text-left'
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
                    className='hidden md:block max-w-3xl w-full px-16 py-14 rounded-sm'
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h4 className='text-[15px] uppercase tracking-[0.5em] font-bold mb-12 font-display'>Credits</h4>
                    <div className='grid gap-y-4' style={{ gridTemplateColumns: '1fr 1fr' }}>
                      {selectedProject.credits.split('\n').filter(Boolean).map((line, i) => {
                        const colonIndex = line.indexOf(':');
                        const role = line.substring(0, colonIndex).trim();
                        const name = line.substring(colonIndex + 1).trim();
                        return (
                          <div key={`credit-${i}`} className="contents">
                            <span className='text-[16px] uppercase tracking-[0.15em] opacity-85 font-normal'>{role}</span>
                            <span className='text-[16px] uppercase tracking-[0.15em] opacity-100 font-bold text-right'>{name}</span>
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
            className="fixed inset-0 z-[70] flex items-center justify-center bg-bg/85 backdrop-blur-sm"
            onClick={() => navigate(-1)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(-1);
              }}
              className='flex md:hidden absolute top-6 right-6 text-[14px] uppercase tracking-widest opacity-75 hover:opacity-100 transition-opacity'
            >
              Close
            </button>
            <div className='w-full px-6 pt-24 pb-10 flex flex-col gap-10 lg:hidden' onClick={(e) => e.stopPropagation()}>
              <div className='flex flex-col gap-4'>
                <h4 className='text-[15px] uppercase tracking-[0.5em] opacity-80 font-bold'>Bio</h4>
                <div className='flex flex-col gap-6 text-[13px] uppercase tracking-[0.15em] leading-loose opacity-100 font-display'>
                  <p>Janik Rai is a British-Canadian director with South Asian roots, based in Vancouver and working internationally.</p>
                  <p>Drawn to the space between what people say and what they mean, he makes work that feels human and real. A composed, cinematic eye rooted in documentary authenticity.</p>
                </div>
              </div>
              <div className='flex flex-col gap-4'>
                <h4 className='text-[15px] uppercase tracking-[0.5em] opacity-80 font-bold'>Contact</h4>
                <a href='mailto:contact@janikrai.com' className='text-[13px] uppercase tracking-[0.2em] opacity-100 hover:opacity-60 transition-opacity'>contact@janikrai.com</a>
                <a href='https://vimeo.com/janikrai' target='_blank' rel='noopener noreferrer' className='text-[13px] uppercase tracking-[0.2em] opacity-100 hover:opacity-60 transition-opacity'>Vimeo</a>
                <a href='https://www.instagram.com/janikrai' target='_blank' rel='noopener noreferrer' className='text-[13px] uppercase tracking-[0.2em] opacity-100 hover:opacity-60 transition-opacity'>Instagram</a>
              </div>
            </div>

            <div className='hidden lg:block w-full max-w-2xl' style={{ marginTop: '-35vh', paddingLeft: '2.5rem' }} onClick={(e) => e.stopPropagation()}>
              <div className='flex flex-col gap-12'>
                <div className='flex flex-col gap-6'>
                  <h4 className='text-[17px] uppercase tracking-[0.5em] opacity-80 font-bold'>Bio</h4>
                  <div className='flex flex-col gap-6 text-[14px] uppercase tracking-[0.2em] leading-loose opacity-100 font-display'>
                    <p>Janik Rai is a British-Canadian director with South Asian roots, based in Vancouver and working internationally.</p>
                    <p>Drawn to the space between what people say and what they mean, he makes work that feels human and real. A composed, cinematic eye rooted in documentary authenticity.</p>
                  </div>
                </div>
                <div className='flex flex-col gap-4'>
                  <h4 className='text-[17px] uppercase tracking-[0.5em] opacity-80 font-bold'>Contact</h4>
                  <div className='flex flex-col gap-3'>
                    <a href='mailto:contact@janikrai.com' className='text-[14px] uppercase tracking-[0.2em] opacity-100 hover:opacity-60 transition-opacity'>contact@janikrai.com</a>
                    <a href='https://vimeo.com/janikrai' target='_blank' rel='noopener noreferrer' className='text-[14px] uppercase tracking-[0.2em] opacity-100 hover:opacity-60 transition-opacity'>Vimeo</a>
                    <a href='https://www.instagram.com/janikrai' target='_blank' rel='noopener noreferrer' className='text-[14px] uppercase tracking-[0.2em] opacity-100 hover:opacity-60 transition-opacity'>Instagram</a>
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
