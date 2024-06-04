const settings = [
  {
    key: 'businessName',
    value: 'Taarufin'
  },
  {
    key: 'businessBotName',
    value: 'Shafiyya'
  },
  {
    key: 'businessInstagramID',
    value: '@taarufin.offical'
  },
  {
    key: 'businessInstagramUrl',
    value: 'https://www.instagram.com/taarufin.official/'
  },
]

const users = [
  // new user created from first incoming message
]

const blockTypes = [
  'message',
  'buttons',
  'question'
]

const userMessageInputs = [ // current session data
  {
    key: 'name',
    value: ''
  },
  {
    key: 'address',
    value: ''
  }
]

const blocks = [
  {
    id: 1,
    type: 'buttons',
    text: `Wa 'alaikumussalam warahmatullahi wabarakatuh.

    Perkenalkan, saya adalah chatbot bernama *{businessBotName}.*
    
    Saya akan membantu proses pendaftaran {businessName} anda sambil menunggu Admin merespon pesan secara langsung.
    
    Senang bisa membantu kamu 😊 
    Semoga ini menjadi langkah awal bertemu jodoh yg baik ya...
    
    *Syarat mengikuti program ini:*
    ° Islam
    ° Dewasa
    ° Siap nikah *(Max 1 thn dr skrg)*
    ° Sholat 5 waktu & menutup aurat
    
    Jika memenuhi kriteria di atas silahkan bergabung di *{businessInstagramID}*


    
    Ketik *NEXT* u/ melanjutkan
    
    `,
    options: [
      {
        text: 'NEXT',
        next: 2
      }
    ],
    isStartPoint: true
  },
  {
    id: 2,
    type: 'buttons',
    text: `Dijawab Oleh *{businessBotName}*

    *WAJIB DIPAHAMI*
    *WAJIB DIPAHAMI*
    *WAJIB DIPAHAMI*
    
    
    1. Data peserta dipost di *{businessInstagramID}.*
    
    2. Peserta boleh mengajukan atau bisa juga menerima pengajuan. Jika ada yg mengajukan taaruf, minta beliau mengisi formulir kosong (seperti yg akan dikirim pada pesan berikutnya).
    
    3. Silahkan berkomunikasi dg sopan & tidak melampaui batas.
    
    4. Bicarakan HANYA yg dirasa perlu u/ dicocokkan (aqidah, visi pernikahan, pendidikan, org tua, penyakit, dll).
    
    5. Sampaikn secara jujur, tidak melebih2kan dan tdk menutup-nutupi.
    
    6. Jika CV dirasa cocok, silahkan berkunjung (ihwan), atau meminta dikunjungi (ahwat) bertemu dg wali. Proses taaruf dilangsungkan di sini (di rumah akhwat). Di hadapan wali atau ustadz yg menjadi mediator. 
    
    7. Setelah melihat wajah (dihadapan wali), 
    COCOK = LANJUT, TIDAK = IKHTIAR LAGI.
    
    8. Khitbah - Nikah
    
    *Luruskan niat, JANGAN MAKSIAT, Allah melihat apa yg kita perbuat*
    
    NB: 
    ° Jodoh Allah yg tentukan kita hanya berikhtiar.
    ° Mungkin saja kita berikhtiar di sini, tetapi ternyata jodoh kita adalah teman kecil/tetangga kita.
    
    Ttd,
    Tim *{businessInstagramID}*
    
    
    
    Ketik *SETUJU* untuk melanjutkan.
    
    `,
    options: [
      {
        text: 'SETUJU',
        next: 3
      }
    ]
  },
  {
    id: 3,
    type: 'question',
    text: `Dijawab oleh *{businessBotName}*

    Dibawah ini akan ada beberapa pertanyaan yang akan saya ajukan.
    Mohon isi dengan benar dan jangan sampai mengisi data yg salah. Khususnya Email.

    * * *

    Baik kita mulai..
     
    Boleh saya tahu nama kamu? *_(Boleh diisi nama asli/samaran/panggilan)_`,
    input: 'name',
    next: 4,
    matchRules: [
      {
        type: 'greaterThanAndEqual',
        value: 5
      }
    ]
  },
  {
    id: 4,
    type: 'question',
    text: `Dijawab oleh *{businessBotName}*
    
    Halo {name}, salam kenal. 
    
    Apa alamat email aktif milik kamu?`,
    input: 'email',
    next: 5,
    matchRules: [
      {
        type: 'validEmail'
      }
    ]
  },
  {
    id: 5,
    type: 'question',
    text: `Dijawab oleh *{businessBotName}*
    
    Berapa tanggal lahir kamu? (contoh: 25-01-1990)`,
    input: 'dob',
    next: 6,
    matchRules: [
      {
        type: 'validDate',
        pattern: 'DD-MM-YYYY'
      }
    ]
  },
  {
    id: 6,
    type: 'question',
    text: `Dijawab oleh *{businessBotName}*
    
    Jenis kelamin kamu? (Laki-laki/Perempuan)`,
    input: 'gender',
    next: 7,
    matchRules: [
      {
        type: 'inArray',
        in: ['Laki-laki', 'Perempuan']
      }
    ]
  },
  {
    id: 7,
    type: 'question',
    text: `Dijawab oleh *{businessBotName}*

    Silahkan *dicopy, diisi dan dikirim kembali ke sini.*
    
    Isi dgn benar, kami proses berdasar data yang dikirim. Jangan sampai mengisi data yg salah.
    Khususnya *Email*.

    *Media komunikasi HANYA Email. Tidak dengan WA, IG atau yg lainnya.*

    *Revisi hanya bisa dilakukan setelah 1 minggu.*

    *Data tersebut akan dipost di IG *{businessInstagramID}**



    * * *

    *SALIN DAN ISI FORMULIR DIBAWAH INI*

    Nama: {name}
    Kota:
    Jns kelamin: {gender}
    Usia: {age} thn
    Status:
    Pekerjaan:
    Pendidikan: 
    Sholat 5 waktu: iya/jarang
    Kriteria calon: 
    Target nikah: (max 1 thn)
    Ciri fisik saya:
    Jika bersungguh-sungguh hubungi saya melalui, 
    EMAIL: {email} (wajib diisi) 


    Tambahan:
    


    `,
    input: 'form',
    next: 8,
    matchRules: [
      {
        type: 'contains_all',
        value: ['Nama:', 'Jns kelamin:', 'Usia:', 'Status:', 'Pekerjaan', 'Pendidikan:', 'Sholat 5 waktu:', 'Kriteria calon:', 'Target nikah:', 'Ciri fisik saya:', 'EMAIL:']
      }
    ]
  },
  {
    id: 8,
    type: 'buttons',
    text: `Dijawab oleh *{businessBotName}*

    Syukron sudah mengisi formulir. 😊
    Apakah kamu serius mau menikah..?`,
    options: [
      {
        text: 'SERIUS',
        next: 9
      },
      {
        text: 'RAGU-RAGU',
        next: 12
      },
      {
        text: 'TIDAK SERIUS',
        next: 12
      },
      {
        text: 'UBAH FORMULIR',
        next: 7
      }
    ]
  },
  {
    id: 9,
    type: 'buttons',
    text: `Dijawab oleh *{businessBotName}*

    Baik, kalau ada yg cocok dan sesuai kriteria,
    apakah dalam waktu (Maximal 1 tahun dr sekarang) Anda siap nikah?`,
    options: [
      {
        text: 'SIAP',
        next: 10
      },
      {
        text: 'TIDAK SIAP',
        next: 11
      }
    ]
  },
  {
    id: 10,
    type: 'message',
    // text: `Dijawab oleh *{businessBotName}*

    // Alhamdulillah, semoga Allah memudahkan ikhtiar menjemput jodoh ya.. 😊
    
    // Baik, sebagai komitmen keseriusan, peserta dipersilahkan memberikan infaq terbaiknya (untuk kelangsungan program ini).
    
    // Setelah menyelesaikan infaq data akan dipost di instagram *{businessInstagramID}*
    
    // BANK SYARIAH INDONESIA: (451) 7174170597
    // Atas Nama: Arbi Syarifudin
    
    // atau
    
    // BANK BCA: (014) 8610731130
    // Atas Nama: Arbi Syarifudin
    
    // Semoga segera bertemu jodohnya ya.
    
    // Harap konfirmasi dengan mengirim struk jika sudah menyelesaikan infaq.
    
    
    // Jika WA Admin tidak merespon dlm 24 jam setelah struk bukti transfer dikirim, silahkan konfirmasi ulang disini. 
    
    
    
    
    
    // Official Instagram: *{businessInstagramUrl}*`,
    text: `Dijawab oleh *{businessBotName}*

    Baik. Terima kasih atas partisipasinya.
    Segera kami proses ya.. 😊
    
    *Luruskan niat karena Allah. Semoga Allah beri kemudahan. Jika cocok segera menuju Khitbah & Nikah. Jika tidak, segera sudahi. Jangan berkomunikasi diluar media yang sudah ditentukan (hanya via Email).*`,
    next: null
  },
  {
    id: 11,
    type: 'buttons',
    text: `Dijawab oleh *{businessBotName}*

    Baik, terima kasih atas kejujuran kamu.
    Sayang sekali, dikarenakan belum siap menikah dalam waktu dekat, kami tidak bisa melanjutkan proses taaruf ini.
    
    Semoga Allah memudahkan ikhtiar menjemput jodoh ya.. 😊
    Terima kasih atas partisipasinya.
    
    Official Instagram: *{businessInstagramUrl}*`,
    options: [
      {
        text: 'RALAT JAWABAN',
        next: 9
      },
      {
        text: 'Tidak masalah. Terima kasih juga.',
        next: null
      }
    ]
  },
  {
    id: 12,
    type: 'buttons',
    text: `Dijawab oleh *{businessBotName}*

    Baik, terima kasih atas kejujuran kamu.
    Sayang sekali, *dikarenakan kamu ragu-ragu atau tidak serius menikah*, kami tentu tidak bisa melanjutkan proses taaruf ini.

    Semoga Allah memudahkan ikhtiar menjemput jodoh ya.. 😊
    Terima kasih atas partisipasinya.

    Official Instagram: *{businessInstagramUrl}*`,
    options: [
      {
        text: 'RALAT JAWABAN',
        next: 8
      },
      {
        text: 'Tidak masalah. Terima kasih juga.',
        next: null
      }
    ]
  }
]

// export data
module.exports = {
  blocks,
  settings,
  users,
  blockTypes,
  userMessageInputs
}
