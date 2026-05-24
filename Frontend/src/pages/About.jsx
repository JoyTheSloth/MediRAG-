import React from 'react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <>

    <header className="section about-hero">
        <div className="section-container align-center reveal-up">
            <div className="badge badge-outline"><span className="shield-icon">🎯</span> Our Mission</div>
            <h1 className="main-title">
                Building Trust in Medical AI.<br/>
                <span className="gradient-text-green">One Audit at a Time.</span>
            </h1>
            <p className="about-hero-subtext">
                Hallucinations in medical AI aren't just errors — they're patient safety risks. MediRAG-Eval was built to give developers, researchers, and AI governance teams a rigorous, open-source framework to detect, score, and explain hallucinations in RAG-based medical QA systems before they reach clinicians or patients.
            </p>
        </div>
    </header>

    
    <section className="section">
        <div className="section-container">
            <div className="section-header reveal-up">
                <div className="section-label about-section-label">THE PROBLEM</div>
                <h2 className="section-title">Critical Safety Gaps in Medical AI</h2>
                <p className="section-subtitle">Why generic RAG pipelines fail in high-stakes clinical environments.</p>
            </div>
            
            <div className="problem-section-v2">
                {/* 1. THREE CARDS IN A LINE */}
                <div className="problem-cards-row reveal-up">
                    <div className="problem-card red-border">
                        <div className="pr-icon-ring red-text">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        </div>
                        <div className="problem-content">
                            <h3 className="problem-title">Unverified Claims</h3>
                            <p className="problem-text">LLMs confidently generate medical statements unsupported by retrieved evidence.</p>
                        </div>
                    </div>
                    
                    <div className="problem-card orange-border">
                        <div className="pr-icon-ring orange-text">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path></svg>
                        </div>
                        <div className="problem-content">
                            <h3 className="problem-title">Dosage Errors</h3>
                            <p className="problem-text">Wrong drug names and incorrect dosage counts go undetected in generic RAG.</p>
                        </div>
                    </div>

                    <div className="problem-card amber-border">
                        <div className="pr-icon-ring amber-text">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                        </div>
                        <div className="problem-content">
                            <h3 className="problem-title">No Audit Trail</h3>
                            <p className="problem-text">Existing systems produce answers with no explainability layer for tracing logic.</p>
                        </div>
                    </div>
                </div>
                
                {/* 2. TWO PERCENTAGES BELOW */}
                <div className="problem-stats-row reveal-up">
                    <div className="stat-block-v2">
                        <div className="huge-stat green-text">~30%</div>
                        <p className="stat-desc-v2">of generated medical answers contain a hallucination</p>
                        <p className="stat-subtext-v2">Based on benchmarks across PubMedQA and MedQA datasets. Generic LLMs often "fill in gaps" when evidence is ambiguous.</p>
                    </div>
                    <div className="stat-block-v2">
                        <div className="huge-stat amber-text">~12%</div>
                        <p className="stat-desc-v2">involve critical and harmful dosage errors</p>
                        <p className="stat-subtext-v2">High-severity failures including wrong drug combinations and contraindicated dosages. Requires automated forensic auditing.</p>
                    </div>
                </div>

            </div>
        </div>
    </section>

    
    <section className="section about-approach-section">
        <div className="section-container">
            <div className="section-header reveal-up">
                <div className="section-label about-section-label"><span className="sl-dash">—</span>OUR APPROACH<span className="sl-dash">—</span></div>
                <h2 className="section-title">The MediRAG Safety Stack</h2>
                <p className="section-subtitle">A multi-layered defense architecture for clinical AI reliability.</p>
            </div>
            
            <style>
            {`
            .about-approach-section {
                padding: 100px 0;
                overflow: hidden;
                background: radial-gradient(circle at 50% 50%, rgba(0, 200, 150, 0.03), transparent 70%) !important;
            }

            .stack-pipeline-v3 {
                position: relative;
                max-width: 1000px;
                margin: 80px auto;
                display: flex;
                flex-direction: column;
                gap: 0;
            }

            /* Central Flow Line */
            .stack-pipeline-v3::before {
                content: '';
                position: absolute;
                top: 0;
                bottom: 0;
                left: 50%;
                width: 2px;
                background: linear-gradient(to bottom, 
                    transparent, 
                    rgba(16, 185, 129, 0.5) 10%, 
                    rgba(16, 185, 129, 0.5) 90%, 
                    transparent
                );
                transform: translateX(-50%);
                z-index: 0;
            }

            .stack-node-v3 {
                position: relative;
                z-index: 1;
                width: 100%;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 20px 0; /* Reduced from 40px */
            }

            .stack-node-content {
                width: 42%;
                background: rgba(17, 24, 39, 0.4);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                padding: 24px 30px; /* More compact padding */
                border-radius: 24px;
                transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                position: relative;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                overflow: hidden;
            }

            /* Card Illustrations */
            .stack-node-content::before {
                content: '';
                position: absolute;
                top: -20px;
                right: -20px;
                width: 100px;
                height: 100px;
                background: radial-gradient(circle at center, rgba(16, 185, 129, 0.08), transparent 70%);
                border-radius: 50%;
                pointer-events: none;
                z-index: -1;
            }

            .stack-node-v3:nth-child(even) .stack-node-content::before {
                right: auto;
                left: -20px;
            }

            .node-v3-illustration {
                position: absolute;
                bottom: -10px;
                right: 10px;
                font-size: 64px;
                opacity: 0.03;
                font-weight: 900;
                color: white;
                pointer-events: none;
                z-index: -1;
                user-select: none;
            }

            .stack-node-v3:nth-child(even) .node-v3-illustration {
                right: auto;
                left: 10px;
            }

            .stack-node-v3:nth-child(even) .stack-node-content {
                order: 2;
                text-align: left;
            }

            .stack-node-v3:nth-child(odd) .stack-node-content {
                order: 0;
                text-align: right;
            }

            .stack-node-v3:hover .stack-node-content {
                transform: scale(1.05);
                border-color: var(--green-accent);
                box-shadow: 0 20px 40px rgba(16, 185, 129, 0.1);
                background: rgba(17, 24, 39, 0.8);
            }

            /* Central Indicator Icon */
            .stack-node-indicator {
                width: 56px;
                height: 56px;
                background: #111827;
                border: 2px solid rgba(16, 185, 129, 0.3);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2;
                font-size: 24px;
                transition: all 0.5s ease;
                box-shadow: 0 0 20px rgba(16, 185, 129, 0.1);
                position: relative;
                background: radial-gradient(circle at center, #1e293b, #0f172a);
            }

            .stack-node-v3:hover .stack-node-indicator {
                background: var(--green-accent);
                border-color: white;
                box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
                transform: scale(1.2);
            }

            /* Connection Line Animation */
            .stack-node-connection {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 8%;
                height: 2px;
                background: rgba(16, 185, 129, 0.3);
                z-index: 0;
                transform: translateY(-50%);
            }

            .stack-node-v3:nth-child(odd) .stack-node-connection {
                left: 42%;
                width: 8%;
            }

            .stack-node-v3:nth-child(even) .stack-node-connection {
                right: 42%;
                left: auto;
                width: 8%;
            }

            .stack-node-v3:hover .stack-node-connection {
                background: var(--green-accent);
                box-shadow: 0 0 10px var(--green-accent);
            }

            .node-v3-title {
                color: var(--green-accent);
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 8px;
            }

            .node-v3-heading {
                color: white;
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 10px;
            }

            .node-v3-desc {
                color: var(--text-gray-light);
                font-size: 13px;
                line-height: 1.6;
            }

            /* Beam Pulse Effect */
            .beam-pulse {
                position: absolute;
                width: 4px;
                height: 60px;
                background: linear-gradient(to bottom, transparent, #10B981, transparent);
                left: 50%;
                transform: translateX(-50%);
                z-index: 1;
                animation: beam-move 4s infinite linear;
                opacity: 0;
            }

            @keyframes beam-move {
                0% { top: -5%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 100%; opacity: 0; }
            }

            /* Result Box */
            .stack-result-v3 {
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.2));
                border: 1px solid rgba(16, 185, 129, 0.4);
                border-radius: 32px;
                padding: 50px;
                text-align: center;
                max-width: 700px;
                margin: 60px auto 0;
                position: relative;
                backdrop-filter: blur(10px);
                box-shadow: 0 20px 50px rgba(0,0,0,0.4);
            }

            .stack-result-v3 h3 {
                font-size: 24px;
                color: white;
                margin-bottom: 15px;
            }

            /* Emoji & Interaction Animations */
            @keyframes emoji-float {
                0%, 100% { transform: translateY(0) scale(1); }
                50% { transform: translateY(-8px) scale(1.15); }
            }

            @keyframes card-shimmer {
                0% { left: -100%; opacity: 0; }
                50% { opacity: 0.15; }
                100% { left: 100%; opacity: 0; }
            }

            .stack-node-indicator {
                overflow: visible !important;
            }

            .stack-node-indicator span {
                display: inline-block;
                animation: emoji-float 3s ease-in-out infinite;
            }

            .stack-node-v3:hover .stack-node-indicator span {
                animation: emoji-float 1.2s ease-in-out infinite;
                filter: drop-shadow(0 0 10px white);
            }

            /* Card Shine Effect */
            .stack-node-content::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 60%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
                transform: skewX(-20deg);
                pointer-events: none;
            }

            .stack-node-v3:hover .stack-node-content::after {
                animation: card-shimmer 1.5s ease-in-out;
            }

            /* Enhanced Illustrations */
            .node-v3-illustration {
                background: linear-gradient(180deg, rgba(255,255,255,0.08), transparent);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                font-size: 90px;
                bottom: -30px;
                filter: blur(1px);
            }

            .stack-node-v3:nth-child(even) .node-v3-illustration {
                transform: rotate(-10deg);
            }

            .stack-node-v3:nth-child(odd) .node-v3-illustration {
                transform: rotate(10deg);
            }

            /* Light Theme Adaptation */
            [data-theme="light"] .about-approach-section {
                background: radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.05), transparent 70%) !important;
            }

            [data-theme="light"] .stack-node-content {
                background: #FFFFFF;
                border-color: rgba(0,0,0,0.06);
                box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            }

            [data-theme="light"] .stack-node-indicator {
                background: #FFFFFF;
                border-color: #BBF7D0;
                color: #16A34A;
            }

            [data-theme="light"] .node-v3-heading { color: #1E293B; }
            [data-theme="light"] .node-v3-desc { color: #475569; }

            [data-theme="light"] .stack-result-v3 {
                background: #DCFCE7;
                border-color: #BBF7D0;
            }

            [data-theme="light"] .stack-result-v3 h3 { color: #064E3B; }
            [data-theme="light"] .stack-result-v3 p { color: #14532D; }

            @media (max-width: 768px) {
                /* General layouts */
                .about-hero {
                    padding-top: 30px !important;
                }
                .about-hero-subtext {
                    font-size: 13px !important;
                    line-height: 1.5;
                }

                /* Problem Cards */
                .problem-cards-row {
                    flex-direction: column !important;
                    gap: 12px !important;
                }
                .problem-card {
                    padding: 16px !important;
                    border-radius: 16px !important;
                }
                .problem-title {
                    font-size: 16px !important;
                }
                .problem-text {
                    font-size: 12px !important;
                }

                /* Problem Stats */
                .problem-stats-row {
                    flex-direction: column !important;
                    gap: 16px !important;
                }
                .stat-block-v2 {
                    padding: 16px !important;
                }
                .huge-stat {
                    font-size: 28px !important;
                }
                .stat-desc-v2 {
                    font-size: 13px !important;
                }
                .stat-subtext-v2 {
                    font-size: 11px !important;
                }

                /* Stack pipeline module */
                .stack-pipeline-v3::before { left: 30px; }
                .stack-node-v3 { flex-direction: row !important; text-align: left !important; }
                .stack-node-content { 
                    width: calc(100% - 80px); 
                    margin-left: 80px; 
                    order: 2 !important; 
                    padding: 16px 20px !important;
                    border-radius: 16px !important;
                }
                .stack-node-indicator { width: 44px; height: 44px; font-size: 18px; margin-left: 8px; }
                .stack-node-connection { display: none; }
                .beam-pulse { left: 30px; }

                .node-v3-title { font-size: 9px !important; }
                .node-v3-heading { font-size: 14px !important; margin-bottom: 6px !important; }
                .node-v3-desc { font-size: 11px !important; line-height: 1.4 !important; }

                .stack-result-v3 {
                    padding: 24px 16px !important;
                    border-radius: 20px !important;
                    margin: 30px auto 0 !important;
                }
                .stack-result-v3 h3 { font-size: 18px !important; }
                .stack-result-v3 p { font-size: 12px !important; }

                /* Team Cards stacking */
                .team-grid {
                    grid-template-columns: 1fr !important;
                    gap: 12px !important;
                }
                .team-card {
                    padding: 16px !important;
                    border-radius: 16px !important;
                }
                .team-bio {
                    font-size: 12px !important;
                }

                /* Impact Grid stacking */
                .impact-grid {
                    grid-template-columns: 1fr !important;
                    gap: 10px !important;
                }
                .impact-card {
                    padding: 16px !important;
                    border-radius: 12px !important;
                }
                .impact-title {
                    font-size: 15px !important;
                }
                .impact-text {
                    font-size: 12px !important;
                }

                /* Philosophy Card */
                .tech-philosophy-card {
                    padding: 24px 16px !important;
                    border-radius: 16px !important;
                }
                .philosophy-tags {
                    justify-content: center !important;
                    gap: 8px !important;
                }
                .ptag {
                    font-size: 10px !important;
                    padding: 4px 8px !important;
                }
                .philosophy-text {
                    font-size: 12px !important;
                }

                /* Context cards */
                .context-grid {
                    grid-template-columns: 1fr !important;
                    gap: 12px !important;
                }
                .context-card {
                    padding: 16px !important;
                    border-radius: 16px !important;
                }
                .context-title {
                    font-size: 16px !important;
                }
                .context-desc {
                    font-size: 12px !important;
                }

                /* CTA Banner */
                .cta-banner {
                    padding: 32px 16px !important;
                }
                .cta-banner-title {
                    font-size: 20px !important;
                }
                .cta-banner-subtext {
                    font-size: 12px !important;
                }
                .cta-banner-actions {
                    flex-direction: column !important;
                    gap: 10px !important;
                    align-items: center !important;
                }
                .cta-banner-actions a {
                    width: 100% !important;
                    max-width: 250px !important;
                    justify-content: center !important;
                }

                .features-grid-v2 {
                    grid-template-columns: 1fr !important;
                    gap: 16px !important;
                }
                .feature-card-v2 {
                    padding: 24px !important;
                    border-radius: 20px !important;
                }
            }

            /* Elaborate Features Grid Styles */
            .features-grid-v2 {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 32px;
                margin-top: 60px;
            }

            .feature-card-v2 {
                background: rgba(17, 24, 39, 0.45);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 28px;
                padding: 40px;
                display: flex;
                flex-direction: column;
                gap: 24px;
                transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                position: relative;
                overflow: hidden;
                text-align: left;
            }

            .feature-card-v2:hover {
                transform: translateY(-10px);
                border-color: var(--green-accent);
                background: rgba(17, 24, 39, 0.85);
                box-shadow: 0 25px 50px rgba(16, 185, 129, 0.12);
            }

            .feature-card-v2::before {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                width: 140px;
                height: 140px;
                background: radial-gradient(circle at top right, rgba(0, 200, 150, 0.1), transparent 70%);
                border-radius: 50%;
                pointer-events: none;
            }

            .feature-icon-v2 {
                width: 64px;
                height: 64px;
                border-radius: 20px;
                background: rgba(0, 200, 150, 0.08);
                border: 1px solid rgba(0, 200, 150, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 32px;
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
            }

            .feature-badge-v2 {
                display: inline-block;
                align-self: flex-start;
                padding: 4px 12px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
                background: rgba(0, 200, 150, 0.1);
                color: var(--green-accent);
                border: 1px solid rgba(0, 200, 150, 0.2);
            }

            .feature-title-v2 {
                font-size: 22px;
                font-weight: 800;
                color: white;
            }

            .feature-desc-v2 {
                font-size: 14.5px;
                line-height: 1.7;
                color: var(--text-gray-light);
            }

            .feature-highlight-list-v2 {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin-top: 8px;
                padding-left: 0;
                list-style: none;
            }

            .feature-highlight-item-v2 {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 13.5px;
                color: var(--text-gray);
            }

            .feature-highlight-item-v2 span.bullet {
                color: var(--green-accent);
                font-weight: 800;
            }

            /* Light Theme Adaptation for Features Section */
            [data-theme="light"] .feature-card-v2 {
                background: #FFFFFF !important;
                border-color: rgba(0, 0, 0, 0.06) !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03) !important;
            }

            [data-theme="light"] .feature-card-v2:hover {
                background: #F8FAFC !important;
                border-color: rgba(16, 185, 129, 0.35) !important;
                box-shadow: 0 15px 35px rgba(16, 185, 129, 0.08) !important;
            }

            [data-theme="light"] .feature-title-v2 {
                color: #1E293B !important;
            }

            [data-theme="light"] .feature-desc-v2 {
                color: #475569 !important;
            }

            [data-theme="light"] .feature-highlight-item-v2 {
                color: #64748B !important;
            }

            [data-theme="light"] .feature-icon-v2 {
                background: rgba(16, 185, 129, 0.05) !important;
                border-color: rgba(16, 185, 129, 0.15) !important;
            }
            `}
            </style>

            <div className="stack-pipeline-v3 reveal-up">
                <div className="beam-pulse"></div>
                <div className="beam-pulse" style={{animationDelay:'2s'}}></div>

                <div className="stack-node-v3">
                    <div className="stack-node-content">
                        <div className="node-v3-illustration">01</div>
                        <div className="node-v3-title">Phase 1: Privacy</div>
                        <div className="node-v3-heading">PHI Privacy Shield</div>
                        <div className="node-v3-desc">Automatic PII/PHI redaction. Masks sensitive patient data before any external processing takes place.</div>
                    </div>
                    <div className="stack-node-indicator"><span>🔒</span></div>
                    <div className="stack-node-connection"></div>
                </div>

                <div className="stack-node-v3">
                    <div className="stack-node-content">
                        <div className="node-v3-illustration">02</div>
                        <div className="node-v3-title">Phase 2: Consensus</div>
                        <div className="node-v3-heading">Consensus Judge</div>
                        <div className="node-v3-desc">Cross-references multiple AI models against the retrieved clinical dataset to identify the most evidence-supported response.</div>
                    </div>
                    <div className="stack-node-indicator"><span>⚖️</span></div>
                    <div className="stack-node-connection"></div>
                </div>

                <div className="stack-node-v3">
                    <div className="stack-node-content">
                        <div className="node-v3-illustration">03</div>
                        <div className="node-v3-title">Phase 3: Grounding</div>
                        <div className="node-v3-heading">Evidence Grounding</div>
                        <div className="node-v3-desc">Scientific verification using your medical dataset. Ensures every AI claim is explicitly supported by retrieved text chunks.</div>
                    </div>
                    <div className="stack-node-indicator"><span>📊</span></div>
                    <div className="stack-node-connection"></div>
                </div>

                <div className="stack-node-v3">
                    <div className="stack-node-content">
                        <div className="node-v3-illustration">04</div>
                        <div className="node-v3-title">Phase 4: Validation</div>
                        <div className="node-v3-heading">Entity Validation</div>
                        <div className="node-v3-desc">Verifies drug names and clinical entities strictly cross-checking against the source dataset and clinical guidelines.</div>
                    </div>
                    <div className="stack-node-indicator"><span>🔍</span></div>
                    <div className="stack-node-connection"></div>
                </div>

                <div className="stack-node-v3">
                    <div className="stack-node-content">
                        <div className="node-v3-illustration">05</div>
                        <div className="node-v3-title">Phase 5: Credibility</div>
                        <div className="node-v3-heading">Dataset Credibility</div>
                        <div className="node-v3-desc">Ranks the reliability of the source evidence (RCTs vs Guidelines) used to verify the final AI response.</div>
                    </div>
                    <div className="stack-node-indicator"><span>📄</span></div>
                    <div className="stack-node-connection"></div>
                </div>

                <div className="stack-result-v3">
                    <div className="badge badge-outline" style={{marginBottom:'20px'}}>Final Output</div>
                    <h3>Clinical-Grade Reliability</h3>
                    <p>Real-time privacy, multi-model consensus, and a rigorous 3-layer audit focused on evidence from your specific medical context.</p>
                </div>
            </div>
            
            <p className="pipeline-caption reveal-up">All modules run locally. Zero paid APIs. Full pipeline completes in &lt; 30 seconds on CPU.</p>
        </div>
    </section>



    <section className="section about-approach-section" style={{ borderTop: '1px solid rgba(16, 185, 129, 0.1)', paddingBottom: '100px' }}>
        <div className="section-container">
            <div className="section-header reveal-up">
                <div className="section-label about-section-label"><span className="sl-dash">—</span>SYSTEM CAPABILITIES<span className="sl-dash">—</span></div>
                <h2 className="section-title">Ecosystem Features & Modules</h2>
                <p className="section-subtitle">A comprehensive clinical suite built to optimize trust, safety, and transparency in medical AI deployments.</p>
            </div>

            <div className="features-grid-v2 reveal-up">
                {/* Card 1: MediChat */}
                <div className="feature-card-v2">
                    <div className="feature-icon-v2">💬</div>
                    <div className="feature-badge-v2">Conversational Demo</div>
                    <h3 className="feature-title-v2">MediChat: Clinical Conversational AI</h3>
                    <p className="feature-desc-v2">
                        An interactive, real-time medical chatbot demonstrating our dual-model consensus algorithm. Pulls references from localized vector databases, masks PII on the fly, and highlights raw vs audited responses side-by-side.
                    </p>
                    <ul className="feature-highlight-list-v2">
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Real-Time Multi-Model Clinical Consensus</li>
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Live Side-by-Side Clinical Compare Panel</li>
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Interactive Medical Suggestion Chips & Guides</li>
                    </ul>
                </div>

                {/* Card 2: Researchers Lab */}
                <div className="feature-card-v2">
                    <div className="feature-icon-v2">🔬</div>
                    <div className="feature-badge-v2">Research Sandbox</div>
                    <h3 className="feature-title-v2">Researchers Lab & RAGAS Evaluator</h3>
                    <p className="feature-desc-v2">
                        A dedicated sandbox for biomedical researchers to analyze RAG performance. Run detailed RAGAS metrics to compute hallucination indexes, factual precision, answer relevance, and semantic grounding.
                    </p>
                    <ul className="feature-highlight-list-v2">
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Rigorous RAGAS Score Validation (0.0 to 1.0)</li>
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Dynamic Visual Metrics & Distribution Heatmaps</li>
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Exportable Evaluation History for Peer Reviews</li>
                    </ul>
                </div>

                {/* Card 3: Report Uploader */}
                <div className="feature-card-v2">
                    <div className="feature-icon-v2">📁</div>
                    <div className="feature-badge-v2">Report Uploader</div>
                    <h3 className="feature-title-v2">Clinical Report & Dataset Ingestion</h3>
                    <p className="feature-desc-v2">
                        Upload custom patient cases, clinical trial logs, lab sheets, or PDF/Text medical documents. Automatically chunks, embeds, and indexes them into the local vector database, expanding the RAG's knowledge store instantly.
                    </p>
                    <ul className="feature-highlight-list-v2">
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Automated PDF, Text, and Lab Sheet Parsing</li>
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Dynamic Vector Database Chunking & Embedding</li>
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Real-time Ingestion History Logs</li>
                    </ul>
                </div>

                {/* Card 4: AI Governance */}
                <div className="feature-card-v2">
                    <div className="feature-icon-v2">⚖️</div>
                    <div className="feature-badge-v2">AI Governance</div>
                    <h3 className="feature-title-v2">Clinical Governance & Policy Manager</h3>
                    <p className="feature-desc-v2">
                        Enforce institutional parameters, strict safety limits, minimum confidence levels, and active warnings. Medical administrators can customize consensus weights and choose safe local LLMs to align with clinical standards.
                    </p>
                    <ul className="feature-highlight-list-v2">
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Minimum Safety Threshold & Dosage Alarms</li>
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Multi-Model Routing Configuration (Llama, Ollama, etc.)</li>
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Custom Weight Allocations for Consensus Engines</li>
                    </ul>
                </div>

                {/* Card 5: Hospital Registry */}
                <div className="feature-card-v2">
                    <div className="feature-icon-v2">🏥</div>
                    <div className="feature-badge-v2">EHR Integration</div>
                    <h3 className="feature-title-v2">Hospital Enterprise Registry & Wards</h3>
                    <p className="feature-desc-v2">
                        Register custom wards (Cardiology, Oncology, Pediatrics) and define specific guideline protocols. Directly copy connection scripts (Python, JS, cURL) to securely interface MediRAG into Epic or Cerner EHR frameworks.
                    </p>
                    <ul className="feature-highlight-list-v2">
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Custom Ward Guidelines & Consensus Weights</li>
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> On-Premise Secure LLM Host Configurations</li>
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Epic & Cerner EHR Copyable Integration Scripts</li>
                    </ul>
                </div>

                {/* Card 6: Patient Experience */}
                <div className="feature-card-v2">
                    <div className="feature-icon-v2">👥</div>
                    <div className="feature-badge-v2">Patient Portal</div>
                    <h3 className="feature-title-v2">Patient Experience & Layman Translation</h3>
                    <p className="feature-desc-v2">
                        Empowers patient portal charts by translating complex doctor jargon and pathological summaries into warm, empathetic, layman-friendly text. Runs automatic PHI data-masking to maintain absolute patient privacy.
                    </p>
                    <ul className="feature-highlight-list-v2">
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Empathetic Jargon Demystification & Term Breakdown</li>
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Automated Real-time PII & PHI Chart Masking</li>
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Groundedness & Faithfulness Verification checks</li>
                    </ul>
                </div>

                {/* Card 7: Hinglish Bilingual */}
                <div className="feature-card-v2">
                    <div className="feature-icon-v2">🌐</div>
                    <div className="feature-badge-v2">Bilingual Localization</div>
                    <h3 className="feature-title-v2">Hinglish Bilingual Auditing</h3>
                    <p className="feature-desc-v2">
                        Optimized for South-Asian healthcare environments to process, translate, and evaluate bilingual Hinglish (Hindi-English mix) dialogue. Standardizes regional inputs into clinical English and runs cross-lingual consensus.
                    </p>
                    <ul className="feature-highlight-list-v2">
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Hinglish-to-Clinical English Query Translation</li>
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Dual Consensus Evaluations on Multi-lingual RAG Output</li>
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Empirical Hallucination & Faithfulness Evaluation</li>
                    </ul>
                </div>

                {/* Card 8: API Playground */}
                <div className="feature-card-v2">
                    <div className="feature-icon-v2">⚙️</div>
                    <div className="feature-badge-v2">Developer Sandbox</div>
                    <h3 className="feature-title-v2">Interactive API Playground & Agent</h3>
                    <p className="feature-desc-v2">
                        A real-time developer sandbox simulating exactly how clinical endpoints handle inputs, fetch documents, audit answers, mask data, and return results. Copy connection schemas for high-speed, scalable system hooks.
                    </p>
                    <ul className="feature-highlight-list-v2">
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Real-time Pipeline Stage Visualizations</li>
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Complete Interactive API Client Simulator Console</li>
                        <li className="feature-highlight-item-v2"><span className="bullet">✓</span> Copyable Production-Grade Connection Payloads</li>
                    </ul>
                </div>
            </div>
        </div>
    </section>



    
    <section className="section">
        <div className="section-container">
            <div className="section-header reveal-up">
                <div className="section-label about-section-label"><span className="sl-dash">—</span>THE TEAM<span className="sl-dash">—</span></div>
                <h2 className="section-title">Built by MediRAG</h2>
                <p className="section-subtitle">B.Tech Computer Science & Engineering, 2026 — Amity University Kolkata</p>
            </div>
            
            <div className="team-grid reveal-up">
                <div className="team-card">
                    <div className="avatar bg-dark-green">AS</div>
                    <h3 className="team-name">Alapan Sen</h3>
                    <div className="team-role">Team Lead & Architecture</div>
                    <p className="team-bio">RAG pipeline design, faithfulness scoring, system integration</p>
                    <div className="team-socials">
                        <a href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg></a>
                        <a href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg></a>
                    </div>
                </div>


                <div className="team-card">
                    <div className="avatar bg-dark-purple">JD</div>
                    <h3 className="team-name">Joydeep Das</h3>
                    <div className="team-role">Evaluation & Dashboard</div>
                    <p className="team-bio">RAGAS integration, score aggregation, React SPA UI, FastAPI endpoint</p>
                    <div className="team-socials">
                        <a href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg></a>
                        <a href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg></a>
                    </div>
                </div>
            </div>
        </div>
    </section>

    
    <section className="section">
        <div className="section-container">
            <div className="section-header reveal-up">
                <div className="section-label about-section-label"><span className="sl-dash">—</span>IMPACT<span className="sl-dash">—</span></div>
                <h2 className="section-title">Designed with India's Digital Health Future in Mind</h2>
            </div>
            
            <div className="impact-grid reveal-up">
                <div className="impact-card">
                    <div className="impact-icon green-text">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><line x1="9" y1="22" x2="9" y2="12"></line><line x1="15" y1="22" x2="15" y2="12"></line><line x1="9" y1="12" x2="15" y2="12"></line></svg>
                    </div>
                    <h3 className="impact-title">eSanjeevani</h3>
                    <p className="impact-text">Audit AI advice before it reaches 13+ crore teleconsultation users</p>
                </div>
                
                <div className="impact-card">
                    <div className="impact-icon green-text">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    </div>
                    <h3 className="impact-title">ABDM Compliance</h3>
                    <p className="impact-text">Safety layer for AI tools plugged into Ayushman Bharat Digital Mission</p>
                </div>
                
                <div className="impact-card">
                    <div className="impact-icon green-text">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.3 6.6L14.7 12 9.3 17.4"></path><path d="M10 2v4"></path><path d="M14 2v4"></path><path d="M21 16v-4c0-3.3-2.7-6-6-6H9c-3.3 0-6 2.7-6 6v4"></path></svg>
                    </div>
                    <h3 className="impact-title">ICMR Research</h3>
                    <p className="impact-text">Faithfulness verification for clinical guideline-based QA systems</p>
                </div>
                
                <div className="impact-card">
                    <div className="impact-icon green-text">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path></svg>
                    </div>
                    <h3 className="impact-title">Pharma AI</h3>
                    <p className="impact-text">Drug interaction and dosage hallucination detection for pharma internal tools</p>
                </div>
                
                <div className="impact-card">
                    <div className="impact-icon green-text">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                    </div>
                    <h3 className="impact-title">Consumer Health</h3>
                    <p className="impact-text">Safety auditing for Practo, Tata 1mg, Apollo 24/7 AI chatbots</p>
                </div>
                
                <div className="impact-card">
                    <div className="impact-icon green-text">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    </div>
                    <h3 className="impact-title">CDSCO Regulation</h3>
                    <p className="impact-text">Alignment with upcoming India AI-in-healthcare SaMD regulatory framework</p>
                </div>
            </div>
        </div>
    </section>

    
    <section className="section">
        <div className="section-container">
            <div className="tech-philosophy-card reveal-up">
                <div className="philosophy-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                </div>
                <h2 className="section-title">100% Open Source. Zero Cost. Maximum Transparency.</h2>
                
                <div className="philosophy-tags">
                    <div className="ptag ptag-red"><span className="strike">No OpenAI API</span></div>
                    <div className="ptag ptag-green">Runs on Free Colab T4</div>
                    <div className="ptag ptag-green">All Models on HuggingFace</div>
                    <div className="ptag ptag-green">Local LLM via Ollama</div>
                    <div className="ptag ptag-green">Public Benchmark Datasets Only</div>
                </div>
                
                <p className="philosophy-text">
                    Every component — from BioBERT embeddings to DeBERTa NLI scoring to Mistral-7B claim decomposition — is freely available and reproducible. No black boxes. No vendor lock-in. Full audit trail from query to score.
                </p>
            </div>
        </div>
    </section>

    
    <section className="section">
        <div className="section-container">
            <div className="context-grid reveal-up">
                
                <div className="context-card green-context">
                    <div className="context-icon green-text">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                    </div>
                    <h3 className="context-title">India Innovates 2026</h3>
                    <div className="context-subtitle">Bharat Mandapam, New Delhi — March 28, 2026</div>
                    <p className="context-desc">MediRAG-Eval was built for India Innovates 2026, demonstrating 3 live modules: RAG backbone, faithfulness scoring, and the high-fidelity React audit dashboard.</p>
                    <div className="context-tag green-tag">Demo-Ready ✓</div>
                </div>
                
                
                <div className="context-card blue-context">
                    <div className="context-icon blue-text">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                    </div>
                    <h3 className="context-title">B.Tech Major Project</h3>
                    <div className="context-subtitle">Amity University Kolkata — May 2026</div>
                    <p className="context-desc">Full 4-module implementation with RAGAS benchmarks, ablation experiments, FastAPI endpoint, and evaluation on PubMedQA, MedQA-USMLE, and BioASQ 2023 datasets.</p>
                    <div className="context-tag blue-tag">Submission: May 2026</div>
                </div>
            </div>
        </div>
    </section>

    
    <section className="cta-banner reveal-up">
        <div className="cta-banner-content">
            <h2 className="cta-banner-title">Ready to Audit Your Medical AI?</h2>
            <p className="cta-banner-subtext">Run your first evaluation in under 30 seconds. No API key needed.</p>
            <div className="cta-banner-actions">
                <Link to="/chat" className="primary-btn-white large" style={{textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'6px'}}>Try the Demo →</Link>
                <a href="https://github.com/JoyTheSloth/MediRAG" target="_blank" rel="noopener noreferrer" className="secondary-btn large" style={{textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'6px'}}>View on GitHub</a>
            </div>
        </div>
    </section>

    
    
    </>
  );
};

export default About;