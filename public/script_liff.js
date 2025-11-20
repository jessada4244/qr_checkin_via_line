// liff-script.js

// เริ่มต้น Firebase ด้วยค่าจากไฟล์ config.js
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

async function main() {
    // 1. Initialize LIFF
    await liff.init({ liffId: myLiffId });

    // ตรวจสอบว่า Login หรือยัง
    if (!liff.isLoggedIn()) {
        // สั่งให้ Login และ Redirect กลับมาหน้านี้
        liff.login(); 
        return;
    }

    // 2. ดึงค่า Session ID จาก URL Query Param
    // URL จะมาในรูป: https://...?key=xxxxxxxx-xxxx...
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const sessionId = urlParams.get('key');

    if (!sessionId) {
        alert("ไม่พบ Session ID หรือ QR Code ไม่ถูกต้อง");
        liff.closeWindow();
        return;
    }

    // 3. ดึงข้อมูลโปรไฟล์ LINE
    const profile = await liff.getProfile();

    // 4. ส่งข้อมูลไป Firebase ตาม Session ID นั้น
    await db.collection("login_sessions").doc(sessionId).set({
        userId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        status: "completed", // ตัวบอกให้ฝั่งหน้าจอ Monitor รู้ว่าเสร็จแล้ว
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 5. ปิดหน้าต่าง LIFF
    liff.closeWindow();
}

// รันโปรแกรมและดักจับ Error
main().catch(err => {
    console.error(err);
    // แสดง Error บนหน้าจอเพื่อให้ Debug ง่ายขึ้นในมือถือ
    document.body.innerHTML += `<p style="color:red; text-align:center;">Error: ${err.message}</p>`;
    alert("เกิดข้อผิดพลาด: " + err.message);
});