
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

let currentSessionId = null;
let sessionUnsubscribe = null;
let logUnsubscribe = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('th-TH', {
        weekday: 'long', day: 'numeric', month: 'short'
    });

    // เริ่มการทำงาน
    initSession();       // สร้าง QR
    listenToDailyLogs(); // ดึงข้อมูลประวัติ
    cleanUpOldLogs();    // ลบ Log เก่า
});



function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function initSession() {
    currentSessionId = generateUUID();
    

    const liffUrl = `https://liff.line.me/${myLiffId}?key=${currentSessionId}`;

    const qrContainer = document.getElementById("qr-container");
    qrContainer.innerHTML = ""; 

    new QRCode(qrContainer, {
        text: liffUrl,
        width: 250,
        height: 250,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    const statusText = document.getElementById("status-text");
    statusText.innerText = "กรุณาสแกน QR Code ด้วย LINE";
    statusText.style.color = "#888";

    listenToLogin();
}

function listenToLogin() {
    if (sessionUnsubscribe) sessionUnsubscribe();
    
    sessionUnsubscribe = db.collection("login_sessions").doc(currentSessionId)
        .onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                if (data.status === "completed") {
                    processLogin(data);
                }
            }
        });
}

function processLogin(data) {
 
    const statusText = document.getElementById("status-text");
    statusText.innerText = `ยินดีต้อนรับคุณ ${data.displayName}!`;
    statusText.style.color = "#06c755"; 

    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    const userRef = db.collection("users").doc(data.userId);
    userRef.set({
        displayName: data.displayName,
        pictureUrl: data.pictureUrl,
        lastSeen: timestamp
    }, { merge: true });

    userRef.collection("history").add({
        action: "scan_qr",
        displayName: data.displayName,
        sessionId: currentSessionId,
        timestamp: timestamp
    });

    // B. เก็บลง Log รวมของวันนี้
    db.collection("daily_logs").add({
        userId: data.userId,
        displayName: data.displayName,
        pictureUrl: data.pictureUrl,
        timestamp: timestamp
    });


    setTimeout(() => {
        initSession();
    }, 1500);
}

function cleanUpOldLogs() {
    console.log("Checking for old logs to delete...");

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    db.collection("daily_logs")
        .where("timestamp", "<", startOfDay)
        .limit(500) 
        .get()
        .then((snapshot) => {
            if (snapshot.empty) {
                console.log("No old logs found.");
                return;
            }

            const batch = db.batch();
            snapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            return batch.commit();
        })
        .then(() => {
            console.log("Deleted old logs successfully!");
        })
        .catch((error) => {
            console.error("Error cleaning logs:", error);
        });
}

function listenToDailyLogs() {
    const historyList = document.getElementById("history-list");
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    if (logUnsubscribe) logUnsubscribe();
    
    logUnsubscribe = db.collection("daily_logs")
        .where("timestamp", ">=", startOfDay)
        .orderBy("timestamp", "desc")
        .onSnapshot((snapshot) => {
            historyList.innerHTML = ""; 

            if (snapshot.empty) {
                historyList.innerHTML = "<p style='text-align:center; color:#bbb; margin-top:20px;'>ยังไม่มีการสแกนวันนี้</p>";
                return;
            }

            snapshot.forEach((doc) => {
                const log = doc.data();
                renderCard(log);
            });
        }, (error) => {
            console.error("Error fetching logs:", error);
            if(error.message.includes("index")) {
                alert("กรุณาเปิด Console (F12) และคลิกลิงก์เพื่อสร้าง Index ใน Firebase");
            }
        });
}

function renderCard(data) {
    const historyList = document.getElementById("history-list");
    
    let timeString = "...";
    if (data.timestamp) {
        const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date();
        timeString = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }

    const cardHtml = `
        <div class="user-card">
            <img src="${data.pictureUrl}" alt="avatar" onerror="this.src='https://via.placeholder.com/50'">
            <div class="user-info">
                <p class="user-name">${data.displayName}</p>
                <p class="checkin-time">เวลา: ${timeString} น.</p>
            </div>
        </div>
    `;
    historyList.insertAdjacentHTML('beforeend', cardHtml); 
}