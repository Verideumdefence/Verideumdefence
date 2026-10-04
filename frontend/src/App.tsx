import { type ComponentType, type ReactNode, useEffect, useRef, useState } from 'react';
import './security-monitor.css';
import './security-assessment.css';
import './who-we-serve.css';
import './who-we-are.css';
import './security-principles.css';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Activity,
  AlertTriangle,
  Database,
  Radio,
  Server,
  ShieldCheck,
  Check,
  Menu,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { api, auth } from '@/lib/api';

// Admin pages
import AdminLogin from '@/pages/admin/login';
import AdminDashboard from '@/pages/admin/dashboard';
import AdminRequests from '@/pages/admin/requests';
import AdminClients from '@/pages/admin/clients';
import AdminProjects from '@/pages/admin/projects';
import AdminTickets from '@/pages/admin/tickets';
import AdminMessages from '@/pages/admin/messages';
import AdminTeam from '@/pages/admin/team';
import AdminAuditLogs from '@/pages/admin/audit-logs';
import AdminSettings from '@/pages/admin/settings';


// Error pages
import Error404 from '@/pages/errors/404';
import Error403 from '@/pages/errors/403';
import Error500 from '@/pages/errors/500';

const queryClient = new QueryClient();

const services = [
  {
    number: '01',
    title: 'Digital Forensics & Incident Response',
    body: 'Deep investigations, malware analysis, and incident-focused analysis to understand what happened, how it happened, and what to do next.',
  },
  {
    number: '02',
    title: 'Vulnerability Assessment & Bug Bounty',
    body: 'Identify security weaknesses before they can be exploited and support responsible remediation.',
  },
  {
    number: '03',
    title: 'Enterprise Network Protection',
    body: 'Security capabilities designed to strengthen the protection of critical business networks, systems, and data.',
  },
  {
    number: '04',
    title: 'Cybersecurity Training & Education',
    body: 'Practical cybersecurity education covering real-world security, defensive techniques, and threat intelligence.',
  },
];

const faqs = [
  {
    question: 'What does VerideumDefence do?',
    answer:
      'We provide cybersecurity assessment, digital forensics, incident response, network protection, and cybersecurity education for individuals, startups, and organizations.',
  },
  {
    question: 'Who can use the services?',
    answer:
      'Our capabilities are designed for individuals, startups, small businesses, and enterprises with different security, assessment, investigation, and education needs.',
  },
  {
    question: 'What happens during a security assessment?',
    answer:
      'An assessment typically involves understanding your environment, identifying potential security weaknesses, and providing actionable findings with remediation guidance based on the agreed scope.',
  },
  {
    question: 'Do you provide digital forensics?',
    answer:
      'Yes. Digital forensics, malware analysis, and incident-focused investigation are part of our security and investigative capabilities.',
  },
  {
    question: 'Do you support incident response?',
    answer:
      'Yes. We support incident response activities including containment, investigation, and recovery guidance based on the scope and requirements of the engagement.',
  },
  {
    question: 'Do you provide cybersecurity training?',
    answer:
      'Yes. We provide practical cybersecurity education covering real-world security, defensive techniques, and threat intelligence tailored to your needs.',
  },
  {
    question: 'Can startups use the services?',
    answer:
      'Yes. Our approach is designed to make practical security capabilities accessible to growing organizations without unnecessary complexity.',
  },
  {
    question: 'How can someone request an assessment?',
    answer:
      'Use the contact form below and tell us what you are trying to protect, assess, or investigate. We can use that context to understand the right next step.',
  },
];

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add('is-visible');
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return ref;
}

