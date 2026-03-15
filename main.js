/* ================= FIREBASE ================= */
const firebaseConfig = {
  apiKey: "__FIREBASE_APIKEY__",
  authDomain: "__FIREBASE_AUTHDOMAIN__",
  projectId: "__FIREBASE_PROJECTID__"
};

// Inisialisasi Firebase
if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* ================= OTP SYSTEM ================= */
let generatedOTP = "";
let tempEmail = "";
let tempPassword = "";
let otpExpireTime = null;

// ================= REGISTER =================
const registerForm = document.getElementById("register-form");
const otpSection = document.getElementById("otp-section");
const otpInput = document.getElementById("otp-input");
const verifyBtn = document.getElementById("verifyBtn");

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  tempEmail = document.getElementById("email").value.trim();
  tempPassword = document.getElementById("password").value.trim();

  if(!tempEmail || !tempPassword){
    alert("Email dan password wajib diisi!");
    return;
  }

  // Cek email sudah terdaftar
  const methods = await auth.fetchSignInMethodsForEmail(tempEmail);
  if(methods.length > 0){
    alert("Email sudah terdaftar!");
    return;
  }

  // Generate OTP 6 digit
  generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
  otpExpireTime = Date.now() + 5*60*1000; // OTP berlaku 5 menit

  // Kirim OTP via EmailJS
  emailjs.send("__EMAILJS_SERVICEID__", "__EMAILJS_TEMPLATEID__", {
    name: tempEmail,
    email: tempEmail,
    message: "Kode OTP kamu adalah: " + generatedOTP
  }).then(() => {
    alert("OTP dikirim ke email ✅");
    otpSection.style.display = "block";
  }).catch(err=>{
    alert("Gagal kirim OTP ❌");
    console.log(err);
  });
});

// ================= VERIFY OTP =================
verifyBtn?.addEventListener("click", async () => {
  const userOTP = otpInput.value.trim();
  if(!userOTP){
    alert("Masukkan OTP terlebih dahulu!");
    return;
  }

  if(Date.now() > otpExpireTime){
    alert("OTP sudah expired! Silakan daftar ulang.");
    otpSection.style.display = "none";
    return;
  }

  if(userOTP !== generatedOTP){
    alert("OTP salah ❌");
    return;
  }

  try{
    // Buat akun Firebase
    const userCredential = await auth.createUserWithEmailAndPassword(tempEmail, tempPassword);
    const uid = userCredential.user.uid;

    // Simpan data user di Firestore
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate()+30);

    await db.collection("users").doc(uid).set({
      email: tempEmail,
      isActive: true,
      isAdmin: false,
      subscription: true,
      expireDate: expireDate,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Registrasi berhasil & akun aktif 30 hari ✅");
    window.location.href = "login.html";

  } catch(err){
    alert("Gagal membuat akun: " + err.message);
  }
});

// ================= LOGIN =================
async function login(){
  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if(!email || !password){
    alert("Email dan password wajib diisi!");
    return;
  }

  try{
    const userCredential = await auth.signInWithEmailAndPassword(email,password);
    const user = userCredential.user;

    const doc = await db.collection("users").doc(user.uid).get();
    if(!doc.exists){
      alert("Data user tidak ditemukan!");
      return;
    }

    const data = doc.data();
    const now = new Date();

    if(data.isAdmin){
      alert("Login Berhasil (Admin) ✅");
      window.location.href = "index.html";
    } else if(data.subscription && now < data.expireDate.toDate()){
      alert("Login Berhasil ✅");
      window.location.href = "index.html";
    } else {
      alert("Langganan belum aktif atau sudah habis!");
    }

  } catch(err){
    alert("Email atau password salah ❌");
    console.error(err);
  }
}

// ================= EXPORT LOGIN =================
window.login = login;
