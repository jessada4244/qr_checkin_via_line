
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

async function main() {

    await liff.init({ liffId: myLiffId });

    if (!liff.isLoggedIn()) {
      
        liff.login(); 
        return;
    }

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const sessionId = urlParams.get('key');

    if (!sessionId) {
        alert("ไม่พบ Session ID หรือ QR Code ไม่ถูกต้อง");
        liff.closeWindow();
        return;
    }


    const profile = await liff.getProfile();

   
    await db.collection("login_sessions").doc(sessionId).set({
        userId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        status: "completed", 
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

 
    liff.closeWindow();
}


main().catch(err => {
    console.error(err);

    document.body.innerHTML += `<p style="color:red; text-align:center;">Error: ${err.message}</p>`;
    alert("เกิดข้อผิดพลาด: " + err.message);
});