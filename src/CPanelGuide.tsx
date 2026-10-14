import { useState } from 'react';

interface Step {
  id: number;
  title: string;
  icon: string;
  description: string;
  details: string[];
  tip?: string;
  warning?: string;
  mockup?: React.ReactNode;
}

// Mockup cPanel File Manager
function CPanelMockup({ step }: { step: number }) {
  if (step === 1) {
    return (
      <div className="bg-gray-100 rounded-lg border border-gray-300 overflow-hidden text-xs">
        <div className="bg-gradient-to-r from-white to-gray-50 border-b px-3 py-2 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
          <span className="ml-2 text-gray-600 font-mono">yourdomain.com/cpanel</span>
        </div>
        <div className="p-4">
          <div className="text-center mb-3">
            <div className="text-lg font-bold text-gray-700">cPanel</div>
            <div className="text-xs text-gray-500">Welcome, username</div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: '📁', name: 'File Manager', active: true },
              { icon: '🗄️', name: 'phpMyAdmin', active: false },
              { icon: '📧', name: 'Email Accounts', active: false },
              { icon: '🌐', name: 'Domains', active: false },
              { icon: '📊', name: 'Metrics', active: false },
              { icon: '🔒', name: 'SSL/TLS', active: false },
              { icon: '⚙️', name: 'PHP Manager', active: false },
              { icon: '💾', name: 'Backup', active: false },
            ].map((item, i) => (
              <div
                key={i}
                className={`p-2 rounded border text-center ${
                  item.active
                    ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="text-xl mb-1">{item.icon}</div>
                <div className="text-[10px] text-gray-700">{item.name}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 bg-indigo-100 border border-indigo-300 rounded p-2 text-center">
            <span className="text-indigo-700 font-semibold">↑ Klik "File Manager"</span>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="bg-gray-100 rounded-lg border border-gray-300 overflow-hidden text-xs">
        <div className="bg-gradient-to-r from-white to-gray-50 border-b px-3 py-2 flex items-center gap-2">
          <span className="text-gray-600 font-mono">📁 File Manager</span>
        </div>
        <div className="p-3">
          <div className="bg-white rounded border p-2 mb-2">
            <div className="text-gray-500 text-[10px] mb-1">Path:</div>
            <div className="font-mono bg-gray-50 px-2 py-1 rounded border">
              /home/username/<span className="text-indigo-600 font-bold">public_html</span>/
            </div>
          </div>
          <div className="bg-white rounded border overflow-hidden">
            <div className="bg-gray-50 px-2 py-1 border-b font-semibold text-gray-600">Files</div>
            <div className="divide-y">
              {[
                { icon: '📁', name: 'cgi-bin', active: false },
                { icon: '📁', name: 'public_html', active: true },
                { icon: '📄', name: '.htaccess', active: false },
              ].map((f, i) => (
                <div
                  key={i}
                  className={`px-2 py-1.5 flex items-center gap-2 ${
                    f.active ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-400' : ''
                  }`}
                >
                  <span>{f.icon}</span>
                  <span className={f.active ? 'font-bold text-indigo-700' : ''}>{f.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 bg-indigo-100 border border-indigo-300 rounded p-2 text-center">
            <span className="text-indigo-700 font-semibold">↑ Double-click "public_html"</span>
          </div>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="bg-gray-100 rounded-lg border border-gray-300 overflow-hidden text-xs">
        <div className="bg-gradient-to-r from-white to-gray-50 border-b px-3 py-2">
          <span className="text-gray-600 font-mono">📁 public_html/</span>
        </div>
        <div className="p-3">
          <div className="bg-white rounded border p-3 text-center">
            <div className="text-4xl mb-2">📤</div>
            <div className="border-2 border-dashed border-indigo-400 rounded-lg p-4 bg-indigo-50">
              <div className="font-bold text-indigo-700 mb-1">Upload File</div>
              <div className="text-[10px] text-gray-600 mb-2">Select File to Upload</div>
              <div className="bg-white border rounded px-2 py-1 text-gray-500 inline-block">
                📎 photobooth-gallery.zip
              </div>
            </div>
            <div className="mt-2 text-[10px] text-gray-500">
              Max upload size: 50MB (cPanel default)
            </div>
          </div>
          <div className="mt-2 bg-green-100 border border-green-300 rounded p-2 text-center">
            <span className="text-green-700 font-semibold">✓ Upload file ZIP yang sudah didownload</span>
          </div>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="bg-gray-100 rounded-lg border border-gray-300 overflow-hidden text-xs">
        <div className="bg-gradient-to-r from-white to-gray-50 border-b px-3 py-2">
          <span className="text-gray-600 font-mono">📁 public_html/</span>
        </div>
        <div className="p-3">
          <div className="bg-white rounded border overflow-hidden">
            <div className="bg-gray-50 px-2 py-1 border-b font-semibold text-gray-600">Files</div>
            <div className="divide-y">
              <div className="px-2 py-1.5 flex items-center gap-2 bg-yellow-50 ring-2 ring-inset ring-yellow-400">
                <span>📦</span>
                <span className="font-bold text-yellow-800">photobooth-gallery.zip</span>
                <span className="ml-auto text-[10px] text-gray-500">~30 KB</span>
              </div>
            </div>
          </div>
          <div className="mt-3 bg-white rounded border p-2">
            <div className="text-[10px] text-gray-500 mb-1">Right-click menu:</div>
            <div className="bg-gray-50 rounded border shadow-sm">
              <div className="px-2 py-1 hover:bg-gray-100">📋 Copy</div>
              <div className="px-2 py-1 hover:bg-gray-100">✏️ Rename</div>
              <div className="px-2 py-1 hover:bg-gray-100 bg-indigo-100 font-bold text-indigo-700">
                📂 Extract ← KLIK INI
              </div>
              <div className="px-2 py-1 hover:bg-gray-100">🗑️ Delete</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="bg-gray-100 rounded-lg border border-gray-300 overflow-hidden text-xs">
        <div className="bg-gradient-to-r from-white to-gray-50 border-b px-3 py-2">
          <span className="text-gray-600 font-mono">📂 Extract Files</span>
        </div>
        <div className="p-3">
          <div className="bg-white rounded border p-3">
            <div className="font-bold text-gray-700 mb-2">Extract To:</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value="/home/username/public_html"
                className="flex-1 border rounded px-2 py-1 font-mono text-[11px] bg-gray-50"
              />
            </div>
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800">
              ⚠️ Akan muncul folder <code className="bg-amber-100 px-1 rounded">photobooth-gallery/</code>
              <br />
              Anda perlu pindahkan isinya ke <code className="bg-amber-100 px-1 rounded">public_html/</code>
            </div>
            <button className="mt-2 w-full bg-indigo-500 text-white py-1.5 rounded font-semibold">
              Extract Files
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 6) {
    return (
      <div className="bg-gray-100 rounded-lg border border-gray-300 overflow-hidden text-xs">
        <div className="bg-gradient-to-r from-white to-gray-50 border-b px-3 py-2">
          <span className="text-gray-600 font-mono">📁 public_html/photobooth-gallery/</span>
        </div>
        <div className="p-3">
          <div className="bg-white rounded border overflow-hidden">
            <div className="bg-gray-50 px-2 py-1 border-b font-semibold text-gray-600">
              Files (setelah extract)
            </div>
            <div className="divide-y max-h-48 overflow-y-auto">
              {[
                { icon: '📁', name: 'config/' },
                { icon: '📁', name: 'classes/' },
                { icon: '📁', name: 'uploads/' },
                { icon: '🐘', name: 'admin.php' },
                { icon: '🐘', name: 'index.php' },
                { icon: '🐘', name: 'download.php' },
                { icon: '🐘', name: 'install.php' },
                { icon: '⚙️', name: '.htaccess' },
                { icon: '🗄️', name: 'database.sql' },
              ].map((f, i) => (
                <div key={i} className="px-2 py-1 flex items-center gap-2">
                  <span>{f.icon}</span>
                  <span className="font-mono">{f.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 bg-blue-100 border border-blue-300 rounded p-2 text-center">
            <span className="text-blue-700 font-semibold">
              Select All (Ctrl+A) → Move → ke public_html/
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (step === 7) {
    return (
      <div className="bg-gray-100 rounded-lg border border-gray-300 overflow-hidden text-xs">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-2 text-white">
          <span className="font-mono">🌐 yourdomain.com/install.php</span>
        </div>
        <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-3 text-white text-center">
              <div className="text-xl mb-1">📸</div>
              <div className="font-bold text-sm">Photobooth Gallery Installer</div>
              <div className="text-[10px] opacity-90">Setup wizard 4 langkah</div>
            </div>
            <div className="p-3">
              <div className="flex justify-between mb-3">
                {['1', '2', '3', '4'].map((n, i) => (
                  <div key={i} className="flex-1 text-center">
                    <div
                      className={`w-6 h-6 rounded-full mx-auto mb-1 flex items-center justify-center text-[10px] font-bold ${
                        i === 0 ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {n}
                    </div>
                    <div className="text-[9px] text-gray-500">
                      {['Req', 'DB', 'Schema', 'Admin'][i]}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-gray-600 text-center">
                ✓ Cek requirement sistem...
              </div>
            </div>
          </div>
          <div className="mt-2 bg-green-100 border border-green-300 rounded p-2 text-center">
            <span className="text-green-700 font-semibold">
              🎉 Ikuti wizard sampai selesai!
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function CPanelGuide() {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [expandedStep, setExpandedStep] = useState<number>(1);

  const steps: Step[] = [
    {
      id: 1,
      title: 'Login ke cPanel',
      icon: '🔐',
      description: 'Akses cPanel melalui browser',
      details: [
        'Buka browser, ketik: yourdomain.com/cpanel',
        'Atau via link dari email aktivasi hosting',
        'Login dengan username & password cPanel Anda',
        'Jika lupa password, reset via client area hosting',
      ],
      tip: 'URL cPanel biasanya: yourdomain.com/cpanel atau yourdomain.com:2083',
    },
    {
      id: 2,
      title: 'Buka File Manager',
      icon: '📁',
      description: 'Masuk ke File Manager cPanel',
      details: [
        'Di halaman utama cPanel, cari section "Files"',
        'Klik icon "File Manager"',
        'Akan muncul window baru dengan file browser',
        'Pastikan Anda berada di direktori root (home/username/)',
      ],
      tip: 'File Manager cPanel mirip Windows Explorer / macOS Finder',
    },
    {
      id: 3,
      title: 'Masuk ke folder public_html',
      icon: '📂',
      description: 'Buka folder tempat website Anda',
      details: [
        'Di sidebar kiri, klik folder "public_html"',
        'Atau double-click folder "public_html" di panel utama',
        'Folder ini adalah root website Anda',
        'Semua file website harus ada di dalam folder ini',
      ],
      warning: 'JANGAN upload ke folder lain selain public_html!',
    },
    {
      id: 4,
      title: 'Upload file ZIP',
      icon: '📤',
      description: 'Upload photobooth-gallery.zip',
      details: [
        'Di toolbar atas, klik tombol "Upload"',
        'Akan muncul halaman upload baru',
        'Klik "Select File" atau drag & drop file ZIP',
        'Pilih file "photobooth-gallery.zip" yang sudah didownload',
        'Tunggu sampai progress bar 100% (Complete)',
        'Klik "Go Back to /home/username/public_html"',
      ],
      tip: 'Jika upload gagal, cek ukuran file. Max upload cPanel biasanya 50MB.',
    },
    {
      id: 5,
      title: 'Extract file ZIP',
      icon: '📦',
      description: 'Ekstrak isi ZIP ke folder',
      details: [
        'Cari file "photobooth-gallery.zip" di daftar file',
        'Klik kanan pada file ZIP tersebut',
        'Pilih menu "Extract"',
        'Akan muncul popup konfirmasi lokasi extract',
        'Pastikan path: /home/username/public_html',
        'Klik tombol "Extract Files"',
      ],
      tip: 'Extract akan membuat folder baru bernama "photobooth-gallery/"',
    },
    {
      id: 6,
      title: 'Pindahkan isi folder',
      icon: '🔄',
      description: 'Pindahkan semua file ke public_html',
      details: [
        'Buka folder "photobooth-gallery/" yang baru dibuat',
        'Tekan Ctrl+A (atau Cmd+A di Mac) untuk select semua',
        'Klik tombol "Move" di toolbar atas',
        'Di popup, ubah path menjadi: /home/username/public_html',
        'Hapus bagian "/photobooth-gallery" dari path',
        'Klik "Move File(s)" untuk konfirmasi',
        'Kembali ke public_html, hapus folder "photobooth-gallery/" kosong',
        'Hapus juga file "photobooth-gallery.zip" (opsional)',
      ],
      warning: 'Pastikan TIDAK ada file lama yang tertimpa! Backup dulu jika perlu.',
    },
    {
      id: 7,
      title: 'Jalankan Installer',
      icon: '🚀',
      description: 'Setup database dan admin via browser',
      details: [
        'Buka tab baru di browser',
        'Ketik: yourdomain.com/install.php',
        'Step 1: Sistem akan cek requirement (PHP, GD, dll)',
        'Step 2: Input database credentials (buat DB dulu di cPanel → MySQL Databases)',
        'Step 3: Klik "Import Schema" untuk buat tabel',
        'Step 4: Buat username & password admin',
        'Setelah selesai, HAPUS file install.php untuk keamanan!',
      ],
      tip: 'Untuk buat database: cPanel → MySQL Databases → Create New Database',
      warning: 'SEGERA hapus install.php setelah install selesai untuk keamanan!',
    },
  ];

  const toggleComplete = (stepId: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]
    );
  };

  const progress = (completedSteps.length / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 md:p-8 text-white mb-6 shadow-xl">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              📖 Panduan Upload ke cPanel
            </h2>
            <p className="text-indigo-100 text-sm md:text-base">
              Ikuti 7 langkah berikut untuk install Photobooth Gallery
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
            <div className="text-xs text-indigo-100">Progress</div>
            <div className="text-2xl font-bold">
              {completedSteps.length}/{steps.length}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-indigo-100">
            <span>Mulai</span>
            <span>Selesai ✨</span>
          </div>
        </div>
      </div>

      {/* Prerequisites */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
          ⚠️ Persiapan Sebelum Upload
        </h3>
        <ul className="text-sm text-amber-900 space-y-1">
          <li>✅ File <code className="bg-amber-100 px-1 rounded">photobooth-gallery.zip</code> sudah didownload</li>
          <li>✅ Akses cPanel sudah tersedia (username & password)</li>
          <li>✅ Domain sudah pointing ke hosting</li>
          <li>✅ PHP 8.2+ aktif di hosting (cek di cPanel → Select PHP Version)</li>
          <li>✅ Database MySQL/MariaDB bisa dibuat (cek di cPanel → MySQL Databases)</li>
        </ul>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isExpanded = expandedStep === step.id;

          return (
            <div
              key={step.id}
              className={`bg-white rounded-xl border-2 transition-all duration-300 overflow-hidden ${
                isCompleted
                  ? 'border-green-300 bg-green-50/30'
                  : isExpanded
                  ? 'border-indigo-400 shadow-lg'
                  : 'border-gray-200'
              }`}
            >
              {/* Step Header */}
              <button
                onClick={() => setExpandedStep(isExpanded ? 0 : step.id)}
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleComplete(step.id);
                  }}
                  className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {isCompleted && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Step Number */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isExpanded
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isCompleted ? '✓' : step.id}
                </div>

                {/* Step Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl">{step.icon}</span>
                    <h3
                      className={`font-bold ${
                        isCompleted ? 'text-green-700 line-through' : 'text-gray-800'
                      }`}
                    >
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>
                </div>

                {/* Expand Icon */}
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Details */}
                    <div>
                      <h4 className="font-semibold text-gray-700 text-sm mb-2">📝 Langkah-langkah:</h4>
                      <ol className="space-y-2">
                        {step.details.map((detail, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-700">
                            <span className="flex-shrink-0 w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                              {i + 1}
                            </span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ol>

                      {step.tip && (
                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                          <span className="font-semibold text-blue-800">💡 Tip: </span>
                          <span className="text-blue-700">{step.tip}</span>
                        </div>
                      )}

                      {step.warning && (
                        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                          <span className="font-semibold text-red-800">⚠️ Perhatian: </span>
                          <span className="text-red-700">{step.warning}</span>
                        </div>
                      )}
                    </div>

                    {/* Mockup */}
                    <div>
                      <h4 className="font-semibold text-gray-700 text-sm mb-2">🖥️ Ilustrasi:</h4>
                      <CPanelMockup step={step.id} />
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4 flex gap-2 flex-wrap">
                    <button
                      onClick={() => toggleComplete(step.id)}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        isCompleted
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {isCompleted ? '↩️ Tandai Belum Selesai' : '✓ Tandai Selesai'}
                    </button>
                    {step.id < steps.length && (
                      <button
                        onClick={() => setExpandedStep(step.id + 1)}
                        className="px-4 py-2 rounded-lg font-semibold text-sm bg-indigo-500 text-white hover:bg-indigo-600 transition-all"
                      >
                        Lanjut ke Step {step.id + 1} →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion Card */}
      {completedSteps.length === steps.length && (
        <div className="mt-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-xl text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h3 className="text-2xl font-bold mb-2">Selamat! Instalasi Selesai!</h3>
          <p className="text-green-50 mb-4">
            Sistem Photobooth Gallery Anda sudah siap digunakan
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert('Buka: https://yourdomain.com/admin.php');
              }}
              className="px-5 py-2 bg-white text-green-700 rounded-lg font-bold hover:bg-green-50 transition-colors"
            >
              🔐 Ke Admin Panel
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert('Buka: https://yourdomain.com/index.php?event=sample-event');
              }}
              className="px-5 py-2 bg-white/20 text-white rounded-lg font-bold hover:bg-white/30 transition-colors"
            >
              👁️ Preview Gallery
            </a>
          </div>
          <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-lg p-3 text-sm text-left">
            <strong>🔒 Checklist Keamanan:</strong>
            <ul className="mt-1 space-y-1 text-green-50">
              <li>☐ Hapus file <code className="bg-white/20 px-1 rounded">install.php</code></li>
              <li>☐ Ganti password admin jika perlu</li>
              <li>☐ Update BASE_GALLERY_URL di classes/QrGenerator.php</li>
              <li>☐ Test upload foto pertama</li>
            </ul>
          </div>
        </div>
      )}

      {/* Troubleshooting */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
          🔧 Troubleshooting
        </h3>
        <div className="space-y-3">
          {[
            {
              q: 'Upload ZIP gagal / file terlalu besar',
              a: 'Cek limit upload di cPanel → Select PHP Version → Options → upload_max_filesize. Naikkan ke minimal 50M.',
            },
            {
              q: 'Error "Database connection failed"',
              a: 'Pastikan username & password database benar. Cek di cPanel → MySQL Databases → Current Databases.',
            },
            {
              q: 'Gallery tidak muncul / 404',
              a: 'Pastikan semua file sudah dipindah ke public_html/ (bukan di dalam subfolder). Cek .htaccess juga ter-upload.',
            },
            {
              q: 'Upload foto error / tidak bisa save',
              a: 'Cek permission folder uploads/ dan uploads/thumbs/. Harus 755 atau 775. Bisa diubah via File Manager → Change Permissions.',
            },
            {
              q: 'WebP tidak support / gambar rusak',
              a: 'Cek PHP version minimal 8.2 dan GD extension aktif. Di cPanel → Select PHP Version → Extensions → centang "gd".',
            },
            {
              q: 'QR Code tidak muncul',
              a: 'Update BASE_GALLERY_URL di classes/QrGenerator.php dengan domain Anda. Atau install composer + chillerlan/php-qrcode.',
            },
          ].map((item, i) => (
            <details
              key={i}
              className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden group"
            >
              <summary className="p-3 cursor-pointer hover:bg-gray-100 transition-colors font-medium text-sm text-gray-800 flex items-center gap-2">
                <span className="text-red-500">❓</span>
                {item.q}
                <svg
                  className="w-4 h-4 ml-auto text-gray-400 group-open:rotate-180 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="p-3 pt-0 text-sm text-gray-600 border-t border-gray-200">
                <span className="text-green-600 font-semibold">✅ Solusi: </span>
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Video Resources */}
      <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-xl p-6">
        <h3 className="font-bold text-indigo-900 text-lg mb-3">📚 Butuh Bantuan Lebih Lanjut?</h3>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div className="bg-white rounded-lg p-3 border border-indigo-100">
            <div className="font-semibold text-indigo-800 mb-1">🎥 Tutorial cPanel File Manager</div>
            <p className="text-gray-600 text-xs">
              Search YouTube: "cPanel File Manager upload extract tutorial"
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-indigo-100">
            <div className="font-semibold text-indigo-800 mb-1">📞 Support Hosting</div>
            <p className="text-gray-600 text-xs">
              Hubungi support hosting Anda jika ada masalah akses cPanel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
