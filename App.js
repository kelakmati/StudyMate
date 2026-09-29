import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Switch,
  Dimensions,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

// =================================================================
// 1. DESIGN SYSTEM: TOKENS & COLOR PALETTE
// =================================================================
const COLORS = {
  primary: '#4F46E5', // Indigo 600
  primaryLight: '#EEF2FF', // Indigo 50
  primaryDark: '#3730A3', // Indigo 800
  secondary: '#0EA5E9', // Sky 500
  secondaryLight: '#E0F2FE', // Sky 50
  emerald: '#10B981', // Emerald 500
  emeraldLight: '#D1FAE5', // Emerald 50
  amber: '#F59E0B', // Amber 500
  amberLight: '#FEF3C7', // Amber 50
  rose: '#EF4444', // Rose 500
  roseLight: '#FEE2E2', // Rose 50
  purple: '#8B5CF6', // Purple 500
  purpleLight: '#EDE9FE', // Purple 50

  // Neutrals
  background: '#F8FAFC', // Slate 50
  card: '#FFFFFF',
  cardBorder: '#E2E8F0', // Slate 200
  textPrimary: '#0F172A', // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94A3B8', // Slate 400
  inputBackground: '#F1F5F9', // Slate 100
};

// Storage Keys
const STORAGE_KEYS = {
  SESSION: '@studymate_user_session',
  USERS: '@studymate_registered_users',
  COURSES: '@studymate_courses_data',
  MATERIALS: '@studymate_materials_data',
  TASKS: '@studymate_tasks_data',
  SETTINGS: '@studymate_settings_data',
};

// =================================================================
// 2. SEED STARTER DATA & DEMO USERS (Personal Data per userId)
// =================================================================
const DEMO_USERS = [
  {
    id: 'usr_001',
    name: 'Akaashi Keiji',
    email: 'Keiji@webmail.umm.ac.id',
    password: 'password123',
    semester: 'Semester 5',
    major: 'Teknik Informatika',
    university: 'Universitas Muhammadiyah Malang',
  },
  {
    id: 'usr_002',
    name: 'Bokuto Koutarou',
    email: 'bokuto@webmail.umm.ac.id',
    password: 'password123',
    semester: 'Semester 3',
    major: 'Informatika',
    university: 'Universitas Muhammadiyah Malang',
  },
];

const DEFAULT_USER = DEMO_USERS[0];

const SEED_COURSES = [
  // User A (Akaashi Keiji) Courses
  {
    id: 'c1',
    userId: 'usr_001',
    name: 'Pemrograman Web Lanjut',
    lecturer: 'Dr. Budi Santoso, M.Kom',
    day: 'Senin',
    startTime: '08:00',
    endTime: '10:30',
    room: 'Lab Komputasi 3',
    classInfo: 'Kelas IF-A • 3 SKS',
    color: '#4F46E5',
  },
  {
    id: 'c2',
    userId: 'usr_001',
    name: 'Struktur Data & Algoritma',
    lecturer: 'Prof. Sri Wahyuni, Ph.D',
    day: 'Selasa',
    startTime: '10:00',
    endTime: '12:30',
    room: 'Ruang Teori 402',
    classInfo: 'Kelas IF-B • 3 SKS',
    color: '#0EA5E9',
  },
  {
    id: 'c3',
    userId: 'usr_001',
    name: 'Rekayasa Perangkat Lunak',
    lecturer: 'Ahmad Fauzi, M.T',
    day: 'Kamis',
    startTime: '13:00',
    endTime: '15:30',
    room: 'Ruang Seminar 201',
    classInfo: 'Kelas IF-A • 3 SKS',
    color: '#8B5CF6',
  },
  // User B (Bokuto Koutarou) Courses - Distinct course set
  {
    id: 'c4',
    userId: 'usr_002',
    name: 'Pemrograman Mobile',
    lecturer: 'Eko Felix Nur Nofianto, S.Kom., M.Kom.',
    day: 'Rabu',
    startTime: '16:20',
    endTime: '18:00',
    room: '612 (GKB III)',
    classInfo: 'Kelas K • 3 SKS',
    color: '#10B981',
  },
  {
    id: 'c5',
    userId: 'usr_002',
    name: 'Piranti Cerdas',
    lecturer: 'Dr. Diah Risqiwati, ST., MT.',
    day: 'Selasa',
    startTime: '10:20',
    endTime: '12:00',
    room: '611 (GKB III)',
    classInfo: 'Kelas I • 2 SKS',
    color: '#06B6D4',
  },
  {
    id: 'c6',
    userId: 'usr_002',
    name: 'Pemrograman Fungsional',
    lecturer: 'Fera Putri Ayu Lestari, S.Kom., M.T.',
    day: 'Senin',
    startTime: '15:30',
    endTime: '17:10',
    room: '612 (GKB III)',
    classInfo: 'Kelas F • 3 SKS',
    color: '#F59E0B',
  },
];

const SEED_MATERIALS = [
  // User A (Akaashi Keiji) Materials
  {
    id: 'm1',
    userId: 'usr_001',
    courseId: 'c1',
    courseName: 'Pemrograman Web Lanjut',
    meeting: 5,
    title: 'Arsitektur REST API & Otentikasi JWT',
    description: 'Membahas prinsip arsitektur RESTful API serta mekanisme otentikasi stateless menggunakan JSON Web Token (JWT).',
    fileName: 'Pertemuan_05_REST_JWT.pdf',
    fileType: 'PDF',
    fileSize: '3.4 MB',
    readTime: '15 mnt',
    uploadDate: '24 Sep 2026',
    isStudied: true,
    summary: 'Materi ini membahas prinsip arsitektur RESTful API serta mekanisme otentikasi menggunakan JSON Web Token (JWT). Token disimpan di Authorization Header dengan format Bearer <token>.',
    keyPoints: [
      'REST merupakan arsitektur komunikasi data berbasis HTTP method (GET, POST, PUT, DELETE).',
      'JWT terdiri dari 3 bagian: Header, Payload, dan Signature.',
      'Token dikirimkan lewat Authorization Header: Bearer <token>.',
    ],
    quiz: [
      {
        question: 'Mengapa JWT cocok digunakan pada sistem microservices?',
        answer: 'Karena bersifat stateless dan self-contained, server tidak perlu menyimpan sesi di database terpusat.',
      },
      {
        question: 'Bagian mana dari JWT yang menjamin integritas token?',
        answer: 'Signature (tanda tangan digital) yang dibuat menggunakan secret key server.',
      },
    ],
  },
  {
    id: 'm2',
    userId: 'usr_001',
    courseId: 'c2',
    courseName: 'Struktur Data & Algoritma',
    meeting: 6,
    title: 'Binary Search Tree & Algoritma Balancing AVL',
    description: 'Pohon biner terurut dan mitigasi degradasi O(N) menggunakan balancing rotation otomatis pada AVL Tree.',
    fileName: 'Materi_06_BST_AVL_Trees.pdf',
    fileType: 'PDF',
    fileSize: '4.1 MB',
    readTime: '25 mnt',
    uploadDate: '22 Sep 2026',
    isStudied: false,
    summary: 'Studi pohon biner terurut (BST) dan penyeimbangan tinggi pohon otomatis (AVL Tree) dengan rotasi kiri dan kanan agar operasi pencarian tetap O(log N).',
    keyPoints: [
      'Karakteristik BST: anak kiri < parent < anak kanan.',
      'AVL Tree mempertahankan tinggi dengan selisih balance factor maksimal 1.',
    ],
    quiz: [
      {
        question: 'Berapakah nilai ambang batas Balance Factor pada AVL Tree?',
        answer: 'Harus berada di rentang -1, 0, atau +1.',
      },
    ],
  },
  // User B (Bokuto Koutarou) Materials
  {
    id: 'm3',
    userId: 'usr_002',
    courseId: 'c4',
    courseName: 'Pemrograman Mobile',
    meeting: 3,
    title: 'Pengenalan Komponen Dasar React Native',
    description: 'Mempelajari View, Text, ScrollView, FlatList, dan Flexbox layouting pada aplikasi mobile.',
    fileName: 'Materi_03_React_Native_Basics.pdf',
    fileType: 'PDF',
    fileSize: '2.8 MB',
    readTime: '20 mnt',
    uploadDate: '25 Sep 2026',
    isStudied: true,
    summary: 'Komponen inti React Native memetakan langsung ke komponen platform native di Android dan iOS.',
    keyPoints: [
      'Flexbox di React Native defaultnya adalah flexDirection: column.',
      'SafeAreaView memastikan tampilan tidak tertutup notch atau home bar.',
    ],
    quiz: [
      {
        question: 'Apa default flexDirection di React Native?',
        answer: 'column',
      },
    ],
  },
];

const SEED_TASKS = [
  // User A (Akaashi Keiji) Tasks
  {
    id: 't1',
    userId: 'usr_001',
    courseId: 'c1',
    courseName: 'Pemrograman Web Lanjut',
    title: 'Implementasi Middleware Autentikasi JWT di Express.js',
    description: 'Buat middleware verifyToken yang mengecek validitas bearer token pada header dan simpan data user ke req.user.',
    deadline: '30 September 2026, 23:59',
    priority: 'Tinggi',
    completed: true,
    linkedMeeting: 5,
  },
  {
    id: 't2',
    userId: 'usr_001',
    courseId: 'c2',
    courseName: 'Struktur Data & Algoritma',
    title: 'Tugas Mandiri: Simulasi Rotasi AVL Tree di Python/C++',
    description: 'Implementasikan fungsi rotateLeft dan rotateRight serta cek balance factor pada tree bertipe AVL.',
    deadline: '02 Oktober 2026, 17:00',
    priority: 'Sedang',
    completed: false,
    linkedMeeting: 6,
  },
  // User B (Bokuto Koutarou) Tasks
  {
    id: 't3',
    userId: 'usr_002',
    courseId: 'c4',
    courseName: 'Pemrograman Mobile',
    title: 'Membuat UI Halaman Profil & Dashboard dengan React Native',
    description: 'Rancang tampilan responsif menggunakan Flexbox dan komponen Safe Area.',
    deadline: '05 Oktober 2026, 23:59',
    priority: 'Tinggi',
    completed: false,
    linkedMeeting: 3,
  },
];

