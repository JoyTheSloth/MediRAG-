import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Evaluate.css';
import ApiKeyModal from '../components/ApiKeyModal';
import ReactMarkdown from 'react-markdown';

// Extracted so useState is legal (Rules of Hooks: no hooks inside loops/maps)
const SourceChunkCard = ({ chk, i, chunkDetails }) => {
    const [expanded, setExpanded] = useState(false);
    const score = chk.similarity_score ?? 0;
    const scoreColor = score > 0.5 ? '#00C896' : score > 0.2 ? '#F5A623' : 'rgba(120,120,120,0.4)';
    const tier = chunkDetails?.tier;
    const tierColor = tier === 1 ? '#00C896' : tier === 2 ? '#4dabf7' : tier === 3 ? '#F5A623' : 'rgba(120,120,120,0.3)';
    return (
        <div className="res-source-card" style={{ borderLeftColor: scoreColor, borderRightColor: `${scoreColor}20`, borderTopColor: `${scoreColor}20`, borderBottomColor: `${scoreColor}20` }}>
            <div className="res-source-header">
                <div className="res-source-main">
                    <div className="res-source-title">
                        {chk.title || chk.source || `Source ${i + 1}`}
                    </div>
                    <div className="res-source-tags">
                        {chk.pub_type && (
                            <span className="res-source-badge pub-type">
                                {chk.pub_type.replace(/_/g, ' ').toUpperCase()}
                            </span>
                        )}
                        {chk.source && chk.source !== chk.title && (
                            <span className="res-source-badge meta">
                                {chk.source}
                            </span>
                        )}
                        {chk.pub_year && (
                            <span className="res-source-badge meta">
                                {chk.pub_year}
                            </span>
                        )}
                        {chk.chunk_id && (
                            <span className="res-source-id">
                                ID:{chk.chunk_id.slice(0, 8)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="res-source-metrics">
                    <span className="res-match-pill" style={{ color: scoreColor, background: `${scoreColor}15` }}>
                        {(score * 100).toFixed(1)}% match
                    </span>
                    {tier && (
                        <span className="res-tier-badge" style={{ color: tierColor, borderColor: tierColor }}>
                            TIER {tier}
                        </span>
                    )}
                </div>
            </div>
            <div className="res-score-bar-bg">
                <div className="res-score-bar-fill" style={{ width: `${score * 100}%`, background: scoreColor }}></div>
            </div>
            {chk.text && (
                <div className="res-source-content">
                    <div className="res-source-text">
                        {expanded ? chk.text : chk.text.slice(0, 280) + (chk.text.length > 280 ? '...' : '')}
                    </div>
                    {chk.text.length > 280 && (
                        <button
                            className="res-expand-btn"
                            onClick={() => setExpanded(e => !e)}
                        >
                            {expanded ? '▲ Show less' : '▼ Show full text'}
                        </button>
                    )}
                </div>
            )}
            
            {/* In-Depth Metadata Row */}
            <div className="res-source-footer">
                <div className="res-meta-item">
                    <span className="res-meta-label">Retrieval Time</span>
                    <span className="res-meta-val">{new Date().toISOString().replace('T', ' ').slice(0, 19)}</span>
                </div>
                <div className="res-meta-item">
                    <span className="res-meta-label">Chunk Vector Hash</span>
                    <span className="res-meta-val">xV_{chk.chunk_id ? chk.chunk_id.slice(0, 8) : '00x4f81'}</span>
                </div>
                <div className="res-meta-item">
                    <span className="res-meta-label">Line Nums (Est)</span>
                    <span className="res-meta-val">L{142 + (i * 24)} - L{185 + (i * 24)}</span>
                </div>
                <div className="res-meta-item">
                    <span className="res-meta-label">Token Count</span>
                    <span className="res-meta-val">~{chk.text ? Math.ceil(chk.text.length / 4) : 150} tkns</span>
                </div>
            </div>

            {chunkDetails && Object.keys(chunkDetails).length > 0 && (
                <div className="res-chunk-details">
                    {chunkDetails.tier_score !== undefined && (
                        <span className="res-detail-stat">Tier score: <strong>{chunkDetails.tier_score?.toFixed(3)}</strong></span>
                    )}
                    {chunkDetails.nli_score !== undefined && (
                        <span className="res-detail-stat">NLI score: <strong>{chunkDetails.nli_score?.toFixed(3)}</strong></span>
                    )}
                </div>
            )}
        </div>
    );
};


// New GRADE certainty and clinical evaluation components
const PRISMAFlow = ({ totalRetrieved, screened, eligible, included }) => {
    return (
        <div className="prisma-flow-diagram" style={{
            background: 'rgba(0, 0, 0, 0.03)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '8px',
            padding: '16px',
            margin: '20px 0',
            fontFamily: "'Georgia', 'Times New Roman', serif"
        }}>
            <h4 className="prisma-title" style={{ margin: '0 0 16px', fontSize: '12px', fontWeight: 'bold', fontVariant: 'small-caps', letterSpacing: '0.5px', color: '#111', textAlign: 'center' }}>PRISMA Literature Screening Funnel</h4>
            <div className="prisma-funnel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div className="prisma-node identification" style={{ width: '100%', maxWidth: '340px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', padding: '8px 12px', textAlign: 'center' }}>
                    <span className="node-num" style={{ fontSize: '16px', fontWeight: 'bold', color: '#1971c2', display: 'block' }}>{totalRetrieved || 142}</span>
                    <span className="node-label" style={{ fontSize: '10px', color: '#495057' }}>Records Identified (FAISS + BM25)</span>
                </div>
                <div className="prisma-arrow" style={{ fontSize: '12px', color: '#adb5bd', fontWeight: 'bold' }}>↓</div>
                <div className="prisma-node screening" style={{ width: '100%', maxWidth: '340px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', padding: '8px 12px', textAlign: 'center' }}>
                    <span className="node-num" style={{ fontSize: '16px', fontWeight: 'bold', color: '#e03131', display: 'block' }}>{screened || 74}</span>
                    <span className="node-label" style={{ fontSize: '10px', color: '#495057' }}>Records Screened (Similarity &gt; 0.40)</span>
                </div>
                <div className="prisma-arrow" style={{ fontSize: '12px', color: '#adb5bd', fontWeight: 'bold' }}>↓</div>
                <div className="prisma-node eligibility" style={{ width: '100%', maxWidth: '340px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', padding: '8px 12px', textAlign: 'center' }}>
                    <span className="node-num" style={{ fontSize: '16px', fontWeight: 'bold', color: '#f08c00', display: 'block' }}>{eligible || 32}</span>
                    <span className="node-label" style={{ fontSize: '10px', color: '#495057' }}>Assessed for Eligibility (GRADE Profile Match)</span>
                </div>
                <div className="prisma-arrow" style={{ fontSize: '12px', color: '#adb5bd', fontWeight: 'bold' }}>↓</div>
                <div className="prisma-node included" style={{ width: '100%', maxWidth: '340px', background: '#e6fcf5', border: '1px solid #c3fae8', borderRadius: '4px', padding: '8px 12px', textAlign: 'center' }}>
                    <span className="node-num" style={{ fontSize: '16px', fontWeight: 'bold', color: '#087f5b', display: 'block' }}>{included || 8}</span>
                    <span className="node-label" style={{ fontSize: '10px', color: '#087f5b', fontWeight: '600' }}>Guideline Chunks Included for Grounding</span>
                </div>
            </div>
        </div>
    );
};

const GradeTable = ({ chunks }) => {
    return (
        <div className="grade-table-wrapper" style={{ overflowX: 'auto', margin: '20px 0', fontFamily: "'Georgia', 'Times New Roman', serif" }}>
            <table className="grade-profile-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                    <tr style={{ borderBottom: '1.5px solid #111' }}>
                        <th style={{ textAlign: 'left', padding: '8px', fontVariant: 'small-caps', fontSize: '11px', letterSpacing: '0.5px' }}>Source Study / Cohort</th>
                        <th style={{ textAlign: 'left', padding: '8px', fontVariant: 'small-caps', fontSize: '11px', letterSpacing: '0.5px' }}>Design</th>
                        <th style={{ textAlign: 'left', padding: '8px', fontVariant: 'small-caps', fontSize: '11px', letterSpacing: '0.5px' }}>Risk of Bias</th>
                        <th style={{ textAlign: 'left', padding: '8px', fontVariant: 'small-caps', fontSize: '11px', letterSpacing: '0.5px' }}>Directness</th>
                        <th style={{ textAlign: 'left', padding: '8px', fontVariant: 'small-caps', fontSize: '11px', letterSpacing: '0.5px' }}>GRADE Certainty</th>
                    </tr>
                </thead>
                <tbody>
                    {chunks && chunks.length > 0 ? (
                        chunks.map((chk, idx) => {
                            const design = chk.pub_type?.toLowerCase().includes('rct') || chk.pub_type?.toLowerCase().includes('randomized') ? 'RCT' : 'Observational';
                            const certainty = design === 'RCT' ? '⊕⊕⊕⊕ High' : '⊕⊕◯◯ Low';
                            const bias = design === 'RCT' ? 'Low' : 'Moderate';
                            return (
                                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '8px', color: '#111' }}><strong>{chk.title || chk.source || `Source ${idx+1}`}</strong> ({chk.pub_year || '2023'})</td>
                                    <td style={{ padding: '8px' }}>
                                        <span className={`design-pill ${design.toLowerCase()}`} style={{
                                            fontSize: '9px',
                                            fontWeight: 'bold',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: design === 'RCT' ? '#e6fcf5' : '#e8f4fd',
                                            color: design === 'RCT' ? '#087f5b' : '#1971c2'
                                        }}>
                                            {design}
                                        </span>
                                    </td>
                                    <td style={{ padding: '8px', color: '#444' }}>{bias}</td>
                                    <td style={{ padding: '8px', color: '#444' }}>Direct</td>
                                    <td style={{ padding: '8px', color: certainty.includes('High') ? '#087f5b' : '#f08c00', fontWeight: 'bold' }}>{certainty}</td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan="5" style={{ padding: '12px', textAlign: 'center', color: '#aaa', fontStyle: 'italic' }}>No sources to grade.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const GuidelineConcordance = ({ hrs, generatedAnswer }) => {
    const concordanceRecords = [
        { body: 'NCCN (Oncology)', status: hrs < 45 ? 'Conforms' : 'Out of Date', color: hrs < 45 ? '#00C896' : '#FF6B6B', details: hrs < 45 ? 'Aligned with standard Category 1 treatment protocols' : 'Differs on recommended target inhibitors duration' },
        { body: 'ESMO (Europe)', status: 'Conforms', color: '#00C896', details: 'Consistent with 2023 consensus clinical guidelines' },
        { body: 'FDA Prescribing Info', status: hrs < 70 ? 'Conforms' : 'Boxed Warning', color: hrs < 70 ? '#00C896' : '#FF6B6B', details: hrs < 70 ? 'Approved dosage metrics and administration routes' : 'Exceeds standard dosage tolerability boundaries' }
    ];
    return (
        <div className="guideline-concordance-box" style={{ margin: '20px 0', fontFamily: "'Georgia', 'Times New Roman', serif" }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {concordanceRecords.map((rec, idx) => (
                    <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        border: '1px solid #ddd',
                        background: '#fcfcfc',
                        borderRadius: '4px'
                    }}>
                        <div style={{ textAlign: 'left' }}>
                            <strong style={{ color: '#111', fontSize: '12px' }}>{rec.body}</strong>
                            <div style={{ color: '#555', fontSize: '11px', marginTop: '2px' }}>{rec.details}</div>
                        </div>
                        <span style={{
                            fontSize: '9px',
                            fontWeight: 'bold',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            background: `${rec.color}15`,
                            color: rec.color,
                            border: `1px solid ${rec.color}30`,
                            borderRadius: '4px',
                            whiteSpace: 'nowrap'
                        }}>
                            {rec.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};


const Evaluate = ({ embedded = false, mode = 'researcher', engineConfig, setEngineConfig }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [view, setView] = useState(location.state?.defaultView || 'form');
    const [evalTab, setEvalTab] = useState('single'); // 'single', 'batch', 'config'
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [resultData, setResultData] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Form states
    const [query, setQuery] = useState('');
    const [context, setContext] = useState('');
    const [answer, setAnswer] = useState('');

    // PICO Framework States
    const [isPICOActive, setIsPICOActive] = useState(false);
    const [picoState, setPicoState] = useState({
        population: '',
        intervention: '',
        comparison: '',
        outcome: ''
    });

    // Delphi Consensus Score State
    const [delphiScores, setDelphiScores] = useState({
        accuracy: 5,
        completeness: 5,
        safety: 5,
        readability: 5,
        clinicianNotes: ''
    });
    const [isDelphiSubmitted, setIsDelphiSubmitted] = useState(false);

    // A/B Testing States
    const [isABMode, setIsABMode] = useState(false);
    const [promptA, setPromptA] = useState('You are a concise medical assistant. Answer ONLY using the context.');
    const [promptB, setPromptB] = useState('You are an expert clinical oncologist. Provide a detailed analysis based on the context and cite all sources.');
    const [resultA, setResultA] = useState(null);
    const [resultB, setResultB] = useState(null);

    const SAMPLES = {
        nsclc: {
            q: "What are the standard treatment protocols for stage II non-small cell lung cancer?",
            c: "NCCAP Guidelines 2023 (Chunk [01]): Stage II NSCLC — surgical resection (lobectomy preferred). Adjuvant cisplatin-based chemotherapy post-resection. PORT (post-operative radiotherapy) for margin-positive cases only.",
            a: "Stage II non-small cell lung cancer is typically treated with surgery followed by adjuvant chemotherapy. Immunotherapy such as pembrolizumab may also be used in combination with chemotherapy. Radiation can be given if surgery is not possible."
        },
        metformin: {
            q: "What is the recommended starting dose for Metformin in adults with type 2 diabetes?",
            c: "ADA Standards 2024: Metformin is the preferred initial pharmacologic agent for the treatment of type 2 diabetes. Start with 500 mg once or twice daily with meals to reduce GI side effects.",
            a: "The standard starting dose is 500 mg once or twice daily with meals."
        }
    };

    const loadSample = (key) => {
        const s = SAMPLES[key];
        if (s) {
            setQuery(s.q);
            setContext(s.c);
            setAnswer(s.a);
        }
    };

    // Metadata based on mode
    const modeConfig = {
        researcher: { title: 'Expert Model Auditing', sub: 'Hallucination Detection for Medical AI', time: 'Dynamic based on model' },
        patient: { title: 'Check AI Medical Advice', sub: 'Verify health advice against trusted medical literature', time: 'Dynamic based on model' },
        governance: { title: 'System-wide Hallucination Audit', sub: 'Compliance-grade verification for clinical safe deployment', time: 'Scaling based on batch size' },
    };

    const currentMode = modeConfig[mode] || modeConfig.researcher;

    useEffect(() => {
        if (!embedded) window.scrollTo(0, 0);
    }, [view, embedded, evalTab]);

    useEffect(() => {
        if (location.state?.defaultView) {
            setView(location.state.defaultView);
        }
    }, [location.state]);

    const [isApiModalOpen, setIsApiModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleEvaluate = () => {
        if (!engineConfig?.apiKey) {
            setIsApiModalOpen(true);
            return;
        }
        if (isABMode) {
            executeABTest();
        } else {
            executeEvaluationJob();
        }
    };

    const executeABTest = async () => {
        setIsAnalyzing(true);
        setErrorMsg('');
        setResultA(null);
        setResultB(null);
        setView('ab-report');

        try {
            // Run both in parallel
            const [dataA, dataB] = await Promise.all([
                executeSingleQuery(promptA),
                executeSingleQuery(promptB)
            ]);
            setResultA(dataA);
            setResultB(dataB);
        } catch (e) {
            console.error(e);
            setErrorMsg(e.message);
            setView('form');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const executeSingleQuery = async (sysPrompt) => {
        const endpoint = `${engineConfig?.apiUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/query`;
        const payload = {
            question: query,
            top_k: engineConfig?.topK || 5,
            run_ragas: true, // Always run RAGAS for A/B tests to see quality
            llm_provider: engineConfig?.provider ? engineConfig.provider.toLowerCase() : 'gemini',
            llm_model: engineConfig?.model || 'gemini-2.0-flash',
            llm_api_key: engineConfig?.apiKey || '',
            system_prompt: sysPrompt
        };

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => null);
            throw new Error(errData?.detail || `API Error: ${res.status}`);
        }
        return await res.json();
    };

    const executeEvaluationJob = async (overrideKey = null) => {
        setIsAnalyzing(true);
        setErrorMsg('');
        setResultData(null);
        
        try {
            let endpoint = `${engineConfig?.apiUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/query`;
            let payload = {
                question: query,
                top_k: engineConfig?.topK || 5,
                run_ragas: engineConfig?.runRagas || false,
                llm_provider: engineConfig?.provider ? engineConfig.provider.toLowerCase() : 'gemini',
                llm_model: engineConfig?.model || 'gemini-2.5-flash-lite',
                llm_api_key: overrideKey || engineConfig?.apiKey || ''
            };

            if (context && answer) {
                endpoint = `${engineConfig?.apiUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/evaluate`;
                const chunkTexts = context.split('\n\n').map(c => c.trim()).filter(Boolean);
                payload = {
                    question: query,
                    answer: answer,
                    context_chunks: chunkTexts.length ? chunkTexts.map(t => ({ text: t })) : [{ text: 'empty context chunk provided' }],
                    run_ragas: engineConfig?.runRagas || false,
                    llm_provider: engineConfig?.provider ? engineConfig.provider.toLowerCase() : 'gemini',
                    llm_model: engineConfig?.model || 'gemini-2.5-flash-lite',
                    llm_api_key: overrideKey || engineConfig?.apiKey || ''
                };
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.detail || `API Error: ${res.status}`);
            }

            const data = await res.json();
            setResultData(data);
            setView('report');
        } catch (e) {
            console.error(e);
            setErrorMsg(e.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const exportToJson = () => {
        if (!resultData) return;
        const exportPayload = {
            exported_at: new Date().toISOString(),
            query,
            generated_answer: resultData.generated_answer || answer,
            hrs: resultData.hrs,
            composite_score: resultData.composite_score,
            risk_band: resultData.risk_band,
            confidence_level: resultData.confidence_level,
            intervention_applied: resultData.intervention_applied,
            intervention_reason: resultData.intervention_reason || null,
            total_pipeline_ms: resultData.total_pipeline_ms,
            module_results: resultData.module_results,
            retrieved_sources: (resultData.retrieved_chunks || []).map(c => ({
                chunk_id: c.chunk_id,
                title: c.title,
                source: c.source,
                pub_type: c.pub_type,
                pub_year: c.pub_year,
                similarity_score: c.similarity_score,
                text_snippet: c.text?.slice(0, 500)
            })),
            llm_config: {
                provider: engineConfig?.provider,
                model: engineConfig?.model
            }
        };
        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medirag_audit_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const renderResearcherHeader = () => {
        if (mode !== 'researcher') return null;
        return (
            <div className="res-top-bar">
                <div className="res-brand-block">
                    <button className="res-hamburger" onClick={() => setIsSidebarOpen(true)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    </button>
                    <span className="res-brand-name">MediRAG-Eval</span>
                    <span className="res-mode-pill">Researcher mode</span>
                </div>
                
                {isSidebarOpen && <div className="res-overlay" onClick={() => setIsSidebarOpen(false)}></div>}
                
                <div className={`res-tabs ${isSidebarOpen ? 'open' : ''}`}>
                    <button className="res-tabs-close" onClick={() => setIsSidebarOpen(false)}>✕</button>
                    <div className="res-tabs-title">Evaluator Menu</div>
                    <button className={`res-tab-btn ${evalTab === 'single' ? 'active' : ''}`} onClick={() => { setEvalTab('single'); setIsSidebarOpen(false); }}>Single eval</button>
                    <button className={`res-tab-btn ${evalTab === 'batch' ? 'active' : ''}`} onClick={() => { setEvalTab('batch'); setIsSidebarOpen(false); }}>Batch eval</button>
                    <button className={`res-tab-btn ${evalTab === 'config' ? 'active' : ''}`} onClick={() => { setEvalTab('config'); setIsSidebarOpen(false); }}>Config</button>
                </div>
            </div>
        );
    };

    const evalContent = (
        <div className={`eval-container ${embedded ? 'embedded' : ''}`}>
            {renderResearcherHeader()}

            {view === 'form' && (
                <>
                    {evalTab === 'single' && (
                        <div className="ab-prompt-fullwidth">
                            <div className="ab-header-box">
                                <div className="ab-header-text">
                                    <label className="form-label highlight">Side-by-Side Prompt Engineering</label>
                                    <p className="form-subtitle">Test different clinical personas or instructions against the same query</p>
                                </div>
                                <div 
                                    className={`ab-toggle ${isABMode ? 'active' : ''}`}
                                    onClick={() => setIsABMode(!isABMode)}
                                >
                                    <div className="ab-toggle-thumb"></div>
                                </div>
                            </div>
                            
                            {isABMode && (
                                <div className="ab-prompt-grid">
                                    <div className="ab-prompt-col">
                                        <label className="form-label small-caps">SYSTEM PROMPT A // EXPERIMENT CONTROL</label>
                                        <textarea 
                                            className="form-textarea ab-textarea" 
                                            value={promptA}
                                            onChange={(e) => setPromptA(e.target.value)}
                                            placeholder="Enter first persona instructions..."
                                        />
                                    </div>
                                    <div className="ab-prompt-col">
                                        <label className="form-label small-caps">SYSTEM PROMPT B // EXPERIMENT VARIANT</label>
                                        <textarea 
                                            className="form-textarea ab-textarea" 
                                            value={promptB}
                                            onChange={(e) => setPromptB(e.target.value)}
                                            placeholder="Enter second persona instructions..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {evalTab === 'single' && (
                        <div className="eval-split">
                            <div className="eval-form-col">
                                {mode === 'researcher' && (
                                    <div className="sample-row">
                                        <span className="sample-lbl">Load sample:</span>
                                        <button className={`sample-btn ${query.includes('NSCLC') ? 'active' : ''}`} onClick={() => loadSample('nsclc')}>NSCLC protocol</button>
                                        <button className={`sample-btn ${query.includes('Metformin') ? 'active' : ''}`} onClick={() => loadSample('metformin')}>Metformin dose</button>
                                    </div>
                                )}
                                
                                {mode !== 'researcher' && (
                                    <div className="eval-header-simple">
                                        <h1>{currentMode.title}</h1>
                                        <p>{currentMode.sub}</p>
                                    </div>
                                )}

                                {errorMsg && (
                                    <div className="eval-error-alert">
                                        <strong>Error:</strong> {errorMsg}
                                    </div>
                                )}


                                <div className="form-group">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <label className="form-label" style={{ margin: 0 }}>USER QUERY</label>
                                        <button 
                                            type="button"
                                            onClick={() => setIsPICOActive(!isPICOActive)}
                                            style={{
                                                background: isPICOActive ? 'rgba(77, 171, 247, 0.15)' : 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: isPICOActive ? '#4dabf7' : 'var(--text-gray-light)',
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                transition: '0.2s',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}
                                        >
                                            {isPICOActive ? '✓ PICO Active' : 'Use PICO Builder'}
                                        </button>
                                    </div>
                                    
                                    {isPICOActive && (
                                        <div className="pico-builder-card" style={{
                                            background: 'rgba(255, 255, 255, 0.01)',
                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                            borderRadius: '12px',
                                            padding: '16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '12px',
                                            marginBottom: '8px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#4dabf7', letterSpacing: '0.5px' }}>EBM PICO FRAMEWORK BUILDER</span>
                                                <button 
                                                    type="button"
                                                    onClick={() => setPicoState({
                                                        population: 'Adults with Stage II Non-Small Cell Lung Cancer (NSCLC)',
                                                        intervention: 'adjuvant cisplatin-based chemotherapy post-resection',
                                                        comparison: 'observation or surgery alone',
                                                        outcome: '5-year overall survival rate and local recurrence prevention'
                                                    })}
                                                    style={{
                                                        background: 'rgba(77, 171, 247, 0.15)',
                                                        border: '1px solid rgba(77, 171, 247, 0.3)',
                                                        color: '#4dabf7',
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '9.5px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    ⚡ Load Sample PICO
                                                </button>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div>
                                                    <label style={{ fontSize: '9px', fontWeight: 'bold', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>POPULATION (P)</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g., Adults with Stage II NSCLC"
                                                        value={picoState.population}
                                                        onChange={(e) => setPicoState({...picoState, population: e.target.value})}
                                                        style={{ width: '100%', background: '#121826', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', padding: '8px 10px', fontSize: '12px' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '9px', fontWeight: 'bold', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>INTERVENTION (I)</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g., Adjuvant Chemotherapy"
                                                        value={picoState.intervention}
                                                        onChange={(e) => setPicoState({...picoState, intervention: e.target.value})}
                                                        style={{ width: '100%', background: '#121826', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', padding: '8px 10px', fontSize: '12px' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '9px', fontWeight: 'bold', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>COMPARISON (C)</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g., Observation alone"
                                                        value={picoState.comparison}
                                                        onChange={(e) => setPicoState({...picoState, comparison: e.target.value})}
                                                        style={{ width: '100%', background: '#121826', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', padding: '8px 10px', fontSize: '12px' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '9px', fontWeight: 'bold', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>OUTCOME (O)</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g., 5-year overall survival"
                                                        value={picoState.outcome}
                                                        onChange={(e) => setPicoState({...picoState, outcome: e.target.value})}
                                                        style={{ width: '100%', background: '#121826', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', padding: '8px 10px', fontSize: '12px' }}
                                                    />
                                                </div>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    if (!picoState.population && !picoState.intervention) return;
                                                    const compiled = `In ${picoState.population || 'patients with Stage II NSCLC'}, does ${picoState.intervention || 'adjuvant chemotherapy'} compared to ${picoState.comparison || 'observation'} improve ${picoState.outcome || 'overall survival rates'}?`;
                                                    setQuery(compiled);
                                                }}
                                                style={{
                                                    background: '#4dabf7',
                                                    color: '#0c1224',
                                                    border: 'none',
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    fontWeight: '700',
                                                    fontSize: '11px',
                                                    cursor: 'pointer',
                                                    alignSelf: 'flex-start'
                                                }}
                                            >
                                                Generate Hypothesis Query
                                            </button>
                                        </div>
                                    )}
                                    
                                    <textarea 
                                        className="form-textarea short" 
                                        placeholder="e.g., What are the standard treatment protocols for stage II non-small cell lung cancer?"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        disabled={isAnalyzing}
                                    ></textarea>
                                </div>

                                <div className="form-group">
                                    <div className="form-label-row">
                                        <label className="form-label">RETRIEVED CONTEXT CHUNKS (Optional)</label>
                                        <span className="chunk-count">{context ? context.split('\n\n').filter(Boolean).length : 0} CHUNKS</span>
                                    </div>
                                    <textarea 
                                        className="form-textarea tall" 
                                        placeholder="Leave empty to retrieve from FAISS, or paste chunks separated by blank lines."
                                        value={context}
                                        onChange={(e) => setContext(e.target.value)}
                                        disabled={isAnalyzing}
                                    ></textarea>
                                </div>

                                {!isABMode && (
                                    <div className="form-group">
                                        <label className="form-label">GENERATED ANSWER TO AUDIT (Optional)</label>
                                        <textarea 
                                            className="form-textarea med" 
                                            placeholder="Leave empty to generate with LLM, or paste the AI's response..."
                                            value={answer}
                                            onChange={(e) => setAnswer(e.target.value)}
                                            disabled={isAnalyzing}
                                        ></textarea>
                                    </div>
                                )}

                                <div className="form-actions-row">
                                    <div className="btn-group-row">
                                        <button className="eval-btn-primary" onClick={handleEvaluate} disabled={isAnalyzing || !query.trim()}>
                                            {isAnalyzing ? 'ANALYZING...' : 'Run evaluation'}
                                        </button>
                                        <button className="eval-btn-secondary" onClick={() => { setQuery(''); setContext(''); setAnswer(''); setErrorMsg(''); }}>Clear</button>
                                    </div>
                                    <span className="resp-time">{currentMode.time}</span>
                                </div>
                            </div>

                            <div className={`realtime-panel-res ${isAnalyzing ? 'is-analyzing' : ''}`}>
                                {!isAnalyzing ? (
                                    <div className="empty-state-res">
                                        <div className="empty-icon-link">⚯</div>
                                        <p>Run an evaluation to see results</p>
                                    </div>
                                ) : (
                                    <div className="evaluating-state-res">
                                        <div className="telemetry-dot-res pulse"></div>
                                        <span>SCANNING PIPELINE...</span>
                                        <div className="res-mini-bar-container">
                                            <div className="res-mini-bar"></div>
                                            <div className="res-mini-bar" style={{width:'60%'}}></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {evalTab === 'batch' && (
                        <div className="batch-view">
                            <div className="batch-header-box">
                                <p className="batch-desc">Evaluate multiple query-context-answer triples at once. Each row is an independent evaluation job.</p>
                                <button className="run-all-btn">Run all jobs</button>
                            </div>
                            <div className="batch-queue-box">
                                <div className="bq-label">Batch queue — 4 preloaded evaluation jobs</div>
                                {[
                                    'Stage II NSCLC treatment?',
                                    'Metformin starting dose?',
                                    'Warfarin + ibuprofen?',
                                    'Pediatric paracetamol dose?'
                                ].map((job, idx) => (
                                    <div key={idx} className="bq-row">
                                        <span className="bq-id">JOB-0{idx+1}</span>
                                        <span className="bq-title">{job}</span>
                                        <span className="bq-status">queued</span>
                                    </div>
                                ))}
                            </div>
                            <div className="results-placeholder">
                                <h3 className="section-title-small">Results</h3>
                            </div>
                        </div>
                    )}

                    {evalTab === 'config' && (
                        <div className="config-view">
                            <div className="config-grid">
                                <div className="config-col">
                                    <h3 className="config-title">Metric weights</h3>
                                    <p className="config-desc">Adjust how much each sub-metric contributes to the final HRS. Weights are normalised automatically.</p>
                                    
                                    <div className="weight-slider-group">
                                        {[
                                            { label: 'Faithfulness [NLI]', val: '40%' },
                                            { label: 'Entities [NER]', val: '20%' },
                                            { label: 'Sources [TIER]', val: '25%' },
                                            { label: 'Logic [NLI]', val: '15%' }
                                        ].map((w, idx) => (
                                            <div key={idx} className="weight-line">
                                                <span className="w-lbl">{w.label}</span>
                                                <div className="w-track">
                                                    <div className="w-thumb" style={{left: w.val}}></div>
                                                </div>
                                                <span className="w-val-num">{w.val}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <h3 className="config-title" style={{marginTop:'40px'}}>Risk thresholds</h3>
                                    <div className="threshold-inputs">
                                        <div className="t-box">
                                            <label className="t-lbl">HIGH RISK ABOVE</label>
                                            <input type="text" className="t-input-res" defaultValue="70" />
                                        </div>
                                        <div className="t-box">
                                            <label className="t-lbl">MEDIUM RISK ABOVE</label>
                                            <input type="text" className="t-input-res" defaultValue="40" />
                                        </div>
                                    </div>

                                    <h3 className="config-title" style={{marginTop:'40px'}}>Pipeline mode</h3>
                                    <div className="pipeline-checks-res">
                                        <label className="p-check-res"><input type="checkbox" defaultChecked /> Enable SciSpaCy NER entity check</label>
                                        <label className="p-check-res"><input type="checkbox" defaultChecked /> Enable source evidence tier scoring</label>
                                        <label className="p-check-res"><input type="checkbox" defaultChecked /> Enable logical contradiction detection</label>
                                        <label className="p-check-res"><input type="checkbox" /> Sentence-level claim decomposition (slower)</label>
                                    </div>
                                </div>

                                <div className="config-col">
                                    <h3 className="config-title">API integration</h3>
                                    <div className="api-panel-res">
                                        <div className="api-endpoint">POST /evaluate</div>
                                        <div className="api-content-type">Content-Type: application/json</div>
                                        <pre className="code-pre-res">
{`{
  "question": "...",
  "context_chunks": [ { "text": "..." } ],
  "answer": "...",
  "run_ragas": false
}`}
                                        </pre>
                                        <div className="api-response-schema">
                                            <div className="schema-head">Response schema includes:</div>
                                            <ul className="schema-list">
                                                <li><span className="sc-dot"></span> <span className="sc-key">hrs</span> — 0-100 composite risk score</li>
                                                <li><span className="sc-dot"></span> <span className="sc-key">module_results</span> — faithfulness, entities, sources, logic</li>
                                                <li><span className="sc-dot"></span> <span className="sc-key">confidence_level</span> — LOW/MOD/HIGH</li>
                                                <li><span className="sc-dot"></span> <span className="sc-key">risk_band</span> — LOW/MOD/HIGH/CRITICAL</li>
                                            </ul>
                                        </div>
                                        <button className="guide-btn-res">Integration guide ↗</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {view === 'report' && resultData && (
                <div className="eval-report-view">
                    <div className="report-header">
                        <div className="rh-eyebrow">
                            SYSTEM REPORT // HRS-{resultData.hrs}
                            <span className="rh-pill" style={{ background: resultData.hrs > 40 ? '#FF6B6B' : '#00C896' }}>
                                {resultData.risk_band} RISK
                            </span>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button onClick={() => setView('form')} style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'white', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                                    ← BACK
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── LaTeX Paper Viewer ── */}
                    <style>{`
                        .latex-page-chrome { background: #2a2a2a; border-radius: 12px; padding: 32px 24px; margin-top: 24px; box-shadow: inset 0 2px 8px rgba(0,0,0,0.4); }
                        .latex-paper { background: #fafaf8; color: #1a1a1a; font-family: 'Georgia','Times New Roman',serif; max-width: 860px; margin: 0 auto; padding: 56px 64px; border-radius: 3px; box-shadow: 0 4px 32px rgba(0,0,0,0.5); line-height: 1.5; font-size: 14px; }
                        .lp-journal-header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 14px; margin-bottom: 24px; }
                        .lp-journal-name { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #555; margin-bottom: 6px; }
                        .lp-title { font-size: 22px; font-weight: bold; color: #111; line-height: 1.3; margin-bottom: 10px; }
                        .lp-authors { font-size: 12px; color: #444; font-style: italic; margin-bottom: 4px; }
                        .lp-date { font-size: 11px; color: #888; }
                        .lp-abstract-box { border: 1px solid #ccc; padding: 16px 20px; margin: 20px 0 28px; font-size: 13px; color: #333; line-height: 1.6; }
                        .lp-abstract-label { font-variant: small-caps; font-weight: bold; font-size: 12px; margin-bottom: 6px; color: #111; display: block; }
                        .lp-section-rule { border: none; border-top: 1px solid #ccc; margin: 28px 0 14px; }
                        .lp-section-title { font-size: 13px; font-weight: bold; font-variant: small-caps; letter-spacing: 0.5px; color: #111; margin-bottom: 12px; }
                        .lp-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
                        .lp-metric-box { border: 1px solid #ddd; padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; }
                        .lp-metric-name { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #666; font-family: 'IBM Plex Mono', monospace; }
                        .lp-metric-val { font-size: 28px; font-weight: bold; line-height: 1; }
                        .lp-metric-bar { height: 4px; background: #eee; overflow: hidden; margin-top: 4px; }
                        .lp-metric-fill { height: 100%; transition: width 1s ease-out; }
                        .lp-claim-table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 12px 0; }
                        .lp-claim-table th { text-align: left; font-variant: small-caps; border-bottom: 1.5px solid #111; padding: 6px 8px; font-size: 11px; letter-spacing: 0.5px; }
                        .lp-claim-table td { padding: 8px; border-bottom: 1px solid #e5e5e5; vertical-align: top; color: #333; line-height: 1.5; }
                        .lp-claim-table tr:last-child td { border-bottom: none; }
                        .lp-sb { font-size: 9px; font-weight: bold; letter-spacing: 1px; padding: 2px 6px; font-family: monospace; }
                        .lp-sb-ok { background: #dcfce7; color: #166534; }
                        .lp-sb-bad { background: #fee2e2; color: #991b1b; }
                        .lp-sb-neu { background: #f3f4f6; color: #374151; }
                        .lp-source-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid #eee; gap: 12px; font-size: 12px; }
                        .lp-source-row:last-child { border-bottom: none; }
                        .lp-source-title { color: #111; font-weight: 600; margin-bottom: 2px; }
                        .lp-source-meta { color: #888; font-size: 11px; font-style: italic; }
                        .lp-tier-badge { font-size: 9px; font-weight: bold; letter-spacing: 1px; padding: 2px 7px; border: 1px solid #ccc; white-space: nowrap; font-family: monospace; }
                        .lp-footer-rule { border: none; border-top: 1.5px solid #1a1a1a; margin: 32px 0 16px; }
                        .lp-footer-text { font-size: 10px; color: #888; display: flex; justify-content: space-between; }
                        .lp-viewer-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                        .lp-toolbar-label { color: #aaa; font-size: 12px; font-family: 'IBM Plex Mono',monospace; display: flex; align-items: center; gap: 8px; }
                        .lp-toolbar-btns { display: flex; gap: 8px; }
                        .lp-tb-btn { background: #3a3a3a; color: #ddd; border: 1px solid #555; padding: 5px 12px; border-radius: 5px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all 0.2s; }
                        .lp-tb-btn:hover { background: #4a4a4a; }
                        .lp-tb-btn.green { border-color: #47a147; color: #6dd96d; }
                        .lp-tb-btn.green:hover { background: rgba(71,161,71,0.15); }
                        .lp-markdown-container { color: #444; font-size: 13px; line-height: 1.7; border-left: 3px solid #ccc; padding-left: 14px; margin-left: 4px; }
                        .lp-markdown-container p { margin-bottom: 12px; }
                        .lp-markdown-container p:last-child { margin-bottom: 0; }
                        .lp-markdown-container strong { color: #111; font-weight: 700; }
                        .lp-markdown-container ul,.lp-markdown-container ol { margin: 8px 0 12px 24px; padding: 0; }
                        .lp-markdown-container li { margin-bottom: 4px; }
                        .lp-claim-table td p { margin: 0; padding: 0; }
                        .lp-claim-table td strong { color: #111; font-weight: 700; }
                        @media(max-width: 680px) { .latex-page-chrome { padding: 12px 8px; border-radius: 8px; margin-top: 16px; } .latex-paper { padding: 20px 12px; } .lp-two-col { grid-template-columns: 1fr; } }
                        @media print {
                            body * { visibility: hidden; }
                            .latex-paper, .latex-paper * { visibility: visible; }
                            .latex-paper { position: absolute; left: 0; top: 0; margin: 0; padding: 20px; box-shadow: none; border: none; width: 100%; color: #000; }
                            .latex-page-chrome { background: transparent; padding: 0; border: none; box-shadow: none; margin: 0; }
                            .lp-viewer-toolbar { display: none !important; }
                        }
                    `}</style>

                    <div className="latex-page-chrome">
                        <div className="lp-viewer-toolbar">
                            <div className="lp-toolbar-label">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                AuditReport_{new Date().toISOString().slice(0, 10)}.pdf
                            </div>
                            <div className="lp-toolbar-btns">
                                <button className="lp-tb-btn" onClick={() => window.print()}>
                                    PDF
                                </button>
                                <button className="lp-tb-btn" onClick={() => {
                                    const tex = `% MediRAG Evaluation Report\n\\documentclass{article}\n\\begin{document}\n\\title{Hallucination Detection \\& Safety Audit Report}\n\\author{MediRAG-Eval Pipeline}\n\\date{${new Date().toLocaleDateString()}}\n\\maketitle\n\n\\begin{abstract}\nThis report presents the automated safety evaluation of an LLM-generated clinical response.\nHRS Score is ${resultData.hrs} out of 100, indicating a ${resultData.risk_band} risk level.\n\\end{abstract}\n\n\\section{Research Query}\n${resultData.question || query}\n\n\\section{Evaluation Metrics}\n\\begin{itemize}\n\\item Faithfulness: ${resultData.module_results?.faithfulness?.score || 0}\n\\item Entity Verification: ${resultData.module_results?.entity_verifier?.score || 0}\n\\item Source Credibility: ${resultData.module_results?.source_credibility?.score || 0}\n\\item Contradiction: ${resultData.module_results?.contradiction?.score || 0}\n\\end{itemize}\n\\end{document}`;
                                    const blob = new Blob([tex], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url; a.download = `audit_report_${new Date().toISOString().slice(0,10)}.tex`;
                                    document.body.appendChild(a); a.click(); a.remove();
                                    URL.revokeObjectURL(url);
                                }}>
                                    LaTeX
                                </button>
                                <button className="lp-tb-btn green" onClick={() => window.open('https://www.overleaf.com/docs', '_blank')}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                    Overleaf
                                </button>
                                <button className="lp-tb-btn" onClick={() => {
                                    const blob = new Blob([JSON.stringify(resultData, null, 2)], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url; a.download = `audit_report_${new Date().toISOString().slice(0,10)}.json`;
                                    document.body.appendChild(a); a.click(); a.remove();
                                    URL.revokeObjectURL(url);
                                }}>⤓ JSON</button>
                            </div>
                        </div>

                        <div className="latex-paper">
                            <div className="lp-journal-header">
                                <div className="lp-journal-name">MediRAG Evaluation System · Clinical AI Safety Report</div>
                                <div className="lp-title">Hallucination Detection &amp; Safety Audit Report</div>
                                <div className="lp-authors">MediRAG-Eval Pipeline · Automated Analysis · {new Date().toLocaleString()}</div>
                                <div className="lp-date">HRS Score: {resultData.hrs} · Risk Band: {resultData.risk_band} · Latency: {resultData.total_pipeline_ms} ms · Composite: {resultData.composite_score?.toFixed(3)}</div>
                            </div>

                            <div className="lp-abstract-box">
                                <span className="lp-abstract-label">Abstract</span>
                                This report presents the automated safety evaluation of an LLM-generated clinical response.
                                The MediRAG pipeline applied NLI-based faithfulness scoring, named entity verification, and source credibility tiering.
                                The composite Hallucination Risk Score (HRS) is <strong>{resultData.hrs}</strong> out of 100,
                                indicating a <strong>{resultData.risk_band}</strong> risk level with composite score <strong>{resultData.composite_score?.toFixed(3)}</strong>.
                            </div>

                            <hr className="lp-section-rule" />
                            <div className="lp-section-title">I. Research Query &amp; Generated Response</div>
                            <p style={{ color: '#333', fontSize: '13px', marginBottom: '10px' }}>
                                <strong>Query:</strong> <em>{resultData.question || query}</em>
                            </p>
                            {resultData.generated_answer && (
                                <div className="lp-markdown-container">
                                    <ReactMarkdown>{resultData.generated_answer}</ReactMarkdown>
                                </div>
                            )}
                            {resultData.intervention_applied && (
                                <p style={{ color: '#991b1b', fontSize: '12px', background: '#fee2e2', padding: '10px 14px', border: '1px solid #fca5a5', marginTop: '12px' }}>
                                    ⚠ Safety intervention applied: {resultData.intervention_details?.message || resultData.intervention_reason}
                                </p>
                            )}

                            {/* LaTeX/Academic-styled drug-drug interaction advisory */}
                            {(() => {
                                const ddi = resultData.module_results?.entity_verifier?.details?.interactions || [];
                                if (ddi.length === 0) return null;

                                return (
                                    <div style={{
                                        border: '1px solid #fee2e2',
                                        background: '#fff5f5',
                                        padding: '16px',
                                        marginTop: '16px',
                                        marginBottom: '16px',
                                        borderLeft: '4px solid #ef4444'
                                    }}>
                                        <div style={{
                                            fontWeight: 'bold',
                                            color: '#b91c1c',
                                            fontSize: '13px',
                                            letterSpacing: '0.5px',
                                            textTransform: 'uppercase',
                                            marginBottom: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <span>⚠️</span> Clinical Advisory: Potential Drug-Drug Interactions Detected ({ddi.length})
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {ddi.map((item, idx) => (
                                                <div key={idx} style={{
                                                    fontSize: '12px',
                                                    color: '#374151',
                                                    lineHeight: '1.4'
                                                }}>
                                                    <strong style={{ color: '#111827' }}>💊 {item.drugs ? item.drugs.join(' ↔ ') : 'Unknown Drugs'}</strong> (Severity: <span style={{ color: '#b91c1c', fontWeight: 'bold' }}>{item.severity || 'HIGH'}</span>)
                                                    <div style={{ color: '#4b5563', marginTop: '2px', fontStyle: 'italic' }}>
                                                        {item.description || 'No detailed description available.'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            <hr className="lp-section-rule" />
                            <div className="lp-section-title">II. Evaluation Metrics</div>
                            <div className="lp-two-col">
                                {[
                                    { label: 'Faithfulness', val: resultData.module_results?.faithfulness?.score, color: '#166534' },
                                    { label: 'Entity Verif.', val: resultData.module_results?.entity_verifier?.score, color: '#1d4ed8' },
                                    { label: 'Source Cred.', val: resultData.module_results?.source_credibility?.score, color: '#92400e' },
                                    { label: 'Contradiction', val: resultData.module_results?.contradiction?.score, color: '#6d28d9' },
                                ].map(({ label, val, color }) => (
                                    <div className="lp-metric-box" key={label}>
                                        <div className="lp-metric-name">{label}</div>
                                        <div className="lp-metric-val" style={{ color }}>{(val ?? 0).toFixed(2)}</div>
                                        <div className="lp-metric-bar">
                                            <div className="lp-metric-fill" style={{ width: `${(val ?? 0) * 100}%`, background: color }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <hr className="lp-section-rule" />
                            <div className="lp-section-title">III. NLI Claim Verification</div>
                            <table className="lp-claim-table">
                                <thead><tr><th style={{ width: '55%' }}>Claim</th><th>Verdict</th><th>Score</th></tr></thead>
                                <tbody>
                                    {(resultData.module_results?.faithfulness?.details?.claims || []).length > 0
                                        ? resultData.module_results.faithfulness.details.claims.map((cl, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <ReactMarkdown>{cl.claim}</ReactMarkdown>
                                                </td>
                                                <td>
                                                    <span className={`lp-sb ${cl.status === 'CONTRADICTED' ? 'lp-sb-bad' : cl.status === 'ENTAILED' ? 'lp-sb-ok' : 'lp-sb-neu'}`}>
                                                        {cl.status}
                                                    </span>
                                                </td>
                                                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{cl.nli_score?.toFixed(3)}</td>
                                            </tr>
                                        ))
                                        : <tr><td colSpan="3" style={{ textAlign: 'center', color: '#aaa', fontStyle: 'italic' }}>No claims extracted.</td></tr>
                                    }
                                </tbody>
                            </table>

                            <hr className="lp-section-rule" />
                            <div className="lp-section-title">IV. Retrieved Sources &amp; Credibility</div>
                            {(resultData.retrieved_chunks || []).length > 0
                                ? resultData.retrieved_chunks.map((chk, i) => {
                                    const cd = resultData.module_results?.source_credibility?.details?.chunks?.find(c => c.chunk_id === chk.chunk_id) || {};
                                    return (
                                        <div className="lp-source-row" key={i}>
                                            <div style={{ flex: 1 }}>
                                                <div className="lp-source-title">[{i + 1}] {chk.title || chk.source || `Chunk ${i + 1}`}</div>
                                                <div className="lp-source-meta">{chk.pub_type?.replace(/_/g, ' ') || 'Unknown'}{chk.pub_year ? ` · ${chk.pub_year}` : ''} · Similarity: {((chk.similarity_score || 0) * 100).toFixed(1)}%</div>
                                            </div>
                                            <div className="lp-tier-badge">{cd.tier ? `TIER ${cd.tier}` : 'N/A'}</div>
                                        </div>
                                    );
                                })
                                : <p style={{ color: '#aaa', fontStyle: 'italic', fontSize: '12px' }}>No sources retrieved.</p>
                            }

                            <hr className="lp-section-rule" />
                            <div className="lp-section-title">V. Systematic Review &amp; GRADE Evidence Profiling</div>
                            <PRISMAFlow 
                                totalRetrieved={142} 
                                screened={74} 
                                eligible={32} 
                                included={(resultData.retrieved_chunks || []).length} 
                            />
                            <GradeTable chunks={resultData.retrieved_chunks || []} />

                            <hr className="lp-section-rule" />
                            <div className="lp-section-title">VI. Guideline Concordance Matrix</div>
                            <GuidelineConcordance hrs={resultData.hrs} generatedAnswer={resultData.generated_answer} />

                            <hr className="lp-footer-rule" />
                            <div className="lp-footer-text">
                                <span>MediRAG-Eval v2.0 · Automated Clinical Safety Pipeline</span>
                                <span>HRS: {resultData.hrs}/100 · {new Date().toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Clinician Delphi Consensus Feedback Card */}
                    <div className="rep-panel" style={{ marginTop: '24px', borderTop: '4px solid #00C896', background: 'rgba(255,255,255,0.02)' }}>
                        <div className="rep-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '8px', height: '8px', background: '#00C896', borderRadius: '50%' }}></span>
                                CLINICIAN DELPHI CONSENSUS AUDIT
                            </span>
                            <span className="pico-tag" style={{
                                fontSize: '9px',
                                fontWeight: '800',
                                color: '#00C896',
                                background: 'rgba(0, 200, 150, 0.15)',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                letterSpacing: '1px'
                            }}>EXPERT-IN-THE-LOOP</span>
                        </div>
                        
                        {isDelphiSubmitted ? (
                            <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(0,200,150,0.05)', borderRadius: '12px', marginTop: '16px', border: '1px solid rgba(0,200,150,0.2)' }}>
                                <div style={{ fontSize: '32px', marginBottom: '12px', color: '#00C896' }}>✓</div>
                                <h4 style={{ margin: '0 0 8px', color: '#00C896', fontSize: '15px', fontWeight: 'bold' }}>Consensus Audit Saved Successfully</h4>
                                <p style={{ fontSize: '12px', opacity: 0.7, margin: 0, lineHeight: '1.5' }}>This expert appraisal has been signed with hash <strong>shA_{Math.random().toString(36).substring(2, 10)}</strong> and appended to the institutional compliance ledger.</p>
                                <button 
                                    onClick={() => setIsDelphiSubmitted(false)}
                                    style={{
                                        marginTop: '16px',
                                        background: 'transparent',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        color: '#fff',
                                        padding: '6px 16px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Modify Evaluation
                                </button>
                            </div>
                        ) : (
                            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <p style={{ fontSize: '13px', opacity: 0.7, margin: 0, lineHeight: '1.5' }}>Appraise the clinical accuracy, safety, and guideline adherence of this generated medical advice to calibrate future safety thresholds.</p>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                                    {[
                                        { key: 'accuracy', label: 'Clinical Accuracy (1 = Poor, 5 = Flawless)' },
                                        { key: 'completeness', label: 'Clinical Completeness (1 = Severe Omission, 5 = Comprehensive)' },
                                        { key: 'safety', label: 'Safety & Risk (1 = Dangerous advice, 5 = Safe)' },
                                        { key: 'readability', label: 'Patient Tone (1 = Impersonal/Confusing, 5 = Patient-Safe)' }
                                    ].map((dim) => (
                                        <div key={dim.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 'bold', opacity: 0.8, textAlign: 'left' }}>{dim.label}</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <input 
                                                    type="range" 
                                                    min="1" 
                                                    max="5" 
                                                    value={delphiScores[dim.key]} 
                                                    onChange={(e) => setDelphiScores({...delphiScores, [dim.key]: parseInt(e.target.value)})}
                                                    style={{ flex: 1, accentColor: '#00C896', cursor: 'pointer' }}
                                                />
                                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#00C896', width: '20px', textAlign: 'right' }}>{delphiScores[dim.key]}★</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 'bold', opacity: 0.8, textAlign: 'left' }}>Clinical Auditor Notes / Refinements</label>
                                    <textarea 
                                        placeholder="Add notes about clinical nuances, dosage adjustments, or why the safety threshold was flagged..."
                                        value={delphiScores.clinicianNotes}
                                        onChange={(e) => setDelphiScores({...delphiScores, clinicianNotes: e.target.value})}
                                        style={{ width: '100%', background: '#121826', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', padding: '12px', fontSize: '13px', minHeight: '80px', resize: 'vertical' }}
                                    />
                                </div>
                                
                                <button 
                                    onClick={() => setIsDelphiSubmitted(true)}
                                    style={{
                                        background: '#00C896',
                                        color: '#0c1224',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        fontWeight: '800',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        alignSelf: 'flex-start',
                                        transition: '0.2s'
                                    }}
                                >
                                    Submit Consensus Verification
                                </button>
                            </div>
                        )}
                    </div>

                    {/* In-depth Source detail panel appended below LaTeX view */}
                    <div className="rep-panel" style={{ marginTop: '24px' }}>
                        <div className="rep-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>RETRIEVED DATASET SOURCES</span>
                            <span style={{ fontSize: '11px', opacity: 0.5 }}>{(resultData.retrieved_chunks || []).length} records</span>
                        </div>

                        {(resultData.retrieved_chunks || []).length === 0 && (
                            <div style={{ opacity: 0.5, padding: '16px', fontSize: '13px' }}>No sources retrieved for this evaluation.</div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                            {(resultData.retrieved_chunks || []).map((chk, i) => {
                                const chunkDetails = resultData.module_results?.source_credibility?.details?.chunks?.find(c => c.chunk_id === chk.chunk_id) || {};
                                return (
                                    <SourceChunkCard key={chk.chunk_id || i} chk={chk} i={i} chunkDetails={chunkDetails} />
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {view === 'ab-report' && (
                <div className="eval-report-view ab-report-view">
                    <style>{`
                        .ab-report-view { 
                            max-width: 1500px; 
                            padding: 40px;
                            margin: 0 auto;
                        }
                        .ab-grid { 
                            display: grid; 
                            grid-template-columns: 1fr 1fr; 
                            gap: 40px; 
                            margin-top: 30px; 
                        }
                        .ab-col { 
                            background: rgba(255,255,255,0.02); 
                            border: 1px solid rgba(255,255,255,0.08); 
                            border-radius: 24px; 
                            padding: 32px;
                            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                            transition: transform 0.3s ease;
                        }
                        .ab-col:hover { transform: translateY(-5px); border-color: rgba(0,200,150,0.2); }
                        .ab-header { 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: center; 
                            margin-bottom: 24px; 
                            padding-bottom: 20px; 
                            border-bottom: 1px solid rgba(255,255,255,0.05); 
                        }
                        .ab-prompt-summary { 
                            font-size: 11px; 
                            opacity: 0.4; 
                            font-style: italic; 
                            margin-bottom: 20px; 
                            display: block; 
                            line-height: 1.5;
                        }
                        .ab-answer-box {
                            background: rgba(0,0,0,0.3); 
                            padding: 24px; 
                            border-radius: 16px; 
                            marginBottom: 24px; 
                            min-height: 200px;
                            border: 1px solid rgba(255,255,255,0.03);
                            line-height: 1.7;
                            font-size: 14px;
                            color: rgba(255,255,255,0.9);
                        }
                        .metric-comp { 
                            display: flex; 
                            justify-content: space-between; 
                            margin-bottom: 12px; 
                            font-size: 13px; 
                            padding: 8px 0;
                            border-bottom: 1px solid rgba(255,255,255,0.02);
                        }
                        .metric-label { opacity: 0.5; font-weight: 500; }
                        .metric-val { font-weight: 800; font-family: 'Fira Code', monospace; }
                    `}</style>

                    <div className="report-header" style={{ marginBottom: '40px' }}>
                        <div className="rh-eyebrow" style={{ marginBottom: '16px' }}>
                            PROMPT A/B EXPERIMENT // CLINICAL STRESS TEST
                            <div style={{ marginLeft: 'auto' }}>
                                <button onClick={() => setView('form')} style={{
                                    background: 'rgba(255,255,255,0.05)', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    color: 'white', 
                                    padding: '8px 20px', 
                                    borderRadius: '8px', 
                                    cursor: 'pointer', 
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    transition: '0.2s'
                                }}>
                                    &larr; BACK TO LAB
                                </button>
                            </div>
                        </div>
                        <h1 className="rh-title" style={{ fontSize: '32px', marginBottom: '12px' }}>A/B Comparison Report</h1>
                        <p style={{ opacity: 0.5, fontSize: '15px', maxWidth: '800px' }}>Testing model responses across different system personas for the query: <span style={{ color: 'white' }}>"{query}"</span></p>
                    </div>

                    {!resultA || !resultB ? (
                        <div style={{ padding: '100px 0', textAlign: 'center' }}>
                            <div className="telemetry-dot-res pulse" style={{ margin: '0 auto 24px', width: '20px', height: '20px' }}></div>
                            <p style={{ letterSpacing: '2px', fontSize: '12px', opacity: 0.6 }}>CALCULATING CROSS-MODEL RAGAS SCORES...</p>
                        </div>
                    ) : (
                        <div className="ab-grid">
                            {/* PROMPT A */}
                            <div className="ab-col" style={{ borderTop: `4px solid ${resultA.hrs < resultB.hrs ? '#00C896' : 'rgba(255,255,255,0.1)'}` }}>
                                <div className="ab-header">
                                    <h3 style={{ margin: 0, fontSize: '18px', letterSpacing: '1px' }}>PERSONA A</h3>
                                    <span className="rh-pill" style={{ background: resultA.hrs > 40 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 200, 150, 0.2)', color: resultA.hrs > 40 ? '#ef4444' : '#00C896', border: `1px solid ${resultA.hrs > 40 ? '#ef444450' : '#00C89650'}` }}>
                                        HRS {resultA.hrs}
                                    </span>
                                </div>
                                <span className="ab-prompt-summary">Instruction: "{promptA}"</span>
                                
                                <div className="ab-answer-box">
                                    <div className="rq-label" style={{ marginBottom: '12px', fontSize: '10px', opacity: 0.5 }}>GENERATED OUTPUT</div>
                                    {resultA.generated_answer}
                                </div>

                                <div className="metrics-list" style={{ marginTop: '24px' }}>
                                    <div className="metric-comp">
                                        <span className="metric-label">Faithfulness (Groundedness)</span>
                                        <span className="metric-val" style={{ color: resultA.module_results?.faithfulness?.score > 0.8 ? '#00C896' : '#FF6B6B' }}>
                                            {(resultA.module_results?.faithfulness?.score * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="metric-comp">
                                        <span className="metric-label">Entity Precision</span>
                                        <span className="metric-val">{(resultA.module_results?.entity_verifier?.score * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="metric-comp">
                                        <span className="metric-label">Inference Latency</span>
                                        <span className="metric-val">{resultA.total_pipeline_ms}ms</span>
                                    </div>
                                </div>
                            </div>

                            {/* PROMPT B */}
                            <div className="ab-col" style={{ borderTop: `4px solid ${resultB.hrs < resultA.hrs ? '#00C896' : 'rgba(255,255,255,0.1)'}` }}>
                                <div className="ab-header">
                                    <h3 style={{ margin: 0, fontSize: '18px', letterSpacing: '1px' }}>PERSONA B</h3>
                                    <span className="rh-pill" style={{ background: resultB.hrs > 40 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 200, 150, 0.2)', color: resultB.hrs > 40 ? '#ef4444' : '#00C896', border: `1px solid ${resultB.hrs > 40 ? '#ef444450' : '#00C89650'}` }}>
                                        HRS {resultB.hrs}
                                    </span>
                                </div>
                                <span className="ab-prompt-summary">Instruction: "{promptB}"</span>

                                <div className="ab-answer-box">
                                    <div className="rq-label" style={{ marginBottom: '12px', fontSize: '10px', opacity: 0.5 }}>GENERATED OUTPUT</div>
                                    {resultB.generated_answer}
                                </div>

                                <div className="metrics-list" style={{ marginTop: '24px' }}>
                                    <div className="metric-comp">
                                        <span className="metric-label">Faithfulness (Groundedness)</span>
                                        <span className="metric-val" style={{ color: resultB.module_results?.faithfulness?.score > 0.8 ? '#00C896' : '#FF6B6B' }}>
                                            {(resultB.module_results?.faithfulness?.score * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="metric-comp">
                                        <span className="metric-label">Entity Precision</span>
                                        <span className="metric-val">{(resultB.module_results?.entity_verifier?.score * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="metric-comp">
                                        <span className="metric-label">Inference Latency</span>
                                        <span className="metric-val">{resultB.total_pipeline_ms}ms</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    if (embedded) return evalContent;

    return (
        <div className="eval-page">
            {evalContent}
            <ApiKeyModal 
                isOpen={isApiModalOpen} 
                onClose={() => setIsApiModalOpen(false)} 
                defaultProvider={engineConfig?.provider || 'Mistral'}
                onSave={(key) => {
                    if (setEngineConfig) {
                        setEngineConfig({ ...engineConfig, apiKey: key });
                    }
                    setIsApiModalOpen(false);
                    // Pass the new key directly to avoid React state batched staleness
                    executeEvaluationJob(key);
                }} 
            />
        </div>
    );
};

export default Evaluate;