function Reveal({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useReveal();

  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

function Brand() {
  return (
    <span className="brand" aria-label="VerideumDefence home">
      <img
        src="/images/image1.jpeg"
        alt=""
        aria-hidden="true"
        className="brand-logo-image"
      />

      <span className="brand-word">
        VERIDEUM<span>DEFENCE</span>
      </span>
    </span>
  );
}

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contactError, setContactError] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    try {
      const storageKey = 'verideumdefence-visitor-id';
      let visitorId = localStorage.getItem(storageKey);
      if (!visitorId) {
        visitorId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(storageKey, visitorId);
      }
      void api.post('/website/visits', { visitor_key: visitorId }).catch(() => undefined);
    } catch {
      // Visitor counting is optional; the website remains usable when storage is disabled.
    }
  }, []);

  const submitInquiry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setContactError('');
    const form = new FormData(event.currentTarget);
    try {
      await api.post('/inquiries', {
        requester_name: form.get('name'),
        requester_email: form.get('email'),
        company: form.get('company') || null,
        service: form.get('securityNeed'),
        description: form.get('message'),
      });
      setSubmitted(true);
    } catch (error) {
      setContactError(error instanceof Error ? error.message : 'Unable to send your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reviewForm = event.currentTarget;
    setReviewSubmitting(true);
    setReviewError('');
    const form = new FormData(event.currentTarget);
    try {
      await api.post('/website/reviews', {
        reviewer_name: form.get('reviewerName'),
        rating: Number(form.get('rating')),
        review: form.get('review'),
      });
      setReviewSubmitted(true);
      reviewForm.reset();
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Unable to send your review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const closeMenu = () => setMenuOpen(false);

  const scrollToContact = () => {
    document
      .getElementById('contact')
      ?.scrollIntoView({ behavior: 'smooth' });

    closeMenu();
  };

  return (
    <main className="verideumdefence-page">

      {/* =========================================
          HERO
      ========================================= */}

      <section className="hero" id="top">

        <header className="shell nav-shell">

          <a
            href="#top"
            className="brand"
            data-testid="link-home"
            onClick={closeMenu}
          >
            <Brand />
          </a>

          <nav
            className={`nav-links ${menuOpen ? 'open' : ''}`}
            aria-label="Main navigation"
          >
            <a href="#platform" onClick={closeMenu}>
              Capabilities
            </a>

            <a href="#services" onClick={closeMenu}>
              Who we serve
            </a>

            <a href="#protection" onClick={closeMenu}>
              How we protect
            </a>

            <a href="#monitor" onClick={closeMenu}>
              Security monitor
            </a>

            <a href="#approach" onClick={closeMenu}>
              Who we are
            </a>

            <a href="#principles" onClick={closeMenu}>
              Security principles
            </a>

            <a
              href="#contact"
              className="nav-cta"
              onClick={closeMenu}
            >
              Talk to us <ArrowRight size={14} />
            </a>
          </nav>

          <button
            className="nav-toggle"
            aria-label={
              menuOpen ? 'Close navigation' : 'Open navigation'
            }
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>

        </header>

        <div className="shell hero-content">

          <Reveal>

            <div className="eyebrow mono">
              CYBERSECURITY • DIGITAL FORENSICS • INCIDENT RESPONSE
            </div>

            <h1>
              The Ultimate Shield for Your <em>Digital World.</em>
            </h1>

            <p className="hero-copy">
              Comprehensive cybersecurity, digital forensics, and
              incident-response capabilities designed to protect your
              digital assets, networks, and data against evolving cyber
              threats.
            </p>

            <div className="hero-actions">

              <button
                className="button-primary"
                onClick={scrollToContact}
              >
                Talk to us <ArrowRight />
              </button>

              <a
                className="button-quiet"
                href="#platform"
              >
                Explore our capabilities <ArrowDownRight />
              </a>

            </div>

            <div className="hero-note mono">
              <span className="status-pulse" />
              security • investigation • response
            </div>

          </Reveal>

          {/* Existing radar — KEEP */}

          <Reveal className="delay-2">

            <div
              className="radar-shell"
              aria-label="Abstract live security signal visualization"
            >
              <div className="radar-ring r1" />
              <div className="radar-ring r2" />
              <div className="radar-ring r3" />
              <div className="radar-cross" />
              <div className="radar-sweep" />
              <div className="radar-core" />

              <div className="signal one mono">
                identity / clear
              </div>

              <div className="signal two mono">
                new signal · triaged
              </div>

              <div className="signal three mono">
                cloud / guarded
              </div>
            </div>

          </Reveal>

        </div>
      </section>

      {/* =========================================
          TRUST / POSITIONING
      ========================================= */}

      <section
        className="trust-strip"
              aria-label="VerideumDefence positioning"
      >

        <div className="shell trust-row">

          <div className="trust-intro mono">
            BUILT AROUND
            <br />
            REAL SECURITY WORK
          </div>

          <div className="trust-numbers">

            <div className="proof-number">
              <strong>01</strong>
              <span>Prevention</span>
            </div>

            <div className="proof-number">
              <strong>02</strong>
              <span>Investigation</span>
            </div>

            <div className="proof-number">
              <strong>03</strong>
              <span>Response</span>
            </div>

          </div>

        </div>

      </section>


      {/* =========================================
          ALL-IN-ONE SECURITY HUB
      ========================================= */}

      <section className="section" id="platform">

        <div className="shell">

          <Reveal>

            <div className="intro-grid">

              <div>

                <div className="section-label mono">
                  01 / SECURITY &amp; FORENSICS HUB
                </div>

                <h2 className="section-heading">
                  All-in-One Security &amp; Forensics{' '}
                  <span className="soft">Hub.</span>
                </h2>

              </div>

              <p>
                Every cybersecurity and investigative capability under
                one roof. From proactive assessment to digital
                investigation and incident response, we bring security
                work together around the needs of your organization.
              </p>

            </div>

          </Reveal>


          {/* IMAGE 2 */}

          <Reveal className="platform-visual-reveal">

            <div className="platform-visual">

              <div className="platform-visual-glow" />

              <img
                src="/images/image2.jpeg"
                alt="VerideumDefence cyber defense operations"
                className="platform-image"
              />

              <div className="platform-image-brand mono" aria-hidden="true">
                VERIDEUMDEFENCE
              </div>

              <div className="platform-scan-line" />

              <div className="platform-status mono">
                <span className="status-pulse" />
                VERIDEUMDEFENCE / ACTIVE DEFENSE
              </div>

              <div className="platform-corner platform-corner-tl" />

              <div className="platform-corner platform-corner-br" />

            </div>

          </Reveal>


          {/* SECURITY CAPABILITY CARDS */}

          <div className="services-grid">

            {services.map((service, index) => (
              <Reveal
                key={service.number}
                className={index > 1 ? 'delay-1' : ''}
              >
                <article className="service-card">
                  <div className="service-card-top">
                    <span className="service-number mono">
                      {service.number}
                    </span>

                    <ArrowUpRight size={18} />
                  </div>

                  <div className="service-card-icon mono">
                    {service.number}
                  </div>

                  <h3>{service.title}</h3>

                  <p>{service.body}</p>

                  <div className="service-card-line" />

                  <a href="#contact" className="service-card-footer mono">
                    <span>SECURITY CAPABILITY</span>
                    <ArrowRight size={14} />
                  </a>
                </article>
              </Reveal>
            ))}

          </div>

        </div>

      </section>


      {/* =========================================
          WHO WE SERVE
      ========================================= */}

      <section
        className="section services-section serve-section"
        id="services"
      >

        <div className="shell">

          <Reveal>
            <div className="section-label mono">
              02 / WHO WE SERVE
            </div>

            <div className="serve-intro">
              <div>
                <h2 className="section-heading">
                  Security that fits
                  <span className="soft"> your stage.</span>
                </h2>
              </div>

              <p>
                Different organizations face different risks. VerideumDefence
                brings together assessment, protection, investigation and
                security education around the environment you actually operate.
              </p>
            </div>
          </Reveal>

          <div className="serve-grid">

            <Reveal>
              <article className="serve-card">
                <div className="serve-card-top">
                  <span className="serve-index mono">01</span>
                  <ShieldCheck size={19} />
                </div>

                <div className="serve-tag mono">INDIVIDUALS</div>

                <h3>Personal digital security &amp; investigation.</h3>

                <p>
                  Practical guidance for protecting accounts, devices and
                  digital information, with investigative support when you
                  need to understand what happened.
                </p>

                <div className="serve-capabilities">
                  <span>Digital investigation</span>
                  <span>Security awareness</span>
                  <span>Device &amp; account guidance</span>
                </div>

                <a href="#contact" className="serve-link mono">
                  DISCUSS YOUR NEED <ArrowUpRight size={14} />
                </a>
              </article>
            </Reveal>

            <Reveal className="delay-1">
              <article className="serve-card">
                <div className="serve-card-top">
                  <span className="serve-index mono">02</span>
                  <ArrowUpRight size={19} />
                </div>

                <div className="serve-tag mono">STARTUPS &amp; SMBs</div>

                <h3>Security foundations for growing businesses.</h3>

                <p>
                  Build practical security into applications, infrastructure
                  and day-to-day operations before complexity becomes harder
                  to manage.
                </p>

                <div className="serve-capabilities">
                  <span>Web &amp; API assessment</span>
                  <span>Infrastructure security</span>
                  <span>Incident readiness</span>
                </div>

                <a href="#contact" className="serve-link mono">
                  DISCUSS YOUR NEED <ArrowUpRight size={14} />
                </a>
              </article>
            </Reveal>

            <Reveal className="delay-2">
              <article className="serve-card">
                <div className="serve-card-top">
                  <span className="serve-index mono">03</span>
                  <Server size={19} />
                </div>

                <div className="serve-tag mono">ENTERPRISES</div>

                <h3>Security, assessment &amp; response capabilities.</h3>

                <p>
                  Support for larger environments managing critical systems,
                  sensitive information, broader attack surfaces and security
                  incidents.
                </p>

                <div className="serve-capabilities">
                  <span>Network protection</span>
                  <span>Forensics &amp; response</span>
                  <span>Security assessments</span>
                </div>

                <a href="#contact" className="serve-link mono">
                  DISCUSS YOUR NEED <ArrowUpRight size={14} />
                </a>
              </article>
            </Reveal>

            <Reveal className="delay-1">
              <article className="serve-card">
                <div className="serve-card-top">
                  <span className="serve-index mono">04</span>
                  <Activity size={19} />
                </div>

                <div className="serve-tag mono">TECH &amp; DEVELOPMENT TEAMS</div>

                <h3>Security support for products in motion.</h3>

                <p>
                  Help technology teams identify weaknesses, improve defensive
                  practices and prepare products and APIs for responsible
                  security testing.
                </p>

                <div className="serve-capabilities">
                  <span>Vulnerability assessment</span>
                  <span>Bug bounty readiness</span>
                  <span>Secure development guidance</span>
                </div>

                <a href="#contact" className="serve-link mono">
                  DISCUSS YOUR NEED <ArrowUpRight size={14} />
                </a>
              </article>
            </Reveal>

          </div>

          <Reveal className="serve-note">
            <div className="serve-note-mark">
              <Radio size={16} />
            </div>
            <p>
              <strong>Scope first.</strong> Every engagement starts by
              understanding the systems, objectives and constraints involved.
              Specific services depend on the agreed scope.
            </p>
          </Reveal>

        </div>

      </section>


      {/* =========================================
          HOW WE PROTECT
      ========================================= */}

      <section className="protection-section section-pad" id="protection">
            <Reveal className="section-intro">
              <div className="eyebrow mono">HOW WE PROTECT</div>

              <h2>
                Security is a process, not a <em>single product.</em>
              </h2>

              <p>
                Our approach connects prevention, detection, investigation and
                response into one continuous security lifecycle.
              </p>
            </Reveal>

            <div className="protection-flow">
              <Reveal className="protection-step">
                <div className="protection-number mono">01</div>

                <div className="protection-content">
                  <div className="protection-icon">◈</div>

                  <h3>Identify</h3>

                  <p>
                    Understand your systems, applications, infrastructure and
                    potential attack surface.
                  </p>
                </div>
              </Reveal>

              <div className="protection-connector" aria-hidden="true">
                <ArrowRight />
              </div>

              <Reveal className="protection-step">
                <div className="protection-number mono">02</div>

                <div className="protection-content">
                  <div className="protection-icon">⌁</div>

                  <h3>Detect</h3>

                  <p>
                    Discover suspicious activity, security weaknesses and signals
                    that require attention.
                  </p>
                </div>
              </Reveal>

              <div className="protection-connector" aria-hidden="true">
                <ArrowRight />
              </div>

              <Reveal className="protection-step">
                <div className="protection-number mono">03</div>

                <div className="protection-content">
                  <div className="protection-icon">◎</div>

                  <h3>Investigate</h3>

                  <p>
                    Analyse evidence, events and attack paths to understand what
                    happened and why.
                  </p>
                </div>
              </Reveal>

              <div className="protection-connector" aria-hidden="true">
                <ArrowRight />
              </div>

              <Reveal className="protection-step">
                <div className="protection-number mono">04</div>

                <div className="protection-content">
                  <div className="protection-icon">+</div>

                  <h3>Respond</h3>

                  <p>
                    Contain incidents, support recovery and turn security findings
                    into practical action.
                  </p>
                </div>
              </Reveal>

              <div className="protection-connector" aria-hidden="true">
                <ArrowRight />
              </div>

              <Reveal className="protection-step">
                <div className="protection-number mono">05</div>

                <div className="protection-content">
                  <div className="protection-icon">↗</div>

                  <h3>Improve</h3>

                  <p>
                    Strengthen security controls and reduce the likelihood of
                    similar issues recurring.
                  </p>
                </div>
              </Reveal>
            </div>
      </section>




      {/* =========================================
          SECURITY OPERATIONS VISUALIZATION
      ========================================= */}

      <section className="section security-monitor-section" id="monitor">
        <div className="shell">
          <Reveal>
            <div className="intro-grid security-monitor-intro">
              <div>
                <div className="section-label mono">03 / SECURITY OPERATIONS</div>
                <h2 className="section-heading">
                  See the security picture.
                  <span className="soft"> Clearly.</span>
                </h2>
              </div>
              <p>
                A security operation works best when important signals are visible,
                contextualized, and connected to the right response process.
              </p>
            </div>
          </Reveal>

          <Reveal className="security-monitor-wrap">
            <div className="security-monitor">
              <div className="monitor-header">
                <div>
                  <span className="monitor-kicker mono">VERIDEUMDEFENCE / SECURITY MONITOR</span>
                  <h3>Security Operations View</h3>
                </div>
                <div className="monitor-live mono">
                  <span className="status-pulse" />
                  SYSTEM READY
                </div>
              </div>

              <div className="monitor-grid">
                <div className="monitor-main-panel">
                  <div className="panel-title mono">
                    <span>NETWORK ACTIVITY</span>
                    <span>LAST 60 SEC</span>
                  </div>

                  <div className="activity-chart" aria-label="Abstract network activity visualization">
                    <div className="chart-grid" />
                    <div className="chart-line chart-line-one" />
                    <div className="chart-line chart-line-two" />
                    <div className="chart-pulse pulse-one" />
                    <div className="chart-pulse pulse-two" />
                    <div className="chart-pulse pulse-three" />
                  </div>

                  <div className="chart-legend mono">
                    <span><i className="legend-dot" /> SIGNAL FLOW</span>
                    <span><i className="legend-dot secondary" /> ACTIVITY</span>
                  </div>
                </div>

                <div className="monitor-side-panel">
                  <div className="panel-title mono">
                    <span>ENVIRONMENT</span>
                    <Activity size={13} />
                  </div>

                  <div className="environment-list">
                    <div className="environment-item">
                      <Server size={17} />
                      <div><strong>Infrastructure</strong><span className="mono">GUARDED</span></div>
                      <ShieldCheck size={15} />
                    </div>
                    <div className="environment-item">
                      <Database size={17} />
                      <div><strong>Data layer</strong><span className="mono">MONITORED</span></div>
                      <ShieldCheck size={15} />
                    </div>
                    <div className="environment-item">
                      <Radio size={17} />
                      <div><strong>Security signals</strong><span className="mono">VISIBLE</span></div>
                      <ShieldCheck size={15} />
                    </div>
                  </div>
                </div>

                <div className="monitor-events-panel">
                  <div className="panel-title mono">
                    <span>SECURITY EVENTS</span>
                    <span>CONTEXT</span>
                  </div>

                  <div className="event-list">
                    <div className="security-event">
                      <span className="event-indicator normal" />
                      <div><strong>Authentication signal</strong><span className="mono">ANALYSED</span></div>
                      <time className="mono">14:02</time>
                    </div>
                    <div className="security-event">
                      <span className="event-indicator review" />
                      <div><strong>New network signal</strong><span className="mono">REVIEW</span></div>
                      <time className="mono">14:04</time>
                    </div>
                    <div className="security-event">
                      <span className="event-indicator normal" />
                      <div><strong>Endpoint activity</strong><span className="mono">CORRELATED</span></div>
                      <time className="mono">14:07</time>
                    </div>
                    <div className="security-event">
                      <span className="event-indicator alert" />
                      <div><strong>Unusual behaviour</strong><span className="mono">INVESTIGATE</span></div>
                      <time className="mono">14:09</time>
                    </div>
                  </div>
                </div>

                <div className="monitor-status-panel">
                  <div className="status-orbit">
                    <div className="orbit-ring orbit-one" />
                    <div className="orbit-ring orbit-two" />
                    <div className="orbit-core"><ShieldCheck size={25} /></div>
                  </div>
                  <div>
                    <span className="monitor-kicker mono">DEFENSIVE POSTURE</span>
                    <strong>Continuous visibility</strong>
                    <p>Designed to connect security signals with investigation and response.</p>
                  </div>
                </div>
              </div>

              <div className="monitor-footer mono">
                <span><span className="status-pulse" /> VISUAL DEMONSTRATION</span>
                <span>NOT A LIVE SECURITY FEED</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* =========================================
          WHO WE ARE / APPROACH
      ========================================= */}

      <section
        className="who-we-are-section"
        id="approach"
      >

        <div className="shell who-we-are-layout">

          <Reveal>

            <div className="who-we-are-content">

              <div className="section-label mono">
                05 / WHO WE ARE
              </div>

              <h2>
                Security is a continuous process, not a one-time fix.
              </h2>

              <p>
                VerideumDefence brings cybersecurity, digital forensics, vulnerability assessment, and incident-response capabilities together around the systems and risks that matter to you.
              </p>

              <p>
                One security mindset. Multiple defensive capabilities. We don't just sell tools—we build partnerships that help you understand, protect, and respond to threats in real time.
              </p>

              <p>
                We treat cybersecurity as a connected process involving <span className="highlight">understanding your environment</span>, <span className="highlight">identifying vulnerabilities</span>, <span className="highlight">investigating incidents</span>, and <span className="highlight">responding effectively</span>.
              </p>

              <a
                className="button-primary"
                href="#contact"
              >
                Discuss your security need <ArrowRight />
              </a>

            </div>

          </Reveal>


          <Reveal className="delay-1">

            <div className="visual-panel" aria-label="VerideumDefence security principles">

              <div className="security-pulse" />

              <div className="orbit-ring orbit-ring-1" />
              <div className="orbit-ring orbit-ring-2" />
              <div className="orbit-ring orbit-ring-3" />

              <div className="panel-content">

                <div className="panel-brand">
                  <span className="panel-brand-text mono">VERIDEUMDEFENCE</span>
                  <span className="panel-brand-text mono">SECURITY / FORENSICS</span>
                </div>

                <p className="panel-subtitle">
                  One security mindset. Multiple defensive capabilities.
                </p>

                <div className="process-list">
                  <div className="process-item">Understanding the environment</div>
                  <div className="process-item">Identifying exposure</div>
                  <div className="process-item">Investigation</div>
                  <div className="process-item">Response</div>
                </div>

                <div className="principles-grid">
                  <div className="principle-card">
                    <span className="principle-number mono">01</span>
                    <span className="principle-text">Understand first</span>
                  </div>

                  <div className="principle-card">
                    <span className="principle-number mono">02</span>
                    <span className="principle-text">Make findings actionable</span>
                  </div>

                  <div className="principle-card">
                    <span className="principle-number mono">03</span>
                    <span className="principle-text">Connect the lifecycle</span>
                  </div>

                  <div className="principle-card">
                    <span className="principle-number mono">04</span>
                    <span className="principle-text">Keep scope clear</span>
                  </div>
                </div>

                <div className="lifecycle-indicator mono">
                  <span className="lifecycle-step">PREVENT</span>
                  <span className="lifecycle-divider" />
                  <span className="lifecycle-step">INVESTIGATE</span>
                  <span className="lifecycle-divider" />
                  <span className="lifecycle-step">RESPOND</span>
                </div>

              </div>

            </div>

          </Reveal>

        </div>

      </section>


      {/* =========================================
          SECURITY PRINCIPLES / CREDIBILITY
      ========================================= */}

      <section
        className="principles-section"
        id="principles"
      >

        <div className="shell">

          <Reveal>

            <div className="principles-intro">

              <div className="section-label mono">
                06 / SECURITY PRINCIPLES
              </div>

              <h2>
                Built around practical security.
              </h2>

              <p>
                Security work should be based on defined scope, evidence, context, and actionable findings — not marketing claims.
              </p>

            </div>

          </Reveal>


          <Reveal className="delay-1">

            <div className="principles-display">

              <article className="principle-item">
                <span className="principle-number mono">01</span>
                <h3 className="principle-title">Scope-first engagements</h3>
                <p className="principle-desc">
                  Every engagement starts by understanding the systems, objectives, and constraints involved.
                </p>
              </article>

              <article className="principle-item">
                <span className="principle-number mono">02</span>
                <h3 className="principle-title">Evidence-driven investigation</h3>
                <p className="principle-desc">
                  Findings are based on verifiable evidence, not assumptions or generic checklists.
                </p>
              </article>

              <article className="principle-item">
                <span className="principle-number mono">03</span>
                <h3 className="principle-title">Practical remediation</h3>
                <p className="principle-desc">
                  Recommendations focus on realistic, implementable security improvements.
                </p>
              </article>

              <article className="principle-item">
                <span className="principle-number mono">04</span>
                <h3 className="principle-title">Security-aware education</h3>
                <p className="principle-desc">
                  Training and guidance are grounded in real-world security scenarios.
                </p>
              </article>

              <article className="principle-item">
                <span className="principle-number mono">05</span>
                <h3 className="principle-title">Defensive thinking</h3>
                <p className="principle-desc">
                  Approach prioritizes understanding attacker behavior and defensive posture.
                </p>
              </article>

              <article className="principle-item">
                <span className="principle-number mono">06</span>
                <h3 className="principle-title">Clear communication</h3>
                <p className="principle-desc">
                  Findings are communicated clearly with context and actionable next steps.
                </p>
              </article>

            </div>

          </Reveal>


          <Reveal className="delay-2">

            <div className="principles-statement">
              <p>
                <strong>Responsible security work.</strong> We handle information carefully, maintain clear scope boundaries, and provide findings that can be acted upon without unnecessary complexity.
              </p>
            </div>

          </Reveal>

        </div>

      </section>


      {/* =========================================
          FAQ
      ========================================= */}

      <section
        className="section"
        aria-labelledby="faq-heading"
      >

        <div className="shell faq-grid">

          <Reveal>

            <div>

              <div className="section-label mono">
                07 / QUESTIONS, ANSWERED
              </div>

              <h2 id="faq-heading">
                Useful answers before your next security decision.
              </h2>

              <p>
                Tell us what you are trying to protect, assess, or
                investigate.
              </p>

            </div>

          </Reveal>


          <Reveal className="delay-1">

            <div className="faq-list">

              {faqs.map((faq, index) => {

                const isOpen = openFaq === index;

                return (

                  <div
                    className="faq-item"
                    key={faq.question}
                  >

                    <button
                      className={`faq-question ${isOpen ? 'open' : ''
                        }`}
                      aria-expanded={isOpen}
                      onClick={() =>
                        setOpenFaq(
                          isOpen ? null : index
                        )
                      }
                    >

                      <span>{faq.question}</span>

                      {isOpen ? (
                        <Minus size={18} />
                      ) : (
                        <Plus size={18} />
                      )}

                    </button>

                    <div
                      className={`faq-answer ${isOpen ? 'open' : ''
                        }`}
                    >

                      <div>
                        <p>{faq.answer}</p>
                      </div>

                    </div>

                  </div>

                );
              })}

            </div>

          </Reveal>

        </div>

      </section>


      {/* =========================================
          CONTACT
      ========================================= */}

      <section
        className="contact-section"
        id="contact"
      >

        <div className="shell contact-layout">

          <Reveal>

            <div>

              <div className="section-label mono">
                08 / TALK TO VERIDEUMDEFENCE
              </div>

              <h2>
                Ready to strengthen your security?
              </h2>

              <p>
                Tell us what you are trying to protect, assess, or
                investigate. We will use that context to understand
                the right next step.
              </p>

            </div>

          </Reveal>


          <Reveal className="delay-1">
            <div className="assessment-card">
              <div className="assessment-card-header">
                <div>
                  <span className="assessment-kicker mono">SECURITY INTAKE / INITIAL SCOPE</span>
                  <h3>Tell us what needs attention.</h3>
                </div>
                <div className="assessment-code mono">VD / 05</div>
              </div>

              {submitted ? (
                <div className="assessment-success" role="status">
                  <div className="assessment-success-icon"><Check size={24} /></div>
                  <span className="assessment-kicker mono">REQUEST RECEIVED</span>
                  <strong>Thank you. Your request has been sent.</strong>
                  <p>
                    Our team can now review the information you shared and follow up by email.
                  </p>
                  <button className="button-quiet" type="button" onClick={() => setSubmitted(false)}>
                    Submit another request <ArrowRight />
                  </button>
                </div>
              ) : (
                <form className="assessment-form" onSubmit={submitInquiry}>
                  <div className="assessment-grid">
                    <label>
                      Name
                      <input required name="name" autoComplete="name" placeholder="Your name" />
                    </label>

                    <label>
                      Work email
                      <input required type="email" name="email" autoComplete="email" placeholder="you@company.com" />
                    </label>

                    <label>
                      Organization
                      <input name="company" autoComplete="organization" placeholder="Company or organization" />
                    </label>

                    <label>
                      Security need
                      <select required name="securityNeed" defaultValue="">
                        <option value="" disabled>Select an area</option>
                        <option value="security_assessment">Security assessment</option>
                        <option value="vulnerability_assessment">Vulnerability assessment</option>
                        <option value="digital_forensics">Digital forensics / investigation</option>
                        <option value="incident_response">Incident response</option>
                        <option value="network_protection">Network protection</option>
                        <option value="cybersecurity_training">Cybersecurity training</option>
                        <option value="general_consultation">General consultation</option>
                      </select>
                    </label>
                  </div>

                  <label>
                    What are you trying to protect, assess, or investigate?
                    <textarea required name="message" rows={5} placeholder="Briefly describe the environment, security concern, or objective." />
                  </label>

                  <p className="assessment-security-notice mono">
                    <AlertTriangle size={13} />
                    Do not submit passwords, API keys, private keys, credentials, or sensitive evidence through this form.
                  </p>

                  <div className="assessment-form-bottom">
                    <p className="assessment-disclaimer">
                      <ShieldCheck size={15} />
                      Initial scope only. Engagement details, deliverables, and access requirements are discussed separately.
                    </p>
                    <button className="button-primary" type="submit" disabled={submitting}>
                      {submitting ? 'Sending…' : 'Request an assessment'} <ArrowRight />
                    </button>
                  </div>
                  {contactError && <p className="assessment-error" role="alert">{contactError}</p>}
                </form>
              )}
            </div>
          </Reveal>

        </div>

      </section>


      <section className="section" aria-labelledby="feedback-heading">
        <div className="shell contact-layout">
          <div>
            <div className="section-label mono">09 / YOUR FEEDBACK</div>
            <h2 id="feedback-heading">Help us improve.</h2>
            <p>Share your experience with VerideumDefence. Reviews are sent to our team for follow-up.</p>
          </div>
          <div className="assessment-card">
            {reviewSubmitted ? (
              <div className="assessment-success" role="status">
                <div className="assessment-success-icon"><Check size={24} /></div>
                <strong>Thank you for sharing your feedback.</strong>
                <p>Your review has been received by our team.</p>
                <button className="button-quiet" type="button" onClick={() => setReviewSubmitted(false)}>Send another review <ArrowRight /></button>
              </div>
            ) : (
              <form className="assessment-form" onSubmit={submitReview}>
                <label>Your name<input required name="reviewerName" maxLength={120} placeholder="Your name" /></label>
                <label>Rating<select required name="rating" defaultValue=""><option value="" disabled>Select a rating</option><option value="5">5 — Excellent</option><option value="4">4 — Very good</option><option value="3">3 — Good</option><option value="2">2 — Fair</option><option value="1">1 — Poor</option></select></label>
                <label>Your review<textarea required name="review" minLength={5} maxLength={2000} rows={4} placeholder="Tell us about your experience" /></label>
                <button className="button-primary" type="submit" disabled={reviewSubmitting}>{reviewSubmitting ? 'Sending…' : 'Submit review'} <ArrowRight /></button>
                {reviewError && <p className="assessment-error" role="alert">{reviewError}</p>}
              </form>
            )}
          </div>
        </div>
      </section>

      {/* =========================================
          FOOTER
      ========================================= */}

      <footer className="footer">

        <div className="shell">

          <div className="footer-top">

            <div>

              <a
                href="#top"
                className="brand"
              >
                <Brand />
              </a>

              <p className="footer-tagline">
                The Ultimate Shield for Your Digital World.
              </p>

              <div className="footer-services">
                <h4 className="footer-services-title mono">SERVICES</h4>
                <ul className="footer-services-list">
                  <li>Digital Forensics & Incident Response</li>
                  <li>Vulnerability Assessment & Bug Bounty</li>
                  <li>Enterprise Network Protection</li>
                  <li>Cybersecurity Training & Education</li>
                </ul>
              </div>

            </div>


            <div className="footer-links">

              <a href="#platform">
                Capabilities
              </a>

              <a href="#services">
                Who we serve
              </a>

              <a href="#protection">
                How we protect
              </a>

              <a href="#approach">
                Who we are
              </a>

              <a href="#principles">
                Security principles
              </a>

              <a href="#contact">
                Contact
              </a>

            </div>

          </div>

          <div className="footer-bottom">

            <span>
              © 2026 VerideumDefence
            </span>

            <span>
              Cybersecurity • Digital Forensics • Incident Response
            </span>

          </div>

        </div>

      </footer>

    </main>
  );
}


function ProtectedAdminRoute({ component: Component }: { component: ComponentType }) {
  const [, setLocation] = useLocation();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const ensureAdminAccess = async () => {
      if (!auth.isAuthenticated()) {
        setAuthorized(false);
        setLocation('/admin/login');
        return;
      }

      try {
        const user = await auth.getCurrentUser();
        if (!user?.is_admin) {
          auth.logout();
          setAuthorized(false);
          setLocation('/admin/login');
          return;
        }

        setAuthorized(true);
      } catch {
        auth.logout();
        setAuthorized(false);
        setLocation('/admin/login');
      }
    };

    void ensureAdminAccess();
  }, [setLocation]);

  if (authorized === false || authorized === null) {
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>

        {/* Public site */}
        <Route
          path="/"
          component={Home}
        />

        {/* Admin routes */}
        <Route
          path="/admin/login"
          component={AdminLogin}
        />
        <Route
          path="/admin/dashboard"
          component={() => <ProtectedAdminRoute component={AdminDashboard} />}
        />
        <Route
          path="/admin/requests"
          component={() => <ProtectedAdminRoute component={AdminRequests} />}
        />
        <Route
          path="/admin/clients"
          component={() => <ProtectedAdminRoute component={AdminClients} />}
        />
        <Route
          path="/admin/projects"
          component={() => <ProtectedAdminRoute component={AdminProjects} />}
        />
        <Route
          path="/admin/tickets"
          component={() => <ProtectedAdminRoute component={AdminTickets} />}
        />
        <Route
          path="/admin/messages"
          component={() => <ProtectedAdminRoute component={AdminMessages} />}
        />
        <Route
          path="/admin/team"
          component={() => <ProtectedAdminRoute component={AdminTeam} />}
        />
        <Route
          path="/admin/audit-logs"
          component={() => <ProtectedAdminRoute component={AdminAuditLogs} />}
        />
        <Route
          path="/admin/settings"
          component={() => <ProtectedAdminRoute component={AdminSettings} />}
        />

        {/* Error pages */}
        <Route
          path="/403"
          component={Error403}
        />
        <Route
          path="/500"
          component={Error500}
        />

        {/* Fallback 404 */}
        <Route
          component={Error404}
        />

      </Switch>
    </RoutedErrorBoundary>
  );
}


function RoutedErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const [location] = useLocation();

  return (
    <ErrorBoundary resetKey={location}>
      {children}
    </ErrorBoundary>
  );
}


function App() {
  return (
    <QueryClientProvider client={queryClient}>

      <TooltipProvider>

        <WouterRouter
          base={import.meta.env.BASE_URL.replace(/\/$/, '')}
        >

          <Router />

        </WouterRouter>

        <Toaster />

      </TooltipProvider>

    </QueryClientProvider>
  );
}


export default App;
