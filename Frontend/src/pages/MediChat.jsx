import React, { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import './MediChat.css';
import ApiKeyModal from '../components/ApiKeyModal';

const POPULAR_TOPICS = [
    { icon: '🩸', label: 'Blood Pressure Tips' },
    { icon: '🔬', label: 'Lab Result Guide' },
    { icon: '💊', label: 'Medication Safety' },
    { icon: '🫀', label: 'Heart Health FAQ' },
];

const INITIAL_TOPICS = [
    'Can you explain the long-term effects of Metformin?',
    'What are the warning signs of kidney disease?',
    'Is ibuprofen safe for daily use?',
    'What does a high HbA1c level indicate?',
];

function getRiskBadge(risk_band) {
    const rb = (risk_band || '').toUpperCase();
    if (rb === 'LOW') return { label: 'SAFE TO READ', cls: 'safe', color: '#00C896' };
    if (rb === 'MODERATE') return { label: 'USE CAUTION', cls: 'moderate', color: '#ffc832' };
    if (rb === 'HIGH' || rb === 'CRITICAL') return { label: 'HIGH RISK', cls: 'high', color: '#ff6432' };
    return { label: 'ANALYZING', cls: 'safe', color: '#00C896' };
}

function HeatmapAnswer({ claims }) {
    if (!claims || claims.length === 0) return null;

    return (
        <div style={{ lineHeight: 1.8, fontSize: '14.5px', color: 'var(--mc-text-primary)' }}>
            {claims.map((item, i) => {
                const status = item.status;
                const score = item.nli_score;
                
                let bgColor = 'transparent';
                let borderColor = 'transparent';
                let label = '';

                if (status === 'ENTAILED') {
                    bgColor = 'rgba(0, 200, 150, 0.08)';
                    borderColor = 'rgba(0, 200, 150, 0.2)';
                    label = 'Verified';
                } else if (status === 'CONTRADICTED') {
                    bgColor = 'rgba(255, 100, 50, 0.15)';
                    borderColor = 'rgba(255, 100, 50, 0.4)';
                    label = 'Possible Hallucination';
                } else {
                    bgColor = 'rgba(255, 200, 50, 0.1)';
                    borderColor = 'rgba(255, 200, 50, 0.3)';
                    label = 'Uncertain / No Evidence';
                }

                let htmlFormat = item.claim.replace(/\*\*(.*?)\*\*/g, '<strong class="mc-heatmap-bold">$1</strong>');
                htmlFormat = htmlFormat.replace(/(?<!\*)\*(?!\*)(.*?)\*/g, '<em>$1</em>');
                htmlFormat = htmlFormat.replace(/(\[not cited.*?\])/gi, '<span style="opacity: 0.5; font-size: 12px; font-style: italic;">$1</span>');

                const isListItem = /^\s*(?:\d+\.|-|\*)\s/.test(item.claim);
                const isHeader = /^\s*#+\s|\bRecommendation(s)?:\b/i.test(item.claim);

                return (
                    <React.Fragment key={i}>
                        {(isListItem || isHeader) && i > 0 && <><br /><br /></>}
                        <span 
                            className="heatmap-sentence"
                            title={`${label} (Score: ${score})`}
                            style={{
                                display: 'inline',
                                padding: '3px 0',
                                backgroundColor: bgColor,
                                borderBottom: `2px solid ${borderColor}`,
                                marginRight: '4px',
                                cursor: 'help',
                                transition: 'all 0.2s',
                                borderRadius: '2px',
                                paddingLeft: isListItem ? '12px' : '0'
                            }}
                            dangerouslySetInnerHTML={{ __html: htmlFormat + ' ' }}
                        />
                    </React.Fragment>
                );
            })}
            <div style={{ marginTop: '16px', display: 'flex', gap: '15px', fontSize: '10px', fontWeight: 700, opacity: 0.6, letterSpacing: '0.5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', background: '#00C896', borderRadius: '2px' }} /> VERIFIED
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', background: '#ffc832', borderRadius: '2px' }} /> UNCERTAIN
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', background: '#ff6432', borderRadius: '2px' }} /> HALLUCINATION
                </div>
            </div>
        </div>
    );
}

function FormattedAnswer({ text, claims }) {
    if (claims && claims.length > 0) {
        return <HeatmapAnswer claims={claims} />;
    }
    if (!text) return null;
    const lines = text.split('\n').filter(l => l.trim() !== '');
    return (
        <div style={{ lineHeight: 1.78, fontSize: '14px', color: 'var(--mc-text-primary)' }}>
            {lines.map((line, i) => {
                const t = line.trim();
                if (/^[-*\u2022]\s/.test(t)) {
                    return (
                        <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '7px', paddingLeft: '4px' }}>
                            <span style={{ color: '#00C896', marginTop: '2px', flexShrink: 0 }}>►</span>
                            <span>{t.replace(/^[-*\u2022]\s/, '')}</span>
                        </div>
                    );
                }
                if (/^\d+\.\s/.test(t)) {
                    const num = t.match(/^(\d+)\./)?.[1];
                    return (
                        <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '7px', paddingLeft: '4px' }}>
                            <span style={{ color: '#00C896', fontWeight: 700, minWidth: '18px', flexShrink: 0 }}>{num}.</span>
                            <span>{t.replace(/^\d+\.\s/, '')}</span>
                        </div>
                    );
                }
                if (/^\*\*(.+)\*\*$/.test(t) || /^#+\s/.test(t)) {
                    const clean = t.replace(/^\*\*|\*\*$|^#+\s/g, '');
                    return <div key={i} style={{ fontWeight: 700, color: 'var(--mc-text-bold)', margin: '14px 0 6px', fontSize: '13.5px' }}>{clean}</div>;
                }
                return <p key={i} style={{ margin: '0 0 10px 0' }}>{t}</p>;
            })}
        </div>
    );
}

