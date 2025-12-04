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
    Trash2,
    Upload,
    User,
    X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { analyzeResumes, API_URL, deleteResume, deleteResumes, getResumePdfUrl, getResumes, uploadResumes } from './api';

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

const NavItem = ({ icon, label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
};

const LoadingDialog = ({ isOpen, message }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden p-8 flex flex-col items-center"
        >
          <div className="relative w-20 h-20 mb-6">
             <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
             <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={24} className="text-emerald-500 animate-pulse" />
             </div>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Processing</h3>
          <p className="text-slate-600 text-center font-medium animate-pulse">{message}</p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const Dialog = ({ isOpen, onClose, title, message, type = 'info' }) => {
  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle size={48} className="text-emerald-500" />,
    error: <AlertCircle size={48} className="text-red-500" />,
    info: <AlertCircle size={48} className="text-blue-500" />
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          <div className="p-6 flex flex-col items-center text-center">
            <div className="mb-4">
              {icons[type]}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
            <p className="text-slate-600 mb-6">{message}</p>
            <button
              onClick={onClose}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors w-full"
            >
              OK
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

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
  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90 drop-shadow-xl">
        <defs>
            <linearGradient id={`gradient-${percentage}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="1" />
                <stop offset="100%" stopColor={color} stopOpacity="0.7" />
            </linearGradient>
            <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        <circle
          stroke="#e2e8f0"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="opacity-20"
        />
        <circle
          stroke={`url(#gradient-${percentage})`}
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          filter="url(#glow)"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-slate-800 leading-none">{animatedPercentage}%</span>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Match</span>
      </div>
    </div>
  );
};

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
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobInput, setShowJobInput] = useState(true);
  const [notification, setNotification] = useState(null);
  const [ingestProgress, setIngestProgress] = useState(null);
  const [viewingResume, setViewingResume] = useState(null);

  const fileInputRef = useRef(null);
  const [dialog, setDialog] = useState(null);
  const [loadingDialog, setLoadingDialog] = useState(null); // { message: string } | null
  const [selectedResumes, setSelectedResumes] = useState(new Set());

  useEffect(() => {
    // Don't auto-load on mount - wait for user to sync files
    // handleIngest();
  }, []);

  useEffect(() => {
    console.log("Active tab changed to:", activeTab);
    if (activeTab === 'resumes') {
        console.log("Fetching resumes for resumes tab...");
        fetchResumes();
    }
  }, [activeTab]);



  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
  };

  const showDialog = (title, message, type = 'info') => {
    setDialog({ title, message, type });
  };

  const showLoading = (message) => {
      setLoadingDialog({ message });
  };

  const hideLoading = () => {
      setLoadingDialog(null);
  };

  const fetchResumes = async () => {
      setLoadingResumes(true);
      try {
          console.log("Fetching resumes from API...");
          const response = await getResumes();
          console.log("Resumes response:", response.data);
          
          if (response.data && response.data.resumes) {
              setResumesList(response.data.resumes);
              console.log(`✓ Loaded ${response.data.resumes.length} resumes successfully`);
          } else {
              console.warn("No resumes data in response");
              setResumesList([]);
          }
      } catch (error) {
          console.error("Failed to fetch resumes:", error);
          console.error("Error details:", {
              message: error.message,
              response: error.response?.data,
              status: error.response?.status
          });
          showDialog("Failed to Load Resumes", 
              `Could not load resumes from database.\n\nError: ${error.message}`, 
              "error");
          setResumesList([]);
      } finally {
          setLoadingResumes(false);
      }
  };

  const handleViewResume = async (resume) => {
      setViewingResume(resume);
  };

  const handleDeleteResume = async (resume) => {
      if (!confirm(`Are you sure you want to delete "${resume.filename}"? This will remove it from the database and delete the PDF file.`)) {
          return;
      }

      try {
          showLoading("Deleting resume...");
          await deleteResume(resume.id);
          showNotification(`✓ "${resume.filename}" deleted successfully!`, "success");
          
          // Refresh the resumes list
          await fetchResumes();
      } catch (error) {
          console.error("Failed to delete resume:", error);
          const errorMsg = error.response?.data?.error || error.message || "Failed to delete resume";
          showDialog("Delete Failed", errorMsg, "error");
      } finally {
          hideLoading();
      }
  };

  const handleBulkDelete = async () => {
      if (selectedResumes.size === 0) return;

      if (!confirm(`Are you sure you want to delete ${selectedResumes.size} resumes? They will be removed from the database but files will remain on disk.`)) {
          return;
      }

      try {
          showLoading(`Deleting ${selectedResumes.size} resumes...`);
          await deleteResumes(Array.from(selectedResumes));
          showNotification(`✓ ${selectedResumes.size} resumes deleted successfully!`, "success");
          
          setSelectedResumes(new Set());
          await fetchResumes();
      } catch (error) {
          console.error("Failed to delete resumes:", error);
          const errorMsg = error.response?.data?.error || error.message || "Failed to delete resumes";
          showDialog("Delete Failed", errorMsg, "error");
      } finally {
          hideLoading();
      }
  };

  const toggleResumeSelection = (id) => {
      const newSelected = new Set(selectedResumes);
      if (newSelected.has(id)) {
          newSelected.delete(id);
      } else {
          newSelected.add(id);
      }
      setSelectedResumes(newSelected);
  };

  const toggleSelectAll = () => {
      if (selectedResumes.size === resumesList.length) {
          setSelectedResumes(new Set());
      } else {
          setSelectedResumes(new Set(resumesList.map(r => r.id)));
      }
  };

  const handleIngest = async () => {
    setIngesting(true);
    setIngestProgress({ percent: 0, message: "Starting..." });
    // Don't show loading dialog - the progress bar will show status
    
    try {
      // Use the API helper to ensure consistent URL handling
      const ingestUrl = `${API_URL}/ingest`;
      console.log(`Calling ingest API: ${ingestUrl}`);
      
      const response = await fetch(ingestUrl, {
        method: 'POST',
      });

      console.log(`Ingest response status: ${response.status}`);
      
      // Check if response is OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ingest failed with status ${response.status}:`, errorText);
        throw new Error(`Server returned ${response.status}: ${errorText.substring(0, 100)}`);
      }
      
      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const bodyText = await response.text();
        console.error('Received non-JSON response:', bodyText.substring(0, 200));
        throw new Error('Server returned HTML instead of JSON. Backend may be misconfigured.');
      }

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
                    const msg = `Processing ${data.file} (${data.current}/${data.total})`;
                    setIngestProgress({ 
                        percent: data.percent, 
                        message: msg
                    });
                } else if (data.status === 'complete') {
                    showNotification(data.message, "success");
                    if (activeTab === 'resumes') fetchResumes();
                } else if (data.status === 'error') {
                    const errorMsg = data.message;
                    if (errorMsg.includes('quota') || errorMsg.includes('429')) {
                        showDialog("API Quota Exceeded", "Google API quota exceeded. Please wait 24 hours or upgrade your plan.", "error");
                    } else {
                        showDialog("Processing Error", errorMsg, "error");
                    }
                }
            } catch (e) {
                console.error("Error parsing JSON stream", e);
            }
        }
      }
    } catch (error) {
      console.error("Ingest failed", error);
      let errorMsg = "Failed to sync resumes from local folder.";
      
      if (error.message) {
        errorMsg += `\n\nError: ${error.message}`;
      }
      
      if (error.response) {
        errorMsg += `\n\nPlease ensure the backend server is running on port 8000.`;
      }
      
      showDialog("Sync Failed", errorMsg, "error");
    } finally {
      setIngesting(false);
      setIngestProgress(null);
      // Don't hide loading dialog since we don't show it
    }
  };

  const handleUploadClick = () => {
      fileInputRef.current.click();
  };



  const handleFileChange = async (event) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const fileCount = files.length;
      setUploading(true);
      // Don't show loading dialog - progress will be shown during ingestion
      
      try {
          console.log(`Uploading ${fileCount} individual resume files...`);
          const response = await uploadResumes(files);
          
          showNotification(response.data.message, "success");
          setUploading(false);
          
          // Now trigger ingestion (progress bar will show)
          await handleIngest();
          
          // Clear input
          event.target.value = null;
      } catch (error) {
          console.error("Upload failed", error);
          const errorMsg = error.response?.data?.error || error.message || "Failed to upload resumes";
          showDialog("Upload Failed", errorMsg, "error");
          setUploading(false);
          setIngesting(false);
          setIngestProgress(null);
      }
  };



  const handleSetFolderPath = async (newPath) => {
      try {
          console.log("[UI] Setting folder path:", newPath);
          showLoading("Setting folder path...");
          
          const response = await setFolderPath(newPath);
          console.log("[UI] Got response:", response);
          
          if (!response) {
              throw new Error("No response from server");
          }
          
          // Handle response - axios returns data in response.data
          const data = response.data;
          console.log("[UI] Response data:", data);
          
          if (!data) {
              throw new Error("Invalid response format");
          }
          
          if (data.error) {
              throw new Error(data.error);
          }
          
          if (data.path) {
              setFolderPath(data.path);
              showNotification(`✓ Folder path updated! Found ${data.pdf_count || 0} PDF files.`, "success");
              setShowFolderPathDialog(false);
          } else {
              throw new Error("Path not returned from server");
          }
          
          hideLoading();
      } catch (error) {
          console.error("[UI] Failed to set folder path:", error);
          console.error("[UI] Error details:", {
              message: error.message,
              response: error.response,
              request: error.request,
              config: error.config
          });
          
          let errorMsg = "Failed to set folder path";
          
          if (error.response?.data?.error) {
              errorMsg = error.response.data.error;
          } else if (error.response?.status) {
              errorMsg = `Server error (${error.response.status}): ${error.response.statusText}`;
          } else if (error.request) {
              errorMsg = "No response from server. Check if backend is running.";
          } else if (error.message) {
              errorMsg = error.message;
          }
          
          showDialog("Error", errorMsg, "error");
          hideLoading();
      }
  };

  const handleSyncFolder = async () => {
      console.log("=== handleSyncFolder called ===");
      console.log("Note: This will ONLY ingest resumes from the configured folder, NOT upload new files");
      
      setIngesting(true);
      // Don't show loading dialog - the progress bar will show status
      
      try {
          // Just trigger ingestion of files already in the configured folder
          console.log(`Starting ingestion of resumes from default folder`);
          await handleIngest();
          console.log("Ingestion complete");
          
      } catch (error) {
          console.error("Folder sync failed:", error);
          
          let errorMsg = "Failed to sync folder.";
          if (error.response?.data?.error) {
              errorMsg = error.response.data.error;
          } else if (error.message) {
              errorMsg += ` ${error.message}`;
          }
          
          if (error.response?.status === 405) {
              errorMsg = "The sync endpoint is not properly configured. Please check the backend server.";
          }
          
          showDialog("Sync Failed", errorMsg, "error");
          setIngesting(false);
          setIngestProgress(null);
      }
  };

  const handleAnalyze = async () => {
    if (!jobDescription) {
      showDialog("Missing Job Description", "Please enter or select a job description before analyzing.", "error");
      return;
    }
    
    setAnalyzing(true);
    showLoading("Analyzing resumes against job description...");
    try {
      const response = await analyzeResumes(jobDescription);
      setResults(response.data.results);
      setShowJobInput(false);
      showNotification("Analysis complete!", "success");
    } catch (error) {
      console.error("Analysis failed", error);
      const errorMsg = error.response?.data?.error || error.message || "Analysis failed. Please try again.";
      showDialog("Analysis Failed", errorMsg, "error");
    } finally {
      setAnalyzing(false);
      hideLoading();
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

      {loadingDialog && (
          <LoadingDialog 
            isOpen={true} 
            message={loadingDialog.message} 
          />
      )}


      
      {dialog && (
        <Dialog
          isOpen={true}
          title={dialog.title}
          message={dialog.message}
          type={dialog.type}
          onClose={() => setDialog(null)}
        />
      )}

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
           <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-800">
                  {activeTab === 'dashboard' ? 'Candidate Ranking' : 'Resume Database'}
              </h1>
              {/* Hidden file inputs */}
              <input 
                  type="file" 
                  multiple 
                  accept=".pdf" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
              />
              
              {/* Upload Resume Button */}
              <button 
                  onClick={handleUploadClick}
                  disabled={uploading || ingesting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  <Upload size={16} />
                  Upload Resumes
              </button>

              {/* Sync Button */}
              <button 
                  onClick={handleSyncFolder}
                  disabled={uploading || ingesting}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Sync and process resumes from data/resumes folder"
              >
                  <RefreshCw size={16} className={ingesting ? "animate-spin" : ""} />
                  {ingesting ? "Syncing..." : "Sync"}
              </button>
           </div>
           <div className="flex items-center gap-3">
              {ingesting && ingestProgress && (
                  <div className="flex flex-col items-end mr-4 w-48">
                      <div className="text-xs font-medium text-slate-700 mb-1">{ingestProgress.message}</div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                          <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300 ease-out relative"
                              style={{ width: `${ingestProgress.percent}%` }}
                          >
                              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                          </div>
                      </div>
                      <div className="text-xs font-bold text-emerald-600 mt-1">{ingestProgress.percent}%</div>
                  </div>
              )}
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth">
          <div className="max-w-5xl mx-auto">
            
            {/* Large Progress Display During Ingestion */}
            <AnimatePresence>
              {ingesting && ingestProgress && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mb-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl p-8 shadow-xl"
                >
                  <div className="text-center">
                    {/* Large Circular Progress */}
                    <div className="flex justify-center mb-6">
                      <CircularProgress 
                        percentage={ingestProgress.percent} 
                        color="rgb(16, 185, 129)" 
                      />
                    </div>
                    
                    {/* Status Message */}
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">
                      Processing Resumes
                    </h3>
                    <p className="text-lg text-slate-600 mb-4">
                      {ingestProgress.message}
                    </p>
                    
                    {/* Linear Progress Bar */}
                    <div className="max-w-md mx-auto">
                      <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner mb-2">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 relative"
                          initial={{ width: 0 }}
                          animate={{ width: `${ingestProgress.percent}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                        </motion.div>
                      </div>
                      <div className="text-sm text-slate-500">
                        Please wait while we process your resumes...
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            




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
                                    <button 
                                        onClick={() => handleViewResume({ id: result.id, filename: result.resume_name })}
                                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                    >
                                        <Eye size={16} />
                                        View Resume
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
                        <p className="text-slate-500 mt-2">Upload resumes or process files from your data/resumes folder to get started.</p>
                    </div>
                )}
                </div>
                </>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-bold text-slate-800">All Resumes</h2>
                            {selectedResumes.size > 0 && (
                                <button 
                                    onClick={handleBulkDelete}
                                    className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors animate-in fade-in slide-in-from-left-2"
                                >
                                    <Trash2 size={14} />
                                    Delete Selected ({selectedResumes.size})
                                </button>
                            )}
                        </div>
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
                    
                    {/* Header Row for Select All */}
                    {resumesList.length > 0 && (
                        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
                            <input 
                                type="checkbox"
                                checked={resumesList.length > 0 && selectedResumes.size === resumesList.length}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                {selectedResumes.size === 0 ? "Select All" : `${selectedResumes.size} Selected`}
                            </span>
                        </div>
                    )}

                    <div className="divide-y divide-slate-100">
                        {loadingResumes ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                                <p className="text-slate-500">Loading resumes...</p>
                            </div>
                        ) : resumesList.length > 0 ? (
                            resumesList.map((resume) => (
                                <div key={resume.id} className={`p-4 hover:bg-slate-50 transition-colors flex items-center gap-4 ${selectedResumes.has(resume.id) ? 'bg-emerald-50/50' : ''}`}>
                                    <input 
                                        type="checkbox"
                                        checked={selectedResumes.has(resume.id)}
                                        onChange={() => toggleResumeSelection(resume.id)}
                                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-slate-800">{resume.filename}</h3>
                                        <p className="text-xs text-slate-500">ID: {resume.id}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleViewResume(resume)}
                                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                                        >
                                            <Eye size={16} />
                                            View
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteResume(resume)}
                                            className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-slate-800 font-bold text-lg mb-2">No Resumes Yet</h3>
                                <p className="text-slate-500 mb-4">
                                    Upload individual resumes using the "Upload Resumes" button above, or place PDFs in your <code className="bg-slate-100 px-1 rounded text-xs">data/resumes/</code> folder and click "Sync" to ingest them.
                                </p>
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
