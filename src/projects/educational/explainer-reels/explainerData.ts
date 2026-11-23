import React from "react";
import { Explainer3DReel, ExplainerConfig } from "./Explainer3DReel";

export const ELEVATOR_BRAKE_CONFIG: ExplainerConfig = {
  id: "ElevatorBrakeExplainer",
  audioPath: "audio/elevator-brake/vo_riko.mp3",
  durationSec: 52,
  hookLine1: "KABEL LIFT PUTUS,",
  hookLine1Color: "#FFFFFF",
  hookLine2: "PENUMPANG LANGSUNG JATUH?",
  hookLine2Color: "#FFE600",
  bottomBadge: "ADA REM RAHASIA!",
  sourceText: "ASME A17.1 Safety Code for Elevators",
  scenes: [
    {
      imagePath: "images/elevator-brake/scene1.jpg",
      startSec: 0,
      endSec: 15,
      panDirection: "in",
      callouts: [
        {
          label: "Kabel Baja Paralel (FoS 8x-12x)",
          anchorX: 66,
          anchorY: 36,
          labelX: 16,
          labelY: 30,
          delaySec: 1.5,
          accentColor: "#FFE600",
        },
        {
          label: "Counterweight Penyeimbang",
          anchorX: 29,
          anchorY: 59,
          labelX: 48,
          labelY: 66,
          delaySec: 5.0,
          accentColor: "#00F2FE",
        },
      ],
    },
    {
      imagePath: "images/elevator-brake/scene2.jpg",
      startSec: 15,
      endSec: 28,
      panDirection: "right",
      callouts: [
        {
          label: "Overspeed Governor (>115%)",
          anchorX: 48,
          anchorY: 48,
          labelX: 14,
          labelY: 34,
          delaySec: 1.2,
          accentColor: "#FFE600",
        },
        {
          label: "Pemberat Sentrifugal",
          anchorX: 55,
          anchorY: 56,
          labelX: 52,
          labelY: 67,
          delaySec: 5.5,
          accentColor: "#FF4D4D",
        },
      ],
    },
    {
      imagePath: "images/elevator-brake/scene3.jpg",
      startSec: 28,
      endSec: 41,
      panDirection: "in",
      callouts: [
        {
          label: "Baji Rem Mekanis (Safety Gear)",
          anchorX: 52,
          anchorY: 49,
          labelX: 14,
          labelY: 35,
          delaySec: 1.2,
          accentColor: "#FF4D4D",
        },
        {
          label: "Menjepit Rel Tanpa Listrik",
          anchorX: 46,
          anchorY: 60,
          labelX: 48,
          labelY: 68,
          delaySec: 5.0,
          accentColor: "#FFE600",
        },
      ],
    },
    {
      imagePath: "images/elevator-brake/scene4.jpg",
      startSec: 41,
      endSec: 52,
      panDirection: "out",
      callouts: [
        {
          label: "Kabin Terkunci Aman",
          anchorX: 50,
          anchorY: 50,
          labelX: 16,
          labelY: 34,
          delaySec: 1.2,
          accentColor: "#00E65B",
        },
      ],
    },
  ],
  subtitles: [
    { startSec: 0.4, endSec: 5.2, text: "Gimana kalau kabel lift putus di lantai tiga puluh?", highlightWord: "putus" },
    { startSec: 5.2, endSec: 9.2, text: "Apakah penumpangnya langsung jatuh bebas?", highlightWord: "jatuh" },
    { startSec: 9.2, endSec: 15.0, text: "Lift modern digantung beberapa kabel baja paralel", highlightWord: "paralel" },
    { startSec: 15.0, endSec: 20.5, text: "Faktor keamanannya 8 sampai 12 kali lipat", highlightWord: "12" },
    { startSec: 20.5, endSec: 26.5, text: "Di atas poros ada roda pengawas overspeed governor", highlightWord: "governor" },
    { startSec: 26.5, endSec: 32.5, text: "Lewat 115% kecepatan normal, pemberat mengunci tali", highlightWord: "115" },
    { startSec: 32.5, endSec: 39.5, text: "Tuas bawah kabin menjepit rel baja dengan baji rem", highlightWord: "baji" },
    { startSec: 39.5, endSec: 45.0, text: "Semua bekerja mekanis tanpa butuh listrik", highlightWord: "mekanis" },
    { startSec: 45.0, endSec: 51.4, text: "Hukum fisika menghentikan lift dalam sepersekian detik", highlightWord: "fisika" },
  ],
};

export const TOLL_PHANTOM_JAM_CONFIG: ExplainerConfig = {
  id: "TollPhantomJamExplainer",
  audioPath: "audio/toll-phantom-jam/vo_sami.mp3",
  durationSec: 48,
  hookLine1: "PALANG TOL SUDAH TERBUKA,",
  hookLine1Color: "#FFE600",
  hookLine2: "KOK MACETNYA MASIH PANJANG?",
  hookLine2Color: "#FFFFFF",
  sourceText: "MIT, Sugiyama et al. (2008), FHWA",
  scenes: [
    {
      imagePath: "images/toll-phantom-jam/scene1.jpg",
      startSec: 0,
      endSec: 13,
      panDirection: "in",
      callouts: [
        {
          label: "Titik Gabung Lajur (Bottleneck)",
          anchorX: 74,
          anchorY: 47,
          labelX: 16,
          labelY: 36,
          delaySec: 1.5,
          accentColor: "#FFE600",
        },
        {
          label: "Gerbang Lebar -> 2 Lajur",
          anchorX: 48,
          anchorY: 61,
          labelX: 50,
          labelY: 69,
          delaySec: 5.0,
          accentColor: "#00F2FE",
        },
      ],
    },
    {
      imagePath: "images/toll-phantom-jam/scene2.jpg",
      startSec: 13,
      endSec: 25,
      panDirection: "left",
      callouts: [
        {
          label: "1 Mobil Ngerem Mendadak",
          anchorX: 52,
          anchorY: 42,
          labelX: 16,
          labelY: 33,
          delaySec: 1.2,
          accentColor: "#FF4D4D",
        },
        {
          label: "Gelombang Rem Merambat Mundur",
          anchorX: 38,
          anchorY: 62,
          labelX: 48,
          labelY: 69,
          delaySec: 4.5,
          accentColor: "#FFE600",
        },
      ],
    },
    {
      imagePath: "images/toll-phantom-jam/scene3.jpg",
      startSec: 25,
      endSec: 38,
      panDirection: "out",
      callouts: [
        {
          label: "Eksperimen Lingkaran (22 Mobil)",
          anchorX: 50,
          anchorY: 48,
          labelX: 16,
          labelY: 32,
          delaySec: 1.2,
          accentColor: "#00F2FE",
        },
        {
          label: "Phantom Jam Tanpa Penghalang",
          anchorX: 62,
          anchorY: 63,
          labelX: 20,
          labelY: 70,
          delaySec: 4.8,
          accentColor: "#FF4D4D",
        },
      ],
    },
    {
      imagePath: "images/toll-phantom-jam/scene4.jpg",
      startSec: 38,
      endSec: 48,
      panDirection: "right",
      callouts: [
        {
          label: "Jarak Aman Stabilkan Arus",
          anchorX: 50,
          anchorY: 52,
          labelX: 18,
          labelY: 35,
          delaySec: 1.2,
          accentColor: "#00E65B",
        },
      ],
    },
  ],
  subtitles: [
    { startSec: 0.4, endSec: 5.5, text: "Palang tol terbuka, tapi kok macet masih panjang?", highlightWord: "macet" },
    { startSec: 5.5, endSec: 11.2, text: "Ini fenomena fisika: Phantom Traffic Jam", highlightWord: "phantom" },
    { startSec: 11.2, endSec: 17.5, text: "Lajur gerbang menyempit memaksa satu pengemudi mengerem", highlightWord: "menyempit" },
    { startSec: 17.5, endSec: 24.5, text: "Jeda reaksi membuat mobil belakang mengerem lebih keras", highlightWord: "keras" },
    { startSec: 24.5, endSec: 31.5, text: "Gelombang rem merambat mundur seperti riak air", highlightWord: "mundur" },
    { startSec: 31.5, endSec: 38.5, text: "Dibuktikan Yuki Sugiyama (2008), MIT, dan FHWA", highlightWord: "sugiyama" },
    { startSec: 38.5, endSec: 47.6, text: "Satu rem kecil cukup memicu macet panjang dari ketiadaan", highlightWord: "ketiadaan" },
  ],
};