const SCHEDULE_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// Sample Presets for Demonstration & Testing OCR Table Extraction
const SAMPLE_SCHEDULE_TEMPLATES = [
  {
    label: 'Tabel InfoKHS Kampus (Format Screenshot 6 Matkul)',
    rawText: `No | Mata Kuliah | SKS | Kelas | Nama Dosen | Ruang | Jam | Presensi
1 | Pemrograman Fungsional | 3 | F | Fera Putri Ayu Lestari, S.Kom., M.T. | 612 (GKB III) | Senin 15.30 - 17.10 WIB | Presensi
2 | Piranti Cerdas | 2 | I | Dr. Diah Risqiwati, ST., MT. | 611 (GKB III) | Selasa 10.20 - 12.00 WIB | Presensi
3 | Pemrograman Mobile | 3 | K | Eko Felix Nur Nofianto, S.Kom., M.Kom. | 612 (GKB III) | Rabu 16.20 - 18.00 WIB | Presensi
4 | Pemrograman Web | 3 | C | Christian Sri Kusuma Aditya, S.Kom., M.Kom | 401 (GKB II) | Kamis 07.00 - 08.40 WIB | Presensi
5 | Etika dan Profesi | 3 | I | Diana Mayangsari Ramadhani, S.ST., M.Tr.T. | 215 (GKB I) | Kamis 11.10 - 14.40 WIB | Presensi
6 | Metode Penelitian | 2 | G | Ir. Gita Indah Marthasari, ST., M.Kom | 401 (GKB II) | Jumat 08.40 - 10.20 WIB | Presensi`,
  },
  {
    label: 'InfoKHS Standard (Pipe Separator)',
    rawText: `Senin | 08:00 - 09:40 | Pemrograman Mobile | Dr. Budi | Lab 3 | Kelas A
Senin | 10:00 - 11:40 | Cloud Computing | Ir. Hendra, M.T | R. 302 | Kelas B
Rabu  | 13:00 - 15:30 | Basis Data Lanjut | Prof. Sri Wahyuni | Lab Komputasi 2 | Kelas A
Jumat | 08:30 - 11:00 | Kecerdasan Buatan | Nurul Hidayah, M.Sc | Lab AI | Kelas C`,
  },
  {
    label: 'KRS Format Vertikal (Catatan / Dokumen)',
    rawText: `Senin
15.30 - 17.10
Pemrograman Fungsional
Fera Putri Ayu Lestari, S.Kom., M.T.
612 (GKB III)

Selasa
10.20 - 12.00
Piranti Cerdas
Dr. Diah Risqiwati, ST., MT.
611 (GKB III)

Rabu
16.20 - 18.00
Pemrograman Mobile
Eko Felix Nur Nofianto, S.Kom., M.Kom.
612 (GKB III)`,
  },
];

// Helper: Format Indonesian Date
const getTodayIndonesianDate = () => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const now = new Date();
  const dayName = days[now.getDay()];
  const dayNumber = now.getDate();
  const monthName = months[now.getMonth()];
  const year = now.getFullYear();
  return `${dayName}, ${dayNumber} ${monthName} ${year}`;
};