function HRSGauge({ hrs }) {
    if (hrs == null) return null;
    const color = hrs <= 30 ? '#00C896' : hrs <= 60 ? '#ffc832' : '#ff6432';
    const label = hrs <= 30 ? 'LOW HALLUCINATION RISK' : hrs <= 60 ? 'MODERATE RISK' : 'HIGH HALLUCINATION RISK';
    return (
        <div className="mc-risk-gauge-card">
            <div className="mc-risk-gauge-header">
                <span className="mc-risk-gauge-label">
                    ⛨ Hallucination Risk Score
                </span>
                <span className="mc-risk-gauge-value" style={{ color }}>
                    {hrs}<span className="mc-risk-gauge-total">/100</span>
                </span>
            </div>
            <div className="mc-risk-gauge-bar-bg">
                <div className="mc-risk-gauge-bar-fill" style={{ width: `${hrs}%`, background: `linear-gradient(90deg, #10B981, ${color})` }} />
            </div>
            <div className="mc-risk-gauge-footer" style={{ color }}>{label}</div>
        </div>
    );
}

function ModulePill({ label, score, invert }) {
    if (score == null) return null;
    const val = invert ? (1 - score) : score;
    const pct = Math.round(val * 100);
    const color = pct >= 75 ? '#00C896' : pct >= 50 ? '#ffc832' : '#ff6432';
    return (
        <div style={{ background: 'var(--mc-bg-pill)', border: '1px solid var(--mc-border-pill)', borderRadius: '8px', padding: '8px 10px', flex: '1', minWidth: '76px', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: 'var(--mc-text-muted)', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '17px', fontWeight: 900, color }}>{pct}%</div>
        </div>
    );
}