export const AIRCRAFT_PLUG_DOOR_CONFIG: ExplainerConfig = {
  id: "AircraftPlugDoorExplainer",
  audioPath: "audio/aircraft-plug-door/vo_riko.mp3",
  durationSec: 81,
  hookLine1: "KENAPA PINTU PESAWAT",
  hookLine1Color: "#FFFFFF",
  hookLine2: "MUSTAHIL DIBUKA DI UDARA?",
  hookLine2Color: "#FFE600",
  bottomBadge: "DIJEPIT TEKANAN 10 TON!",
  sourceText: "FAA 14 CFR 25.783 & Prinsip Plug Door",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Fitur pesawat apa lagi yang bikin penasaran?",
    startSec: 73.5,
    accentColor: "#FFE600",
  },
  scenes: [
    {
      imagePath: "images/aircraft-plug-door/scene1.jpg",
      startSec: 0,
      endSec: 8.0,
      panDirection: "in",
      callouts: [
        {
          label: "Ketinggian Jelajah 35.000 Kaki",
          anchorX: 52,
          anchorY: 49,
          labelX: 16,
          labelY: 36,
          delaySec: 1.2,
          accentColor: "#00F2FE",
        },
      ],
    },
    {
      imagePath: "images/aircraft-plug-door/scene2.jpg",
      startSec: 8.0,
      endSec: 16.0,
      panDirection: "right",
      callouts: [
        {
          label: "Tuas Pintu Darurat Kabin",
          anchorX: 58,
          anchorY: 48,
          labelX: 16,
          labelY: 34,
          delaySec: 1.0,
          accentColor: "#FF4D4F",
        },
      ],
    },
    {
      imagePath: "images/aircraft-plug-door/scene3.jpg",
      startSec: 16.0,
      endSec: 24.5,
      panDirection: "out",
      callouts: [
        {
          label: "Udara Luar Tipis & Dingin",
          anchorX: 28,
          anchorY: 44,
          labelX: 14,
          labelY: 32,
          delaySec: 0.8,
          accentColor: "#93C5FD",
        },
        {
          label: "Kabin Dipompa Bertekanan",
          anchorX: 66,
          anchorY: 56,
          labelX: 48,
          labelY: 66,
          delaySec: 2.5,
          accentColor: "#00F2FE",
        },
      ],
    },
    {
      imagePath: "images/aircraft-plug-door/scene4.jpg",
      startSec: 24.5,
      endSec: 32.5,
      panDirection: "in",
      callouts: [
        {
          label: "Selisih Tekanan ~8 PSI",
          anchorX: 52,
          anchorY: 50,
          labelX: 16,
          labelY: 34,
          delaySec: 1.0,
          accentColor: "#FFE600",
        },
      ],
    },
    {
      imagePath: "images/aircraft-plug-door/scene5.jpg",
      startSec: 32.5,
      endSec: 41.0,
      panDirection: "left",
      callouts: [
        {
          label: "Gaya Dorong 8 - 10 Ton!",
          anchorX: 50,
          anchorY: 52,
          labelX: 14,
          labelY: 35,
          delaySec: 1.0,
          accentColor: "#FF9F1C",
        },
      ],
    },
    {
      imagePath: "images/aircraft-plug-door/scene6.jpg",
      startSec: 41.0,
      endSec: 49.0,
      panDirection: "right",
      callouts: [
        {
          label: "Mustahil Ditarik Manusia",
          anchorX: 48,
          anchorY: 52,
          labelX: 16,
          labelY: 34,
          delaySec: 1.0,
          accentColor: "#FF4D4F",
        },
      ],
    },
    {
      imagePath: "images/aircraft-plug-door/scene7.jpg",
      startSec: 49.0,
      endSec: 57.5,
      panDirection: "in",
      callouts: [
        {
          label: "Desain Plug Door Lebih Lebar",
          anchorX: 52,
          anchorY: 52,
          labelX: 16,
          labelY: 33,
          delaySec: 1.0,
          accentColor: "#FFE600",
        },
      ],
    },
    {
      imagePath: "images/aircraft-plug-door/scene8.jpg",
      startSec: 57.5,
      endSec: 65.5,
      panDirection: "left",
      callouts: [
        {
          label: "Harus Ditarik ke Dalam Dulu",
          anchorX: 50,
          anchorY: 52,
          labelX: 14,
          labelY: 34,
          delaySec: 1.0,
          accentColor: "#00F2FE",
        },
      ],
    },
    {
      imagePath: "images/aircraft-plug-door/scene9.jpg",
      startSec: 65.5,
      endSec: 73.0,
      panDirection: "out",
      callouts: [
        {
          label: "Makin Tinggi Makin Rapat",
          anchorX: 50,
          anchorY: 50,
          labelX: 16,
          labelY: 35,
          delaySec: 1.0,
          accentColor: "#00E65B",
        },
      ],
    },
    {
      imagePath: "images/aircraft-plug-door/scene10.jpg",
      startSec: 73.0,
      endSec: 81.0,
      panDirection: "in",
      callouts: [
        {
          label: "Terbuka Mudah di Darat",
          anchorX: 50,
          anchorY: 52,
          labelX: 16,
          labelY: 34,
          delaySec: 0.8,
          accentColor: "#00E65B",
        },
      ],
    },
  ],
  subtitles: [
    { startSec: 0.4, endSec: 6.5, text: "Gimana kalau ada penumpang nekat buka pintu pesawat di udara?", highlightWord: "nekat" },
    { startSec: 6.5, endSec: 12.5, text: "Jawabannya mustahil kebuka karena hukum fisika!", highlightWord: "mustahil" },
    { startSec: 12.5, endSec: 20.0, text: "Di 35 ribu kaki udara luar tipis, kabin dipompa bertekanan tinggi", highlightWord: "bertekanan" },
    { startSec: 20.0, endSec: 28.0, text: "Selisih tekanannya sekitar 8 PSI dari dalam ke luar", highlightWord: "8" },
    { startSec: 28.0, endSec: 36.5, text: "Dikali luas pintu, dorongannya setara beban 8 sampai 10 ton!", highlightWord: "10" },
    { startSec: 36.5, endSec: 44.5, text: "Sepuluh binaragawan pun nggak bakal kuat menariknya", highlightWord: "kuat" },
    { startSec: 44.5, endSec: 53.5, text: "Desainnya plug door: ukuran pintu lebih besar dari kusennya", highlightWord: "plug" },
    { startSec: 53.5, endSec: 62.0, text: "Untuk dibuka, pintu harus ditarik ke dalam dulu baru keluar", highlightWord: "dalam" },
    { startSec: 62.0, endSec: 72.5, text: "Baru saat mendarat dan tekanan sama, pintu bisa dibuka ringan", highlightWord: "mendarat" },
    { startSec: 72.5, endSec: 80.6, text: "Fitur pesawat apa lagi yang bikin penasaran? Komen, Like & Follow!", highlightWord: "follow" },
  ],
};

export const TRAFFIC_LIGHT_CYCLE_CONFIG: ExplainerConfig = {
  id: "TrafficLightCycleExplainer",
  audioPath: "audio/traffic-light-cycle/vo_sami.mp3",
  durationSec: 78.5,
  hookLine1: "KENAPA LAMPU MERAH",
  hookLine1Color: "#FFFFFF",
  hookLine2: "DI PEREMPATAN LAMA BANGET?",
  hookLine2Color: "#00F2FE",
  bottomBadge: "HITUNGAN TEKNIK LALU LINTAS!",
  sourceText: "FHWA Signal Timing Manual & ITE",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Perempatan mana di kotamu yang paling lama?",
    startSec: 70.5,
    accentColor: "#00F2FE",
  },
  scenes: [
    {
      imagePath: "images/traffic-light-cycle/scene1.jpg",
      startSec: 0,
      endSec: 7.5,
      panDirection: "in",
      callouts: [
        {
          label: "Antrean Panjang di Simpang",
          anchorX: 48,
          anchorY: 56,
          labelX: 16,
          labelY: 36,
          delaySec: 1.0,
          accentColor: "#FF4D4F",
        },
      ],
    },
    {
      imagePath: "images/traffic-light-cycle/scene2.jpg",
      startSec: 7.5,
      endSec: 15.0,
      panDirection: "right",
      callouts: [
        {
          label: "Tunggu 2 - 3 Menit per Siklus",
          anchorX: 50,
          anchorY: 42,
          labelX: 16,
          labelY: 32,
          delaySec: 1.0,
          accentColor: "#FFE600",
        },
      ],
    },
    {
      imagePath: "images/traffic-light-cycle/scene3.jpg",
      startSec: 15.0,
      endSec: 23.0,
      panDirection: "out",
      callouts: [
        {
          label: "4 Fase Penuh Simpang 4 Arah",
          anchorX: 50,
          anchorY: 52,
          labelX: 14,
          labelY: 34,
          delaySec: 1.0,
          accentColor: "#00F2FE",
        },
      ],
    },
    {
      imagePath: "images/traffic-light-cycle/scene4.jpg",
      startSec: 23.0,
      endSec: 31.0,
      panDirection: "in",
      callouts: [
        {
          label: "Fase Khusus Belok Kanan",
          anchorX: 54,
          anchorY: 54,
          labelX: 16,
          labelY: 35,
          delaySec: 1.0,
          accentColor: "#00E65B",
        },
      ],
    },
    {
      imagePath: "images/traffic-light-cycle/scene5.jpg",
      startSec: 31.0,
      endSec: 38.5,
      panDirection: "left",
      callouts: [
        {
          label: "Fase Kuning Pengosongan",
          anchorX: 48,
          anchorY: 48,
          labelX: 16,
          labelY: 34,
          delaySec: 0.9,
          accentColor: "#FFE600",
        },
      ],
    },
    {
      imagePath: "images/traffic-light-cycle/scene6.jpg",
      startSec: 38.5,
      endSec: 47.0,
      panDirection: "in",
      callouts: [
        {
          label: "All-Red: 4 Arah Merah Semua!",
          anchorX: 50,
          anchorY: 52,
          labelX: 14,
          labelY: 34,
          delaySec: 1.0,
          accentColor: "#FF4D4F",
        },
      ],
    },
    {
      imagePath: "images/traffic-light-cycle/scene7.jpg",
      startSec: 47.0,
      endSec: 55.0,
      panDirection: "right",
      callouts: [
        {
          label: "Start-Up Lost Time (~2 Detik)",
          anchorX: 52,
          anchorY: 55,
          labelX: 16,
          labelY: 35,
          delaySec: 1.0,
          accentColor: "#00F2FE",
        },
      ],
    },
    {
      imagePath: "images/traffic-light-cycle/scene8.jpg",
      startSec: 55.0,
      endSec: 63.0,
      panDirection: "out",
      callouts: [
        {
          label: "Antrean Mengular dari Belakang",
          anchorX: 50,
          anchorY: 56,
          labelX: 14,
          labelY: 34,
          delaySec: 1.0,
          accentColor: "#FF9F1C",
        },
      ],
    },
    {
      imagePath: "images/traffic-light-cycle/scene9.jpg",
      startSec: 63.0,
      endSec: 70.5,
      panDirection: "in",
      callouts: [
        {
          label: "Optimasi Kapasitas & Aman",
          anchorX: 50,
          anchorY: 50,
          labelX: 16,
          labelY: 35,
          delaySec: 1.0,
          accentColor: "#00E65B",
        },
      ],
    },
    {
      imagePath: "images/traffic-light-cycle/scene10.jpg",
      startSec: 70.5,
      endSec: 78.5,
      panDirection: "out",
      callouts: [
        {
          label: "Cegah Tabrakan Silang Simpang",
          anchorX: 50,
          anchorY: 52,
          labelX: 16,
          labelY: 34,
          delaySec: 0.8,
          accentColor: "#00F2FE",
        },
      ],
    },
  ],
  subtitles: [
    { startSec: 0.4, endSec: 6.5, text: "Pernah nunggu lampu merah sampai 2 - 3 menit padahal jalan sepi?", highlightWord: "lama" },
    { startSec: 6.5, endSec: 13.0, text: "Bukan error, tapi ada hitungan teknik lalu lintas di baliknya", highlightWord: "teknik" },
    { startSec: 13.0, endSec: 21.0, text: "Simpang 4 arah membagi giliran jadi 4 fase penuh", highlightWord: "4" },
    { startSec: 21.0, endSec: 29.0, text: "Apalagi jika jalur belok kanan dipisah agar tidak tabrakan", highlightWord: "tabrakan" },
    { startSec: 29.0, endSec: 39.5, text: "Ada jeda kuning plus all-red: semua arah merah 2-3 detik", highlightWord: "allred" },
    { startSec: 39.5, endSec: 49.0, text: "Tujuannya membersihkan kendaraan terakhir dari tengah simpang", highlightWord: "bersih" },
    { startSec: 49.0, endSec: 58.0, text: "Ditambah start-up lost time di 2 detik awal saat lampu hijau", highlightWord: "startup" },
    { startSec: 58.0, endSec: 69.5, text: "Siklus panjang menyeimbangkan kapasitas arus dan keselamatan", highlightWord: "keselamatan" },
    { startSec: 69.5, endSec: 77.8, text: "Perempatan mana yang paling lama? Komen, Like & Follow!", highlightWord: "follow" },
  ],
};

export const ElevatorBrakeExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: ELEVATOR_BRAKE_CONFIG });

export const TollPhantomJamExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: TOLL_PHANTOM_JAM_CONFIG });

export const AircraftPlugDoorExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: AIRCRAFT_PLUG_DOOR_CONFIG });

export const TrafficLightCycleExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: TRAFFIC_LIGHT_CYCLE_CONFIG });

