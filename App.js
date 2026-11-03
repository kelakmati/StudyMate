import React, { useState, useEffect, useMemo } from 'react';
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
  useWindowDimensions,
  KeyboardAvoidingView,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

// =================================================================
// DESIGN SYSTEM: COLOR PALETTE & TOKENS (STUDYMATE IDENTITY)
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

// =================================================================
// =================================================================
// PART 2 – ANGGOTA 2: LOCAL DATA SECURITY (STORAGE & VAULT ENGINE)
// =================================================================
// =================================================================
// Penjelasan: Anggota 2 bertanggung jawab memisahkan data sensitif
// (SecureStore) dan data non-sensitif (AsyncStorage), hashing password
// satu arah (SHA-256), serta isolasi data multi-user berbasis userId.
// =================================================================

// 1. Storage Keys Definition
const SECURE_KEYS = {
  TOKEN: 'studymate_secure_token',
  SESSION_USER: 'studymate_secure_user_session',
  USERS_VAULT: 'studymate_secure_vault_registered_users',
};

const getAsyncUserKey = (prefix, userId) => `@studymate_${prefix}_usr_${userId}`;

// 2. Cross-Platform SecureStore Wrapper with Web Fallback
const isNativeSecureSupported = Platform.OS === 'ios' || Platform.OS === 'android';

const secureStorage = {
  async setItem(key, value) {
    try {
      if (isNativeSecureSupported) {
        await SecureStore.setItemAsync(key, value);
      } else {
        await AsyncStorage.setItem(`@vault_${key}`, value);
      }
      return true;
    } catch (e) {
      console.warn(`[SecureStore Error] Gagal simpan ${key}:`, e);
      return false;
    }
  },

  async getItem(key) {
    try {
      if (isNativeSecureSupported) {
        return await SecureStore.getItemAsync(key);
      } else {
        return await AsyncStorage.getItem(`@vault_${key}`);
      }
    } catch (e) {
      console.warn(`[SecureStore Error] Gagal baca ${key}:`, e);
      return null;
    }
  },

  async deleteItem(key) {
    try {
      if (isNativeSecureSupported) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await AsyncStorage.removeItem(`@vault_${key}`);
      }
      return true;
    } catch (e) {
      console.warn(`[SecureStore Error] Gagal hapus ${key}:`, e);
      return false;
    }
  },
};

