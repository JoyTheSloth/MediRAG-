import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ScrambledText from '../components/ScrambledText';
import CardSwap, { Card } from '../components/CardSwap';
import './home-mobile.css';

const Home = () => {
    useEffect(() => {
        const counters = document.querySelectorAll('.counter');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const obj = entry.target;
                    const target = +obj.getAttribute('data-target');
                    if(target === 0) return;
                    let count = 0;
                    const duration = 2000;
                    const increment = target / (duration / 16);
                    const updateCount = () => {
                        count += increment;
                        if(count < target) {
                            obj.innerText = Math.ceil(count);
                            requestAnimationFrame(updateCount);
                        } else {
                            obj.innerText = target;
                        }
                    };
                    updateCount();
                    observer.unobserve(obj);
                }
            });
        }, { threshold: 0.5 });
        counters.forEach(c => observer.observe(c));
    }, []);

    const fadeInUp = {
        initial: { opacity: 0, y: 40 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-100px" },
        transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    };

    const fadeInLeft = {
        initial: { opacity: 0, x: -40 },
        whileInView: { opacity: 1, x: 0 },
        viewport: { once: true },
        transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    };

    const fadeInRight = {
        initial: { opacity: 0, x: 40 },
        whileInView: { opacity: 1, x: 0 },
        viewport: { once: true },
        transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    };

    const staggerContainer = {
        initial: { opacity: 0 },
        whileInView: { 
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        },
        viewport: { once: true }
    };

  return (
    <>

    <header id="home" className="hero-section">
        <div className="hero-container">
            <motion.div className="hero-left" {...fadeInLeft}>
                <div className="badge badge-outline">
                    <span className="shield-icon">🛡</span> Clinical Safety Middleware Gateway · India Innovates 2026
                </div>
                <h1 className="main-title">
                    Clinical Safety &<br/>
                    <span className="gradient-text-danger">
                        <ScrambledText radius={150}>Verification</ScrambledText>
                    </span><br/>
                    Middleware Proxy.
                </h1>
                <p className="subheadline">
                    MediRAG 2.0 acts as a decoupled safety gateway proxy between untrusted LLMs and clinical databases. It actively intercepts, redacts, and mathematically validates medical AI outputs in real-time.
                </p>
                <div className="cta-group">
                    <Link to="/chat" className="primary-btn large cursor-target" style={{textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'6px'}}>Try Live Demo →</Link>
                    <Link to="/api-docs" className="secondary-btn large cursor-target" style={{textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'6px'}}>Read the Docs</Link>
                </div>

                <div className="cursor-demo-section">
                    <h4 className="demo-label">CROSSHAIR SYSTEM READY</h4>
                    <p className="demo-text">Hover over the interactive elements below to test the targeting system.</p>
                    <div className="demo-actions">
                        <button className="cursor-target demo-btn">Target Lock Component</button>
                        <div className="cursor-target demo-box">Interference Zone</div>
                    </div>
                </div>

                <div className="trust-indicators">
                    <span className="trust-item"><span className="check-icon">✓</span> Zero paid APIs</span>
                    <span className="trust-item"><span className="check-icon">✓</span> Runs on free Colab</span>
                    <span className="trust-item"><span className="check-icon">✓</span> 100% open source</span>
                </div>

            </motion.div>

            <motion.div className="hero-right" {...fadeInRight}>
                <div style={{ height: '550px', width: '100%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <CardSwap
                        width={820}
                        height={480}
                        cardDistance={60}
                        verticalDistance={45}
                        delay={6000}
                        pauseOnHover={true}
                        skewAmount={3}
                    >
                        {/* CARD 1: OVERVIEW */}
                        <Card customClass="audit-card">
                            <div className="card-header">
                                <div className="card-label">Middleware Gateway · Live Audit</div>
                                <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                            </div>
                            <div className="card-body">
                                <div className="audit-card-body">
                                    <div className="audit-info-main">
                                        <div className="query-meta">
                                            <div className="query-text">
                                                <span className="query-label">INPUT:</span> Dosage of metformin for T2 diabetes?
                                            </div>
                                            <div className="query-status">
                                                <span className="status-bit">200 OK</span>
                                                <span className="status-bit">MIDDLEWARE:PROXY</span>
                                                <span className="status-bit">RAG:ACTIVE</span>
                                            </div>
                                        </div>
                                        <div className="divider"></div>
                                        <div className="risk-indicator-row">
                                            <span className="card-risk-badge orange-badge">HIGH RISK DETECTED</span>
                                        </div>
                                        <p className="audit-description">
                                            Significant divergence between model output and verified clinical source documents (PubMed/NICE).
                                        </p>
                                    </div>
                                    <div className="card-gauge-wrapper">
                                        <svg className="card-gauge-svg" viewBox="0 0 120 120">
                                            <path className="card-gauge-bg" d="M 20 95 A 50 50 0 1 1 100 95" fill="none" strokeWidth="8" strokeLinecap="round"/>
                                            <path className="card-gauge-fill orange-fill pulse-ani" d="M 20 95 A 50 50 0 1 1 100 95" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="165 235" stroke="#F5A623" />
                                        </svg>
                                        <div className="card-gauge-content">
                                            <div className="card-gauge-number">67</div>
                                            <div className="card-gauge-label">RISK</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* CARD 2: METRICS */}
                        <Card customClass="audit-card">
                            <div className="card-header">
                                <div className="card-label">Safety Metrics · Technical Analysis</div>
                                <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                            </div>
                            <div className="card-body">
                                <div className="metrics-grid">
                                    {[
                                        { name: 'Faithfulness', val: '0.45', color: 'red' },
                                        { name: 'Entity Accuracy', val: '0.60', color: 'amber' },
                                        { name: 'Source Credib.', val: '0.80', color: 'green' },
                                        { name: 'Consistency', val: '0.28', color: 'red' },
                                    ].map((m, i) => (
                                        <div key={i} className="metric-row">
                                            <div className="metric-info">
                                                <span className="metric-name">{m.name}</span>
                                                <span className={`metric-val ${m.color}-text`}>{m.val}</span>
                                            </div>
                                            <div className="metric-progress">
                                                <div className={`metric-bar ${m.color}-bg`} style={{ width: `${parseFloat(m.val)*100}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="telemetry-row">
                                    {[
                                        { l: 'LATENCY', v: '2.4s', c: '#10B981' },
                                        { l: 'UPTIME', v: '99.9%', c: '#3B82F6' },
                                        { l: 'QUERIES', v: '1.2k', c: '#F5A623' },
                                        { l: 'TOKENS', v: '4.8k', c: 'rgba(255,255,255,0.6)' },
                                    ].map((t, i) => (
                                        <div key={i} className="telemetry-item">
                                            <div className="telemetry-label">{t.l}</div>
                                            <div className="telemetry-val" style={{color: t.c}}>{t.v}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>

                        {/* CARD 3: TRACE LOG */}
                        <Card customClass="audit-card">
                            <div className="card-header">
                                <div className="card-label">Audit Trace Log · Real-time Stream</div>
                                <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                            </div>
                            <div className="card-body">
                                <div className="trace-container">
                                    <div className="trace-line err">
                                        <span className="t-prefix">[ERR]</span> Claims extraction mismatch at clause 2.
                                    </div>
                                    <div className="trace-line warn">
                                        <span className="t-prefix">[WARN]</span> Unverified dosage entity: 850mg tid.
                                    </div>
                                    <div className="trace-line success">
                                        <span className="t-prefix">[OK]</span> Source Tier 1 verified (PubMed RCT).
                                    </div>
                                    <div className="trace-line warn">
                                        <span className="t-prefix">[WARN]</span> Potential contradiction in paragraph 3.
                                    </div>
                                    <div className="trace-line success">
                                        <span className="t-prefix">[OK]</span> Patient privacy redact protocol applied.
                                    </div>
                                </div>
                                <div className="scan-line"></div>
                            </div>
                        </Card>
                    </CardSwap>
                </div>
            </motion.div>
        </div>
    </header>

    
    <section className="stats-band">
        <div className="stats-shimmer"></div>
        <motion.div className="stats-container" {...fadeInUp}>
            <div className="stat-item">
                <div className="stat-value counter" data-target="4">0</div>
                <div className="stat-label">Middleware Safety Modules</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
                <div className="stat-value">&lt; <span className="counter" data-target="30">0</span>s</div>
                <div className="stat-label">Middleware Interception Time</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
                <div className="stat-value"><span className="counter" data-target="11">0</span> Lakh+</div>
                <div className="stat-label">Knowledge Base Chunks</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
                <div className="stat-value counter" data-target="0">0</div>
                <div className="stat-label">Paid Cloud APIs Required</div>
            </div>
        </motion.div>
    </section>

    
    <section className="section" id="how-it-works">
        <div className="section-container">
            <motion.div className="framework-header" {...fadeInUp}>
                <div className="fh-left">
                    <div className="section-label" style={{justifyContent: 'flex-start', color: '#10B981', letterSpacing: '2px', fontSize: '12px'}}>MIDDLEWARE SECURITY PIPELINE</div>
                    <h2 className="section-title" style={{textAlign: 'left', marginTop: '10px', fontSize: 'clamp(28px, 4vw, 42px)', marginBottom: '0'}}>Clinical Middleware Verification Gates</h2>
                </div>
                <div className="fh-right">
                    <div className="fh-quote">
                        "Deploying medical LLMs without verification is a liability. We provide the mathematical proof of clinical safety."
                    </div>
                </div>
            </motion.div>

            <style>
            {`
            .framework-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 50px;
                gap: 60px;
            }
            .fh-left {
                flex: 1;
                max-width: 600px;
            }
            .fh-left .section-label::after {
                display: none;
            }
            .fh-right {
                flex: 1;
                max-width: 450px;
                display: flex;
                align-items: center;
                border-left: 1px solid rgba(255,255,255,0.1);
                padding-left: 24px;
                margin-top: 24px;
            }
            .fh-quote {
                color: #64748B;
                font-style: italic;
                font-size: 16px;
                line-height: 1.6;
            }
            .framework-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
            }
            .framework-card {
                background: linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%);
                border: 1px solid rgba(255,255,255,0.05);
                border-radius: 16px;
                padding: 32px 24px;
                display: flex;
                flex-direction: column;
                transition: all 0.3s ease;
                text-align: left;
            }
            .framework-card:hover {
                background: linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
                border-color: rgba(255,255,255,0.1);
                transform: translateY(-4px);
            }
            .fc-icon {
                width: 44px;
                height: 44px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 24px;
            }
            .fc-title {
                color: #F8FAFC;
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 16px;
                text-align: left;
            }
            .fc-desc {
                color: #94A3B8;
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 32px;
                flex-grow: 1;
                text-align: left;
            }
            .fc-tag {
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                text-align: left;
            }
            
            /* Color variants */
            .fc-green .fc-icon { background: rgba(16, 185, 129, 0.15); color: #34D399; }
            .fc-green .fc-tag { color: #10B981; }
            
            .fc-blue .fc-icon { background: rgba(59, 130, 246, 0.15); color: #93C5FD; }
            .fc-blue .fc-tag { color: #60A5FA; }
            
            .fc-amber .fc-icon { background: rgba(245, 158, 11, 0.15); color: #FCD34D; }
            .fc-amber .fc-tag { color: #F59E0B; }
            
            .fc-rose .fc-icon { background: rgba(225, 29, 72, 0.15); color: #FDA4AF; }
            .fc-rose .fc-tag { color: #E11D48; }

            /* Light mode overrides inside style tag to be safe */
            [data-theme="light"] .framework-header .section-title { color: #1A1F36; }
            [data-theme="light"] .fh-right { border-left-color: rgba(0,0,0,0.1); }
            [data-theme="light"] .fh-quote { color: #4B5563; }
            
            [data-theme="light"] .framework-card { 
                border: 1px solid rgba(0,0,0,0.05);
                box-shadow: 0 4px 12px rgba(0,0,0,0.03); 
                transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }
            
            [data-theme="light"] .fc-green { background: linear-gradient(135deg, #10B981, #059669); }
            [data-theme="light"] .fc-blue { background: linear-gradient(135deg, #3B82F6, #2563EB); }
            [data-theme="light"] .fc-amber { background: linear-gradient(135deg, #F59E0B, #D97706); }
            [data-theme="light"] .fc-rose { background: linear-gradient(135deg, #E11D48, #BE123C); }

            [data-theme="light"] .framework-card .fc-title,
            [data-theme="light"] .framework-card .fc-desc,
            [data-theme="light"] .framework-card .fc-tag,
            [data-theme="light"] .framework-card .fc-icon {
                color: #FFFFFF !important;
            }

            [data-theme="light"] .framework-card .fc-icon {
                background: rgba(255, 255, 255, 0.2) !important;
            }

            [data-theme="light"] .framework-card:hover {
                transform: translateY(-10px) scale(1.02);
                box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                filter: brightness(1.1);
            }

            @media (max-width: 1024px) {
                .framework-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
                .framework-header { flex-direction: column; gap: 20px; text-align: left; }
                .fh-right { margin-top: 0; padding-left: 16px; width: 100%; max-width: 100%; }
            }
            @media (max-width: 640px) {
                .framework-grid { grid-template-columns: 1fr; }
            }
            `}
            </style>

            <motion.div className="framework-grid" {...staggerContainer}>
                
                <motion.div className="framework-card fc-green" variants={fadeInUp}>
                    <div className="fc-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <h3 className="fc-title">Faithfulness Scoring</h3>
                    <p className="fc-desc">NLI-based claim entailment utilizing fine-tuned DeBERTa-v3 to verify if the LLM output is grounded in provided context.</p>
                    <div className="fc-tag">MIDDLEWARE NLI SHIELD</div>
                </motion.div>

                <motion.div className="framework-card fc-blue" variants={fadeInUp}>
                    <div className="fc-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                    </div>
                    <h3 className="fc-title">Entity Verification</h3>
                    <p className="fc-desc">Drug & dosage cross-check via SciSpaCy NER and DrugBank validation to prevent lethal dosage hallucinations.</p>
                    <div className="fc-tag">MIDDLEWARE NER GATE</div>
                </motion.div>

                <motion.div className="framework-card fc-amber" variants={fadeInUp}>
                    <div className="fc-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 22v-8h16v8H4zm2-6v4h4v-4H6zm6 0v4h4v-4h-4zm0-14v10h4V2h-4zM6 8v4h4V8H6z"/></svg>
                    </div>
                    <h3 className="fc-title">Source Credibility</h3>
                    <p className="fc-desc">Hierarchical ranking of medical literature, from RCT meta-analyses to case reports and grey literature.</p>
                    <div className="fc-tag">MIDDLEWARE SOURCE TIERING</div>
                </motion.div>

                <motion.div className="framework-card fc-rose" variants={fadeInUp}>
                    <div className="fc-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 3.5l7.5 13.5h-15L12 5.5zM11 10v4h2v-4h-2zm0 5v2h2v-2h-2z"/></svg>
                    </div>
                    <h3 className="fc-title">Contradiction Detection</h3>
                    <p className="fc-desc">Advanced internal consistency checking across sentences and paragraphs to detect self-contradictory reasoning.</p>
                    <div className="fc-tag">MIDDLEWARE CONTRADICTION CHECK</div>
                </motion.div>

            </motion.div>
        </div>
    </section>

    
    <section className="section" id="risk-bands">
        <div className="section-container">
            <motion.div className="section-header" {...fadeInUp}>
                <div className="section-label home-section-label">RISK SCORING</div>
                <h2 className="section-title">Know Exactly How Risky Every Answer Is</h2>
            </motion.div>
            
            <motion.div className="risk-grid" {...staggerContainer}>

                {/* LOW RISK */}
                <div className="risk-card-v2 risk-low">
                    <div className="rc-bg-img"><img src="/risk_low.png" alt="Low Risk Visual" /></div>
                    <div className="rc-orb rc-orb-1"></div>
                    <div className="rc-orb rc-orb-2"></div>
                    <div className="rc-top">
                        <div className="rc-score">0–30</div>
                        <div className="rc-icon-ring">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                        </div>
                    </div>
                    <div className="rc-bottom">
                        <div className="rc-badge rc-badge-low">LOW RISK</div>
                        <div className="rc-title">Clinically Safe</div>
                        <div className="rc-desc">Faithful, verified, credible output. Safe for clinical review.</div>
                        <div className="rc-action">Safe to use ↗</div>
                    </div>
                </div>

                {/* MODERATE RISK */}
                <div className="risk-card-v2 risk-mod">
                    <div className="rc-bg-img"><img src="/risk_mod.png" alt="Moderate Risk Visual" /></div>
                    <div className="rc-orb rc-orb-1"></div>
                    <div className="rc-orb rc-orb-2"></div>
                    <div className="rc-top">
                        <div className="rc-score">31–60</div>
                        <div className="rc-icon-ring">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                    </div>
                    <div className="rc-bottom">
                        <div className="rc-badge rc-badge-mod">MODERATE RISK</div>
                        <div className="rc-title">Review Needed</div>
                        <div className="rc-desc">Minor mismatches detected. Human review strongly recommended.</div>
                        <div className="rc-action">Review ↗</div>
                    </div>
                </div>

                {/* HIGH RISK */}
                <div className="risk-card-v2 risk-high">
                    <div className="rc-bg-img"><img src="/risk_high.png" alt="High Risk Visual" /></div>
                    <div className="rc-orb rc-orb-1"></div>
                    <div className="rc-orb rc-orb-2"></div>
                    <div className="rc-top">
                        <div className="rc-score">61–85</div>
                        <div className="rc-icon-ring">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        </div>
                    </div>
                    <div className="rc-bottom">
                        <div className="rc-badge rc-badge-high">HIGH RISK</div>
                        <div className="rc-title">Expert Check</div>
                        <div className="rc-desc">Multiple unsupported claims or entity errors. Clinical expert required.</div>
                        <div className="rc-action">Escalate ↗</div>
                    </div>
                </div>

                {/* CRITICAL RISK */}
                <motion.div className="risk-card-v2 risk-crit" variants={fadeInUp}>
                    <div className="rc-bg-img"><img src="/risk_crit.png" alt="Critical Risk Visual" /></div>
                    <div className="rc-orb rc-orb-1"></div>
                    <div className="rc-orb rc-orb-2"></div>
                    <div className="rc-top">
                        <div className="rc-score">86–100</div>
                        <div className="rc-icon-ring">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        </div>
                    </div>
                    <div className="rc-bottom">
                        <div className="rc-badge rc-badge-crit">CRITICAL RISK</div>
                        <div className="rc-title">Block Immediately</div>
                        <div className="rc-desc">Severe hallucinations. Contradictions or critical entity errors found.</div>
                        <div className="rc-action">Block ↗</div>
                    </div>
                </motion.div>

            </motion.div>
        </div>
    </section>

    
    <section className="section" id="tech-stack">
        <div className="section-container">
            <motion.div className="section-header" {...fadeInUp}>
                <div className="section-label home-section-label">TECHNOLOGY</div>
                <h2 className="section-title">Built on Best-in-Class Open Source Tools</h2>
                <p className="section-subtitle">Every component is free, reproducible, and runs without any paid API.</p>
            </motion.div>
            
            <motion.div className="tech-grid" {...staggerContainer}>
                <motion.div className="tech-card" variants={fadeInUp}>
                    <div className="tech-icon" style={{color:'#FF6B6B'}}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    </div>
                    <div className="tech-name">BioBERT</div>
                    <div className="tech-purpose">Document Embeddings</div>
                </motion.div>
                <motion.div className="tech-card" variants={fadeInUp}>
                    <div className="tech-icon" style={{color:'#00C2FF'}}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 12h4l2-4 2 8 2-4h2"/></svg>
                    </div>
                    <div className="tech-name">DeBERTa-v3</div>
                    <div className="tech-purpose">NLI Faithfulness Scoring</div>
                </motion.div>
                <motion.div className="tech-card" variants={fadeInUp}>
                    <div className="tech-icon" style={{color:'var(--green-accent)'}}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
                    <div className="tech-name">SciSpaCy</div>
                    <div className="tech-purpose">Biomedical NER</div>
                </motion.div>
                <motion.div className="tech-card" variants={fadeInUp}>
                    <div className="tech-icon" style={{color:'var(--amber-accent)'}}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                    </div>
                    <div className="tech-name">FAISS</div>
                    <div className="tech-purpose">Vector Similarity Search</div>
                </motion.div>
                <motion.div className="tech-card" variants={fadeInUp}>
                    <div className="tech-icon" style={{color:'#A78BFA'}}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    </div>
                    <div className="tech-name">LangChain</div>
                    <div className="tech-purpose">RAG Pipeline</div>
                </motion.div>
                <div className="tech-card">
                    <div className="tech-icon" style={{color:'var(--green-accent)'}}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    </div>
                    <div className="tech-name">RAGAS</div>
                    <div className="tech-purpose">Evaluation Metrics</div>
                </div>
                <div className="tech-card">
                    <div className="tech-icon" style={{color:'#F97316'}}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
                    </div>
                    <div className="tech-name">Mistral-7B</div>
                    <div className="tech-purpose">Local LLM Judge (Ollama)</div>
                </div>
                <div className="tech-card">
                    <div className="tech-icon" style={{color:'#34D399'}}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    </div>
                    <div className="tech-name">FastAPI</div>
                    <div className="tech-purpose">REST Endpoint</div>
                </div>
                <div className="tech-card">
                    <div className="tech-icon" style={{color:'#60A5FA'}}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                    </div>
                    <div className="tech-name">React / GSAP UI</div>
                    <div className="tech-purpose">High-Fidelity Command Center</div>
                </div>

            </motion.div>
        </div>
    </section>

    <section className="section" id="datasets">
        <div className="section-container">
            <motion.div className="section-header" {...fadeInUp}>
                <div className="section-label home-section-label">DATA SOURCES</div>
                <h2 className="section-title">Verified Clinical Knowledge Bases</h2>
                <p className="section-subtitle">MediRAG-Eval grounds every decision using over 211K+ verified medical samples and gold-standard biomedical databases to ensure maximum accuracy.</p>
            </motion.div>
            
            <style>
            {`
            .datasets-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 24px;
                margin-top: 40px;
            }
            .dataset-card {
                background: linear-gradient(145deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.8));
                border: 1px solid rgba(255,255,255,0.05);
                border-top: 1px solid rgba(148, 163, 184, 0.2);
                border-radius: 20px;
                padding: 30px;
                display: flex;
                flex-direction: column;
                position: relative;
                overflow: hidden;
                transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease;
            }
            .dataset-card:hover {
                transform: translateY(-8px);
                box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255,255,255,0.2);
                border-color: rgba(96, 165, 250, 0.4);
            }
            .ds-icon {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(14, 165, 233, 0.2));
                border: 1px solid rgba(59, 130, 246, 0.3);
                color: #60a5fa;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
            }
            .ds-title {
                font-size: 20px;
                font-weight: 800;
                color: white;
                margin-bottom: 8px;
                letter-spacing: 0.5px;
            }
            .ds-desc {
                font-size: 14px;
                color: #94a3b8;
                line-height: 1.6;
                margin-bottom: 24px;
            }
            .ds-meta {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-top: 1px solid rgba(255,255,255,0.05);
                padding-top: 16px;
                margin-top: auto;
            }
            .ds-stat {
                font-size: 11px;
                font-weight: 800;
                color: #34d399;
                background: rgba(16, 185, 129, 0.1);
                border: 1px solid rgba(16, 185, 129, 0.2);
                padding: 4px 10px;
                border-radius: 20px;
            }
            .ds-source {
                font-size: 11px;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-weight: 800;
            }
            `}
            </style>

            <motion.div className="datasets-grid" {...staggerContainer}>
                
                <motion.div className="dataset-card" variants={fadeInUp}>
                    <div className="ds-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    </div>
                    <div className="ds-title">PubMedQA</div>
                    <div className="ds-desc">Biomedical research question answering dataset collected from original PubMed abstracts.</div>
                    <div className="ds-meta">
                        <div className="ds-stat">11 Lakh+ Samples</div>
                        <div className="ds-source">NIH / NLM</div>
                    </div>
                </motion.div>

                <div className="dataset-card">
                    <div className="ds-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                    </div>
                    <div className="ds-title">MedQA-USMLE</div>
                    <div className="ds-desc">Multiple-choice questions collected directly from the US Medical Licensing Examinations.</div>
                    <div className="ds-meta">
                        <div className="ds-stat">12.7K+ Cases</div>
                        <div className="ds-source">USMLE</div>
                    </div>
                </div>

                <div className="dataset-card">
                    <div className="ds-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                    </div>
                    <div className="ds-title">BioASQ 2023</div>
                    <div className="ds-desc">Large-scale biomedical semantic indexing and question answering challenge data.</div>
                    <div className="ds-meta">
                        <div className="ds-stat">4.5K+ Gold Standard</div>
                        <div className="ds-source">BioASQ</div>
                    </div>
                </div>

                <div className="dataset-card">
                    <div className="ds-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
                    </div>
                    <div className="ds-title">DrugBank</div>
                    <div className="ds-desc">Comprehensive database containing exhaustive information on drugs and clinical drug targets.</div>
                    <div className="ds-meta">
                        <div className="ds-stat">506K+ Interactions</div>
                        <div className="ds-source">DrugBank</div>
                    </div>
                </div>

            </motion.div>
        </div>
    </section>

    
    <section className="section">
        <div className="section-container">
            <motion.div className="section-header" {...fadeInUp}>
                <div className="section-label home-section-label">USE CASES</div>
                <h2 className="section-title">Built For Everyone Building Medical AI</h2>
            </motion.div>
            
            <motion.div className="use-cases-grid" {...staggerContainer}>
                <motion.div className="persona-card" variants={fadeInUp}>
                    <div className="persona-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                    </div>
                    <h3 className="persona-title">AI Developers</h3>
                    <p className="persona-text">Integrate MediRAG-Eval as a post-generation middleware layer in your medical RAG pipeline via the FastAPI endpoint. Get clause-level annotations in your CI/CD pipeline.</p>
                    <Link to="/api-docs" className="cta-link">See API Docs →</Link>
                </motion.div>
                
                <motion.div className="persona-card" variants={fadeInUp}>
                    <div className="persona-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                    <h3 className="persona-title">Researchers</h3>
                    <p className="persona-text">Benchmark your RAG system on PubMedQA, MedQA-USMLE, and BioASQ. Compare faithfulness and RAGAS scores across model variants with full ablation support.</p>
                    <Link to="/console" className="cta-link">See Evaluation Criteria →</Link>
                </motion.div>
                
                <motion.div className="persona-card" variants={fadeInUp}>
                    <div className="persona-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    </div>
                    <h3 className="persona-title">AI Governance Teams</h3>
                    <p className="persona-text">Generate structured JSON audit reports for every LLM output. Track hallucination risk trends on the dashboard. Build compliance evidence for CDSCO SaMD regulations.</p>
                    <Link to="/console" className="cta-link">See Dashboard →</Link>
                </motion.div>
            </motion.div>
        </div>
    </section>

    
    <section className="section ecosystem-section">
        <div className="section-container block-reveal">
            <div className="ecosystem-banner">
                {/* Full-width cinematic background */}
                <div className="ecosystem-banner-img">
                    <img src="/india_health.png" alt="India Digital Health Future" />
                </div>
                <div className="ecosystem-bg-overlay"></div>
                <div className="eco-dot-grid"></div>
                <div className="eco-glow-orb eco-orb-1"></div>
                <div className="eco-glow-orb eco-orb-2"></div>
                <motion.div className="ecosystem-content" {...fadeInUp}>
                    <div className="badge badge-outline">🇮🇳 Made for Bharat</div>
                    <h2 className="ecosystem-title">Designed for India's Digital Health Future</h2>
                    <p className="ecosystem-text">From eSanjeevani's 13 crore teleconsultations to ABDM's national health stack, India's medical AI ecosystem needs a safety middleware proxy. MediRAG 2.0 is built to be that layer — open, free, and deployable anywhere.</p>
                    <div className="ecosystem-logos">
                        <div className="logo-placeholder">eSanjeevani</div>
                        <div className="logo-placeholder">ABDM</div>
                        <div className="logo-placeholder">ICMR</div>
                    </div>
                </motion.div>
            </div>
        </div>
    </section>

    
    <section className="section cta-section">
        <motion.div className="section-container align-center" {...fadeInUp}>
            <h2 className="cta-headline">Start Auditing Your Medical AI Today.</h2>
            <p className="cta-subtext">No API key. No GPU required. Clone, install, and run in under 5 minutes.</p>
            
            <div className="code-block">
                <div className="code-header">
                    <div className="mac-dots">
                        <span className="dot red-dot"></span>
                        <span className="dot yellow-dot"></span>
                        <span className="dot green-dot"></span>
                    </div>
                    <span className="code-label">bash</span>
                </div>
                <pre><code>git clone https://github.com/medirag/medirag-eval
pip install -r requirements.txt
streamlit run src/dashboard/app.py</code></pre>
            </div>

            <div className="cta-actions">
                <Link to="/chat" className="primary-btn large" style={{textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'6px'}}>Try Live Demo →</Link>
                <a href="https://github.com/JoyTheSloth/MediRAG" target="_blank" rel="noopener noreferrer" className="secondary-btn large" style={{textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'6px'}}>View on GitHub</a>
            </div>
            
            <div className="cta-footer-note">India Innovates 2026 · Bharat Mandapam · March 28</div>
        </motion.div>
    </section>

    
    
    </>
  );
};

export default Home;