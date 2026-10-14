import { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { phpFiles, installationGuide, type CodeFile } from './data/phpFiles';
import { zipFiles } from './data/zipContents';
import CPanelGuide from './CPanelGuide';

// ============================================
// DOWNLOAD ZIP COMPONENT
// ============================================

function DownloadZipSection() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const generateZip = async () => {
    setIsGenerating(true);
    setProgress(0);
    setIsComplete(false);

    try {
      const zip = new JSZip();
      const total = zipFiles.length;

      for (let i = 0; i < total; i++) {
        const file = zipFiles[i];
        zip.file(`photobooth-gallery/${file.path}`, file.content);
        setProgress(Math.round(((i + 1) / total) * 100));
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      const blob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } },
        (metadata) => {
          setProgress(Math.round(metadata.percent));
        }
      );

      saveAs(blob, 'photobooth-gallery.zip');
      setIsComplete(true);
    } catch (error) {
      console.error('Error generating ZIP:', error);
      alert('Gagal generate ZIP. Silakan coba lagi.');
    } finally {
      setIsGenerating(false);
    }
  };

  const totalSize = zipFiles.reduce((acc, f) => acc + f.content.length, 0);
  const totalFiles = zipFiles.filter(f => !f.path.endsWith('.gitkeep')).length;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 md:p-8 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
            📦
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Download Paket ZIP</h2>
            <p className="text-white/80 text-sm">Siap upload ke cPanel File Manager</p>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-indigo-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-indigo-600">{totalFiles}</div>
            <div className="text-xs text-indigo-500">Files</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-purple-600">
              {(totalSize / 1024).toFixed(0)} KB
            </div>
            <div className="text-xs text-purple-500">Ukuran</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-green-600">v1.0</div>
            <div className="text-xs text-green-500">Version</div>
          </div>
        </div>

        {/* File Tree */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 max-h-48 overflow-y-auto">
          <h4 className="font-bold text-gray-700 text-xs mb-2 uppercase tracking-wide">Isi Paket</h4>
          <div className="space-y-0.5">
            {zipFiles.filter(f => !f.path.endsWith('.gitkeep')).map((file) => (
              <div key={file.path} className="flex items-center gap-2 text-xs py-1 font-mono text-gray-600">
                <span>
                  {file.path.endsWith('.php') ? '🐘' :
                   file.path.endsWith('.sql') ? '🗄️' :
                   file.path.endsWith('.json') ? '📦' :
                   file.path.endsWith('.md') ? '📝' :
                   file.path === '.htaccess' ? '⚙️' : '📄'}
                </span>
                <span className="truncate">{file.path}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Download Button */}
        {!isComplete ? (
          <button
            onClick={generateZip}
            disabled={isGenerating}
            className={`w-full py-4 px-6 rounded-xl text-base font-bold transition-all duration-300 ${
              isGenerating
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating... {progress}%
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                ⬇️ Download photobooth-gallery.zip
              </span>
            )}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">✅</div>
              <p className="font-bold text-green-800 text-sm">Download Berhasil!</p>
              <p className="text-xs text-green-600">Upload ke cPanel → File Manager → public_html/</p>
            </div>
            <button
              onClick={generateZip}
              className="w-full py-3 rounded-xl font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all text-sm"
            >
              🔄 Download Ulang
            </button>
          </div>
        )}

        {isGenerating && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Quick Install Steps */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="font-bold text-amber-800 text-xs mb-2 uppercase tracking-wide">🚀 Quick Install</h4>
          <ol className="text-xs text-amber-900 space-y-1 list-decimal list-inside">
            <li>Upload ZIP ke <code className="bg-amber-100 px-1 rounded">public_html/</code> via cPanel File Manager</li>
            <li>Extract → pindahkan isi folder ke <code className="bg-amber-100 px-1 rounded">public_html/</code></li>
            <li>Akses <code className="bg-amber-100 px-1 rounded">https://yourdomain.com/install.php</code></li>
            <li>Ikuti wizard 4 langkah (DB → Schema → Admin)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CODE BLOCK COMPONENT
// ============================================

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded font-mono">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className={`px-3 py-1 text-xs rounded font-medium transition-all ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>
      <pre
        ref={codeRef}
        className="bg-gray-900 text-gray-100 p-4 pt-10 rounded-lg overflow-x-auto text-sm leading-relaxed font-mono max-h-[600px] overflow-y-auto"
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ============================================
// FILE CARD COMPONENT
// ============================================

function FileCard({
  file,
  isActive,
  onClick,
}: {
  file: CodeFile;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-all duration-200 border ${
        isActive
          ? 'bg-indigo-50 border-indigo-300 shadow-sm'
          : 'bg-white border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/50'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{file.icon}</span>
        <div className="min-w-0 flex-1">
          <div
            className={`font-semibold text-sm truncate ${
              isActive ? 'text-indigo-700' : 'text-gray-800'
            }`}
          >
            {file.name}
          </div>
          <div className="text-xs text-gray-500 truncate">{file.path}</div>
        </div>
      </div>
    </button>
  );
}

// ============================================
// INSTALLATION TAB
// ============================================

function InstallationTab() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span>📋</span> Panduan Instalasi
      </h2>
      <div className="prose prose-sm max-w-none">
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
          {installationGuide}
        </pre>
      </div>
    </div>
  );
}

// ============================================
// ARCHITECTURE TAB
// ============================================

function ArchitectureTab() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span>🏗️</span> Arsitektur Sistem
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
          <h3 className="font-bold text-indigo-800 mb-3">📊 Alur Kerja</h3>
          <div className="space-y-2 text-sm">
            {[
              'User scan QR → Buka galeri event',
              'index.php fetch data dari DB (PDO)',
              'Grid thumbnail lazy-loaded (WebP 400px)',
              'Klik Download → download.php validasi ID',
              'Force download file full (WebP 1920px)',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
          <h3 className="font-bold text-green-800 mb-3">🔒 Keamanan</h3>
          <ul className="space-y-2 text-sm text-green-900">
            <li>✅ PDO Prepared Statements (anti SQL Injection)</li>
            <li>✅ realpath() validation (anti Directory Traversal)</li>
            <li>✅ finfo MIME detection (anti File Upload Exploit)</li>
            <li>✅ .htaccess blocks direct PHP execution in uploads/</li>
            <li>✅ Content-Disposition: attachment (force download)</li>
            <li>✅ session_regenerate_id() (anti Session Fixation)</li>
            <li>✅ password_hash() + password_verify() (bcrypt)</li>
            <li>✅ X-Content-Type-Options: nosniff</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
          <h3 className="font-bold text-amber-800 mb-3">⚡ Performa</h3>
          <ul className="space-y-2 text-sm text-amber-900">
            <li>🚀 WebP compression (~70% lebih kecil dari JPEG)</li>
            <li>🚀 Database query dengan index (10.000 foto = &lt;50ms)</li>
            <li>🚀 Lazy loading + Intersection Observer</li>
            <li>🚀 Skeleton animation (no layout shift)</li>
            <li>🚀 Chunked file streaming (8KB chunks)</li>
            <li>🚀 LiteSpeed Cache compatible</li>
            <li>🚀 No framework overhead (pure PHP 8.2)</li>
            <li>🚀 Thumb 400px = ~15-30KB per file</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-100">
          <h3 className="font-bold text-blue-800 mb-3">💾 Estimasi Storage</h3>
          <div className="space-y-2 text-sm text-blue-900">
            <div className="flex justify-between"><span>Full image (1920px WebP):</span><span className="font-mono">~150-300 KB</span></div>
            <div className="flex justify-between"><span>Thumbnail (400px WebP):</span><span className="font-mono">~15-30 KB</span></div>
            <div className="flex justify-between"><span>1.000 foto total:</span><span className="font-mono">~330 MB</span></div>
            <div className="flex justify-between"><span>10.000 foto total:</span><span className="font-mono">~3.3 GB</span></div>
            <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">
              <span>Sisa NVMe (dari 12GB):</span>
              <span className="font-mono text-green-700 font-bold">~8.7 GB free</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-gray-50 rounded-xl p-5 border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-3">🛠️ Tech Stack</h3>
        <div className="flex flex-wrap gap-2">
          {['PHP 8.2', 'MariaDB 11.4', 'PDO', 'GD Library', 'WebP', 'LiteSpeed', 'CSS Grid', 'Vanilla JS', 'Intersection Observer', 'bcrypt', 'QR Code API', 'Responsive Design'].map((tech) => (
            <span key={tech} className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs font-medium text-gray-700">
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================

export default function App() {
  const [activeTab, setActiveTab] = useState<'download' | 'guide' | 'files' | 'architecture' | 'install'>('download');
  const [activeFileId, setActiveFileId] = useState<string>(phpFiles[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeFile = phpFiles.find((f) => f.id === activeFileId);

  useEffect(() => {
    setSidebarOpen(false);
  }, [activeFileId, activeTab]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Header */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-base md:text-xl font-bold flex items-center gap-2">
                  📸 Photobooth Download Gallery
                </h1>
                <p className="text-indigo-200 text-xs hidden sm:block">
                  PHP 8.2 OOP • Vanilla • Ultra-Ringan • Mobile-First
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="px-2 py-1 bg-white/10 rounded-full">PHP 8.2</span>
              <span className="px-2 py-1 bg-white/10 rounded-full">MariaDB 11.4</span>
              <span className="px-2 py-1 bg-white/10 rounded-full">LiteSpeed</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto py-2">
            {[
              { id: 'download' as const, label: '⬇️ Download ZIP', highlight: true },
              { id: 'guide' as const, label: '📖 Panduan cPanel', highlight: false },
              { id: 'files' as const, label: '📁 Source Code', count: phpFiles.length },
              { id: 'architecture' as const, label: '🏗️ Arsitektur' },
              { id: 'install' as const, label: '📋 Instalasi' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? tab.highlight
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                      : 'bg-indigo-100 text-indigo-700'
                    : tab.highlight
                      ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
                {'count' in tab && tab.count && (
                  <span className="ml-1 px-1.5 py-0.5 bg-indigo-200/70 text-indigo-700 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'download' && (
          <div className="max-w-2xl mx-auto">
            <DownloadZipSection />
          </div>
        )}
        {activeTab === 'guide' && <CPanelGuide />}
        {activeTab === 'architecture' && <ArchitectureTab />}
        {activeTab === 'install' && <InstallationTab />}
        {activeTab === 'files' && (
          <div className="flex gap-6">
            {/* Sidebar */}
            <aside
              className={`fixed lg:static inset-y-0 left-0 z-40 w-72 lg:w-64 xl:w-72 transform transition-transform duration-300 lg:transform-none ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
              }`}
            >
              <div className="h-full lg:h-auto bg-gray-50 lg:bg-transparent p-4 lg:p-0 overflow-y-auto">
                {sidebarOpen && (
                  <div
                    className="fixed inset-0 bg-black/50 lg:hidden -z-10"
                    onClick={() => setSidebarOpen(false)}
                  />
                )}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 lg:sticky lg:top-24">
                  <h3 className="font-bold text-gray-700 text-sm mb-3 px-1">
                    📂 File Struktur ({phpFiles.length} files)
                  </h3>
                  <div className="space-y-1.5">
                    {phpFiles.map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        isActive={activeFileId === file.id}
                        onClick={() => {
                          setActiveFileId(file.id);
                          setActiveTab('files');
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Code Display */}
            <div className="flex-1 min-w-0">
              {activeFile && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{activeFile.icon}</span>
                        <div>
                          <h2 className="font-bold text-gray-800 text-lg">{activeFile.name}</h2>
                          <p className="text-sm text-gray-500">{activeFile.path}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {activeFile.code.split('\n').length} lines
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{activeFile.description}</p>
                  </div>
                  <div className="p-4">
                    <CodeBlock code={activeFile.code} language={activeFile.language} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>📸 Photobooth Download Gallery System</p>
          <p className="mt-1 text-xs">
            PHP 8.2 • MariaDB 11.4 • LiteSpeed • cPanel Shared Hosting Optimized
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Zero Framework • PDO Prepared Statements • WebP Compression • Mobile-First
          </p>
        </div>
      </footer>
    </div>
  );
}