function AIMessageCard({ msg, onCompare }) {
    const [expanded, setExpanded] = useState(false);
    const data = msg.data;
    const badge = getRiskBadge(data?.risk_band);
    const hrs = data?.hrs;
    const chunks = data?.retrieved_chunks || [];
    const mod = data?.module_results || {};
    const isIntervened = data?.intervention_applied;
    const interventionReason = data?.intervention_reason;

    return (
        <div className="mc-ai-card">
            {/* Header */}
            <div className="mc-ai-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div className={`mc-safety-badge ${badge.cls}`}>
                    <span>●</span>{badge.label}
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {isIntervened && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div className="mc-intervention-badge">
                                ⚡ {interventionReason === 'CRITICAL_BLOCKED' ? 'BLOCKED' : 'REGENERATED'}
                            </div>
                            {onCompare && (
                                <button
                                    onClick={() => onCompare(data)}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#f87171',
                                        fontSize: '9px',
                                        fontWeight: '800',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        letterSpacing: '0.5px',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    🔍 COMPARE DRAFTS
                                </button>
                            )}
                        </div>
                    )}
                    {data?.total_pipeline_ms && (
                        <span className="mc-pipeline-latency">⏱ {data.total_pipeline_ms}ms</span>
                    )}
                </div>
            </div>

            {data?.original_hinglish_query && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02))',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '14px',
                    fontSize: '12.5px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 800 }}>
                        <span style={{ fontSize: '14px' }}>🌐</span>
                        <span>Hinglish Auto-Translation Active</span>
                    </div>
                    <div style={{ color: 'var(--mc-text-secondary)', fontStyle: 'italic', paddingLeft: '20px' }}>
                        "{data.original_hinglish_query}"
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--mc-text-muted)', paddingLeft: '20px', fontWeight: 500 }}>
                        → Translated to English: "{data.question}"
                    </div>
                </div>
            )}

            {/* HRS Gauge */}
            <HRSGauge hrs={hrs} />

            {/* Formatted Answer */}
            <div className="mc-answer-section">
                <div className="mc-answer-label">
                    📄 MediRAG Response — grounded from {chunks.length > 0 ? `${chunks.length} retrieved source${chunks.length > 1 ? 's' : ''}` : 'medical dataset'}
                </div>
                <FormattedAnswer 
                    text={data?.generated_answer || msg.text} 
                    claims={mod.faithfulness?.details?.claims} 
                />
            </div>

            {/* Module Scores */}
            {(mod.faithfulness || mod.source_credibility || mod.contradiction || mod.entity_verifier) && (
                <div className="mc-modules-section">
                    <div className="mc-modules-label">
                        ✔ Safety Evaluation Modules
                    </div>
                    <div className="mc-modules-grid">
                        <ModulePill label="Faithfulness" score={mod.faithfulness?.score} />
                        <ModulePill label="Src. Cred." score={mod.source_credibility?.score} />
                        <ModulePill label="Consistency" score={mod.contradiction?.score} />
                        <ModulePill label="Entity Acc." score={mod.entity_verifier?.score} />
                    </div>
                </div>
            )}

            {/* Source Citations */}
            {chunks.length > 0 ? (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                    <button className="mc-expand-btn" onClick={() => setExpanded(e => !e)}>
                        {expanded ? '▲ Hide' : '▼ View'} {chunks.length} verified source{chunks.length > 1 ? 's' : ''} from medical dataset
                    </button>
                    {expanded && (
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {chunks.map((c, i) => {
                                const sim = typeof c.similarity_score === 'number' ? c.similarity_score : parseFloat(c.similarity_score) || 0;
                                const simPct = Math.min(100, Math.round(sim * 100));
                                const simColor = simPct >= 70 ? '#00C896' : simPct >= 40 ? '#ffc832' : '#ff6432';
                                const tierColor = {
                                    'systematic review': '#a78bfa',
                                    'rct': '#60a5fa',
                                    'clinical trial': '#60a5fa',
                                    'meta-analysis': '#a78bfa',
                                    'guideline': '#34d399',
                                    'review': '#fb923c',
                                }[(c.pub_type || '').toLowerCase()] || '#64748b';

                                return (
                                    <div key={i} style={{
                                        background: 'var(--mc-bg-citation)',
                                        border: '1px solid var(--mc-border-citation)',
                                        borderLeft: `3px solid ${simColor}`,
                                        borderRadius: '10px',
                                        padding: '14px 16px',
                                        transition: 'all 0.2s',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                                                    <span style={{
                                                        background: simColor,
                                                        color: '#000',
                                                        fontWeight: 900,
                                                        fontSize: '10px',
                                                        padding: '2px 7px',
                                                        borderRadius: '4px',
                                                        flexShrink: 0,
                                                    }}>#{i + 1}</span>
                                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--mc-text-bold)', lineHeight: 1.4 }}>
                                                        {c.title || 'Medical Literature'}
                                                    </span>
                                                </div>
                                                {c.source && (
                                                    <div style={{ fontSize: '11px', color: 'var(--mc-text-muted)', marginBottom: '4px' }}>
                                                        📰 {c.source}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0 }}>
                                                {c.pub_type && (
                                                    <span style={{
                                                        fontSize: '9px', fontWeight: 800, letterSpacing: '0.5px',
                                                        background: `${tierColor}22`,
                                                        color: tierColor,
                                                        border: `1px solid ${tierColor}55`,
                                                        borderRadius: '4px',
                                                        padding: '3px 8px',
                                                        textTransform: 'uppercase',
                                                    }}>{c.pub_type}</span>
                                                )}
                                                {c.pub_year && (
                                                    <span style={{ fontSize: '10px', color: 'var(--mc-text-muted)', fontWeight: 600 }}>{c.pub_year}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '11px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '10px', color: 'var(--mc-text-muted)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                                    Relevance Score
                                                </span>
                                                <span style={{ fontSize: '10px', fontWeight: 800, color: simColor }}>
                                                    {simPct > 0 ? `${simPct}%` : (sim > 0 ? sim.toFixed(3) : 'N/A')}
                                                </span>
                                            </div>
                                            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: simPct > 0 ? `${simPct}%` : (sim > 0 ? `${Math.round(sim * 100)}%` : '0%'),
                                                    background: `linear-gradient(90deg, ${simColor}88, ${simColor})`,
                                                    borderRadius: '99px',
                                                    transition: 'width 0.8s ease',
                                                }} />
                                            </div>
                                        </div>

                                        <div style={{
                                            fontSize: '12.5px',
                                            color: 'var(--mc-text-secondary)',
                                            lineHeight: 1.7,
                                            background: 'var(--mc-bg-citation-snippet)',
                                            borderRadius: '7px',
                                            padding: '10px 12px',
                                            borderLeft: '2px solid var(--mc-border-citation-snippet)',
                                            fontFamily: 'inherit',
                                        }}>
                                            {(c.text || 'No text preview available.').slice(0, 500)}
                                            {(c.text || '').length > 500 && (
                                                <span style={{ color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}> …[truncated]</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ fontSize: '11px', color: 'rgba(255,200,50,0.65)', marginTop: '10px', background: 'rgba(255,200,50,0.05)', borderRadius: '7px', padding: '8px 12px', border: '1px solid rgba(255,200,50,0.12)' }}>
                    ⚠ No dataset sources retrieved — ensure the FAISS index is built and the backend is running.
                </div>
            )}
        </div>
    );
}

function generateDocSuggestions(text) {
    const lower = text.toLowerCase();
    const suggestions = [];
    if (lower.includes('metformin') || lower.includes('diabetes') || lower.includes('insulin')) {
        suggestions.push('What is the correct dosage mentioned in this document?');
        suggestions.push('Are there any drug interactions I should be aware of?');
    }
    if (lower.includes('blood pressure') || lower.includes('hypertension') || lower.includes('atenolol') || lower.includes('amlodipine')) {
        suggestions.push('What medications are mentioned for blood pressure?');
        suggestions.push('Are there contraindications listed in this document?');
    }
    if (lower.includes('allergy') || lower.includes('allergic') || lower.includes('penicillin') || lower.includes('amoxicillin')) {
        suggestions.push('What allergies are mentioned in this document?');
        suggestions.push('What alternative medications are recommended?');
    }
    const generic = [
        'Is the information in this document medically accurate?',
        'What are the key medical findings in this document?',
        'Are there any safety concerns mentioned?',
        'What follow-up care is recommended?',
    ];
    for (const g of generic) {
        if (suggestions.length >= 4) break;
        if (!suggestions.includes(g)) suggestions.push(g);
    }
    return suggestions.slice(0, 4);
}

const SCENARIOS = [
    {
        id: 'hinglish-poly',
        tag: 'Hinglish Mode',
        tagClass: 'hinglish',
        title: 'Bilingual Diabetes Consult',
        desc: 'Metformin dosage with alcohol safety audit in conversational Hinglish.',
        prompt: 'Sugar ke liye Metformin starting dose kya hona chahiye aur alcohol ke sath safe hai?',
        hinglish: true,
        hallucinate: null,
    },
    {
        id: 'preg-ibu',
        tag: 'Safety Intervention',
        tagClass: 'hallucination',
        title: 'Pregnancy NSAID Safety Check',
        desc: 'Tests maternal safety constraints with a simulated model hallucination.',
        prompt: 'Is it safe to prescribe Ibuprofen 800mg to a patient in their 3rd trimester of pregnancy?',
        hinglish: false,
        hallucinate: 'Ibuprofen 800mg is extremely safe in third-trimester pregnancy and recommended for maternal back pain.',
    },
    {
        id: 'patient-empath',
        tag: 'Patient Portal',
        tagClass: 'patient',
        title: 'Empathetic Patient Notes',
        desc: 'Translates technical doctor jargon into warm patient portal language with PHI masking.',
        prompt: 'Patient presents with severe acute exacerbation of COPD. Prescribe Prednisone 40mg PO QD x 5 days. Redact patient name: John Doe, DOB: 12/15/1965.',
        hinglish: false,
        hallucinate: null,
    },
    {
        id: 'hospital-ehr',
        tag: 'Hospital Panel',
        tagClass: 'hospital',
        title: 'EHR Ward Guidelines Audit',
        desc: 'Simulates local hospital compliance check with ward threshold rules.',
        prompt: 'Audit prescription: Cardiology ward patient John Doe is prescribed Atenolol 100mg QD. Patient has historical acute asthma exacerbations.',
        hinglish: false,
        hallucinate: null,
    },
    {
        id: 'space-refusal',
        tag: 'Domain Refusal',
        tagClass: 'refusal',
        title: 'Non-Clinical Refusal Gate',
        desc: 'Validates automated safety refusal loop with an out-of-domain query.',
        prompt: 'What is the standard orbital velocity of the International Space Station?',
        hinglish: false,
        hallucinate: null,
    }
];

const MediChat = ({ engineConfig }) => {
    const [sessions, setSessions] = useState([
        { id: 1, title: 'Checking Diabetes Info', messages: [] },
        { id: 2, title: 'Heart Health Overview', messages: [] },
    ]);
    const [activeSession, setActiveSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [error, setError] = useState('');
    const [localApiKey, setLocalApiKey] = useState(() => {
        return sessionStorage.getItem('medirag_api_key') 
            || engineConfig?.apiKey 
            || import.meta.env.VITE_MISTRAL_API_KEY 
            || '';
    });
    
    useEffect(() => {
        if (localApiKey) {
            sessionStorage.setItem('medirag_api_key', localApiKey);
        } else {
            sessionStorage.removeItem('medirag_api_key');
        }
    }, [localApiKey]);

    const [showKey, setShowKey] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [localConfig, setLocalConfig] = useState({
        apiUrl: engineConfig?.apiUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
        provider: engineConfig?.provider || 'Mistral',
        model: engineConfig?.model || 'mistral-large-latest',
        topK: engineConfig?.topK || 5,
        runRagas: engineConfig?.runRagas || false,
    });
    const [uploadedDocText, setUploadedDocText] = useState('');
    const [uploadedDocName, setUploadedDocName] = useState('');
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const [persona, setPersona] = useState('physician');
    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const pasteFileRef = useRef(null);
    const chatContainerRef = useRef(null);
    const [isExporting, setIsExporting] = useState(false);

    // ── Voice Assistant States & Functions ──
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState('Listening...');
    const [transcribedText, setTranscribedText] = useState('');
    const recognitionRef = useRef(null);
    const [isHinglishActive, setIsHinglishActive] = useState(false);
    const [compareData, setCompareData] = useState(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [hinglishAuditData, setHinglishAuditData] = useState(null);
    const [editedTranslation, setEditedTranslation] = useState('');
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [transcriptionBase, setTranscriptionBase] = useState('');
    const [activeWard, setActiveWard] = useState('opd');
    const [simulateAllergy, setSimulateAllergy] = useState(false);

    // Custom department settings loaded from localStorage
    const [hospitalDepts, setHospitalDepts] = useState(() => {
        try {
            const saved = localStorage.getItem('medirag_hospital_departments');
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse hospital departments:", e);
        }
        return [
            { id: 'oncology', name: 'Oncology & Cancer Care', active: true, hrsLimit: 25, latencyLimit: 8000 },
            { id: 'cardiology', name: 'Cardiology Center', active: true, hrsLimit: 30, latencyLimit: 5000 },
            { id: 'pediatrics', name: 'Pediatrics Department', active: true, hrsLimit: 20, latencyLimit: 6000 },
            { id: 'emergency', name: 'Emergency Room (ER)', active: false, hrsLimit: 50, latencyLimit: 2000 },
            { id: 'opd', name: 'General OPD & Telehealth', active: true, hrsLimit: 60, latencyLimit: 4000 }
        ];
    });

    useEffect(() => {
        try {
            const saved = localStorage.getItem('medirag_hospital_departments');
            if (saved) {
                setHospitalDepts(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to parse hospital departments:", e);
        }
    }, [activeWard]);

    const startVoiceMode = () => {
        setTranscriptionBase('');
        setTranscribedText('');
        setIsMicMuted(false);
        startVoiceRecognitionSession('');
    };

    const startVoiceRecognitionSession = (baseText = '') => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition is not supported in this browser. Please use Chrome or Safari.");
            return;
        }

        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.lang = 'en-US';
        rec.interimResults = true;

        rec.onstart = () => {
            setVoiceStatus('Listening to query...');
            setIsVoiceActive(true);
        };

        rec.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            const liveText = finalTranscript || interimTranscript;
            if (liveText.trim()) {
                const fullText = baseText 
                    ? `${baseText.trim()} ${liveText.trim()}`
                    : liveText.trim();
                setTranscribedText(fullText);
            }
        };

        rec.onerror = (e) => {
            console.error("Speech Recognition Error:", e);
            if (e.error !== 'aborted') {
                setVoiceStatus('Error, please try again.');
            }
        };

        recognitionRef.current = rec;
        rec.start();
    };

    const toggleMicMute = () => {
        if (isMicMuted) {
            // Unmute / Resume
            setIsMicMuted(false);
            setTranscriptionBase(transcribedText);
            startVoiceRecognitionSession(transcribedText);
        } else {
            // Mute / Pause
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch(e) {}
            }
            setIsMicMuted(true);
            setTranscriptionBase(transcribedText);
            setVoiceStatus('🎙 Microphone Muted (Paused)');
        }
    };


    const handleTranslateTranscription = async () => {
        if (!transcribedText || !transcribedText.trim()) return;
        
        const resolvedKey = localApiKey || engineConfig?.apiKey || '';
        if (!resolvedKey) {
            setVoiceStatus('API Key required. Opening configuration modal...');
            setIsApiModalOpen(true);
            return;
        }

        setIsTranslating(true);
        const originalStatus = voiceStatus;
        setVoiceStatus('Translating transcription to clinical English...');
        try {
            const res = await fetch(`${localConfig.apiUrl}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: transcribedText,
                    llm_provider: localConfig.provider.toLowerCase(),
                    llm_model: localConfig.model,
                    llm_api_key: resolvedKey
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Translation failed');
            
            if (data.translated_text) {
                setTranscribedText(data.translated_text);
                setVoiceStatus('Successfully translated query!');
            }
        } catch (err) {
            console.error("Transcribe translate failed:", err);
            setVoiceStatus('Translation failed. Please try again.');
            setTimeout(() => setVoiceStatus(originalStatus), 3000);
        } finally {
            setIsTranslating(false);
        }
    };


    const handleSendVoiceQuery = () => {
        setIsVoiceActive(false);
        if (transcribedText.trim()) {
            sendMessage(transcribedText.trim());
        }
    };


    const exportToPDF = () => {
        if (!chatContainerRef.current) return;
        setIsExporting(true);
        const element = chatContainerRef.current;
        const opt = {
            margin:       10,
            filename:     `Clinical_Report_${activeSession || Date.now()}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#05070a', windowWidth: element.scrollWidth },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            setIsExporting(false);
        }).catch(err => {
            console.error("PDF Export Error:", err);
            setIsExporting(false);
        });
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    const startNewChat = () => {
        const id = Date.now();
        setSessions(prev => [{ id, title: 'New Chat', messages: [] }, ...prev]);
        setActiveSession(id);
        setMessages([]);
        setError('');
    };

    const loadSession = (session) => {
        setActiveSession(session.id);
        setMessages(session.messages);
        setError('');
    };

    const [isApiModalOpen, setIsApiModalOpen] = useState(false);
    const [pendingQuery, setPendingQuery] = useState('');

    const sendMessage = async (text, useHinglishOverride = null, injectedClaim = null, isAlreadyTranslated = false) => {
        const q = (text || input).trim();
        if (!q || isThinking || isTranslating) return;

        const resolvedKey = localApiKey || engineConfig?.apiKey || '';
        if (!resolvedKey) {
            setPendingQuery(q);
            setIsApiModalOpen(true);
            return;
        }

        const isHinglish = useHinglishOverride !== null ? useHinglishOverride : isHinglishActive;

        if (isHinglish && !isAlreadyTranslated) {
            setIsTranslating(true);
            try {
                const res = await fetch(`${localConfig.apiUrl}/translate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: q,
                        llm_provider: localConfig.provider.toLowerCase(),
                        llm_model: localConfig.model,
                        llm_api_key: resolvedKey
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Translation failed');
                
                setEditedTranslation(data.translated_text);
                setHinglishAuditData({
                    original: q,
                    translated: data.translated_text,
                    injectedClaim: injectedClaim,
                    useHinglishOverride: isHinglish
                });
            } catch (err) {
                console.error("Hinglish Translator API error:", err);
                executeQuery(q, resolvedKey, isHinglish, injectedClaim);
            } finally {
                setIsTranslating(false);
            }
        } else {
            executeQuery(q, resolvedKey, isHinglish, injectedClaim);
        }
    };

    const executeQuery = async (q, activeKey, useHinglishOverride = null, injectedClaim = null, preTransOriginal = null) => {
        const userMsg = { id: Date.now(), role: 'user', text: preTransOriginal || q };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setIsThinking(true);
        setError('');

        let sid = activeSession;
        if (!sid) {
            sid = Date.now();
            setSessions(prev => [{ id: sid, title: (preTransOriginal || q).slice(0, 40), messages: [] }, ...prev]);
            setActiveSession(sid);
        }

        try {
            const endpoint = `${localConfig.apiUrl}/query`;
            const enrichedQuestion = uploadedDocText
                ? `[User uploaded document: ${uploadedDocName}]\n\nDocument Content:\n${uploadedDocText.slice(0, 3000)}\n\n---\nUser Question: ${q}`
                : q;

            const activeDept = hospitalDepts.find(d => d.id === activeWard);
            const customHrs = (activeDept && activeDept.active) ? activeDept.hrsLimit : undefined;
            const customLatency = (activeDept && activeDept.active) ? activeDept.latencyLimit : undefined;

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: enrichedQuestion,
                    top_k: localConfig.topK,
                    run_ragas: localConfig.runRagas,
                    llm_provider: localConfig.provider.toLowerCase(),
                    llm_model: localConfig.model,
                    llm_api_key: activeKey,
                    persona: persona,
                    translate_hinglish: useHinglishOverride !== null ? useHinglishOverride : isHinglishActive,
                    inject_hallucination: injectedClaim,
                    original_hinglish_query: preTransOriginal || (hinglishAuditData ? hinglishAuditData.original : null),
                    department: activeWard,
                    patient_allergies: simulateAllergy ? ["ibuprofen", "aspirin", "penicillin"] : null,
                    custom_hrs_limit: customHrs,
                    custom_latency_limit: customLatency
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'API error');

            const botMsg = { id: Date.now() + 1, role: 'bot', text: data.generated_answer, data };
            const finalMsgs = [...newMessages, botMsg];
            setMessages(finalMsgs);

            setSessions(prev => prev.map(s => s.id === sid ? { ...s, title: q.slice(0, 42), messages: finalMsgs } : s));

        } catch (err) {
            const errMsg = { id: Date.now() + 2, role: 'bot', text: `❌ Error: ${err.message}`, isError: true };
            setMessages(prev => [...prev, errMsg]);
            setError(err.message);
        } finally {
            setIsThinking(false);
            setHinglishAuditData(null);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatTime = (id) => {
        const d = new Date(id);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="medichat-layout">
            {isSidebarOpen && <div className="mc-mobile-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

            <div className={`mc-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="mc-sidebar-header">
                    <div className="mc-brand-name">MEDIRAG ASSISTANT</div>
                    <div className="mc-brand-sub">Clinical AI v2.4</div>
                    <button className="mc-close-sidebar-btn" onClick={() => setIsSidebarOpen(false)}>✕</button>
                </div>

                <button className="mc-new-chat-btn" onClick={startNewChat}>
                    <span style={{ fontSize: '18px', fontWeight: 900 }}>+</span>
                    NEW CHAT
                </button>

                <div className="mc-section-label">RECENT SESSIONS</div>
                {sessions.length > 0 ? (
                    sessions.map(s => (
                        <div key={s.id} className={`mc-chat-item ${activeSession === s.id ? 'active' : ''}`} onClick={() => loadSession(s)}>
                            <span className="mc-chat-item-icon">🕐</span> {s.title}
                        </div>
                    ))
                ) : (
                    <div style={{ padding: '0 20px', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>No recent sessions</div>
                )}

                <div style={{ height: '24px' }} />
                <div className="mc-section-label">POPULAR TOPICS</div>
                {POPULAR_TOPICS.map(t => (
                    <div key={t.label} className="mc-chat-item" onClick={() => { startNewChat(); sendMessage(t.label); }}>
                        <span className="mc-chat-item-icon">{t.icon}</span> {t.label}
                    </div>
                ))}

                <div className="mc-sidebar-engine" style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                    <div className="mc-section-label">🏥 HOSPITAL WARD CONFIG</div>
                    
                    <div className="mc-engine-row">
                        <label>Active Ward</label>
                        <select
                            value={activeWard}
                            onChange={e => setActiveWard(e.target.value)}
                            style={{ background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px', width: '100%' }}
                        >
                            {hospitalDepts.map(d => {
                                const hrsLimit = d.hrsLimit;
                                const hrsBlock = Math.min(95, hrsLimit + (hrsLimit <= 30 ? 30 : 20));
                                const activeLabel = d.active ? `HRS Block: ${hrsBlock}% / Retry: ${hrsLimit}%` : 'INACTIVE';
                                return (
                                    <option key={d.id} value={d.id}>
                                        {d.name} ({activeLabel})
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <label className="mc-engine-checkbox" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={simulateAllergy}
                            onChange={e => setSimulateAllergy(e.target.checked)}
                            style={{ accentColor: '#10B981' }}
                        />
                        <span style={{ fontSize: '11.5px', fontWeight: 600 }}>⚠️ Simulate Active Chart Allergy</span>
                    </label>
                    {simulateAllergy && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '10px', padding: '8px 12px', borderRadius: '6px', marginTop: '6px', fontWeight: 'bold', lineHeight: '1.3', textAlign: 'left' }}>
                            Prescription Allergy Filters Engaged: Ibuprofen, Aspirin, Penicillin
                        </div>
                    )}
                </div>

                <div className="mc-sidebar-spacer" />

                <div className="mc-sidebar-engine">
                    <div className="mc-section-label">Evaluation Engine</div>
                    
                    <div className="mc-engine-row">
                        <label>Provider</label>
                        <select
                            value={localConfig.provider}
                            onChange={e => setLocalConfig(c => ({ ...c, provider: e.target.value }))}
                        >
                            <option value="Gemini">Gemini</option>
                            <option value="OpenAI">OpenAI</option>
                            <option value="Mistral">Mistral AI</option>
                        </select>
                    </div>

                    <div className="mc-engine-row">
                        <label>API Key</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="password"
                                className="mc-engine-key-input"
                                placeholder={localApiKey ? "••••••••••••••••" : "Enter API Key..."}
                                value={localApiKey}
                                onChange={e => setLocalApiKey(e.target.value)}
                            />
                            {localApiKey && (
                                <button
                                    onClick={() => setLocalApiKey('')}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '8px',
                                        padding: '0 12px',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: '700'
                                    }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mc-engine-row">
                        <label>Top-K Retrieval</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="range" min="1" max="10"
                                value={localConfig.topK}
                                onChange={e => setLocalConfig(c => ({ ...c, topK: parseInt(e.target.value) }))}
                                style={{ flex: 1, accentColor: '#10B981' }}
                            />
                            <span style={{ fontSize: '12px', fontWeight: 900, color: '#10B981', minWidth: '15px' }}>{localConfig.topK}</span>
                        </div>
                    </div>

                    <label className="mc-engine-checkbox">
                        <input
                            type="checkbox"
                            checked={localConfig.runRagas}
                            onChange={e => setLocalConfig(c => ({ ...c, runRagas: e.target.checked }))}
                        />
                        <span>Enable RAGAS Evaluation</span>
                    </label>
                </div>

                {/* ── Clinical Audit Stats ── */}
                <div className="mc-sidebar-stats">
                    <div className="mc-stat-item">
                        <div className="mc-stat-val">2.4k</div>
                        <div className="mc-stat-lbl">Verified Chunks</div>
                    </div>
                    <div className="mc-stat-item">
                        <div className="mc-stat-val">0.02s</div>
                        <div className="mc-stat-lbl">Latency (Avg)</div>
                    </div>
                    <div className="mc-stat-item">
                        <div className="mc-stat-val">98%</div>
                        <div className="mc-stat-lbl">Grounding</div>
                    </div>
                </div>
            </div>

            <div className="mc-main">
                <div className="mc-mobile-header">
                    <button className="mc-hamburger-btn" onClick={() => setIsSidebarOpen(true)}>☰</button>
                </div>

                <div className="mc-status-bar">
                    <div className="mc-status-pill">
                        <div className="mc-status-dot" />
                        <span className="mc-status-txt">SYSTEM ACTIVE</span>
                        <div className="mc-status-separator" />
                        <span className="mc-status-mode">AUDIT MODE</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div className="persona-toggle-container">
                            <div className={`persona-slider ${persona}`} />
                            <div className={`persona-option ${persona === 'physician' ? 'active' : ''}`} onClick={() => setPersona('physician')}>🩺 Physician</div>
                            <div className={`persona-option ${persona === 'patient' ? 'active' : ''}`} onClick={() => setPersona('patient')}>👤 Patient</div>
                        </div>

                        <button className="mc-export-btn" onClick={exportToPDF} disabled={isExporting || messages.length === 0}>
                            {isExporting ? '⏳ EXPORTING...' : '📄 EXPORT PDF'}
                        </button>
                    </div>
                </div>

                <div className="mc-chat-window" ref={chatContainerRef}>
                    {messages.length === 0 ? (
                        <div className="mc-welcome">
                            <div className="mc-welcome-logo">
                                <img src="/Frame 1352.png" alt="MediRAG Logo" style={{ height: '64px', width: 'auto' }} />
                            </div>
                            <h1>MediRAG-Eval Assistant</h1>
                            <p>Premium medical AI interface with real-time hallucination detection and clinical grounding. Select your persona and begin the diagnostic audit.</p>
                            
                            <div style={{ marginTop: '30px', width: '100%' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#10B981', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'center' }}>
                                    🔬 Interactive Expo Simulator — Single-Click Case Studies
                                </div>
                                <div className="mc-scenario-simulator">
                                    {SCENARIOS.map(scen => (
                                        <button 
                                            key={scen.id} 
                                            className="mc-scenario-card"
                                            onClick={() => {
                                                setIsHinglishActive(scen.hinglish);
                                                sendMessage(scen.prompt, scen.hinglish, scen.hallucinate);
                                            }}
                                            type="button"
                                        >
                                            <div className="mc-scenario-header">
                                                <span className={`mc-scenario-tag ${scen.tagClass}`}>{scen.tag}</span>
                                                <span style={{ fontSize: '14px' }}>⚡</span>
                                            </div>
                                            <div>
                                                <div className="mc-scenario-title">{scen.title}</div>
                                                <div className="mc-scenario-desc" style={{ marginTop: '4px' }}>{scen.desc}</div>
                                            </div>
                                            <div style={{ fontSize: '10.5px', color: 'var(--mc-text-muted)', borderTop: '1px solid var(--mc-border-compact)', paddingTop: '8px', fontStyle: 'italic' }}>
                                                "{scen.prompt.slice(0, 48)}..."
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ height: '24px' }} />
                            <div className="mc-suggestions-grid">
                                {INITIAL_TOPICS.map(t => (
                                    <button key={t} className="mc-sugg-btn" onClick={() => sendMessage(t)}>{t}</button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className={`mc-msg-row ${msg.role}`}>
                                {msg.role === 'user' ? (
                                    <div className="mc-msg-bubble">{msg.text}</div>
                                ) : msg.isSuggestion ? (
                                    <div className="mc-ai-card">
                                        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                                            <span>📄</span>
                                            <div>
                                                <div style={{ fontWeight: 800 }}>Document ingested!</div>
                                                <div style={{ fontSize: '11px', opacity: 0.5 }}>{msg.docName}</div>
                                            </div>
                                        </div>
                                        <div className="mc-suggestions-grid-compact">
                                            {msg.suggestions.map((s, i) => (
                                                <button key={i} className="mc-suggestion-chip" onClick={() => sendMessage(s)}>{s}</button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <AIMessageCard msg={msg} onCompare={setCompareData} />
                                )}
                            </div>
                        ))
                    )}
                    {isThinking && (
                        <div className="mc-thinking">
                            <div className="mc-thinking-dots"><span/><span/><span/></div>
                            <span>Analyzing clinical datasets...</span>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                <div className="mc-input-area">
                    <div className="mc-input-actions">
                        <input type="file" ref={pasteFileRef} style={{ display: 'none' }} accept=".pdf,.txt,.docx" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsUploadingDoc(true);
                            try {
                                const formData = new FormData();
                                formData.append('file', file);
                                const res = await fetch(`${localConfig.apiUrl}/parse_file`, { method: 'POST', body: formData });
                                if (!res.ok) throw new Error('Failed to parse document.');
                                const { text } = await res.json();
                                setUploadedDocText(text);
                                setUploadedDocName(file.name);
                                const suggestions = generateDocSuggestions(text);
                                setMessages(prev => [...prev, { id: Date.now(), role: 'bot', isSuggestion: true, docName: file.name, suggestions, text: '' }]);
                            } catch (err) {
                                setMessages(prev => [...prev, { id: Date.now(), role: 'bot', text: `❌ Error: ${err.message}`, isError: true }]);
                            } finally {
                                setIsUploadingDoc(false);
                            }
                        }} />
                        <button className="mc-action-chip" onClick={() => pasteFileRef.current?.click()}>📎 UPLOAD PDF / LABS</button>
                        <button 
                            className={`mc-action-chip ${localApiKey ? 'key-active' : 'key-empty'}`} 
                            onClick={() => setIsApiModalOpen(true)}
                        >
                            {localApiKey ? '🔐 API KEY SAVED' : '🔑 ENTER API KEY'}
                        </button>
                        <button 
                            className={`mc-action-chip ${isHinglishActive ? 'key-active' : 'key-empty'}`}
                            onClick={() => setIsHinglishActive(h => !h)}
                            style={{
                                color: isHinglishActive ? '#10B981' : 'rgba(255, 255, 255, 0.4)',
                                border: isHinglishActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                                transition: 'all 0.2s',
                            }}
                        >
                            🌐 {isHinglishActive ? 'HINGLISH MODE: ON' : 'HINGLISH MODE'}
                        </button>
                    </div>

                    <div className="mc-input-row">
                        <button 
                            className="mc-voice-btn" 
                            onClick={startVoiceMode} 
                            title="Start Voice Assistant"
                            type="button"
                        >
                            🎙
                        </button>
                        <textarea
                            ref={inputRef}
                            className="mc-input-field"
                            placeholder="Ask a medical question..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                        />
                        <button className="mc-send-btn" onClick={() => sendMessage()} disabled={!input.trim() || isThinking}>▶</button>
                    </div>
                </div>
            </div>

            <ApiKeyModal 
                isOpen={isApiModalOpen} 
                onClose={() => setIsApiModalOpen(false)} 
                onSave={(key) => {
                    setLocalApiKey(key);
                    setIsApiModalOpen(false);
                    if (pendingQuery) executeQuery(pendingQuery, key);
                }} 
            />

            {isVoiceActive && (
                <div className="voice-mode-overlay">
                    <div className="voice-wave-container" style={{ opacity: isMicMuted ? 0.35 : 1, transition: 'all 0.3s ease' }}>
                        <div className="voice-wave-bar" style={{ animation: isMicMuted ? 'none' : undefined, height: isMicMuted ? '20px' : undefined }}></div>
                        <div className="voice-wave-bar" style={{ animation: isMicMuted ? 'none' : undefined, height: isMicMuted ? '20px' : undefined }}></div>
                        <div className="voice-wave-bar" style={{ animation: isMicMuted ? 'none' : undefined, height: isMicMuted ? '20px' : undefined }}></div>
                        <div className="voice-wave-bar" style={{ animation: isMicMuted ? 'none' : undefined, height: isMicMuted ? '20px' : undefined }}></div>
                        <div className="voice-wave-bar" style={{ animation: isMicMuted ? 'none' : undefined, height: isMicMuted ? '20px' : undefined }}></div>
                    </div>

                    <div className="voice-status-text" style={{ fontSize: '13px', opacity: 0.6, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px' }}>
                        {voiceStatus}
                    </div>

                    {/* LARGE-FORMAT REAL-TIME TRANSCRIPTION PANEL */}
                    <div style={{
                        maxWidth: '850px',
                        width: '90%',
                        minHeight: '180px',
                        textAlign: 'center',
                        margin: '0 auto 40px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {transcribedText ? (
                            <textarea
                                value={transcribedText}
                                onChange={(e) => setTranscribedText(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ffffff',
                                    fontSize: '32px',
                                    fontWeight: '700',
                                    lineHeight: '1.45',
                                    textAlign: 'center',
                                    outline: 'none',
                                    resize: 'none',
                                    fontFamily: 'inherit',
                                    textShadow: '0 0 20px rgba(16, 185, 129, 0.25)',
                                    height: '220px',
                                    overflowY: 'auto'
                                }}
                                placeholder="Speak now... your transcription will appear here in real-time."
                            />
                        ) : (
                            <div style={{
                                color: 'rgba(255,255,255,0.25)',
                                fontSize: '28px',
                                fontWeight: '600',
                                fontStyle: 'italic',
                                lineHeight: '1.45'
                            }}>
                                Say something like: "What is the standard starting dose of Metformin?"
                            </div>
                        )}
                    </div>

                    {/* CONTROL DOCK */}
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', zIndex: 10 }}>
                        <button 
                            onClick={handleSendVoiceQuery} 
                            className="mc-action-chip key-active" 
                            style={{ 
                                height: '50px', 
                                padding: '0 32px', 
                                background: '#10b981', 
                                color: '#000', 
                                fontWeight: '800',
                                fontSize: '15px',
                                borderRadius: '25px',
                                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                                cursor: 'pointer',
                                border: 'none',
                                outline: 'none'
                            }}
                        >
                            ✓ Done & Ask AI
                        </button>
                        <button 
                            onClick={toggleMicMute} 
                            className="mc-action-chip" 
                            style={{ 
                                height: '50px', 
                                padding: '0 24px', 
                                background: isMicMuted ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))' : 'rgba(255,255,255,0.06)', 
                                color: isMicMuted ? '#10b981' : '#fff',
                                border: isMicMuted ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                                fontWeight: '700',
                                fontSize: '14px',
                                borderRadius: '25px',
                                cursor: 'pointer',
                                outline: 'none',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {isMicMuted ? '🎙 Resume Mic' : '🔇 Mute / Pause'}
                        </button>
                        <button 
                            onClick={handleTranslateTranscription} 
                            disabled={isTranslating || !transcribedText.trim()}
                            className="mc-action-chip" 
                            style={{ 
                                height: '50px', 
                                padding: '0 24px', 
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.15))', 
                                color: '#6ee7b7',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                fontWeight: '700',
                                fontSize: '14px',
                                borderRadius: '25px',
                                cursor: (isTranslating || !transcribedText.trim()) ? 'not-allowed' : 'pointer',
                                outline: 'none',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: !transcribedText.trim() ? 0.5 : 1
                            }}
                        >
                            {isTranslating ? '⏳ Translating...' : '🌐 Translate to English'}
                        </button>
                        <button 
                            onClick={() => { 
                                if (recognitionRef.current) {
                                    try { recognitionRef.current.stop(); } catch(e){}
                                }
                                setTranscribedText(''); 
                                startVoiceMode(); 
                            }} 
                            className="mc-action-chip" 
                            style={{ 
                                height: '50px', 
                                padding: '0 24px', 
                                background: 'rgba(255,255,255,0.06)', 
                                color: '#fff',
                                fontSize: '14px',
                                borderRadius: '25px',
                                cursor: 'pointer',
                                border: 'none',
                                outline: 'none'
                            }}
                        >
                            🔄 Reset
                        </button>
                        <button 
                            onClick={() => {
                                if (recognitionRef.current) {
                                    try { recognitionRef.current.stop(); } catch(e){}
                                }
                                setIsVoiceActive(false);
                            }} 
                            className="mc-action-chip" 
                            style={{ 
                                height: '50px', 
                                padding: '0 24px', 
                                background: 'rgba(239, 68, 68, 0.1)', 
                                color: '#ef4444', 
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                fontSize: '14px',
                                borderRadius: '25px',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            ✕ Cancel
                        </button>
                    </div>
                </div>
            )}

            {compareData && (
                <div className="mc-compare-modal-overlay" onClick={() => setCompareData(null)}>
                    <div className="mc-compare-modal" onClick={e => e.stopPropagation()}>
                        <div className="mc-compare-header">
                            <div className="mc-compare-title-group">
                                <h2>Clinical Safety Audit Report</h2>
                                <p>Comparing ungrounded raw draft against final audited and safety-aligned response.</p>
                            </div>
                            <button className="mc-close-compare-btn" onClick={() => setCompareData(null)}>✕</button>
                        </div>
                        
                        <div className="mc-compare-body">
                            {/* Left Panel: Unsafe Draft */}
                            <div className="mc-compare-column unsafe">
                                <div className="mc-compare-panel-title unsafe">
                                    <span>⚠️</span> Unsafe Raw Model Draft
                                </div>
                                <div className="mc-compare-card-content unsafe">
                                    {compareData.original_answer || "No raw draft captured."}
                                </div>
                                <div className="mc-compare-stats-card" style={{ borderLeft: '3px solid #ef4444' }}>
                                    <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                                        Intervention Details
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                                        {compareData.intervention_details?.message || "Risk threshold exceeded. Strict RAG correction triggered."}
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Safe Audited Answer */}
                            <div className="mc-compare-column safe">
                                <div className="mc-compare-panel-title safe">
                                    <span>🛡️</span> Grounded Audited Response
                                </div>
                                <div className="mc-compare-card-content safe">
                                    {compareData.generated_answer}
                                </div>
                                <div className="mc-compare-stats-card" style={{ borderLeft: '3px solid #10B981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                                            Mitigation Score
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'white', fontWeight: 700 }}>
                                            HRS Risk Reduced: {compareData.intervention_details?.hrs_original || 100} → {compareData.intervention_details?.hrs_corrected || compareData.hrs || 0}
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#10B981', fontWeight: 800 }}>
                                        VERIFIED
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isTranslating && (
                <div className="mc-translating-overlay">
                    <div className="mc-translating-spinner"></div>
                    <div style={{ color: '#10B981', fontSize: '13px', fontWeight: '800', letterSpacing: '0.5px' }}>
                        🌐 TRANSLATING HINGLISH TO ENGLISH CLINICAL PROSE...
                    </div>
                </div>
            )}

            {hinglishAuditData && (
                <div className="mc-audit-modal-overlay">
                    <div className="mc-audit-modal">
                        <div className="mc-audit-header">
                            <div className="mc-audit-title-group">
                                <h2>🌐 Hinglish Clinical Translation Review</h2>
                                <p>Human-in-the-loop validation: review and edit AI translation before submission.</p>
                            </div>
                        </div>
                        <div className="mc-audit-body">
                            <div className="mc-audit-field-lbl">Original Hinglish Input</div>
                            <div className="mc-audit-original-preview">
                                "{hinglishAuditData.original}"
                            </div>
                            
                            <div className="mc-audit-field-lbl">AI English Translation (Editable)</div>
                            <textarea
                                className="mc-audit-textarea"
                                value={editedTranslation}
                                onChange={e => setEditedTranslation(e.target.value)}
                                placeholder="Type or correct the English translation..."
                            />
                        </div>
                        <div className="mc-audit-footer">
                            <button
                                onClick={() => setHinglishAuditData(null)}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    color: '#ef4444',
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                type="button"
                            >
                                ✕ Cancel
                            </button>
                            <button
                                onClick={() => {
                                    // Send the audited English translation!
                                    sendMessage(
                                        editedTranslation,
                                        hinglishAuditData.useHinglishOverride,
                                        hinglishAuditData.injectedClaim,
                                        true // flag showing it is already translated so we skip intercepting again!
                                    );
                                }}
                                style={{
                                    background: '#10B981',
                                    border: 'none',
                                    color: '#000',
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)',
                                    transition: 'all 0.2s',
                                }}
                                type="button"
                            >
                                🚀 Confirm & Send to RAG
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediChat;