// 3. Cryptographic Pure JS SHA-256 Hashing Algorithm
// Menghindari penyimpanan password dalam plain text tanpa dependensi binary native
function hashSha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const maxWord = Math.pow(2, 32);
  let i, j;
  let result = '';
  const words = [];
  const asciiBitLength = ascii.length * 8;
  const hash = [];
  const k = [];
  let primeCounter = 0;
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;
  for (j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];
      const a = hash[0],
        e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
              (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
              w[i - 7] +
              (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
            0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash.unshift((temp1 + temp2) | 0);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (i = 0; i < 8; i++) {
    for (let i2 = 3; i2 >= 0; i2--) {
      const b = (hash[i] >> (i2 * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

const secureHashPassword = (password, salt) => {
  return hashSha256(`${password}_studymate_salt_${salt}`);
};

// 4. Default Seed Starter Templates for Newly Registered Users
const getInitialCourseTemplates = (userId) => [
  {
    id: `crs_1_${userId}`,
    userId,
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
    id: `crs_2_${userId}`,
    userId,
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
    id: `crs_3_${userId}`,
    userId,
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
    id: `crs_4_${userId}`,
    userId,
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

const getInitialMaterialTemplates = (userId) => [
  {
    id: `mat_1_${userId}`,
    userId,
    courseId: `crs_1_${userId}`,
    courseName: 'Pemrograman Mobile',
    meetingNumber: 1,
    meetingTopic: 'Pengenalan React Native & Expo Ecosystem',
    title: 'Modul 1: React Native Architecture & Setup',
    fileType: 'PDF',
    fileName: 'Modul_01_ReactNative_Setup.pdf',
    fileSize: '4.2 MB',
    dateAdded: '2026-10-12',
    isStudied: true,
    userNotes: 'Catatan pribadi: Gunakan SafeAreaProvider dan useSafeAreaInsets agar tidak bertabrakan dengan status bar.',
    summary: 'Materi ini membahas arsitektur React Native (JavaScript Thread, Native Bridge, dan Fabric Renderer), perbedaan cross-platform, serta setup Expo Go.',
    keyPoints: [
      'React Native menggunakan konsep declarative UI dengan komponen native di iOS & Android.',
      'Expo Go mengemas dependensi native siap pakai tanpa build Gradle berat.',
      'State & Props adalah fondasi manajemen data komponen React.',
    ],
    quiz: [
      {
        question: 'Apa peran Fabric Renderer di arsitektur React Native modern?',
        options: ['Mengubah PDF menjadi teks', 'Merender UI langsung ke thread native secara efisien', 'Mengompres foto galeri', 'Menghubungkan WiFi'],
        correctIndex: 1,
        explanation: 'Fabric renderer mengoptimalkan komunikasi antara JS thread dan native view thread sehingga UI berjalan 60 FPS.',
      },
    ],
  },
  {
    id: `mat_2_${userId}`,
    userId,
    courseId: `crs_1_${userId}`,
    courseName: 'Pemrograman Mobile',
    meetingNumber: 2,
    meetingTopic: 'Komponen UI, Flexbox & Responsive Layout',
    title: 'Slide Kuliah: Flexbox Responsive & State React',
    fileType: 'PPT',
    fileName: 'Pertemuan_2_Flexbox_State.pptx',
    fileSize: '12.8 MB',
    dateAdded: '2026-10-19',
    isStudied: true,
    userNotes: 'Default flexDirection di React Native adalah column (vertikal).',
    summary: 'Membahas perancangan layout mobile fleksibel menggunakan Flexbox, alignItems, justifyContent, serta Hook useState.',
    keyPoints: [
      'Default flexDirection adalah column.',
      'justifyContent mengatur perataan sepanjang main axis.',
      'alignItems mengatur perataan cross axis.',
    ],
    quiz: [
      {
        question: 'Nilai default flexDirection di React Native adalah?',
        options: ['row', 'column', 'grid', 'flex-start'],
        correctIndex: 1,
        explanation: 'Berbeda dari web CSS yang default-nya row, React Native secara default adalah column.',
      },
    ],
  },
];

const getInitialTaskTemplates = (userId) => [
  {
    id: `tsk_1_${userId}`,
    userId,
    courseId: `crs_1_${userId}`,
    courseName: 'Pemrograman Mobile',
    title: 'Tugas 1: Integrasi Autentikasi & SecureStore StudyMate',
    deadline: '2026-11-06',
    priority: 'Tinggi',
    completed: false,
    description: 'Selesaikan pemisahan SecureStore untuk token dan AsyncStorage untuk data materi.',
  },
  {
    id: `tsk_2_${userId}`,
    userId,
    courseId: `crs_2_${userId}`,
    courseName: 'Basis Data Lanjut',
    title: 'Praktikum SQL: Analisis Indexing B-Tree',
    deadline: '2026-11-08',
    priority: 'Sedang',
    completed: true,
    description: 'Bandingkan waktu eksekusi query sebelum dan sesudah dibuatkan index.',
  },
];

// User-Scoped Local Data Operations (AsyncStorage with Try-Catch)
const localDataService = {
  async loadUserData(userId) {
    try {
      const coursesKey = getAsyncUserKey('courses', userId);
      const materialsKey = getAsyncUserKey('materials', userId);
      const tasksKey = getAsyncUserKey('tasks', userId);
      const settingsKey = getAsyncUserKey('settings', userId);

      const [storedCourses, storedMaterials, storedTasks, storedSettings] =
        await Promise.all([
          AsyncStorage.getItem(coursesKey),
          AsyncStorage.getItem(materialsKey),
          AsyncStorage.getItem(tasksKey),
          AsyncStorage.getItem(settingsKey),
        ]);

      let courses = storedCourses ? JSON.parse(storedCourses) : null;
      let materials = storedMaterials ? JSON.parse(storedMaterials) : null;
      let tasks = storedTasks ? JSON.parse(storedTasks) : null;
      let settings = storedSettings
        ? JSON.parse(storedSettings)
        : {
          notifyBeforeClass: true,
          notifyDeadlines: true,
          autoSummarizeAi: true,
        };

      // Inisialisasi awal jika akun belum memiliki data
      if (!courses || courses.length === 0) {
        courses = getInitialCourseTemplates(userId);
        await AsyncStorage.setItem(coursesKey, JSON.stringify(courses));
      }
      if (!materials || materials.length === 0) {
        materials = getInitialMaterialTemplates(userId);
        await AsyncStorage.setItem(materialsKey, JSON.stringify(materials));
      }
      if (!tasks || tasks.length === 0) {
        tasks = getInitialTaskTemplates(userId);
        await AsyncStorage.setItem(tasksKey, JSON.stringify(tasks));
      }

      return { courses, materials, tasks, settings };
    } catch (error) {
      console.error('[LocalDataService] Gagal memuat data akun:', error);
      return {
        courses: getInitialCourseTemplates(userId),
        materials: getInitialMaterialTemplates(userId),
        tasks: getInitialTaskTemplates(userId),
        settings: { notifyBeforeClass: true, notifyDeadlines: true, autoSummarizeAi: true },
      };
    }
  },

  async saveCourses(userId, courses) {
    try {
      await AsyncStorage.setItem(getAsyncUserKey('courses', userId), JSON.stringify(courses));
      return true;
    } catch (e) {
      console.error('[LocalDataService] Gagal simpan courses:', e);
      return false;
    }
  },

  async saveMaterials(userId, materials) {
    try {
      await AsyncStorage.setItem(getAsyncUserKey('materials', userId), JSON.stringify(materials));
      return true;
    } catch (e) {
      console.error('[LocalDataService] Gagal simpan materials:', e);
      return false;
    }
  },

  async saveTasks(userId, tasks) {
    try {
      await AsyncStorage.setItem(getAsyncUserKey('tasks', userId), JSON.stringify(tasks));
      return true;
    } catch (e) {
      console.error('[LocalDataService] Gagal simpan tasks:', e);
      return false;
    }
  },

  async saveSettings(userId, settings) {
    try {
      await AsyncStorage.setItem(getAsyncUserKey('settings', userId), JSON.stringify(settings));
      return true;
    } catch (e) {
      console.error('[LocalDataService] Gagal simpan settings:', e);
      return false;
    }
  },
};

// =================================================================
// REUSABLE UI COMPONENTS (SHARED ATOMIC DESIGN)
// =================================================================
const AppHeader = ({ title, subtitle, onOpenNotif, unreadCount, onOpenScheduleUpload, onOpenSecurityModal }) => (
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
      {onOpenSecurityModal && (
        <TouchableOpacity
          style={[styles.headerIconButton, { borderColor: COLORS.accent + '40' }]}
          onPress={onOpenSecurityModal}
          accessibilityLabel="Audit Keamanan Data"
          activeOpacity={0.7}
        >
          <Ionicons name="shield-checkmark" size={19} color={COLORS.accent} />
        </TouchableOpacity>
      )}
      {onOpenScheduleUpload && (
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={onOpenScheduleUpload}
          accessibilityLabel="Unggah Jadwal Kuliah"
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={19} color={COLORS.primary} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.headerIconButton}
        onPress={onOpenNotif}
        accessibilityLabel="Pusat Notifikasi"
        activeOpacity={0.7}
      >
        <Ionicons name="notifications-outline" size={19} color={COLORS.textPrimary} />
        {unreadCount > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  </View>
);

const Badge = ({ label, color, bg, icon }) => (
  <View style={[styles.badgeContainer, { backgroundColor: bg || COLORS.primaryLight }]}>
    {icon && <Ionicons name={icon} size={11} color={color || COLORS.primary} style={{ marginRight: 4 }} />}
    <Text style={[styles.badgeText, { color: color || COLORS.primary }]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

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

const MaterialCard = ({ material, onPress, onToggleStudied, onOpenAi, onOpenNotes, onDelete }) => {
  const getFileBadge = (type) => {
    switch (type) {
      case 'PDF':
        return { color: COLORS.rose, bg: COLORS.roseLight, icon: 'document-text' };
      case 'PPT':
        return { color: COLORS.amber, bg: COLORS.amberLight, icon: 'easel' };
      case 'DOC':
      default:
        return { color: COLORS.secondary, bg: COLORS.secondaryLight, icon: 'newspaper' };
    }
  };
  const badgeInfo = getFileBadge(material.fileType);

  return (
    <View style={styles.materialCard}>
      <View style={styles.materialCardTop}>
        <View style={styles.materialMetaRow}>
          <Badge label={material.fileType} color={badgeInfo.color} bg={badgeInfo.bg} icon={badgeInfo.icon} />
          <Badge label={`Pertemuan ${material.meetingNumber}`} color={COLORS.textSecondary} bg={COLORS.inputBackground} />
          <Text style={styles.materialCourseTag} numberOfLines={1}>
            {material.courseName}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => onToggleStudied(material.id)}
          style={styles.checkCircleButton}
          accessibilityLabel="Tandai Sudah Dipelajari"
          activeOpacity={0.7}
        >
          <Ionicons
            name={material.isStudied ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={material.isStudied ? COLORS.emerald : COLORS.textMuted}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.75} onPress={() => onPress(material)}>
        <Text style={styles.materialTitle} numberOfLines={2}>
          {material.title}
        </Text>
        <Text style={styles.materialTopicText} numberOfLines={1}>
          📌 {material.meetingTopic}
        </Text>
        <Text style={styles.materialFileMeta} numberOfLines={1}>
          {material.fileName} • {material.fileSize || 'Ukuran normal'}
        </Text>
      </TouchableOpacity>

      <View style={styles.materialCardFooter}>
        <TouchableOpacity style={styles.actionPillAi} onPress={() => onOpenAi(material)} activeOpacity={0.7}>
          <Ionicons name="sparkles" size={13} color="#7C3AED" />
          <Text style={styles.actionPillAiText}>StudyMate AI</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionPillNotes} onPress={() => onOpenNotes(material)} activeOpacity={0.7}>
          <Ionicons name={material.userNotes ? 'document-text' : 'create-outline'} size={13} color={COLORS.primary} />
          <Text style={styles.actionPillNotesText}>
            {material.userNotes ? 'Lihat Catatan' : '+ Catatan'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionDeleteButton}
          onPress={() => onDelete(material.id)}
          activeOpacity={0.7}
          accessibilityLabel="Hapus Materi"
        >
          <Ionicons name="trash-outline" size={17} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CourseCard = ({ course, materialCount, studiedCount, onPress }) => {
  const progressPercent = materialCount > 0 ? Math.round((studiedCount / materialCount) * 100) : 0;

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

      <View style={styles.courseProgressContainer}>
        <View style={styles.courseProgressRow}>
          <Text style={styles.courseProgressLabel}>Progres Terpelajari</Text>
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
      <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]} numberOfLines={2}>
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
// =================================================================
// PART 1 & 3: MAIN APP (AUTH FLOW & INTEGRATION)
// =================================================================
// =================================================================
function StudyMateApp() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const isSmallScreen = width < 360;
  const isTabletOrLandscape = width > 600;

  const bottomNavHeight = 58 + Math.max(insets.bottom, 8);
  const scrollContentPaddingBottom = bottomNavHeight + 16;

  const statCardWidth = useMemo(() => {
    if (isTabletOrLandscape) return (width - 32 - 36) / 4;
    return (width - 32 - 12) / 2;
  }, [width, isTabletOrLandscape]);

  // -------------------------------------------------------------
 


  // =============================================================
  // PART 2 & 3: APP DATA CRUD OPERATIONS (USER-SCOPED)
  // =============================================================
  const handleToggleMaterialStudied = async (materialId) => {
    if (!currentUser) return;
    const updated = materials.map((m) =>
      m.id === materialId ? { ...m, isStudied: !m.isStudied } : m
    );
    setMaterials(updated);
    await localDataService.saveMaterials(currentUser.id, updated);
  };

  const handleDeleteMaterial = (materialId) => {
    if (!currentUser) return;
    Alert.alert('Hapus Materi', 'Apakah kamu yakin ingin menghapus materi perkuliahan ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const updated = materials.filter((m) => m.id !== materialId);
          setMaterials(updated);
          await localDataService.saveMaterials(currentUser.id, updated);
        },
      },
    ]);
  };

  const handleSaveMaterial = async (formData) => {
    if (!currentUser) return;
    let updated;
    const courseObj = courses.find((c) => c.id === formData.courseId) || courses[0];

    const generatedSummary =
      formData.summary ||
      `Ringkasan cerdas oleh StudyMate AI untuk mata kuliah ${courseObj.name} pada pertemuan ke-${formData.meetingNumber}. Mencakup fondasi teori dan penerapan praktis untuk mendukung pembelajaran mandiri.`;

    const generatedKeyPoints = formData.keyPoints || [
      `Fokus utama topik adalah penguasaan ${formData.meetingTopic}.`,
      `Pahami implementasi dan pola konsep pada materi pertemuan ke-${formData.meetingNumber}.`,
      'Gunakan catatan pribadi untuk mencatat intisari dosen pengampu.',
    ];

    const generatedQuiz = formData.quiz || [
      {
        question: `Apa konsep inti yang dibahas pada ${formData.title}?`,
        options: ['Pemahaman fondasi dan implementasi praktis', 'Hafalan tanpa latihan', 'Menunggu arahan asisten lab', 'Kompilasi tanpa pengujian'],
        correctIndex: 0,
        explanation: 'Pemahaman konsep dasar dan implementasi mandiri adalah kunci retensi materi perkuliahan jangka panjang.',
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
        userId: currentUser.id,
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
    await localDataService.saveMaterials(currentUser.id, updated);
    setMaterialModalVisible(false);
    setEditingMaterial(null);
  };

  const handleOpenNotes = (material) => {
    setActiveNotesMaterial(material);
    setCurrentNoteText(material.userNotes || '');
    setNotesModalVisible(true);
  };

  const handleSaveNotes = async () => {
    if (!activeNotesMaterial || !currentUser) return;
    const updated = materials.map((m) =>
      m.id === activeNotesMaterial.id ? { ...m, userNotes: currentNoteText } : m
    );
    setMaterials(updated);
    await localDataService.saveMaterials(currentUser.id, updated);
    setNotesModalVisible(false);
    setActiveNotesMaterial(null);
  };

  const handleOpenAiAssistant = (material) => {
    setActiveAiMaterial(material);
    setAiSubTab('summary');
    setQuizRevealedMap({});
    setAiModalVisible(true);
  };

  const handleToggleTaskCompleted = async (taskId) => {
    if (!currentUser) return;
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    setTasks(updated);
    await localDataService.saveTasks(currentUser.id, updated);
  };

  const handleDeleteTask = (taskId) => {
    if (!currentUser) return;
    Alert.alert('Hapus Tugas', 'Apakah kamu yakin ingin menghapus tugas ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const updated = tasks.filter((t) => t.id !== taskId);
          setTasks(updated);
          await localDataService.saveTasks(currentUser.id, updated);
        },
      },
    ]);
  };

  const handleSaveTask = async (formData) => {
    if (!currentUser) return;
    let updated;
    const courseObj = courses.find((c) => c.id === formData.courseId) || courses[0];

    if (editingTask) {
      updated = tasks.map((t) =>
        t.id === editingTask.id ? { ...t, ...formData, courseName: courseObj.name } : t
      );
    } else {
      const newTask = {
        id: `tsk_${Date.now()}`,
        userId: currentUser.id,
        ...formData,
        courseName: courseObj.name,
        completed: false,
      };
      updated = [newTask, ...tasks];
    }

    setTasks(updated);
    await localDataService.saveTasks(currentUser.id, updated);
    setTaskModalVisible(false);
    setEditingTask(null);
  };

  const handlePickScheduleImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        processScheduleFile('Screenshot_Jadwal_KRS.png');
      }
    } catch (err) {
      processScheduleFile('Screenshot_Jadwal_Kuliah_Semester.png');
    }
  };

  const handlePickScheduleDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        processScheduleFile(result.assets[0].name || 'Jadwal_KRS_Akademik.pdf');
      }
    } catch (err) {
      processScheduleFile('Jadwal_Kuliah_Semester_Ganjil.pdf');
    }
  };

  const processScheduleFile = (fileName) => {
    setIsParsingSchedule(true);
    setTimeout(async () => {
      setIsParsingSchedule(false);
      Alert.alert(
        'Jadwal Berhasil Dianalisis! 🚀',
        `StudyMate telah mendeteksi 4 Mata Kuliah dari berkas "${fileName}" dan menyelaraskannya dengan akun ${currentUser?.name || ''}.`
      );
      const newNotif = {
        id: `notif_${Date.now()}`,
        title: 'Jadwal Berhasil Disinkronkan',
        message: `Mata kuliah telah diselaraskan dengan berkas ${fileName}. Materi kini terhubung dengan hari kuliah.`,
        time: 'Baru saja',
        read: false,
        type: 'schedule',
      };
      setNotifications([newNotif, ...notifications]);
      setScheduleModalVisible(false);
    }, 1400);
  };

  // =============================================================
  // COMPUTED DATA & DASHBOARD STATS
  // =============================================================
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
    const unread = materials.find((m) => m.courseId === todayCourse.id && !m.isStudied);
    return unread || materials.find((m) => m.courseId === todayCourse.id) || materials[0];
  }, [todayCourse, materials]);

 

