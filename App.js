import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StatusBar,
  ActivityIndicator,
  Switch,
  Alert,
  Platform,
  Share,
  Image,
  Vibration,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Accelerometer } from 'expo-sensors';

// =================================================================
// 1. DESIGN SYSTEM: COLOR PALETTE & TOKENS (STUDYMATE IDENTITY)
// =================================================================
const COLORS = {
  // Brand Colors
  primary: '#4F46E5', // Indigo 600 (Warna Utama StudyMate)
  primaryLight: '#EEF2FF', // Indigo 50
  primaryDark: '#3730A3', // Indigo 800
  secondary: '#0EA5E9', // Sky 500
  secondaryLight: '#E0F2FE', // Sky 50
  accent: '#8B5CF6', // Purple 500 (AI Feature Accent)
  accentLight: '#F3E8FF', // Purple 50

  // Semantic
  emerald: '#10B981', // Success / Sudah Dipelajari
  emeraldLight: '#D1FAE5',
  amber: '#F59E0B', // Warning / PPT / Deadline Dekat
  amberLight: '#FEF3C7',
  rose: '#EF4444', // Danger / PDF / Urgent
  roseLight: '#FEE2E2',

  // Neutrals (Accessible & High Contrast - WCAG AAA)
  background: '#F8FAFC', // Slate 50
  card: '#FFFFFF',
  cardBorder: '#E2E8F0', // Slate 200
  textPrimary: '#0F172A', // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94A3B8', // Slate 400
  inputBackground: '#F1F5F9', // Slate 100
  divider: '#F1F5F9',
};

const STORAGE_KEYS = {
  COURSES: '@studymate_courses_v2',
  MATERIALS: '@studymate_materials_v2',
  TASKS: '@studymate_tasks_v2',
  NOTIFICATIONS: '@studymate_notifications_v2',
  SETTINGS: '@studymate_settings_v2',
  USER_PROFILE: '@studymate_profile_v2',
};

// =================================================================
// SPRINT 04 – ANGGOTA 1 (Backend Config)
// API_URL: Ganti dengan IP lokal laptop Anda agar Expo Go di HP
//          dapat mengakses backend XAMPP di jaringan Wi-Fi yang sama.
//          JANGAN gunakan 'localhost' atau '127.0.0.1' dari HP.
//
// Cara cek IP lokal: buka CMD → ketik: ipconfig
// Contoh: 'http://192.168.1.10/studymate-api'
// =================================================================
const API_URL = 'http://192.168.1.5/studymate-api'; // ← GANTI IP INI

// Secure key untuk menyimpan token di SecureStore
const SECURE_KEYS = {
  ACCESS_TOKEN: 'studymate_access_token',
  USER_DATA: 'studymate_user_data',
};

// =================================================================
// SPRINT 04 – ANGGOTA 2: Secure Token Storage Helpers
// Menyimpan, mengambil, dan menghapus token menggunakan Expo SecureStore
// (BUKAN AsyncStorage, karena token adalah data kriptografis sensitif)
// =================================================================

/**
 * Simpan access token ke Expo SecureStore (encrypted on-device storage)
 */
const saveAccessToken = async (token) => {
  try {
    await SecureStore.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, token);
    return true;
  } catch (e) {
    console.error('[SecureStore] Gagal menyimpan token:', e.message);
    return false;
  }
};

/**
 * Ambil access token dari SecureStore.
 * Mengembalikan string token atau null jika tidak ada / error.
 */
const getAccessToken = async () => {
  try {
    return await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
  } catch (e) {
    console.error('[SecureStore] Gagal mengambil token:', e.message);
    return null;
  }
};

/**
 * Hapus access token dari SecureStore (dipanggil saat logout).
 */
const deleteAccessToken = async () => {
  try {
    await SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN);
    return true;
  } catch (e) {
    console.error('[SecureStore] Gagal menghapus token:', e.message);
    return false;
  }
};

/**
 * Simpan data user ke SecureStore (nama, email, id)
 */
const saveUserData = async (userData) => {
  try {
    await SecureStore.setItemAsync(SECURE_KEYS.USER_DATA, JSON.stringify(userData));
    return true;
  } catch (e) {
    console.error('[SecureStore] Gagal menyimpan user data:', e.message);
    return false;
  }
};

/**
 * Ambil data user dari SecureStore.
 * Mengembalikan objek user atau null.
 */
const getUserData = async () => {
  try {
    const raw = await SecureStore.getItemAsync(SECURE_KEYS.USER_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('[SecureStore] Gagal mengambil user data:', e.message);
    return null;
  }
};

/**
 * Hapus semua data user dari SecureStore (dipanggil saat logout).
 */
const deleteUserData = async () => {
  try {
    await SecureStore.deleteItemAsync(SECURE_KEYS.USER_DATA);
    return true;
  } catch (e) {
    return false;
  }
};

// =================================================================
// WEEK 7 – DEVICE SENSORS & SMART MATERIAL SCANNER HELPERS
// Anggota 1: Camera & Permission Integration
// Anggota 2: Persistent Local Storage for Scanned Material Photos
// Anggota 3: Accelerometer Shake Detection & Haptic Feedback
// =================================================================

/**
 * persistImageAsync:
 * Anggota 2 – Menyimpan foto hasil scan kamera ke direktori dokumen lokal perangkat.
 * File yang disimpan di documentDirectory bersifat permanen (tidak dibersihkan oleh OS)
 * dan dapat diakses kapan saja secara offline meskipun aplikasi ditutup.
 */
const persistImageAsync = async (sourceUri) => {
  if (!sourceUri) return null;
  try {
    const filename = `studymate_scan_${Date.now()}.jpg`;
    const docDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    if (docDir) {
      const destinationUri = `${docDir}${filename}`;
      await FileSystem.copyAsync({
        from: sourceUri,
        to: destinationUri,
      });
      return destinationUri;
    }
    return sourceUri;
  } catch (e) {
    console.warn('[WEEK 7] Gagal menyalin foto ke documentDirectory, menggunakan URI fallback:', e.message);
    return sourceUri;
  }
};

/**
 * triggerShakeFeedback:
 * Anggota 3 – Memberikan feedback getaran singkat saat goyangan perangkat terdeteksi.
 * Menggunakan expo-haptics dengan fallback React Native Vibration.
 */
const triggerShakeFeedback = async () => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    try {
      Vibration.vibrate(150);
    } catch { }
  }
};

// =================================================================
// WEEK 6 – ANGGOTA 1: REUSABLE API ERROR HANDLER & CLIENT
// Menangani: HTTP 2xx, 4xx, 5xx, Network Error, Timeout, Invalid JSON
// =================================================================

/**
 * getFriendlyErrorMessage:
 * Memetakan kode status HTTP dan kondisi error ke pesan bahasa Indonesia yang ramah pengguna.
 * Menghindari pesan teknis mentah atau stack trace yang membingungkan mahasiswa.
 */
const getFriendlyErrorMessage = (status, responseData, errorType) => {
  // Jika backend mengembalikan pesan error kustom dalam JSON (misal { success: false, message: "..." })
  if (responseData && responseData.message) {
    return responseData.message;
  }
  if (errorType === 'TIMEOUT') {
    return 'Server membutuhkan waktu terlalu lama untuk merespons (Request Timeout). Silakan coba beberapa saat lagi.';
  }
  if (errorType === 'NETWORK' || errorType === 'OFFLINE') {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan pastikan server XAMPP sedang aktif.';
  }
  if (errorType === 'PARSE_ERROR') {
    return 'Respons server tidak sesuai format yang diharapkan (Invalid JSON format).';
  }

  switch (status) {
    case 400:
      return 'Permintaan tidak valid (Bad Request). Silakan periksa kembali data Anda.';
    case 401:
      return 'Sesi login telah berakhir atau tidak sah. Silakan login kembali.';
    case 403:
      return 'Akses ditolak. Anda tidak memiliki izin untuk melihat atau mengubah data ini.';
    case 404:
      return 'Layanan atau data yang diminta tidak ditemukan di server (404 Not Found).';
    case 408:
      return 'Waktu permintaan habis (Request Timeout).';
    case 409:
      return 'Terjadi konflik data (misalnya email sudah terdaftar dalam sistem).';
    case 422:
      return 'Validasi input gagal. Pastikan seluruh kolom terisi dengan format yang benar.';
    case 500:
      return 'Terjadi masalah pada server backend. Silakan coba beberapa saat lagi (500 Internal Error).';
    case 502:
      return 'Gateway server mengalami gangguan (502 Bad Gateway). Periksa web server Apache.';
    case 503:
      return 'Layanan server sedang tidak tersedia atau dalam pemeliharaan (503 Service Unavailable).';
    case 504:
      return 'Gateway server kehabisan waktu respons (504 Gateway Timeout).';
    default:
      return `Terjadi kesalahan saat berkomunikasi dengan server (Status: ${status || 'Unknown'}).`;
  }
};

/**
 * requestApi:
 * Fungsi reusable utama untuk menangani semua request API di StudyMate.
 * - Otomatis menambahkan header Content-Type & Accept
 * - Otomatis menyertakan Bearer Token jika requiresAuth=true
 * - Membatasi request dengan AbortController timeout (default: 10000ms)
 * - Melakukan parsing JSON yang aman dengan proteksi terhadap HTML output
 * - Mengembalikan objek terstruktur: { ok, status, data, error, isTimeout, isOffline }
 */
const requestApi = async (endpoint, options = {}) => {
  const {
    method = 'GET',
    body = null,
    requiresAuth = true,
    timeoutMs = 10000,
    headers: customHeaders = {},
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  console.log(`[API REQUEST] ➜ ${method} ${url}`);

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders,
    };

    if (requiresAuth) {
      const token = await getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const fetchConfig = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchConfig.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchConfig);
    const rawText = await response.text();
    console.log(`[API RESPONSE] ◀ HTTP ${response.status} | Body length: ${rawText.length}`);

    let data = null;
    let parseFailed = false;
    try {
      data = JSON.parse(rawText);
    } catch {
      parseFailed = true;
      console.warn('[API] Non-JSON response received:', rawText.substring(0, 200));
    }

    if (parseFailed) {
      return {
        ok: false,
        status: response.status,
        data: null,
        error: getFriendlyErrorMessage(response.status, null, 'PARSE_ERROR'),
        isTimeout: false,
        isOffline: false,
        rawText: rawText.substring(0, 300),
      };
    }

    if (!response.ok) {
      const friendlyError = getFriendlyErrorMessage(response.status, data);
      return {
        ok: false,
        status: response.status,
        data,
        error: friendlyError,
        isTimeout: false,
        isOffline: false,
      };
    }

    return {
      ok: true,
      status: response.status,
      data,
      error: null,
      isTimeout: false,
      isOffline: false,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`[API TIMEOUT] Request ke ${url} melebihi batas ${timeoutMs}ms`);
      return {
        ok: false,
        status: 408,
        data: null,
        error: getFriendlyErrorMessage(408, null, 'TIMEOUT'),
        isTimeout: true,
        isOffline: false,
      };
    }

    console.warn(`[API NETWORK ERROR] Gagal menghubungi ${url}:`, err.message);
    return {
      ok: false,
      status: 0,
      data: null,
      error: getFriendlyErrorMessage(0, null, 'NETWORK'),
      isTimeout: false,
      isOffline: true,
    };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Backward compatibility helpers yang membungkus requestApi
 */
const apiPost = (endpoint, body) => requestApi(endpoint, { method: 'POST', body, requiresAuth: false });
const apiPostAuth = (endpoint, body = {}) => requestApi(endpoint, { method: 'POST', body, requiresAuth: true });
const apiGetAuth = (endpoint) => requestApi(endpoint, { method: 'GET', requiresAuth: true });

// =================================================================
// 2. INITIAL SEED DATA (MAHASISWA REALISTIS)
// =================================================================
const INITIAL_COURSES = [
  {
    id: 'crs_1',
    code: 'IF3101',
    name: 'Pemrograman Mobile',
    lecturer: 'Dr. Ir. Hendra Wijaya, M.Kom',
    day: 'Senin',
    time: '08:00 - 10:30',
    room: 'Lab Komputasi 3',
    sks: 3,
    color: '#4F46E5',
  },
  {
    id: 'crs_2',
    code: 'IF3102',
    name: 'Basis Data Lanjut',
    lecturer: 'Prof. Sri Rahayu, Ph.D',
    day: 'Selasa',
    time: '10:45 - 13:15',
    room: 'R. Seminar 204',
    sks: 3,
    color: '#0EA5E9',
  },
  {
    id: 'crs_3',
    code: 'IF3103',
    name: 'Kecerdasan Buatan (AI)',
    lecturer: 'Budi Santoso, S.T., M.Sc',
    day: 'Rabu',
    time: '13:30 - 16:00',
    room: 'Gd. Fasilkom 301',
    sks: 3,
    color: '#8B5CF6',
  },
  {
    id: 'crs_4',
    code: 'IF3104',
    name: 'Rekayasa Perangkat Lunak',
    lecturer: 'Dewi Lestari, M.T',
    day: 'Kamis',
    time: '08:00 - 10:30',
    room: 'Ruang Teori 102',
    sks: 3,
    color: '#10B981',
  },
];

