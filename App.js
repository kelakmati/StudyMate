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
      </View>
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
});
