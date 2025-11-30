import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle, Briefcase,
    CheckCircle,
    Eye,
    FileText,
    Filter,
    Home,
    RefreshCw,
    Search,
    Sparkles,
    Upload,
    User,
    X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { analyzeResumes, getResumePdfUrl, getResumes, uploadResumes } from './api';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const JOB_TITLES = [
  "AI Research Intern",
  "Full Stack Developer",
  "Product Manager",
  "Data Scientist",
  "UX Designer",
  "DevOps Engineer"
];

// --- Components ---

const Notification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: -20, x: '-50%' }}
      className={`fixed top-6 left-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-full shadow-lg text-white ${bgColors[type] || bgColors.info}`}
    >
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
        <X size={14} />
      </button>
    </motion.div>
  );
};

const useCountUp = (end, duration = 1500) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // Ease out quart
      const ease = 1 - Math.pow(1 - percentage, 4);
      
      setCount(Math.floor(end * ease));

      if (progress < duration) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
};

const CircularProgress = ({ percentage, color }) => {
  const animatedPercentage = useCountUp(percentage);
  const radius = 45;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90 drop-shadow-lg">
        <defs>
            <linearGradient id={`gradient-${percentage}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                <stop offset="100%" stopColor={color} />
            </linearGradient>
        </defs>
        <circle
          stroke="#e2e8f0"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="opacity-30"
        />
        <circle
          stroke={`url(#gradient-${percentage})`}
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-out' }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-slate-800">{animatedPercentage}%</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Match</span>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick, badge }) => (
  <div 
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${active ? 'bg-emerald-50 text-emerald-600 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
  >
     <div className={active ? 'text-emerald-600' : 'text-slate-400'}>{icon}</div>
     <span className="hidden lg:block text-sm">{label}</span>
     {badge && <span className="hidden lg:block ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
  </div>
);

const ResumeViewDialog = ({ resume, onClose }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  if (!resume) return null;

  const pdfUrl = getResumePdfUrl(resume.id);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{resume.filename}</h2>
              <p className="text-xs text-slate-500">PDF Resume</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center bg-slate-50">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
              </div>
            }
            error={
              <div className="text-red-500 p-4">
                Failed to load PDF. Please try again.
              </div>
            }
          >
            <Page 
              pageNumber={pageNumber}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg"
            />
          </Document>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPageNumber(page => Math.max(1, page - 1))}
              disabled={pageNumber <= 1}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {pageNumber} of {numPages || '...'}
            </span>
            <button
              onClick={() => setPageNumber(page => Math.min(numPages, page + 1))}
              disabled={pageNumber >= numPages}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              Next
            </button>
          </div>
          <button
            onClick={onClose}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [jobDescription, setJobDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [resumesList, setResumesList] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobInput, setShowJobInput] = useState(true);
  const [notification, setNotification] = useState(null);
  const [ingestProgress, setIngestProgress] = useState(null);
  const [viewingResume, setViewingResume] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // handleIngest();
  }, []);

  useEffect(() => {
    if (activeTab === 'resumes') {
        fetchResumes();
    }
  }, [activeTab]);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
  };

  const fetchResumes = async () => {
      try {
          const response = await getResumes();
          setResumesList(response.data.resumes);
      } catch (error) {
          console.error("Failed to fetch resumes", error);
          showNotification("Failed to load resumes", "error");
      }
  };

  const handleViewResume = async (resume) => {
      setViewingResume(resume);
  };

  const handleIngest = async () => {
    setIngesting(true);
    setIngestProgress({ percent: 0, message: "Starting..." });
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/ingest`, {
        method: 'POST',
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the last incomplete line in buffer

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const data = JSON.parse(line);
                if (data.status === 'processing') {
                    setIngestProgress({ 
                        percent: data.percent, 
                        message: `Processing ${data.file} (${data.current}/${data.total})` 
                    });
                } else if (data.status === 'complete') {
                    showNotification(data.message, "success");
                    if (activeTab === 'resumes') fetchResumes();
                } else if (data.status === 'error') {
                    const errorMsg = data.message;
                    if (errorMsg.includes('quota') || errorMsg.includes('429')) {
                        showNotification("Google API quota exceeded. Please wait 24 hours or upgrade your plan.", "error");
                    } else {
                        showNotification(errorMsg.substring(0, 100), "error");
                    }
                }
            } catch (e) {
                console.error("Error parsing JSON stream", e);
            }
        }
      }
    } catch (error) {
      console.error("Ingest failed", error);
      showNotification("Failed to sync resumes", "error");
    } finally {
      setIngesting(false);
      setIngestProgress(null);
    }
  };

  const handleUploadClick = () => {
      fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      try {
          const response = await uploadResumes(files);
          showNotification(response.data.message, "success");
          // Clear input
          event.target.value = null;
      } catch (error) {
          console.error("Upload failed", error);
          showNotification("Failed to upload resumes", "error");
      } finally {
          setUploading(false);
      }
  };

  const handleAnalyze = async () => {
    if (!jobDescription) {
      showNotification("Please enter or select a job description.", "error");
      return;
    }
    
    setAnalyzing(true);
    try {
      const response = await analyzeResumes(jobDescription);
      setResults(response.data.results);
      setShowJobInput(false);
      showNotification("Analysis complete!", "success");
    } catch (error) {
      console.error("Analysis failed", error);
      showNotification("Analysis failed. Please try again.", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const selectJob = (title) => {
    setSelectedJob(title);
    setJobDescription(`Looking for a ${title} with experience in...`); 
  };

  const getMatchLabel = (score) => {
    if (score >= 80) return { text: "GREAT MATCH", color: "#10b981", bg: "bg-emerald-950", lightBg: "bg-emerald-50 text-emerald-700" }; 
    if (score >= 60) return { text: "GOOD MATCH", color: "#0ea5e9", bg: "bg-sky-950", lightBg: "bg-sky-50 text-sky-700" };   
    return { text: "FAIR MATCH", color: "#f59e0b", bg: "bg-amber-950", lightBg: "bg-amber-50 text-amber-700" };                    
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex font-sans text-slate-600">
      <AnimatePresence>
        {notification && (
          <Notification 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingResume && (
          <ResumeViewDialog 
            resume={viewingResume}
            onClose={() => setViewingResume(null)}
          />
        )}
      </AnimatePresence>
      
      {/* Left Sidebar */}
      <aside className="w-20 lg:w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col justify-between sticky top-0 h-screen z-20">
        <div>
          <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-100">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
              <Sparkles size={18} fill="white" />
            </div>
            <span className="ml-3 font-bold text-slate-800 text-lg hidden lg:block">Nebula</span>
          </div>

          <nav className="p-4 space-y-2">
            <NavItem 
                icon={<Briefcase size={20} />} 
                label="Dashboard" 
                active={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')}
            />
            <NavItem 
                icon={<FileText size={20} />} 
                label="Resumes" 
                active={activeTab === 'resumes'} 
                onClick={() => setActiveTab('resumes')}
            />
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 hidden lg:block">
             <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                    <User size={16} />
                </div>
                <div className="text-xs">
                   <p className="font-bold text-slate-700">Admin User</p>
                   <p className="text-slate-400">Pro Plan</p>
                </div>
             </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
           <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold text-slate-800">
                  {activeTab === 'dashboard' ? 'Candidate Ranking' : 'Resume Database'}
              </h1>
              <input 
                  type="file" 
                  multiple 
                  accept=".pdf" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
              />
              <button 
                  onClick={handleUploadClick}
                  disabled={uploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                  <Upload size={16} />
                  {uploading ? "Uploading..." : "Upload Resumes"}
              </button>
           </div>
           <div className="flex items-center gap-3">
              {ingesting && ingestProgress && (
                  <div className="flex flex-col items-end mr-4 w-48">
                      <div className="text-xs text-slate-500 mb-1">{ingestProgress.message}</div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                              className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                              style={{ width: `${ingestProgress.percent}%` }}
                          ></div>
                      </div>
                  </div>
              )}
              <button 
                onClick={handleIngest}
                disabled={ingesting}
                className="text-slate-500 hover:text-emerald-600 text-sm font-medium flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                 <RefreshCw size={14} className={ingesting ? "animate-spin" : ""} />
                 {ingesting ? "Syncing..." : "Sync Local Folder"}
              </button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth">
          <div className="max-w-5xl mx-auto">
            
            {activeTab === 'dashboard' ? (
                <>
                {/* Job Selection / Input Area */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-wrap gap-2">
                        {JOB_TITLES.map(title => (
                            <button 
                            key={title}
                            onClick={() => selectJob(title)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                selectedJob === title 
                                ? 'bg-emerald-600 text-white shadow-md' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            >
                            {title}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => setShowJobInput(!showJobInput)}
                        className="text-emerald-600 font-semibold text-sm flex items-center gap-1 hover:underline"
                    >
                        <Filter size={14} />
                        Edit Filters
                    </button>
                </div>

                <AnimatePresence>
                    {showJobInput && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <textarea
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none transition-all mb-4"
                            rows={4}
                            placeholder="Paste job description here..."
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            />
                            
                            <div className="flex items-center justify-end">
                            <button 
                                onClick={handleAnalyze}
                                disabled={analyzing}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {analyzing ? 'Analyzing...' : 'Analyze Matches'}
                            </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                </div>

                {/* Results Feed */}
                <div className="space-y-4">
                {results.map((result, index) => {
                    const { text: matchLabel, color: matchColor } = getMatchLabel(result.score);
                    
                    return (
                        <motion.div
                            layout
                            key={result.id || index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-2xl p-0 shadow-sm border border-slate-100 hover:shadow-md transition-shadow overflow-hidden group"
                        >
                            <div className="flex flex-col md:flex-row relative">
                            {index === 0 && result.score >= 70 && (
                                <div className="absolute top-0 left-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-br-xl z-10 shadow-sm flex items-center gap-1 animate-pulse">
                                    <Sparkles size={12} fill="white" /> TOP MATCH
                                </div>
                            )}
                            {/* Main Card Content */}
                            <div className="p-6 flex-1">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm">
                                        {result.resume_name.charAt(0)}
                                        </div>
                                        <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-800 text-lg">{result.resume_name}</h3>
                                        </div>
                                        <p className="text-slate-500 text-sm font-medium">Candidate</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-y-2 text-sm text-slate-600 mb-4">
                                    <div className="flex items-center gap-2"><Briefcase size={14} /> <span>Experience: 3+ Years</span></div>
                                    <div className="flex items-center gap-2"><Home size={14} /> <span>Remote / Hybrid</span></div>
                                </div>

                                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-50">
                                    <button className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                                        View Profile
                                    </button>
                                </div>
                            </div>

                            {/* Match Score Panel (Right Side) */}
                            <div className="bg-slate-50 w-full md:w-64 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden border-l border-slate-100">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                
                                <div className="mb-3 scale-110">
                                    <CircularProgress percentage={result.score} color={matchColor} />
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase ${matchLabel.lightBg}`}>
                                    {matchLabel.text}
                                </div>
                            </div>
                            </div>

                            {/* Analysis Dropdown (Optional/Expandable) */}
                            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100">
                            <p className="text-lg text-slate-600 leading-relaxed mb-4">
                                <span className="font-semibold text-slate-800">AI Summary: </span>
                                {result.analysis || result.summary}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <h5 className="text-base font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <CheckCircle size={16} /> Strengths
                                    </h5>
                                    <ul className="space-y-1">
                                        {result.pros && result.pros.map((pro, i) => (
                                        <li key={i} className="text-base text-slate-600 flex items-start gap-2">
                                            <span className="text-emerald-500 mt-0.5">•</span> {pro}
                                        </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h5 className="text-base font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <AlertCircle size={16} /> Gaps
                                    </h5>
                                    <ul className="space-y-1">
                                        {result.cons && result.cons.map((con, i) => (
                                        <li key={i} className="text-base text-slate-600 flex items-start gap-2">
                                            <span className="text-amber-500 mt-0.5">•</span> {con}
                                        </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            
                            {result.evidence && result.evidence.length > 0 && (
                                <div className="pt-3 border-t border-slate-200/50">
                                    <h5 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Key Evidence</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {result.evidence.map((ev, i) => (
                                        <span key={i} className="text-sm bg-white text-slate-500 px-2 py-1 rounded border border-slate-200 italic shadow-sm">
                                            "{ev}"
                                        </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            </div>
                        </motion.div>
                    );
                })}

                {results.length === 0 && !analyzing && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-slate-800 font-bold text-lg">No candidates found</h3>
                        <p className="text-slate-500 mt-2">Upload resumes or sync local folder to get started.</p>
                    </div>
                )}
                </div>
                </>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-800">All Resumes</h2>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{resumesList.length} files</span>
                            <button 
                                onClick={fetchResumes}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-emerald-600 transition-colors"
                                title="Refresh List"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {resumesList.length > 0 ? (
                            resumesList.map((resume) => (
                                <div key={resume.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
                                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-slate-800">{resume.filename}</h3>
                                        <p className="text-xs text-slate-500">ID: {resume.id}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleViewResume(resume)}
                                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                                    >
                                        <Eye size={16} />
                                        View
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-slate-500">
                                No resumes found in the database.
                            </div>
                        )}
                    </div>
                </div>
            )}

          </div>
        </div>
      </main>

    </div>
  );
}

export default App;