// =================================================================
// ROOT APPLICATION EXPORT WITH SAFE AREA PROVIDER
// =================================================================
export default function App() {
  return (
    <SafeAreaProvider>
      <StudyMateApp />
    </SafeAreaProvider>
  );
}

// =================================================================
// STYLESHEET (CLEAN, MODERN, ACCESSIBLE)
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

  // Splash Styles
  splashLogoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  splashBrandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 14,
  },
  splashBrandTagline: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  // Auth Styles
  authScrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  authBrandBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  authLogoIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  authBrandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  authBrandSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  authSecurityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
    marginTop: 10,
  },
  authSecurityPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  authTabSwitch: {
    flexDirection: 'row',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  authTabSwitchBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  authTabSwitchBtnActive: {
    backgroundColor: COLORS.card,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  authTabSwitchBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  authTabSwitchBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  authErrorAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.roseLight,
    borderWidth: 1,
    borderColor: COLORS.rose + '40',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  authErrorAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 16,
  },
  authCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  authInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 4,
  },
  authInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  authTextInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  authSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    gap: 8,
    marginTop: 10,
  },
  authSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  authDemoCallout: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  authDemoCalloutTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  authDemoCalloutText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginTop: 2,
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

  securityAuditPillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentLight,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
    marginBottom: 14,
  },
  securityAuditIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityAuditTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6D28D9',
  },
  securityAuditSub: {
    fontSize: 11,
    color: '#7C3AED',
    marginTop: 2,
    lineHeight: 15,
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.roseLight,
    borderWidth: 1,
    borderColor: COLORS.rose + '40',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
    marginTop: 20,
    marginBottom: 10,
  },
  logoutButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.rose,
  },

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

  // Security Audit Modal Styles
  securitySummaryCard: {
    backgroundColor: COLORS.accentLight,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
    marginBottom: 16,
  },
  securitySummaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6D28D9',
  },
  securitySummaryDesc: {
    fontSize: 12,
    color: '#5B21B6',
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 12,
  },
  retestSecurityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  retestSecurityBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  testResultCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 8,
  },
  testResultScenario: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  testResultDetail: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },

  // Bottom Navigation Bar
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
});