// =================================================================
// INTELLIGENT ACADEMIC TABLE & SCHEDULE OCR PARSER
// Maps: Mata Kuliah -> name, Kelas -> classInfo, Nama Dosen -> lecturer,
// Ruang -> room, Jam -> day + startTime + endTime
// =================================================================
const parseScheduleText = (text) => {
  if (!text || !text.trim()) return [];

  const daysMap = {
    'senin': 'Senin', 'selasa': 'Selasa', 'rabu': 'Rabu', 'kamis': 'Kamis',
    'jumat': 'Jumat', 'sabtu': 'Sabtu', 'minggu': 'Minggu',
    'monday': 'Senin', 'tuesday': 'Selasa', 'wednesday': 'Rabu',
    'thursday': 'Kamis', 'friday': 'Jumat', 'saturday': 'Sabtu', 'sunday': 'Minggu',
  };

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const results = [];
  const colors = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#3B82F6', '#14B8A6'];

  // Filter out header lines
  const filteredLines = lines.filter((line) => {
    const l = line.toLowerCase();
    if ((l.includes('mata kuliah') || l.includes('matakuliah')) && (l.includes('dosen') || l.includes('sks') || l.includes('ruang'))) return false;
    if (l.includes('ruang') && l.includes('jam') && l.includes('presensi')) return false;
    if (l.startsWith('no ') && l.includes('sks')) return false;
    return true;
  });

  for (let i = 0; i < filteredLines.length; i++) {
    let line = filteredLines[i];

    // STRATEGY 1: Pipe / Tab / Semicolon Delimited Table Rows
    if (line.includes('|') || line.includes('\t') || (line.includes(';') && !line.includes('&'))) {
      const parts = line.split(/[|\t;]/).map((p) => p.trim()).filter((p) => p.length > 0);
      if (parts.length >= 3) {
        let cName = '', cSks = '3', cClass = '', cLecturer = '', cRoom = '', cDayTime = '';

        for (let idx = 0; idx < parts.length; idx++) {
          const p = parts[idx];
          const lp = p.toLowerCase();

          // Skip pure row counter if at beginning
          if (/^\d{1,2}$/.test(p) && idx === 0) {
            continue;
          }

          // Check if Day / Time Column
          if (/(senin|selasa|rabu|kamis|jumat|sabtu|minggu|monday|tuesday|wednesday|thursday|friday)/i.test(lp) || /\d{1,2}[.:]\d{2}/.test(p)) {
            cDayTime = p;
          }
          // Check if Room Column
          else if (/(?:gkb|lab|ruang|r\.|gedung)/i.test(lp) || /^\d{3,4}\s*(?:\([^)]+\))?/.test(p)) {
            cRoom = p;
          }
          // Check if Lecturer Column with Degrees / Titles
          else if (/(?:s\.kom|m\.kom|m\.t|st\.|mt\.|dr\.|ir\.|prof\.|s\.st\.|m\.tr\.t\.|s\.t|m\.sc|ph\.d|m\.pd|s\.pd|s\.si|m\.si|se\.|mm\.)/i.test(lp)) {
            cLecturer = p;
          }
          // Check if single/double letter Class
          else if (/^[A-Za-z0-9]{1,2}$/.test(p) && !cClass && !/^\d$/.test(p)) {
            cClass = p;
          }
          // Check if SKS number
          else if (/^[1-6]$/.test(p) && !cSks) {
            cSks = p;
          }
          // Check if Ignored Column (Presensi)
          else if (lp === 'presensi' || lp.includes('presensi')) {
            continue;
          }
          // Otherwise, capture Course Name
          else if (!cName && p.length > 2) {
            cName = p;
          } else if (!cLecturer && p.length > 3 && (p.includes(' ') || p.includes('.'))) {
            cLecturer = p;
          }
        }

        if (cName && (cDayTime || cLecturer || cRoom)) {
          let day = 'Senin';
          let startTime = '08:00';
          let endTime = '09:40';

          const dayMatch = cDayTime.match(/\b(Senin|Selasa|Rabu|Kamis|Jum['’]?at|Sabtu|Minggu|Monday|Tuesday|Wednesday|Thursday|Friday)\b/i);
          if (dayMatch) {
            const k = dayMatch[1].toLowerCase().replace(/['’]/g, '');
            if (k.startsWith('jum')) day = 'Jumat';
            else if (daysMap[k]) day = daysMap[k];
          }

          const timeMatch = cDayTime.match(/(\d{1,2})[.:](\d{2})\s*[-–—~to]+\s*(\d{1,2})[.:](\d{2})/);
          if (timeMatch) {
            startTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
            endTime = `${timeMatch[3].padStart(2, '0')}:${timeMatch[4]}`;
          }

          results.push({
            id: 'imported_' + Date.now() + '_' + i,
            name: cName,
            lecturer: cLecturer || 'Dosen Pengampu',
            day,
            startTime,
            endTime,
            room: cRoom || 'Ruang Kuliah',
            classInfo: cClass ? `Kelas ${cClass}` : 'Kelas Reguler',
            sks: cSks || '3',
            color: colors[results.length % colors.length],
          });
          continue;
        }
      }
    }

    // STRATEGY 2: Unstructured Line / Row with Regex Extraction
    const rowNumMatch = line.match(/^(\d{1,2})[\s.|\t]+/);
    if (rowNumMatch) {
      line = line.substring(rowNumMatch[0].length).trim();
    }

    let foundDay = 'Senin';
    const dayRegex = /\b(Senin|Selasa|Rabu|Kamis|Jum['’]?at|Sabtu|Minggu|Monday|Tuesday|Wednesday|Thursday|Friday)\b/i;
    const dayMatch = line.match(dayRegex);
    if (dayMatch) {
      const key = dayMatch[1].toLowerCase().replace(/['’]/g, '');
      if (key.startsWith('jum')) foundDay = 'Jumat';
      else if (daysMap[key]) foundDay = daysMap[key];
    }

    let startTime = '08:00';
    let endTime = '09:40';
    const timeRegex = /(\d{1,2})[.:](\d{2})\s*[-–—~to]+\s*(\d{1,2})[.:](\d{2})(?:\s*WIB|\s*WITA|\s*WIT)?/i;
    const timeMatch = line.match(timeRegex);
    if (timeMatch) {
      startTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
      endTime = `${timeMatch[3].padStart(2, '0')}:${timeMatch[4]}`;
    }

    let room = '';
    const roomRegex = /\b(\d{3,4}(?:\s*\([A-Za-z0-9\s]+\))?|Lab\s*[A-Za-z0-9\s]+|Ruang\s*[A-Za-z0-9\s]+|R\.\s*\d+|GKB\s*[A-Za-z0-9\s()]+)/i;
    const roomMatch = line.match(roomRegex);
    if (roomMatch) {
      room = roomMatch[1].trim();
    }

    let cleanLine = line
      .replace(/\bPresensi\b/gi, '')
      .replace(timeRegex, '')
      .replace(dayRegex, '')
      .replace(roomRegex, '')
      .replace(/\s+/g, ' ')
      .trim();

    let lecturer = '';
    const lecturerRegex = /((?:Dr\.|Ir\.|Prof\.|Drs\.|Dra\.)?\s*[A-Z][a-zA-Z\s.'’]+,\s*(?:S\.Kom\.|M\.Kom\.|M\.T\.|ST\.|MT\.|S\.ST\.|M\.Tr\.T\.|S\.T\.|M\.Sc\.|Ph\.D\.|M\.Pd\.|S\.Pd\.|S\.Si\.|M\.Si\.|SE\.|MM\.)[A-Za-z0-9\s.,’']*)/i;
    const lecturerMatch = cleanLine.match(lecturerRegex);
    if (lecturerMatch) {
      lecturer = lecturerMatch[1].trim().replace(/[,\s]+$/, '');
      cleanLine = cleanLine.replace(lecturerMatch[0], ' ').trim();
    }

    let sks = '3';
    let className = '';
    const sksClassMatch = cleanLine.match(/\b([1-6])\s+([A-Z0-9]{1,3})\b/);
    if (sksClassMatch) {
      sks = sksClassMatch[1];
      className = sksClassMatch[2];
      cleanLine = cleanLine.replace(sksClassMatch[0], ' ').trim();
    } else {
      const classOnlyMatch = cleanLine.match(/\bKelas\s*[:=]?\s*([A-Z0-9]+)\b/i);
      if (classOnlyMatch) {
        className = classOnlyMatch[1];
        cleanLine = cleanLine.replace(classOnlyMatch[0], ' ').trim();
      }
    }

    let courseName = cleanLine.replace(/^[|\s,.-]+|[|\s,.-]+$/g, '').trim();

    if (courseName && (timeMatch || dayMatch || lecturer || room)) {
      results.push({
        id: 'imported_' + Date.now() + '_' + i,
        name: courseName,
        lecturer: lecturer || 'Dosen Pengampu',
        day: foundDay,
        startTime,
        endTime,
        room: room || 'Ruang Kuliah',
        classInfo: className ? `Kelas ${className}` : 'Kelas Reguler',
        sks: sks || '3',
        color: colors[results.length % colors.length],
      });
    }
  }

  // STRATEGY 3: Block-based vertical structure (Day -> Time -> Course -> Lecturer -> Room)
  if (results.length === 0) {
    let currentDay = 'Senin';
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      let isDay = false;
      for (const dKey in daysMap) {
        if (lowerLine === dKey || lowerLine.startsWith(dKey)) {
          currentDay = daysMap[dKey];
          isDay = true;
          break;
        }
      }

      if (isDay) {
        i++;
        continue;
      }

      const timeMatch = line.match(/(\d{1,2})[.:](\d{2})\s*[-–—~to]+\s*(\d{1,2})[.:](\d{2})/);
      if (timeMatch) {
        const startTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
        const endTime = `${timeMatch[3].padStart(2, '0')}:${timeMatch[4]}`;
        const courseName = lines[i + 1] || 'Mata Kuliah Baru';
        const lecturer = lines[i + 2] || 'Dosen Pengampu';
        const room = lines[i + 3] || 'Ruang Kuliah';

        results.push({
          id: 'imported_' + Date.now() + '_' + i,
          name: courseName,
          lecturer: lecturer,
          day: currentDay,
          startTime,
          endTime,
          room,
          classInfo: 'Kelas Reguler',
          sks: '3',
          color: colors[results.length % colors.length],
        });

        i += 4;
        continue;
      }
      i++;
    }
  }

  // Fallback if unrecognizable
  if (results.length === 0) {
    results.push({
      id: 'imported_' + Date.now() + '_0',
      name: lines[0] || 'Pemrograman Mobile',
      lecturer: lines[1] || 'Dr. Budi',
      day: 'Senin',
      startTime: '08:00',
      endTime: '09:40',
      room: lines[2] || 'Lab 3',
      classInfo: 'Kelas A',
      sks: '3',
      color: colors[0],
    });
  }

  return results;
};

// =================================================================
// 3. MAIN APPLICATION COMPONENT
// =================================================================
export default function App() {
  // App Loading & Flow State
  const [isInitializing, setIsInitializing] = useState(true);
  const [authFlow, setAuthFlow] = useState('splash'); // 'splash' | 'login' | 'register' | 'authenticated'

  // User Session & Stored Data
  const [currentUser, setCurrentUser] = useState(null);
  const [registeredUsers, setRegisteredUsers] = useState([DEFAULT_USER]);
  const [courses, setCourses] = useState(SEED_COURSES);
  const [materials, setMaterials] = useState(SEED_MATERIALS);
  const [tasks, setTasks] = useState(SEED_TASKS);
  const [settings, setSettings] = useState({
    notifyBeforeClass: true,
    notifyTaskDeadline: true,
    notifyWeeklyReview: false,
  });

  // Navigation Tabs: 'Home' | 'Courses' | 'Materials' | 'Tasks' | 'Profile'
  const [currentTab, setCurrentTab] = useState('Home');
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // Authentication Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');

  // Course Modal Form (Add / Edit Manual)
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [courseModalMode, setCourseModalMode] = useState('add'); // 'add' | 'edit'
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [courseForm, setCourseForm] = useState({
    name: '',
    lecturer: '',
    day: 'Senin',
    startTime: '08:00',
    endTime: '09:40',
    room: '',
    classInfo: '',
  });

  // =================================================================
  // SMART SCHEDULE IMPORT STATES (5-STEP WORKFLOW)
  // =================================================================
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importStep, setImportStep] = useState('choose'); // 'choose' | 'processing' | 'review' | 'manual_paste'
  const [selectedFileMeta, setSelectedFileMeta] = useState(null);
  const [extractedCourses, setExtractedCourses] = useState([]);
  const [editingExtractedIndex, setEditingExtractedIndex] = useState(null);
  const [customScheduleText, setCustomScheduleText] = useState('');
  const [rawOcrText, setRawOcrText] = useState('');
  const [showRawEditor, setShowRawEditor] = useState(false);

  // Material Modal Form (Add / Edit)
  const [materialModalVisible, setMaterialModalVisible] = useState(false);
  const [materialModalMode, setMaterialModalMode] = useState('add'); // 'add' | 'edit'
  const [editingMaterialId, setEditingMaterialId] = useState(null);
  const [materialForm, setMaterialForm] = useState({
    courseId: '',
    meeting: '1',
    title: '',
    description: '',
    fileType: 'PDF',
    fileName: '',
  });

  // Task Modal Form (Add / Edit)
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState('add'); // 'add' | 'edit'
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    courseId: '',
    description: '',
    deadline: '',
    priority: 'Sedang',
  });

  // Profile Edit Modal
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    semester: '',
    major: '',
    university: '',
  });

  // Delete Confirmation Modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ type: '', id: '', title: '' });

  // Weekly Schedule Modal
  const [scheduleViewVisible, setScheduleViewVisible] = useState(false);

  // AI Study Assistant Modal
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [activeAiMaterial, setActiveAiMaterial] = useState(null);
  const [aiSubTab, setAiSubTab] = useState('summary'); // 'summary' | 'points' | 'quiz'
  const [isAiRegenerating, setIsAiRegenerating] = useState(false);
  const [revealedQuizIndex, setRevealedQuizIndex] = useState({});

  // Search & Filter States
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [materialCourseFilter, setMaterialCourseFilter] = useState('ALL');
  const [materialStatusFilter, setMaterialStatusFilter] = useState('ALL'); // 'ALL' | 'STUDIED' | 'UNSTUDIED'
  const [taskFilter, setTaskFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'COMPLETED'

  // Toast Feedback Message
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // =================================================================
  // 4. DATA PERSISTENCE: LOAD & SAVE (ASYNC STORAGE)
  // =================================================================
  useEffect(() => {
    loadAllPersistedData();
  }, []);

  const loadAllPersistedData = async () => {
    try {
      const [
        savedSession,
        savedUsers,
        savedCourses,
        savedMaterials,
        savedTasks,
        savedSettings,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SESSION),
        AsyncStorage.getItem(STORAGE_KEYS.USERS),
        AsyncStorage.getItem(STORAGE_KEYS.COURSES),
        AsyncStorage.getItem(STORAGE_KEYS.MATERIALS),
        AsyncStorage.getItem(STORAGE_KEYS.TASKS),
        AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
      ]);

      if (savedUsers) {
        setRegisteredUsers(JSON.parse(savedUsers));
      } else {
        setRegisteredUsers(DEMO_USERS);
      }

      if (savedCourses) {
        const parsed = JSON.parse(savedCourses);
        const migrated = parsed.map((c) => ({ ...c, userId: c.userId || 'usr_001' }));
        setCourses(migrated);
      } else {
        setCourses(SEED_COURSES);
      }

      if (savedMaterials) {
        const parsed = JSON.parse(savedMaterials);
        const migrated = parsed.map((m) => ({ ...m, userId: m.userId || 'usr_001' }));
        setMaterials(migrated);
      } else {
        setMaterials(SEED_MATERIALS);
      }

      if (savedTasks) {
        const parsed = JSON.parse(savedTasks);
        const migrated = parsed.map((t) => ({ ...t, userId: t.userId || 'usr_001' }));
        setTasks(migrated);
      } else {
        setTasks(SEED_TASKS);
      }

      if (savedSettings) setSettings(JSON.parse(savedSettings));

      if (savedSession) {
        const user = JSON.parse(savedSession);
        setCurrentUser(user);
        setAuthFlow('authenticated');
      } else {
        setAuthFlow('splash');
      }
    } catch (e) {
      console.log('Error loading data:', e);
      setAuthFlow('splash');
    } finally {
      setIsInitializing(false);
    }
  };

  // Save Helpers
  const persistSession = async (user) => {
    setCurrentUser(user);
    if (user) {
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.SESSION);
    }
  };

  const persistCourses = async (newCourses) => {
    setCourses(newCourses);
    await AsyncStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(newCourses));
  };

  const persistMaterials = async (newMaterials) => {
    setMaterials(newMaterials);
    await AsyncStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(newMaterials));
  };

  const persistTasks = async (newTasks) => {
    setTasks(newTasks);
    await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(newTasks));
  };

  const persistSettings = async (newSettings) => {
    setSettings(newSettings);
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
  };

  const persistUsers = async (newUsers) => {
    setRegisteredUsers(newUsers);
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(newUsers));
  };

  // =================================================================
  // 5. AUTHENTICATION LOGIC
  // =================================================================
  const handleLogin = async () => {
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Email dan password wajib diisi.');
      return;
    }

    const foundUser = registeredUsers.find(
      (u) =>
        u.email.toLowerCase() === loginEmail.trim().toLowerCase() &&
        u.password === loginPassword
    );

    if (foundUser) {
      await persistSession(foundUser);
      setLoginEmail('');
      setLoginPassword('');
      setAuthFlow('authenticated');
      showToast(`Selamat datang kembali, ${foundUser.name}! 👋`);
    } else {
      setLoginError('Email atau password tidak sesuai. Silakan coba lagi.');
    }
  };

  const handleRegister = async () => {
    setRegError('');
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim() || !regConfirmPassword.trim()) {
      setRegError('Semua kolom pendaftaran wajib diisi.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Konfirmasi password tidak cocok.');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Password minimal harus 6 karakter.');
      return;
    }

    const emailExists = registeredUsers.some(
      (u) => u.email.toLowerCase() === regEmail.trim().toLowerCase()
    );

    if (emailExists) {
      setRegError('Email sudah terdaftar. Silakan login.');
      return;
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      semester: 'Semester 1',
      major: 'Mahasiswa Baru',
      university: 'Universitas Muhammadiyah Malang',
    };

    const updatedUsers = [...registeredUsers, newUser];
    await persistUsers(updatedUsers);
    await persistSession(newUser);

    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirmPassword('');
    setAuthFlow('authenticated');
    showToast(`Akun berhasil dibuat! Halo, ${newUser.name} 🎉`);
  };

  const handleLogout = async () => {
    await persistSession(null);
    setCurrentTab('Home');
    setSelectedCourseId(null);
    setAuthFlow('login');
    showToast('Kamu telah berhasil logout.');
  };

  const handleFillDemoUserA = () => {
    setLoginEmail('keiji@webmail.umm.ac.id');
    setLoginPassword('password123');
    setLoginError('');
  };

  const handleFillDemoUserB = () => {
    setLoginEmail('bokuto@webmail.umm.ac.id');
    setLoginPassword('password123');
    setLoginError('');
  };

  // =================================================================
  // 10. PROFILE EDIT HANDLERS
  // =================================================================
  const openEditProfileModal = () => {
    if (!currentUser) return;
    setProfileForm({
      name: currentUser.name,
      email: currentUser.email,
      semester: currentUser.semester || '',
      major: currentUser.major || '',
      university: currentUser.university || '',
    });
    setProfileModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      showToast('Nama dan Email tidak boleh kosong');
      return;
    }

    const updatedUser = {
      ...currentUser,
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
      semester: profileForm.semester.trim(),
      major: profileForm.major.trim(),
      university: profileForm.university.trim(),
    };

    const updatedUsers = registeredUsers.map((u) =>
      u.id === currentUser.id ? updatedUser : u
    );

    await persistUsers(updatedUsers);
    await persistSession(updatedUser);
    setProfileModalVisible(false);
    showToast('Profil berhasil diperbarui! Nama telah disinkronkan.');
  };

  // =================================================================
  // 13. SCREEN RENDERING: AUTHENTICATION FLOW
  // =================================================================

  // SPLASH SCREEN
  if (authFlow === 'splash') {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
        <View style={styles.splashContent}>
          <View style={styles.splashLogoBox}>
            <Ionicons name="book-outline" size={54} color="#FFFFFF" />
          </View>
          <Text style={styles.splashBrand}>StudyMate</Text>
          <Text style={styles.splashTagline}>Personal Study Material Organizer</Text>
          <Text style={styles.splashDescription}>
            Kelola materi kuliah, ringkasan per pertemuan, tugas mandiri, dan jadwal pintar dalam satu tempat.
          </Text>

          <View style={styles.splashActions}>
            <TouchableOpacity
              style={styles.btnPrimaryLarge}
              onPress={() => setAuthFlow('login')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryLargeText}>Mulai Belajar Sekarang</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.splashRegisterLink}
              onPress={() => setAuthFlow('register')}
              activeOpacity={0.7}
            >
              <Text style={styles.splashRegisterText}>
                Belum punya akun? <Text style={{ fontWeight: '800', color: COLORS.primaryLight }}>Daftar Mahasiswa</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // LOGIN SCREEN
  if (authFlow === 'login') {
    return (
      <SafeAreaView style={styles.authContainerWhite}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ScrollView style={styles.authScroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.authBackHeader}
            onPress={() => setAuthFlow('splash')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
            <Text style={styles.authBackText}>Kembali</Text>
          </TouchableOpacity>

          <View style={styles.authHeaderBlock}>
            <View style={styles.authIconSmall}>
              <Ionicons name="school" size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.authTitle}>Masuk ke StudyMate</Text>
            <Text style={styles.authSubtitle}>
              Akses modul kuliah, materi per pertemuan, dan tugas akademikmu.
            </Text>
          </View>

          {loginError ? (
            <View style={styles.errorAlertBox}>
              <Ionicons name="alert-circle" size={18} color={COLORS.rose} />
              <Text style={styles.errorAlertText}>{loginError}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Email Mahasiswa</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.formInput}
                placeholder="nama@student.ac.id"
                placeholderTextColor={COLORS.textMuted}
                value={loginEmail}
                onChangeText={(text) => {
                  setLoginEmail(text);
                  setLoginError('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Password</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.formInput}
                placeholder="Masukkan kata sandi"
                placeholderTextColor={COLORS.textMuted}
                value={loginPassword}
                onChangeText={(text) => {
                  setLoginPassword(text);
                  setLoginError('');
                }}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.btnPrimaryLarge}
            onPress={handleLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryLargeText}>Masuk ke Akun</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 12, gap: 8 }}>
            <TouchableOpacity
              style={styles.demoFillButton}
              onPress={handleFillDemoUserA}
              activeOpacity={0.8}
            >
              <Ionicons name="person-circle-outline" size={16} color={COLORS.primary} />
              <Text style={styles.demoFillText}>Demo Akun A: Akaashi Keiji (Informatika)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoFillButton, { borderColor: COLORS.purple, backgroundColor: COLORS.purpleLight }]}
              onPress={handleFillDemoUserB}
              activeOpacity={0.8}
            >
              <Ionicons name="person-circle-outline" size={16} color={COLORS.purple} />
              <Text style={[styles.demoFillText, { color: COLORS.purple }]}>Demo Akun B: Bokuto Koutaro (Informatika)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.authFooterRow}>
            <Text style={styles.authFooterText}>Belum punya akun? </Text>
            <TouchableOpacity onPress={() => setAuthFlow('register')}>
              <Text style={styles.authFooterLink}>Daftar Sekarang</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // REGISTER SCREEN
  if (authFlow === 'register') {
    return (
      <SafeAreaView style={styles.authContainerWhite}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ScrollView style={styles.authScroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.authBackHeader}
            onPress={() => setAuthFlow('login')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
            <Text style={styles.authBackText}>Kembali ke Login</Text>
          </TouchableOpacity>

          <View style={styles.authHeaderBlock}>
            <Text style={styles.authTitle}>Buat Akun Baru</Text>
            <Text style={styles.authSubtitle}>
              Mulai atur materi perkuliahanmu secara terstruktur dan mandiri.
            </Text>
          </View>

          {regError ? (
            <View style={styles.errorAlertBox}>
              <Ionicons name="alert-circle" size={18} color={COLORS.rose} />
              <Text style={styles.errorAlertText}>{regError}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Nama Lengkap</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="person-outline" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.formInput}
                placeholder="Contoh: Akaashi Keiji"
                placeholderTextColor={COLORS.textMuted}
                value={regName}
                onChangeText={(text) => {
                  setRegName(text);
                  setRegError('');
                }}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Email</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.formInput}
                placeholder="email@student.ac.id"
                placeholderTextColor={COLORS.textMuted}
                value={regEmail}
                onChangeText={(text) => {
                  setRegEmail(text);
                  setRegError('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Password</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.formInput}
                placeholder="Minimal 6 karakter"
                placeholderTextColor={COLORS.textMuted}
                value={regPassword}
                onChangeText={(text) => {
                  setRegPassword(text);
                  setRegError('');
                }}
                secureTextEntry
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Konfirmasi Password</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.formInput}
                placeholder="Ketik ulang password"
                placeholderTextColor={COLORS.textMuted}
                value={regConfirmPassword}
                onChangeText={(text) => {
                  setRegConfirmPassword(text);
                  setRegError('');
                }}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.btnPrimaryLarge}
            onPress={handleRegister}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryLargeText}>Daftar Akun Mahasiswa</Text>
          </TouchableOpacity>

          <View style={styles.authFooterRow}>
            <Text style={styles.authFooterText}>Sudah punya akun? </Text>
            <TouchableOpacity onPress={() => setAuthFlow('login')}>
              <Text style={styles.authFooterLink}>Masuk di sini</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =================================================================
  // 18. SCREEN RENDERING: TAB 5 (PROFILE & SETTINGS)
  // =================================================================
  const renderProfileScreen = () => {
    return (
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarInitials}>
              {currentUser?.name
                ? currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2)
                : 'SM'}
            </Text>
          </View>
          <Text style={styles.profileName}>{currentUser?.name || 'Mahasiswa'}</Text>
          <Text style={styles.profileEmail}>{currentUser?.email || ''}</Text>
          <Text style={styles.profileMajor}>
            {currentUser?.major} • {currentUser?.semester}
          </Text>
          <Text style={styles.profileUniversity}>{currentUser?.university}</Text>

          <TouchableOpacity
            style={styles.btnEditProfile}
            onPress={openEditProfileModal}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil-outline" size={15} color={COLORS.primary} />
            <Text style={styles.btnEditProfileText}>Edit Informasi Profil</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Statistik Belajar Pribadi</Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalUserCourses}</Text>
            <Text style={styles.statLabel}>Total Mata Kuliah</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalUserMaterials}</Text>
            <Text style={styles.statLabel}>Total Materi</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {totalUserMaterials > 0 ? `${studiedMaterialsCount} / ${totalUserMaterials}` : '0 / 0'}
            </Text>
            <Text style={styles.statLabel}>Materi Dipelajari</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {totalUserTasks > 0 ? `${completedTasksCount} / ${totalUserTasks}` : '0 / 0'}
            </Text>
            <Text style={styles.statLabel}>Tugas Selesai</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Pengaturan Notifikasi Pintar</Text>
        </View>

        <View style={styles.notificationSettingsCard}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={styles.settingTitle}>Ingatkan Materi Sebelum Kuliah</Text>
              <Text style={styles.settingDesc}>
                Kirim pengingat untuk mengulang materi pertemuan sebelum kelas dimulai
              </Text>
            </View>
            <Switch
              value={settings.notifyBeforeClass}
              onValueChange={(val) => {
                const s = { ...settings, notifyBeforeClass: val };
                persistSettings(s);
                showToast(val ? 'Pengingat materi diaktifkan 🔔' : 'Pengingat materi dimatikan');
              }}
              thumbColor={settings.notifyBeforeClass ? COLORS.primary : '#F4F3F4'}
              trackColor={{ false: '#CBD5E1', true: COLORS.primaryLight }}
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={styles.settingTitle}>Reminder Deadline Tugas</Text>
              <Text style={styles.settingDesc}>
                Pengingat berkala untuk tugas yang mendekati tenggat waktu
              </Text>
            </View>
            <Switch
              value={settings.notifyTaskDeadline}
              onValueChange={(val) => {
                const s = { ...settings, notifyTaskDeadline: val };
                persistSettings(s);
                showToast(val ? 'Reminder tugas diaktifkan ⏰' : 'Reminder tugas dimatikan');
              }}
              thumbColor={settings.notifyTaskDeadline ? COLORS.primary : '#F4F3F4'}
              trackColor={{ false: '#CBD5E1', true: COLORS.primaryLight }}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.btnLogout}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.rose} />
          <Text style={styles.btnLogoutText}>Keluar dari Akun (Logout)</Text>
        </TouchableOpacity>

        <View style={{ height: 110 }} />
      </ScrollView>
    );
  };

  // =================================================================
  // 19. MAIN APP RETURN WITH BOTTOM TABS & MODALS
  // =================================================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Main Screen Router */}
      <View style={styles.mainContainer}>
        {currentTab === 'Home' && renderHomeScreen()}
        {currentTab === 'Courses' && renderCoursesScreen()}
        {currentTab === 'Materials' && renderMaterialsScreen()}
        {currentTab === 'Tasks' && renderTasksScreen()}
        {currentTab === 'Profile' && renderProfileScreen()}
      </View>

      {/* Instant Toast */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Ionicons name="information-circle" size={18} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavContainer}>
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => {
            setSelectedCourseId(null);
            setCurrentTab('Home');
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'Home' ? 'home' : 'home-outline'}
            size={22}
            color={currentTab === 'Home' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.navLabel, currentTab === 'Home' && styles.navLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => {
            setSelectedCourseId(null);
            setCurrentTab('Courses');
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'Courses' ? 'grid' : 'grid-outline'}
            size={22}
            color={currentTab === 'Courses' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.navLabel, currentTab === 'Courses' && styles.navLabelActive]}>
            Courses
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => {
            setSelectedCourseId(null);
            setCurrentTab('Materials');
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'Materials' ? 'book' : 'book-outline'}
            size={22}
            color={currentTab === 'Materials' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.navLabel, currentTab === 'Materials' && styles.navLabelActive]}>
            Materials
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => {
            setSelectedCourseId(null);
            setCurrentTab('Tasks');
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'Tasks' ? 'checkbox' : 'checkbox-outline'}
            size={22}
            color={currentTab === 'Tasks' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.navLabel, currentTab === 'Tasks' && styles.navLabelActive]}>
            Tasks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => {
            setSelectedCourseId(null);
            setCurrentTab('Profile');
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'Profile' ? 'person' : 'person-outline'}
            size={22}
            color={currentTab === 'Profile' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.navLabel, currentTab === 'Profile' && styles.navLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* ============================================================= */}
      {/* MODAL 1: SMART SCHEDULE IMPORT & REVIEW (CORE OCR WORKFLOW)    */}
      {/* ============================================================= */}
      <Modal
        visible={importModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.importModalContent}>
            <View style={styles.formModalHeader}>
              <View>
                <Text style={styles.formModalTitle}>
                  {importStep === 'review' ? 'Review & Koreksi Jadwal' : 'Import Jadwal Kuliah'}
                </Text>
                <Text style={styles.formModalSubTitle}>
                  {importStep === 'review'
                    ? 'Periksa dan edit hasil deteksi sebelum disimpan ke mata kuliah'
                    : 'Pindai screenshot InfoKHS, foto jadwal, atau PDF KRS'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setImportModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* STEP 2: CHOOSE SOURCE / OPTIONS */}
            {importStep === 'choose' && (
              <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.importSectionTitle}>Pilih Metode Unggah:</Text>

                {/* Option 1: Screenshot / Image from Gallery */}
                <TouchableOpacity
                  style={styles.importOptionCard}
                  onPress={handlePickScheduleImage}
                  activeOpacity={0.8}
                >
                  <View style={[styles.importOptionIconWrap, { backgroundColor: COLORS.primaryLight }]}>
                    <Ionicons name="image-outline" size={24} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.importOptionName}>Upload Screenshot / Galeri</Text>
                    <Text style={styles.importOptionDesc}>Pilih tangkapan layar InfoKHS / portal kampus dari HP</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                {/* Option 2: Take Photo */}
                <TouchableOpacity
                  style={styles.importOptionCard}
                  onPress={handleTakePhotoSchedule}
                  activeOpacity={0.8}
                >
                  <View style={[styles.importOptionIconWrap, { backgroundColor: COLORS.purpleLight }]}>
                    <Ionicons name="camera-outline" size={24} color={COLORS.purple} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.importOptionName}>Ambil Foto (Kamera)</Text>
                    <Text style={styles.importOptionDesc}>Foto langsung lembar jadwal cetak atau layar laptop</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                {/* Option 3: Upload PDF */}
                <TouchableOpacity
                  style={styles.importOptionCard}
                  onPress={handlePickSchedulePDF}
                  activeOpacity={0.8}
                >
                  <View style={[styles.importOptionIconWrap, { backgroundColor: COLORS.roseLight }]}>
                    <Ionicons name="document-text-outline" size={24} color={COLORS.rose} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.importOptionName}>Upload Dokumen PDF</Text>
                    <Text style={styles.importOptionDesc}>Pilih file dokumen PDF KRS dari penyimpanan</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                {/* Preset Testing & Text Pasting Section */}
                <View style={styles.importDivider} />
                <Text style={styles.importSectionTitle}>Atau Gunakan Template Demo / Ketik Teks:</Text>

                {SAMPLE_SCHEDULE_TEMPLATES.map((tmpl, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.templateOptionBtn}
                    onPress={() => handleSelectTemplate(tmpl)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="flash-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.templateOptionText}>{tmpl.label}</Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={styles.manualPasteToggleBtn}
                  onPress={() => setImportStep('manual_paste')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="clipboard-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.manualPasteToggleText}>Tempel / Ketik Teks Jadwal Sendiri</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* STEP 2B: MANUAL PASTE TEXT */}
            {importStep === 'manual_paste' && (
              <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Tempel / Ketik Teks Jadwal Kuliah:</Text>
                <TextInput
                  style={[styles.modalTextInput, { height: 160, textAlignVertical: 'top', paddingTop: 10 }]}
                  placeholder={`Contoh format:\nSenin | 08:00 - 09:40 | Mobile Programming | Dr. Budi | Lab 3\n\natau:\nMonday\n08:00 - 09:40\nMobile Programming\nDr. Budi\nLab 3`}
                  placeholderTextColor={COLORS.textMuted}
                  value={customScheduleText}
                  onChangeText={setCustomScheduleText}
                  multiline
                />

                <View style={styles.modalFooterActions}>
                  <TouchableOpacity
                    style={styles.btnSecondaryModal}
                    onPress={() => setImportStep('choose')}
                  >
                    <Text style={styles.btnSecondaryModalText}>Kembali</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnPrimaryModal}
                    onPress={() => {
                      if (!customScheduleText.trim()) {
                        showToast('Silakan tempel teks jadwal terlebih dahulu');
                        return;
                      }
                      processAndReviewExtractedText(customScheduleText, 'Teks Manual');
                    }}
                  >
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                    <Text style={styles.btnPrimaryModalText}>Ekstrak Jadwal</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {/* STEP 3: PROCESSING SKELETON */}
            {importStep === 'processing' && (
              <View style={styles.importProcessingWrap}>
                <ActivityIndicator size="large" color={COLORS.purple} />
                <Text style={styles.importProcessingTitle}>Menganalisis & Mengekstrak Jadwal...</Text>
                <Text style={styles.importProcessingSub}>
                  Mengidentifikasi nama mata kuliah, dosen pengampu, hari, jam perkuliahan, dan ruangan...
                </Text>
              </View>
            )}

            {/* STEP 4: REVIEW SCHEDULE (EDIT & CONFIRM BEFORE SAVE) */}
            {importStep === 'review' && (
              <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
                <View style={styles.reviewSourceHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.emerald} />
                    <Text style={[styles.reviewSourceText, { flex: 1, marginLeft: 6 }]}>
                      {selectedFileMeta || 'Hasil Deteksi Jadwal'} ({extractedCourses.length} Terdeteksi)
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.btnAddRowSmall}
                    onPress={handleAddEmptyExtractedCourse}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color={COLORS.primary} />
                    <Text style={styles.btnAddRowSmallText}>Tambah Matkul</Text>
                  </TouchableOpacity>
                </View>

                {/* Raw OCR Text Toggle & Inspector */}
                {rawOcrText ? (
                  <View style={styles.rawOcrToggleWrap}>
                    <TouchableOpacity
                      style={styles.rawOcrToggleBtn}
                      onPress={() => setShowRawEditor(!showRawEditor)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={showRawEditor ? 'chevron-up' : 'code-working'} size={15} color={COLORS.textSecondary} />
                      <Text style={styles.rawOcrToggleText}>
                        {showRawEditor ? 'Sembunyikan Teks OCR' : 'Lihat / Edit Teks Mentah OCR'}
                      </Text>
                    </TouchableOpacity>

                    {showRawEditor && (
                      <View style={styles.rawOcrBox}>
                        <TextInput
                          style={styles.rawOcrInput}
                          value={rawOcrText}
                          onChangeText={setRawOcrText}
                          multiline
                          placeholder="Teks hasil scan OCR..."
                        />
                        <TouchableOpacity
                          style={styles.btnReparseOcr}
                          onPress={() => {
                            const reparsed = parseScheduleText(rawOcrText);
                            setExtractedCourses(reparsed);
                            showToast(`🔄 Berhasil diparse ulang: ${reparsed.length} mata kuliah!`);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="refresh" size={14} color="#FFFFFF" />
                          <Text style={styles.btnReparseOcrText}>Ekstrak Ulang Dari Teks</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : null}

                {extractedCourses.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <Ionicons name="alert-circle-outline" size={36} color={COLORS.textMuted} />
                    <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                      Belum ada mata kuliah yang terdeteksi.{'\n'}Tekan "Tambah Matkul" di atas untuk menambah manual.
                    </Text>
                  </View>
                ) : null}

                {extractedCourses.map((item, index) => (
                  <View key={item.id || index} style={styles.reviewCourseCard}>
                    <View style={styles.reviewCardTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.reviewDot, { backgroundColor: item.color || COLORS.primary }]} />
                        <View style={styles.reviewBadge}>
                          <Text style={styles.reviewBadgeText}>Mata Kuliah #{index + 1}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteExtractedItem(index)}
                        style={styles.btnReviewDelete}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.rose} />
                      </TouchableOpacity>
                    </View>

                    {/* Editable Course Name */}
                    <Text style={styles.reviewFieldLabel}>Nama Mata Kuliah *</Text>
                    <TextInput
                      style={styles.reviewInput}
                      value={item.name}
                      onChangeText={(t) => handleUpdateExtractedField(index, 'name', t)}
                      placeholder="Contoh: Pemrograman Fungsional"
                    />

                    {/* Editable Lecturer */}
                    <Text style={styles.reviewFieldLabel}>Nama Dosen Pengampu</Text>
                    <TextInput
                      style={styles.reviewInput}
                      value={item.lecturer}
                      onChangeText={(t) => handleUpdateExtractedField(index, 'lecturer', t)}
                      placeholder="Contoh: Fera Putri Ayu Lestari, S.Kom., M.T."
                    />

                    {/* Editable Day */}
                    <Text style={styles.reviewFieldLabel}>Hari Perkuliahan</Text>
                    <View style={styles.reviewDayRow}>
                      {SCHEDULE_DAYS.map((d) => (
                        <TouchableOpacity
                          key={d}
                          style={[
                            styles.reviewDayChip,
                            item.day === d && styles.reviewDayChipActive,
                          ]}
                          onPress={() => handleUpdateExtractedField(index, 'day', d)}
                        >
                          <Text
                            style={[
                              styles.reviewDayChipText,
                              item.day === d && styles.reviewDayChipTextActive,
                            ]}
                          >
                            {d}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Editable Times */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewFieldLabel}>Jam Mulai</Text>
                        <TextInput
                          style={styles.reviewInput}
                          value={item.startTime}
                          onChangeText={(t) => handleUpdateExtractedField(index, 'startTime', t)}
                          placeholder="15:30"
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewFieldLabel}>Jam Selesai</Text>
                        <TextInput
                          style={styles.reviewInput}
                          value={item.endTime}
                          onChangeText={(t) => handleUpdateExtractedField(index, 'endTime', t)}
                          placeholder="17:10"
                        />
                      </View>
                    </View>

                    {/* Editable Room & Class / Info */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewFieldLabel}>Ruang Kuliah</Text>
                        <TextInput
                          style={styles.reviewInput}
                          value={item.room}
                          onChangeText={(t) => handleUpdateExtractedField(index, 'room', t)}
                          placeholder="612 (GKB III)"
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewFieldLabel}>Kelas / Info</Text>
                        <TextInput
                          style={styles.reviewInput}
                          value={item.classInfo}
                          onChangeText={(t) => handleUpdateExtractedField(index, 'classInfo', t)}
                          placeholder="Kelas F"
                        />
                      </View>
                    </View>
                  </View>
                ))}

                {/* Step 5 Action Buttons */}
                <View style={[styles.modalFooterActions, { marginTop: 16 }]}>
                  <TouchableOpacity
                    style={styles.btnSecondaryModal}
                    onPress={() => setImportStep('choose')}
                  >
                    <Text style={styles.btnSecondaryModalText}>Pindai Ulang</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnPrimaryModal, { backgroundColor: COLORS.purple }]}
                    onPress={handleSaveReviewedSchedule}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                    <Text style={styles.btnPrimaryModalText}>
                      Simpan Jadwal ({extractedCourses.length} Matkul)
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 2: ADD / EDIT COURSE MANUAL                             */}
      {/* ============================================================= */}
      <Modal
        visible={courseModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCourseModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.formModalContent}>
            <View style={styles.formModalHeader}>
              <Text style={styles.formModalTitle}>
                {courseModalMode === 'add' ? 'Tambah Mata Kuliah Manual' : 'Edit Mata Kuliah'}
              </Text>
              <TouchableOpacity onPress={() => setCourseModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nama Mata Kuliah *</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Contoh: Mobile Programming"
                placeholderTextColor={COLORS.textMuted}
                value={courseForm.name}
                onChangeText={(t) => setCourseForm({ ...courseForm, name: t })}
              />

              <Text style={styles.inputLabel}>Nama Dosen Pengampu *</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Contoh: Dr. Budi"
                placeholderTextColor={COLORS.textMuted}
                value={courseForm.lecturer}
                onChangeText={(t) => setCourseForm({ ...courseForm, lecturer: t })}
              />

              <Text style={styles.inputLabel}>Hari Perkuliahan</Text>
              <View style={styles.daySelectorRow}>
                {SCHEDULE_DAYS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.daySelectorChip,
                      courseForm.day === d && styles.daySelectorChipActive,
                    ]}
                    onPress={() => setCourseForm({ ...courseForm, day: d })}
                  >
                    <Text
                      style={[
                        styles.daySelectorChipText,
                        courseForm.day === d && styles.daySelectorChipTextActive,
                      ]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Jam Mulai</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="08:00"
                    placeholderTextColor={COLORS.textMuted}
                    value={courseForm.startTime}
                    onChangeText={(t) => setCourseForm({ ...courseForm, startTime: t })}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Jam Selesai</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="09:40"
                    placeholderTextColor={COLORS.textMuted}
                    value={courseForm.endTime}
                    onChangeText={(t) => setCourseForm({ ...courseForm, endTime: t })}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Ruangan / Lokasi *</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Contoh: Lab 3 / Ruang 402"
                placeholderTextColor={COLORS.textMuted}
                value={courseForm.room}
                onChangeText={(t) => setCourseForm({ ...courseForm, room: t })}
              />

              <Text style={styles.inputLabel}>Informasi Tambahan / SKS (Opsional)</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Contoh: Kelas A • 3 SKS"
                placeholderTextColor={COLORS.textMuted}
                value={courseForm.classInfo}
                onChangeText={(t) => setCourseForm({ ...courseForm, classInfo: t })}
              />
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={styles.btnSecondaryModal}
                onPress={() => setCourseModalVisible(false)}
              >
                <Text style={styles.btnSecondaryModalText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnPrimaryModal}
                onPress={handleSaveCourse}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.btnPrimaryModalText}>
                  {courseModalMode === 'add' ? 'Simpan Matkul' : 'Simpan Perubahan'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 3: ADD / EDIT MATERIAL                                  */}
      {/* ============================================================= */}
      <Modal
        visible={materialModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMaterialModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.formModalContent}>
            <View style={styles.formModalHeader}>
              <Text style={styles.formModalTitle}>
                {materialModalMode === 'add' ? 'Unggah Materi Kuliah' : 'Edit Materi Kuliah'}
              </Text>
              <TouchableOpacity onPress={() => setMaterialModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Pilih Mata Kuliah *</Text>
              <View style={styles.courseSelectRow}>
                {courses.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.courseSelectChip,
                      materialForm.courseId === c.id && styles.courseSelectChipActive,
                    ]}
                    onPress={() => setMaterialForm({ ...materialForm, courseId: c.id })}
                  >
                    <Text
                      style={[
                        styles.courseSelectChipText,
                        materialForm.courseId === c.id && styles.courseSelectChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Pertemuan Ke- *</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="Contoh: 4"
                    placeholderTextColor={COLORS.textMuted}
                    value={materialForm.meeting}
                    onChangeText={(t) => setMaterialForm({ ...materialForm, meeting: t })}
                    keyboardType="numeric"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Format Dokumen</Text>
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                    {['PDF', 'PPT', 'DOC'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.fileTypeChip,
                          materialForm.fileType === type && styles.fileTypeChipActive,
                        ]}
                        onPress={() => setMaterialForm({ ...materialForm, fileType: type })}
                      >
                        <Text
                          style={[
                            styles.fileTypeChipText,
                            materialForm.fileType === type && styles.fileTypeChipTextActive,
                          ]}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>Judul Materi / Topik Kuliah *</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Contoh: Activity Lifecycle"
                placeholderTextColor={COLORS.textMuted}
                value={materialForm.title}
                onChangeText={(t) => setMaterialForm({ ...materialForm, title: t })}
              />

              <Text style={styles.inputLabel}>Deskripsi / Catatan Singkat</Text>
              <TextInput
                style={[styles.modalTextInput, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                placeholder="Tuliskan gambaran materi atau catatan penting..."
                placeholderTextColor={COLORS.textMuted}
                value={materialForm.description}
                onChangeText={(t) => setMaterialForm({ ...materialForm, description: t })}
                multiline
              />

              <Text style={styles.inputLabel}>Nama File Dokumen</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Contoh: activity-lifecycle.pdf"
                placeholderTextColor={COLORS.textMuted}
                value={materialForm.fileName}
                onChangeText={(t) => setMaterialForm({ ...materialForm, fileName: t })}
              />
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={styles.btnSecondaryModal}
                onPress={() => setMaterialModalVisible(false)}
              >
                <Text style={styles.btnSecondaryModalText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnPrimaryModal}
                onPress={handleSaveMaterial}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.btnPrimaryModalText}>
                  {materialModalMode === 'add' ? 'Simpan Materi' : 'Perbarui Materi'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 4: ADD / EDIT TASK                                      */}
      {/* ============================================================= */}
      <Modal
        visible={taskModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTaskModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.formModalContent}>
            <View style={styles.formModalHeader}>
              <Text style={styles.formModalTitle}>
                {taskModalMode === 'add' ? 'Tambah Tugas Baru' : 'Edit Tugas'}
              </Text>
              <TouchableOpacity onPress={() => setTaskModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Judul Tugas *</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Contoh: Create Android UI"
                placeholderTextColor={COLORS.textMuted}
                value={taskForm.title}
                onChangeText={(t) => setTaskForm({ ...taskForm, title: t })}
              />

              <Text style={styles.inputLabel}>Mata Kuliah Terkait</Text>
              <View style={styles.courseSelectRow}>
                {courses.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.courseSelectChip,
                      taskForm.courseId === c.id && styles.courseSelectChipActive,
                    ]}
                    onPress={() => setTaskForm({ ...taskForm, courseId: c.id })}
                  >
                    <Text
                      style={[
                        styles.courseSelectChipText,
                        taskForm.courseId === c.id && styles.courseSelectChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Tenggat Waktu / Deadline</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Contoh: 30 September 2026, 23:59"
                placeholderTextColor={COLORS.textMuted}
                value={taskForm.deadline}
                onChangeText={(t) => setTaskForm({ ...taskForm, deadline: t })}
              />

              <Text style={styles.inputLabel}>Prioritas Tugas</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                {['Tinggi', 'Sedang', 'Rendah'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.prioritySelectorChip,
                      taskForm.priority === p && styles.prioritySelectorChipActive,
                    ]}
                    onPress={() => setTaskForm({ ...taskForm, priority: p })}
                  >
                    <Text
                      style={[
                        styles.prioritySelectorChipText,
                        taskForm.priority === p && styles.prioritySelectorChipTextActive,
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Deskripsi Tugas (Opsional)</Text>
              <TextInput
                style={[styles.modalTextInput, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                placeholder="Catatan petunjuk pengerjaan..."
                placeholderTextColor={COLORS.textMuted}
                value={taskForm.description}
                onChangeText={(t) => setTaskForm({ ...taskForm, description: t })}
                multiline
              />
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={styles.btnSecondaryModal}
                onPress={() => setTaskModalVisible(false)}
              >
                <Text style={styles.btnSecondaryModalText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnPrimaryModal}
                onPress={handleSaveTask}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.btnPrimaryModalText}>
                  {taskModalMode === 'add' ? 'Simpan Tugas' : 'Perbarui Tugas'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 5: EDIT USER PROFILE                                    */}
      {/* ============================================================= */}
      <Modal
        visible={profileModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.formModalContent}>
            <View style={styles.formModalHeader}>
              <Text style={styles.formModalTitle}>Edit Profil Mahasiswa</Text>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nama Lengkap *</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Nama Mahasiswa"
                placeholderTextColor={COLORS.textMuted}
                value={profileForm.name}
                onChangeText={(t) => setProfileForm({ ...profileForm, name: t })}
              />

              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Email Akun"
                placeholderTextColor={COLORS.textMuted}
                value={profileForm.email}
                onChangeText={(t) => setProfileForm({ ...profileForm, email: t })}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Semester</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Contoh: Semester 5"
                placeholderTextColor={COLORS.textMuted}
                value={profileForm.semester}
                onChangeText={(t) => setProfileForm({ ...profileForm, semester: t })}
              />

              <Text style={styles.inputLabel}>Program Studi / Jurusan</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Contoh: S1 Teknik Informatika"
                placeholderTextColor={COLORS.textMuted}
                value={profileForm.major}
                onChangeText={(t) => setProfileForm({ ...profileForm, major: t })}
              />

              <Text style={styles.inputLabel}>Perguruan Tinggi</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Contoh: Universitas Indonesia"
                placeholderTextColor={COLORS.textMuted}
                value={profileForm.university}
                onChangeText={(t) => setProfileForm({ ...profileForm, university: t })}
              />
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={styles.btnSecondaryModal}
                onPress={() => setProfileModalVisible(false)}
              >
                <Text style={styles.btnSecondaryModalText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnPrimaryModal}
                onPress={handleSaveProfile}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.btnPrimaryModalText}>Simpan Perubahan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 6: DELETE CONFIRMATION                                  */}
      {/* ============================================================= */}
      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalBackdropCenter}>
          <View style={styles.deleteConfirmBox}>
            <View style={styles.deleteIconWrap}>
              <Ionicons name="trash-outline" size={32} color={COLORS.rose} />
            </View>
            <Text style={styles.deleteConfirmTitle}>Konfirmasi Hapus</Text>
            <Text style={styles.deleteConfirmSub}>
              Apakah kamu yakin ingin menghapus {deleteTarget.type === 'course' ? 'mata kuliah' : deleteTarget.type === 'material' ? 'materi' : 'tugas'}:
            </Text>
            <Text style={styles.deleteConfirmTargetName} numberOfLines={2}>
              "{deleteTarget.title}"
            </Text>

            <View style={styles.deleteConfirmActions}>
              <TouchableOpacity
                style={styles.btnCancelDelete}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.btnCancelDeleteText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnConfirmDelete}
                onPress={() => {
                  if (deleteTarget.type === 'course') executeDeleteCourse();
                  else if (deleteTarget.type === 'material') executeDeleteMaterial();
                  else if (deleteTarget.type === 'task') executeDeleteTask();
                }}
              >
                <Text style={styles.btnConfirmDeleteText}>Ya, Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 7: WEEKLY SCHEDULE VIEW                                 */}
      {/* ============================================================= */}
      <Modal
        visible={scheduleViewVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setScheduleViewVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.formModalContent}>
            <View style={styles.formModalHeader}>
              <View>
                <Text style={styles.formModalTitle}>Jadwal Kuliah Mingguan</Text>
                <Text style={styles.formModalSubTitle}>
                  Tersusun otomatis dari seluruh mata kuliah aktifmu
                </Text>
              </View>
              <TouchableOpacity onPress={() => setScheduleViewVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {SCHEDULE_DAYS.map((dayName) => {
                const dayCourses = userCourses.filter(
                  (c) => c.day.toLowerCase() === dayName.toLowerCase()
                );
                return (
                  <View key={dayName} style={styles.scheduleDayCard}>
                    <View style={styles.scheduleDayHeader}>
                      <Text style={styles.scheduleDayTitle}>{dayName}</Text>
                      <Text style={styles.scheduleDayCount}>{dayCourses.length} matkul</Text>
                    </View>

                    {dayCourses.length === 0 ? (
                      <Text style={styles.scheduleDayEmpty}>Tidak ada jadwal kuliah di hari ini.</Text>
                    ) : (
                      dayCourses.map((c) => (
                        <View key={c.id} style={styles.scheduleCourseRow}>
                          <View style={[styles.scheduleTimeBar, { backgroundColor: c.color }]} />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.scheduleCourseName}>{c.name}</Text>
                            <Text style={styles.scheduleCourseMeta}>
                              ⏰ {c.startTime} - {c.endTime} • 📍 {c.room}
                            </Text>
                            <Text style={styles.scheduleCourseLecturer}>👨‍🏫 {c.lecturer}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={styles.btnPrimaryModal}
                onPress={() => setScheduleViewVisible(false)}
              >
                <Text style={styles.btnPrimaryModalText}>Tutup Jadwal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 8: AI STUDY ASSISTANT (SUMMARY, POINTS, QUIZ)           */}
      {/* ============================================================= */}
      <Modal
        visible={aiModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAiModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.aiModalContent}>
            <View style={styles.aiModalHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={styles.aiHeaderBadge}>
                  <Ionicons name="sparkles" size={14} color={COLORS.primary} />
                  <Text style={styles.aiHeaderBadgeText}>AI STUDY ASSISTANT</Text>
                </View>
                <Text style={styles.aiModalTitle} numberOfLines={2}>
                  {activeAiMaterial?.title}
                </Text>
                <Text style={styles.aiModalSub}>
                  {activeAiMaterial?.courseName} • Pertemuan {activeAiMaterial?.meeting}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setAiModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.aiSubTabRow}>
              <TouchableOpacity
                style={[styles.aiSubTabBtn, aiSubTab === 'summary' && styles.aiSubTabBtnActive]}
                onPress={() => setAiSubTab('summary')}
              >
                <Text
                  style={[
                    styles.aiSubTabText,
                    aiSubTab === 'summary' && styles.aiSubTabTextActive,
                  ]}
                >
                  Ringkasan
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.aiSubTabBtn, aiSubTab === 'points' && styles.aiSubTabBtnActive]}
                onPress={() => setAiSubTab('points')}
              >
                <Text
                  style={[
                    styles.aiSubTabText,
                    aiSubTab === 'points' && styles.aiSubTabTextActive,
                  ]}
                >
                  Poin Penting
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.aiSubTabBtn, aiSubTab === 'quiz' && styles.aiSubTabBtnActive]}
                onPress={() => setAiSubTab('quiz')}
              >
                <Text
                  style={[
                    styles.aiSubTabText,
                    aiSubTab === 'quiz' && styles.aiSubTabTextActive,
                  ]}
                >
                  Latihan & Kuis
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.aiBodyScroll} showsVerticalScrollIndicator={false}>
              {isAiRegenerating ? (
                <View style={styles.aiLoadingWrap}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.aiLoadingText}>
                    AI sedang menganalisis materi dan menyusun kembali poin-poin utama...
                  </Text>
                </View>
              ) : (
                <>
                  {aiSubTab === 'summary' && (
                    <View style={styles.aiSection}>
                      <View style={styles.aiInfoPill}>
                        <Ionicons name="time-outline" size={15} color={COLORS.primary} />
                        <Text style={styles.aiInfoPillText}>
                          Estimasi membaca: ~3 menit • Dokumen perkuliahan
                        </Text>
                      </View>
                      <Text style={styles.aiSummaryParagraph}>
                        {activeAiMaterial?.summary || activeAiMaterial?.description}
                      </Text>

                      <View style={styles.aiTipBox}>
                        <Ionicons name="bulb-outline" size={18} color={COLORS.amber} />
                        <Text style={styles.aiTipText}>
                          Tips Belajar: Baca poin-poin penting di tab berikutnya untuk mengingat
                          istilah teknis menjelang ujian tengah semester!
                        </Text>
                      </View>
                    </View>
                  )}

                  {aiSubTab === 'points' && (
                    <View style={styles.aiSection}>
                      <Text style={styles.aiSectionTitle}>Takeaway Utama yang Harus Dipahami:</Text>
                      {activeAiMaterial?.keyPoints?.map((pt, index) => (
                        <View key={index} style={styles.keyPointItem}>
                          <View style={styles.keyPointBullet}>
                            <Text style={styles.keyPointBulletText}>{index + 1}</Text>
                          </View>
                          <Text style={styles.keyPointText}>{pt}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {aiSubTab === 'quiz' && (
                    <View style={styles.aiSection}>
                      <Text style={styles.aiSectionTitle}>
                        Uji Pemahamanmu Terhadap Materi Ini:
                      </Text>

                      {activeAiMaterial?.quiz?.map((q, idx) => {
                        const isRevealed = revealedQuizIndex[idx];
                        return (
                          <View key={idx} style={styles.quizCard}>
                            <View style={styles.quizTop}>
                              <View style={styles.quizBadge}>
                                <Text style={styles.quizBadgeText}>Pertanyaan #{idx + 1}</Text>
                              </View>
                            </View>
                            <Text style={styles.quizQuestion}>{q.question}</Text>

                            {isRevealed ? (
                              <View style={styles.quizAnswerBox}>
                                <Text style={styles.quizAnswerLabel}>Kunci Jawaban & Penjelasan:</Text>
                                <Text style={styles.quizAnswerText}>{q.answer}</Text>
                              </View>
                            ) : null}

                            <TouchableOpacity
                              style={styles.quizRevealBtn}
                              onPress={() =>
                                setRevealedQuizIndex((prev) => ({
                                  ...prev,
                                  [idx]: !prev[idx],
                                }))
                              }
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={isRevealed ? 'eye-off-outline' : 'eye-outline'}
                                size={15}
                                color={COLORS.primary}
                              />
                              <Text style={styles.quizRevealBtnText}>
                                {isRevealed ? 'Sembunyikan Jawaban' : 'Buka Kunci Jawaban'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              )}
              <View style={{ height: 30 }} />
            </ScrollView>

            <View style={styles.aiModalFooter}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={handleRegenerateAi}
                disabled={isAiRegenerating}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={16} color={COLORS.primary} />
                <Text style={styles.btnSecondaryText}>Ringkas Ulang</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  activeAiMaterial?.isStudied && { backgroundColor: COLORS.emerald },
                ]}
                onPress={() => {
                  if (activeAiMaterial) {
                    toggleMaterialStudied(activeAiMaterial.id);
                    setActiveAiMaterial((prev) => ({ ...prev, isStudied: !prev.isStudied }));
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={activeAiMaterial?.isStudied ? 'checkmark-circle' : 'checkmark'}
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.btnPrimaryText}>
                  {activeAiMaterial?.isStudied ? 'Sudah Dipelajari' : 'Tandai Selesai'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =================================================================
// 20. STYLESHEET (CLEAN, STUDENT-FRIENDLY & ACCESSIBLE)
// =================================================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mainContainer: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Splash Screen Styles
  authContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  splashContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  splashLogoBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
  },
  splashBrand: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  splashTagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 16,
  },
  splashDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 40,
  },
  splashActions: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  btnPrimaryLarge: {
    width: '100%',
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  btnPrimaryLargeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  splashRegisterLink: {
    paddingVertical: 8,
  },
  splashRegisterText: {
    color: '#FFFFFF',
    fontSize: 13,
  },

  // Auth Pages (Login & Register)
  authContainerWhite: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  authScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  authBackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    marginTop: 4,
  },
  authBackText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  authHeaderBlock: {
    marginBottom: 24,
  },
  authIconSmall: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  authTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  authSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  errorAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.roseLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorAlertText: {
    flex: 1,
    color: COLORS.rose,
    fontSize: 12,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  formInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  demoFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
    gap: 6,
  },
  demoFillText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  authFooterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  authFooterText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  authFooterLink: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },

  // Home Screen
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  greetingSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  greetingMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  homeHeaderRight: {
    alignItems: 'flex-end',
  },
  todayDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  todayDateBadgeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Upcoming Highlight Card
  upcomingCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    elevation: 4,
    shadowColor: COLORS.primaryDark,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  upcomingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  upcomingBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  upcomingRoom: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  upcomingCourseTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  upcomingSchedule: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: '600',
  },
  upcomingLecturer: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  upcomingDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 14,
  },
  linkedMaterialContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
  },
  linkedIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkedMaterialHeader: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  linkedMaterialTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  linkedEmptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  linkedEmptyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  btnSmallPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  btnSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Quick Action Row
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  quickActionBtn: {
    flex: 1,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
  },
  quickActionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  quickActionSub: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  // Task & Mini Card
  taskMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  checkboxTouch: {
    padding: 4,
    marginRight: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.emerald,
    borderColor: COLORS.emerald,
  },
  taskMiniTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  taskCompletedText: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  taskMiniMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  taskMiniCourse: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  taskMiniDot: {
    marginHorizontal: 6,
    color: COLORS.textMuted,
  },
  taskMiniDeadline: {
    fontSize: 11,
    color: COLORS.rose,
    fontWeight: '600',
  },
  btnIconMini: {
    padding: 6,
    marginLeft: 4,
  },

  // Recent Materials Card
  recentMatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  fileIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileIconText: {
    fontSize: 11,
    fontWeight: '800',
  },
  recentMatTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  recentMatSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusPillSmall: {
    backgroundColor: COLORS.inputBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillSmallText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // Common Header with Action Button
  pageHeaderRowWithBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 6,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  btnAddMain: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  btnAddMainText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Schedule Shortcut Banner
  scheduleShortcutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DEDEFE',
  },
  scheduleShortcutIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleShortcutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  scheduleShortcutSub: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 2,
  },

  // Courses List Screen
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderLeftWidth: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  courseCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseDayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  courseDayPillText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  btnSmallAction: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseCardName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  courseCardLecturer: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  courseCardMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  courseCardMetaText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  courseCardProgressSection: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  courseCardProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  courseCardProgressLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  courseCardProgressPercent: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  progressTrack: {
    height: 7,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  courseCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 4,
  },
  courseCardFooterLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Course Detail Screen
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
    gap: 6,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  courseDetailBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  courseTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeTag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  btnActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActionIconDanger: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.roseLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseDetailTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  courseDetailLecturer: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  courseDetailSchedule: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  courseDetailRoom: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  courseProgressBarContainer: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  courseProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  courseProgressTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  courseProgressPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  progressSubtext: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  btnSmallAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  btnSmallAddText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  meetingGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  meetingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  meetingPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  meetingPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  meetingItemCount: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  materialMeetingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  matItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  matItemMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  matItemDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  matItemActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  studiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
  },
  studiedPillActive: {
    backgroundColor: COLORS.emeraldLight,
    borderColor: COLORS.emerald,
  },
  studiedPillInactive: {
    backgroundColor: COLORS.inputBackground,
    borderColor: COLORS.cardBorder,
  },
  studiedPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  aiButtonTiny: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 3,
  },
  aiButtonTinyText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  iconMiniAction: {
    padding: 4,
  },
  emptyInlineText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginBottom: 14,
  },

  // Materials Screen
  materialTopSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginTop: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  filterChipScroll: {
    marginVertical: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.inputBackground,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  statusFilterRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  statusFilterBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusFilterBtnActive: {
    backgroundColor: COLORS.primaryLight,
  },
  statusFilterText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  statusFilterTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  materialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  materialCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardActionCorner: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 6,
  },
  meetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  meetingBadgeSmall: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  meetingBadgeSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  materialCardCourse: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  materialCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  materialCardFileMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  matCardDescSnippet: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  materialCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  studiedToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  studiedToggleButtonActive: {},
  studiedToggleText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  aiSummarizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 5,
  },
  aiSummarizeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Tasks Screen
  taskTabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  taskTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  taskTabBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  taskTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  taskTabTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  taskFullCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  taskFullTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskFullTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  taskFullCourse: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  taskFullDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  priorityHigh: { backgroundColor: COLORS.roseLight },
  priorityMed: { backgroundColor: COLORS.amberLight },
  priorityLow: { backgroundColor: COLORS.inputBackground },
  priorityText: { fontSize: 10, fontWeight: '700' },
  priorityTextHigh: { color: COLORS.rose },
  priorityTextMed: { color: COLORS.amber },
  priorityTextLow: { color: COLORS.textSecondary },
  taskFullFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  taskDeadlineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskDeadlineDate: {
    fontSize: 11,
    color: COLORS.rose,
    fontWeight: '700',
  },

  // Profile Screen
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  avatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  profileEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  profileMajor: {
    fontSize: 12,
    color: COLORS.textPrimary,
    marginTop: 4,
    fontWeight: '600',
  },
  profileUniversity: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  btnEditProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 14,
    gap: 6,
  },
  btnEditProfileText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    width: (Dimensions.get('window').width - 42) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  scheduleFeatureCard: {
    backgroundColor: COLORS.purple,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  scheduleFeatureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  scheduleFeatureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleFeatureTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scheduleFeatureSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
    lineHeight: 17,
  },
  scheduleFeatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 14,
    gap: 6,
  },
  scheduleFeatureButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  notificationSettingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  settingDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  settingDivider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 10,
  },
  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.roseLight,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 6,
    marginBottom: 20,
  },
  btnLogoutText: {
    color: COLORS.rose,
    fontSize: 14,
    fontWeight: '800',
  },

  // Bottom Navigation Bar
  bottomNavContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingVertical: 8,
    paddingHorizontal: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 6,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 3,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },

  // Toast
  toastContainer: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: COLORS.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    zIndex: 9999,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty Box
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginVertical: 10,
  },
  emptyCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 10,
  },
  emptyCardSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyInlineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 14,
    gap: 10,
  },
  emptyInlineBoxText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // Modal Common Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  formModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: Dimensions.get('window').height * 0.88,
  },
  formModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  formModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  formModalSubTitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 10,
    marginBottom: 4,
  },
  modalTextInput: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  daySelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  daySelectorChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  daySelectorChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  daySelectorChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  daySelectorChipTextActive: {
    color: '#FFFFFF',
  },
  courseSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  courseSelectChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  courseSelectChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  courseSelectChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  courseSelectChipTextActive: {
    color: '#FFFFFF',
  },
  fileTypeChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  fileTypeChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  fileTypeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  fileTypeChipTextActive: {
    color: '#FFFFFF',
  },
  prioritySelectorChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  prioritySelectorChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  prioritySelectorChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  prioritySelectorChipTextActive: {
    color: '#FFFFFF',
  },
  modalFooterActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  btnPrimaryModal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  btnPrimaryModalText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnSecondaryModal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.inputBackground,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnSecondaryModalText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },

  // =================================================================
  // SMART SCHEDULE IMPORT STYLES
  // =================================================================
  importModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: Dimensions.get('window').height * 0.90,
  },
  importSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
    marginTop: 6,
  },
  importOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  importOptionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  importOptionDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  importDivider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 14,
  },
  templateOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  templateOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  manualPasteToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    gap: 6,
  },
  manualPasteToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  importProcessingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 12,
  },
  importProcessingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  importProcessingSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },

  // Review Schedule Styles (Step 4)
  reviewSourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.emeraldLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
  },
  reviewSourceText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.emerald,
  },
  reviewCourseCard: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reviewBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  btnReviewDelete: {
    padding: 4,
  },
  reviewFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 6,
    marginBottom: 2,
  },
  reviewInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 13,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  reviewDayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  reviewDayChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  reviewDayChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  reviewDayChipText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  reviewDayChipTextActive: {
    color: '#FFFFFF',
  },
  reviewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  btnAddRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 4,
  },
  btnAddRowSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  rawOcrToggleWrap: {
    marginBottom: 12,
  },
  rawOcrToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  rawOcrToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  rawOcrBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  rawOcrInput: {
    fontSize: 11,
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    height: 90,
    textAlignVertical: 'top',
  },
  btnReparseOcr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  btnReparseOcrText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Delete Confirmation Box
  deleteConfirmBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  deleteIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.roseLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  deleteConfirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  deleteConfirmSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  deleteConfirmTargetName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.rose,
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 18,
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btnCancelDelete: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.inputBackground,
    alignItems: 'center',
  },
  btnCancelDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  btnConfirmDelete: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.rose,
    alignItems: 'center',
  },
  btnConfirmDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Weekly Schedule Card
  scheduleDayCard: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  scheduleDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleDayTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  scheduleDayCount: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  scheduleDayEmpty: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  scheduleCourseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  scheduleTimeBar: {
    width: 4,
    height: 38,
    borderRadius: 2,
  },
  scheduleCourseName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scheduleCourseMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scheduleCourseLecturer: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // AI Modal Styles
  aiModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: Dimensions.get('window').height * 0.88,
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  aiHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  aiHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  aiModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  aiModalSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSubTabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    padding: 3,
    marginVertical: 12,
  },
  aiSubTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  aiSubTabBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  aiSubTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  aiSubTabTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  aiBodyScroll: {
    maxHeight: 340,
  },
  aiSection: {
    paddingVertical: 4,
  },
  aiInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  aiInfoPillText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  aiSummaryParagraph: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
  aiTipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.amberLight,
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
    gap: 8,
  },
  aiTipText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  aiSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  keyPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
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
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  keyPointText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  quizCard: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  quizTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  quizBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  quizBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  quizQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  quizAnswerBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.emerald,
  },
  quizAnswerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.emerald,
    marginBottom: 2,
  },
  quizAnswerText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  quizRevealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
    paddingVertical: 4,
  },
  quizRevealBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  aiLoadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  aiLoadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  aiModalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.inputBackground,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  btnSecondaryText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