export const AIRCRAFT_TIRE_CONFIG: ExplainerConfig = {
  id: "AircraftTireExplainer",
  theme: "editorial_toon",
  channelBadge: "Cerita Teknik",
  audioPath: "audio/aircraft-tire/vo_riko.mp3",
  durationSec: 51.5,
  hookLine1: "KENAPA BAN PESAWAT",
  hookLine1Color: "#FFFFFF",
  hookLine2: "TIDAK MELEDAK SAAT LANDING?",
  hookLine2Color: "#FFE600",
  bottomBadge: "TEKANAN 200 PSI & FUSIBLE PLUG!",
  sourceText: "FAA Tire & Brake Safety / Goodyear Aviation",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Fitur pesawat apa lagi yang bikin penasaran?",
    startSec: 40.5,
    accentColor: "#FFE600",
  },
  scenes: [
    { imagePath: "images/aircraft-tire/scene1.jpg", startSec: 0, endSec: 6.0, panDirection: "in", callouts: [{ label: "Hantaman Landing 250 km/jam", labelX: 540, labelY: 780, anchorX: 540, anchorY: 1020, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/aircraft-tire/scene2.jpg", startSec: 6.0, endSec: 12.0, panDirection: "right", callouts: [{ label: "Tekanan 200 PSI (6x Ban Mobil)", labelX: 540, labelY: 720, anchorX: 540, anchorY: 980, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/aircraft-tire/scene3.jpg", startSec: 12.0, endSec: 18.0, panDirection: "in", callouts: [{ label: "6-8 Lapis Sabuk Baja & Nilon", labelX: 540, labelY: 740, anchorX: 540, anchorY: 1000, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/aircraft-tire/scene4.jpg", startSec: 18.0, endSec: 24.0, panDirection: "left", callouts: [{ label: "Diisi Gas Nitrogen Kering Murni", labelX: 540, labelY: 760, anchorX: 540, anchorY: 1020, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/aircraft-tire/scene5.jpg", startSec: 24.0, endSec: 30.0, panDirection: "in", callouts: [{ label: "Bebas Uap Air & Stabil di Suhu Ekstrem", labelX: 540, labelY: 740, anchorX: 540, anchorY: 980, delaySec: 0.6, color: "#70FF00" }] },
    { imagePath: "images/aircraft-tire/scene6.jpg", startSec: 30.0, endSec: 35.0, panDirection: "right", callouts: [{ label: "Rem Karbon Memanas Ekstrem", labelX: 540, labelY: 760, anchorX: 540, anchorY: 1020, delaySec: 0.6, color: "#FF6B6B" }] },
    { imagePath: "images/aircraft-tire/scene7.jpg", startSec: 35.0, endSec: 40.0, panDirection: "in", callouts: [{ label: "Katup Pengaman Fusible Plug", labelX: 540, labelY: 740, anchorX: 540, anchorY: 990, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/aircraft-tire/scene8.jpg", startSec: 40.0, endSec: 46.0, panDirection: "left", callouts: [{ label: "Meleleh & Kempis Terkontrol", labelX: 540, labelY: 760, anchorX: 540, anchorY: 1020, delaySec: 0.6, color: "#00F2FE" }] },
  ],
  subtitles: [
    { startSec: 0.0, endSec: 5.8, text: "Kenapa ban pesawat nggak meledak saat mendarat?", highlight: "meledak" },
    { startSec: 5.8, endSec: 11.8, text: "Padahal tekanannya 200 PSI, 6x ban mobil biasa!", highlight: "200 PSI" },
    { startSec: 11.8, endSec: 17.8, text: "Pertama, ada 6 sampai 8 lapis sabuk baja dan nilon.", highlight: "sabuk baja" },
    { startSec: 17.8, endSec: 23.8, text: "Kedua, diisi gas nitrogen kering murni yang stabil.", highlight: "nitrogen kering" },
    { startSec: 23.8, endSec: 29.8, text: "Bebas uap air, jadi tidak memuai liar saat panas.", highlight: "bebas uap air" },
    { startSec: 29.8, endSec: 34.8, text: "Ketiga, di velg terpasang katup fusible plug.", highlight: "fusible plug" },
    { startSec: 34.8, endSec: 40.0, text: "Saat rem memanas ekstrem, katup ini sengaja meleleh.", highlight: "meleleh" },
    { startSec: 40.0, endSec: 45.5, text: "Ban kempis perlahan, bukan meledak! Like, komen & follow!", highlight: "Like, komen" },
  ],
};

export const TRAIN_TRACK_GAP_CONFIG: ExplainerConfig = {
  id: "TrainTrackGapExplainer",
  theme: "editorial_toon",
  channelBadge: "Fast Fact",
  audioPath: "audio/train-track-gap/vo_sami.mp3",
  durationSec: 49.0,
  hookLine1: "KENAPA REL KERETA API",
  hookLine1Color: "#FFFFFF",
  hookLine2: "SELALU ADA CELAH SAMBUNGAN?",
  hookLine2Color: "#00F2FE",
  bottomBadge: "MENCEGAH SUN KINK & ANJLOKAN!",
  sourceText: "Federal Railroad Administration (FRA) & Pemuaian Termal",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Jalur kereta mana di kotamu yang paling sering dilewati?",
    startSec: 48.0,
    accentColor: "#00F2FE",
  },
  scenes: [
    { imagePath: "images/train-track-gap/scene1.jpg", startSec: 0, endSec: 7.0, panDirection: "in", callouts: [{ label: "Celah Kecil di Setiap Sambungan", labelX: 540, labelY: 780, anchorX: 540, anchorY: 1020, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/train-track-gap/scene2.jpg", startSec: 7.0, endSec: 14.0, panDirection: "right", callouts: [{ label: "Celah Ekspansi & Pelat Sambung", labelX: 540, labelY: 740, anchorX: 540, anchorY: 990, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/train-track-gap/scene3.jpg", startSec: 14.0, endSec: 21.0, panDirection: "in", callouts: [{ label: "Rel Baja Dipanaskan Terik Matahari", labelX: 540, labelY: 740, anchorX: 540, anchorY: 1000, delaySec: 0.6, color: "#FF6B6B" }] },
    { imagePath: "images/train-track-gap/scene4.jpg", startSec: 21.0, endSec: 28.0, panDirection: "left", callouts: [{ label: "Molekul Baja Memuai Memanjang", labelX: 540, labelY: 760, anchorX: 540, anchorY: 1010, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/train-track-gap/scene5.jpg", startSec: 28.0, endSec: 36.0, panDirection: "in", callouts: [{ label: "Tanpa Celah: Fenomena Sun Kink!", labelX: 540, labelY: 740, anchorX: 540, anchorY: 980, delaySec: 0.6, color: "#FF2222" }] },
    { imagePath: "images/train-track-gap/scene2.jpg", startSec: 36.0, endSec: 44.0, panDirection: "left", callouts: [{ label: "Suara Dug-Dug Roda Lewati Celah", labelX: 540, labelY: 750, anchorX: 540, anchorY: 1000, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/train-track-gap/scene1.jpg", startSec: 44.0, endSec: 54.5, panDirection: "right", callouts: [{ label: "Celah Pengaman Perjalanan Kereta", labelX: 540, labelY: 760, anchorX: 540, anchorY: 1010, delaySec: 0.6, color: "#70FF00" }] },
  ],
  subtitles: [
    { startSec: 0.0, endSec: 6.8, text: "Kenapa rel kereta api selalu punya celah sambungan?", highlight: "celah sambungan" },
    { startSec: 6.8, endSec: 13.8, text: "Kalau disambung rapat, rel justru bisa melengkung!", highlight: "melengkung" },
    { startSec: 13.8, endSec: 20.8, text: "Saat siang terik, matahari memanaskan batang baja rel.", highlight: "memanaskan" },
    { startSec: 20.8, endSec: 27.8, text: "Molekul baja bergetar cepat dan memuai memanjang.", highlight: "memuai" },
    { startSec: 27.8, endSec: 35.8, text: "Tanpa celah, rel membengkok jadi S atau sun kink!", highlight: "sun kink" },
    { startSec: 35.8, endSec: 43.8, text: "Suara dug-dug berasal dari roda melewati celah ini.", highlight: "dug-dug" },
    { startSec: 43.8, endSec: 54.0, text: "Celah pengaman anti-anjlok! Like, komen & follow!", highlight: "Like, komen" },
  ],
};

export const AircraftTireExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: AIRCRAFT_TIRE_CONFIG });

export const TrainTrackGapExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: TRAIN_TRACK_GAP_CONFIG });

export const BLACK_BOX_UNDERWATER_CONFIG: ExplainerConfig = {
  id: "BlackBoxUnderwaterExplainer",
  theme: "editorial_toon",
  channelBadge: "Cerita Teknik",
  audioPath: "audio/black-box-underwater/vo_riko.mp3",
  durationSec: 50.2,
  hookLine1: "BLACK BOX PESAWAT",
  hookLine1Color: "#1E2421",
  hookLine2: "Ditemukan Di Dasar Laut?",
  hookLine2Color: "#2A6F4E",
  sourceText: "FAA TSO-C121b & NTSB Flight Recorder Handbook",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Bagian pesawat apa lagi yang bikin penasaran?",
    startSec: 44.5,
    accentColor: "#FFE600",
  },
  scenes: [
    { imagePath: "images/black-box-underwater/scene1.jpg", startSec: 0.0, endSec: 6.5, panDirection: "in", callouts: [{ label: "Warna Asli Oranye Terang", labelX: 38, labelY: 42, anchorX: 50, anchorY: 66, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/black-box-underwater/scene2.jpg", startSec: 6.5, endSec: 13.0, panDirection: "right", callouts: [{ label: "Casing Baja Titanium", labelX: 64, labelY: 38, anchorX: 52, anchorY: 56, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/black-box-underwater/scene3.jpg", startSec: 13.0, endSec: 19.5, panDirection: "in", callouts: [{ label: "Tahan 3.400 G & 1.100 C", labelX: 35, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/black-box-underwater/scene4.jpg", startSec: 19.5, endSec: 26.0, panDirection: "left", callouts: [{ label: "Underwater Locator Beacon", labelX: 62, labelY: 38, anchorX: 48, anchorY: 58, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/black-box-underwater/scene5.jpg", startSec: 26.0, endSec: 32.5, panDirection: "in", callouts: [{ label: "Sensor Aktif Kena Air Laut", labelX: 36, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#70FF00" }] },
    { imagePath: "images/black-box-underwater/scene6.jpg", startSec: 32.5, endSec: 39.0, panDirection: "right", callouts: [{ label: "Sinyal 37,5 kHz / 90 Hari", labelX: 64, labelY: 38, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/black-box-underwater/scene7.jpg", startSec: 39.0, endSec: 44.5, panDirection: "in", callouts: [{ label: "Dilacak Kapal Sonar SAR", labelX: 36, labelY: 38, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/black-box-underwater/scene8.jpg", startSec: 44.5, endSec: 50.2, panDirection: "left", callouts: [{ label: "Diangkat Robot ROV", labelX: 62, labelY: 38, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#70FF00" }] },
  ],
  subtitles: [
    { startSec: 0.0, endSec: 6.5, text: "Kenapa Black Box bisa ditemukan di dasar laut terdalam?", highlight: "dasar laut" },
    { startSec: 6.5, endSec: 12.5, text: "Warnanya oranye terang agar mudah terlihat tim SAR.", highlight: "oranye terang" },
    { startSec: 12.5, endSec: 19.5, text: "Lapisan baja titanium tahan 3.400 G dan panas 1.100 C.", highlight: "3.400 G" },
    { startSec: 19.5, endSec: 25.5, text: "Di moncongnya ada alat Underwater Locator Beacon.", highlight: "Locator Beacon" },
    { startSec: 25.5, endSec: 32.5, text: "Begitu menyentuh air laut, sinyal ultrasonik langsung aktif.", highlight: "ultrasonik" },
    { startSec: 32.5, endSec: 39.0, text: "Memancar 90 hari nonstop hingga kedalaman 6.000 meter.", highlight: "90 hari" },
    { startSec: 39.0, endSec: 44.5, text: "Tim SAR tinggal melacak gemanya lewat sonar permukaan.", highlight: "sonar" },
    { startSec: 44.5, endSec: 50.2, text: "Bagian pesawat apa lagi yang canggih? Like, komen & follow!", highlight: "Like, komen" },
  ],
};

export const SUBSEA_CABLE_SHARK_CONFIG: ExplainerConfig = {
  id: "SubseaCableSharkExplainer",
  theme: "editorial_toon",
  channelBadge: "Fast Fact",
  audioPath: "audio/subsea-cable-shark/vo_sami.mp3",
  durationSec: 51.7,
  hookLine1: "KABEL INTERNET BAWAH LAUT",
  hookLine1Color: "#1E2421",
  hookLine2: "Kenapa Digigit Hiu?",
  hookLine2Color: "#2A6F4E",
  sourceText: "TeleGeography & International Cable Protection Committee",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Fakta teknik apa lagi yang bikin penasaran?",
    startSec: 45.5,
    accentColor: "#00F2FE",
  },
  scenes: [
    { imagePath: "images/subsea-cable-shark/scene1.jpg", startSec: 0.0, endSec: 6.5, panDirection: "in", callouts: [{ label: "99% Internet Lewat Dasar Laut", labelX: 38, labelY: 36, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/subsea-cable-shark/scene2.jpg", startSec: 6.5, endSec: 13.0, panDirection: "right", callouts: [{ label: "Serat Optik Setebal Selang", labelX: 62, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/subsea-cable-shark/scene3.jpg", startSec: 13.0, endSec: 19.5, panDirection: "in", callouts: [{ label: "Medan Elektromagnetik Kabel", labelX: 36, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/subsea-cable-shark/scene4.jpg", startSec: 19.5, endSec: 26.5, panDirection: "left", callouts: [{ label: "Sensor Ampullae of Lorenzini", labelX: 62, labelY: 38, anchorX: 48, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/subsea-cable-shark/scene5.jpg", startSec: 26.5, endSec: 33.0, panDirection: "in", callouts: [{ label: "Disangka Detak Jantung Mangsa", labelX: 38, labelY: 38, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FF6B6B" }] },
    { imagePath: "images/subsea-cable-shark/scene6.jpg", startSec: 33.0, endSec: 39.5, panDirection: "right", callouts: [{ label: "Pelindung Baja & Serat Kevlar", labelX: 62, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#70FF00" }] },
    { imagePath: "images/subsea-cable-shark/scene7.jpg", startSec: 39.5, endSec: 45.5, panDirection: "in", callouts: [{ label: "Dikubur di Bawah Pasir Pantai", labelX: 36, labelY: 38, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/subsea-cable-shark/scene8.jpg", startSec: 45.5, endSec: 51.7, panDirection: "left", callouts: [{ label: "Jaringan Serat Optik Global", labelX: 62, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#70FF00" }] },
  ],
  subtitles: [
    { startSec: 0.0, endSec: 6.5, text: "Hampir 99% internet HP lewat kabel di dasar laut.", highlight: "99% internet" },
    { startSec: 6.5, endSec: 13.0, text: "Kabel setebal selang ini sering jadi sasaran gigitan hiu!", highlight: "gigitan hiu" },
    { startSec: 13.0, endSec: 19.5, text: "Arus listrik kabel memancarkan medan elektromagnetik tipis.", highlight: "elektromagnetik" },
    { startSec: 19.5, endSec: 26.5, text: "Sensor ampullae of Lorenzini hiu mengira itu ikan mangsa.", highlight: "ikan mangsa" },
    { startSec: 26.5, endSec: 33.0, text: "Hiu menggigit kabel karena menyangka ada mangsa tersembunyi.", highlight: "menggigit" },
    { startSec: 33.0, endSec: 39.5, text: "Insinyur melapisi kabelnya dengan kawat baja dan serat Kevlar.", highlight: "baja dan serat Kevlar" },
    { startSec: 39.5, endSec: 45.5, text: "Lalu menguburnya aman di bawah pasir dekat pantai.", highlight: "pasir" },
    { startSec: 45.5, endSec: 51.7, text: "Fakta teknik apa lagi yang bikin penasaran? Like, komen & follow!", highlight: "Like, komen" },
  ],
};

export const BlackBoxUnderwaterExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: BLACK_BOX_UNDERWATER_CONFIG });

export const SubseaCableSharkExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: SUBSEA_CABLE_SHARK_CONFIG });

export const JENDELA_BULAT_CONFIG: ExplainerConfig = {
  id: "JendelaBulatExplainer",
  theme: "editorial_toon",
  channelBadge: "Cerita Teknik",
  audioPath: "audio/jendela-bulat/vo_riko.mp3",
  durationSec: 54.5,
  hookLine1: "KENAPA JENDELA PESAWAT",
  hookLine1Color: "#FFFFFF",
  hookLine2: "DIBUAT BULAT, BUKAN KOTAK?",
  hookLine2Color: "#FFE600",
  bottomBadge: "TEGANGAN 3X DI SUDUT KOTAK!",
  sourceText: "RAE Farnborough / Court of Inquiry 1954",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Lo tim jendela bulat aman atau desain kotak lebih cakep?",
    startSec: 48.5,
    accentColor: "#FFE600",
  },
  scenes: [
    { imagePath: "images/jendela-bulat/scene1.jpg", startSec: 0, endSec: 6.81, panDirection: "in", callouts: [{ label: "Jendela Kotak Comet 1954", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/jendela-bulat/scene2.jpg", startSec: 6.81, endSec: 13.62, panDirection: "right", callouts: [{ label: "Dua Comet Hancur di Udara", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/jendela-bulat/scene3.jpg", startSec: 13.62, endSec: 20.44, panDirection: "in", callouts: [{ label: "Uji Tangki Air Farnborough", labelX: 38, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/jendela-bulat/scene4.jpg", startSec: 20.44, endSec: 27.25, panDirection: "left", callouts: [{ label: "Retak dari Sudut Kotak", labelX: 62, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/jendela-bulat/scene5.jpg", startSec: 27.25, endSec: 34.06, panDirection: "in", callouts: [{ label: "Tegangan 3x di Sudut Tajam", labelX: 38, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#70FF00" }] },
    { imagePath: "images/jendela-bulat/scene6.jpg", startSec: 34.06, endSec: 40.88, panDirection: "right", callouts: [{ label: "Retak Lelah Tumbuh Diam-diam", labelX: 62, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FF6B6B" }] },
    { imagePath: "images/jendela-bulat/scene7.jpg", startSec: 40.88, endSec: 47.69, panDirection: "in", callouts: [{ label: "Jendela Bulat Sebar Tekanan", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/jendela-bulat/scene8.jpg", startSec: 47.69, endSec: 54.5, panDirection: "left", callouts: [{ label: "Standar Keselamatan Modern", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#70FF00" }] },
  ],
  subtitles: [
    { startSec: 0, endSec: 6.81, text: "Jendela kotak pernah bikin pesawat jatuh.", highlight: "kotak" },
    { startSec: 6.81, endSec: 13.62, text: "Tahun 1954, dua Comet hancur di udara, 56 orang tewas.", highlight: "56 orang" },
    { startSec: 13.62, endSec: 20.44, text: "Penyelidik merendam badan pesawat di tangki air dan memompanya.", highlight: "tangki air" },
    { startSec: 20.44, endSec: 27.25, text: "Sekitar 3.000 siklus tekanan, badannya pecah dari sudut kotak.", highlight: "3.000 siklus" },
    { startSec: 27.25, endSec: 34.06, text: "Di sudut tajam, tegangan menumpuk sampai tiga kali lipat.", highlight: "tiga kali lipat" },
    { startSec: 34.06, endSec: 40.88, text: "Retak halus tumbuh diam-diam tiap penerbangan.", highlight: "diam-diam" },
    { startSec: 40.88, endSec: 47.69, text: "Jendela bulat menyebar tekanan merata, tanpa sudut retak.", highlight: "bulat" },
    { startSec: 47.69, endSec: 54.5, text: "Tim bulat aman atau kotak lebih cakep? Like, komen & follow!", highlight: "Like, komen" },
  ],
};

export const JendelaBulatExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: JENDELA_BULAT_CONFIG });

export const SAYAP_MELENTUR_CONFIG: ExplainerConfig = {
  id: "SayapMelenturExplainer",
  theme: "editorial_toon",
  channelBadge: "Cerita Teknik",
  audioPath: "audio/sayap-melentur/vo_riko.mp3",
  durationSec: 50,
  hookLine1: "SAYAP PATAH KALAU KAKU,",
  hookLine1Color: "#FFFFFF",
  hookLine2: "LENTUR ITU YANG NYELAMETIN",
  hookLine2Color: "#FFE600",
  bottomBadge: "UJUNG SAYAP NAIK 7,6 METER!",
  sourceText: "Boeing 787 Ultimate Load Test 2010 / FAA 14 CFR 25.305",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Pernah lihat sayap goyang pas turbulensi? Ceritain rasanya",
    startSec: 44,
    accentColor: "#FFE600",
  },
  scenes: [
    { imagePath: "images/sayap-melentur/scene1.jpg", startSec: 0, endSec: 6.25, panDirection: "in", callouts: [{ label: "Sayap Melentur Saat Turbulensi", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/sayap-melentur/scene2.jpg", startSec: 6.25, endSec: 12.5, panDirection: "right", callouts: [{ label: "Uji Statik Boeing 787 (2010)", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/sayap-melentur/scene3.jpg", startSec: 12.5, endSec: 18.75, panDirection: "in", callouts: [{ label: "Ujung Sayap Naik 7,6 Meter", labelX: 38, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/sayap-melentur/scene4.jpg", startSec: 18.75, endSec: 25, panDirection: "left", callouts: [{ label: "Beban Angin Diserap & Disebar", labelX: 62, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/sayap-melentur/scene5.jpg", startSec: 25, endSec: 31.25, panDirection: "in", callouts: [{ label: "Sayap Kaku: Retak di Pangkal", labelX: 38, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#70FF00" }] },
    { imagePath: "images/sayap-melentur/scene6.jpg", startSec: 31.25, endSec: 37.5, panDirection: "right", callouts: [{ label: "Kaku = Jauh Lebih Berat", labelX: 62, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FF6B6B" }] },
    { imagePath: "images/sayap-melentur/scene7.jpg", startSec: 37.5, endSec: 43.75, panDirection: "in", callouts: [{ label: "Normal: Cuma Bergerak 0,5 Meter", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/sayap-melentur/scene8.jpg", startSec: 43.75, endSec: 50, panDirection: "left", callouts: [{ label: "Lentur = Perlindungan", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#70FF00" }] },
  ],
  subtitles: [
    { startSec: 0, endSec: 6.25, text: "Sayap patah kalau kaku, lentur itu yang nyelametin.", highlight: "kaku" },
    { startSec: 6.25, endSec: 12.5, text: "Pas turbulensi, ujung sayap naik-turun. Itu desain, bukan kerusakan.", highlight: "desain" },
    { startSec: 12.5, endSec: 18.75, text: "Tahun 2010, Boeing menarik sayap 787 sampai ujungnya naik 7,6 meter.", highlight: "7,6 meter" },
    { startSec: 18.75, endSec: 25, text: "Bebannya 150 persen gaya paling ekstrem seumur hidup pesawat. Tidak patah.", highlight: "150 persen" },
    { startSec: 25, endSec: 31.25, text: "Sayap lentur menyerap hantaman angin dan menyebar bebannya.", highlight: "menyerap" },
    { startSec: 31.25, endSec: 37.5, text: "Sayap kaku menumpuk semua beban di pangkal, di situlah retak lahir.", highlight: "pangkal" },
    { startSec: 37.5, endSec: 43.75, text: "Di penerbangan normal, ujung sayap cuma bergerak sekitar setengah meter.", highlight: "setengah meter" },
    { startSec: 43.75, endSec: 50, text: "Simpan buat nenangin teman yang panik turbulensi! Like, komen & follow!", highlight: "Like, komen" },
  ],
};

export const SayapMelenturExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: SAYAP_MELENTUR_CONFIG });

export const LAMPU_KABIN_CONFIG: ExplainerConfig = {
  id: "LampuKabinExplainer",
  theme: "editorial_toon",
  channelBadge: "Cerita Teknik",
  audioPath: "audio/lampu-kabin/vo_riko.mp3",
  durationSec: 49.5,
  hookLine1: "LAMPU KABIN DIMATIKAN",
  hookLine1Color: "#FFFFFF",
  hookLine2: "BUKAN BUAT TIDUR",
  hookLine2Color: "#FFE600",
  bottomBadge: "PERSIAPAN EVAKUASI 90 DETIK!",
  sourceText: "FAA 14 CFR 25.803 / Simple Flying",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Lo lebih tenang kabin gelap atau terang pas takeoff?",
    startSec: 43.5,
    accentColor: "#FFE600",
  },
  scenes: [
    { imagePath: "images/lampu-kabin/scene1.jpg", startSec: 0, endSec: 6.19, panDirection: "in", callouts: [{ label: "Lampu Mati Bukan Buat Tidur", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/lampu-kabin/scene2.jpg", startSec: 6.19, endSec: 12.38, panDirection: "right", callouts: [{ label: "Fase Paling Kritis: Takeoff", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/lampu-kabin/scene3.jpg", startSec: 12.38, endSec: 18.56, panDirection: "in", callouts: [{ label: "Evakuasi Darurat di Landasan Gelap", labelX: 38, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/lampu-kabin/scene4.jpg", startSec: 18.56, endSec: 24.75, panDirection: "left", callouts: [{ label: "Mata Adaptasi Gelap 5-10 Menit", labelX: 62, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/lampu-kabin/scene5.jpg", startSec: 24.75, endSec: 30.94, panDirection: "in", callouts: [{ label: "Lampu Jalur Lantai Menyala", labelX: 38, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#70FF00" }] },
    { imagePath: "images/lampu-kabin/scene6.jpg", startSec: 30.94, endSec: 37.12, panDirection: "right", callouts: [{ label: "Kru Cek Api & Puing di Luar", labelX: 62, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FF6B6B" }] },
    { imagePath: "images/lampu-kabin/scene7.jpg", startSec: 37.12, endSec: 43.31, panDirection: "in", callouts: [{ label: "Tirai Jendela Wajib Dibuka", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/lampu-kabin/scene8.jpg", startSec: 43.31, endSec: 49.5, panDirection: "left", callouts: [{ label: "Terbang Malam dengan Aman", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#70FF00" }] },
  ],
  subtitles: [
    { startSec: 0, endSec: 6.19, text: "Lampu mati bukan buat tidur.", highlight: "bukan buat tidur" },
    { startSec: 6.19, endSec: 12.38, text: "Itu persiapan evakuasi kalau darurat saat lepas landas.", highlight: "evakuasi" },
    { startSec: 12.38, endSec: 18.56, text: "Takeoff dan landing adalah fase paling kritis penerbangan.", highlight: "paling kritis" },
    { startSec: 18.56, endSec: 24.75, text: "Evakuasi penuh wajib tuntas dalam 90 detik.", highlight: "90 detik" },
    { startSec: 24.75, endSec: 30.94, text: "Mata butuh 5 sampai 10 menit beradaptasi dari terang ke gelap.", highlight: "5 sampai 10 menit" },
    { startSec: 30.94, endSec: 37.12, text: "Kabin redup bikin tanda EXIT dan lampu jalur lantai jelas terlihat.", highlight: "jelas terlihat" },
    { startSec: 37.12, endSec: 43.31, text: "Kru bisa mengintip keluar: ada api atau puing di sisi pesawat?", highlight: "api atau puing" },
    { startSec: 43.31, endSec: 49.5, text: "Tirai jendela dibuka biar kondisi luar kelihatan. Like, komen & follow!", highlight: "Like, komen" },
  ],
};

export const LampuKabinExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: LAMPU_KABIN_CONFIG });

export const MASKER_OKSIGEN_CONFIG: ExplainerConfig = {
  id: "MaskerOksigenExplainer",
  theme: "editorial_toon",
  channelBadge: "Fast Fact",
  audioPath: "audio/masker-oksigen/vo_sami.mp3",
  durationSec: 56.5,
  hookLine1: "MASKER OKSIGEN CUMA 12 MENIT",
  hookLine1Color: "#FFFFFF",
  hookLine2: "ITU SENGAJA, BUKAN PELIT",
  hookLine2Color: "#FFE600",
  bottomBadge: "CUKUP BUAT TURUN KE 10.000 KAKI!",
  sourceText: "FAA CAMI 2021 / 14 CFR 121.333",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Kalau masker turun, pasang dulu ke diri sendiri atau ke anak?",
    startSec: 50.5,
    accentColor: "#00F2FE",
  },
  scenes: [
    { imagePath: "images/masker-oksigen/scene1.jpg", startSec: 0, endSec: 7.06, panDirection: "in", callouts: [{ label: "Masker Turun Otomatis", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/masker-oksigen/scene2.jpg", startSec: 7.06, endSec: 14.12, panDirection: "right", callouts: [{ label: "Generator Oksigen Kimia", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/masker-oksigen/scene3.jpg", startSec: 14.12, endSec: 21.19, panDirection: "in", callouts: [{ label: "Pin Pemicu Memulai Reaksi", labelX: 38, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/masker-oksigen/scene4.jpg", startSec: 21.19, endSec: 28.25, panDirection: "left", callouts: [{ label: "Suplai 12-20 Menit", labelX: 62, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/masker-oksigen/scene5.jpg", startSec: 28.25, endSec: 35.31, panDirection: "in", callouts: [{ label: "Turun Darurat ke 10.000 Kaki", labelX: 38, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#70FF00" }] },
    { imagePath: "images/masker-oksigen/scene6.jpg", startSec: 35.31, endSec: 42.38, panDirection: "right", callouts: [{ label: "Target Turun: 10 Menit", labelX: 62, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FF6B6B" }] },
    { imagePath: "images/masker-oksigen/scene7.jpg", startSec: 42.38, endSec: 49.44, panDirection: "in", callouts: [{ label: "Pasang Masker Sendiri Dulu", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/masker-oksigen/scene8.jpg", startSec: 49.44, endSec: 56.5, panDirection: "left", callouts: [{ label: "Lalu Bantu Anak di Sebelah", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#70FF00" }] },
  ],
  subtitles: [
    { startSec: 0, endSec: 7.06, text: "12 menit itu sengaja, bukan pelit.", highlight: "sengaja" },
    { startSec: 7.06, endSec: 14.12, text: "Oksigen masker bukan dari tangki raksasa, tapi generator kimia.", highlight: "generator kimia" },
    { startSec: 14.12, endSec: 21.19, text: "Masker ditarik, pin lepas, reaksi kimia menghasilkan oksigen.", highlight: "reaksi kimia" },
    { startSec: 21.19, endSec: 28.25, text: "Suplai sekitar 12 sampai 20 menit, tergantung tipe pesawat.", highlight: "12 sampai 20 menit" },
    { startSec: 28.25, endSec: 35.31, text: "Cukup untuk turun darurat ke 10.000 kaki, udara bisa dihirup lagi.", highlight: "10.000 kaki" },
    { startSec: 35.31, endSec: 42.38, text: "Penurunan itu targetnya sekitar 10 menit saja.", highlight: "10 menit" },
    { startSec: 42.38, endSec: 49.44, text: "Pasang masker lo dulu: waktu sadar di ketinggian cuma 15-30 detik.", highlight: "15-30 detik" },
    { startSec: 49.44, endSec: 56.5, text: "Baru bantu anak di sebelah lo. Like, komen & follow!", highlight: "Like, komen" },
  ],
};

export const MaskerOksigenExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: MASKER_OKSIGEN_CONFIG });

export const TOILET_PESAWAT_CONFIG: ExplainerConfig = {
  id: "ToiletPesawatExplainer",
  theme: "editorial_toon",
  channelBadge: "Fast Fact",
  audioPath: "audio/toilet-pesawat/vo_sami.mp3",
  durationSec: 59,
  hookLine1: "FLUSH PESAWAT BUKAN",
  hookLine1Color: "#FFFFFF",
  hookLine2: "SEDOT AIR BIASA",
  hookLine2Color: "#FFE600",
  bottomBadge: "AIR CUMA 200 ML PER FLUSH!",
  sourceText: "Simple Flying / Airways Magazine",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Lo pernah kaget sama suara flush pesawat?",
    startSec: 53,
    accentColor: "#00F2FE",
  },
  scenes: [
    { imagePath: "images/toilet-pesawat/scene1.jpg", startSec: 0, endSec: 7.38, panDirection: "in", callouts: [{ label: "Flush Vakum Bikin Kaget", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/toilet-pesawat/scene2.jpg", startSec: 7.38, endSec: 14.75, panDirection: "right", callouts: [{ label: "Beda Tekanan Kabin vs Luar", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/toilet-pesawat/scene3.jpg", startSec: 14.75, endSec: 22.12, panDirection: "in", callouts: [{ label: "Katup Membuka, Udara Melesat", labelX: 38, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/toilet-pesawat/scene4.jpg", startSec: 22.12, endSec: 29.5, panDirection: "left", callouts: [{ label: "Air Cuma 200 mL + Cairan Biru", labelX: 62, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/toilet-pesawat/scene5.jpg", startSec: 29.5, endSec: 36.88, panDirection: "in", callouts: [{ label: "Pompa Vakum Saat di Darat", labelX: 38, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#70FF00" }] },
    { imagePath: "images/toilet-pesawat/scene6.jpg", startSec: 36.88, endSec: 44.25, panDirection: "right", callouts: [{ label: "Tangki Limbah Tertutup", labelX: 62, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FF6B6B" }] },
    { imagePath: "images/toilet-pesawat/scene7.jpg", startSec: 44.25, endSec: 51.62, panDirection: "in", callouts: [{ label: "Disedot Honey Truck", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/toilet-pesawat/scene8.jpg", startSec: 51.62, endSec: 59, panDirection: "left", callouts: [{ label: "Tidak Pernah Dibuang di Udara", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#70FF00" }] },
  ],
  subtitles: [
    { startSec: 0, endSec: 7.38, text: "Flush pesawat bukan sedot air biasa.", highlight: "bukan sedot air" },
    { startSec: 7.38, endSec: 14.75, text: "Yang menyedot bukan air, tapi perbedaan tekanan udara.", highlight: "perbedaan tekanan" },
    { startSec: 14.75, endSec: 22.12, text: "Udara kabin melesat keluar lewat pipa sempit. Itulah suara whoosh-nya!", highlight: "whoosh" },
    { startSec: 22.12, endSec: 29.5, text: "Air bilas cuma sekitar 200 mililiter per flush, plus disinfektan biru.", highlight: "200 mililiter" },
    { startSec: 29.5, endSec: 36.88, text: "Toilet rumah butuh 6 liter sekali siram. Beda jauh!", highlight: "6 liter" },
    { startSec: 36.88, endSec: 44.25, text: "Di darat, pompa vakum listrik yang mengambil alih sedotannya.", highlight: "pompa vakum" },
    { startSec: 44.25, endSec: 51.62, text: "Limbah ditampung di tangki tertutup, disedot truk setelah mendarat.", highlight: "tangki tertutup" },
    { startSec: 51.62, endSec: 59, text: "Tidak pernah dibuang di udara! Like, komen & follow!", highlight: "Like, komen" },
  ],
};

export const ToiletPesawatExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: TOILET_PESAWAT_CONFIG });

export const MODE_PESAWAT_CONFIG: ExplainerConfig = {
  id: "ModePesawatExplainer",
  theme: "editorial_toon",
  channelBadge: "Fast Fact",
  audioPath: "audio/mode-pesawat/vo_sami.mp3",
  durationSec: 59,
  hookLine1: "SATU SINYAL BISA",
  hookLine1Color: "#FFFFFF",
  hookLine2: "GANGGU KOKPIT",
  hookLine2Color: "#FFE600",
  bottomBadge: "DENGUNG KAYAK NYAMUK DI HEADSET!",
  sourceText: "FAA AC 91.21-1D / AD 2022-05-04",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Lo tim mode pesawat selalu on atau pernah lupa?",
    startSec: 53,
    accentColor: "#00F2FE",
  },
  scenes: [
    { imagePath: "images/mode-pesawat/scene1.jpg", startSec: 0, endSec: 7.38, panDirection: "in", callouts: [{ label: "Dengung Masuk Headset Pilot", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/mode-pesawat/scene2.jpg", startSec: 7.38, endSec: 14.75, panDirection: "right", callouts: [{ label: "HP Terus Mencari Sinyal", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/mode-pesawat/scene3.jpg", startSec: 14.75, endSec: 22.12, panDirection: "in", callouts: [{ label: "150 HP Barengan Saat Takeoff", labelX: 38, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/mode-pesawat/scene4.jpg", startSec: 22.12, endSec: 29.5, panDirection: "left", callouts: [{ label: "Fase Paling Kritis Penerbangan", labelX: 62, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/mode-pesawat/scene5.jpg", startSec: 29.5, endSec: 36.88, panDirection: "in", callouts: [{ label: "Dengung Kayak Nyamuk", labelX: 38, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#70FF00" }] },
    { imagePath: "images/mode-pesawat/scene6.jpg", startSec: 36.88, endSec: 44.25, panDirection: "right", callouts: [{ label: "Tower 5G di Dekat Bandara", labelX: 62, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FF6B6B" }] },
    { imagePath: "images/mode-pesawat/scene7.jpg", startSec: 44.25, endSec: 51.62, panDirection: "in", callouts: [{ label: "Radio Altimeter Pengukur Ketinggian", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/mode-pesawat/scene8.jpg", startSec: 51.62, endSec: 59, panDirection: "left", callouts: [{ label: "Mode Pesawat: Aman Duluan", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#70FF00" }] },
  ],
  subtitles: [
    { startSec: 0, endSec: 7.38, text: "Satu sinyal bisa ganggu kokpit.", highlight: "ganggu kokpit" },
    { startSec: 7.38, endSec: 14.75, text: "HP yang nyari sinyal bisa jadi dengung nyaring di headset pilot.", highlight: "dengung" },
    { startSec: 14.75, endSec: 22.12, text: "Kayak nyamuk nempel di kuping, kata-kata menara bisa ketutup.", highlight: "nyamuk" },
    { startSec: 22.12, endSec: 29.5, text: "Satu HP kecil efeknya, tapi 150 HP barengan pas takeoff?", highlight: "150 HP" },
    { startSec: 29.5, endSec: 36.88, text: "Makanya FAA dan FCC tegas: aman duluan, sebelum ada kejadian.", highlight: "aman duluan" },
    { startSec: 36.88, endSec: 44.25, text: "Heboh 5G 2022 biangnya tower di darat, bukan HP penumpang.", highlight: "tower di darat" },
    { startSec: 44.25, endSec: 51.62, text: "Frekuensinya mepet radio altimeter, pengukur ketinggian pesawat.", highlight: "radio altimeter" },
    { startSec: 51.62, endSec: 59, text: "Belum ada kecelakaan terbukti karena HP. Like, komen & follow!", highlight: "Like, komen" },
  ],
};

export const ModePesawatExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: MODE_PESAWAT_CONFIG });

export const LUBANG_JENDELA_CONFIG: ExplainerConfig = {
  id: "LubangJendelaExplainer",
  theme: "editorial_toon",
  channelBadge: "Cerita Teknik",
  audioPath: "audio/lubang-jendela/vo_riko.mp3",
  durationSec: 51.5,
  hookLine1: "JENDELA PESAWAT BOLONG?",
  hookLine1Color: "#FFFFFF",
  hookLine2: "SENGAJA, BUKAN CACAT!",
  hookLine2Color: "#FFE600",
  bottomBadge: "LUBANG KECIL, TUGAS BESAR!",
  sourceText: "GKN Aerospace / Manual Boeing 737",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Lo tim periksa jendela dulu atau langsung duduk manis?",
    startSec: 45.5,
    accentColor: "#FFE600",
  },
  scenes: [
    { imagePath: "images/lubang-jendela/scene1.jpg", startSec: 0, endSec: 6.44, panDirection: "in", callouts: [{ label: "Lubang Mungil di Bawah Jendela", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/lubang-jendela/scene2.jpg", startSec: 6.44, endSec: 12.88, panDirection: "right", callouts: [{ label: "Tiga Panel Akrilik Jendela Kabin", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/lubang-jendela/scene3.jpg", startSec: 12.88, endSec: 19.31, panDirection: "in", callouts: [{ label: "Bleed Hole di Panel Tengah", labelX: 38, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/lubang-jendela/scene4.jpg", startSec: 19.31, endSec: 25.75, panDirection: "left", callouts: [{ label: "Panel Luar Menanggung Tekanan Penuh", labelX: 62, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/lubang-jendela/scene5.jpg", startSec: 25.75, endSec: 32.19, panDirection: "in", callouts: [{ label: "Panel Tengah: Cadangan Segar", labelX: 38, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#70FF00" }] },
    { imagePath: "images/lubang-jendela/scene6.jpg", startSec: 32.19, endSec: 38.62, panDirection: "right", callouts: [{ label: "Uap Air Keluar, Jendela Jernih", labelX: 62, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FF6B6B" }] },
    { imagePath: "images/lubang-jendela/scene7.jpg", startSec: 38.62, endSec: 45.06, panDirection: "in", callouts: [{ label: "Pandangan Jernih di Ketinggian", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/lubang-jendela/scene8.jpg", startSec: 45.06, endSec: 51.5, panDirection: "left", callouts: [{ label: "Jendela Jernih, Terbang Tenang", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#70FF00" }] },
  ],
  subtitles: [
    { startSec: 0, endSec: 6.44, text: "Jendela pesawat lo bolong, tapi sengaja.", highlight: "sengaja" },
    { startSec: 6.44, endSec: 12.88, text: "Di bagian bawah jendela ada lubang mungil: bleed hole.", highlight: "bleed hole" },
    { startSec: 12.88, endSec: 19.31, text: "Jendela kabin sebenarnya tiga lapis akrilik.", highlight: "tiga lapis" },
    { startSec: 19.31, endSec: 25.75, text: "Lubangnya cuma menembus panel tengah, panel luar tetap rapat.", highlight: "panel tengah" },
    { startSec: 25.75, endSec: 32.19, text: "Udara kabin masuk pelan ke celah antar panel, tekanan jadi seimbang.", highlight: "seimbang" },
    { startSec: 32.19, endSec: 38.62, text: "Beban tekanan penuh ditanggung panel luar yang paling kuat.", highlight: "panel luar" },
    { startSec: 38.62, endSec: 45.06, text: "Panel tengah istirahat jadi cadangan, uap air dibuang biar tidak berembun.", highlight: "cadangan" },
    { startSec: 45.06, endSec: 51.5, text: "Lo tim periksa jendela dulu atau duduk manis? Like, komen & follow!", highlight: "Like, komen" },
  ],
};

export const LubangJendelaExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: LUBANG_JENDELA_CONFIG });

export const CAT_PUTIH_CONFIG: ExplainerConfig = {
  id: "CatPutihExplainer",
  theme: "editorial_toon",
  channelBadge: "Cerita Teknik",
  audioPath: "audio/cat-putih/vo_riko.mp3",
  durationSec: 56.5,
  hookLine1: "KENAPA PESAWAT DICAT PUTIH?",
  hookLine1Color: "#FFFFFF",
  hookLine2: "BUKAN BIAR KELIHATAN BERSIH",
  hookLine2Color: "#FFE600",
  bottomBadge: "CATNYA SAJA RATUSAN KILOGRAM!",
  sourceText: "Simple Flying / Aerospace Global News",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Lo tim putih bersih atau livery warna-warni?",
    startSec: 50.5,
    accentColor: "#FFE600",
  },
  scenes: [
    { imagePath: "images/cat-putih/scene1.jpg", startSec: 0, endSec: 7.06, panDirection: "in", callouts: [{ label: "Putih Memantulkan Panas Matahari", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/cat-putih/scene2.jpg", startSec: 7.06, endSec: 14.12, panDirection: "right", callouts: [{ label: "Kabin Lebih Adem, AC Ringan", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/cat-putih/scene3.jpg", startSec: 14.12, endSec: 21.19, panDirection: "in", callouts: [{ label: "Retak & Rembesan Jelas Terlihat", labelX: 38, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/cat-putih/scene4.jpg", startSec: 21.19, endSec: 28.25, panDirection: "left", callouts: [{ label: "Cat Satu Pesawat: Ratusan Kilogram", labelX: 62, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#00F2FE" }] },
    { imagePath: "images/cat-putih/scene5.jpg", startSec: 28.25, endSec: 35.31, panDirection: "in", callouts: [{ label: "Warna Pudar Kena UV, Putih Awet", labelX: 38, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#70FF00" }] },
    { imagePath: "images/cat-putih/scene6.jpg", startSec: 35.31, endSec: 42.38, panDirection: "right", callouts: [{ label: "Burung Menghindar dari Pesawat Terang", labelX: 62, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, color: "#FF6B6B" }] },
    { imagePath: "images/cat-putih/scene7.jpg", startSec: 42.38, endSec: 49.44, panDirection: "in", callouts: [{ label: "Tinggal Ganti Logo Buat Operator Baru", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, color: "#FFE600" }] },
    { imagePath: "images/cat-putih/scene8.jpg", startSec: 49.44, endSec: 56.5, panDirection: "left", callouts: [{ label: "Terbang Adem, Aman, Ekonomis", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, color: "#70FF00" }] },
  ],
  subtitles: [
    { startSec: 0, endSec: 7.06, text: "Kenapa hampir semua pesawat dicat putih? Bukan biar kelihatan bersih.", highlight: "putih" },
    { startSec: 7.06, endSec: 14.12, text: "Putih memantulkan sinar matahari, badan pesawat lebih adem.", highlight: "memantulkan" },
    { startSec: 14.12, endSec: 21.19, text: "Pendingin kabin tidak perlu kerja terlalu keras.", highlight: "Pendingin kabin" },
    { startSec: 21.19, endSec: 28.25, text: "Di permukaan putih, retak, korosi, dan rembesan oli gampang terlihat.", highlight: "gampang terlihat" },
    { startSec: 28.25, endSec: 35.31, text: "Cat warna cepat pudar kena ultraviolet dan butuh lapisan lebih banyak.", highlight: "pudar" },
    { startSec: 35.31, endSec: 42.38, text: "Cat satu pesawat besar beratnya bisa ratusan kilogram.", highlight: "ratusan kilogram" },
    { startSec: 42.38, endSec: 49.44, text: "Pesawat putih gampang disewakan lagi, tinggal ganti logo.", highlight: "ganti logo" },
    { startSec: 49.44, endSec: 56.5, text: "Lo tim putih bersih atau livery warna-warni? Like, komen & follow!", highlight: "Like, komen" },
  ],
};

export const CatPutihExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: CAT_PUTIH_CONFIG });

export const TURBULENSI_CONFIG: ExplainerConfig = {
  id: "TurbulensiExplainer",
  theme: "editorial_toon",
  channelBadge: "Cerita Teknik",
  audioPath: "audio/turbulensi/vo_riko.mp3",
  durationSec: 55.0,
  hookLine1: "TURBULENSI PARAH,",
  hookLine1Color: "#FFFFFF",
  hookLine2: "PESAWAT BAKAL JATUH?",
  hookLine2Color: "#FFE600",
  bottomBadge: "FAKTANYA: TIDAK PERNAH!",
  sourceText: "FAA Part 25 / NTSB SS-21-01 / Uji Statis Boeing 787 (2010)",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Lo pernah ngalamin turbulensi paling parah di mana?",
    startSec: 49.0,
    accentColor: "#FFE600",
  },
  scenes: [
    { imagePath: "images/turbulensi/scene1.jpg", videoPath: "videos/turbulensi/scene1.mp4", startSec: 0, endSec: 6.88, panDirection: "in", callouts: [{ label: "Kabin Goyang, Pesawat Tetap Terkendali", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, accentColor: "#FFE600" }] },
    { imagePath: "images/turbulensi/scene2.jpg", videoPath: "videos/turbulensi/scene2.mp4", startSec: 6.88, endSec: 13.75, panDirection: "right", callouts: [{ label: "Sertifikasi: 2,5x Bobot Sendiri + 50%", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, accentColor: "#00F2FE" }] },
    { imagePath: "images/turbulensi/scene3.jpg", startSec: 13.75, endSec: 20.63, panDirection: "in", callouts: [{ label: "Sayap Melentur = Fitur Keselamatan", labelX: 38, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, accentColor: "#FFE600" }] },
    { imagePath: "images/turbulensi/scene4.jpg", startSec: 20.63, endSec: 27.5, panDirection: "left", callouts: [{ label: "Radar Cuaca: Pilot Menghindari Badai", labelX: 62, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, accentColor: "#00F2FE" }] },
    { imagePath: "images/turbulensi/scene5.jpg", videoPath: "videos/turbulensi/scene5.mp4", startSec: 27.5, endSec: 34.38, panDirection: "in", callouts: [{ label: "Uji 787: Ujung Sayap Naik 7,6 Meter", labelX: 38, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, accentColor: "#70FF00" }] },
    { imagePath: "images/turbulensi/scene6.jpg", startSec: 34.38, endSec: 41.25, panDirection: "right", callouts: [{ label: "Yang Bahaya: Penumpang Tanpa Sabuk", labelX: 62, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, accentColor: "#FF6B6B" }] },
    { imagePath: "images/turbulensi/scene7.jpg", startSec: 41.25, endSec: 48.13, panDirection: "in", callouts: [{ label: "Korban Luka Hampir Semua Tanpa Sabuk", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, accentColor: "#FFE600" }] },
    { imagePath: "images/turbulensi/scene8.jpg", startSec: 48.13, endSec: 55.0, panDirection: "left", callouts: [{ label: "Turbulensi Tak Menjatuhkan Pesawat Modern", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, accentColor: "#70FF00" }] },
  ],
  subtitles: [
    { startSec: 0, endSec: 6.88, text: "Pesawat goyang keras, lo pikir bakal jatuh.", highlightWord: "jatuh" },
    { startSec: 6.88, endSec: 13.75, text: "Padahal turbulensi belum pernah menjatuhkan pesawat penumpang modern.", highlightWord: "belum pernah" },
    { startSec: 13.75, endSec: 20.63, text: "Pesawat disertifikasi menahan dua setengah kali bobotnya, plus margin 50 persen.", highlightWord: "dua setengah kali" },
    { startSec: 20.63, endSec: 27.5, text: "Sayapnya dirancang melentur: uji 787, ujung sayap naik 7,6 meter tanpa patah.", highlightWord: "7,6 meter" },
    { startSec: 27.5, endSec: 34.38, text: "Satu-satunya pesawat jatuh karena turbulensi: tahun 1966, sebelum standar sekarang.", highlightWord: "1966" },
    { startSec: 34.38, endSec: 41.25, text: "Yang bahaya bukan pesawatnya, tapi lo yang nggak pakai sabuk.", highlightWord: "nggak pakai sabuk" },
    { startSec: 41.25, endSec: 48.13, text: "2009-2018: hampir semua yang luka serius itu penumpang tanpa sabuk.", highlightWord: "tanpa sabuk" },
    { startSec: 48.13, endSec: 55.0, text: "Kirim ke temen lo yang takut terbang. Turbulensi terparah lo di mana? Like, Komen, Follow!", highlightWord: "Like, Komen" },
  ],
};

export const TurbulensiExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: TURBULENSI_CONFIG });

export const KETINGGIAN_CONFIG: ExplainerConfig = {
  id: "KetinggianExplainer",
  theme: "editorial_toon",
  channelBadge: "Cerita Teknik",
  audioPath: "audio/ketinggian-35000/vo_riko.mp3",
  durationSec: 52.2,
  hookLine1: "35.000 KAKI: MINUS 54°,",
  hookLine1Color: "#FFFFFF",
  hookLine2: "KOK MALAH PALING IRIT?",
  hookLine2Color: "#FFE600",
  bottomBadge: "FAKTANYA: TITIK PALING IRIT!",
  sourceText: "FAA Airplane Flying Handbook / 14 CFR 25.841 / FAA AC 61-107B",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Lo tim terbang tinggi, atau mending rendah biar nggak ngeri?",
    startSec: 46.2,
    accentColor: "#FFE600",
  },
  scenes: [
    { imagePath: "images/ketinggian-35000/scene2.jpg", videoPath: "videos/ketinggian-35000/scene1.mp4", startSec: 0, endSec: 6.53, panDirection: "in", callouts: [{ label: "35.000 Kaki: Minus 54 Derajat di Luar", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, accentColor: "#FFE600" }] },
    { imagePath: "images/ketinggian-35000/scene2.jpg", startSec: 6.53, endSec: 13.05, panDirection: "right", callouts: [{ label: "Terbang di Atas Sebagian Besar Cuaca", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, accentColor: "#00F2FE" }] },
    { imagePath: "images/ketinggian-35000/scene3.jpg", startSec: 13.05, endSec: 19.58, panDirection: "in", callouts: [{ label: "Hambatan Turun Sampai Sepertiganya", labelX: 38, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, accentColor: "#FFE600" }] },
    { imagePath: "images/ketinggian-35000/scene4.jpg", startSec: 19.58, endSec: 26.10, panDirection: "left", callouts: [{ label: "Mesin Jet Makin Efisien di Udara Dingin", labelX: 62, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, accentColor: "#00F2FE" }] },
    { imagePath: "images/ketinggian-35000/scene5.jpg", startSec: 26.10, endSec: 32.63, panDirection: "in", callouts: [{ label: "Kabin Dijaga Setara 8.000 Kaki", labelX: 38, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, accentColor: "#FFE600" }] },
    { imagePath: "images/ketinggian-35000/scene6.jpg", startSec: 32.63, endSec: 39.15, panDirection: "right", callouts: [{ label: "Telinga Berdenging Pas Naik Itu Normal", labelX: 62, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, accentColor: "#70FF00" }] },
    { imagePath: "images/ketinggian-35000/scene8.jpg", videoPath: "videos/ketinggian-35000/scene7.mp4", startSec: 39.15, endSec: 45.68, panDirection: "in", callouts: [{ label: "Step Climb: Naik Bertahap Ikut Berat", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, accentColor: "#FFE600" }] },
    { imagePath: "images/ketinggian-35000/scene8.jpg", startSec: 45.68, endSec: 52.2, panDirection: "left", callouts: [{ label: "Ketinggian Itu Hitungan Bensin", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, accentColor: "#70FF00" }] },
  ],
  subtitles: [
    { startSec: 0, endSec: 6.53, text: "Di 35.000 kaki, udara di luar minus 54 derajat dan tipis banget.", highlightWord: "minus 54 derajat" },
    { startSec: 6.53, endSec: 13.05, text: "Tanpa kabin bertekanan, lo cuma punya 30 detik buat mikir jernih.", highlightWord: "30 detik" },
    { startSec: 13.05, endSec: 19.58, text: "Tapi justru di situlah pesawat paling hemat bensin.", highlightWord: "paling hemat bensin" },
    { startSec: 19.58, endSec: 26.10, text: "Udara tipis bikin hambatan turun sampai sepertiganya, mesin jet makin efisien di udara dingin.", highlightWord: "sepertiganya" },
    { startSec: 26.10, endSec: 32.63, text: "Kabin lo dijaga di tekanan setara 8.000 kaki, kayak kota pegunungan tinggi.", highlightWord: "8.000 kaki" },
    { startSec: 32.63, endSec: 39.15, text: "Pesawat juga naik bertahap, makin ringan makin tinggi, biar iritnya maksimal.", highlightWord: "naik bertahap" },
    { startSec: 39.15, endSec: 45.68, text: "Jadi ketinggian itu bukan pamer, itu hitungan bensin.", highlightWord: "hitungan bensin" },
    { startSec: 45.68, endSec: 52.2, text: "Kirim ke temen lo yang takut ketinggian. Tim tinggi atau rendah? Like, Komen, Follow!", highlightWord: "Like, Komen" },
  ],
};

export const KetinggianExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: KETINGGIAN_CONFIG });

export const BAHANBAKAR_CONFIG: ExplainerConfig = {
  id: "BahanBakarExplainer",
  theme: "editorial_toon",
  channelBadge: "Cerita Teknik",
  audioPath: "audio/bahan-bakar-di-sayap/vo_riko.mp3",
  durationSec: 65.9,
  hookLine1: "PULUHAN RIBU LITER BENSIN,",
  hookLine1Color: "#FFFFFF",
  hookLine2: "DI BAWAH KURSI LO?!",
  hookLine2Color: "#FFE600",
  bottomBadge: "FAKTANYA: SAYAP = TEMPAT PALING AMAN BUAT BENSIN!",
  sourceText: "Boeing 737 NG Fuel Capacity / ASTM D1655 Jet A / FAA Fuel Tank Inerting",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Lo tim duduk di sayap, atau di tengah?",
    startSec: 59.9,
    accentColor: "#FFE600",
  },
  scenes: [
    { imagePath: "images/bahan-bakar-di-sayap/scene1.jpg", videoPath: "videos/bahan-bakar-di-sayap/scene1.mp4", startSec: 0, endSec: 8.24, panDirection: "in", callouts: [{ label: "Puluhan Ribu Liter, Persis di Bawah Lo", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, accentColor: "#FFE600" }] },
    { imagePath: "images/bahan-bakar-di-sayap/scene2.jpg", videoPath: "videos/bahan-bakar-di-sayap/scene2.mp4", startSec: 8.24, endSec: 16.48, panDirection: "right", callouts: [{ label: "Sayap: Ruang Kosong yang Nggak Terpakai", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, accentColor: "#00F2FE" }] },
    { imagePath: "images/bahan-bakar-di-sayap/scene3.jpg", videoPath: "videos/bahan-bakar-di-sayap/scene3.mp4", startSec: 16.48, endSec: 24.71, panDirection: "in", callouts: [{ label: "Wet Wing: Dinding Sayap Jadi Tangki", labelX: 38, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, accentColor: "#FFE600" }] },
    { imagePath: "images/bahan-bakar-di-sayap/scene4.jpg", videoPath: "videos/bahan-bakar-di-sayap/scene4.mp4", startSec: 24.71, endSec: 32.95, panDirection: "left", callouts: [{ label: "737 Bawa 26.020 Liter, Sekitar 21 Ton", labelX: 62, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, accentColor: "#00F2FE" }] },
    { imagePath: "images/bahan-bakar-di-sayap/scene5.jpg", videoPath: "videos/bahan-bakar-di-sayap/scene5.mp4", startSec: 32.95, endSec: 41.19, panDirection: "in", callouts: [{ label: "Berat Bensin Melawan Gaya Angkat", labelX: 38, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, accentColor: "#FFE600" }] },
    { imagePath: "images/bahan-bakar-di-sayap/scene6.jpg", videoPath: "videos/bahan-bakar-di-sayap/scene6.mp4", startSec: 41.19, endSec: 49.43, panDirection: "right", callouts: [{ label: "Pas di Titik Berat: Seimbang Terus", labelX: 62, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, accentColor: "#70FF00" }] },
    { imagePath: "images/bahan-bakar-di-sayap/scene7.jpg", videoPath: "videos/bahan-bakar-di-sayap/scene7.mp4", startSec: 49.43, endSec: 57.66, panDirection: "in", callouts: [{ label: "Jet A: Titik Nyala di Atas 38 Derajat", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, accentColor: "#00F2FE" }] },
    { imagePath: "images/bahan-bakar-di-sayap/scene8.jpg", videoPath: "videos/bahan-bakar-di-sayap/scene8.mp4", startSec: 57.66, endSec: 65.9, panDirection: "left", callouts: [{ label: "Bukan Nekat, Itu Hitungan", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, accentColor: "#70FF00" }] },
  ],
  subtitles: [
    { startSec: 0, endSec: 5.5, text: "Lihat sayap pesawat ini, di dalamnya ada puluhan ribu liter bensin.", highlightWord: "puluhan ribu liter" },
    { startSec: 5.5, endSec: 11, text: "Iya, bensinnya disimpan di sayap, persis di bawah tempat lo duduk.", highlightWord: "di sayap" },
    { startSec: 11, endSec: 16.5, text: "Kok nggak dipindah ke tempat yang lebih aman? Justru sayap itu tempat paling amannya.", highlightWord: "paling amannya" },
    { startSec: 16.5, endSec: 24.7, text: "Pertama, sayap itu ruang kosong, terlalu sempit buat penumpang atau kargo, jadi dinding sayapnya sendiri dibikin jadi tangki.", highlightWord: "dibikin jadi tangki" },
    { startSec: 24.7, endSec: 31, text: "Kedua, bensin itu berat, satu Boeing 737 bawa sekitar dua puluh enam ribu liter, dua puluh satu ton.", highlightWord: "dua puluh satu ton" },
    { startSec: 31, endSec: 38, text: "Lift narik sayap ke atas, berat bensin narik ke bawah, jadi tekukan di pangkal sayap malah berkurang.", highlightWord: "malah berkurang" },
    { startSec: 38, endSec: 45.5, text: "Ketiga, sayap itu pas di titik berat pesawat, jadi keseimbangannya hampir nggak berubah walau bensinnya makin habis.", highlightWord: "titik berat" },
    { startSec: 45.5, endSec: 54.5, text: "Dan bensin pesawat beda sama bensin mobil, titik nyalanya di atas tiga puluh delapan derajat, plus tangki modern diisi nitrogen biar uapnya susah nyala.", highlightWord: "tiga puluh delapan derajat" },
    { startSec: 54.5, endSec: 58, text: "Jadi tangki di sayap itu bukan nekat, itu hitungan.", highlightWord: "hitungan" },
    { startSec: 58, endSec: 65.9, text: "Kirim ke temen lo yang takut duduk di atas sayap. Lo tim sayap atau tengah? Like, Komen, Follow!", highlightWord: "Like, Komen" },
  ],
};

export const BahanBakarExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: BAHANBAKAR_CONFIG });

export const SUARAMESIN_CONFIG: ExplainerConfig = {
  id: "SuaraMesinExplainer",
  theme: "editorial_toon",
  channelBadge: "Cerita Teknik",
  audioPath: "audio/suara-mesin/vo_riko.mp3",
  durationSec: 57,
  hookLine1: "MESIN PELAN, JATUH?",
  hookLine1Color: "#FFFFFF",
  hookLine2: "BUKAN MATI — SENGAJA",
  hookLine2Color: "#FFE600",
  bottomBadge: "FAKTANYA: PROSEDUR HEMAT MESIN!",
  sourceText: "Boeing 737 NG FCTM / FAA AC 91-53A / ICAO PANS-OPS Doc 8168",
  ctaBanner: {
    actionText: "LIKE, KOMEN & FOLLOW!",
    subText: "Lo pernah ngerasa jatuh setelah takeoff? Ceritain!",
    startSec: 50.5,
    accentColor: "#FFE600",
  },
  scenes: [
    { imagePath: "images/suara-mesin/scene1.jpg", videoPath: "videos/suara-mesin/scene1.mp4", startSec: 0, endSec: 4.93, panDirection: "in", callouts: [{ label: "Mesin Pelan Bukan Berarti Mati", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, accentColor: "#FFE600" }] },
    { imagePath: "images/suara-mesin/scene2.jpg", startSec: 4.93, endSec: 11.09, panDirection: "right", callouts: [{ label: "Sembilan Puluh Detik Setelah Lepas Landas", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, accentColor: "#00F2FE" }] },
    { imagePath: "images/suara-mesin/scene3.jpg", startSec: 11.09, endSec: 17.66, panDirection: "in", callouts: [{ label: "Tenaga Penuh: Maksimal Lima Menit", labelX: 38, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, accentColor: "#FFE600" }] },
    { imagePath: "images/suara-mesin/scene4.jpg", startSec: 17.66, endSec: 24.23, panDirection: "left", callouts: [{ label: "Tenaga Turun: 92 ke 84 Persen", labelX: 62, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, accentColor: "#00F2FE" }] },
    { imagePath: "images/suara-mesin/scene5.jpg", videoPath: "videos/suara-mesin/scene5.mp4", startSec: 24.23, endSec: 31.62, panDirection: "in", callouts: [{ label: "Tetap Naik, Cuma Lebih Pelan", labelX: 38, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, accentColor: "#FFE600" }] },
    { imagePath: "images/suara-mesin/scene6.jpg", startSec: 31.62, endSec: 40.65, panDirection: "right", callouts: [{ label: "Satu Mesin Mati Pun Tetap Naik", labelX: 62, labelY: 40, anchorX: 50, anchorY: 58, delaySec: 0.6, accentColor: "#70FF00" }] },
    { imagePath: "images/suara-mesin/scene7.jpg", startSec: 40.65, endSec: 45.58, panDirection: "in", callouts: [{ label: "Rumah di Bawah Tidak Kena Bising", labelX: 38, labelY: 38, anchorX: 50, anchorY: 56, delaySec: 0.6, accentColor: "#00F2FE" }] },
    { imagePath: "images/suara-mesin/scene8.jpg", startSec: 45.58, endSec: 57, panDirection: "left", callouts: [{ label: "Rasa Jatuh Itu Cuma Ilusi", labelX: 62, labelY: 39, anchorX: 50, anchorY: 57, delaySec: 0.6, accentColor: "#70FF00" }] },
  ],
  subtitles: [
    { startSec: 0, endSec: 2.46, text: "Mesin mendadak pelan. Perut serasa jatuh.", highlightWord: "Perut serasa jatuh" },
    { startSec: 2.46, endSec: 4.93, text: "Bukan mesin mati. Itu memang disengaja.", highlightWord: "disengaja" },
    { startSec: 4.93, endSec: 9.03, text: "Sembilan puluh detik setelah lepas landas, pilot menurunkan tenaga mesin.", highlightWord: "menurunkan tenaga" },
    { startSec: 9.03, endSec: 11.09, text: "Sesuai rencana sebelum pesawat berangkat.", highlightWord: "rencana" },
    { startSec: 11.09, endSec: 15.19, text: "Tenaga penuh cuma dipakai sebentar. Batas sertifikasinya sekitar lima menit.", highlightWord: "lima menit" },
    { startSec: 15.19, endSec: 17.66, text: "Fase itu paling panas buat mesin.", highlightWord: "paling panas" },
    { startSec: 17.66, endSec: 20.12, text: "Di sekitar seribu kaki, tenaga turun.", highlightWord: "seribu kaki" },
    { startSec: 20.12, endSec: 24.23, text: "Dari sembilan puluh dua persen ke delapan puluh empat persen.", highlightWord: "delapan puluh empat persen" },
    { startSec: 24.23, endSec: 26.69, text: "Pesawat tetap naik, cuma lebih pelan.", highlightWord: "tetap naik" },
    { startSec: 26.69, endSec: 31.62, text: "Alasannya dua: mesin lebih awet, dan rumah di bawah tidak kena bising.", highlightWord: "lebih awet" },
    { startSec: 31.62, endSec: 33.67, text: "Tenaga sisanya masih sangat cukup.", highlightWord: "sangat cukup" },
    { startSec: 33.67, endSec: 36.55, text: "Satu mesin mati pun pesawat tetap naik.", highlightWord: "tetap naik" },
    { startSec: 36.55, endSec: 40.65, text: "Lalu flap masuk bertahap, dengung pelan terdengar di bawah lantai.", highlightWord: "flap masuk" },
    { startSec: 40.65, endSec: 43.52, text: "Rasa jatuh itu cuma ilusi telinga dalam.", highlightWord: "ilusi" },
    { startSec: 43.52, endSec: 45.58, text: "Otak lo ketipu perubahan kecepatan.", highlightWord: "ketipu" },
    { startSec: 45.58, endSec: 49.68, text: "Kirim video ini ke temen lo yang takut pas takeoff.", highlightWord: "takut pas takeoff" },
    { startSec: 49.68, endSec: 53.38, text: "Lo pernah ngerasa jatuh setelah takeoff? Ceritain di komentar.", highlightWord: "Ceritain" },
    { startSec: 53.38, endSec: 55.84, text: "Jangan lupa Like, Komen, dan Follow.", highlightWord: "Like, Komen" },
  ],
};

export const SuaraMesinExplainer: React.FC = () =>
  React.createElement(Explainer3DReel, { config: SUARAMESIN_CONFIG });

