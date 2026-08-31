/**
 * Every user-facing string in one place.
 *
 * The whole interface is in Lao. Keeping the text here (instead of hard-coded
 * inside components) means a teacher can correct the wording without touching
 * React, and a second language could be added later by adding another file.
 */
export const t = {
  app: {
    name: "LaoLearn",
    tagline: "ບົດຮຽນຊັ້ນ ມ.7 ສຳລັບໂຮງຮຽນ ສປປ ລາວ",
  },

  nav: {
    home: "ໜ້າຫຼັກ",
    lessons: "ບົດຮຽນ",
    subjects: "ວິຊາຮຽນ",
    quizzes: "ແບບທົດສອບ",
    scores: "ຄະແນນຂອງຂ້ອຍ",
    users: "ຜູ້ໃຊ້ງານ",
    logout: "ອອກຈາກລະບົບ",
    menu: "ເມນູ",
  },

  roles: {
    admin: "ຜູ້ດູແລລະບົບ",
    teacher: "ຄູສອນ",
    student: "ນັກຮຽນ",
  },

  auth: {
    posterNote: "ບົດຮຽນ, ເອກະສານ ແລະ ແບບທົດສອບ ລວມຢູ່ບ່ອນດຽວ ເຂົ້າໄດ້ທຸກເວລາ ທັງໃນຫ້ອງຮຽນ ແລະ ຢູ່ເຮືອນ",

    loginTitle: "ເຂົ້າສູ່ລະບົບ",
    loginSubtitle: "ປ້ອນອີເມວ ແລະ ລະຫັດຜ່ານຂອງທ່ານ",
    registerTitle: "ສະໝັກສະມາຊິກ",
    registerSubtitle: "ສ້າງບັນຊີໃໝ່ເພື່ອເລີ່ມໃຊ້ງານ",

    name: "ຊື່ ແລະ ນາມສະກຸນ",
    namePlaceholder: "ຕົວຢ່າງ: ສົມໃຈ ພົມມະຈັນ",
    email: "ອີເມວ",
    emailPlaceholder: "you@example.la",
    password: "ລະຫັດຜ່ານ",
    passwordHint: "ຢ່າງໜ້ອຍ 8 ຕົວອັກສອນ",
    confirmPassword: "ຢືນຢັນລະຫັດຜ່ານ",
    showPassword: "ສະແດງລະຫັດຜ່ານ",
    hidePassword: "ເຊື່ອງລະຫັດຜ່ານ",

    role: "ທ່ານເປັນ",
    roleStudent: "ນັກຮຽນ",
    roleStudentHint: "ອ່ານບົດຮຽນ ແລະ ເຮັດແບບທົດສອບ",
    roleTeacher: "ຄູສອນ",
    roleTeacherHint: "ສ້າງບົດຮຽນ ແລະ ແບບທົດສອບ",

    teacherCode: "ລະຫັດສຳລັບຄູ",
    teacherCodeHint: "ຂໍລະຫັດນີ້ຈາກຜູ້ດູແລລະບົບຂອງໂຮງຮຽນ",

    loginButton: "ເຂົ້າສູ່ລະບົບ",
    registerButton: "ສະໝັກສະມາຊິກ",
    submitting: "ກຳລັງດຳເນີນການ...",

    noAccount: "ຍັງບໍ່ມີບັນຊີ?",
    hasAccount: "ມີບັນຊີແລ້ວ?",
    goRegister: "ສະໝັກທີ່ນີ້",
    goLogin: "ເຂົ້າສູ່ລະບົບ",

    passwordMismatch: "ລະຫັດຜ່ານທັງສອງບໍ່ຕົງກັນ",
    passwordTooShort: "ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 8 ຕົວອັກສອນ",
  },

  dashboard: {
    welcome: "ຍິນດີຕ້ອນຮັບ",
    yourRole: "ສິດການໃຊ້ງານ",
    comingSoon: "ກຳລັງພັດທະນາ",
    adminIntro: "ທ່ານສາມາດຈັດການວິຊາຮຽນ, ຜູ້ໃຊ້ງານ ແລະ ເບິ່ງສະຖິຕິລວມ",
    teacherIntro: "ທ່ານສາມາດສ້າງ ແລະ ແກ້ໄຂບົດຮຽນ, ສ້າງແບບທົດສອບ ແລະ ເບິ່ງຄະແນນນັກຮຽນ",
    studentIntro: "ທ່ານສາມາດອ່ານບົດຮຽນ, ຄົ້ນຫາຄຳຕອບ ແລະ ເຮັດແບບທົດສອບ",
  },

  subjects: {
    title: "ວິຊາຮຽນ",
    subtitle: "ເລືອກວິຊາເພື່ອເບິ່ງບົດຮຽນ",
    manage: "ຈັດການວິຊາ",
    add: "ເພີ່ມວິຊາ",
    edit: "ແກ້ໄຂວິຊາ",
    name: "ຊື່ວິຊາ",
    namePlaceholder: "ຕົວຢ່າງ: ຄະນິດສາດ",
    description: "ຄຳອະທິບາຍ",
    lessonCount: "ບົດຮຽນ",
    empty: "ຍັງບໍ່ມີວິຊາ",
    emptyAdmin: "ກົດ “ເພີ່ມວິຊາ” ເພື່ອສ້າງວິຊາທຳອິດ",
    confirmDelete: "ຕ້ອງການລຶບວິຊານີ້ບໍ?",
    deleted: "ລຶບວິຊາແລ້ວ",
  },

  lessons: {
    title: "ບົດຮຽນ",
    all: "ທຸກວິຊາ",
    add: "ເພີ່ມບົດຮຽນ",
    edit: "ແກ້ໄຂບົດຮຽນ",
    create: "ສ້າງບົດຮຽນໃໝ່",
    subject: "ວິຊາ",
    chooseSubject: "-- ເລືອກວິຊາ --",
    lessonTitle: "ຊື່ບົດຮຽນ",
    titlePlaceholder: "ຕົວຢ່າງ: ບົດທີ 1 ຈຳນວນເຕັມ",
    content: "ເນື້ອຫາ",
    contentPlaceholder: "ຂຽນຄຳອະທິບາຍບົດຮຽນທີ່ນີ້...",
    position: "ລຳດັບບົດ",
    positionHint: "ເລກນ້ອຍຈະສະແດງກ່ອນ",
    author: "ຜູ້ສ້າງ",
    updatedAt: "ແກ້ໄຂລ່າສຸດ",
    empty: "ຍັງບໍ່ມີບົດຮຽນໃນວິຊານີ້",
    emptyTeacher: "ກົດ “ເພີ່ມບົດຮຽນ” ເພື່ອສ້າງບົດຮຽນທຳອິດ",
    confirmDelete: "ຕ້ອງການລຶບບົດຮຽນນີ້ບໍ? ການລຶບຈະຍ້ອນກັບບໍ່ໄດ້",
    saved: "ບັນທຶກແລ້ວ",
    back: "ກັບຄືນ",
    readMore: "ອ່ານຕໍ່",
    page: "ໜ້າ",
    of: "ຈາກ",
    prev: "ກ່ອນໜ້າ",
    next: "ຕໍ່ໄປ",
  },

  upload: {
    label: "ໄຟລ໌ແນບ (PDF / ວິດີໂອ / ຮູບພາບ)",
    choose: "ເລືອກໄຟລ໌",
    replace: "ປ່ຽນໄຟລ໌",
    remove: "ເອົາໄຟລ໌ອອກ",
    uploading: "ກຳລັງອັບໂຫຼດ",
    disabled: "ລະບົບອັບໂຫຼດໄຟລ໌ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ (Cloudinary)",
    tooLarge: "ໄຟລ໌ໃຫຍ່ເກີນໄປ ອະນຸຍາດສູງສຸດ",
    failed: "ອັບໂຫຼດບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່",
    openFile: "ເປີດໄຟລ໌",
    download: "ດາວໂຫຼດ",
  },

  users: {
    title: "ຜູ້ໃຊ້ງານ",
    subtitle: "ຈັດການບັນຊີຄູ ແລະ ນັກຮຽນທັງໝົດ",
    searchPlaceholder: "ຄົ້ນຫາຕາມຊື່ ຫຼື ອີເມວ",
    all: "ທັງໝົດ",
    joined: "ສະໝັກເມື່ອ",
    lessonsWritten: "ບົດຮຽນທີ່ສ້າງ",
    quizzesTaken: "ເຮັດແບບທົດສອບ",
    average: "ຄະແນນສະເລ່ຍ",
    changeRole: "ປ່ຽນສິດ",
    you: "ບັນຊີຂອງທ່ານ",
    empty: "ບໍ່ພົບຜູ້ໃຊ້ທີ່ຄົ້ນຫາ",
    emptyHint: "ລອງປ່ຽນຄຳຄົ້ນຫາ ຫຼື ເລືອກສິດອື່ນ",
    confirmDelete: "ຕ້ອງການລຶບບັນຊີນີ້ບໍ? ຄະແນນທັງໝົດຂອງຜູ້ໃຊ້ຈະຖືກລຶບໄປນຳ",
    keepsLessons: "ບົດຮຽນທີ່ສ້າງໄວ້ຈະຍັງຢູ່",
    times: "ຄັ້ງ",
  },

  scores: {
    title: "ຄະແນນຂອງຂ້ອຍ",
    subtitle: "ຜົນການເຮັດແບບທົດສອບທັງໝົດຂອງທ່ານ",
    attempts: "ຈຳນວນຄັ້ງທີ່ເຮັດ",
    quizzes: "ແບບທົດສອບ",
    average: "ຄະແນນສະເລ່ຍ",
    best: "ຄະແນນສູງສຸດ",
    takenAt: "ວັນທີເຮັດ",
    empty: "ຍັງບໍ່ມີຄະແນນ",
    emptyHint: "ເມື່ອທ່ານເຮັດແບບທົດສອບທ້າຍບົດແລ້ວ ຄະແນນຈະສະແດງຢູ່ນີ້",
    goToLessons: "ໄປເບິ່ງບົດຮຽນ",
  },

  common: {
    loading: "ກຳລັງໂຫຼດ...",
    retry: "ລອງໃໝ່",
    cancel: "ຍົກເລີກ",
    save: "ບັນທຶກ",
    saving: "ກຳລັງບັນທຶກ...",
    search: "ຄົ້ນຫາ",
    edit: "ແກ້ໄຂ",
    delete: "ລຶບ",
    confirm: "ຢືນຢັນ",
    error: "ເກີດຂໍ້ຜິດພາດ",
    networkError: "ເຊື່ອມຕໍ່ເຊີບເວີບໍ່ໄດ້ ກະລຸນາກວດເບິ່ງອິນເຕີເນັດ",
  },

  notFound: {
    title: "ບໍ່ພົບໜ້ານີ້",
    description: "ໜ້າທີ່ທ່ານຊອກຫາອາດຖືກຍ້າຍ ຫຼື ລຶບໄປແລ້ວ",
    back: "ກັບໄປໜ້າຫຼັກ",
  },
};

export default t;
