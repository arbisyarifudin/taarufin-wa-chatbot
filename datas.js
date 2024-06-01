const settings = [
  {
    key: 'businessName',
    value: 'Taarufin.id'
  }
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
    text: 'Halo, selamat datang di *{businessName}*. Silakan pilih menu berikut dan balas pesan ini sesuai nomor yang diberikan:',
    options: [
      {
        text: 'Daftar produk',
        next: 3,
        matchRules: ['1', 'produk', 'daftar']
      },
      {
        text: 'Alamat',
        next: 2
      }
    ],
    isStartPoint: true
  },
  {
    id: 2,
    type: 'buttons',
    text: 'Alamat kami di Jalan Raya No. 1, Jakarta',
    options: [
      {
        text: 'Kembali',
        next: 1
      }
    ]
  },
  {
    id: 3,
    type: 'buttons',
    text: 'Berikut ini daftar produk milik kami:',
    options: [
      {
        text: 'Tart',
        next: 5
      },
      {
        text: 'Pie',
        next: 7
      },
      {
        text: 'Kembali',
        next: 1
      }
    ]
  },
  {
    id: 5,
    type: 'buttons',
    text: 'Tart kami sangat spesial. Harganya hanya Rp. 10.000',
    image: 'https://placehold.it/300x300?text=Tart',
    options: [
      {
        text: 'Pesan sekarang',
        next: 12
      },
      {
        text: 'Kembali',
        next: 3
      }
    ]
  },
  {
    id: 7,
    type: 'buttons',
    text: 'Pie kami sangat enak. Harganya hanya Rp. 20.000',
    image: 'https://placehold.it/300x300?text=Pie',
    options: [
      {
        text: 'Pesan sekarang',
        next: 12
      },
      {
        text: 'Kembali',
        next: 3
      }
    ]
  },
  {
    id: 12,
    type: 'question',
    text: 'Baik. Silakan masukan nama kamu:',
    next: 14,
    input: 'name'
  },
  {
    id: 14,
    type: 'question',
    text: 'Hai {name}. Silakan masukan alamat lengkap kamu:',
    next: 16,
    input: 'address'
  },
  {
    id: 16,
    type: 'buttons',
    text: 'Terima kasih, pesanan Anda berhasil kami catat.\nNama: {name}\nAlamat: {address}\nMohon kesediannya untuk menunggu pesanan diproses.',
    options: [
      {
        text: 'Ke menu',
        next: 1
      },
      {
        text: 'Cukup',
        next: 17
      }
    ]
  },
  {
    id: 17,
    type: 'message',
    text: 'Terima kasih. Jangan ragu untuk menghubungi kami kembali.'
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
