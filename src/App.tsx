import { useState, useRef, useEffect } from 'react';
import { phpFiles, installationGuide, type CodeFile } from './data/phpFiles';

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
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

function ArchitectureTab() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span>🏗️</span> Arsitektur Sistem
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Flow Diagram */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
          <h3 className="font-bold text-indigo-800 mb-3">📊 Alur Kerja</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>User scan QR → Buka galeri event</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>index.php fetch data dari DB (PDO)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>Grid thumbnail lazy-loaded (WebP 400px)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <span>Klik Download → download.php validasi ID</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
              <span>Force download file full (WebP 1920px)</span>
            </div>
          </div>
        </div>

        {/* Security */}
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

        {/* Performance */}
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

        {/* Storage */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-100">
          <h3 className="font-bold text-blue-800 mb-3">💾 Estimasi Storage</h3>
          <div className="space-y-2 text-sm text-blue-900">
            <div className="flex justify-between">
              <span>Full image (1920px WebP):</span>
              <span className="font-mono">~150-300 KB</span>
            </div>
            <div className="flex justify-between">
              <span>Thumbnail (400px WebP):</span>
              <span className="font-mono">~15-30 KB</span>
            </div>
            <div className="flex justify-between">
              <span>1.000 foto total:</span>
              <span className="font-mono">~330 MB</span>
            </div>
            <div className="flex justify-between">
              <span>10.000 foto total:</span>
              <span className="font-mono">~3.3 GB</span>
            </div>
            <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">
              <span>Sisa NVMe (dari 12GB):</span>
              <span className="font-mono text-green-700 font-bold">~8.7 GB free</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="mt-6 bg-gray-50 rounded-xl p-5 border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-3">🛠️ Tech Stack</h3>
        <div className="flex flex-wrap gap-2">
          {[
            'PHP 8.2', 'MariaDB 11.4', 'PDO', 'GD Library', 'WebP',
            'LiteSpeed', 'CSS Grid', 'Vanilla JS', 'Intersection Observer',
            'bcrypt', 'QR Code API', 'Responsive Design'
          ].map((tech) => (
            <span
              key={tech}
              className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs font-medium text-gray-700"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'files' | 'architecture' | 'install'>('files');
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
        <div className="max-w-7xl mx-auto px-4 py-4">
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
                <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
                  📸 Photobooth Download Gallery
                </h1>
                <p className="text-indigo-200 text-xs md:text-sm">
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
              { id: 'files' as const, label: '📁 Source Code', count: phpFiles.length },
              { id: 'architecture' as const, label: '🏗️ Arsitektur' },
              { id: 'install' as const, label: '📋 Instalasi' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
                {tab.count && (
                  <span className="ml-1 px-1.5 py-0.5 bg-indigo-200 text-indigo-700 rounded-full text-xs">
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
        {activeTab === 'architecture' && <ArchitectureTab />}
        {activeTab === 'install' && <InstallationTab />}
        {activeTab === 'files' && (
          <div className="flex gap-6">
            {/* Sidebar - File List */}
            <aside
              className={`fixed lg:static inset-y-0 left-0 z-40 w-72 lg:w-64 xl:w-72 transform transition-transform duration-300 lg:transform-none ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
              }`}
            >
              <div className="h-full lg:h-auto bg-gray-50 lg:bg-transparent p-4 lg:p-0 overflow-y-auto">
                {/* Mobile overlay */}
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
                  {/* File Header */}
                  <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{activeFile.icon}</span>
                        <div>
                          <h2 className="font-bold text-gray-800 text-lg">
                            {activeFile.name}
                          </h2>
                          <p className="text-sm text-gray-500">
                            {activeFile.path}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {activeFile.code.split('\n').length} lines
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {activeFile.description}
                    </p>
                  </div>

                  {/* Code Block */}
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