const INITIAL_MATERIALS = [
  {
    id: 'mat_1',
    courseId: 'crs_1',
    courseName: 'Pemrograman Mobile',
    meetingNumber: 1,
    meetingTopic: 'Pengenalan React Native & Expo Ecosystem',
    title: 'Modul 1: React Native Architecture & Setup',
    fileType: 'PDF',
    fileName: 'Modul_01_ReactNative_Setup.pdf',
    fileSize: '4.2 MB',
    dateAdded: '2026-10-12',
    isStudied: true,
    userNotes: 'Catatan penting: Jangan lupa gunakan Bun atau npm yang kompatibel dengan React 19. Expo Go sangat memudahkan live testing via QR Code.',
    summary: 'Materi ini membahas fundamental arsitektur React Native (JavaScript Thread, Native Bridge, dan Fabric Renderer). Menjelaskan perbedaan pengembangan native vs cross-platform, instalasi CLI, serta keunggulan Expo Go dalam mempercepat prototyping aplikasi mobile tanpa kompilasi native yang berat.',
    keyPoints: [
      'React Native menggunakan konsep declarative UI dengan komponen native di iOS & Android.',
      'Expo Go mengemas dependensi native siap pakai sehingga tidak butuh Xcode/Android Studio saat tahap belajar dasar.',
      'JSX mengizinkan penulisan sintaks mirip HTML di dalam kode JavaScript murni.',
      'State & Props adalah fondasi manajemen data komponen dalam React.',
    ],
    quiz: [
      {
        question: 'Apa fungsi utama Fabric Renderer di arsitektur modern React Native?',
        options: ['Mengubah file PDF menjadi teks', 'Melakukan render UI secara efisien langsung ke komponen native', 'Mengkompresi gambar kamera', 'Menyimpan database lokal SQLite'],
        correctIndex: 1,
        explanation: 'Fabric renderer mengoptimalkan komunikasi antara JavaScript thread dan native view thread sehingga perpindahan UI terasa instan 60 FPS.',
      },
      {
        question: 'Kapan sebaiknya menggunakan Expo Go dibanding Bare React Native?',
        options: ['Saat membutuhkan custom library C++ native tingkat lanjut', 'Untuk prototyping cepat dan belajar tanpa konfigurasi native yang rumit', 'Ketika tidak memiliki koneksi internet sama sekali', 'Saat membuat aplikasi sistem operasi baru'],
        correctIndex: 1,
        explanation: 'Expo Go dirancang agar mahasiswa langsung fokus ke logika aplikasi tanpa pusing konfigurasi Gradle atau CocoaPods.',
      },
    ],
  },
  {
    id: 'mat_2',
    courseId: 'crs_1',
    courseName: 'Pemrograman Mobile',
    meetingNumber: 2,
    meetingTopic: 'Komponen UI, Flexbox & State Management',
    title: 'Slide Kuliah: Flexbox Responsive & State React',
    fileType: 'PPT',
    fileName: 'Pertemuan_2_Flexbox_State.pptx',
    fileSize: '12.8 MB',
    dateAdded: '2026-10-19',
    isStudied: true,
    userNotes: 'Ingat! default flexDirection di React Native adalah "column", bukan "row" seperti di CSS web standar.',
    summary: 'Membahas perancangan layout responsif mobile menggunakan Flexbox. Fokus pada properti alignItems, justifyContent, flexWrap, serta pengelolaan State lokal dengan React Hook useState dan useEffect untuk siklus hidup komponen.',
    keyPoints: [
      'Default flexDirection pada React Native adalah column (vertikal).',
      'justifyContent mengatur perataan sepanjang main axis.',
      'alignItems mengatur perataan tegak lurus terhadap cross axis.',
      'useState memicu re-render UI setiap kali setter function dipanggil dengan state baru.',
    ],
    quiz: [
      {
        question: 'Apa nilai default dari flexDirection di React Native?',
        options: ['row', 'column', 'row-reverse', 'grid'],
        correctIndex: 1,
        explanation: 'Berbeda dari CSS web yang default-nya row, React Native secara default berorientasi vertikal (column) sesuai layar smartphone.',
      },
    ],
  },
  {
    id: 'mat_3',
    courseId: 'crs_1',
    courseName: 'Pemrograman Mobile',
    meetingNumber: 3,
    meetingTopic: 'Navigasi Antar Halaman & Async Storage',
    title: 'Hands-on: React Navigation & Offline Persistence',
    fileType: 'PDF',
    fileName: 'Modul_03_AsyncStorage_BottomTabs.pdf',
    fileSize: '3.5 MB',
    dateAdded: '2026-10-26',
    isStudied: false,
    userNotes: 'Perlu latihan ulang: cara serialisasi JSON.stringify dan JSON.parse saat menyimpan array object ke AsyncStorage.',
    summary: 'Mempelajari navigasi multi-layar (Stack Navigation, Bottom Tab Navigation) dan teknik penyimpanan offline-first menggunakan AsyncStorage. Mengupas siklus simpan-ambil data user secara asinkron.',
    keyPoints: [
      'AsyncStorage hanya dapat menyimpan data dalam format String nilai tunggal (gunakan JSON.stringify).',
      'Bottom Tab Navigation memberikan akses cepat ke 4-5 menu utama aplikasi seluler.',
      'Gunakan try-catch block untuk menangani error saat I/O AsyncStorage.',
    ],
    quiz: [
      {
        question: 'Tipe data apa yang didukung langsung oleh AsyncStorage React Native?',
        options: ['Array murni', 'String murni', 'Binary Buffer murni', 'Boolean murni'],
        correctIndex: 1,
        explanation: 'AsyncStorage berbasis key-value string. Object atau array harus dikonversi via JSON.stringify() terlebih dahulu.',
      },
    ],
  },
  {
    id: 'mat_4',
    courseId: 'crs_2',
    courseName: 'Basis Data Lanjut',
    meetingNumber: 1,
    meetingTopic: 'Query Optimization & Indexing B-Tree',
    title: 'Slide: Konsep Indexing & Execution Plan',
    fileType: 'PPT',
    fileName: 'Pertemuan1_Database_Indexing.pptx',
    fileSize: '8.4 MB',
    dateAdded: '2026-10-13',
    isStudied: true,
    userNotes: 'Catatan dosen: Indeks mempercepat SELECT namun memperlambat INSERT/UPDATE karena pohon indeks harus direorganisasi.',
    summary: 'Ringkasan mengenai struktur data B-Tree pada RDBMS (PostgreSQL/MySQL), cara membaca Query Execution Plan (EXPLAIN ANALYZE), dan strategi memilih kolom untuk composite indexing.',
    keyPoints: [
      'Clustered Index menentukan urutan fisik penyimpanan data pada disk.',
      'Non-clustered Index membuat pointer penunjuk ke lokasi data aktual.',
      'EXPLAIN ANALYZE digunakan untuk melihat estimasi cost vs actual runtime eksekusi query.',
    ],
    quiz: [
      {
        question: 'Apa dampak penambahan terlalu banyak indeks pada tabel database?',
        options: ['Operasi SELECT menjadi sangat lambat', 'Operasi INSERT dan UPDATE membutuhkan waktu lebih lama', 'Database kehilangan data secara acak', 'Ukuran disk berkurang 50%'],
        correctIndex: 1,
        explanation: 'Setiap operasi penulisan (INSERT/UPDATE/DELETE) mewajibkan database memperbarui semua pohon indeks terkait.',
      },
    ],
  },
  {
    id: 'mat_5',
    courseId: 'crs_3',
    courseName: 'Kecerdasan Buatan (AI)',
    meetingNumber: 2,
    meetingTopic: 'Heuristic Search & Algoritma A*',
    title: 'Catatan Kuliah: A* Search vs Dijkstra Algorithm',
    fileType: 'DOC',
    fileName: 'Catatan_Pribadi_Algoritma_A_Star.txt',
    fileSize: '145 KB',
    dateAdded: '2026-10-20',
    isStudied: false,
    userNotes: 'Rumus f(n) = g(n) + h(n). g(n) = cost riil dari start ke n, h(n) = estimasi heuristik ke tujuan.',
    summary: 'Komparasi algoritma pencarian rute terpendek. Algoritma A* menggunakan fungsi evaluasi f(n) = g(n) + h(n) di mana h(n) harus admissible (tidak pernah overestimasi biaya ke target) agar menjamin solusi optimal.',
    keyPoints: [
      'Algoritma Dijkstra adalah kasus khusus dari A* di mana nilai heuristik h(n) bernilai 0.',
      'Heuristik admissible menjamin A* selalu menemukan jalur terpendek pertama kali.',
      'A* banyak diaplikasikan dalam game development, GPS navigasi, dan robotika pathfinding.',
    ],
    quiz: [
      {
        question: 'Apa syarat agar fungsi heuristik h(n) disebut Admissible?',
        options: ['h(n) harus selalu bernilai negatif', 'h(n) tidak boleh melebihi biaya riil sebenarnya ke tujuan', 'h(n) harus sama dengan nol di semua node', 'h(n) harus dihitung dengan machine learning'],
        correctIndex: 1,
        explanation: 'Jika h(n) tidak pernah mengestimasi lebih tinggi dari jarak sebenarnya, maka rute terpendek dijamin ditemukan.',
      },
    ],
  },
];

const INITIAL_TASKS = [
  {
    id: 'tsk_1',
    courseId: 'crs_1',
    courseName: 'Pemrograman Mobile',
    title: 'Tugas 1: Bangun UI Aplikasi StudyMate',
    deadline: '2026-11-06',
    priority: 'Tinggi',
    completed: false,
    description: 'Selesaikan layout dashboard, navigasi tab, dan modularisasi modal AI Assistant.',
  },
  {
    id: 'tsk_2',
    courseId: 'crs_2',
    courseName: 'Basis Data Lanjut',
    title: 'Praktikum SQL: Analisis Indexing EXPLAIN',
    deadline: '2026-11-08',
    priority: 'Sedang',
    completed: true,
    description: 'Buat laporan perbandingan waktu eksekusi query sebelum dan sesudah dibuatkan B-Tree Index.',
  },
  {
    id: 'tsk_3',
    courseId: 'crs_3',
    courseName: 'Kecerdasan Buatan (AI)',
    title: 'Resume Paper: Large Language Models for Education',
    deadline: '2026-11-12',
    priority: 'Rendah',
    completed: false,
    description: 'Buat resume 2 halaman tentang penerapan generative AI untuk ringkasan materi otomatis.',
  },
];

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif_1',
    title: 'Jadwal Kuliah Hari Ini!',
    message: 'Mata Kuliah Pemrograman Mobile (Pertemuan 3) dimulai pukul 08:00 WIB di Lab Komputasi 3.',
    time: '30 menit yang lalu',
    read: false,
    type: 'class',
  },
  {
    id: 'notif_2',
    title: 'Materi Belum Dibaca ⚠️',
    message: 'Kamu belum membaca materi "Hands-on: React Navigation & Offline Persistence". Klik untuk pelajari.',
    time: '2 jam yang lalu',
    read: false,
    type: 'material',
  },
  {
    id: 'notif_3',
    title: 'Deadline Tugas H-4',
    message: 'Tugas 1: Bangun UI Aplikasi StudyMate tenggat tanggal 06 November 2026.',
    time: 'Kemarin',
    read: true,
    type: 'task',
  },
];

// =================================================================
// 3. REUSABLE ATOMIC & MOLECULAR UI COMPONENTS
// =================================================================

// Reusable Header Component with Safe Status Bar Handling (Anggota 1)
const AppHeader = ({ title, subtitle, onOpenNotif, unreadCount, onOpenScheduleUpload }) => (
  <View style={styles.headerContainer}>
    <View style={styles.headerTextGroup}>
      <Text style={styles.headerSubtitle} numberOfLines={1}>
        {subtitle || 'Halo Mahasiswa! 👋'}
      </Text>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title || 'StudyMate'}
      </Text>
    </View>
    <View style={styles.headerActions}>
      {onOpenScheduleUpload && (
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={onOpenScheduleUpload}
          accessibilityLabel="Unggah Jadwal Kuliah"
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.headerIconButton}
        onPress={onOpenNotif}
        accessibilityLabel="Pusat Notifikasi"
        activeOpacity={0.7}
      >
        <Ionicons name="notifications-outline" size={20} color={COLORS.textPrimary} />
        {unreadCount > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  </View>
);

// Reusable Badge Chip
const Badge = ({ label, color, bg, icon }) => (
  <View style={[styles.badgeContainer, { backgroundColor: bg || COLORS.primaryLight }]}>
    {icon && <Ionicons name={icon} size={11} color={color || COLORS.primary} style={{ marginRight: 4 }} />}
    <Text style={[styles.badgeText, { color: color || COLORS.primary }]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

// Dynamic Stat Card for Dashboard (Anggota 1)
const StatCard = ({ title, value, subtitle, icon, iconColor, bgColor, cardWidth }) => (
  <View style={[styles.statCard, { width: cardWidth, borderLeftColor: iconColor, borderLeftWidth: 4 }]}>
    <View style={[styles.statIconBox, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <View style={styles.statContentCol}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statTitle} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.statSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  </View>
);

// Course Card Component (Anggota 2)
const CourseCard = ({ course, materialCount, studiedCount, onPress }) => {
  const progressPercent =
    materialCount > 0 ? Math.round((studiedCount / materialCount) * 100) : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.courseCard, { borderTopColor: course.color, borderTopWidth: 4 }]}
      onPress={() => onPress(course)}
    >
      <View style={styles.courseCardTop}>
        <View style={styles.courseMainInfo}>
          <View style={styles.courseBadgeRow}>
            <Text style={[styles.courseCodeBadge, { backgroundColor: course.color + '18', color: course.color }]}>
              {course.code}
            </Text>
            <Text style={styles.courseSksText}>{course.sks} SKS</Text>
          </View>
          <Text style={styles.courseNameText} numberOfLines={2}>
            {course.name}
          </Text>
          <Text style={styles.courseLecturerText} numberOfLines={1}>
            👨‍🏫 {course.lecturer}
          </Text>
        </View>

        <View style={styles.courseSchedulePill}>
          <Text style={styles.courseDayText}>{course.day}</Text>
          <Text style={styles.courseTimeText}>{course.time}</Text>
          <Text style={styles.courseRoomText} numberOfLines={1}>
            📍 {course.room}
          </Text>
        </View>
      </View>

      {/* Progress Bar Material Organizer */}
      <View style={styles.courseProgressContainer}>
        <View style={styles.courseProgressRow}>
          <Text style={styles.courseProgressLabel}>Progres Materi Terpelajari</Text>
          <Text style={styles.courseProgressValue}>
            {studiedCount}/{materialCount} ({progressPercent}%)
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, Math.max(0, progressPercent))}%`, backgroundColor: course.color },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Task Item Component (Anggota 2)
const TaskItem = ({ task, onToggle, onDelete }) => (
  <View style={[styles.taskItemCard, task.completed && styles.taskItemCardCompleted]}>
    <TouchableOpacity
      style={styles.taskCheckboxTouch}
      onPress={() => onToggle(task.id)}
      accessibilityLabel="Selesaikan Tugas"
      activeOpacity={0.7}
    >
      <Ionicons
        name={task.completed ? 'checkmark-circle' : 'square-outline'}
        size={24}
        color={task.completed ? COLORS.emerald : COLORS.textMuted}
      />
    </TouchableOpacity>

    <View style={styles.taskDetailsCol}>
      <Text
        style={[
          styles.taskTitle,
          task.completed && styles.taskTitleCompleted,
        ]}
        numberOfLines={2}
      >
        {task.title}
      </Text>
      <Text style={styles.taskCourseSubtitle} numberOfLines={1}>
        {task.courseName}
      </Text>
      {task.description ? (
        <Text style={styles.taskDescText} numberOfLines={1}>
          {task.description}
        </Text>
      ) : null}

      <View style={styles.taskMetaRow}>
        <Badge
          label={`Deadline: ${task.deadline}`}
          color={task.completed ? COLORS.textMuted : COLORS.rose}
          bg={task.completed ? COLORS.inputBackground : COLORS.roseLight}
          icon="calendar-outline"
        />
        <Badge
          label={`Prioritas: ${task.priority}`}
          color={
            task.priority === 'Tinggi'
              ? COLORS.rose
              : task.priority === 'Sedang'
                ? COLORS.amber
                : COLORS.emerald
          }
          bg={
            task.priority === 'Tinggi'
              ? COLORS.roseLight
              : task.priority === 'Sedang'
                ? COLORS.amberLight
                : COLORS.emeraldLight
          }
        />
      </View>
    </View>

    <TouchableOpacity
      style={styles.taskDeleteTouch}
      onPress={() => onDelete(task.id)}
      accessibilityLabel="Hapus Tugas"
      activeOpacity={0.7}
    >
      <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  </View>
);

// =================================================================
// WEEK 6 – ANGGOTA 2: UI STATE COMPONENTS (Loading, Success, Error, Empty, Offline)
// =================================================================

/**
 * OfflineBanner:
 * Indikator di bagian atas layar ketika perangkat tidak terhubung ke jaringan
 * atau server XAMPP tidak dapat dijangkau. Menyediakan tombol "Coba Lagi".
 */
const OfflineBanner = ({ isOffline, onRetry, isRetrying }) => {
  if (!isOffline) return null;
  return (
    <View style={styles.offlineBannerContainer}>
      <Ionicons name="cloud-offline-outline" size={20} color="#D97706" />
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        <Text style={styles.offlineBannerTitle}>Mode Offline Aktif</Text>
        <Text style={styles.offlineBannerSubtitle}>
          Koneksi server terputus. Menampilkan data dari penyimpanan lokal perangkat.
        </Text>
      </View>
      {onRetry && (
        <TouchableOpacity
          style={styles.offlineRetryButton}
          onPress={onRetry}
          disabled={isRetrying}
          activeOpacity={0.7}
        >
          {isRetrying ? (
            <ActivityIndicator size="small" color="#D97706" />
          ) : (
            <Text style={styles.offlineRetryText}>Cek Ulang</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * ApiErrorCard:
 * Kondisi UI Error ketika request gagal, menampilkan pesan ramah pengguna
 * dan tombol "Coba Lagi" (Retry) untuk mengulang pengambilan data.
 */
const ApiErrorCard = ({ title = 'Gagal Memuat Data', message, onRetry, isRetrying }) => (
  <View style={styles.apiErrorCardContainer}>
    <View style={styles.apiErrorIconCircle}>
      <Ionicons name="alert-circle-outline" size={32} color={COLORS.rose} />
    </View>
    <Text style={styles.apiErrorTitle}>{title}</Text>
    <Text style={styles.apiErrorMessage}>{message}</Text>
    {onRetry && (
      <TouchableOpacity
        style={styles.apiErrorRetryButton}
        onPress={onRetry}
        disabled={isRetrying}
        activeOpacity={0.8}
      >
        {isRetrying ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="refresh-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.apiErrorRetryText}>Coba Lagi</Text>
          </>
        )}
      </TouchableOpacity>
    )}
  </View>
);

/**
 * InlineLoadingIndicator:
 * Kondisi UI Loading saat aplikasi sedang memproses atau mengambil data.
 */
const InlineLoadingIndicator = ({ message = 'Memuat data perkuliahan...' }) => (
  <View style={styles.inlineLoadingContainer}>
    <ActivityIndicator size="small" color={COLORS.primary} />
    <Text style={styles.inlineLoadingText}>{message}</Text>
  </View>
);

// Empty State View (Kondisi UI Empty: data kosong tetapi request berhasil)
const EmptyState = ({ title, subtitle, icon, actionText, onAction }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconCircle}>
      <Ionicons name={icon || 'folder-open-outline'} size={36} color={COLORS.primary} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySubtitle}>{subtitle}</Text>
    {actionText && (
      <TouchableOpacity style={styles.emptyActionButton} onPress={onAction} activeOpacity={0.8}>
        <Text style={styles.emptyActionText}>{actionText}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// =================================================================
// 4. MAIN INNER APP COMPONENT (INTEGRASI 3 ANGGOTA)
// =================================================================
function StudyMateApp() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Responsive flags
  const isSmallScreen = width < 360;
  const isTabletOrLandscape = width > 600;

  // Dynamic bottom padding to ensure zero bottom-nav overlap (Anggota 3)
  const bottomNavHeight = 58 + Math.max(insets.bottom, 8);
  const scrollContentPaddingBottom = bottomNavHeight + 16;

  // Stat card dynamic width
  const statCardWidth = useMemo(() => {
    if (isTabletOrLandscape) {
      return (width - 32 - 36) / 4; // 4 columns
    }
    return (width - 32 - 12) / 2; // 2 columns
  }, [width, isTabletOrLandscape]);

  // Navigation Tabs: 'Home' | 'Courses' | 'Materials' | 'Tasks' | 'Schedule'
  const [currentTab, setCurrentTab] = useState('Home');

  // =================================================================
  // SPRINT 04 – ANGGOTA 2: Authentication State
  // authScreen: 'login' | 'register'
  // isAuthenticated: apakah user sudah login via REST API
  // apiUser: data user dari backend (id, name, email)
  // =================================================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authScreen, setAuthScreen] = useState('login');
  const [apiUser, setApiUser] = useState(null);

  // Auth form fields
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  // Sprint 04 – Anggota 3: Protected API test state
  const [apiTestResult, setApiTestResult] = useState(null);
  const [isApiTesting, setIsApiTesting] = useState(false);

  // =================================================================
  // WEEK 6 – ANGGOTA 3: Offline Handling & Network Status State
  // =================================================================
  const [isOffline, setIsOffline] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // =================================================================
  // WEEK 6 – ANGGOTA 2: Feature-Level UI States (Loading, Error, Retry)
  // =================================================================
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState(null);

  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState(null);

  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState(null);

  // Core Data States
  const [courses, setCourses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [userProfile, setUserProfile] = useState({
    name: 'Ahmad Faiz Pratama',
    nim: '2201010199',
    major: 'Teknik Informatika - Semester 5',
    campus: 'Universitas Indonesia',
    studyStreakDays: 14,
  });

  // Loading & Filter States
  const [isLoading, setIsLoading] = useState(true);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL');
  const [selectedMeetingFilter, setSelectedMeetingFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Modals Visibility
  const [materialModalVisible, setMaterialModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [activeNotesMaterial, setActiveNotesMaterial] = useState(null);
  const [currentNoteText, setCurrentNoteText] = useState('');

  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [activeAiMaterial, setActiveAiMaterial] = useState(null);
  const [aiSubTab, setAiSubTab] = useState('summary');
  const [quizRevealedMap, setQuizRevealedMap] = useState({});

  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [isParsingSchedule, setIsParsingSchedule] = useState(false);

  const [notifModalVisible, setNotifModalVisible] = useState(false);

  // =================================================================
  // WEEK 7 – ANGGOTA 1 & 2: Smart Material Scanner States
  // =================================================================
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [viewingPhotoMaterial, setViewingPhotoMaterial] = useState(null);

  // =================================================================
  // 5. DATA PERSISTENCE & INITIALIZATION
  // Sprint 04 – Anggota 2: Session Recovery (restore token & user from SecureStore)
  // =================================================================
  // =================================================================
  // WEEK 6 – ANGGOTA 3: Real-Time Network & Offline Listener
  // =================================================================
  useEffect(() => {
    // 1. Subscribe ke NetInfo untuk deteksi konektivitas jaringan perangkat
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected || state.isInternetReachable === false;
      setIsOffline(offline);
      if (!offline) {
        // Ketika koneksi kembali, verifikasi keterjangkauan server XAMPP
        checkServerConnectivity();
      }
    });

    // 2. Inisialisasi data & pemulihan sesi aplikasi
    initializeApp();

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * checkServerConnectivity:
   * Menguji apakah server XAMPP API benar-benar dapat dijangkau
   * (karena terkoneksi Wi-Fi belum tentu server lokal aktif).
   */
  const checkServerConnectivity = async () => {
    setIsCheckingConnection(true);
    try {
      const result = await requestApi('/index.php', {
        method: 'GET',
        requiresAuth: false,
        timeoutMs: 4000,
      });
      setIsOffline(!result.ok);
      if (result.ok) {
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      }
      return result.ok;
    } catch {
      setIsOffline(true);
      return false;
    } finally {
      setIsCheckingConnection(false);
    }
  };

  /**
   * initializeApp:
   * BUG FIX Sprint 04:
   * - Tambahkan outer try-finally untuk MEMASTIKAN setIsLoading(false) selalu terpanggil
   * - Tambahkan timeout pada validasi backend saat startup
   * - Jika backend tidak bisa dijangkau saat startup, jangan hapus token –
   *   tampilkan login tapi pertahankan token di SecureStore untuk retry berikutnya
   */
  /**
   * initializeApp:
   * WEEK 6 UPGRADE – Offline Session Preservation
   * Jika server sedang offline saat aplikasi dibuka, pertahankan data sesi lokal
   * sehingga pengguna tetap dapat membuka aplikasi dan membaca materi offline!
   */
  const initializeApp = async () => {
    try {
      let storedToken = null;
      let storedUser = null;
      try {
        [storedToken, storedUser] = await Promise.all([
          getAccessToken(),
          getUserData(),
        ]);
      } catch (secureStoreErr) {
        console.warn('[Init] SecureStore read error:', secureStoreErr.message);
      }

      if (storedToken && storedUser) {
        // Coba validasi token ke backend
        const result = await requestApi('/users/me.php', {
          method: 'GET',
          requiresAuth: true,
          timeoutMs: 5000,
        });

        if (result.ok && result.data && result.data.success) {
          // Token valid & online
          setIsAuthenticated(true);
          setApiUser(result.data.user);
          setIsOffline(false);
          setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
          await loadAllData();
          return;
        } else if (result.status === 401) {
          // Token terbukti tidak valid (401 Unauthorized) – bersihkan sesi
          console.warn('[Init] Token kadaluwarsa/tidak valid (401), hapus sesi.');
          await deleteAccessToken().catch(() => { });
          await deleteUserData().catch(() => { });
        } else {
          // Server offline atau timeout – TETAP izinkan akses offline menggunakan data lokal!
          console.warn('[Init] Server tidak terjangkau saat startup. Membuka mode offline.');
          setIsOffline(true);
          setIsAuthenticated(true);
          setApiUser(storedUser);
          await loadAllData();
          return;
        }
      }
    } catch (outerErr) {
      console.error('[Init] Error inisialisasi aplikasi:', outerErr.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const [storedCourses, storedMaterials, storedTasks, storedNotifs, storedSettings, storedProfile] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.COURSES),
          AsyncStorage.getItem(STORAGE_KEYS.MATERIALS),
          AsyncStorage.getItem(STORAGE_KEYS.TASKS),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
          AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
          AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
        ]);

      if (storedCourses) {
        setCourses(JSON.parse(storedCourses));
      } else {
        setCourses(INITIAL_COURSES);
        await AsyncStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(INITIAL_COURSES));
      }

      if (storedMaterials) {
        setMaterials(JSON.parse(storedMaterials));
      } else {
        setMaterials(INITIAL_MATERIALS);
        await AsyncStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(INITIAL_MATERIALS));
      }

      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      } else {
        setTasks(INITIAL_TASKS);
        await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
      }

      if (storedNotifs) {
        setNotifications(JSON.parse(storedNotifs));
      } else {
        setNotifications(INITIAL_NOTIFICATIONS);
        await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
      }

      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings({
          notifyBeforeClass: true,
          notifyDeadlines: true,
          autoSummarizeAi: true,
          shakeToRefresh: true,
          ...parsedSettings,
        });
      }
      if (storedProfile) setUserProfile(JSON.parse(storedProfile));
      setCoursesError(null);
      setMaterialsError(null);
      setTasksError(null);
    } catch (error) {
      console.error('Error loading StudyMate storage:', error);
    } finally {
      setIsLoading(false);
      setCoursesLoading(false);
      setMaterialsLoading(false);
      setTasksLoading(false);
    }
  };

  // =================================================================
  // WEEK 6 – ANGGOTA 2: Feature-Level Refresh & Retry Handlers
  // =================================================================

  /**
   * handleRefreshCourses:
   * Mengambil ulang mata kuliah dengan UI State (Loading -> Success/Error)
   */
  const handleRefreshCourses = async () => {
    setCoursesLoading(true);
    setCoursesError(null);
    try {
      // Cek konektivitas server
      const isOnline = await checkServerConnectivity();
      if (!isOnline) {
        // Tetap gunakan data tersimpan di AsyncStorage
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.COURSES);
        if (stored) setCourses(JSON.parse(stored));
        setCoursesError('Koneksi terputus. Data ditampilkan dari penyimpanan lokal perangkat.');
      } else {
        // Berhasil terhubung
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.COURSES);
        if (stored) setCourses(JSON.parse(stored));
        setCoursesError(null);
      }
    } catch (e) {
      setCoursesError('Gagal memuat mata kuliah: ' + e.message);
    } finally {
      setCoursesLoading(false);
    }
  };

  /**
   * handleRefreshMaterials:
   * Mengambil ulang materi perkuliahan dengan UI State
   */
  const handleRefreshMaterials = async () => {
    setMaterialsLoading(true);
    setMaterialsError(null);
    try {
      const isOnline = await checkServerConnectivity();
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.MATERIALS);
      if (stored) setMaterials(JSON.parse(stored));
      if (!isOnline) {
        setMaterialsError('Koneksi terputus. Data materi menggunakan cache offline.');
      }
    } catch (e) {
      setMaterialsError('Gagal memuat katalog materi: ' + e.message);
    } finally {
      setMaterialsLoading(false);
    }
  };

  /**
   * handleRefreshTasks:
   * Mengambil ulang tugas perkuliahan dengan UI State
   */
  const handleRefreshTasks = async () => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const isOnline = await checkServerConnectivity();
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      if (stored) setTasks(JSON.parse(stored));
      if (!isOnline) {
        setTasksError('Koneksi terputus. Menampilkan tugas dari penyimpanan lokal.');
      }
    } catch (e) {
      setTasksError('Gagal memuat daftar tugas: ' + e.message);
    } finally {
      setTasksLoading(false);
    }
  };

  const persistData = async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to persist to AsyncStorage:', key, e);
    }
  };

  // =================================================================
  // SPRINT 04 – ANGGOTA 2: AUTH HANDLERS (Register & Login via REST API)
  // =================================================================

  /**
   * handleApiRegister:
   * BUG FIX Sprint 04:
   * - Sebelumnya memanggil handleApiLogin() di dalam try-block → double isAuthLoading
   * - Sekarang register hanya mendaftarkan akun, lalu redirect ke Login
   * - Alur lebih aman: user login sendiri → token hanya diterbitkan via /auth/login.php
   */
  const handleApiRegister = async () => {
    // Cegah double submit
    if (isAuthLoading) return;
    setAuthError('');

    // Validasi input sisi client
    if (!authName.trim() || !authEmail.trim() || !authPassword) {
      setAuthError('Semua field wajib diisi.');
      return;
    }
    if (!authEmail.includes('@') || !authEmail.includes('.')) {
      setAuthError('Format email tidak valid.');
      return;
    }
    if (authPassword.length < 6) {
      setAuthError('Password minimal 6 karakter.');
      return;
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError('Password dan konfirmasi password tidak cocok.');
      return;
    }

    console.log('[REGISTER] Memulai registrasi untuk:', authEmail.trim().toLowerCase());
    console.log('[REGISTER] API_URL:', API_URL);
    setIsAuthLoading(true);
    try {
      const result = await apiPost('/auth/register.php', {
        name: authName.trim(),
        email: authEmail.trim().toLowerCase(),
        password: authPassword,
      });
      console.log('[REGISTER] Response:', JSON.stringify(result.data).substring(0, 150));

      if (result.ok && result.data.success) {
        // BUG FIX: Jangan panggil handleApiLogin() di sini (menyebabkan double loading state)
        // Tampilkan pesan sukses & arahkan ke Login agar user login sendiri
        setAuthError(''); // clear error
        Alert.alert(
          'Registrasi Berhasil! 🎉',
          'Akun berhasil dibuat. Silakan masuk menggunakan email dan password yang sudah didaftarkan.',
          [{
            text: 'Masuk Sekarang',
            onPress: () => {
              setAuthScreen('login');
              setAuthName('');
              setAuthConfirmPassword('');
              // Pertahankan email & password agar tidak perlu ketik ulang
            },
          }]
        );
      } else {
        setAuthError(result.data.message || 'Registrasi gagal. Coba lagi.');
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        setAuthError('Request timeout (10 detik). Periksa koneksi dan pastikan XAMPP berjalan.');
      } else {
        setAuthError(e.message || 'Tidak dapat terhubung ke server. Pastikan XAMPP berjalan dan IP sudah benar.');
      }
    } finally {
      // BUG FIX: finally SELALU mengembalikan loading ke false
      setIsAuthLoading(false);
    }
  };

  /**
   * handleApiLogin:
   * BUG FIX Sprint 04:
   * - Tambahkan guard: cegah double-submit jika sudah loading
   * - Tambahkan timeout message yang jelas
   * - Pisahkan penyimpanan SecureStore ke try-catch terpisah agar error SecureStore
   *   tidak menyebabkan loading stuck
   * - loadAllData() di-wrap agar error-nya tidak bubble ke catch utama
   */
  const handleApiLogin = async (emailOverride, passwordOverride) => {
    // Cegah double submit
    if (isAuthLoading) return;
    setAuthError('');

    const email = (emailOverride || authEmail).trim().toLowerCase();
    const password = passwordOverride || authPassword;

    if (!email || !password) {
      setAuthError('Email dan password wajib diisi.');
      return;
    }

    console.log('[LOGIN] Memulai login untuk:', email);
    console.log('[LOGIN] API_URL:', API_URL);
    setIsAuthLoading(true);
    try {
      // Step 1: Kirim kredensial ke backend PHP
      const result = await apiPost('/auth/login.php', { email, password });
      console.log('[LOGIN] Response:', JSON.stringify(result.data).substring(0, 150));

      if (result.ok && result.data.success) {
        const { access_token, user } = result.data;

        // Step 2: Simpan token & data ke SecureStore (wrap terpisah agar error tidak stuck)
        try {
          await saveAccessToken(access_token);
          await saveUserData(user);
        } catch (secureStoreErr) {
          console.warn('[Login] SecureStore error (non-fatal):', secureStoreErr.message);
          // Tetap lanjutkan login meskipun SecureStore gagal (sesi tidak persisten)
        }

        // Step 3: Update state autentikasi – ini yang membuka Dashboard
        setApiUser(user);
        setUserProfile((prev) => ({ ...prev, name: user.name }));
        setIsAuthenticated(true);
        // isAuthLoading akan di-false oleh finally sebelum loadAllData
      } else {
        setAuthError(result.data.message || 'Email atau password salah.');
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        setAuthError('Request timeout (10 detik). Periksa koneksi Wi-Fi dan pastikan XAMPP berjalan.');
      } else {
        setAuthError(e.message || 'Tidak dapat terhubung ke server. Pastikan API_URL sudah benar.');
      }
    } finally {
      // BUG FIX: selalu reset loading di sini – SEBELUM loadAllData agar UI tidak freeze
      setIsAuthLoading(false);
    }

    // Step 4: Muat data lokal – dipanggil tanpa await agar tidak blocking
    // (loadAllData menggunakan isLoading state tersendiri, bukan isAuthLoading)
    // Catatan: isAuthenticated masih false di sini karena setState bersifat async,
    // loadAllData() dipanggil langsung tanpa kondisi – sudah aman karena tidak
    // bergantung pada auth state, hanya membaca AsyncStorage.
    loadAllData().catch((e) => console.warn('[Login] loadAllData error:', e.message));
  };

  /**
   * handleApiLogout:
   * Sprint 04 – Anggota 3: Session Cleared
   * 1. Kirim POST /auth/logout.php agar token dicabut di server (stateful revocation).
   * 2. Hapus token & data user dari SecureStore.
   * 3. Reset state dan arahkan ke halaman login.
   */
  const handleApiLogout = async () => {
    Alert.alert(
      'Konfirmasi Logout',
      'Apakah kamu yakin ingin keluar dari StudyMate?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cabut token di server
              await apiPostAuth('/auth/logout.php');
            } catch (e) {
              console.warn('[Logout] Tidak bisa menghubungi server, tetap logout lokal.');
            }

            // Hapus token dari SecureStore (PENTING: dilakukan terlepas dari respons server)
            await deleteAccessToken();
            await deleteUserData();

            // Bersihkan seluruh state sesi
            setApiUser(null);
            setIsAuthenticated(false);
            setAuthScreen('login');
            setAuthEmail('');
            setAuthPassword('');
            setAuthName('');
            setAuthConfirmPassword('');
            setAuthError('');
            setApiTestResult(null);
          },
        },
      ]
    );
  };

  /**
   * handleTestProtectedApi:
   * Sprint 04 – Anggota 3: Test Authenticated Request ke GET /users/me.php
   * Membuktikan bahwa Authorization Header + Bearer Token berfungsi.
   */
  /**
   * handleTestProtectedApi:
   * Sprint 04 – Test Authenticated Request ke GET /users/me.php
   * Membuktikan bahwa Authorization Header + Bearer Token berfungsi.
   */
  const handleTestProtectedApi = async () => {
    setIsApiTesting(true);
    setApiTestResult(null);

    try {
      const result = await requestApi('/users/me.php', { method: 'GET', requiresAuth: true });
      setApiTestResult({
        success: result.ok,
        status: result.status,
        friendlyError: result.error,
        data: result.data || { error: result.error },
        isTimeout: result.isTimeout,
        isOffline: result.isOffline,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      });
    } catch (e) {
      setApiTestResult({
        success: false,
        status: 0,
        friendlyError: getFriendlyErrorMessage(0, null, 'NETWORK'),
        data: { message: e.message },
        timestamp: new Date().toLocaleTimeString('id-ID'),
      });
    } finally {
      setIsApiTesting(false);
    }
  };

  // =================================================================
  // 6. ACTION HANDLERS (MATERIAL, NOTES, AI, TASKS, SCHEDULE)
  // =================================================================
  const handleToggleMaterialStudied = async (materialId) => {
    const updated = materials.map((m) =>
      m.id === materialId ? { ...m, isStudied: !m.isStudied } : m
    );
    setMaterials(updated);
    await persistData(STORAGE_KEYS.MATERIALS, updated);
  };

  const handleDeleteMaterial = (materialId) => {
    Alert.alert('Hapus Materi', 'Apakah kamu yakin ingin menghapus materi perkuliahan ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const updated = materials.filter((m) => m.id !== materialId);
          setMaterials(updated);
          await persistData(STORAGE_KEYS.MATERIALS, updated);
          if (viewingPhotoMaterial && viewingPhotoMaterial.id === materialId) {
            setViewingPhotoMaterial(null);
          }
        },
      },
    ]);
  };

  const handleSaveMaterial = async (formData) => {
    let updated;
    const courseObj = courses.find((c) => c.id === formData.courseId) || courses[0];

    const generatedSummary =
      formData.summary ||
      `Ringkasan cerdas oleh StudyMate AI untuk mata kuliah ${courseObj.name} pada pertemuan ke-${formData.meetingNumber}. Mencakup fondasi teori, arsitektur, dan penerapan praktis untuk mendukung pembelajaran mandiri mahasiswa.`;

    const generatedKeyPoints = formData.keyPoints || [
      `Fokus utama topik adalah penguasaan ${formData.meetingTopic}.`,
      `Pahami implementasi dan pola penulisan kode pada materi pertemuan ke-${formData.meetingNumber}.`,
      'Gunakan catatan pribadi untuk mencatat penjelasan spesifik dari dosen pengampu.',
    ];

    const generatedQuiz = formData.quiz || [
      {
        question: `Apa konsep inti yang dibahas pada ${formData.title}?`,
        options: ['Pemahaman fondasi dan implementasi praktis', 'Hafalan tanpa latihan', 'Menunggu arahan asisten lab', 'Kompilasi tanpa pengujian'],
        correctIndex: 0,
        explanation: 'Pemahaman konsep dasar dan implementasi mandiri adalah kunci retensi materi kuliah jangka panjang.',
      },
    ];

    if (editingMaterial) {
      updated = materials.map((m) =>
        m.id === editingMaterial.id
          ? {
            ...m,
            ...formData,
            courseName: courseObj.name,
            summary: generatedSummary,
            keyPoints: generatedKeyPoints,
            quiz: generatedQuiz,
          }
          : m
      );
    } else {
      const newMaterial = {
        id: `mat_${Date.now()}`,
        ...formData,
        courseName: courseObj.name,
        dateAdded: new Date().toISOString().split('T')[0],
        isStudied: false,
        userNotes: '',
        summary: generatedSummary,
        keyPoints: generatedKeyPoints,
        quiz: generatedQuiz,
      };
      updated = [newMaterial, ...materials];
    }

    setMaterials(updated);
    await persistData(STORAGE_KEYS.MATERIALS, updated);
    setMaterialModalVisible(false);
    setEditingMaterial(null);
  };

  // =================================================================
  // 7. COMPUTED DATA & DASHBOARD STATS
  // =================================================================
  const totalMaterials = materials.length;
  const studiedMaterialsCount = materials.filter((m) => m.isStudied).length;
  const unstudiedMaterialsCount = totalMaterials - studiedMaterialsCount;
  const studyProgressPercent =
    totalMaterials > 0 ? Math.round((studiedMaterialsCount / totalMaterials) * 100) : 0;

  const activeTasksCount = tasks.filter((t) => !t.completed).length;
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      const query = materialSearchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.courseName.toLowerCase().includes(query) ||
        item.meetingTopic.toLowerCase().includes(query);

      const matchCourse =
        selectedCourseFilter === 'ALL' || item.courseId === selectedCourseFilter;

      const matchMeeting =
        selectedMeetingFilter === 'ALL' ||
        String(item.meetingNumber) === String(selectedMeetingFilter);

      const matchStatus =
        selectedStatusFilter === 'ALL' ||
        (selectedStatusFilter === 'STUDIED' && item.isStudied) ||
        (selectedStatusFilter === 'UNSTUDIED' && !item.isStudied);

      return matchSearch && matchCourse && matchMeeting && matchStatus;
    });
  }, [
    materials,
    materialSearchQuery,
    selectedCourseFilter,
    selectedMeetingFilter,
    selectedStatusFilter,
  ]);

  const todayCourse = useMemo(() => {
    const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const currentDay = daysMap[new Date().getDay()];
    const found = courses.find((c) => c.day.toLowerCase() === currentDay.toLowerCase());
    return found || courses[0];
  }, [courses]);

  const recommendedMaterial = useMemo(() => {
    if (!todayCourse) return materials[0];
    const unread = materials.find(
      (m) => m.courseId === todayCourse.id && !m.isStudied
    );
    return unread || materials.find((m) => m.courseId === todayCourse.id) || materials[0];
  }, [todayCourse, materials]);

  // =================================================================
  // 8. SCREEN RENDERERS WITH OPTIMAL SCROLLING & RESPONSIVENESS
  // =================================================================

  // =================================================================
  // SPRINT 04 – ANGGOTA 2: AUTH SCREENS (Login & Register)
  // Ditampilkan jika isAuthenticated === false
  // =================================================================
  const renderAuthScreen = () => {
    const isRegister = authScreen === 'register';

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Brand */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 8,
              }}
            >
              <Ionicons name="school" size={36} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 26, fontWeight: '900', color: COLORS.textPrimary }}>
              StudyMate
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
              Personal Study Material Organizer
            </Text>
          </View>

          {/* Card Auth */}
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: COLORS.cardBorder,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: COLORS.textPrimary,
                marginBottom: 4,
              }}
            >
              {isRegister ? 'Buat Akun Baru' : 'Selamat Datang Kembali 👋'}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: COLORS.textMuted,
                marginBottom: 20,
              }}
            >
              {isRegister
                ? 'Daftarkan akun mahasiswa untuk mulai belajar'
                : 'Masuk untuk melanjutkan belajarmu'}
            </Text>

            {/* Name (Register only) */}
            {isRegister && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 }}>
                  Nama Lengkap
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: COLORS.inputBackground,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: COLORS.cardBorder,
                    paddingHorizontal: 14,
                    height: 48,
                  }}
                >
                  <Ionicons name="person-outline" size={18} color={COLORS.textMuted} />
                  <TextInput
                    style={{
                      flex: 1,
                      marginLeft: 10,
                      fontSize: 15,
                      color: COLORS.textPrimary,
                    }}
                    placeholder="Nama lengkap kamu"
                    placeholderTextColor={COLORS.textMuted}
                    value={authName}
                    onChangeText={setAuthName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            {/* Email */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 }}>
                Email Mahasiswa
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: COLORS.inputBackground,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: COLORS.cardBorder,
                  paddingHorizontal: 14,
                  height: 48,
                }}
              >
                <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={{
                    flex: 1,
                    marginLeft: 10,
                    fontSize: 15,
                    color: COLORS.textPrimary,
                  }}
                  placeholder="email@kampus.ac.id"
                  placeholderTextColor={COLORS.textMuted}
                  value={authEmail}
                  onChangeText={setAuthEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={{ marginBottom: isRegister ? 14 : 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 }}>
                Password
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: COLORS.inputBackground,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: COLORS.cardBorder,
                  paddingHorizontal: 14,
                  height: 48,
                }}
              >
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={{
                    flex: 1,
                    marginLeft: 10,
                    fontSize: 15,
                    color: COLORS.textPrimary,
                  }}
                  placeholder="Minimal 6 karakter"
                  placeholderTextColor={COLORS.textMuted}
                  value={authPassword}
                  onChangeText={setAuthPassword}
                  secureTextEntry={!showAuthPassword}
                />
                <TouchableOpacity onPress={() => setShowAuthPassword((v) => !v)}>
                  <Ionicons
                    name={showAuthPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password (Register only) */}
            {isRegister && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 }}>
                  Konfirmasi Password
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: COLORS.inputBackground,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: COLORS.cardBorder,
                    paddingHorizontal: 14,
                    height: 48,
                  }}
                >
                  <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textMuted} />
                  <TextInput
                    style={{
                      flex: 1,
                      marginLeft: 10,
                      fontSize: 15,
                      color: COLORS.textPrimary,
                    }}
                    placeholder="Ulangi password"
                    placeholderTextColor={COLORS.textMuted}
                    value={authConfirmPassword}
                    onChangeText={setAuthConfirmPassword}
                    secureTextEntry
                  />
                </View>
              </View>
            )}

            {/* Error Message */}
            {!!authError && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  backgroundColor: COLORS.roseLight,
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: '#FECACA',
                }}
              >
                <Ionicons name="alert-circle-outline" size={16} color={COLORS.rose} style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, marginLeft: 8, fontSize: 13, color: COLORS.rose, fontWeight: '600' }}>
                  {authError}
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={{
                backgroundColor: isAuthLoading ? COLORS.textMuted : COLORS.primary,
                borderRadius: 14,
                height: 50,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              }}
              onPress={() => (isRegister ? handleApiRegister() : handleApiLogin())}
              disabled={isAuthLoading}
              activeOpacity={0.8}
            >
              {isAuthLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={isRegister ? 'person-add-outline' : 'log-in-outline'}
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginLeft: 8 }}>
                    {isRegister ? 'Daftar Sekarang' : 'Masuk ke StudyMate'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Switch Login/Register */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
            <Text style={{ fontSize: 14, color: COLORS.textMuted }}>
              {isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setAuthScreen(isRegister ? 'login' : 'register');
                setAuthError('');
                setAuthName('');
                setAuthPassword('');
                setAuthConfirmPassword('');
              }}
            >
              <Text style={{ fontSize: 14, color: COLORS.primary, fontWeight: '800' }}>
                {isRegister ? 'Login' : 'Daftar'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Note HTTPS */}
          <Text
            style={{
              fontSize: 10,
              color: COLORS.textMuted,
              textAlign: 'center',
              marginTop: 16,
              lineHeight: 15,
            }}
          >
            {'🔒'} Koneksi lokal menggunakan HTTP (pengembangan).{'\n'}
            Deploy produksi wajib menggunakan HTTPS.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  };

  // SCREEN 1: DASHBOARD AKTIVITAS BELAJAR (Anggota 1)
  const renderHomeScreen = () => (
    <ScrollView
      style={styles.screenContainer}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: scrollContentPaddingBottom },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader
        title="Dashboard Belajar"
        subtitle={`Semangat, ${userProfile.name.split(' ')[0]}! 🔥`}
        unreadCount={unreadNotifCount}
        onOpenNotif={() => setNotifModalVisible(true)}
        onOpenScheduleUpload={() => setScheduleModalVisible(true)}
      />

      {/* Week 6: Offline Banner */}
      <OfflineBanner
        isOffline={isOffline}
        onRetry={checkServerConnectivity}
        isRetrying={isCheckingConnection}
      />

      {/* Hero Progress Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroBannerContent}>
          <View style={styles.heroStreakRow}>
            <Ionicons name="flame" size={18} color="#F59E0B" />
            <Text style={styles.heroStreakText}>
              {userProfile.studyStreakDays} Hari Belajar Berturut-turut!
            </Text>
          </View>
          <Text style={styles.heroTitle}>Progres Semester Ini</Text>
          <Text style={styles.heroSubtitle}>
            {studiedMaterialsCount} dari {totalMaterials} materi telah kamu kuasai ({studyProgressPercent}%)
          </Text>

          <View style={styles.heroProgressBarBg}>
            <View
              style={[
                styles.heroProgressBarFill,
                { width: `${Math.min(100, Math.max(0, studyProgressPercent))}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Responsive Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Materi"
          value={totalMaterials}
          subtitle="Tersimpan di Cloud"
          icon="library-outline"
          iconColor={COLORS.primary}
          bgColor={COLORS.primaryLight}
          cardWidth={statCardWidth}
        />
        <StatCard
          title="Sudah Dibaca"
          value={studiedMaterialsCount}
          subtitle="Tuntas dipahami"
          icon="checkmark-done-circle-outline"
          iconColor={COLORS.emerald}
          bgColor={COLORS.emeraldLight}
          cardWidth={statCardWidth}
        />
        <StatCard
          title="Belum Dipelajari"
          value={unstudiedMaterialsCount}
          subtitle="Perlu di-review"
          icon="time-outline"
          iconColor={COLORS.amber}
          bgColor={COLORS.amberLight}
          cardWidth={statCardWidth}
        />
        <StatCard
          title="Tugas Aktif"
          value={activeTasksCount}
          subtitle="Perlu diselesaikan"
          icon="alarm-outline"
          iconColor={COLORS.rose}
          bgColor={COLORS.roseLight}
          cardWidth={statCardWidth}
        />
      </View>

      {/* Responsive Quick Action Bar */}
      <View style={styles.quickActionBar}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => {
            setEditingMaterial(null);
            setMaterialModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="cloud-upload" size={20} color={COLORS.primary} />
          </View>
          <Text style={[styles.quickActionLabel, isSmallScreen && { fontSize: 10 }]} numberOfLines={1}>
            Upload Materi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => setScheduleModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: COLORS.secondaryLight }]}>
            <Ionicons name="scan-outline" size={20} color={COLORS.secondary} />
          </View>
          <Text style={[styles.quickActionLabel, isSmallScreen && { fontSize: 10 }]} numberOfLines={1}>
            Upload Jadwal
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => {
            setEditingTask(null);
            setTaskModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: COLORS.amberLight }]}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.amber} />
          </View>
          <Text style={[styles.quickActionLabel, isSmallScreen && { fontSize: 10 }]} numberOfLines={1}>
            Tambah Tugas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => {
            if (materials.length > 0) handleOpenAiAssistant(materials[0]);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: COLORS.accentLight }]}>
            <Ionicons name="sparkles" size={20} color={COLORS.accent} />
          </View>
          <Text style={[styles.quickActionLabel, isSmallScreen && { fontSize: 10 }]} numberOfLines={1}>
            AI Assistant
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recommended Today's Study Section */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            Rekomendasi Belajar Hari Ini 🎯
          </Text>
          <Text style={styles.sectionSubtitle} numberOfLines={1}>
            Sesuai jadwal: {todayCourse?.name} ({todayCourse?.day})
          </Text>
        </View>
        <TouchableOpacity onPress={() => setCurrentTab('Materials')} activeOpacity={0.7}>
          <Text style={styles.sectionActionText}>Semua</Text>
        </TouchableOpacity>
      </View>

      {recommendedMaterial ? (
        <MaterialCard
          material={recommendedMaterial}
          onPress={(m) => handleOpenAiAssistant(m)}
          onToggleStudied={handleToggleMaterialStudied}
          onOpenAi={handleOpenAiAssistant}
          onOpenNotes={handleOpenNotes}
          onDelete={handleDeleteMaterial}
        />
      ) : (
        <EmptyState
          title="Belum ada materi untuk hari ini"
          subtitle="Tambahkan materi kuliah agar StudyMate dapat menghubungkan jadwalmu."
        />
      )}

      {/* Urgent Tasks Section */}
      <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            Tugas Mendekati Deadline ⏳
          </Text>
          <Text style={styles.sectionSubtitle} numberOfLines={1}>
            Kumpulkan sebelum batas waktu berakhir
          </Text>
        </View>
        <TouchableOpacity onPress={() => setCurrentTab('Tasks')} activeOpacity={0.7}>
          <Text style={styles.sectionActionText}>Semua</Text>
        </TouchableOpacity>
      </View>

      {tasks
        .filter((t) => !t.completed)
        .slice(0, 2)
        .map((t) => (
          <TaskItem
            key={t.id}
            task={t}
            onToggle={handleToggleTaskCompleted}
            onDelete={handleDeleteTask}
          />
        ))}

      {activeTasksCount === 0 && (
        <View style={styles.allClearCard}>
          <Ionicons name="checkmark-done-circle" size={32} color={COLORS.emerald} />
          <Text style={styles.allClearTitle}>Semua Tugas Tuntas!</Text>
          <Text style={styles.allClearSubtitle}>Kerja bagus! Waktunya me-review materi berikutnya.</Text>
        </View>
      )}
    </ScrollView>
  );

  // SCREEN 2: DAFTAR MATA KULIAH & DETAIL PERTEMUAN (Anggota 2)
  const renderCoursesScreen = () => (
    <ScrollView
      style={styles.screenContainer}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: scrollContentPaddingBottom },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader
        title="Mata Kuliah"
        subtitle="Semester Ganjil 2026/2027"
        unreadCount={unreadNotifCount}
        onOpenNotif={() => setNotifModalVisible(true)}
        onOpenScheduleUpload={() => setScheduleModalVisible(true)}
      />

      {/* Week 6: Offline Banner */}
      <OfflineBanner
        isOffline={isOffline}
        onRetry={handleRefreshCourses}
        isRetrying={coursesLoading || isCheckingConnection}
      />

      {/* Week 6: Error State dengan tombol Retry */}
      {coursesError && (
        <ApiErrorCard
          title="Koneksi Data Mata Kuliah"
          message={coursesError}
          onRetry={handleRefreshCourses}
          isRetrying={coursesLoading}
        />
      )}

      {/* Week 6: Loading State */}
      {coursesLoading && <InlineLoadingIndicator message="Memperbarui data mata kuliah..." />}

      <View style={styles.screenBannerRow}>
        <Text style={styles.screenBannerText}>
          Kelola materi perkuliahan berdasarkan mata kuliah dan pertemuan 1-16 secara terstruktur.
        </Text>
        <TouchableOpacity
          style={styles.primaryAddButton}
          onPress={() => {
            setEditingCourse(null);
            setCourseModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.primaryAddButtonText}>Tambah</Text>
        </TouchableOpacity>
      </View>

      {courses.map((course) => {
        const courseMaterials = materials.filter((m) => m.courseId === course.id);
        const studied = courseMaterials.filter((m) => m.isStudied).length;

        return (
          <CourseCard
            key={course.id}
            course={course}
            materialCount={courseMaterials.length}
            studiedCount={studied}
            onPress={() => {
              setSelectedCourseFilter(course.id);
              setCurrentTab('Materials');
            }}
          />
        );
      })}

      {courses.length === 0 && (
        <EmptyState
          title="Belum Ada Mata Kuliah"
          subtitle="Tambahkan mata kuliah atau unggah jadwal kuliah untuk membuat otomatis."
          actionText="+ Tambah Mata Kuliah"
          onAction={() => setCourseModalVisible(true)}
        />
      )}
    </ScrollView>
  );

  // SCREEN 3: KATALOG MATERI - SEARCH & FILTER (Anggota 2)
  const renderMaterialsScreen = () => {
    const meetingNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

    return (
      <View style={styles.screenContainer}>
        {/* Fixed Header & Search Section to maintain high performance */}
        <View style={styles.materialsHeaderWrapper}>
          <AppHeader
            title="Katalog Materi"
            subtitle="Organisasi per Matkul & Pertemuan"
            unreadCount={unreadNotifCount}
            onOpenNotif={() => setNotifModalVisible(true)}
            onOpenScheduleUpload={() => setScheduleModalVisible(true)}
          />

          {/* Week 6: Offline Banner */}
          <OfflineBanner
            isOffline={isOffline}
            onRetry={handleRefreshMaterials}
            isRetrying={materialsLoading || isCheckingConnection}
          />

          {/* Week 6: Error State */}
          {materialsError && (
            <ApiErrorCard
              title="Katalog Materi Perkuliahan"
              message={materialsError}
              onRetry={handleRefreshMaterials}
              isRetrying={materialsLoading}
            />
          )}

          {/* Week 6: Loading State */}
          {materialsLoading && <InlineLoadingIndicator message="Menyinkronkan materi perkuliahan..." />}

          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari modul, topik pertemuan, mata kuliah..."
              placeholderTextColor={COLORS.textMuted}
              value={materialSearchQuery}
              onChangeText={setMaterialSearchQuery}
            />
            {materialSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setMaterialSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Status Filter Chips */}
          <View style={styles.filterPillRow}>
            <TouchableOpacity
              style={[
                styles.statusFilterPill,
                selectedStatusFilter === 'ALL' && styles.statusFilterPillActive,
              ]}
              onPress={() => setSelectedStatusFilter('ALL')}
            >
              <Text
                style={[
                  styles.statusFilterText,
                  selectedStatusFilter === 'ALL' && styles.statusFilterTextActive,
                ]}
              >
                Semua ({materials.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusFilterPill,
                selectedStatusFilter === 'UNSTUDIED' && styles.statusFilterPillActive,
              ]}
              onPress={() => setSelectedStatusFilter('UNSTUDIED')}
            >
              <Text
                style={[
                  styles.statusFilterText,
                  selectedStatusFilter === 'UNSTUDIED' && styles.statusFilterTextActive,
                ]}
              >
                Belum Dibaca ({unstudiedMaterialsCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusFilterPill,
                selectedStatusFilter === 'STUDIED' && styles.statusFilterPillActive,
              ]}
              onPress={() => setSelectedStatusFilter('STUDIED')}
            >
              <Text
                style={[
                  styles.statusFilterText,
                  selectedStatusFilter === 'STUDIED' && styles.statusFilterTextActive,
                ]}
              >
                Selesai ({studiedMaterialsCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Horizontal Course Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalFilterScroll}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            <TouchableOpacity
              style={[
                styles.courseFilterChip,
                selectedCourseFilter === 'ALL' && styles.courseFilterChipActive,
              ]}
              onPress={() => setSelectedCourseFilter('ALL')}
            >
              <Text
                style={[
                  styles.courseFilterChipText,
                  selectedCourseFilter === 'ALL' && styles.courseFilterChipTextActive,
                ]}
              >
                Semua Matkul
              </Text>
            </TouchableOpacity>

            {courses.map((crs) => (
              <TouchableOpacity
                key={crs.id}
                style={[
                  styles.courseFilterChip,
                  selectedCourseFilter === crs.id && styles.courseFilterChipActive,
                  selectedCourseFilter === crs.id && { backgroundColor: crs.color },
                ]}
                onPress={() => setSelectedCourseFilter(crs.id)}
              >
                <Text
                  style={[
                    styles.courseFilterChipText,
                    selectedCourseFilter === crs.id && styles.courseFilterChipTextActive,
                  ]}
                >
                  {crs.code}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Horizontal Meeting Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.meetingFilterScroll}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            <TouchableOpacity
              style={[
                styles.meetingFilterChip,
                selectedMeetingFilter === 'ALL' && styles.meetingFilterChipActive,
              ]}
              onPress={() => setSelectedMeetingFilter('ALL')}
            >
              <Text
                style={[
                  styles.meetingFilterChipText,
                  selectedMeetingFilter === 'ALL' && styles.meetingFilterChipTextActive,
                ]}
              >
                Semua Pertemuan
              </Text>
            </TouchableOpacity>
            {meetingNumbers.slice(0, 8).map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.meetingFilterChip,
                  selectedMeetingFilter === String(num) && styles.meetingFilterChipActive,
                ]}
                onPress={() => setSelectedMeetingFilter(String(num))}
              >
                <Text
                  style={[
                    styles.meetingFilterChipText,
                    selectedMeetingFilter === String(num) && styles.meetingFilterChipTextActive,
                  ]}
                >
                  Pertemuan {num}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Scrollable Materials List with bottom padding */}
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 16 }}
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: scrollContentPaddingBottom,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.listHeaderRow}>
            <Text style={styles.listCountText}>
              Menampilkan {filteredMaterials.length} materi
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* WEEK 7 – ANGGOTA 1 & 2: Tombol Scan Materi Kamera HP */}
              <TouchableOpacity
                style={styles.scanMaterialBtn}
                onPress={() => setIsScannerVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={15} color="#FFFFFF" />
                <Text style={styles.scanMaterialBtnText}>Scan Materi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addMaterialSmallBtn}
                onPress={() => {
                  setEditingMaterial(null);
                  setMaterialModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload" size={14} color="#FFFFFF" />
                <Text style={styles.addMaterialSmallBtnText}>Upload</Text>
              </TouchableOpacity>
            </View>
          </View>

          {filteredMaterials.map((item) => (
            <MaterialCard
              key={item.id}
              material={item}
              onPress={(m) => handleOpenAiAssistant(m)}
              onToggleStudied={handleToggleMaterialStudied}
              onOpenAi={handleOpenAiAssistant}
              onOpenNotes={handleOpenNotes}
              onDelete={handleDeleteMaterial}
              onPreviewImage={(m) => setViewingPhotoMaterial(m)}
            />
          ))}

          {filteredMaterials.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: 32, paddingHorizontal: 20 }}>
              <Ionicons name="document-text-outline" size={52} color={COLORS.textMuted} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 12 }}>
                Tidak ada materi yang cocok
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 18 }}>
                Pindai papan tulis / slide dosen menggunakan kamera HP atau unggah berkas materi baru.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.scanMaterialBtn, { paddingHorizontal: 16, paddingVertical: 10 }]}
                  onPress={() => setIsScannerVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                  <Text style={[styles.scanMaterialBtnText, { fontSize: 13 }]}>Scan Materi HP</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addMaterialSmallBtn, { paddingHorizontal: 16, paddingVertical: 10 }]}
                  onPress={() => {
                    setEditingMaterial(null);
                    setMaterialModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
                  <Text style={[styles.addMaterialSmallBtnText, { fontSize: 13 }]}>Upload Berkas</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  // SCREEN 4: PENGELOLAAN TUGAS DAN DEADLINE (Anggota 2)
  const renderTasksScreen = () => {
    const activeTasks = tasks.filter((t) => !t.completed);
    const completedTasks = tasks.filter((t) => t.completed);

    return (
      <ScrollView
        style={styles.screenContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollContentPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title="Tugas & Deadline"
          subtitle="Pantau Target Akademik"
          unreadCount={unreadNotifCount}
          onOpenNotif={() => setNotifModalVisible(true)}
          onOpenScheduleUpload={() => setScheduleModalVisible(true)}
        />

        {/* Week 6: Offline Banner */}
        <OfflineBanner
          isOffline={isOffline}
          onRetry={handleRefreshTasks}
          isRetrying={tasksLoading || isCheckingConnection}
        />

        {/* Week 6: Error State dengan tombol Retry */}
        {tasksError && (
          <ApiErrorCard
            title="Daftar Tugas & Deadline"
            message={tasksError}
            onRetry={handleRefreshTasks}
            isRetrying={tasksLoading}
          />
        )}

        {/* Week 6: Loading State */}
        {tasksLoading && <InlineLoadingIndicator message="Memuat daftar tugas..." />}

        <View style={styles.screenBannerRow}>
          <Text style={styles.screenBannerText}>
            Jangan biarkan tugas terlewat. Setiap tugas terhubung langsung dengan mata kuliah.
          </Text>
          <TouchableOpacity
            style={styles.primaryAddButton}
            onPress={() => {
              setEditingTask(null);
              setTaskModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.primaryAddButtonText}>Tambah</Text>
          </TouchableOpacity>
        </View>

        {/* Section Aktif */}
        <Text style={[styles.sectionTitle, { marginTop: 12, marginBottom: 8 }]}>
          Tugas Aktif ({activeTasks.length})
        </Text>

        {activeTasks.map((t) => (
          <TaskItem
            key={t.id}
            task={t}
            onToggle={handleToggleTaskCompleted}
            onDelete={handleDeleteTask}
          />
        ))}

        {activeTasks.length === 0 && (
          <View style={styles.allClearCard}>
            <Ionicons name="checkmark-done-circle" size={32} color={COLORS.emerald} />
            <Text style={styles.allClearTitle}>Tidak Ada Tugas Tertunda</Text>
            <Text style={styles.allClearSubtitle}>Semua deadline telah berhasil kamu selesaikan!</Text>
          </View>
        )}

        {/* Section Selesai */}
        {completedTasks.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 22, marginBottom: 8 }]}>
              Sudah Selesai ({completedTasks.length})
            </Text>
            {completedTasks.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onToggle={handleToggleTaskCompleted}
                onDelete={handleDeleteTask}
              />
            ))}
          </>
        )}
      </ScrollView>
    );
  };

  // SCREEN 5: JADWAL KULIAH, PENGATURAN & PROFIL (Anggota 2 & 3)
  const renderScheduleProfileScreen = () => (
    <ScrollView
      style={styles.screenContainer}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: scrollContentPaddingBottom },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader
        title="Jadwal & Profil"
        subtitle="Sinkronisasi & Pengaturan"
        unreadCount={unreadNotifCount}
        onOpenNotif={() => setNotifModalVisible(true)}
      />

      {/* Profil Mahasiswa Card */}
      <View style={styles.profileHeroCard}>
        <View style={styles.profileAvatarBox}>
          <Text style={styles.profileAvatarInitials}>
            {userProfile.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')}
          </Text>
        </View>
        <View style={styles.profileInfoCol}>
          <Text style={styles.profileNameText} numberOfLines={1}>
            {userProfile.name}
          </Text>
          <Text style={styles.profileNimText}>NIM: {userProfile.nim}</Text>
          <Text style={styles.profileMajorText} numberOfLines={1}>
            {userProfile.major}
          </Text>
          <Text style={styles.profileCampusText} numberOfLines={1}>
            {userProfile.campus}
          </Text>
        </View>
      </View>

      {/* Upload Jadwal Support Card */}
      <View style={styles.scheduleUploadCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={styles.scheduleIconCircle}>
            <Ionicons name="document-attach" size={22} color={COLORS.primary} />
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.scheduleUploadTitle}>Upload Jadwal Kuliah (PDF / Screenshot)</Text>
            <Text style={styles.scheduleUploadDesc}>
              Jadwal kuliah digunakan sebagai pendukung untuk menghubungkan materi dengan aktivitas belajar harian.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.uploadScheduleButton}
          onPress={() => setScheduleModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
          <Text style={styles.uploadScheduleButtonText}>Unggah Jadwal KRS</Text>
        </TouchableOpacity>
      </View>

      {/* Jadwal Kuliah Mingguan Preview */}
      <Text style={[styles.sectionTitle, { marginTop: 18, marginBottom: 10 }]}>
        Jadwal Kuliah Mingguan 📅
      </Text>

      {courses.map((crs) => (
        <View key={crs.id} style={styles.scheduleItemRow}>
          <View style={[styles.scheduleDayBadge, { backgroundColor: crs.color }]}>
            <Text style={styles.scheduleDayText}>{crs.day}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.scheduleCourseName} numberOfLines={1}>
              {crs.name}
            </Text>
            <Text style={styles.scheduleTimeRoom} numberOfLines={1}>
              ⏰ {crs.time} • 📍 {crs.room}
            </Text>
          </View>
          <Badge label={`${crs.sks} SKS`} color={crs.color} bg={crs.color + '18'} />
        </View>
      ))}

      {/* Pengaturan Notifikasi */}
      <Text style={[styles.sectionTitle, { marginTop: 22, marginBottom: 10 }]}>
        Preferensi Notifikasi & AI ⚙️
      </Text>

      <View style={styles.settingsContainer}>
        <View style={styles.settingRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.settingLabel}>Pengingat Materi Sebelum Kuliah</Text>
            <Text style={styles.settingDesc}>Notifikasi materi yang belum dipelajari sebelum jam kelas.</Text>
          </View>
          <Switch
            value={settings.notifyBeforeClass}
            onValueChange={(val) => {
              const updated = { ...settings, notifyBeforeClass: val };
              setSettings(updated);
              persistData(STORAGE_KEYS.SETTINGS, updated);
            }}
            trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
          />
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.settingRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.settingLabel}>Peringatan Deadline Tugas H-1</Text>
            <Text style={styles.settingDesc}>Ingatkan otomatis sebelum deadline tugas berakhir.</Text>
          </View>
          <Switch
            value={settings.notifyDeadlines}
            onValueChange={(val) => {
              const updated = { ...settings, notifyDeadlines: val };
              setSettings(updated);
              persistData(STORAGE_KEYS.SETTINGS, updated);
            }}
            trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
          />
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.settingRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.settingLabel}>Auto-Generate Ringkasan AI</Text>
            <Text style={styles.settingDesc}>Otomatis ekstrak poin penting saat mengunggah materi baru.</Text>
          </View>
          <Switch
            value={settings.autoSummarizeAi}
            onValueChange={(val) => {
              const updated = { ...settings, autoSummarizeAi: val };
              setSettings(updated);
              persistData(STORAGE_KEYS.SETTINGS, updated);
            }}
            trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
          />
        </View>

        <View style={styles.settingDivider} />

      </View>

      {/* ================================================================= */}
      {/* SPRINT 04 – ANGGOTA 3: Authenticated User Info & Protected API Test */}
      {/* ================================================================= */}
      {isAuthenticated && apiUser && (
        <View
          style={{
            marginHorizontal: 0,
            marginTop: 20,
            backgroundColor: COLORS.primaryLight,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: '#C7D2FE',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.primary, marginLeft: 8 }}>
              Sesi Terautentikasi
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 }}>
            Nama: <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>{apiUser.name}</Text>
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 }}>
            Email: <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>{apiUser.email}</Text>
          </Text>
          <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>
            Token tersimpan di Expo SecureStore (terenkripsi)
          </Text>

          {/* Sprint 04 – Tombol Test Protected API */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.primary,
              borderRadius: 10,
              paddingVertical: 10,
              marginTop: 12,
            }}
            onPress={handleTestProtectedApi}
            disabled={isApiTesting}
            activeOpacity={0.8}
          >
            {isApiTesting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="shield-checkmark-outline" size={16} color="#FFFFFF" />
            )}
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 8 }}>
              {isApiTesting ? 'Menguji...' : 'Test Protected API (GET /users/me.php)'}
            </Text>
          </TouchableOpacity>

          {/* Test Result */}
          {apiTestResult && (
            <View
              style={{
                marginTop: 10,
                backgroundColor: apiTestResult.success ? COLORS.emeraldLight : COLORS.roseLight,
                borderRadius: 10,
                padding: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons
                  name={apiTestResult.success ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={apiTestResult.success ? COLORS.emerald : COLORS.rose}
                />
                <Text
                  style={{
                    marginLeft: 6,
                    fontSize: 12,
                    fontWeight: '800',
                    color: apiTestResult.success ? COLORS.emerald : COLORS.rose,
                  }}
                >
                  HTTP {apiTestResult.status} {apiTestResult.success ? '– 200 OK' : '– Error'}
                  {'  '}\u2022 {apiTestResult.timestamp}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: COLORS.textSecondary, fontFamily: 'monospace' }}>
                {JSON.stringify(apiTestResult.data, null, 2).substring(0, 200)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Logout Button */}
      {isAuthenticated && (
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: COLORS.roseLight,
            borderRadius: 14,
            paddingVertical: 14,
            marginTop: 20,
            borderWidth: 1,
            borderColor: '#FECACA',
          }}
          onPress={handleApiLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.rose} />
          <Text style={{ color: COLORS.rose, fontSize: 15, fontWeight: '800', marginLeft: 8 }}>
            Logout dari StudyMate
          </Text>
        </TouchableOpacity>
      )}

    </ScrollView>
  );

  // =================================================================
  // 9. MODALS WITH SAFE AREA INTEGRATION (Anggota 2 & 3)
  // =================================================================

  // MODAL 1: STUDYMATE AI ASSISTANT
  const renderAiModal = () => {
    if (!activeAiMaterial) return null;

    return (
      <Modal
        visible={aiModalVisible}
        animationType="slide"
        onRequestClose={() => setAiModalVisible(false)}
      >
        <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <View style={styles.aiBadgeIcon}>
                <Ionicons name="sparkles" size={17} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle}>StudyMate AI Assistant</Text>
                <Text style={styles.modalHeaderSubtitle} numberOfLines={1}>
                  {activeAiMaterial.title}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setAiModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* AI Sub-Tabs */}
          <View style={styles.aiTabContainer}>
            <TouchableOpacity
              style={[styles.aiTabButton, aiSubTab === 'summary' && styles.aiTabButtonActive]}
              onPress={() => setAiSubTab('summary')}
            >
              <Ionicons
                name="document-text-outline"
                size={15}
                color={aiSubTab === 'summary' ? COLORS.primary : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.aiTabText,
                  aiSubTab === 'summary' && styles.aiTabTextActive,
                ]}
              >
                Ringkasan Cerdas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.aiTabButton, aiSubTab === 'points' && styles.aiTabButtonActive]}
              onPress={() => setAiSubTab('points')}
            >
              <Ionicons
                name="bulb-outline"
                size={15}
                color={aiSubTab === 'points' ? COLORS.primary : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.aiTabText,
                  aiSubTab === 'points' && styles.aiTabTextActive,
                ]}
              >
                Poin Penting
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.aiTabButton, aiSubTab === 'quiz' && styles.aiTabButtonActive]}
              onPress={() => setAiSubTab('quiz')}
            >
              <Ionicons
                name="help-circle-outline"
                size={15}
                color={aiSubTab === 'quiz' ? COLORS.primary : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.aiTabText,
                  aiSubTab === 'quiz' && styles.aiTabTextActive,
                ]}
              >
                Latihan Soal
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollBody}
            contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
            showsVerticalScrollIndicator={false}
          >
            {aiSubTab === 'summary' && (
              <View style={styles.aiContentCard}>
                <View style={styles.aiBannerPill}>
                  <Ionicons name="time-outline" size={13} color="#7C3AED" />
                  <Text style={styles.aiBannerPillText}>Waktu baca: ~3 Menit</Text>
                </View>
                <Text style={styles.aiSummaryTitle}>Intisari Materi Perkuliahan</Text>
                <Text style={styles.aiSummaryParagraph}>{activeAiMaterial.summary}</Text>

                <View style={styles.aiNoteCallout}>
                  <Ionicons name="information-circle" size={18} color={COLORS.primary} />
                  <Text style={styles.aiNoteCalloutText}>
                    Ringkasan dirancang agar mahasiswa cepat memahami konsep kunci sebelum kelas dimulai.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.aiShareButton}
                  onPress={() =>
                    Share.share({
                      message: `Ringkasan StudyMate AI:\n${activeAiMaterial.title}\n\n${activeAiMaterial.summary}`,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.aiShareButtonText}>Bagikan Ringkasan</Text>
                </TouchableOpacity>
              </View>
            )}

            {aiSubTab === 'points' && (
              <View style={styles.aiContentCard}>
                <Text style={styles.aiSummaryTitle}>Konsep Kunci & Rumus Inti</Text>
                <Text style={styles.aiSectionSubtitle}>
                  Fokus pada poin-poin berikut untuk persiapan ujian atau kuis dosen:
                </Text>

                {activeAiMaterial.keyPoints?.map((point, idx) => (
                  <View key={idx} style={styles.keyPointRow}>
                    <View style={styles.keyPointBullet}>
                      <Text style={styles.keyPointBulletText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.keyPointContent}>{point}</Text>
                  </View>
                ))}
              </View>
            )}

            {aiSubTab === 'quiz' && (
              <View style={styles.aiContentCard}>
                <Text style={styles.aiSummaryTitle}>Uji Pemahaman Mandiri</Text>
                <Text style={styles.aiSectionSubtitle}>
                  Jawab pertanyaan latihan berikut untuk menguji pemahaman konsep:
                </Text>

                {activeAiMaterial.quiz?.map((q, qIndex) => {
                  const isRevealed = !!quizRevealedMap[qIndex];

                  return (
                    <View key={qIndex} style={styles.quizCard}>
                      <Text style={styles.quizQuestionText}>
                        {qIndex + 1}. {q.question}
                      </Text>

                      {q.options.map((opt, optIndex) => (
                        <View
                          key={optIndex}
                          style={[
                            styles.quizOptionBox,
                            isRevealed &&
                            optIndex === q.correctIndex &&
                            styles.quizOptionCorrect,
                          ]}
                        >
                          <Text
                            style={[
                              styles.quizOptionLetter,
                              isRevealed &&
                              optIndex === q.correctIndex &&
                              styles.quizOptionLetterCorrect,
                            ]}
                          >
                            {String.fromCharCode(65 + optIndex)}
                          </Text>
                          <Text
                            style={[
                              styles.quizOptionLabel,
                              isRevealed &&
                              optIndex === q.correctIndex &&
                              styles.quizOptionLabelCorrect,
                            ]}
                          >
                            {opt}
                          </Text>
                        </View>
                      ))}

                      <TouchableOpacity
                        style={styles.quizRevealButton}
                        onPress={() =>
                          setQuizRevealedMap((prev) => ({
                            ...prev,
                            [qIndex]: !prev[qIndex],
                          }))
                        }
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isRevealed ? 'eye-off-outline' : 'eye-outline'}
                          size={16}
                          color={COLORS.primary}
                        />
                        <Text style={styles.quizRevealButtonText}>
                          {isRevealed
                            ? 'Sembunyikan Pembahasan'
                            : 'Lihat Kunci Jawaban & Pembahasan'}
                        </Text>
                      </TouchableOpacity>

                      {isRevealed && (
                        <View style={styles.quizExplanationBox}>
                          <Text style={styles.quizExplanationTitle}>💡 Penjelasan AI:</Text>
                          <Text style={styles.quizExplanationText}>{q.explanation}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // MODAL 2: CATATAN PRIBADI PER MATERI
  const renderNotesModal = () => {
    if (!activeNotesMaterial) return null;

    return (
      <Modal
        visible={notesModalVisible}
        animationType="slide"
        onRequestClose={() => setNotesModalVisible(false)}
      >
        <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalHeaderTitle}>Catatan Pribadi</Text>
              <Text style={styles.modalHeaderSubtitle} numberOfLines={1}>
                {activeNotesMaterial.title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setNotesModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.notesContainer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
            <Text style={styles.notesInstructionText}>
              Tulis rangkuman pribadi, hal-hal penting yang disampaikan dosen saat kelas, atau rumus yang perlu diingat:
            </Text>

            <TextInput
              style={styles.notesTextInput}
              multiline
              textAlignVertical="top"
              placeholder="Ketik catatan pribadimu di sini..."
              placeholderTextColor={COLORS.textMuted}
              value={currentNoteText}
              onChangeText={setCurrentNoteText}
            />

            <TouchableOpacity
              style={styles.saveNotesButton}
              onPress={handleSaveNotes}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
              <Text style={styles.saveNotesButtonText}>Simpan Catatan</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  // MODAL 3: UPLOAD JADWAL MODAL
  const renderScheduleModal = () => (
    <Modal
      visible={scheduleModalVisible}
      animationType="fade"
      transparent
      onRequestClose={() => setScheduleModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.scheduleModalBox}>
          <View style={styles.scheduleModalHeader}>
            <Ionicons name="calendar" size={24} color={COLORS.primary} />
            <Text style={styles.scheduleModalTitle}>Upload Jadwal Kuliah</Text>
          </View>

          <Text style={styles.scheduleModalSubtitle}>
            Unggah foto screenshot KRS atau berkas PDF jadwal. StudyMate akan otomatis mendeteksi jadwal untuk mengorganisasi materi belajarmu.
          </Text>

          {isParsingSchedule ? (
            <View style={styles.parsingIndicatorBox}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.parsingStatusText}>
                Memindai dokumen & menyelaraskan jadwal...
              </Text>
            </View>
          ) : (
            <View style={styles.uploadOptionsRow}>
              <TouchableOpacity
                style={styles.uploadOptionBtn}
                onPress={handlePickScheduleImage}
                activeOpacity={0.7}
              >
                <Ionicons name="image-outline" size={30} color={COLORS.secondary} />
                <Text style={styles.uploadOptionBtnTitle}>Screenshot Foto</Text>
                <Text style={styles.uploadOptionBtnSub}>Dari Galeri / Kamera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadOptionBtn}
                onPress={handlePickScheduleDocument}
                activeOpacity={0.7}
              >
                <Ionicons name="document-text-outline" size={30} color={COLORS.primary} />
                <Text style={styles.uploadOptionBtnTitle}>File Berkas PDF</Text>
                <Text style={styles.uploadOptionBtnSub}>Pilih Berkas KRS</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.scheduleCancelBtn}
            onPress={() => setScheduleModalVisible(false)}
          >
            <Text style={styles.scheduleCancelBtnText}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // MODAL 4: PUSAT NOTIFIKASI
  const renderNotificationModal = () => (
    <Modal
      visible={notifModalVisible}
      animationType="slide"
      onRequestClose={() => setNotifModalVisible(false)}
    >
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.modalSafeArea}>
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalHeaderTitle}>Pusat Notifikasi</Text>
            <Text style={styles.modalHeaderSubtitle}>Pengingat Materi & Deadline</Text>
          </View>
          <TouchableOpacity
            onPress={() => setNotifModalVisible(false)}
            style={styles.modalCloseButton}
          >
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalScrollBody}
          contentContainerStyle={{ paddingBottom: 30 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          {notifications.map((n) => (
            <View key={n.id} style={[styles.notifCard, !n.read && styles.notifCardUnread]}>
              <View
                style={[
                  styles.notifIconCircle,
                  {
                    backgroundColor:
                      n.type === 'class'
                        ? COLORS.primaryLight
                        : n.type === 'material'
                          ? COLORS.amberLight
                          : COLORS.roseLight,
                  },
                ]}
              >
                <Ionicons
                  name={
                    n.type === 'class'
                      ? 'school-outline'
                      : n.type === 'material'
                        ? 'book-outline'
                        : 'alarm-outline'
                  }
                  size={18}
                  color={
                    n.type === 'class'
                      ? COLORS.primary
                      : n.type === 'material'
                        ? COLORS.amber
                        : COLORS.rose
                  }
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.notifItemTitle}>{n.title}</Text>
                  <Text style={styles.notifItemTime}>{n.time}</Text>
                </View>
                <Text style={styles.notifItemMsg}>{n.message}</Text>
              </View>
            </View>
          ))}

          {notifications.length === 0 && (
            <EmptyState
              title="Belum Ada Notifikasi"
              subtitle="Notifikasi jadwal dan pengingat materi akan tampil di sini."
            />
          )}

          <TouchableOpacity
            style={styles.markAllReadBtn}
            onPress={async () => {
              const updated = notifications.map((n) => ({ ...n, read: true }));
              setNotifications(updated);
              await persistData(STORAGE_KEYS.NOTIFICATIONS, updated);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-done" size={16} color={COLORS.primary} />
            <Text style={styles.markAllReadBtnText}>Tandai Semua Sudah Dibaca</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // =================================================================
  // 10. BOTTOM NAVIGATION BAR (Anggota 3)
  // =================================================================
  const renderBottomNav = () => {
    const tabs = [
      { id: 'Home', label: 'Beranda', iconActive: 'home', iconInactive: 'home-outline' },
      { id: 'Courses', label: 'Matkul', iconActive: 'book', iconInactive: 'book-outline' },
      { id: 'Materials', label: 'Materi', iconActive: 'folder', iconInactive: 'folder-outline' },
      { id: 'Tasks', label: 'Tugas', iconActive: 'checkbox', iconInactive: 'checkbox-outline' },
      { id: 'Schedule', label: 'Jadwal', iconActive: 'calendar', iconInactive: 'calendar-outline' },
    ];

    return (
      <View
        style={[
          styles.bottomNavContainer,
          {
            paddingBottom: Math.max(insets.bottom, 8),
            height: 58 + Math.max(insets.bottom, 8),
          },
        ]}
      >
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.bottomNavItem}
              onPress={() => setCurrentTab(tab.id)}
              accessibilityLabel={`Menu ${tab.label}`}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? tab.iconActive : tab.iconInactive}
                size={22}
                color={isActive ? COLORS.primary : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.bottomNavLabel,
                  isActive && styles.bottomNavLabelActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
              {isActive && <View style={styles.bottomNavActiveDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Loading Screen Fallback
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screenContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontWeight: '600' }}>
          Menyiapkan StudyMate...
        </Text>
      </SafeAreaView>
    );
  }

  // Sprint 04 – Anggota 2: Tampilkan halaman Auth jika belum login via API
  if (!isAuthenticated) {
    return renderAuthScreen();
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeAreaContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.mainContentFlex}>
        {currentTab === 'Home' && renderHomeScreen()}
        {currentTab === 'Courses' && renderCoursesScreen()}
        {currentTab === 'Materials' && renderMaterialsScreen()}
        {currentTab === 'Tasks' && renderTasksScreen()}
        {currentTab === 'Schedule' && renderScheduleProfileScreen()}
      </View>

      {/* Persistent Bottom Navigation with Safe Area Padding */}
      {renderBottomNav()}

      {/* All Sub-Modals */}
      <MaterialFormModal
        visible={materialModalVisible}
        editingMaterial={editingMaterial}
        courses={courses}
        insets={insets}
        onClose={() => setMaterialModalVisible(false)}
        onSave={handleSaveMaterial}
      />

      <CourseFormModal
        visible={courseModalVisible}
        editingCourse={editingCourse}
        insets={insets}
        onClose={() => setCourseModalVisible(false)}
        onSave={async (formData) => {
          let updated;
          if (editingCourse) {
            updated = courses.map((c) => (c.id === editingCourse.id ? { ...c, ...formData } : c));
          } else {
            const newCourse = {
              id: `crs_${Date.now()}`,
              ...formData,
              color: formData.color || COLORS.primary,
            };
            updated = [...courses, newCourse];
          }
          setCourses(updated);
          await persistData(STORAGE_KEYS.COURSES, updated);
          setCourseModalVisible(false);
          setEditingCourse(null);
        }}
      />

      <TaskFormModal
        visible={taskModalVisible}
        editingTask={editingTask}
        courses={courses}
        insets={insets}
        onClose={() => setTaskModalVisible(false)}
        onSave={handleSaveTask}
      />

      {renderNotesModal()}
      {renderAiModal()}
      {renderScheduleModal()}
      {renderNotificationModal()}

      {/* WEEK 7 – ANGGOTA 1 & 2: Smart Material Scanner Camera Modal */}
      <SmartMaterialScannerModal
        visible={isScannerVisible}
        courses={courses}
        insets={insets}
        onClose={() => setIsScannerVisible(false)}
        onSaveMaterial={handleSaveScannedMaterial}
      />

    </SafeAreaView>
  );
}

// =================================================================
// 11. MODAL FORMS SUB-COMPONENTS
// =================================================================

// Form Modal Tambah / Edit Materi
function MaterialFormModal({ visible, editingMaterial, courses, insets, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [meetingNumber, setMeetingNumber] = useState('1');
  const [meetingTopic, setMeetingTopic] = useState('');
  const [fileType, setFileType] = useState('PDF');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('3.8 MB');

  useEffect(() => {
    if (editingMaterial) {
      setTitle(editingMaterial.title);
      setCourseId(editingMaterial.courseId);
      setMeetingNumber(String(editingMaterial.meetingNumber || 1));
      setMeetingTopic(editingMaterial.meetingTopic || '');
      setFileType(editingMaterial.fileType || 'PDF');
      setFileName(editingMaterial.fileName || '');
      setFileSize(editingMaterial.fileSize || '3.5 MB');
    } else {
      setTitle('');
      setCourseId(courses[0]?.id || '');
      setMeetingNumber('1');
      setMeetingTopic('');
      setFileType('PDF');
      setFileName('');
      setFileSize('3.2 MB');
    }
  }, [editingMaterial, visible, courses]);

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ],
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setFileName(res.assets[0].name);
        setFileSize('4.5 MB');
        if (!title) setTitle(res.assets[0].name.replace(/\.[^/.]+$/, ''));
      }
    } catch (e) {
      setFileName('Materi_Kuliah_Pertemuan.pdf');
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Perhatian', 'Harap isi judul materi perkuliahan.');
      return;
    }
    onSave({
      title: title.trim(),
      courseId,
      meetingNumber: parseInt(meetingNumber, 10) || 1,
      meetingTopic: meetingTopic.trim() || `Topik Pertemuan ${meetingNumber}`,
      fileType,
      fileName: fileName.trim() || `${title.replace(/\s+/g, '_')}.${fileType.toLowerCase()}`,
      fileSize,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.modalSafeArea}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>
            {editingMaterial ? 'Edit Materi Kuliah' : 'Upload Materi Baru'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalScrollBody}
          contentContainerStyle={{ paddingBottom: 40 + (insets?.bottom || 16) }}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.filePickerButton} onPress={handlePickDocument} activeOpacity={0.8}>
            <Ionicons name="cloud-upload" size={28} color={COLORS.primary} />
            <Text style={styles.filePickerButtonTitle}>
              {fileName ? fileName : 'Pilih Berkas PDF / PPT dari HP'}
            </Text>
            <Text style={styles.filePickerButtonSub}>
              Mendukung format PDF, PPT, PPTX, dan Dokumen
            </Text>
          </TouchableOpacity>

          <Text style={styles.formLabel}>Judul Materi</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Contoh: Modul 3 - React Navigation"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.formLabel}>Mata Kuliah</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {courses.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.formCourseOption,
                  courseId === c.id && styles.formCourseOptionActive,
                  courseId === c.id && { borderColor: c.color },
                ]}
                onPress={() => setCourseId(c.id)}
              >
                <Text
                  style={[
                    styles.formCourseOptionText,
                    courseId === c.id && { color: c.color, fontWeight: '700' },
                  ]}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>Pertemuan Ke-</Text>
              <TextInput
                style={styles.formInput}
                placeholder="1 - 16"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={meetingNumber}
                onChangeText={setMeetingNumber}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>Format Berkas</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {['PDF', 'PPT', 'DOC'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.fileTypeChoice,
                      fileType === type && styles.fileTypeChoiceActive,
                    ]}
                    onPress={() => setFileType(type)}
                  >
                    <Text
                      style={[
                        styles.fileTypeChoiceText,
                        fileType === type && styles.fileTypeChoiceTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.formLabel}>Topik Pertemuan</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Contoh: Komponen UI & Layouting Flexbox"
            placeholderTextColor={COLORS.textMuted}
            value={meetingTopic}
            onChangeText={setMeetingTopic}
          />

          <TouchableOpacity style={styles.formSubmitButton} onPress={handleSave} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.formSubmitButtonText}>Simpan Materi</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// Form Modal Tambah / Edit Tugas
function TaskFormModal({ visible, editingTask, courses, insets, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [deadline, setDeadline] = useState('2026-11-10');
  const [priority, setPriority] = useState('Sedang');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setCourseId(editingTask.courseId);
      setDeadline(editingTask.deadline);
      setPriority(editingTask.priority);
      setDescription(editingTask.description || '');
    } else {
      setTitle('');
      setCourseId(courses[0]?.id || '');
      setDeadline('2026-11-10');
      setPriority('Sedang');
      setDescription('');
    }
  }, [editingTask, visible, courses]);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Perhatian', 'Harap isi judul tugas.');
      return;
    }
    onSave({
      title: title.trim(),
      courseId,
      deadline,
      priority,
      description: description.trim(),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.modalSafeArea}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>
            {editingTask ? 'Edit Tugas' : 'Tambah Tugas Baru'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalScrollBody}
          contentContainerStyle={{ paddingBottom: 40 + (insets?.bottom || 16) }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.formLabel}>Judul Tugas</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Contoh: Buat Laporan Praktikum Modul 2"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.formLabel}>Mata Kuliah</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {courses.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.formCourseOption,
                  courseId === c.id && styles.formCourseOptionActive,
                  courseId === c.id && { borderColor: c.color },
                ]}
                onPress={() => setCourseId(c.id)}
              >
                <Text
                  style={[
                    styles.formCourseOptionText,
                    courseId === c.id && { color: c.color, fontWeight: '700' },
                  ]}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.formLabel}>Tenggat Waktu (Deadline: YYYY-MM-DD)</Text>
          <TextInput
            style={styles.formInput}
            placeholder="2026-11-10"
            placeholderTextColor={COLORS.textMuted}
            value={deadline}
            onChangeText={setDeadline}
          />

          <Text style={styles.formLabel}>Prioritas</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            {['Tinggi', 'Sedang', 'Rendah'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityOptionBtn,
                  priority === p && styles.priorityOptionBtnActive,
                ]}
                onPress={() => setPriority(p)}
              >
                <Text
                  style={[
                    styles.priorityOptionBtnText,
                    priority === p && styles.priorityOptionBtnTextActive,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.formLabel}>Catatan Tambahan / Deskripsi</Text>
          <TextInput
            style={[styles.formInput, { height: 90, textAlignVertical: 'top' }]}
            multiline
            placeholder="Detail instruksi tugas atau tautan pengumpulan..."
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity style={styles.formSubmitButton} onPress={handleSave} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.formSubmitButtonText}>Simpan Tugas</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// Form Modal Tambah / Edit Mata Kuliah
function CourseFormModal({ visible, editingCourse, insets, onClose, onSave }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [lecturer, setLecturer] = useState('');
  const [day, setDay] = useState('Senin');
  const [time, setTime] = useState('08:00 - 10:30');
  const [room, setRoom] = useState('Lab 1');
  const [sks, setSks] = useState('3');

  const daysList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  useEffect(() => {
    if (editingCourse) {
      setName(editingCourse.name);
      setCode(editingCourse.code);
      setLecturer(editingCourse.lecturer);
      setDay(editingCourse.day);
      setTime(editingCourse.time);
      setRoom(editingCourse.room);
      setSks(String(editingCourse.sks || 3));
    } else {
      setName('');
      setCode('');
      setLecturer('');
      setDay('Senin');
      setTime('08:00 - 10:30');
      setRoom('Lab 1');
      setSks('3');
    }
  }, [editingCourse, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Perhatian', 'Harap isi nama mata kuliah.');
      return;
    }
    onSave({
      name: name.trim(),
      code: code.trim() || 'IF101',
      lecturer: lecturer.trim() || 'Dosen Pengampu',
      day,
      time: time.trim() || '08:00 - 10:30',
      room: room.trim() || 'Ruang Kuliah',
      sks: parseInt(sks, 10) || 3,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.modalSafeArea}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>
            {editingCourse ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalScrollBody}
          contentContainerStyle={{ paddingBottom: 40 + (insets?.bottom || 16) }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.formLabel}>Nama Mata Kuliah</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Contoh: Interaksi Manusia dan Komputer"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>Kode Matkul</Text>
              <TextInput
                style={styles.formInput}
                placeholder="IF3201"
                placeholderTextColor={COLORS.textMuted}
                value={code}
                onChangeText={setCode}
              />
            </View>
            <View style={{ width: 100 }}>
              <Text style={styles.formLabel}>SKS</Text>
              <TextInput
                style={styles.formInput}
                placeholder="3"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={sks}
                onChangeText={setSks}
              />
            </View>
          </View>

          <Text style={styles.formLabel}>Dosen Pengampu</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Nama Dosen dan Gelar"
            placeholderTextColor={COLORS.textMuted}
            value={lecturer}
            onChangeText={setLecturer}
          />

          <Text style={styles.formLabel}>Hari Kuliah</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {daysList.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.dayChoiceBtn, day === d && styles.dayChoiceBtnActive]}
                onPress={() => setDay(d)}
              >
                <Text style={[styles.dayChoiceBtnText, day === d && styles.dayChoiceBtnTextActive]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>Jam Kuliah</Text>
              <TextInput
                style={styles.formInput}
                placeholder="08:00 - 10:30"
                placeholderTextColor={COLORS.textMuted}
                value={time}
                onChangeText={setTime}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>Ruangan</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Lab 203"
                placeholderTextColor={COLORS.textMuted}
                value={room}
                onChangeText={setRoom}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.formSubmitButton} onPress={handleSave} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.formSubmitButtonText}>Simpan Mata Kuliah</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// =================================================================
// WEEK 7 – ANGGOTA 1 & 2: SMART MATERIAL SCANNER CAMERA MODAL
// =================================================================
function SmartMaterialScannerModal({ visible, courses, insets, onClose, onSaveMaterial }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  // Scanner Steps: 'CAMERA' | 'PREVIEW' | 'FORM'
  const [step, setStep] = useState('CAMERA');
  const [capturedPhotoUri, setCapturedPhotoUri] = useState(null);
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [isTakingPicture, setIsTakingPicture] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [meetingNumber, setMeetingNumber] = useState('1');
  const [meetingTopic, setMeetingTopic] = useState('');
  const [userNotes, setUserNotes] = useState('');

  // Reset state saat modal dibuka
  useEffect(() => {
    if (visible) {
      setStep('CAMERA');
      setCapturedPhotoUri(null);
      setFacing('back');
      setTorch(false);
      setIsTakingPicture(false);
      setIsSaving(false);
      setTitle('');
      setCourseId(courses[0]?.id || '');
      setMeetingNumber('1');
      setMeetingTopic('');
      setUserNotes('');
    }
  }, [visible, courses]);

  // Shutter action
  const handleCapturePhoto = async () => {
    if (cameraRef.current && !isTakingPicture) {
      try {
        setIsTakingPicture(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: false,
        });
        if (photo?.uri) {
          setCapturedPhotoUri(photo.uri);
          setStep('PREVIEW');
        }
      } catch (err) {
        Alert.alert('Gagal Memotret', 'Terjadi masalah saat mengambil foto kamera: ' + err.message);
      } finally {
        setIsTakingPicture(false);
      }
    }
  };

  // Submit action
  const handleSubmitForm = async () => {
    if (!title.trim()) {
      Alert.alert('Perhatian', 'Harap masukkan judul materi hasil scan.');
      return;
    }
    setIsSaving(true);
    try {
      await onSaveMaterial({
        imageUri: capturedPhotoUri,
        title: title.trim(),
        courseId: courseId || (courses[0]?.id || 'crs_1'),
        meetingNumber: parseInt(meetingNumber, 10) || 1,
        meetingTopic: meetingTopic.trim(),
        userNotes: userNotes.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* 1. Permission Check */}
        {!permission ? (
          <View style={styles.cameraPermissionBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ color: '#FFFFFF', marginTop: 12, fontWeight: '600' }}>
              Memeriksa izin akses kamera...
            </Text>
          </View>
        ) : !permission.granted ? (
          <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.cameraPermissionBox}>
            <View style={styles.cameraPermissionIconWrap}>
              <Ionicons
                name={permission.canAskAgain === false ? 'camera-off-outline' : 'camera-outline'}
                size={56}
                color={permission.canAskAgain === false ? COLORS.error : COLORS.primary}
              />
            </View>
            <Text style={styles.cameraPermissionTitle}>Izin Kamera Diperlukan</Text>
            {permission.canAskAgain === false ? (
              <>
                <Text style={styles.cameraPermissionSubtitle}>
                  Izin kamera telah ditolak secara permanen. Untuk menggunakan Smart Material Scanner,
                  buka Pengaturan Android → Aplikasi → StudyMate → Izin → Kamera, lalu aktifkan izin kamera secara manual.
                </Text>
                <View style={[styles.cameraPermissionGrantBtn, { backgroundColor: COLORS.textSecondary }]}>
                  <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.cameraPermissionGrantBtnText}>Buka Pengaturan Android</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.cameraPermissionSubtitle}>
                  StudyMate Smart Material Scanner memerlukan izin untuk mengakses kamera perangkat Anda.
                  Kamera digunakan secara langsung untuk memotret papan tulis, slide materi kuliah dosen, atau catatan belajar.
                </Text>
                <TouchableOpacity
                  style={styles.cameraPermissionGrantBtn}
                  onPress={requestPermission}
                  activeOpacity={0.8}
                >
                  <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.cameraPermissionGrantBtnText}>Berikan Izin Kamera</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.cameraPermissionBackBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cameraPermissionBackBtnText}>Batal / Kembali ke Katalog Materi</Text>
            </TouchableOpacity>
          </SafeAreaView>
        ) : step === 'CAMERA' ? (
          /* 2. Step CAMERA: Live Viewfinder */
          <View style={{ flex: 1 }}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFillObject}
              facing={facing}
              flash={torch ? 'torch' : 'off'}
            />

            {/* Top Toolbar */}
            <SafeAreaView edges={['top']} style={styles.cameraLiveTopBar}>
              <TouchableOpacity style={styles.cameraCircleBtn} onPress={onClose} activeOpacity={0.75}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.cameraLiveTitleBadge}>
                <Ionicons name="scan" size={15} color="#FFFFFF" />
                <Text style={styles.cameraLiveTitleText}>Smart Material Scanner</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.cameraCircleBtn, torch && { backgroundColor: COLORS.amber }]}
                  onPress={() => setTorch(!torch)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={torch ? 'flash' : 'flash-off'} size={18} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cameraCircleBtn}
                  onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
                  activeOpacity={0.75}
                >
                  <Ionicons name="camera-reverse-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>

            {/* Center Viewfinder Guide */}
            <View style={styles.cameraViewfinderContainer} pointerEvents="none">
              <View style={styles.cameraViewfinderFrame}>
                <View style={[styles.cornerGuide, styles.cornerTL]} />
                <View style={[styles.cornerGuide, styles.cornerTR]} />
                <View style={[styles.cornerGuide, styles.cornerBL]} />
                <View style={[styles.cornerGuide, styles.cornerBR]} />
              </View>
              <View style={styles.cameraGuideBadge}>
                <Ionicons name="scan-outline" size={14} color="#FFFFFF" />
                <Text style={styles.cameraGuideText}>
                  Arahkan kamera ke papan tulis, slide, atau catatan
                </Text>
              </View>
            </View>

            {/* Bottom Shutter Controls */}
            <SafeAreaView edges={['bottom']} style={styles.cameraLiveBottomBar}>
              <View style={{ alignItems: 'center' }}>
                <TouchableOpacity
                  style={styles.cameraShutterOuter}
                  onPress={handleCapturePhoto}
                  disabled={isTakingPicture}
                  activeOpacity={0.7}
                >
                  {isTakingPicture ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <View style={styles.cameraShutterInner} />
                  )}
                </TouchableOpacity>
                <Text style={styles.cameraShutterHintText}>Ketuk untuk Memotret</Text>
              </View>
            </SafeAreaView>
          </View>
        ) : step === 'PREVIEW' ? (
          /* 3. Step PREVIEW: Photo Review with Retake and Use Photo */
          <View style={{ flex: 1, backgroundColor: '#090D16' }}>
            <SafeAreaView edges={['top']} style={styles.cameraPreviewTopBar}>
              <TouchableOpacity
                style={styles.cameraCircleBtn}
                onPress={() => {
                  setCapturedPhotoUri(null);
                  setStep('CAMERA');
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.cameraPreviewTitle}>Preview Foto Materi</Text>
              <View style={{ width: 40 }} />
            </SafeAreaView>

            <View style={styles.cameraPreviewImageWrapper}>
              <Image
                source={{ uri: capturedPhotoUri }}
                style={styles.cameraPreviewImage}
                resizeMode="contain"
              />
            </View>

            <SafeAreaView edges={['bottom']} style={styles.cameraPreviewBottomBar}>
              <TouchableOpacity
                style={styles.cameraRetakeBtn}
                onPress={() => {
                  setCapturedPhotoUri(null);
                  setStep('CAMERA');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                <Text style={styles.cameraRetakeBtnText}>Ambil Ulang</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cameraUsePhotoBtn}
                onPress={() => {
                  const currentCourse = courses.find((c) => c.id === courseId) || courses[0];
                  if (!title.trim()) {
                    setTitle(`Catatan Slide ${currentCourse?.code || ''} - Pertemuan ${meetingNumber}`);
                  }
                  if (!meetingTopic.trim()) {
                    setMeetingTopic(`Dokumentasi Slide / Papan Tulis Pertemuan ${meetingNumber}`);
                  }
                  setStep('FORM');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.cameraUsePhotoBtnText}>Gunakan Foto</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </View>
        ) : (
          /* 4. Step FORM: Material Info Form */
          <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.cameraFormWrapper}>
            <View style={styles.cameraFormHeader}>
              <TouchableOpacity
                onPress={() => setStep('PREVIEW')}
                style={styles.cameraFormBackBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.cameraFormHeaderTitle}>Informasi Materi Scan</Text>
              <TouchableOpacity onPress={onClose} style={styles.cameraFormBackBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.cameraFormScroll}
              contentContainerStyle={{ paddingBottom: 40 + (insets?.bottom || 16) }}
              showsVerticalScrollIndicator={false}
            >
              {/* Photo Preview Thumbnail */}
              <View style={styles.cameraFormPhotoCard}>
                <Image
                  source={{ uri: capturedPhotoUri }}
                  style={styles.cameraFormPhotoThumb}
                  resizeMode="cover"
                />
                <View style={styles.cameraFormPhotoBadge}>
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                  <Text style={styles.cameraFormPhotoBadgeText}>Hasil Pemindaian Kamera</Text>
                </View>
                <TouchableOpacity
                  style={styles.cameraFormRetakeFloatBtn}
                  onPress={() => setStep('PREVIEW')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="eye-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.cameraFormRetakeFloatText}>Perbesar</Text>
                </TouchableOpacity>
              </View>

              {/* Judul Materi */}
              <Text style={styles.scannerFormLabel}>Judul Materi Perkuliahan *</Text>
              <TextInput
                style={styles.scannerFormInput}
                placeholder="Contoh: Slide Struktur Data Graph & Pohon"
                placeholderTextColor={COLORS.textMuted}
                value={title}
                onChangeText={setTitle}
              />

              {/* Mata Kuliah */}
              <Text style={styles.scannerFormLabel}>Mata Kuliah *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 14 }}
                contentContainerStyle={{ gap: 8 }}
              >
                {courses.map((crs) => {
                  const isSelected = crs.id === courseId;
                  return (
                    <TouchableOpacity
                      key={crs.id}
                      style={[
                        styles.scannerCourseChip,
                        isSelected && { backgroundColor: crs.color, borderColor: crs.color },
                      ]}
                      onPress={() => setCourseId(crs.id)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.scannerCourseChipText,
                          isSelected && { color: '#FFFFFF', fontWeight: '800' },
                        ]}
                      >
                        {crs.code} – {crs.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Pertemuan */}
              <Text style={styles.scannerFormLabel}>Pertemuan Keberapa? *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 14 }}
                contentContainerStyle={{ gap: 8 }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num) => {
                  const isSelected = String(num) === String(meetingNumber);
                  return (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.scannerMeetingChip,
                        isSelected && styles.scannerMeetingChipActive,
                      ]}
                      onPress={() => setMeetingNumber(String(num))}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.scannerMeetingChipText,
                          isSelected && styles.scannerMeetingChipTextActive,
                        ]}
                      >
                        P{num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Topik Pertemuan */}
              <Text style={styles.scannerFormLabel}>Topik Pertemuan / Bahasan</Text>
              <TextInput
                style={styles.scannerFormInput}
                placeholder="Contoh: Implementasi Traversal BFS & DFS"
                placeholderTextColor={COLORS.textMuted}
                value={meetingTopic}
                onChangeText={setMeetingTopic}
              />

              {/* Catatan Tambahan */}
              <Text style={styles.scannerFormLabel}>Deskripsi atau Catatan Tambahan (Opsional)</Text>
              <TextInput
                style={[styles.scannerFormInput, { height: 75, textAlignVertical: 'top' }]}
                placeholder="Tulis catatan penting dosen saat memaparkan slide atau materi ini..."
                placeholderTextColor={COLORS.textMuted}
                value={userNotes}
                onChangeText={setUserNotes}
                multiline
              />

              {/* Penjelasan Penyimpanan Lokal Persisten */}
              <View style={styles.scannerStorageInfoCard}>
                <Ionicons name="folder-open-outline" size={20} color={COLORS.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.scannerStorageInfoTitle}>Penyimpanan Foto Lokal Persisten</Text>
                  <Text style={styles.scannerStorageInfoDesc}>
                    Foto disalin ke direktori dokumen lokal HP Anda secara permanen. Materi dan foto tetap dapat dibuka kembali kapan saja meskipun aplikasi ditutup atau tanpa internet.
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <TouchableOpacity
                  style={styles.scannerCancelBtn}
                  onPress={() => setStep('PREVIEW')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.scannerCancelBtnText}>Kembali ke Foto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.scannerSubmitBtn}
                  onPress={handleSubmitForm}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.scannerSubmitBtnText}>Simpan ke Materi</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </View>
    </Modal>
  );
}

// =================================================================
// 12. ROOT EXPORT DENGAN SAFE AREA PROVIDER (Anggota 3)
// =================================================================
export default function App() {
  return (
    <SafeAreaProvider>
      <StudyMateApp />
    </SafeAreaProvider>
  );
}

// =================================================================
// 13. STYLESHEET (CLEAN, RESPONSIVE, WCAG AAA ACCESSIBLE)
// =================================================================
const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mainContentFlex: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // App Header
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTextGroup: {
    flex: 1,
    marginRight: 10,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.rose,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  // Badge Component
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Hero Progress Banner
  heroBanner: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: COLORS.primaryDark,
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  heroBannerContent: {
    flex: 1,
  },
  heroStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  heroStreakText: {
    color: '#FEF08A',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#E0E7FF',
    marginBottom: 12,
    lineHeight: 16,
  },
  heroProgressBarBg: {
    height: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 3.5,
    overflow: 'hidden',
  },
  heroProgressBarFill: {
    height: '100%',
    backgroundColor: '#34D399',
    borderRadius: 3.5,
  },

  // Stats Grid (Responsive 2 Columns or 4 on Wide)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContentCol: {
    flex: 1,
    marginLeft: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  statSubtitle: {
    fontSize: 9,
    color: COLORS.textMuted,
  },

  // Quick Action Bar
  quickActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 18,
  },
  quickActionButton: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 2,
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Material Card
  materialCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  materialCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  materialMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    gap: 6,
    marginRight: 8,
  },
  materialCourseTag: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
  checkCircleButton: {
    padding: 2,
  },
  materialTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 19,
    marginBottom: 4,
  },
  materialTopicText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },
  materialFileMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  materialCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 10,
    gap: 8,
  },
  actionPillAi: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  actionPillAiText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  actionPillNotes: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  actionPillNotesText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionDeleteButton: {
    marginLeft: 'auto',
    padding: 5,
  },

  // Course Card
  courseCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  courseCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  courseMainInfo: {
    flex: 1,
    marginRight: 10,
  },
  courseBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  courseCodeBadge: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  courseSksText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  courseNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  courseLecturerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  courseSchedulePill: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  courseDayText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  courseTimeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  courseRoomText: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  courseProgressContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 8,
  },
  courseProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  courseProgressLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  courseProgressValue: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },

  // Task Item Card
  taskItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 9,
  },
  taskItemCardCompleted: {
    opacity: 0.65,
    backgroundColor: '#F8FAFC',
  },
  taskCheckboxTouch: {
    padding: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  taskDetailsCol: {
    flex: 1,
    paddingHorizontal: 8,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  taskCourseSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  taskDescText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  taskMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  taskDeleteTouch: {
    padding: 6,
  },

  // Materials Screen Wrapper
  materialsHeaderWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  filterPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  statusFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statusFilterPillActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  statusFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  statusFilterTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  horizontalFilterScroll: {
    marginBottom: 8,
  },
  courseFilterChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginRight: 8,
  },
  courseFilterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  courseFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  courseFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  meetingFilterScroll: {
    marginBottom: 8,
  },
  meetingFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: COLORS.inputBackground,
    marginRight: 6,
  },
  meetingFilterChipActive: {
    backgroundColor: COLORS.textPrimary,
  },
  meetingFilterChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  meetingFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  addMaterialSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addMaterialSmallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Screen Banner & Add Button
  screenBannerRow: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenBannerText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.primaryDark,
    lineHeight: 16,
    marginRight: 8,
  },
  primaryAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 3,
  },
  primaryAddButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 3,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 12,
  },
  emptyActionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  allClearCard: {
    backgroundColor: COLORS.emeraldLight,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  allClearTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
    marginTop: 4,
  },
  allClearSubtitle: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },

  // Profile & Schedule Screen
  profileHeroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 14,
  },
  profileAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileInfoCol: {
    flex: 1,
    marginLeft: 12,
  },
  profileNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  profileNimText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  profileMajorText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  profileCampusText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  scheduleUploadCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 14,
  },
  scheduleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleUploadTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scheduleUploadDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  uploadScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 9,
    gap: 6,
    marginTop: 6,
  },
  uploadScheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scheduleItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 8,
  },
  scheduleDayBadge: {
    width: 50,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleDayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  scheduleCourseName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scheduleTimeRoom: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  settingsContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  settingDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  settingDesc: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  // Modal Common Styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalHeaderSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // AI Assistant Modal Styles
  aiBadgeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  aiTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  aiTabButtonActive: {
    borderBottomColor: COLORS.primary,
  },
  aiTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  aiTabTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  aiContentCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 14,
  },
  aiBannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 8,
  },
  aiBannerPillText: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '700',
  },
  aiSummaryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  aiSectionSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  aiSummaryParagraph: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  aiNoteCallout: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginBottom: 12,
  },
  aiNoteCalloutText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.primaryDark,
    lineHeight: 16,
  },
  aiShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 6,
  },
  aiShareButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  keyPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  keyPointBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  keyPointBulletText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  keyPointContent: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  quizCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 11,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  quizQuestionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 19,
    marginBottom: 8,
  },
  quizOptionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 8,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  quizOptionCorrect: {
    borderColor: COLORS.emerald,
    backgroundColor: COLORS.emeraldLight,
  },
  quizOptionLetter: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    width: 20,
  },
  quizOptionLetterCorrect: {
    color: '#065F46',
  },
  quizOptionLabel: {
    fontSize: 11,
    color: COLORS.textPrimary,
    flex: 1,
  },
  quizOptionLabelCorrect: {
    color: '#065F46',
    fontWeight: '700',
  },
  quizRevealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    gap: 5,
    marginTop: 4,
  },
  quizRevealButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  quizExplanationBox: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 9,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  quizExplanationTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 2,
  },
  quizExplanationText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
  },

  // Notes Modal Styles
  notesContainer: {
    flex: 1,
    padding: 16,
  },
  notesInstructionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: 10,
  },
  notesTextInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
  },
  saveNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  saveNotesButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // Form Components & Modals
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 5,
    marginTop: 6,
  },
  formInput: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  filePickerButton: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  filePickerButtonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginTop: 4,
    textAlign: 'center',
  },
  filePickerButtonSub: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  formCourseOption: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginRight: 6,
  },
  formCourseOptionActive: {
    backgroundColor: COLORS.primaryLight,
  },
  formCourseOptionText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  fileTypeChoice: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  fileTypeChoiceActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  fileTypeChoiceText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  fileTypeChoiceTextActive: {
    color: '#FFFFFF',
  },
  priorityOptionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  priorityOptionBtnActive: {
    backgroundColor: COLORS.textPrimary,
    borderColor: COLORS.textPrimary,
  },
  priorityOptionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  priorityOptionBtnTextActive: {
    color: '#FFFFFF',
  },
  dayChoiceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginRight: 6,
  },
  dayChoiceBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayChoiceBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dayChoiceBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  formSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
    marginTop: 12,
  },
  formSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // Schedule Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  scheduleModalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    elevation: 8,
  },
  scheduleModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  scheduleModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  scheduleModalSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 14,
  },
  uploadOptionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  uploadOptionBtn: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    alignItems: 'center',
  },
  uploadOptionBtnTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 6,
    textAlign: 'center',
  },
  uploadOptionBtnSub: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  parsingIndicatorBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parsingStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 10,
    textAlign: 'center',
  },
  scheduleCancelBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  scheduleCancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },

  // Notification Modal Styles
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 8,
  },
  notifCardUnread: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary + '40',
  },
  notifIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  notifItemTime: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  notifItemMsg: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  markAllReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    marginTop: 6,
  },
  markAllReadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Bottom Navigation Bar (Anggota 3)
  bottomNavContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 5,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  bottomNavLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  bottomNavLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  bottomNavActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    position: 'absolute',
    bottom: 2,
  },

  // =================================================================
  // WEEK 6 STYLES: Offline Banner, Error Card, Loading Indicator
  // =================================================================
  offlineBannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  offlineBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
  },
  offlineBannerSubtitle: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
  },
  offlineRetryButton: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  offlineRetryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },

  apiErrorCardContainer: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
  },
  apiErrorIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  apiErrorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.rose,
    marginBottom: 4,
  },
  apiErrorMessage: {
    fontSize: 13,
    color: '#9F1239',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  apiErrorRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.rose,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  apiErrorRetryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  inlineLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  inlineLoadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  // =================================================================
  // WEEK 7 – DEVICE SENSORS & SMART MATERIAL SCANNER STYLES
  // =================================================================

  // Scan Button in Materials Header
  scanMaterialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  scanMaterialBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // Material Card Scanned Thumbnail
  materialPhotoThumbBox: {
    position: 'relative',
    height: 140,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: '#0F172A',
  },
  materialPhotoThumbImage: {
    width: '100%',
    height: '100%',
  },
  materialPhotoThumbOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  materialPhotoThumbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  materialPhotoThumbBadgeText: {
    color: '#EDE9FE',
    fontSize: 11,
    fontWeight: '700',
  },
  materialPhotoExpandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  materialPhotoExpandText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  // Footer Action Pill for Scan
  actionPillScan: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  actionPillScanText: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '700',
  },

  // Camera Permission Box
  cameraPermissionBox: {
    flex: 1,
    backgroundColor: '#090D16',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  cameraPermissionIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cameraPermissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  cameraPermissionSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  cameraPermissionGrantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  cameraPermissionGrantBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cameraPermissionBackBtn: {
    paddingVertical: 14,
    marginTop: 10,
  },
  cameraPermissionBackBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },

  // Camera Live Viewfinder
  cameraLiveTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  cameraCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraLiveTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cameraLiveTitleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  cameraViewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraViewfinderFrame: {
    width: '84%',
    height: '65%',
    position: 'relative',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  cornerGuide: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#A78BFA',
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  cameraGuideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 18,
  },
  cameraGuideText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cameraLiveBottomBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingVertical: 20,
    alignItems: 'center',
  },
  cameraShutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  cameraShutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  cameraShutterHintText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },

  // Camera Preview Screen
  cameraPreviewTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
  },
  cameraPreviewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cameraPreviewImageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  cameraPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  cameraPreviewBottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#0F172A',
    gap: 12,
  },
  cameraRetakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#475569',
    gap: 6,
  },
  cameraRetakeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cameraUsePhotoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    gap: 6,
  },
  cameraUsePhotoBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  // Camera Info Form
  cameraFormWrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  cameraFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
  },
  cameraFormBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
  },
  cameraFormHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cameraFormScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cameraFormPhotoCard: {
    position: 'relative',
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: 16,
  },
  cameraFormPhotoThumb: {
    width: '100%',
    height: '100%',
  },
  cameraFormPhotoBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cameraFormPhotoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cameraFormRetakeFloatBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cameraFormRetakeFloatText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  scannerFormLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  scannerFormInput: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  scannerCourseChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
  },
  scannerCourseChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  scannerMeetingChip: {
    width: 44,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerMeetingChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  scannerMeetingChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  scannerMeetingChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  scannerStorageInfoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    padding: 12,
    borderRadius: 12,
    gap: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 10,
  },
  scannerStorageInfoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 2,
  },
  scannerStorageInfoDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  scannerCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  scannerSubmitBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    gap: 6,
  },
  scannerSubmitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Full-Screen Photo Viewer
  photoViewerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  photoViewerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  photoViewerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  photoViewerImageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  photoViewerImage: {
    width: '100%',
    height: '100%',
  },
  photoViewerBottomBar: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  photoViewerBottomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  photoViewerBottomTopic: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  photoViewerNotesText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 8,
  },
  photoViewerStorageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  photoViewerStorageText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  // Floating Toast for Shake to Refresh
  shakeFloatingToast: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    backgroundColor: '#0F172AEB',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shakeFloatingToastText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },

});
